import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Diccionarios } from "../types/models";

let cachedDiccionarios: Diccionarios | null = null;

export async function getDiccionarios(): Promise<Diccionarios> {
  if (cachedDiccionarios) return cachedDiccionarios;

  const ref = doc(db, "config", "diccionarios");
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("No se encontró /config/diccionarios. Ejecutar el script de bootstrap.");
  }

  cachedDiccionarios = snap.data() as Diccionarios;
  return cachedDiccionarios;
}

export async function refreshDiccionarios(): Promise<Diccionarios> {
  cachedDiccionarios = null;
  return getDiccionarios();
}
