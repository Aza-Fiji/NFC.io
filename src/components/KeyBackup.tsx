import { useState } from "react";
import { ArrowLeft, Download, Upload, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const BIO_KEY = "nfc-vault-bio-key";

interface Props {
  onBack: () => void;
}

const KeyBackup = ({ onBack }: Props) => {
  const [importValue, setImportValue] = useState("");
  const [imported, setImported] = useState(false);
  const { toast } = useToast();

  const storedKey = localStorage.getItem(BIO_KEY);

  const copyKey = async () => {
    if (!storedKey) return;
    await navigator.clipboard.writeText(storedKey);
    toast({ title: "Copied!", description: "Backup key copied to clipboard. Store it safely!" });
  };

  const downloadKey = () => {
    if (!storedKey) return;
    const blob = new Blob([storedKey], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nfc-vault-backup-key.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Key saved as file. Keep it somewhere safe." });
  };

  const handleImport = () => {
    if (!importValue.trim()) return;
    localStorage.setItem(BIO_KEY, importValue.trim());
    setImported(true);
    toast({ title: "Key restored!", description: "Biometric key has been imported to this device." });
  };

  return (
    <div className="flex flex-1 flex-col">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h2 className="mb-6 text-xl font-bold text-foreground">Key Backup</h2>

      {/* Export Section */}
      <Card className="border-0 shadow-md mb-4">
        <CardContent className="space-y-4 p-5">
          <label className="text-sm font-medium text-foreground">Export Key</label>
          {storedKey ? (
            <>
              <p className="text-sm text-muted-foreground">
                Save your biometric encryption key so you can restore it on a new device.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 gap-2 rounded-xl text-base font-semibold"
                  onClick={copyKey}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button
                  className="flex-1 h-12 gap-2 rounded-xl text-base font-semibold"
                  onClick={downloadKey}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                ⚠️ Anyone with this key can decrypt your biometric-encrypted tags. Store it securely.
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                No biometric key found on this device. Encrypt something with biometrics first.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="border-0 shadow-md">
        <CardContent className="space-y-4 p-5">
          <label className="text-sm font-medium text-foreground">Import Key</label>
          <p className="text-sm text-muted-foreground">
            Paste a previously exported key to restore biometric decryption on this device.
          </p>
          {imported ? (
            <div className="flex items-center gap-2 rounded-lg bg-accent p-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-sm font-medium text-accent-foreground">Key imported successfully!</span>
            </div>
          ) : (
            <>
              <Input
                placeholder="Paste your backup key here"
                className="h-12 text-base"
                value={importValue}
                onChange={(e) => setImportValue(e.target.value)}
              />
              <Button
                className="w-full h-12 gap-2 rounded-xl text-base font-semibold"
                disabled={!importValue.trim()}
                onClick={handleImport}
              >
                <Upload className="h-4 w-4" />
                Import Key
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyBackup;
