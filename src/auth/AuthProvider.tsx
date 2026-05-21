import {
  createContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { resolveMemberId } from "./resolveMemberId";
import { upsertUserDoc } from "./upsertUserDoc";
import type { UserDoc, FamiliaConfig } from "../types/models";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "unauthorized"; email: string }
  | { status: "authenticated"; user: UserDoc };

interface AuthContextValue {
  state: AuthState;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ status: "unauthenticated" });
        return;
      }

      setState({ status: "loading" });

      try {
        const familiaSnap = await getDoc(doc(db, "config", "familia"));
        const familia = familiaSnap.data() as FamiliaConfig;

        const memberId = resolveMemberId(firebaseUser.email ?? "", familia);

        if (!memberId) {
          await firebaseSignOut(auth);
          setState({ status: "unauthorized", email: firebaseUser.email ?? "" });
          return;
        }

        const memberInfo = familia.miembros[memberId];
        await upsertUserDoc(firebaseUser, memberId, memberInfo);

        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        setState({ status: "authenticated", user: userSnap.data() as UserDoc });
      } catch (err) {
        console.error("Auth resolution error:", err);
        setState({ status: "unauthenticated" });
      }
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
