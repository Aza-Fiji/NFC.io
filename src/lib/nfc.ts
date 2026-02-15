// Web NFC API helpers

export function isNfcSupported(): boolean {
  return "NDEFReader" in window;
}

const MIME_TYPE = "application/x-nfc-vault";
const APP_URL = "https://bio-vault-pocket.lovable.app";

// ── Persistent NFC session ──────────────────────────────────────────
// Claiming the adapter as early as possible gives Chrome priority over
// Android's native NFC tag dispatch ("Open link?" / NFC service).
// The session stays active until explicitly released.

let activeNdef: any = null;
let activeAbort: AbortController | null = null;

/**
 * Start an NFC scan session to claim the adapter from the OS.
 * Call this as early as possible (e.g. when the encrypt/decrypt UI mounts).
 * Returns a cleanup function to release the adapter.
 */
export async function claimNfcAdapter(): Promise<() => void> {
  if (!isNfcSupported()) return () => {};

  // If already claimed, don't re-claim
  if (activeNdef) return () => releaseNfcAdapter();

  const ndef = new (window as any).NDEFReader();
  const abort = new AbortController();

  await ndef.scan({ signal: abort.signal });

  activeNdef = ndef;
  activeAbort = abort;

  return () => releaseNfcAdapter();
}

export function releaseNfcAdapter() {
  activeAbort?.abort();
  activeNdef = null;
  activeAbort = null;
}

/**
 * Write encrypted data to an NFC tag as a custom MIME record.
 * Expects the adapter to already be claimed via claimNfcAdapter().
 * Falls back to claiming on-the-fly if not.
 */
export async function writeToNfc(data: string): Promise<void> {
  if (!isNfcSupported()) {
    throw new Error("NFC is not supported on this device/browser. Use Android Chrome.");
  }

  // Use existing session or create one
  let ndef = activeNdef;
  let ownAbort: AbortController | null = null;

  if (!ndef) {
    ndef = new (window as any).NDEFReader();
    ownAbort = new AbortController();
    await ndef.scan({ signal: ownAbort.signal });
  }

  const signal = ownAbort?.signal ?? activeAbort?.signal;

  try {
    await new Promise<void>((resolve, reject) => {
      if (signal) {
        signal.addEventListener("abort", () => reject(new Error("Aborted")));
      }

      ndef.addEventListener("reading", async () => {
        try {
          const encoder = new TextEncoder();
          await ndef.write(
            {
              records: [
                // MIME record holds the encrypted data
                {
                  recordType: "mime",
                  mediaType: MIME_TYPE,
                  data: encoder.encode(data),
                },
                // Short URL record enables auto-open when tapped outside the app
                {
                  recordType: "url",
                  data: APP_URL,
                },
              ],
            },
            { overwrite: true, ...(signal ? { signal } : {}) }
          );
          resolve();
        } catch (err) {
          reject(err);
        }
      }, { once: true });

      ndef.addEventListener("readingerror", () => {
        reject(new Error("Could not read NFC tag. Try repositioning."));
      }, { once: true });
    });
  } finally {
    // Only release if we created our own session
    if (ownAbort) {
      ownAbort.abort();
    }
  }
}

export async function readFromNfc(
  signal?: AbortSignal
): Promise<string> {
  if (!isNfcSupported()) {
    throw new Error("NFC is not supported on this device/browser. Use Android Chrome.");
  }

  return new Promise(async (resolve, reject) => {
    try {
      // Prefer the already-claimed adapter
      let ndef = activeNdef;
      if (!ndef) {
        ndef = new (window as any).NDEFReader();
        await ndef.scan({ signal });
      }

      ndef.addEventListener("reading", ({ message }: any) => {
        for (const record of message.records) {
          if (record.recordType === "mime" && record.mediaType === MIME_TYPE) {
            const decoder = new TextDecoder("utf-8");
            resolve(decoder.decode(record.data));
            return;
          }
          if (record.recordType === "text") {
            const decoder = new TextDecoder(record.encoding || "utf-8");
            resolve(decoder.decode(record.data));
            return;
          }
        }
        reject(new Error("No compatible record found on NFC tag."));
      }, { once: true });

      ndef.addEventListener("readingerror", () => {
        reject(new Error("Failed to read NFC tag."));
      }, { once: true });
    } catch (error) {
      reject(error);
    }
  });
}
