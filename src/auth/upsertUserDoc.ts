import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { MemberId, MemberInfo, UserDoc } from "../types/models";
import type { User } from "firebase/auth";

/**
 * Creates or refreshes the /users/{uid} document for the authenticated user.
 * - On first login: sets all fields including fechaPrimerLogin.
 * - On subsequent logins: updates email + ultimoLogin only (keeps fechaPrimerLogin
 *   and the original nombre/rol/memberId resolution).
 */
export async function upsertUserDoc(
  firebaseUser: User,
  memberId: MemberId,
  memberInfo: MemberInfo
): Promise<void> {
  const userRef = doc(db, "users", firebaseUser.uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    await setDoc(
      userRef,
      {
        email: firebaseUser.email ?? "",
        ultimoLogin: serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }

  const newDoc: Omit<UserDoc, "ultimoLogin" | "fechaPrimerLogin"> = {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? "",
    memberId,
    nombre: memberInfo.nombre,
    rol: memberInfo.rol,
  };

  await setDoc(userRef, {
    ...newDoc,
    ultimoLogin: serverTimestamp(),
    fechaPrimerLogin: serverTimestamp(),
  });
}
