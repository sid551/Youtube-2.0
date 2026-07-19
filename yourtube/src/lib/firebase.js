// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBr2K4HKC0AQxlDGbMST-sf1cKgAabVqN0",
  authDomain: "yourtube-e9c7f.firebaseapp.com",
  projectId: "yourtube-e9c7f",
  storageBucket: "yourtube-e9c7f.firebasestorage.app",
  messagingSenderId: "81976387475",
  appId: "1:81976387475:web:122c4c5fd9e58cf2b72a66",
  measurementId: "G-5X3883TQ7X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };


