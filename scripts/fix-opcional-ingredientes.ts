/**
 * E11.3.3 — Normaliza el campo `opcional` de los ingredientes de todas las recetas.
 *
 * Problema: el seed importó notas de preparación en el campo `opcional` como strings
 * (ej. "Picada especial"), haciendo que macrosDeReceta() salteara esos ingredientes.
 *
 * Reglas de normalización (por ingrediente):
 *   - boolean        → sin cambio
 *   - "" / espacios  → false
 *   - "Sí"/"si"/"No"/"true"/"false"/"1"/"0" → boolean correspondiente
 *   - cualquier otro texto  → opcional = false, texto movido a `notas` (concat con " · ")
 *   - undefined / null     → sin cambio
 *
 * Uso:
 *   npx ts-node --esm scripts/fix-opcional-ingredientes.ts           # dry-run
 *   npx ts-node --esm scripts/fix-opcional-ingredientes.ts --dry-run # explícito
 *   npx ts-node --esm scripts/fix-opcional-ingredientes.ts --force   # escribe
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const DRY_RUN = !process.argv.includes("--force");
const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`ERROR: No se encontró el service account en ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}

// ─── Lógica de normalización (misma lógica que src/lib/normaliza-opcional.ts) ─

type NormResultado =
  | { changed: false }
  | { changed: true; opcional: boolean; notas?: string };

function parseBooleanString(s: string): boolean | null {
  const norm = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (["si", "yes", "true", "1"].includes(norm)) return true;
  if (["no", "false", "0"].includes(norm)) return false;
  return null;
}

function normalizaOpcional(raw: unknown, notasExistente?: string): NormResultado {
  if (typeof raw === "boolean") return { changed: false };
  if (raw == null) return { changed: false };
  const trimmed = String(raw).trim();
  if (!trimmed) return { changed: true, opcional: false };
  const b = parseBooleanString(trimmed);
  if (b !== null) return { changed: true, opcional: b };
  const notas = notasExistente ? `${notasExistente} · ${trimmed}` : trimmed;
  return { changed: true, opcional: false, notas };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface IngRaw {
  idIngrediente?: string;
  textoOriginal?: string;
  opcional?: unknown;
  notas?: string;
  [k: string]: unknown;
}

async function main() {
  initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
  const db = getFirestore();

  console.log(`\n${DRY_RUN ? "🔍 DRY-RUN" : "⚡ FORCE"} — fix opcional de ingredientes en recetas`);
  if (DRY_RUN) console.log("(no se escribe nada — usá --force para persistir)\n");

  const snap = await db.collection("recetas").get();
  console.log(`📋 ${snap.size} recetas a revisar\n`);

  let recetasTocadas = 0;
  let ingMigradosANotas = 0;
  let ingConvertidosABoolean = 0;
  const ejemplos: string[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const ings: IngRaw[] = Array.isArray(data.ingredientes) ? data.ingredientes : [];
    if (ings.length === 0) continue;

    let modificada = false;
    const ingNuevos: IngRaw[] = ings.map((ing) => {
      const resultado = normalizaOpcional(ing.opcional, ing.notas);
      if (!resultado.changed) return ing;

      modificada = true;
      const nuevo: IngRaw = { ...ing, opcional: resultado.opcional };

      if (resultado.notas !== undefined) {
        nuevo.notas = resultado.notas;
        ingMigradosANotas++;
        if (ejemplos.length < 5) {
          ejemplos.push(
            `  [${docSnap.id}] "${ing.textoOriginal}" → opcional:false, notas:"${resultado.notas}"`,
          );
        }
      } else {
        ingConvertidosABoolean++;
      }

      return nuevo;
    });

    if (!modificada) continue;

    recetasTocadas++;

    if (!DRY_RUN) {
      await db.doc(`recetas/${docSnap.id}`).set(
        { ingredientes: ingNuevos },
        { merge: true },
      );
    }
  }

  console.log(`
────────────────────────────────────────────────
  Resumen ${DRY_RUN ? "(DRY-RUN)" : "(FORCE — escrito)"}
────────────────────────────────────────────────
  Recetas revisadas      : ${snap.size}
  Recetas con cambios    : ${recetasTocadas}
  Ingredientes → notas   : ${ingMigradosANotas}
  Ingredientes → boolean : ${ingConvertidosABoolean}
────────────────────────────────────────────────`);

  if (ejemplos.length) {
    console.log("\nEjemplos (primeros 5 migrados a notas):");
    ejemplos.forEach((e) => console.log(e));
  }

  if (DRY_RUN) {
    console.log("\n→ Para escribir: npx ts-node --esm scripts/fix-opcional-ingredientes.ts --force");
  } else {
    console.log("\n✓ Datos actualizados en Firestore.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
