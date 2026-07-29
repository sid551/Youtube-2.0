import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { ShieldAlert, RefreshCw, CheckCircle2, MailCheck } from "lucide-react";
import { toast } from "sonner";

interface OtpVerificationModalProps {
  isOpen: boolean;
  email: string;
  onVerify: (otp?: string) => Promise<void>;
  onResend?: () => Promise<void>;
  onClose: () => void;
}

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  email,
  onVerify,
  onResend,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleCheckVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onVerify();
    } catch {
      // Handled in parent
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      if (onResend) {
        await onResend();
      }
      let seconds = 60;
      setResendCooldown(seconds);
      const interval = setInterval(() => {
        seconds -= 1;
        setResendCooldown(seconds);
        if (seconds <= 0) clearInterval(interval);
      }, 1000);
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend verification link.");
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white text-gray-900 border border-gray-200 dark:bg-zinc-950 dark:text-gray-100 dark:border-zinc-800 p-6 rounded-2xl">
        <DialogHeader className="text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
            <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-xl font-bold">Unusual Login Detected</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
            We noticed a login attempt from an unfamiliar device or location. A security verification email link has been sent via Firebase Authentication to{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">{email}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCheckVerification} className="space-y-4 mt-2">
          <div className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl flex items-start gap-3 border border-gray-200 dark:border-zinc-800">
            <MailCheck className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <p className="font-medium text-gray-900 dark:text-white">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Check your email inbox for the verification email.</li>
                <li>Click the verification link in the email.</li>
                <li>Click the button below to complete your login.</li>
              </ol>
            </div>
          </div>

          {/* Resend Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleResendLink}
              disabled={resendCooldown > 0 || resending}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
              {resendCooldown > 0
                ? `Resend Link in ${resendCooldown}s`
                : resending
                ? "Sending..."
                : "Didn't receive it? Resend Email Link"}
            </button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? "Checking..." : "I've Verified My Email"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OtpVerificationModal;
