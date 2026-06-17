/**
 * E9.0 — BLOQUE C: Actualiza /ingredientes con el diccionario canónico de 265 entradas.
 *
 * Idempotente: usa set() (con { merge: false }) para cada doc.
 * NO borra ninguna colección. NO toca recetas, planes, historial ni compras.
 * Las 5 correcciones de datos ya están aplicadas en catalogo_ingredientes.json.
 *
 * Uso:
 *   npx ts-node --esm scripts/update-catalogo-ingredientes.ts
 *   npx ts-node --esm scripts/update-catalogo-ingredientes.ts --dry-run
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { CATEGORIAS_INGREDIENTE, ROLES_NUTRICIONALES, ORDEN_GONDOLA } from "../src/lib/catalogo";

const DRY_RUN = process.argv.includes("--dry-run");
const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error("ERROR: scripts/service-account.json no encontrado.");
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"))) });
const db = getFirestore();

const SET_CATEGORIAS = new Set<string>(CATEGORIAS_INGREDIENTE);
const SET_ROLES      = new Set<string>(ROLES_NUTRICIONALES);
const SET_GONDOLA    = new Set<string>(ORDEN_GONDOLA);

function validar(raw: Record<string, unknown>[]): void {
  const errores: string[] = [];
  for (const r of raw) {
    const id  = String(r["idIngrediente"] ?? "");
    const cat = String(r["categoria"] ?? "");
    const gon = String(r["seccionGondola"] ?? "");
    const roles = r["rolNutricional"];
    if (!SET_CATEGORIAS.has(cat)) errores.push(`${id}: categoria inválida "${cat}"`);
    if (!SET_GONDOLA.has(gon))    errores.push(`${id}: seccionGondola inválida "${gon}"`);
    if (!Array.isArray(roles)) {
      errores.push(`${id}: rolNutricional no es array`);
    } else {
      (roles as unknown[]).forEach(rol => {
        if (!SET_ROLES.has(String(rol))) errores.push(`${id}: rol inválido "${rol}"`);
      });
    }
  }
  if (errores.length) { errores.forEach(e => console.error("  " + e)); process.exit(1); }
  console.log(`  ✓ validación OK — ${raw.length} ingredientes`);
}

async function main() {
  if (DRY_RUN) console.log("🔵 DRY RUN — no se escribe nada\n");

  const path = resolve("scripts/seed-data/catalogo_ingredientes.json");
  if (!existsSync(path)) { console.error(`ERROR: ${path} no encontrado.`); process.exit(1); }
  const raw = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>[];

  console.log(`Validando ${raw.length} ingredientes...`);
  validar(raw);

  console.log(`\nEscribiendo /ingredientes...`);
  const chunks: typeof raw[] = [];
  for (let i = 0; i < raw.length; i += 400) chunks.push(raw.slice(i, i + 400));

  let escritos = 0;
  for (const chunk of chunks) {
    if (!DRY_RUN) {
      const batch = db.batch();
      for (const r of chunk) {
        batch.set(db.collection("ingredientes").doc(String(r["idIngrediente"])), r);
      }
      await batch.commit();
    }
    escritos += chunk.length;
    process.stdout.write(`  ${escritos}/${raw.length}\r`);
  }

  if (!DRY_RUN) {
    const snap = await db.collection("ingredientes").get();
    console.log(`\n  ✓ Firestore /ingredientes: ${snap.size} docs (esperado ≥ ${raw.length})`);
  }

  console.log(DRY_RUN ? "\n🔵 Dry run OK." : "\n✅ Catálogo actualizado.");
}

main().catch(e => { console.error("ERROR:", e); process.exit(1); });
