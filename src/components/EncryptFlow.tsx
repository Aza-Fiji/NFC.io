import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Fingerprint, KeyRound, Nfc, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { encryptText, generateRandomPassword } from "@/lib/crypto";
import { writeToNfc, isNfcSupported } from "@/lib/nfc";
import { authenticateBiometric, registerBiometric, hasBiometricRegistered, isBiometricSupported } from "@/lib/biometrics";
import NfcPulse from "@/components/NfcPulse";

type Step = "input" | "auth" | "scanning" | "success" | "error";

interface Props {
  onBack: () => void;
}

const EncryptFlow = ({ onBack }: Props) => {
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [authMethod, setAuthMethod] = useState<"bio" | "password" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAuth = async () => {
    if (authMethod === "bio") {
      try {
        if (!hasBiometricRegistered()) {
          await registerBiometric();
        } else {
          const ok = await authenticateBiometric();
          if (!ok) {
            setErrorMsg("Biometric authentication failed.");
            setStep("error");
            return;
          }
        }
        // Reuse existing bio key if available (e.g. imported backup), otherwise generate new
        let bioPassword = localStorage.getItem("nfc-vault-bio-key");
        if (!bioPassword) {
          bioPassword = generateRandomPassword();
          localStorage.setItem("nfc-vault-bio-key", bioPassword);
        }
        await startWrite(bioPassword);
      } catch (e: any) {
        const msg = e.message?.includes("not enabled in this document")
          ? "Biometric auth isn't available in this browser context. Please install the app on your Android device and try again."
          : e.message || "Biometric error.";
        setErrorMsg(msg);
        setStep("error");
      }
    } else {
      if (!password.trim()) {
        setErrorMsg("Please enter a password.");
        setStep("error");
        return;
      }
      await startWrite(password);
    }
  };

  const startWrite = async (key: string) => {
    setStep("scanning");
    try {
      const encrypted = await encryptText(text, key);
      await writeToNfc(encrypted);
      setStep("success");
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to write to NFC tag.");
      setStep("error");
    }
  };

  const stepVariant = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
  };

  return (
    <div className="flex flex-1 flex-col">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h2 className="mb-6 text-xl font-bold text-foreground">Encrypt &amp; Write</h2>

      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div key="input" {...stepVariant} transition={{ duration: 0.2 }}>
            <Card className="border-0 shadow-md">
              <CardContent className="space-y-4 p-5">
                <label className="text-sm font-medium text-foreground">
                  Text to encrypt
                </label>
                <Textarea
                  placeholder="Type or paste your secret text…"
                  className="min-h-[140px] text-base"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <Button
                  className="w-full h-12 rounded-xl text-base font-semibold"
                  disabled={!text.trim()}
                  onClick={() => setStep("auth")}
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "auth" && (
          <motion.div key="auth" {...stepVariant} transition={{ duration: 0.2 }}>
            <Card className="border-0 shadow-md">
              <CardContent className="space-y-4 p-5">
                <label className="text-sm font-medium text-foreground">
                  Choose authentication
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
                    <p>Biometric encryption stores the key on this device only. If you switch phones, you won't be able to decrypt. Consider backing up your key from the home screen.</p>
                  </div>
                )}

                {authMethod === "password" && (
                  <Input
                    type="password"
                    placeholder="Enter a password"
                    className="h-12 text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}

                {!isNfcSupported() && (
                  <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    NFC is not supported on this device/browser. Use Android Chrome.
                  </p>
                )}

                <Button
                  className="w-full h-12 rounded-xl text-base font-semibold"
                  disabled={!authMethod}
                  onClick={handleAuth}
                >
                  Authenticate &amp; Write
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "scanning" && (
          <motion.div
            key="scanning"
            {...stepVariant}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col items-center justify-center gap-6"
          >
            <NfcPulse />
            <p className="text-lg font-medium text-foreground">
              Hold your phone to the NFC tag…
            </p>
            <p className="text-sm text-muted-foreground">
              Keep it steady until writing is complete
            </p>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            {...stepVariant}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col items-center justify-center gap-4"
          >
            <CheckCircle2 className="h-16 w-16 text-success" />
            <h3 className="text-xl font-bold text-foreground">Written Successfully!</h3>
            <p className="text-center text-sm text-muted-foreground">
              Your encrypted data has been written to the NFC tag.
            </p>
            <Button
              className="mt-4 h-12 w-full max-w-xs rounded-xl text-base font-semibold"
              onClick={onBack}
            >
              Done
            </Button>
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
                setStep("auth");
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

export default EncryptFlow;
