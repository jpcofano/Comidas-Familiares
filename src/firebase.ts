// Firebase SDK initialization.
// The config values below are public client-side identifiers, not secrets.
// Project access is protected by Firebase Auth + Firestore Security Rules,
// not by hiding these keys.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBjs-atkLON7zhMS363sEhP-AmI6dwm1-I",
  authDomain: "comida-familiar.firebaseapp.com",
  projectId: "comida-familiar",
  storageBucket: "comida-familiar.firebasestorage.app",
  messagingSenderId: "133743597694",
  appId: "1:133743597694:web:8a39542b85a18bfb1de02f",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);