import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import { useState, useEffect, useRef, useContext, createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import OtpVerificationModal from "@/components/OtpVerificationModal";
import { toast } from "sonner";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [theme, setThemeState] = useState("light");

  // Security OTP state
  const [otpState, setOtpState] = useState({
    isOpen: false,
    email: "",
    device: null,
    location: null,
  });

  // Refs to prevent duplicate backend calls:
  // - redirectHandled: set to true once getRedirectResult calls the backend,
  //   so onAuthStateChanged skips the duplicate call on the same page load.
  // - otpPending: set to true while the OTP modal is open, so
  //   onAuthStateChanged does not re-trigger a new login attempt.
  // - loginInFlight: prevents concurrent login calls from racing.
  const redirectHandled = useRef(false);
  const otpPending = useRef(false);
  const loginInFlight = useRef(false);

  // Client-side IST theme calculation fallback
  const getClientIstTheme = () => {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      });
      const parts = formatter.formatToParts(new Date());
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
      const totalMinutes = hour * 60 + minute;
      return totalMinutes >= 600 && totalMinutes <= 720 ? "light" : "dark";
    } catch {
      return "light";
    }
  };

  const applyThemeToDom = (newTheme) => {
    if (!newTheme) return;
    setThemeState(newTheme);
    localStorage.setItem("app_theme", newTheme);
    const root = document.documentElement;
    const body = document.body;
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      if (body) {
        body.classList.add("dark");
        body.classList.remove("light");
      }
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      if (body) {
        body.classList.add("light");
        body.classList.remove("dark");
      }
    }
  };

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
    if (userdata?.themePreference || userdata?.theme) {
      applyThemeToDom(userdata.themePreference || userdata.theme);
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    otpPending.current = false;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handleLoginResponse = (data) => {
    if (data.requiresOtp) {
      otpPending.current = true;
      setOtpState({
        isOpen: true,
        email: data.email,
        device: data.device,
        location: data.location,
      });
      toast.warning("Unusual login detected. A verification OTP has been sent to your email.");
      return false;
    }
    if (data.result) {
      login(data.result);
      return true;
    }
    return false;
  };

  // Central backend login call — guarded against concurrent calls
  const callBackendLogin = async (firebaseUser) => {
    if (loginInFlight.current) return;
    // If OTP modal is already open, do not fire another login request
    if (otpPending.current) return;

    loginInFlight.current = true;
    try {
      const payload = {
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        image: firebaseUser.photoURL || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);
      handleLoginResponse(response.data);
    } catch (error) {
      console.error("Backend login error:", error);
      logout();
    } finally {
      loginInFlight.current = false;
    }
  };

  const verifyOtpCode = async (otpCode) => {
    try {
      const res = await axiosInstance.post("/user/verify-otp", {
        email: otpState.email,
        otp: otpCode,
        device: otpState.device,
        location: otpState.location,
      });
      if (res.data.result) {
        toast.success("Security verification successful!");
        login(res.data.result);
        otpPending.current = false;
        setOtpState({
          isOpen: false,
          email: "",
          device: null,
          location: null,
        });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Invalid OTP code";
      toast.error(msg);
      throw err;
    }
  };

  const closeOtpModal = () => {
    otpPending.current = false;
    setOtpState({
      isOpen: false,
      email: "",
      device: null,
      location: null,
    });
  };

  // Detect if on a mobile device (popups are blocked on mobile)
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  const handlegooglesignin = async () => {
    try {
      if (isMobileDevice()) {
        // Mobile: use redirect (popups are blocked)
        // Mark as redirect-initiated so onAuthStateChanged doesn't double-fire
        redirectHandled.current = false; // will be set after redirect returns
        await signInWithRedirect(auth, provider);
        return; // page navigates away
      }

      // Desktop: use popup
      const result = await signInWithPopup(auth, provider);
      // Popup success — mark redirect as handled so onAuthStateChanged skips the call
      redirectHandled.current = true;
      await callBackendLogin(result.user);
    } catch (error) {
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        console.log("Google sign-in popup closed by user.");
        return;
      }
      if (
        error?.code === "auth/popup-blocked" ||
        error?.code === "auth/operation-not-supported-in-this-environment"
      ) {
        // Popup blocked even on desktop — fall back to redirect
        console.warn("Popup blocked by browser. Falling back to redirect...");
        toast.info("Popup blocked. Redirecting to Google Sign-In...");
        try {
          redirectHandled.current = false;
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          console.error("Redirect signin error:", redirectErr);
        }
      }
      console.error("Google signin error:", error);
      toast.error(error?.message || "Google sign-in failed");
    }
  };

  const updateTheme = async (newTheme) => {
    applyThemeToDom(newTheme);
    if (user?._id) {
      try {
        const res = await axiosInstance.patch(`/user/theme/${user._id}`, {
          themePreference: newTheme,
          theme: newTheme,
        });
        const savedPref = res.data.themePreference || res.data.theme;
        if (savedPref) {
          const updatedUser = {
            ...user,
            theme: savedPref,
            themePreference: savedPref,
          };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch (err) {
        console.error("Failed to persist theme preference:", err);
      }
    }
  };

  const resetTheme = async () => {
    if (user?._id) {
      try {
        const res = await axiosInstance.patch(`/user/theme/${user._id}`, {
          reset: true,
        });
        if (res.data.theme) {
          applyThemeToDom(res.data.theme);
          const updatedUser = { ...user, theme: res.data.theme };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch (err) {
        console.error("Failed to reset theme:", err);
      }
    } else {
      const calculated = getClientIstTheme();
      applyThemeToDom(calculated);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") || getClientIstTheme();
    applyThemeToDom(savedTheme);

    // Handle redirect result first — this runs when the user returns after
    // signInWithRedirect. If a redirect result exists, call the backend and
    // mark redirectHandled so onAuthStateChanged below skips the duplicate call.
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          redirectHandled.current = true;
          await callBackendLogin(result.user);
        }
      })
      .catch((err) => {
        console.error("Redirect result error:", err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Skip if:
        // 1. The redirect flow already handled login on this page load, OR
        // 2. The OTP modal is currently open (user is mid-verification)
        if (redirectHandled.current) return;
        if (otpPending.current) return;

        await callBackendLogin(firebaseUser);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        theme,
        login,
        logout,
        handlegooglesignin,
        updateTheme,
        resetTheme,
      }}
    >
      {children}
      <OtpVerificationModal
        isOpen={otpState.isOpen}
        email={otpState.email}
        onVerify={verifyOtpCode}
        onClose={closeOtpModal}
      />
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
