/**
 * E9.12 — Auditoría de desync idIngrediente. READ-ONLY.
 *
 * Hipótesis: E9.0 reasignó IDs en el catálogo de ingredientes. Las recetas en
 * Firestore conservan los idIngrediente viejos, que ahora resuelven al canonico
 * incorrecto respecto de textoOriginal.
 *
 * D1: blast radius (total refs mal apuntadas, recetas afectadas)
 * D2: patrón (rango de IDs, contigüidad)
 * D3: recuperabilidad (¿todas tienen textoOriginal útil?)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(
  readFileSync(resolve("scripts/service-account.json"), "utf-8"),
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Normalización ─────────────────────────────────────────────────────────────
const STOP = new Set([
  "de","del","la","el","los","las","un","una","con","y","o","e","a","en","al","lo","se",
]);

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sigWords(s: string): string[] {
  return norm(s).split(" ").filter(w => w.length >= 3 && !STOP.has(w));
}

/**
 * Devuelve true si el canonico "encaja" con el textoOriginal.
 * Lógica:
 *   1. Substring directo (el canonico aparece literal en textoOriginal o viceversa)
 *   2. Word-prefix: al menos 1 palabra significativa del canonico (≥4 chars)
 *      aparece como prefijo de alguna palabra del textoOriginal (maneja plurales)
 *   Si NINGUNA condición se cumple → mismatch.
 */
function isMatch(canonico: string, textoOriginal: string): boolean {
  const nc = norm(canonico);
  const nt = norm(textoOriginal);

  // Condición 1: substring directo
  if (nt.includes(nc) || nc.includes(nt)) return true;

  // Condición 2: word-prefix (maneja plurales tipo "tomate" en "tomates")
  const cWords = sigWords(canonico).filter(w => w.length >= 4);
  if (cWords.length === 0) return true; // canónico muy corto → damos beneficio de la duda
  const tWords = sigWords(textoOriginal);
  const anyMatch = cWords.some(cw => tWords.some(tw => tw.startsWith(cw) || cw.startsWith(tw)));
  return anyMatch;
}

// ── Interfaces mínimas ────────────────────────────────────────────────────────
interface IngRef {
  idIngrediente: string;
  textoOriginal?: string;
  [k: string]: unknown;
}
interface Receta {
  idReceta: string;
  nombre: string;
  ingredientes?: IngRef[];
  [k: string]: unknown;
}
interface Ingrediente {
  idIngrediente: string;
  canonico: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Cargando catálogo desde Firestore…");
  const [ingSnap, recSnap] = await Promise.all([
    db.collection("ingredientes").get(),
    db.collection("recetas").get(),
  ]);

  // id → canonico
  const catalogoMap = new Map<string, string>();
  ingSnap.forEach(d => {
    const x = d.data() as Ingrediente;
    catalogoMap.set(x.idIngrediente ?? d.id, x.canonico);
  });

  const recetas = recSnap.docs.map(d => d.data() as Receta);
  console.log(`Catálogo: ${catalogoMap.size} ingredientes | Recetas: ${recetas.length}\n`);

  // ── Escaneo ────────────────────────────────────────────────────────────────
  interface Mismatch {
    idReceta: string;
    nombre: string;
    textoOriginal: string;
    idIngrediente: string;
    canonico_actual: string;
  }

  const mismatches: Mismatch[] = [];
  const huerfanos = new Set<string>(); // IDs no encontrados en catálogo
  let totalRefs = 0;

  for (const receta of recetas) {
    for (const ref of receta.ingredientes ?? []) {
      totalRefs++;
      const canonico = catalogoMap.get(ref.idIngrediente);
      if (canonico === undefined) {
        huerfanos.add(ref.idIngrediente);
        continue;
      }
      const texto = (ref.textoOriginal ?? "").trim();
      if (texto === "") {
        // Sin textoOriginal → registramos como sospechoso pero no como mismatch definitivo
        mismatches.push({
          idReceta: receta.idReceta,
          nombre: receta.nombre,
          textoOriginal: "(vacío)",
          idIngrediente: ref.idIngrediente,
          canonico_actual: canonico,
        });
        continue;
      }
      if (!isMatch(canonico, texto)) {
        mismatches.push({
          idReceta: receta.idReceta,
          nombre: receta.nombre,
          textoOriginal: texto,
          idIngrediente: ref.idIngrediente,
          canonico_actual: canonico,
        });
      }
    }
  }

  // ── D1: Blast radius ───────────────────────────────────────────────────────
  const recetasAfectadas = new Set(mismatches.map(m => m.idReceta));
  console.log("══════════════════════════════════════════════════");
  console.log("D1 — BLAST RADIUS");
  console.log("══════════════════════════════════════════════════");
  console.log(`Total refs escaneadas   : ${totalRefs}`);
  console.log(`Refs mal apuntadas      : ${mismatches.length}`);
  console.log(`Recetas afectadas       : ${recetasAfectadas.size} / ${recetas.length}`);
  console.log(`IDs huérfanos           : ${huerfanos.size}${huerfanos.size ? " — " + [...huerfanos].join(", ") : ""}`);

