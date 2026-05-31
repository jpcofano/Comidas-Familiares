/**
 * E9.0 — BLOQUE B: Migra proteinaPrincipal + esVegetariano + esKeto en las 78 recetas.
 *
 * Cambios aplicados:
 *   Pollo       → Aves                           (6 recetas, rename directo)
 *   Fiambre     → Cerdo                          (1 receta, asumido jamón → Cerdo)
 *   Vegetariana → Vegetal + esVegetariano: true  (15 recetas)
 *   Mixta       → decisiones por ID (ver abajo)  (3 recetas)
 *   Todos       → esKeto: !hidratos              (78 recetas)
 *
 * Las 3 recetas Mixta (requieren decisión de JP):
 *   REC-1012  Brochettes de pollo y carne  → Aves    (pollo dominante por nombre y cantidad)
 *   REC-1503  Huevos rellenos de atún      → Huevos  (huevos dominante por nombre)
 *   REC-1104  Bowl de yogur con frutas     → Vegetal + esVegetariano: true
 *
 * Uso:
 *   npx ts-node --esm scripts/migrate-proteinas-e9.ts
 *   npx ts-node --esm scripts/migrate-proteinas-e9.ts --dry-run
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error("ERROR: scripts/service-account.json no encontrado.");
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"))) });
const db = getFirestore();

// ─── Decisiones de migración ──────────────────────────────────────────────────

const RENAME_DIRECTO: Record<string, string> = {
  "Pollo":       "Aves",
  "Fiambre":     "Cerdo",
  "Vegetariana": "Vegetal",
};

const MIXTA_DECISIONS: Record<string, { proteina: string; esVegetariano: boolean }> = {
  "REC-1012": { proteina: "Aves",    esVegetariano: false },  // Brochettes de pollo y carne
  "REC-1503": { proteina: "Huevos",  esVegetariano: false },  // Huevos rellenos de atún
  "REC-1104": { proteina: "Vegetal", esVegetariano: true  },  // Bowl de yogur con frutas
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log("🔵 DRY RUN — no se escribe nada\n");

  console.log("Cargando recetas de Firestore...");
  const snap = await db.collection("recetas").get();
  console.log(`  ${snap.size} recetas encontradas\n`);

  const cambios: Array<{
    id: string; nombre: string;
    protAntes: string; protDespues: string;
    esVeg: boolean; esKeto: boolean;
  }> = [];
  const sinCambio: string[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const idReceta    = doc.id;
    const nombre      = String(data["nombre"] ?? "");
    const protActual  = String(data["proteinaPrincipal"] ?? "");
    const hidratos    = Boolean(data["hidratos"] ?? false);
    const esKeto      = !hidratos;

    let protNueva = protActual;
    let esVeg     = false;

    if (protActual === "Mixta") {
      const decision = MIXTA_DECISIONS[idReceta];
      if (!decision) {
        console.warn(`  ⚠ Receta Mixta sin decisión: ${idReceta} — ${nombre} (se deja igual)`);
        sinCambio.push(idReceta);
        continue;
      }
      protNueva = decision.proteina;
      esVeg     = decision.esVegetariano;
    } else if (RENAME_DIRECTO[protActual]) {
      protNueva = RENAME_DIRECTO[protActual];
      esVeg     = protActual === "Vegetariana";
    }

    cambios.push({ id: idReceta, nombre, protAntes: protActual, protDespues: protNueva, esVeg, esKeto });
  }

  // ── Mostrar resumen ────────────────────────────────────────────────────────
  console.log("CAMBIOS PROPUESTOS:");
  console.log("─".repeat(70));
  const byChange: Record<string, typeof cambios> = {};
  for (const c of cambios) {
    const key = `${c.protAntes} → ${c.protDespues}`;
    if (!byChange[key]) byChange[key] = [];
    byChange[key].push(c);
  }
  for (const [key, items] of Object.entries(byChange)) {
    console.log(`\n  ${key} (${items.length}):`);
    items.forEach(i => console.log(`    ${i.id}  ${i.nombre}  | esVeg=${i.esVeg} esKeto=${i.esKeto}`));
  }
  if (sinCambio.length) console.log(`\n  Sin cambio (revisar): ${sinCambio.join(", ")}`);

  // esKeto summary
  const conKeto = cambios.filter(c => c.esKeto).length;
  console.log(`\n  esKeto: ${conKeto}/${cambios.length} recetas quedan con esKeto=true`);
  console.log("─".repeat(70));

  if (DRY_RUN) {
    console.log("\n🔵 Dry run — no se escribió nada. Revisá los cambios y correlo sin --dry-run.");
    return;
  }

  // ── Escribir en Firestore ──────────────────────────────────────────────────
  console.log(`\nEscribiendo ${cambios.length} recetas...`);
  const chunks: typeof cambios[] = [];
  for (let i = 0; i < cambios.length; i += 400) chunks.push(cambios.slice(i, i + 400));

  for (const chunk of chunks) {
    const batch = db.batch();
    for (const c of chunk) {
      const patch: Record<string, unknown> = {
        proteinaPrincipal: c.protDespues,
        esKeto: c.esKeto,
        ultimaModificacion: FieldValue.serverTimestamp(),
      };
      if (c.esVeg) patch["esVegetariano"] = true;
      batch.update(db.collection("recetas").doc(c.id), patch);
    }
    await batch.commit();
  }

  console.log(`\n✅ Migración completada — ${cambios.length} recetas actualizadas.`);
  console.log("   Verificá los cambios en Firebase Console y hacé un deploy del front.");
}

main().catch(e => { console.error("ERROR:", e); process.exit(1); });
