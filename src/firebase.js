import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBCFWtBhM0A-zWHqMJPvEq8OhcfbYKzCQE",
  authDomain: "heart-game-b7c90.firebaseapp.com",
  projectId: "heart-game-b7c90",
  storageBucket: "heart-game-b7c90.firebasestorage.app",
  messagingSenderId: "466086196679",
  appId: "1:466086196679:web:b9f35aa1003bb2fc5815e2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Mock Auth system
export const auth = {
  onAuthStateChanged: (cb) => cb({ email: 'admin@sithurasa.com' }),
  currentUser: { email: 'admin@sithurasa.com' },
  signOut: () => Promise.resolve()
};
