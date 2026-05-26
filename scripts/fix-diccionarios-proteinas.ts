/**
 * F3 — Alinear /config/diccionarios.proteinas a los 13 valores canónicos
 *
 * Fuente de verdad: src/types/models.ts → PROTEINAS (13 valores)
 * Antes: 10 valores (faltaban Fiambre, Semillas, Frutos secos)
 * Después: 13 valores en el orden canónico
 *
 * Idempotente: si ya tiene los 13 en el mismo orden, no escribe.
 *
 * Uso:
 *   npx ts-node --esm scripts/fix-diccionarios-proteinas.ts
 *   npx ts-node --esm scripts/fix-diccionarios-proteinas.ts --dry-run
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

// Lista canónica — igual a src/types/models.ts → PROTEINAS
const PROTEINAS_CANONICAS = [
  "Vacuna",
  "Cerdo",
  "Pollo",
  "Cordero",
  "Pescado",
  "Mariscos",
  "Huevos",
  "Fiambre",
  "Legumbres",
  "Semillas",
  "Frutos secos",
  "Mixta",
  "Vegetariana",
];

async function main() {
  const ref = db.doc("config/diccionarios");
  const snap = await ref.get();

  if (!snap.exists) {
    console.error("ERROR: /config/diccionarios no existe en Firestore.");
    process.exit(1);
  }

  const actual = snap.data()?.proteinas as string[] | undefined;

  console.log("Estado actual de /config/diccionarios.proteinas:");
  console.log(JSON.stringify(actual, null, 2));
  console.log(`  Cantidad: ${actual?.length ?? 0} valores\n`);

  const yaCorrecta =
    actual?.length === PROTEINAS_CANONICAS.length &&
    actual.every((v, i) => v === PROTEINAS_CANONICAS[i]);

  if (yaCorrecta) {
    console.log("✓ Ya tiene los 13 valores en el orden correcto — sin cambios.");
    return;
  }

  console.log("Lista canónica a escribir:");
  console.log(JSON.stringify(PROTEINAS_CANONICAS, null, 2));
  console.log(`  Cantidad: ${PROTEINAS_CANONICAS.length} valores\n`);

  if (DRY_RUN) {
    console.log("[DRY RUN] Se actualizaría /config/diccionarios.proteinas — sin escritura.");
    return;
  }

  await ref.update({ proteinas: PROTEINAS_CANONICAS });
  console.log("✓ /config/diccionarios.proteinas actualizado a los 13 valores canónicos.");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
