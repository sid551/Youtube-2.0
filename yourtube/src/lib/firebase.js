import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBr2K4HKC0AQxlDGbMST-sf1cKgAabVqN0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "yourtube-e9c7f.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "yourtube-e9c7f",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "yourtube-e9c7f.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "81976387475",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:81976387475:web:122c4c5fd9e58cf2b72a66",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-5X3883TQ7X",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export { auth, provider };