  console.log("\n-- Muestra (15 primeras filas) --");
  console.log("textoOriginal                          | idIngrediente | canonico_actual          | receta");
  console.log("-".repeat(115));
  for (const m of mismatches.slice(0, 15)) {
    const col1 = m.textoOriginal.padEnd(38).slice(0, 38);
    const col2 = m.idIngrediente.padEnd(13);
    const col3 = m.canonico_actual.padEnd(24).slice(0, 24);
    console.log(`${col1} | ${col2} | ${col3} | ${m.nombre}`);
  }

  console.log("\n-- Por receta afectada (todas) --");
  const byReceta = new Map<string, Mismatch[]>();
  for (const m of mismatches) {
    if (!byReceta.has(m.idReceta)) byReceta.set(m.idReceta, []);
    byReceta.get(m.idReceta)!.push(m);
  }
  for (const [idReceta, refs] of byReceta) {
    console.log(`\n  ${idReceta} — ${refs[0].nombre}`);
    for (const r of refs) {
      console.log(`    "${r.textoOriginal}"  →  ${r.idIngrediente}  →  canonico="${r.canonico_actual}"`);
    }
  }

  // ── D2: Patrón y causa ─────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════");
  console.log("D2 — PATRÓN Y CAUSA");
  console.log("══════════════════════════════════════════════════");

  const badIdSet = new Set(mismatches.map(m => m.idIngrediente));
  const badIds = [...badIdSet].sort((a, b) => {
    return parseInt(a.replace("ING-", "")) - parseInt(b.replace("ING-", ""));
  });
  const nums = badIds.map(id => parseInt(id.replace("ING-", "")));
  const minN = Math.min(...nums);
  const maxN = Math.max(...nums);
  const isContiguous = nums.length > 0 && nums.length === maxN - minN + 1;

  console.log(`IDs únicos mal apuntados (${badIds.length}): ${badIds.join(", ")}`);
  console.log(`Rango numérico: ING-${String(minN).padStart(4, "0")} → ING-${String(maxN).padStart(4, "0")}`);
  console.log(`Rango contiguo: ${isContiguous ? "SÍ (indica reasignación en bloque)" : "NO (casos dispersos)"}`);

  // Distribución por receta de cuántas refs tiene cada afectada
  const countPerReceta = [...byReceta.entries()]
    .map(([id, refs]) => ({ id, nombre: refs[0].nombre, n: refs.length }))
    .sort((a, b) => b.n - a.n);
  console.log("\nRecetas por cantidad de refs afectadas:");
  for (const r of countPerReceta) {
    console.log(`  ${r.id}  ${r.n} ref(s)  ${r.nombre}`);
  }

  // ── D3: Recuperabilidad ────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════");
  console.log("D3 — RECUPERABILIDAD");
  console.log("══════════════════════════════════════════════════");

  const sinTexto = mismatches.filter(m => m.textoOriginal === "(vacío)");
  console.log(`Refs SIN textoOriginal (irrecuperables automáticamente): ${sinTexto.length}`);
  if (sinTexto.length > 0) {
    for (const m of sinTexto) {
      console.log(`  ${m.idReceta} — ${m.nombre} — ${m.idIngrediente}`);
    }
  }

  // ¿Los textoOriginals bastan para re-resolver contra el catálogo actual?
  console.log("\nIntento de re-resolución desde textoOriginal:");
  // Build canonico → id map (reverse)
  const canonToId = new Map<string, string>();
  ingSnap.forEach(d => {
    const x = d.data() as Ingrediente;
    canonToId.set(norm(x.canonico), x.idIngrediente ?? d.id);
  });
  // Also index by normalized words for fuzzy lookup
  let reResolvibles = 0;
  let noReResolvibles = 0;
  const noReResolviblesList: Mismatch[] = [];

  for (const m of mismatches) {
    if (m.textoOriginal === "(vacío)") { noReResolvibles++; noReResolviblesList.push(m); continue; }
    const nt = norm(m.textoOriginal);
    // Exact match
    if (canonToId.has(nt)) { reResolvibles++; continue; }
    // Prefix/substring match: find catalog entries whose canonico is a substring of textoOriginal
    let found = false;
    for (const [nc, _id] of canonToId) {
      if (nt.includes(nc) || nc.includes(nt)) { found = true; break; }
    }
    if (found) { reResolvibles++; } else { noReResolvibles++; noReResolviblesList.push(m); }
  }

  console.log(`  Re-resolvibles desde textoOriginal : ${reResolvibles}`);
  console.log(`  NO re-resolvibles (riesgo)         : ${noReResolvibles}`);
  if (noReResolviblesList.length > 0) {
    console.log("\n  Lista de NO re-resolvibles:");
    for (const m of noReResolviblesList) {
      console.log(`    ${m.idReceta} "${m.textoOriginal}" | ${m.idIngrediente} | canonico="${m.canonico_actual}"`);
    }
  }

  console.log("\nSeed JSONs con campo 'canon': disponibles para cruzar (scripts/seed-data/recetas*.json).");
  console.log("Cada ref lleva canon + textoOriginal → re-resolución idempotente posible si el canon existe en el catálogo actual.");

  console.log("\nFin auditoría E9.12.");
}

main().catch(e => { console.error(e); process.exit(1); });
