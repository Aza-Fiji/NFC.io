import { Nfc } from "lucide-react";

const NfcPulse = () => (
  <div className="relative flex items-center justify-center">
    <div className="absolute h-24 w-24 animate-pulse-ring rounded-full bg-primary/20" />
    <div className="absolute h-20 w-20 animate-pulse-ring rounded-full bg-primary/15 [animation-delay:0.5s]" />
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg">
      <Nfc className="h-8 w-8 text-primary-foreground" />
    </div>
  </div>
);

export default NfcPulse;
