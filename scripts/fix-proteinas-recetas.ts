/**
 * F1+F2 — Canonizar proteinaPrincipal en 4 recetas
 *
 * F1: 3 recetas compuestas → "Mixta"
 *   REC-1012  "Pollo y Vacuna"
 *   REC-1104  "Huevos y semillas"
 *   REC-1503  "Huevos y Pescado"
 *
 * F2: 1 receta con valor inválido → "Vegetariana"
 *   REC-1409  "Frutas"
 *
 * Idempotente: verifica el valor actual antes de escribir.
 *
 * Uso:
 *   npx ts-node --esm scripts/fix-proteinas-recetas.ts
 *   npx ts-node --esm scripts/fix-proteinas-recetas.ts --dry-run
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`
ERROR: No se encontró el service account en ${SERVICE_ACCOUNT_PATH}

Para generarlo:
  1. Firebase Console → ⚙ Project Settings → Service accounts
  2. "Generate new private key" → confirmar
  3. Renombrá el archivo a "service-account.json" y guardalo en scripts/
  4. Volvé a correr el script
`);
  process.exit(1);
}

initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
const db = getFirestore();

const FIXES: { idReceta: string; nombreCanonico: string; proteinaActual: string; proteinaNueva: string }[] = [
  // F1 — compuestas → Mixta
  { idReceta: "REC-1012", nombreCanonico: "Milanesas de pollo a la napolitana", proteinaActual: "Pollo y Vacuna",    proteinaNueva: "Mixta" },
  { idReceta: "REC-1104", nombreCanonico: "Tarta de acelga y huevo",             proteinaActual: "Huevos y semillas", proteinaNueva: "Mixta" },
  { idReceta: "REC-1503", nombreCanonico: "Croquetas de pescado y huevo",        proteinaActual: "Huevos y Pescado",  proteinaNueva: "Mixta" },
  // F2 — "Frutas" → Vegetariana
  { idReceta: "REC-1409", nombreCanonico: "Ensalada de frutas con menta",        proteinaActual: "Frutas",            proteinaNueva: "Vegetariana" },
];

async function main() {
  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}Corrigiendo proteinaPrincipal en ${FIXES.length} recetas...\n`);

  for (const fix of FIXES) {
    const ref = db.doc(`recetas/${fix.idReceta}`);
    const snap = await ref.get();

    if (!snap.exists) {
      console.warn(`  ⚠ ${fix.idReceta} no existe en Firestore — skip`);
      continue;
    }

    const actual = snap.data()?.proteinaPrincipal as string | undefined;

    if (actual === fix.proteinaNueva) {
      console.log(`  ✓ ${fix.idReceta} ya tiene "${fix.proteinaNueva}" — skip`);
      continue;
    }

    if (actual !== fix.proteinaActual) {
      console.warn(`  ⚠ ${fix.idReceta} tiene "${actual}" (esperaba "${fix.proteinaActual}") — skip por seguridad`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY RUN] ${fix.idReceta} "${fix.proteinaActual}" → "${fix.proteinaNueva}"`);
    } else {
      await ref.update({ proteinaPrincipal: fix.proteinaNueva });
      console.log(`  ✓ ${fix.idReceta} actualizado: "${fix.proteinaActual}" → "${fix.proteinaNueva}"`);
    }
  }

  console.log("\nListo.");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
