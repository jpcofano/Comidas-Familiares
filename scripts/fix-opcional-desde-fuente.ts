/**
 * E11.3.4 — Re-derivar `opcional` desde recetas.json.
 *
 * Problema: el seed (reseed-ingredientes.ts) hace Boolean(i.opcional), convirtiendo
 * cualquier string no-vacío a true — así "Picada especial" quedó como opcional:true
 * y macrosDeReceta() salteaba esos ingredientes.
 *
 * Solución: re-leer recetas.json, clasificar cada string de origen correctamente:
 *   - ""               → false
 *   - "Sí/No/true/…"   → boolean
 *   - regex optionalidad → true  + notas
 *   - resto (nota prep)  → false + notas
 *
 * Solo toca ingredientes cuyo origen en el JSON era string (los problemáticos).
 * Ingredientes con origen boolean se dejan intactos.
 *
 * Uso:
 *   npx ts-node --esm scripts/fix-opcional-desde-fuente.ts           # dry-run
 *   npx ts-node --esm scripts/fix-opcional-desde-fuente.ts --force   # escribe
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DRY_RUN = !process.argv.includes("--force");
const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");
const RECETAS_JSON_PATH     = resolve("scripts/seed-data/recetas.json");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`ERROR: No se encontró ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}
if (!existsSync(RECETAS_JSON_PATH)) {
  console.error(`ERROR: No se encontró ${RECETAS_JSON_PATH}`);
  process.exit(1);
}

// ─── Clasificación ────────────────────────────────────────────────────────────

// Strings que indican opcionalidad real (para regex case-insensitive, sin acentos normalizados).
const REGEX_OPCIONAL_REAL =
  /opcional|aparte|para (los )?chicos|solo para|quienes quieran|si quer[eé]s|a gusto del/i;

function parseBoolString(s: string): boolean | null {
  const n = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (["si", "yes", "true", "1"].includes(n)) return true;
  if (["no", "false", "0"].includes(n)) return false;
  return null;
}

interface Clasif {
  opcional: boolean;
  notaDerivada?: string; // texto del string original, cuando aporta info
}

function clasificarString(raw: string): Clasif {
  const t = raw.trim();
  if (!t) return { opcional: false };

  const b = parseBoolString(t);
  if (b !== null) return { opcional: b };

  if (REGEX_OPCIONAL_REAL.test(t)) return { opcional: true, notaDerivada: t };
  return { opcional: false, notaDerivada: t };
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface IngJSON {
  idIngrediente?: string;
  textoOriginal?: string;
  opcional?: unknown;
  notas?: string;
  [k: string]: unknown;
}

interface RecetaJSON {
  idReceta?: string;
  nombre?: string;
  ingredientes?: IngJSON[];
}

// ─── Índice fuente ────────────────────────────────────────────────────────────
// Clave: `${idIngrediente}:${textoOriginal}` → { clasif, notasOrigen }
// Solo para ingredientes cuyo opcional en JSON era string.

interface EntradaFuente {
  clasif: Clasif;
  notasOrigen?: string; // campo notas del JSON (separado del opcional)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const fuente = JSON.parse(readFileSync(RECETAS_JSON_PATH, "utf-8")) as RecetaJSON[];

  // Construir índice: Map<idReceta, Map<ingKey, EntradaFuente>>
  const indice = new Map<string, Map<string, EntradaFuente>>();
  let totalStringOrigen = 0;

  for (const r of fuente) {
    if (!r.idReceta || !Array.isArray(r.ingredientes)) continue;
    const mapa = new Map<string, EntradaFuente>();
    for (const i of r.ingredientes) {
      if (typeof i.opcional !== "string") continue; // solo los problemáticos
      const k = `${i.idIngrediente ?? ""}:${i.textoOriginal ?? ""}`;
      mapa.set(k, {
        clasif: clasificarString(i.opcional),
        notasOrigen: typeof i.notas === "string" ? i.notas : undefined,
      });
      totalStringOrigen++;
    }
    if (mapa.size > 0) indice.set(r.idReceta, mapa);
  }

  console.log(`\n📋 Fuente: ${fuente.length} recetas, ${indice.size} con opcional-string, ${totalStringOrigen} ingredientes a re-derivar`);
  console.log(`${DRY_RUN ? "🔍 DRY-RUN" : "⚡ FORCE"} — no ${DRY_RUN ? "se escribe nada" : "hay vuelta atrás"}\n`);

  initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
  const db = getFirestore();

  const snap = await db.collection("recetas").get();
  const idsFirestore = new Set(snap.docs.map(d => d.id));
  const noEncontradas = [...indice.keys()].filter(id => !idsFirestore.has(id));

  let recetasTocadas = 0;
  let ingAFalse = 0;
  let ingConfirmadosTrue = 0;
  const ejemplos: string[] = [];

  for (const docSnap of snap.docs) {
    const idReceta = docSnap.id;
    const mapaFuente = indice.get(idReceta);
    if (!mapaFuente) continue;

    const data = docSnap.data();
    const ingsFS: IngJSON[] = Array.isArray(data.ingredientes) ? data.ingredientes : [];

    let modificada = false;
    const ingNuevos = ingsFS.map(ing => {
      const k = `${ing.idIngrediente ?? ""}:${ing.textoOriginal ?? ""}`;
      const entrada = mapaFuente.get(k);
      if (!entrada) return ing; // origen era boolean → no tocar

      modificada = true;
      const { clasif, notasOrigen } = entrada;

      const nuevo: IngJSON = { ...ing, opcional: clasif.opcional };

      // Notas finales: notasOrigen del JSON + notaDerivada del string opcional
      const partes: string[] = [];
      if (notasOrigen) partes.push(notasOrigen);
      if (clasif.notaDerivada) partes.push(clasif.notaDerivada);
      if (partes.length > 0) nuevo.notas = partes.join(" · ");
      // Si no hay partes → no pisamos notas existentes (dejar lo que haya en Firestore)

      if (clasif.opcional) {
        ingConfirmadosTrue++;
        if (ejemplos.length < 8) {
          ejemplos.push(`  [${idReceta}] "${ing.textoOriginal}" → TRUE  "${clasif.notaDerivada}"`);
        }
      } else {
        ingAFalse++;
        if (ejemplos.length < 8) {
          ejemplos.push(`  [${idReceta}] "${ing.textoOriginal}" → false "${clasif.notaDerivada ?? ""}"`);
        }
      }

      return nuevo;
    });

    if (!modificada) continue;
    recetasTocadas++;

    if (!DRY_RUN) {
      await db.doc(`recetas/${idReceta}`).set({ ingredientes: ingNuevos }, { merge: true });
    }
  }

  console.log(
`────────────────────────────────────────────────
  Resumen ${DRY_RUN ? "(DRY-RUN)" : "(FORCE — escrito)"}
────────────────────────────────────────────────
  Recetas en Firestore     : ${snap.size}
  Recetas con cambios      : ${recetasTocadas}
  Ing → false (cuentan)   : ${ingAFalse}
  Ing → true  (opcionales) : ${ingConfirmadosTrue}
────────────────────────────────────────────────`
  );

  if (noEncontradas.length) {
    console.log(`\nRecetas de fuente no en Firestore (${noEncontradas.length}):`);
    noEncontradas.forEach(id => console.log(`  ✗ ${id}`));
  }

  if (ejemplos.length) {
    console.log("\nEjemplos (primeros 8):");
    ejemplos.forEach(e => console.log(e));
  }

  if (DRY_RUN) {
    console.log("\n→ Para escribir: npx ts-node --esm scripts/fix-opcional-desde-fuente.ts --force");
  } else {
    console.log("\n✓ Datos actualizados en Firestore.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
