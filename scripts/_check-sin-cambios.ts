import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizarUnidad } from "../src/lib/unidades";
import type { Receta } from "../src/types/models";

const sa = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection("recetas").get();
const sinCambios: { id: string; nombre: string; unidades: string }[] = [];

for (const d of snap.docs) {
  const rec = d.data() as Receta;
  if (!Array.isArray(rec.ingredientes)) {
    sinCambios.push({ id: d.id, nombre: rec.nombre, unidades: "(sin array)" });
    continue;
  }
  const cambia = rec.ingredientes.some((ing) => {
    const cruda = ing.unidad ?? null;
    return cruda !== normalizarUnidad(cruda);
  });
  if (!cambia) {
    sinCambios.push({
      id: d.id,
      nombre: rec.nombre,
      unidades: [...new Set(rec.ingredientes.map((i) => i.unidad ?? "(null)"))].join(", "),
    });
  }
}

console.log(`\nRecetas SIN cambios: ${sinCambios.length}\n`);
sinCambios.forEach((r) => console.log(`${r.id} — ${r.nombre}\n  unidades: ${r.unidades}\n`));
