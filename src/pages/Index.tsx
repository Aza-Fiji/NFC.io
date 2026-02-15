import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, PenLine, ScanLine, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import EncryptFlow from "@/components/EncryptFlow";
import DecryptFlow from "@/components/DecryptFlow";
import KeyBackup from "@/components/KeyBackup";

type View = "home" | "encrypt" | "decrypt" | "backup";

const Index = () => {
  const [view, setView] = useState<View>("home");
  const [autoDecryptData, setAutoDecryptData] = useState<string | null>(null);

  // Auto-detect ?data= parameter from NFC tag URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");
    if (data) {
      setAutoDecryptData(data);
      setView("decrypt");
      // Clean the URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-center gap-3 pt-12 pb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
          <Lock className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          NFC Crypto Vault
        </h1>
      </header>

      <main className="flex flex-1 flex-col px-5 pb-8">
        <AnimatePresence mode="wait">
          {view === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col items-center justify-center gap-6"
            >
              <p className="max-w-xs text-center text-muted-foreground">
                Encrypt text with top-tier security and store it on NFC tags. Everything stays on your device.
              </p>

              <div className="flex w-full max-w-xs flex-col gap-4">
                <Button
                  size="lg"
                  className="h-16 gap-3 rounded-2xl text-lg font-semibold shadow-lg"
                  onClick={() => setView("encrypt")}
                >
                  <PenLine className="h-5 w-5" />
                  Encrypt &amp; Write
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 gap-3 rounded-2xl text-lg font-semibold border-2 border-primary/20"
                  onClick={() => setView("decrypt")}
                >
                  <ScanLine className="h-5 w-5" />
                  Read &amp; Decrypt
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 gap-3 rounded-2xl text-base font-semibold border-2 border-primary/10"
                  onClick={() => setView("backup")}
                >
                  <Shield className="h-5 w-5" />
                  Key Backup
                </Button>
              </div>
            </motion.div>
          )}

          {view === "encrypt" && (
            <motion.div
              key="encrypt"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col pt-6"
            >
              <EncryptFlow onBack={() => setView("home")} />
            </motion.div>
          )}

          {view === "decrypt" && (
            <motion.div
              key="decrypt"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col pt-6"
            >
              <DecryptFlow onBack={() => { setAutoDecryptData(null); setView("home"); }} initialData={autoDecryptData} />
            </motion.div>
          )}

          {view === "backup" && (
            <motion.div
              key="backup"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col pt-6"
            >
              <KeyBackup onBack={() => setView("home")} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
