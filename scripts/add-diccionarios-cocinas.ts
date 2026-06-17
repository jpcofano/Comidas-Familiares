/**
 * E7.13 — Agregar /config/diccionarios.cocinas (15 valores canónicos)
 *
 * Fuente de verdad: src/types/models.ts → COCINAS
 * Idempotente: si ya tiene los 15 valores en el mismo orden, no escribe.
 *
 * Uso:
 *   npx ts-node --esm scripts/add-diccionarios-cocinas.ts
 *   npx ts-node --esm scripts/add-diccionarios-cocinas.ts --dry-run
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

// Lista canónica — igual a src/types/models.ts → COCINAS
const COCINAS_CANONICAS = [
  "Argentina",
  "Italiana",
  "Española",
  "Francesa",
  "Mediterránea",
  "China",
  "Japonesa",
  "Coreana",
  "Tailandesa",
  "India",
  "Mexicana",
  "Peruana",
  "Árabe / Medio Oriente",
  "Estadounidense",
  "Otra",
];

async function main() {
  const ref = db.doc("config/diccionarios");
  const snap = await ref.get();

  if (!snap.exists) {
    console.error("ERROR: /config/diccionarios no existe en Firestore.");
    process.exit(1);
  }

  const actual = snap.data()?.cocinas as string[] | undefined;

  console.log("Estado actual de /config/diccionarios.cocinas:");
  console.log(JSON.stringify(actual ?? null, null, 2));
  console.log(`  Cantidad: ${actual?.length ?? 0} valores\n`);

  const yaCorrecta =
    actual?.length === COCINAS_CANONICAS.length &&
    actual.every((v, i) => v === COCINAS_CANONICAS[i]);

  if (yaCorrecta) {
    console.log("✓ Ya tiene los 15 valores en el orden correcto — sin cambios.");
    return;
  }

  console.log("Lista canónica a escribir:");
  console.log(JSON.stringify(COCINAS_CANONICAS, null, 2));
  console.log(`  Cantidad: ${COCINAS_CANONICAS.length} valores\n`);

  if (DRY_RUN) {
    console.log("[DRY RUN] Se actualizaría /config/diccionarios.cocinas — sin escritura.");
    return;
  }

  await ref.update({ cocinas: COCINAS_CANONICAS });
  console.log("✓ /config/diccionarios.cocinas agregado con los 15 valores canónicos.");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
