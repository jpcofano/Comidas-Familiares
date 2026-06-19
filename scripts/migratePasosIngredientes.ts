/**
 * E9.14 Fase 2 — Migración del linkage paso↔ingrediente.
 *
 * Lee scripts/pasos_ingredientes.json y escribe paso.ingredientesUsados en
 * cada doc de receta correspondiente. Preserva todos los demás campos del doc.
 *
 * Uso:
 *   npx ts-node --esm scripts/migratePasosIngredientes.ts              # dry-run (default)
 *   npx ts-node --esm scripts/migratePasosIngredientes.ts --dry-run    # explícito
 *   npx ts-node --esm scripts/migratePasosIngredientes.ts --force      # escribe a Firestore
 *
 * Gate de F1.3: si hay cualquier id huérfano (presente en el JSON pero ausente
 * en ingredientes[] vivos de la receta), el script aborta ANTES de escribir.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DRY_RUN = !process.argv.includes("--force");
const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");
const LINKAGE_PATH         = resolve("scripts/pasos_ingredientes.json");

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface LinkageJson {
  generadoDe: string;
  criterio: string;
  stats: {
    pasosTotales: number;
    pasosTaggeados: number;
    coberturaPct: number;
    recetasConTag: number;
    orphanViolations: number;
  };
  recetas: Record<string, Record<string, string[]>>;
}

interface PasoDoc {
  nroPaso: number;
  [key: string]: unknown;
}

interface RecetaDoc {
  idReceta: string;
  ingredientes: Array<{ idIngrediente: string; [key: string]: unknown }>;
  pasos: PasoDoc[];
  [key: string]: unknown;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`ERROR: No se encontró el service account en ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
  }
  if (!existsSync(LINKAGE_PATH)) {
    console.error(`ERROR: No se encontró ${LINKAGE_PATH}`);
    process.exit(1);
  }

  initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
  const db = getFirestore();

  const linkage = JSON.parse(readFileSync(LINKAGE_PATH, "utf-8")) as LinkageJson;
  const recetaIds = Object.keys(linkage.recetas).sort();

  console.log(`\n${DRY_RUN ? "🔍 DRY-RUN" : "⚡ FORCE"} — E9.14 Fase 2 migración linkage paso↔ingrediente`);
  console.log(`JSON: ${LINKAGE_PATH}`);
  console.log(`Stats del JSON: ${linkage.stats.pasosTaggeados} pasos taggeados, ${recetaIds.length} recetas, ${linkage.stats.orphanViolations} huérfanos en construcción\n`);

  // ─── F1.3 Re-validación viva ────────────────────────────────────────────────

  console.log(`Cargando ${recetaIds.length} recetas desde Firestore (datos vivos)...`);

  const orphans: Array<{ idReceta: string; nroPaso: number; idIngrediente: string }> = [];
  const nroPasoInexistente: Array<{ idReceta: string; nroPaso: number }> = [];

  let docsConTag    = 0;
  let pasosConTag   = 0;
  let pasosOmitidos = 0; // nroPaso del JSON no existe en el doc vivo

  for (const idReceta of recetaIds) {
    const snap = await db.collection("recetas").doc(idReceta).get();
    if (!snap.exists) {
      console.warn(`  ⚠ ${idReceta} — doc no encontrado en Firestore (saltando)`);
      continue;
    }

    const receta = snap.data() as RecetaDoc;
    const idsEnReceta = new Set(receta.ingredientes.map(i => i.idIngrediente));
    const nroPasosEnReceta = new Set(receta.pasos.map(p => p.nroPaso));

    const tagsPorReceta = linkage.recetas[idReceta];
    let pasosTocados = 0;

    for (const [nroPasoStr, ids] of Object.entries(tagsPorReceta)) {
      const nroPaso = Number(nroPasoStr);

      if (!nroPasosEnReceta.has(nroPaso)) {
        nroPasoInexistente.push({ idReceta, nroPaso });
        pasosOmitidos++;
        continue;
      }

      for (const id of ids) {
        if (!idsEnReceta.has(id)) {
          orphans.push({ idReceta, nroPaso, idIngrediente: id });
        }
      }
      pasosTocados++;
      pasosConTag++;
    }

    if (pasosTocados > 0) docsConTag++;
  }

  // ─── Resultado de la validación ─────────────────────────────────────────────

  console.log(`\n── Re-validación contra datos vivos ──`);
  console.log(`  Docs receta que recibirían tag: ${docsConTag}`);
  console.log(`  Pasos que recibirían ingredientesUsados: ${pasosConTag}`);
  if (pasosOmitidos > 0) {
    console.warn(`  ⚠ nroPasos en el JSON inexistentes en el doc vivo: ${pasosOmitidos}`);
    for (const e of nroPasoInexistente) {
      console.warn(`    ${e.idReceta} paso ${e.nroPaso}`);
    }
  } else {
    console.log(`  ✓ Todos los nroPaso del JSON existen en los docs vivos`);
  }

  if (orphans.length > 0) {
    console.error(`\n🚫 GATE FALLÓ — ${orphans.length} id(s) huérfanos detectados (presentes en el JSON pero ausentes en ingredientes[] vivos):`);
    for (const o of orphans) {
      console.error(`  ${o.idReceta} paso ${o.nroPaso}: ${o.idIngrediente}`);
    }
    console.error(`\nAcción requerida: regenerar pasos_ingredientes.json contra un snapshot fresco antes de migrar.`);
    process.exit(2);
  }

  console.log(`  ✓ 0 huérfanos — todos los ids del linkage existen en ingredientes[] vivos`);

  if (DRY_RUN) {
    console.log(`\nDry-run completo. Cero escrituras realizadas.`);
    console.log(`Para migrar: npx ts-node --esm scripts/migratePasosIngredientes.ts --force\n`);
    return;
  }

  // ─── F2 Migración (solo con --force) ────────────────────────────────────────

  console.log(`\nEscribiendo en Firestore...`);
  let docsEscritos = 0;
  let pasosEscritos = 0;

  for (const idReceta of recetaIds) {
    const snap = await db.collection("recetas").doc(idReceta).get();
    if (!snap.exists) continue;

    const receta = snap.data() as RecetaDoc;
    const tagsPorReceta = linkage.recetas[idReceta];
    const nroPasosEnReceta = new Set(receta.pasos.map(p => p.nroPaso));

    // Construir mapa nroPaso → ingredientesUsados del JSON
    const linkageMap = new Map<number, string[]>();
    for (const [nroPasoStr, ids] of Object.entries(tagsPorReceta)) {
      const nroPaso = Number(nroPasoStr);
      if (nroPasosEnReceta.has(nroPaso)) linkageMap.set(nroPaso, ids);
    }

    if (linkageMap.size === 0) continue;

    // Read-modify: actualizar solo paso.ingredientesUsados; preservar todo lo demás
    const pasosActualizados = receta.pasos.map(paso => {
      const ids = linkageMap.get(paso.nroPaso);
      if (ids === undefined) {
        // Paso sin tag: preservar tal cual (si tenía ingredientesUsados de antes, lo elimina
        // para que quede coherente. Si nunca tuvo, es un no-op con undefined).
        const { ingredientesUsados: _drop, ...resto } = paso as PasoDoc & { ingredientesUsados?: string[] };
        return resto;
      }
      return { ...paso, ingredientesUsados: ids };
    });

    await db.collection("recetas").doc(idReceta).update({ pasos: pasosActualizados });
    docsEscritos++;
    pasosEscritos += linkageMap.size;
    process.stdout.write(".");
  }

  console.log(`\n\n✓ Migración completa: ${docsEscritos} docs actualizados, ${pasosEscritos} pasos taggeados.\n`);
}

main().catch(e => {
  console.error("ERROR:", e);
  process.exit(1);
});
