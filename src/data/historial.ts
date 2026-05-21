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

// Writes go through voteAndCloseIfComplete in planes.ts — this module is read-only.

export async function getHistorialReciente(limite: number): Promise<Historial[]> {
  const q = query(
    collection(db, "historial"),
    orderBy("fechaRealizadaTimestamp", "desc"),
    limit(limite)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Historial);
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
