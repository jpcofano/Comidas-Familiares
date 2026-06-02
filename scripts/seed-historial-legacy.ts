/**
 * E7.12 — Limpieza de historial de prueba + seed entrada legacy.
 *
 * F2: backup de /historial actual → scripts/_backups/historial_<ts>.json
 *     Borrado de los 18 docs de prueba.
 * F3: insert de 1 entrada real (Arañita al malbec, 2026-05-15, REC-1512).
 *     Update de /recetas/REC-1512 (vecesCocinada, ultimaEvaluacion, ultimoPuntaje).
 *
 * Uso:
 *   npx ts-node --esm scripts/seed-historial-legacy.ts           # dry-run
 *   npx ts-node --esm scripts/seed-historial-legacy.ts --force   # ejecuta
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DRY_RUN = !process.argv.includes("--force");
const SA_PATH = resolve("scripts/service-account.json");

if (!existsSync(SA_PATH)) { console.error("ERROR: no se encontró service-account.json"); process.exit(1); }

// ─── idHist (misma lógica que src/lib/voto.ts:proximoIdHistorial) ─────────────

function proximoIdHistorial(): string {
  const now = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  const fecha = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `HIST-${fecha}-${rand}`;
}

async function main() {
  initializeApp({ credential: cert(SA_PATH) });
  const db = getFirestore();

  console.log(`\n${DRY_RUN ? "🔍 DRY-RUN" : "⚡ FORCE"} — E7.12 limpieza historial + seed legacy\n`);

  // ── F2: backup ───────────────────────────────────────────────────────────────
  const snap = await db.collection("historial").get();
  const backupData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const ts = (() => {
    const n = new Date();
    const p = (x: number, l = 2) => String(x).padStart(l, "0");
    return `${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}-${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`;
  })();
  const backupPath = resolve(`scripts/_backups/historial_${ts}.json`);

  if (!DRY_RUN) {
    mkdirSync(resolve("scripts/_backups"), { recursive: true });
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`✓ Backup: ${backupPath} (${snap.size} docs)`);
  } else {
    console.log(`[DRY] Backup: ${backupPath} (${snap.size} docs)`);
  }

  // ── F2: borrado ──────────────────────────────────────────────────────────────
  console.log(`\n── F2: borrado de ${snap.size} docs de prueba ──`);
  snap.docs.forEach(d => console.log(`  ✗ ${d.id} | ${d.data().fechaRealizada} | ${d.data().receta ?? d.data().nombreSeleccion}`));

  if (!DRY_RUN) {
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`\n✓ ${snap.size} docs borrados.`);
  }

  // ── F3: seed entrada legacy ──────────────────────────────────────────────────
  const idHist = proximoIdHistorial();
  const RECETA_NOMBRE = "Arañita al malbec con hongos, Papas Anna y crema rústica de choclo";

  const docLegacy = {
    idHist,
    fechaRealizada: "2026-05-15",
    fechaRealizadaTimestamp: Timestamp.fromDate(new Date("2026-05-15T12:00:00-03:00")),
    idPlan: "",
    idReceta: "REC-1512",
    idMenu: "",
    idSeleccion: "REC-1512",
    tipoSeleccion: "receta",
    receta: RECETA_NOMBRE,
    nombreSeleccion: RECETA_NOMBRE,
    semanaInicio: "2026-05-11",
    ocasion: "Cena familiar",
    calificaciones: { juanpablo: 8, maria: 9, sofia: 8, federico: 8 },
    comentarios: {
      juanpablo: "",
      maria: "Salsa increíble, zanahorias al horno con miel y el ajo al horno rico.",
      sofia: "Las papas le parecieron picantes, la zanahoria 10/10, el choclo rico, la salsa demasiado potente.",
      federico: "Le gustó la salsa; la carne, mmm; el sabor del choclo bien pero no la textura; la papa, valoró la intención pero un bajón.",
    },
    promedio: 8.3,
    resultado: "Muy bueno",
    repetir: "Sí",
    costoRealAprox: "",
    dificultadReal: "Media",
    queSalioBien: "",
    queCambiaria: "Me olvidé de sacar la sal gruesa y quedó salado. Mucho trabajo las papas para lo que son. Y el salado quizá con demasiado aceite.",
    notasFamiliares: "",
  };

  console.log(`\n── F3: seed doc ${idHist} ──`);
  console.log(`  fechaRealizada: ${docLegacy.fechaRealizada}`);
  console.log(`  receta: "${RECETA_NOMBRE}"`);
  console.log(`  ocasion: ${docLegacy.ocasion} | promedio: ${docLegacy.promedio} | resultado: ${docLegacy.resultado}`);

  if (!DRY_RUN) {
    await db.doc(`historial/${idHist}`).set(docLegacy);
    console.log(`\n✓ Doc historial insertado: ${idHist}`);

    // Update stats REC-1512
    await db.doc("recetas/REC-1512").update({
      vecesCocinada: 1,
      ultimaEvaluacion: Timestamp.fromDate(new Date("2026-05-15T12:00:00-03:00")),
      ultimoPuntaje: 8.3,
    });
    console.log(`✓ REC-1512 stats: vecesCocinada=1, ultimoPuntaje=8.3`);
  }

  if (DRY_RUN) {
    console.log("\n→ Para ejecutar: npx ts-node --esm scripts/seed-historial-legacy.ts --force");
  } else {
    console.log("\n✓ E7.12 completo.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
