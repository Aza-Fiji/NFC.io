// Web NFC API helpers

export function isNfcSupported(): boolean {
  return "NDEFReader" in window;
}

const MIME_TYPE = "application/x-nfc-vault";

export async function writeToNfc(data: string): Promise<void> {
  if (!isNfcSupported()) {
    throw new Error("NFC is not supported on this device/browser. Use Android Chrome.");
  }

  const ndef = new (window as any).NDEFReader();

  // Claim the NFC adapter via scan() so Android OS won't intercept the tag.
  const abortController = new AbortController();
  const { signal } = abortController;
  try {
    await ndef.scan({ signal });

    // Wait for a tag to appear, then write immediately.
    await new Promise<void>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("Aborted")));

      ndef.addEventListener("reading", async () => {
        try {
          // Use a custom MIME type so Android doesn't show "Open link?" dialogs.
          const encoder = new TextEncoder();
          await ndef.write(
            {
              records: [
                {
                  recordType: "mime",
                  mediaType: MIME_TYPE,
                  data: encoder.encode(data),
                },
              ],
            },
            { overwrite: true, signal }
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
          // Handle our custom MIME records
          if (record.recordType === "mime" && record.mediaType === MIME_TYPE) {
            const decoder = new TextDecoder("utf-8");
            resolve(decoder.decode(record.data));
            return;
          }
          // Fallback: also handle plain text records (legacy tags)
          if (record.recordType === "text") {
            const decoder = new TextDecoder(record.encoding || "utf-8");
            resolve(decoder.decode(record.data));
            return;
          }
        }
        reject(new Error("No compatible record found on NFC tag."));
      });

      ndef.addEventListener("readingerror", () => {
        reject(new Error("Failed to read NFC tag."));
      });
    } catch (error) {
      reject(error);
    }
  });
}
