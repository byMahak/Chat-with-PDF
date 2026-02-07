import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVISaRXy7nkWhP8fxgxE2I44gbWA6ShCw",
  authDomain: "chat-with-pdf-948ba.firebaseapp.com",
  projectId: "chat-with-pdf-948ba",
  storageBucket: "chat-with-pdf-948ba.firebasestorage.app",
  messagingSenderId: "768814366390",
  appId: "1:768814366390:web:91831c1e3d391a54f2b017"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);

export{ db};