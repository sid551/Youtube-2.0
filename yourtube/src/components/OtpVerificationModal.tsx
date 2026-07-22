import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ShieldAlert, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface OtpVerificationModalProps {
  isOpen: boolean;
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onClose: () => void;
}

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  email,
  onVerify,
  onClose,
}) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP code");
      return;
    }

    setLoading(true);
    try {
      await onVerify(otp);
      setOtp("");
    } catch {
      // Handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white text-gray-900 border border-gray-200 dark:bg-zinc-950 dark:text-gray-100 dark:border-zinc-800">
        <DialogHeader className="text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
            <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-xl font-bold">Unusual Login Detected</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
            We noticed a login attempt from a new device or location. A 6-digit verification code has been sent to your email address{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">{email}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Enter 6-Digit OTP Code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="pl-9 text-center font-mono text-lg tracking-widest"
                autoFocus
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || otp.length !== 6} className="bg-red-600 hover:bg-red-700 text-white">
              {loading ? "Verifying..." : "Verify & Sign In"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OtpVerificationModal;
