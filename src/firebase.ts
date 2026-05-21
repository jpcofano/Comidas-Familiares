// Firebase SDK initialization.
// The config values below are public client-side identifiers, not secrets.
// Project access is protected by Firebase Auth + Firestore Security Rules,
// not by hiding these keys.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

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

// Multi-tab persistent local cache — JP may have the app open on phone + iPad
// simultaneously. The multi-tab manager coordinates IndexedDB across tabs so
// writes from one tab are visible in others without conflicts.
// Uses the modern (post-9.0) API. Do NOT use the legacy enableIndexedDbPersistence
// or enableMultiTabIndexedDbPersistence — those are deprecated.
// Note: in Safari ITP / incognito, IndexedDB may be limited. The SDK logs a
// warning and falls back to memory — no explicit catch needed.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});