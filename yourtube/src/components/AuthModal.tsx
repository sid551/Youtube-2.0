import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Lock, Mail, User as UserIcon, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const { handleEmailSignIn, handleEmailSignUp, handlegooglesignin } = useUser();

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    if (mode === "signup" && !displayName) {
      toast.error("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await handleEmailSignUp(email, password, displayName);
        toast.success("Account created successfully!");
      } else {
        await handleEmailSignIn(email, password);
        toast.success("Signed in successfully!");
      }
      handleClose();
    } catch (err: any) {
      let msg = "Authentication failed";
      if (err?.code === "auth/email-already-in-use") {
        msg = "That email is already registered. Please sign in instead.";
      } else if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/user-not-found"
      ) {
        msg = "Invalid email or password.";
      } else if (err?.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      } else if (err?.message) {
        msg = err.message;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    try {
      handleClose();
      await handlegooglesignin();
    } catch {
      // Handled in context
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white text-gray-900 border border-gray-200 dark:bg-zinc-950 dark:text-gray-100 dark:border-zinc-800 p-6 rounded-2xl shadow-xl">
        <DialogHeader className="text-center flex flex-col items-center">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Welcome back to YourTube" : "Create your account"}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
            {mode === "signin"
              ? "Sign in using your Firebase account"
              : "Sign up to start watching, uploading, and managing videos"}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl my-4">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "signin"
                ? "bg-white text-gray-900 shadow dark:bg-zinc-800 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "signup"
                ? "bg-white text-gray-900 shadow dark:bg-zinc-800 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-9 text-sm"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 text-sm"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-xl mt-2 flex items-center justify-center gap-2"
          >
            {mode === "signin" ? (
              <>
                <LogIn className="w-4 h-4" />
                {loading ? "Signing in..." : "Sign In with Email"}
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                {loading ? "Creating account..." : "Sign Up with Email"}
              </>
            )}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-zinc-950 px-2 text-gray-400 font-medium">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Sign In */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleClick}
          className="w-full py-2 flex items-center justify-center gap-2 font-medium border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Google
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
