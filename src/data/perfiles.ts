import {
  doc, getDoc, setDoc, onSnapshot, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";
import type { PerfilesConfig, MiembroId } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";

const REF = () => doc(db, "config", "perfiles");

export async function getPerfiles(): Promise<PerfilesConfig> {
  const snap = await getDoc(REF());
  return snap.exists() ? (snap.data() as PerfilesConfig) : {};
}

export function subscribePerfiles(cb: (p: PerfilesConfig) => void): () => void {
  return onSnapshot(REF(), (snap) => {
    cb(snap.exists() ? (snap.data() as PerfilesConfig) : {});
  });
}

export async function setColorMiembro(
  id: MiembroId,
  color: string,
): Promise<Result<void, AppError>> {
  try {
    await setDoc(REF(), { [id]: { color } }, { merge: true });
    return ok(undefined);
  } catch (e) {
    return err("FIRESTORE_ERROR", firebaseErrorMessage(e) ?? "Error al guardar color.");
  }
}

export async function addPreferencia(
  id: MiembroId,
  texto: string,
): Promise<Result<void, AppError>> {
  try {
    await setDoc(REF(), { [id]: { preferencias: arrayUnion(texto.trim()) } }, { merge: true });
    return ok(undefined);
  } catch (e) {
    return err("FIRESTORE_ERROR", firebaseErrorMessage(e) ?? "Error al agregar preferencia.");
  }
}

export async function removePreferencia(
  id: MiembroId,
  texto: string,
): Promise<Result<void, AppError>> {
  try {
    await setDoc(REF(), { [id]: { preferencias: arrayRemove(texto) } }, { merge: true });
    return ok(undefined);
  } catch (e) {
    return err("FIRESTORE_ERROR", firebaseErrorMessage(e) ?? "Error al quitar preferencia.");
  }
}
