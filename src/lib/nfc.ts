// Web NFC API helpers

export function isNfcSupported(): boolean {
  return "NDEFReader" in window;
}

export async function writeToNfc(data: string): Promise<void> {
  if (!isNfcSupported()) {
    throw new Error("NFC is not supported on this device/browser. Use Android Chrome.");
  }

  const ndef = new (window as any).NDEFReader();
  await ndef.write({
    records: [
      {
        recordType: "text",
        data: data,
      },
    ],
  });
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
