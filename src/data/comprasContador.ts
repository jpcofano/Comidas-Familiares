import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { ComprasContador } from "../types/models";

export function subscribeContador(cb: (c: ComprasContador) => void): () => void {
  return onSnapshot(
    doc(db, "config", "comprasContador"),
    (snap) => cb((snap.data() as ComprasContador) ?? { meses: {} }),
  );
}

export const mesActualKey = () => new Date().toISOString().slice(0, 7);

export function resumenPorMes(c: ComprasContador) {
  return Object.entries(c.meses ?? {})
    .map(([mesKey, porMiembro]) => ({
      mesKey,
      porMiembro: porMiembro ?? {},
      total: Object.values(porMiembro ?? {}).reduce((a, n) => a + (n ?? 0), 0),
    }))
    .sort((a, b) => b.mesKey.localeCompare(a.mesKey));
}
