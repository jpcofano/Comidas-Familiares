import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Historial } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";

export async function getHistorialReciente(): Promise<Result<Historial[], AppError>> {
  try {
    const q = query(
      collection(db, "historial"),
      orderBy("fechaRealizadaTimestamp", "desc"),
      limit(30)
    );
    const snap = await getDocs(q);
    return ok(snap.docs.map((d) => d.data() as Historial));
  } catch (e) {
    return err("historial-fetch-failed", firebaseErrorMessage(e) ?? "No se pudo cargar el historial.", e);
  }
}

export async function getHistorialPorId(idHist: string): Promise<Result<Historial, AppError>> {
  try {
    const snap = await getDoc(doc(db, "historial", idHist));
    if (!snap.exists()) return err("historial-not-found", "Entrada de historial no encontrada.");
    return ok(snap.data() as Historial);
  } catch (e) {
    return err("historial-fetch-failed", firebaseErrorMessage(e) ?? "No se pudo cargar la entrada.", e);
  }
}

export async function getHistorialDeReceta(idReceta: string): Promise<Historial[]> {
  const q = query(
    collection(db, "historial"),
    where("idReceta", "==", idReceta),
    orderBy("fechaRealizadaTimestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Historial);
}

export async function getHistorialDeMenu(idMenu: string): Promise<Historial[]> {
  const q = query(
    collection(db, "historial"),
    where("idMenu", "==", idMenu),
    orderBy("fechaRealizadaTimestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Historial);
}
