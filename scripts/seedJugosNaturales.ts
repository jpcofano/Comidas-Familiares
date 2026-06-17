/**
 * Etapa E3.6 — Seed 12 jugos naturales. admin SDK, SOLO-ALTA, idempotente.
 * No hay ingredientes nuevos; solo F3 (recetas).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { normalizeText } from "../src/lib/canonical";

const serviceAccount = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const NUEVAS_REC = JSON.parse(
  readFileSync(resolve("scripts/seed-data/recetas_jugos.json"), "utf-8")
) as any[];

const pad = (n: number) => String(n).padStart(4, "0");

async function maxNum(coll: string, prefix: string): Promise<number> {
  const snap = await db.collection(coll).get();
  let max = 0;
  snap.forEach((d) => {
    const m = d.id.match(new RegExp(`^${prefix}-(\\d{4})$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max;
}

async function main() {
  // ── Backup previo ────────────────────────────────────────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupDir = resolve("scripts/backups");
  mkdirSync(backupDir, { recursive: true });

  console.log("Exportando backup de recetas...");
  const [ingSnap, recSnap] = await Promise.all([
    db.collection("ingredientes").get(),
    db.collection("recetas").get(),
  ]);
  writeFileSync(
    resolve(backupDir, `E3.6_recetas_${ts}.json`),
    JSON.stringify(recSnap.docs.map(d => d.data()), null, 2),
  );
  console.log(`Backup guardado: E3.6_recetas_${ts}.json`);

  // mapa canonico → id desde el catálogo VIVO
  const idByCanon = new Map<string, string>();
  ingSnap.forEach((d) => {
    const x = d.data();
    idByCanon.set(x.canonico, x.idIngrediente ?? d.id);
  });

  // ── F3: recetas ──────────────────────────────────────────────────────────
  let nextRec = (await maxNum("recetas", "REC")) + 1;
  let recCre = 0, recSalt = 0;

  for (const r of NUEVAS_REC) {
    const nc = normalizeText(r.nombre);
    const dup = await db.collection("recetas").where("nombreCanonico", "==", nc).limit(1).get();
    if (!dup.empty) { recSalt++; console.log(`  = (existe) ${r.nombre}`); continue; }

    const ingredientes = r.ingredientes.map((ing: any) => {
      const idIngrediente = idByCanon.get(ing.canon);
      if (!idIngrediente) throw new Error(`Receta "${r.nombre}": canónico sin resolver "${ing.canon}"`);
      const o: any = {
        idIngrediente,
        textoOriginal: ing.textoOriginal,
        seccion: ing.seccion,
        cantidad: ing.cantidad,
        unidad: ing.unidad,
        opcional: ing.opcional,
        notas: ing.notas,
      };
      if (ing.alternativas?.length) {
        o.alternativas = ing.alternativas.map((a: any) => {
          const aid = idByCanon.get(a.canon);
          if (!aid) throw new Error(`Receta "${r.nombre}": alternativa sin resolver "${a.canon}"`);
          return { idIngrediente: aid };
        });
      }
      return o;
    });

    const id = `REC-${pad(nextRec++)}`;
    const { ingredientes: _omit, ...resto } = r;
    await db.collection("recetas").doc(id).set({
      idReceta: id,
      nombreCanonico: nc,
      vecesCocinada: 0,
      fechaImportacion: FieldValue.serverTimestamp(),
      ...resto,
      ingredientes,
    });
    recCre++;
    console.log(`  + ${id}  ${r.nombre}`);
  }

  console.log(`F3: ${recCre} creadas, ${recSalt} ya existían.`);
}

main()
  .then(() => { console.log("Seed jugos OK"); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
