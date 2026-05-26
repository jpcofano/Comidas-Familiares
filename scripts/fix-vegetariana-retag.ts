/**
 * E5.2.1 — Re-clasificar 4 recetas "Vegetariana" con proteína ancla clara
 *
 * Aprobado por JP en E5.2.1. Las demás 15 recetas "Vegetariana" quedan sin cambio.
 *
 * REC-0204  Manzanas al horno con nueces       Vegetariana → Frutos secos
 * REC-0401  Ensalada de pepino, sésamo y soja  Vegetariana → Semillas
 * REC-1407  Peras asadas con nueces            Vegetariana → Frutos secos
 * REC-1507  Berenjenas crocantes               Vegetariana → Huevos
 *
 * Idempotente: verifica el valor actual antes de escribir.
 *
 * Uso:
 *   npx ts-node --esm scripts/fix-vegetariana-retag.ts
 *   npx ts-node --esm scripts/fix-vegetariana-retag.ts --dry-run
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

const RETAGS: { idReceta: string; nombreCanonico: string; proteinaNueva: string }[] = [
  { idReceta: "REC-0204", nombreCanonico: "Manzanas al horno con nueces",      proteinaNueva: "Frutos secos" },
  { idReceta: "REC-0401", nombreCanonico: "Ensalada de pepino, sésamo y soja", proteinaNueva: "Semillas"     },
  { idReceta: "REC-1407", nombreCanonico: "Peras asadas con nueces",           proteinaNueva: "Frutos secos" },
  { idReceta: "REC-1507", nombreCanonico: "Berenjenas crocantes",              proteinaNueva: "Huevos"       },
];

async function main() {
  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}Re-clasificando ${RETAGS.length} recetas Vegetariana...\n`);

  for (const retag of RETAGS) {
    const ref = db.doc(`recetas/${retag.idReceta}`);
    const snap = await ref.get();

    if (!snap.exists) {
      console.warn(`  ⚠ ${retag.idReceta} no existe en Firestore — skip`);
      continue;
    }

    const actual = snap.data()?.proteinaPrincipal as string | undefined;

    if (actual === retag.proteinaNueva) {
      console.log(`  ✓ ${retag.idReceta} ya tiene "${retag.proteinaNueva}" — skip`);
      continue;
    }

    if (actual !== "Vegetariana") {
      console.warn(`  ⚠ ${retag.idReceta} tiene "${actual}" (esperaba "Vegetariana") — skip por seguridad`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY RUN] ${retag.idReceta} "${retag.nombreCanonico}": "Vegetariana" → "${retag.proteinaNueva}"`);
    } else {
      await ref.update({ proteinaPrincipal: retag.proteinaNueva });
      console.log(`  ✓ ${retag.idReceta} "${retag.nombreCanonico}": "Vegetariana" → "${retag.proteinaNueva}"`);
    }
  }

  console.log("\nListo.");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
