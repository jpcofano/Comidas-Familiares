/**
 * Etapa E3.4.11 — Seed catálogo verdulería/frutería + fiambrería (67 ítems).
 * admin SDK. Idempotente y SOLO-ALTA: saltea cualquier canonico existente.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const NUEVOS = JSON.parse(
  readFileSync(resolve("scripts/ingredientes_verduleria_fiambreria.json"), "utf-8")
) as any[];

const pad = (n: number) => String(n).padStart(4, "0");

async function main() {
  // ── Backup previo ────────────────────────────────────────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupDir = resolve("scripts/backups");
  mkdirSync(backupDir, { recursive: true });

  console.log("Exportando backup de ingredientes...");
  const ingSnap = await db.collection("ingredientes").get();
  writeFileSync(
    resolve(backupDir, `E3.4.11_ingredientes_${ts}.json`),
    JSON.stringify(ingSnap.docs.map(d => d.data()), null, 2),
  );
  console.log(`Backup guardado en scripts/backups/E3.4.11_ingredientes_${ts}.json`);

  // ── Mapa canonico → id y max actual ─────────────────────────────────────
  const idByCanon = new Map<string, string>();
  let max = 0;
  ingSnap.forEach((d) => {
    const x = d.data();
    const id = x.idIngrediente ?? d.id;
    idByCanon.set(x.canonico, id);
    const m = String(id).match(/^ING-(\d{4})$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  let next = max + 1;

  // ── Alta de ingredientes ─────────────────────────────────────────────────
  let creados = 0;
  const yaExistian: string[] = [];

  for (const def of NUEVOS) {
    if (idByCanon.has(def.canonico)) { yaExistian.push(def.canonico); continue; }
    const id = `ING-${pad(next++)}`;
    await db.collection("ingredientes").doc(id).set({
      idIngrediente: id,
      canonico: def.canonico,
      nombrePreferido: def.nombrePreferido,
      sinonimos: def.sinonimos,
      categoria: def.categoria,
      rolNutricional: def.rolNutricional,
      seccionGondola: def.seccionGondola,
      unidadesHabituales: def.unidadesHabituales,
      ambiguo: def.ambiguo,
      origen: def.origen,
      vecesUsado: 0,
      fechaCreacion: FieldValue.serverTimestamp(),
      ultimaModificacion: FieldValue.serverTimestamp(),
    });
    idByCanon.set(def.canonico, id);
    creados++;
    console.log(`  + ${id}  ${def.nombrePreferido}  [${def.seccionGondola}]`);
  }

  console.log(
    `Creados: ${creados} | ya existían: ${yaExistian.length}` +
    (yaExistian.length ? ` (${yaExistian.join(", ")})` : ""),
  );
}

main()
  .then(() => { console.log("Seed góndolas OK"); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
