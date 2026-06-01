/**
 * E11.2 — Poblar macros del catálogo de ingredientes.
 *
 * Lee scripts/seed-data/macros.json (generado por LLM, revisado por JP),
 * valida rangos y consistencia calórica, y escribe SOLO los campos
 * `macros` y `gramosPorUnidad` con merge — no pisa otros campos.
 *
 * Uso:
 *   npx ts-node --esm scripts/seed-macros.ts              # dry-run (default)
 *   npx ts-node --esm scripts/seed-macros.ts --dry-run    # explícito
 *   npx ts-node --esm scripts/seed-macros.ts --force      # escribe a Firestore
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DRY_RUN = !process.argv.includes("--force");
const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");
const MACROS_JSON_PATH     = resolve("scripts/seed-data/macros.json");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`ERROR: No se encontró el service account en ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}

if (!existsSync(MACROS_JSON_PATH)) {
  console.error(`ERROR: No se encontró ${MACROS_JSON_PATH}

Pasos:
  1. Corré: npx ts-node --esm scripts/export-ingredientes-para-macros.ts --out scripts/seed-data/ingredientes-para-macros.txt
  2. Pegá la lista en el prompt de docs/prompts/MACROS_LLM_PROMPT.md y corré el LLM.
  3. Guardá la respuesta como scripts/seed-data/macros.json.
  4. Volvé a correr este script.`);
  process.exit(1);
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MacroRow {
  idIngrediente: string;
  kcal: number;
  carbohidratos: number;
  proteinas: number;
  grasas: number;
  fibra: number;
  gramosPorUnidad?: number;
}

// ─── Validación ───────────────────────────────────────────────────────────────

function validarRangos(row: MacroRow): string | null {
  if (row.kcal < 0 || row.kcal > 900)
    return `kcal fuera de rango [0,900]: ${row.kcal}`;
  for (const campo of ["carbohidratos", "proteinas", "grasas", "fibra"] as const) {
    if (row[campo] < 0 || row[campo] > 100)
      return `${campo} fuera de rango [0,100]: ${row[campo]}`;
  }
  if (row.fibra > row.carbohidratos)
    return `fibra (${row.fibra}) > carbohidratos (${row.carbohidratos})`;
  return null;
}

function checkConsistencia(row: MacroRow): boolean {
  const estimado = 4 * row.carbohidratos + 4 * row.proteinas + 9 * row.grasas;
  if (row.kcal === 0 && estimado === 0) return true;
  const diff = Math.abs(estimado - row.kcal);
  const tol  = row.kcal * 0.3;
  return diff <= Math.max(tol, 10); // tolerancia mínima 10 kcal
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
  const db = getFirestore();

  // Cargar y parsear JSON
  let rows: MacroRow[];
  try {
    const raw = readFileSync(MACROS_JSON_PATH, "utf-8");
    rows = JSON.parse(raw) as MacroRow[];
    if (!Array.isArray(rows)) throw new Error("El JSON debe ser un array.");
  } catch (e) {
    console.error("ERROR al parsear macros.json:", e);
    process.exit(1);
  }

  console.log(`\n📋 macros.json: ${rows.length} filas`);
  if (DRY_RUN) console.log("🔍 Modo DRY-RUN — no se escribe nada. Usá --force para escribir.\n");
  else         console.log("⚡ Modo FORCE — escribiendo a Firestore...\n");

  // Cargar ids existentes
  const snap = await db.collection("ingredientes").get();
  const idsExistentes = new Set(snap.docs.map(d => d.id));

  let conMacros    = 0;
  let sinId        = 0;
  let saltados     = 0;
  let warnings     = 0;
  const saltadosList: string[] = [];
  const warningsList: string[] = [];

  for (const row of rows) {
    const id = row.idIngrediente;

    // Validar idIngrediente
    if (!id || !idsExistentes.has(id)) {
      console.log(`  ✗ SALTADO — id no existe en catálogo: "${id}"`);
      saltadosList.push(`${id}: id no existe`);
      sinId++;
      saltados++;
      continue;
    }

    // Validar rangos
    const errorRango = validarRangos(row);
    if (errorRango) {
      console.log(`  ✗ SALTADO — ${id}: ${errorRango}`);
      saltadosList.push(`${id}: ${errorRango}`);
      saltados++;
      continue;
    }

    // Chequeo de consistencia calórica (warn, no aborta)
    if (!checkConsistencia(row)) {
      const estimado = 4 * row.carbohidratos + 4 * row.proteinas + 9 * row.grasas;
      const msg = `${id}: kcal=${row.kcal} vs estimado=${Math.round(estimado)} (carb=${row.carbohidratos} prot=${row.proteinas} grasa=${row.grasas})`;
      console.log(`  ⚠ WARN consistencia — ${msg}`);
      warningsList.push(msg);
      warnings++;
    }

    if (!DRY_RUN) {
      const payload: Record<string, unknown> = {
        macros: {
          kcal:          row.kcal,
          carbohidratos: row.carbohidratos,
          proteinas:     row.proteinas,
          grasas:        row.grasas,
          fibra:         row.fibra,
        },
      };
      if (row.gramosPorUnidad != null) {
        payload.gramosPorUnidad = row.gramosPorUnidad;
      }
      await db.doc(`ingredientes/${id}`).set(payload, { merge: true });
    }

    conMacros++;
  }

  // Resumen
  const sinMacros = idsExistentes.size - conMacros;
  console.log(`
────────────────────────────────────────
  Resumen ${DRY_RUN ? "(DRY-RUN)" : "(FORCE — escrito)"}
────────────────────────────────────────
  ✓ Con macros escritas : ${conMacros}
  ~ Sin macros (catálogo): ${sinMacros} / ${idsExistentes.size}
  ⚠ Warnings consistencia: ${warnings}
  ✗ Saltados (rango/id)  : ${saltados}
────────────────────────────────────────`);

  if (warningsList.length) {
    console.log("\nDetalle de warnings:");
    warningsList.forEach(w => console.log(`  ⚠ ${w}`));
  }
  if (saltadosList.length) {
    console.log("\nDetalle de saltados:");
    saltadosList.forEach(s => console.log(`  ✗ ${s}`));
  }

  if (DRY_RUN) {
    console.log("\n→ Para escribir: npx ts-node --esm scripts/seed-macros.ts --force");
  } else {
    console.log("\n✓ Macros escritas a Firestore.");
  }
}

main().catch(err => { console.error("Error:", err); process.exit(1); });
