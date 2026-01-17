// Import the functions you need from the Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Your real Firebase configuration (copied from console)
const firebaseConfig = {
  apiKey: "AIzaSyCGgpkwpnVBRRhvfXubN0oXF0ucuEpiGD0",
  authDomain: "my-tiiny-host-d8660.firebaseapp.com",
  projectId: "my-tiiny-host-d8660",
  storageBucket: "my-tiiny-host-d8660.firebasestorage.app",
  messagingSenderId: "985363120155",
  appId: "1:985363120155:web:ff836fc7c9ba0b5f50f8be"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services we'll use
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);

// Automatically sign in anonymously when the app loads
signInAnonymously(auth).catch((error) => {
  console.error("Anonymous sign-in failed:", error);
});