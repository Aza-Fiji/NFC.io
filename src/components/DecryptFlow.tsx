import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Fingerprint, KeyRound, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { decryptText } from "@/lib/crypto";
import { readFromNfc, isNfcSupported } from "@/lib/nfc";
import { authenticateBiometric, registerBiometric, hasBiometricRegistered, isBiometricSupported } from "@/lib/biometrics";
import NfcPulse from "@/components/NfcPulse";
import { useToast } from "@/hooks/use-toast";

type Step = "scan" | "auth" | "result" | "error";

interface Props {
  onBack: () => void;
  initialData?: string | null;
}

const DecryptFlow = ({ onBack, initialData }: Props) => {
  const [step, setStep] = useState<Step>("scan");
  const [encryptedData, setEncryptedData] = useState("");
  const [password, setPassword] = useState("");
  const [authMethod, setAuthMethod] = useState<"bio" | "password" | null>(null);
  const [decryptedText, setDecryptedText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const startScan = async () => {
    setStep("scan");
    try {
      abortRef.current = new AbortController();
      const data = await readFromNfc(abortRef.current.signal);
      setEncryptedData(data);
      setStep("auth");
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setErrorMsg(e.message || "Failed to read NFC tag.");
        setStep("error");
      }
    }
  };

  // Start scanning on mount, or skip if data was passed via URL
  useState(() => {
    if (initialData) {
      setEncryptedData(initialData);
      setStep("auth");
    } else {
      startScan();
    }
  });

  const handleDecrypt = async () => {
    try {
      let key = password;
      if (authMethod === "bio") {
        key = localStorage.getItem("nfc-vault-bio-key") || "";
        if (!key) {
          setErrorMsg("No biometric key found. The data may have been encrypted with a password, or you need to import a backup key first.");
          setStep("error");
          return;
        }

        // If no passkey on this device, register one first (e.g. after importing backup key)
        if (!hasBiometricRegistered()) {
          try {
            await registerBiometric();
          } catch (regErr: any) {
            const msg = regErr.message?.includes("not enabled in this document")
              ? "Biometric auth isn't available in this browser context. Please install the app on your Android device and try again."
              : regErr.message || "Biometric registration error.";
            setErrorMsg(msg);
            setStep("error");
            return;
          }
        } else {
          let ok: boolean;
          try {
            ok = await authenticateBiometric();
          } catch (bioErr: any) {
            const msg = bioErr.message?.includes("not enabled in this document")
              ? "Biometric auth isn't available in this browser context. Please install the app on your Android device and try again."
              : bioErr.message || "Biometric error.";
            setErrorMsg(msg);
            setStep("error");
            return;
          }
          if (!ok) {
            setErrorMsg("Biometric authentication failed.");
            setStep("error");
            return;
          }
        }
      }

      if (!key) {
        setErrorMsg("Please enter a password.");
        setStep("error");
        return;
      }

      const result = await decryptText(encryptedData, key);
      setDecryptedText(result);
      setStep("result");
    } catch {
      setErrorMsg("Decryption failed. Wrong password or corrupted data.");
      setStep("error");
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(decryptedText);
    toast({ title: "Copied!", description: "Decrypted text copied to clipboard." });
  };

  const stepVariant = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
  };

  return (
    <div className="flex flex-1 flex-col">
      <button
        onClick={() => {
          abortRef.current?.abort();
          onBack();
        }}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h2 className="mb-6 text-xl font-bold text-foreground">Read &amp; Decrypt</h2>

      <AnimatePresence mode="wait">
        {step === "scan" && (
          <motion.div
            key="scan"
            {...stepVariant}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col items-center justify-center gap-6"
          >
            <NfcPulse />
            <p className="text-lg font-medium text-foreground">
              Hold your phone to the NFC tag…
            </p>
            <p className="text-sm text-muted-foreground">Waiting to read encrypted data</p>
          </motion.div>
        )}

        {step === "auth" && (
          <motion.div key="auth" {...stepVariant} transition={{ duration: 0.2 }}>
            <Card className="border-0 shadow-md">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2 rounded-lg bg-accent p-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium text-accent-foreground">
                    NFC tag read successfully
                  </span>
                </div>

                <label className="text-sm font-medium text-foreground">
                  Choose authentication to decrypt
                </label>

                <div className="flex gap-3">
                  {isBiometricSupported() && (
                    <button
                      onClick={() => setAuthMethod("bio")}
                      className={`flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                        authMethod === "bio"
                          ? "border-primary bg-accent"
                          : "border-border bg-card"
                      }`}
                    >
                      <Fingerprint className="h-8 w-8 text-primary" />
                      <span className="text-sm font-medium">Biometric</span>
                    </button>
                  )}
                  <button
                    onClick={() => setAuthMethod("password")}
                    className={`flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                      authMethod === "password"
                        ? "border-primary bg-accent"
                        : "border-border bg-card"
                    }`}
                  >
                    <KeyRound className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">Password</span>
                  </button>
                </div>

                {authMethod === "bio" && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    <p className="font-medium mb-1">⚠️ Device-bound key</p>
                    <p>This will only work if the tag was encrypted with biometrics on this device.</p>
                  </div>
                )}

                {authMethod === "password" && (
                  <Input
                    type="password"
                    placeholder="Enter the password"
                    className="h-12 text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}

                <Button
                  className="w-full h-12 rounded-xl text-base font-semibold"
                  disabled={!authMethod}
                  onClick={handleDecrypt}
                >
                  Decrypt
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "result" && (
          <motion.div key="result" {...stepVariant} transition={{ duration: 0.2 }}>
            <Card className="border-0 shadow-md">
              <CardContent className="space-y-4 p-5">
                <label className="text-sm font-medium text-foreground">
                  Decrypted text
                </label>
                <div className="min-h-[120px] rounded-xl bg-muted p-4 text-base text-foreground whitespace-pre-wrap break-words">
                  {decryptedText}
                </div>
                <Button
                  variant="outline"
                  className="w-full h-12 gap-2 rounded-xl text-base font-semibold"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </Button>
                <Button
                  className="w-full h-12 rounded-xl text-base font-semibold"
                  onClick={onBack}
                >
                  Done
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "error" && (
          <motion.div
            key="error"
            {...stepVariant}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col items-center justify-center gap-4"
          >
            <AlertCircle className="h-16 w-16 text-destructive" />
            <h3 className="text-xl font-bold text-foreground">Something went wrong</h3>
            <p className="text-center text-sm text-muted-foreground">{errorMsg}</p>
            <Button
              className="mt-4 h-12 w-full max-w-xs rounded-xl text-base font-semibold"
              variant="outline"
              onClick={() => {
                setErrorMsg("");
                startScan();
              }}
            >
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DecryptFlow;
