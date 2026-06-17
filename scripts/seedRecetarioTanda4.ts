/**
 * Etapa E3.4.14 — Seed recetario tanda 4 italiana. admin SDK, SOLO-ALTA, idempotente.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { normalizeText } from "../src/lib/canonical";

const serviceAccount = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const DIR = "scripts/seed-data";
const NUEVOS_ING = JSON.parse(readFileSync(resolve(DIR, "ingredientes_nuevos_tanda4.json"), "utf-8")) as any[];
const NUEVAS_REC = JSON.parse(readFileSync(resolve(DIR, "recetas_tanda4.json"), "utf-8")) as any[];
const pad = (n: number) => String(n).padStart(4, "0");

async function maxNum(coll: string, prefix: string): Promise<number> {
  const snap = await db.collection(coll).get();
  let max = 0;
  snap.forEach((d) => { const m = d.id.match(new RegExp(`^${prefix}-(\\d{4})$`)); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  return max;
}

async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupDir = resolve("scripts/backups");
  mkdirSync(backupDir, { recursive: true });

  console.log("Exportando backup...");
  const [ingSnap, recSnap] = await Promise.all([
    db.collection("ingredientes").get(),
    db.collection("recetas").get(),
  ]);
  writeFileSync(resolve(backupDir, `E3.4.14_ingredientes_${ts}.json`), JSON.stringify(ingSnap.docs.map(d => d.data()), null, 2));
  writeFileSync(resolve(backupDir, `E3.4.14_recetas_${ts}.json`), JSON.stringify(recSnap.docs.map(d => d.data()), null, 2));
  console.log(`Backup guardado (${ts})`);

  const idByCanon = new Map<string, string>();
  const catByCanon = new Map<string, string>();
  ingSnap.forEach((d) => {
    const x = d.data();
    idByCanon.set(x.canonico, x.idIngrediente ?? d.id);
    catByCanon.set(x.canonico, x.categoria);
  });

  // ── F2 ──────────────────────────────────────────────────────────────────
  let nextIng = (await maxNum("ingredientes", "ING")) + 1;
  let ingCre = 0;
  const yaExistian: string[] = [];
  for (const def of NUEVOS_ING) {
    if (idByCanon.has(def.canonico)) { yaExistian.push(def.canonico); continue; }
    const id = `ING-${pad(nextIng++)}`;
    await db.collection("ingredientes").doc(id).set({
      idIngrediente: id, canonico: def.canonico, nombrePreferido: def.nombrePreferido,
      sinonimos: def.sinonimos, categoria: def.categoria, rolNutricional: def.rolNutricional,
      seccionGondola: def.seccionGondola, unidadesHabituales: def.unidadesHabituales,
      ambiguo: def.ambiguo, origen: def.origen,
      vecesUsado: 0, fechaCreacion: FieldValue.serverTimestamp(), ultimaModificacion: FieldValue.serverTimestamp(),
    });
    idByCanon.set(def.canonico, id); catByCanon.set(def.canonico, def.categoria);
    ingCre++;
    console.log(`  + ${id}  ${def.nombrePreferido}`);
  }
  console.log(`F2: ${ingCre} creados, ${yaExistian.length} ya existían${yaExistian.length ? ` (${yaExistian.join(", ")})` : ""}.`);

  // ── F3 ──────────────────────────────────────────────────────────────────
  let nextRec = (await maxNum("recetas", "REC")) + 1;
  let recCre = 0, recSalt = 0;
  for (const r of NUEVAS_REC) {
    const nc = normalizeText(r.nombre);
    const dup = await db.collection("recetas").where("nombreCanonico", "==", nc).limit(1).get();
    if (!dup.empty) { recSalt++; console.log(`  = (existe) ${r.nombre}`); continue; }

    const ingredientes = r.ingredientes.map((ing: any) => {
      const idIngrediente = idByCanon.get(ing.canon);
      if (!idIngrediente) throw new Error(`Receta "${r.nombre}": canónico sin resolver "${ing.canon}"`);
      const o: any = { idIngrediente, textoOriginal: ing.textoOriginal, seccion: ing.seccion, cantidad: ing.cantidad, unidad: ing.unidad, opcional: ing.opcional, notas: ing.notas };
      if (ing.alternativas?.length) o.alternativas = ing.alternativas.map((a: any) => {
        const aid = idByCanon.get(a.canon);
        if (!aid) throw new Error(`Receta "${r.nombre}": alternativa sin resolver "${a.canon}"`);
        return { idIngrediente: aid };
      });
      return o;
    });

    const id = `REC-${pad(nextRec++)}`;
    const { ingredientes: _omit, ...resto } = r;
    await db.collection("recetas").doc(id).set({
      idReceta: id, nombreCanonico: nc, vecesCocinada: 0,
      fechaImportacion: FieldValue.serverTimestamp(),
      ...resto, ingredientes,
    });
    recCre++;
    console.log(`  + ${id}  ${r.nombre}`);
  }
  console.log(`F3: ${recCre} creadas, ${recSalt} ya existían.`);
}

main().then(() => { console.log("Seed tanda 4 OK"); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
