import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
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

  // Refs to prevent duplicate backend calls
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
    localStorage.removeItem("theme_manual_override");
    if (userdata?.themePreference || userdata?.theme) {
      applyThemeToDom(userdata.themePreference || userdata.theme);
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    otpPending.current = false;
    redirectHandled.current = false;
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
      toast.warning("Unusual login detected. A 6-digit verification code (OTP) has been sent to your email.");
      return false;
    }
    if (data.result) {
      login(data.result);
      return true;
    }
    return false;
  };

  // Persistent Device ID generator
  const getDeviceId = () => {
    if (typeof window === "undefined") return "";
    let devId = localStorage.getItem("yourtube_device_id");
    if (!devId) {
      devId = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
      localStorage.setItem("yourtube_device_id", devId);
    }
    return devId;
  };

  // Detect real browser and OS from navigator.userAgent
  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let browser = "Chrome";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
    else if (/Firefox/.test(ua)) browser = "Firefox";
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
    else if (/Chrome/.test(ua)) browser = "Chrome";
    if ((navigator).brave) browser = "Brave";

    let os = "Unknown";
    if (/Windows/.test(ua)) os = "Windows";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad/.test(ua)) os = "iOS";
    else if (/Macintosh|Mac OS/.test(ua)) os = "Mac OS";
    else if (/Linux/.test(ua)) os = "Linux";

    return {
      deviceId: getDeviceId(),
      browser,
      os,
      userAgent: ua.slice(0, 150),
    };
  };

  // Fetch real location from ipapi.co
  const getLocationInfo = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error("ipapi failed");
      const data = await res.json();
      return {
        city: data.city || "Unknown",
        state: data.region || "Unknown",
        country: data.country_name || "Unknown",
        ip: data.ip || "",
      };
    } catch {
      return { city: "Unknown", state: "Unknown", country: "Unknown", ip: "" };
    }
  };

  // Central backend login call — guarded against concurrent calls
  const callBackendLogin = async (firebaseUser) => {
    if (loginInFlight.current) return;
    if (otpPending.current) return;

    loginInFlight.current = true;
    try {
      const [location] = await Promise.all([getLocationInfo()]);
      const device = getDeviceInfo();

      const payload = {
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
        image: firebaseUser.photoURL || "https://github.com/shadcn.png",
        device,
        location,
      };
      const response = await axiosInstance.post("/user/login", payload);
      await handleLoginResponse(response.data);
    } catch (error) {
      console.error("Backend login error:", error);
      logout();
    } finally {
      loginInFlight.current = false;
    }
  };

  const handleEmailSignUp = async (email, password, displayName) => {
    redirectHandled.current = true;
    otpPending.current = false;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
      const updatedUser = {
        ...userCredential.user,
        displayName: displayName || userCredential.user.email?.split("@")[0] || "User",
      };
      await callBackendLogin(updatedUser);
    } catch (error) {
      console.error("Email sign-up error:", error);
      throw error;
    }
  };

  const handleEmailSignIn = async (email, password) => {
    redirectHandled.current = true;
    otpPending.current = false;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await callBackendLogin(userCredential.user);
    } catch (error) {
      console.error("Email sign-in error:", error);
      throw error;
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
    redirectHandled.current = false;
    setOtpState({
      isOpen: false,
      email: "",
      device: null,
      location: null,
    });
    signOut(auth).catch(() => {});
  };

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  const handlegooglesignin = async () => {
    try {
      redirectHandled.current = false;
      otpPending.current = false;
      if (isMobileDevice()) {
        await signInWithRedirect(auth, provider);
        return;
      }
      const result = await signInWithPopup(auth, provider);
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
    localStorage.setItem("theme_manual_override", "true");
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
    localStorage.removeItem("theme_manual_override");
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
    const isManualOverride = localStorage.getItem("theme_manual_override") === "true";
    const savedTheme = localStorage.getItem("app_theme");
    const activeTheme = (isManualOverride && savedTheme) ? savedTheme : getClientIstTheme();
    applyThemeToDom(activeTheme);

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
        handleEmailSignUp,
        handleEmailSignIn,
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
