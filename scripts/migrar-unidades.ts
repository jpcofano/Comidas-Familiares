/**
 * Migración E3.4.6 — Normalización de unidades en recetas y catálogo.
 *
 * Fase A (default): dry-run — reporta qué cambiaría SIN escribir.
 * Fase B (--apply): escribe los cambios en Firestore.
 *
 * Uso:
 *   npm run migrar:unidades              # dry-run
 *   npm run migrar:unidades -- --apply   # escribe
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { normalizarUnidad } from "../src/lib/unidades";
import type { Receta, Ingrediente } from "../src/types/models";

// ─── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN = !process.argv.includes("--apply");
const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`ERROR: scripts/service-account.json no encontrado.`);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── Unidades canónicas para /config/diccionarios ─────────────────────────────

const UNIDADES_CANONICAS = [
  "g", "kg", "ml", "l",
  "unidad", "cda", "cdita", "taza", "pizca",
  "punado", "diente", "rama", "ramita",
  "grande", "lata", "bife", "feta", "hoja", "atado",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dedupArray(arr: (string | null)[]): string[] {
  return [...new Set(arr.filter((x): x is string => x !== null))];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Migración de unidades — ${DRY_RUN ? "DRY-RUN (sin escrituras)" : "APPLY"} ===\n`);

  // Contadores globales
  let recetasTocadas = 0;
  let itemsIngredienteTocados = 0;
  let ingredientesCatalogoTocados = 0;
  const unidadesNoReconocidas = new Set<string>();

  // Interceptar console.warn para capturar sólo unidades verdaderamente no reconocidas
  // (las que normalizarUnidad no tiene en su tabla, a diferencia de los null explícitos)
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (args[0] === "[unidad] no reconocida:") {
      unidadesNoReconocidas.add(String(args[1]));
    }
    originalWarn(...args);
  };

  // ─── FASE 1: Recetas ───────────────────────────────────────────────────────

  console.log("── Recetas ──────────────────────────────────────────────────");
  const recetasSnap = await db.collection("recetas").get();

  for (const docSnap of recetasSnap.docs) {
    const receta = docSnap.data() as Receta;
    if (!Array.isArray(receta.ingredientes)) continue;

    const cambiosEnReceta: string[] = [];
    let recetaCambiada = false;

    const nuevosIngredientes = receta.ingredientes.map((ing) => {
      const cruda = ing.unidad ?? null;
      const canon = normalizarUnidad(cruda);

      const cambio = cruda !== canon;
      if (cambio) {
        cambiosEnReceta.push(
          `  • "${ing.textoOriginal}" → unidad: "${cruda ?? "(null)"}" → "${canon ?? "(null — a gusto)"}"`
        );
        recetaCambiada = true;
        itemsIngredienteTocados++;
      }

      if (!cambio) return ing;
      // Omitir la clave `unidad` cuando canon es null (a gusto): Firestore Admin
      // rechaza undefined; omitir la clave escribe el elemento sin ese campo.
      const { unidad: _old, ...ingSinUnidad } = ing;
      return canon != null ? { ...ingSinUnidad, unidad: canon } : ingSinUnidad;
    });

    if (recetaCambiada) {
      recetasTocadas++;
      console.log(`${docSnap.id} — ${receta.nombre}`);
      cambiosEnReceta.forEach((l) => console.log(l));

      if (!DRY_RUN) {
        await db.collection("recetas").doc(docSnap.id).update({
          ingredientes: nuevosIngredientes,
          ultimaModificacion: FieldValue.serverTimestamp(),
        });
      }
    }
  }

  // ─── FASE 2: Catálogo de ingredientes ────────────────────────────────────

  console.log("\n── Catálogo ─────────────────────────────────────────────────");
  const ingSnap = await db.collection("ingredientes").get();

  for (const docSnap of ingSnap.docs) {
    const ing = docSnap.data() as Ingrediente;
    const antes = ing.unidadesHabituales ?? [];
    const despuesRaw = antes.map((u) => normalizarUnidad(u));
    const despues = dedupArray(despuesRaw);

    const cambio =
      antes.length !== despues.length ||
      antes.some((u, i) => u !== despues[i]);

    if (cambio) {
      ingredientesCatalogoTocados++;
      console.log(
        `${docSnap.id} — ${ing.nombrePreferido}: [${antes.join(", ")}] → [${despues.join(", ")}]`
      );

      if (!DRY_RUN) {
        await db.collection("ingredientes").doc(docSnap.id).update({
          unidadesHabituales: despues,
          ultimaModificacion: FieldValue.serverTimestamp(),
        });
      }
    }
  }

  // ─── FASE 3: /config/diccionarios.unidadesCanonicas ──────────────────────

  if (!DRY_RUN) {
    console.log("\n── Actualizando /config/diccionarios ────────────────────────");
    await db.collection("config").doc("diccionarios").update({
      unidadesCanonicas: UNIDADES_CANONICAS,
    });
    console.log("  unidadesCanonicas actualizado:", UNIDADES_CANONICAS.join(", "));
  }

  // ─── Resumen ──────────────────────────────────────────────────────────────

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log(`Recetas con cambios:            ${recetasTocadas}`);
  console.log(`Ítems de ingrediente tocados:   ${itemsIngredienteTocados}`);
  console.log(`Ingredientes de catálogo:       ${ingredientesCatalogoTocados}`);

  if (unidadesNoReconocidas.size > 0) {
    console.log(`\n⚠️  Unidades NO reconocidas (caen en null):`);
    [...unidadesNoReconocidas].forEach((u) => console.log(`  - "${u}"`));
    console.log("  → Revisar la tabla en src/lib/unidades.ts si son unidades válidas.");
  } else {
    console.log(`Unidades no reconocidas:        0 ✓`);
  }

  if (DRY_RUN) {
    console.log("\n[DRY-RUN] Sin escrituras. Revisá el diff y corrí con --apply para aplicar.");
  } else {
    console.log("\n[APPLY] Migración completa.");
    console.log("Próximo paso: borrá la lista de compras actual y re-sincronizá.");
  }
}

main().catch((e) => {
  console.error("Error en la migración:", e);
  process.exit(1);
});
