import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import { useState, useEffect, useContext, createContext } from "react";
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
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handleLoginResponse = (data) => {
    if (data.requiresOtp) {
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

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);
      handleLoginResponse(response.data);
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

    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const firebaseuser = result.user;
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);
          handleLoginResponse(response.data);
        }
      })
      .catch((err) => {
        console.error("Redirect result error:", err);
      });

    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);
          handleLoginResponse(response.data);
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubcribe();
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
        onClose={() =>
          setOtpState({
            isOpen: false,
            email: "",
            device: null,
            location: null,
          })
        }
      />
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
