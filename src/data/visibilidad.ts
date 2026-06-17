import {
  doc, getDoc, setDoc, onSnapshot,
  arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";
import type { VisibilidadBiblioteca, MiembroId } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";

const REF = () => doc(db, "config", "visibilidad");
const EMPTY: VisibilidadBiblioteca = { maria: [], sofia: [], federico: [] };

function parse(data: unknown): VisibilidadBiblioteca {
  const d = (data ?? {}) as Partial<VisibilidadBiblioteca>;
  return {
    maria:    Array.isArray(d.maria)    ? d.maria    : [],
    sofia:    Array.isArray(d.sofia)    ? d.sofia    : [],
    federico: Array.isArray(d.federico) ? d.federico : [],
  };
}

export async function getVisibilidad(): Promise<VisibilidadBiblioteca> {
  const snap = await getDoc(REF());
  return snap.exists() ? parse(snap.data()) : { ...EMPTY };
}

export function subscribeVisibilidad(
  cb: (v: VisibilidadBiblioteca) => void,
): () => void {
  return onSnapshot(REF(), (snap) => {
    cb(snap.exists() ? parse(snap.data()) : { ...EMPTY });
  });
}

export async function toggleVisibilidadReceta(
  miembro: MiembroId,
  idReceta: string,
  visible: boolean,
): Promise<Result<void, AppError>> {
  try {
    await setDoc(
      REF(),
      { [miembro]: visible ? arrayUnion(idReceta) : arrayRemove(idReceta) },
      { merge: true },
    );
    return ok(undefined);
  } catch (e) {
    return err("FIRESTORE_ERROR", firebaseErrorMessage(e) ?? "Error al actualizar visibilidad.");
  }
}

export async function setVisibilidadMiembro(
  miembro: MiembroId,
  idRecetas: string[],
): Promise<Result<void, AppError>> {
  try {
    await setDoc(REF(), { [miembro]: idRecetas }, { merge: true });
    return ok(undefined);
  } catch (e) {
    return err("FIRESTORE_ERROR", firebaseErrorMessage(e) ?? "Error al guardar visibilidad.");
  }
}
