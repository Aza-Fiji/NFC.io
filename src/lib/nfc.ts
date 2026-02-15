// Web NFC API helpers

export function isNfcSupported(): boolean {
  return "NDEFReader" in window;
}

const APP_URL = "https://bio-vault-pocket.lovable.app";

export async function writeToNfc(data: string): Promise<void> {
  if (!isNfcSupported()) {
    throw new Error("NFC is not supported on this device/browser. Use Android Chrome.");
  }

  // Build a URL that will auto-open the app with encrypted data
  const url = `${APP_URL}?data=${encodeURIComponent(data)}`;

  const ndef = new (window as any).NDEFReader();

  // Start scanning first to claim the NFC adapter from Android OS.
  // This acts like Android's "foreground dispatch" — it prevents the OS
  // from intercepting the tag before we can write to it.
  const abortController = new AbortController();
  try {
    await ndef.scan({ signal: abortController.signal });
    await ndef.write({
      records: [
        {
          recordType: "url",
          data: url,
        },
      ],
    });
  } finally {
    // Release the NFC adapter claim
    abortController.abort();
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
      const ndef = new (window as any).NDEFReader();
      await ndef.scan({ signal });

      ndef.addEventListener("reading", ({ message }: any) => {
        for (const record of message.records) {
          if (record.recordType === "text") {
            const decoder = new TextDecoder(record.encoding || "utf-8");
            resolve(decoder.decode(record.data));
            return;
          }
        }
        reject(new Error("No text record found on NFC tag."));
      });

      ndef.addEventListener("readingerror", () => {
        reject(new Error("Failed to read NFC tag."));
      });
    } catch (error) {
      reject(error);
    }
  });
}
