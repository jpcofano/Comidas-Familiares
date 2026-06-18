/**
 * E3.4.13b — Cierre de auditoría. READ-ONLY.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const COCINAS_ENUM = new Set([
  "Argentina","Italiana","Española","Francesa","Mediterránea",
  "China","Japonesa","Coreana","Tailandesa","India","Mexicana",
  "Peruana","Árabe / Medio Oriente","Estadounidense","Otra",
]);
const PROTEINAS_ENUM = new Set([
  "Vacuna","Cerdo","Cordero","Aves","Pescado","Mariscos",
  "Huevos","Legumbres","Semillas","Frutos secos","Vegetal","Bebida",
]);
const TIPOS_ITEM_ENUM = new Set([
  "Receta principal","Entrada","Guarnición","Postre",
  "Panificado","Snack","Desayuno","Conserva","Hidrato opcional","Jugo natural",
]);
const COSTO_ENUM = new Set(["Bajo","Medio","Medio/Alto","Alto"]);
const DIFICULTAD_ENUM = new Set(["Baja","Media","Media-alta","Alta"]);

async function main() {
  const [recSnap, ingSnap] = await Promise.all([
    db.collection("recetas").get(),
    db.collection("ingredientes").get(),
  ]);

  const todasRecetas = recSnap.docs.map(d => d.data() as any);
  const reales = todasRecetas.filter(r => !r.esCompraRapida);
  const ingredientes = ingSnap.docs.map(d => d.data() as any);

  // ── C1.1 — campo cocina poblado vs vacío ─────────────────────────────────
  console.log("\n=== C1 — cocina vs estilo ===");

  const conCocina   = reales.filter(r => r.cocina != null && r.cocina !== "").length;
  const sinCocina   = reales.filter(r => r.cocina == null || r.cocina === "").length;
  console.log(`\nC1.1 — campo 'cocina' en recetas reales (${reales.length} docs):`);
  console.log(`  poblado:        ${conCocina}`);
  console.log(`  vacío / ausente: ${sinCocina}`);

  // ── C1.2 — valores distintos de estilo con conteo ────────────────────────
  console.log("\nC1.2 — valores distintos de 'estilo' (todas las recetas reales):");
  const estiloCount: Record<string, number> = {};
  reales.forEach(r => {
    const v = r.estilo ?? "(ausente)";
    estiloCount[v] = (estiloCount[v] ?? 0) + 1;
  });
  Object.entries(estiloCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => console.log(`  "${k}" → ${n}`));

  // ── C1.3 — campo canónico y enum cocina ──────────────────────────────────
  console.log("\nC1.3 — campo canónico y estado de 'estilo':");
  console.log("  En models.ts:");
  console.log("    cocina?: Cocina   ← campo filtrable canónico (E9.8+), ENUM cerrado de 15 valores");
  console.log("    estilo: string    ← campo libre heredado, NO deprecado formalmente en el modelo");
  console.log("                        (sigue en la interfaz Receta como string; filtros usan 'cocina')");
  console.log("  COCINAS enum (15 valores):");
  console.log("   ", [...COCINAS_ENUM].join(", "));

  // ── C2 — Conteos ─────────────────────────────────────────────────────────
  console.log("\n=== C2 — Conteos ===");
  console.log(`\nC2.1 — Total recetas reales (excl. esCompraRapida): ${reales.length}`);
  console.log(`        Total ingredientes: ${ingredientes.length}`);
  console.log("\nC2.2 — Delta contra esperado:");
  console.log("  78 base + 18 (T1) + 12 (T2) + 12 jugos + 13 (T3) + 175 tandas 4-18");
  const esperado = 78 + 18 + 12 + 12 + 13 + 175;
  console.log(`  Esperado ≈ ${esperado} | Real = ${reales.length} | Delta = ${reales.length - esperado}`);

  // ── C3.1 — proteinaPrincipal fuera de enum ───────────────────────────────
  console.log("\n=== C3 — Conformidad de enum ===");
  const protFuera = reales.filter(r => !PROTEINAS_ENUM.has(r.proteinaPrincipal));
  console.log(`\nC3.1 — proteinaPrincipal fuera de enum: ${protFuera.length}`);
  protFuera.forEach(r => console.log(`  "${r.nombre}" → "${r.proteinaPrincipal}"`));

  // ── C3.2 — tipoItem fuera de enum ────────────────────────────────────────
  const tipoFuera = reales.filter(r => !TIPOS_ITEM_ENUM.has(r.tipoItem));
  console.log(`\nC3.2a — tipoItem fuera de enum: ${tipoFuera.length}`);
  tipoFuera.forEach(r => console.log(`  "${r.nombre}" → "${r.tipoItem}"`));

  // ── C3.3 — costoEstimado fuera de enum ───────────────────────────────────
  const costoFuera = reales.filter(r => !COSTO_ENUM.has(r.costoEstimado));
  console.log(`\nC3.2b — costoEstimado fuera de enum: ${costoFuera.length}`);
  costoFuera.forEach(r => console.log(`  "${r.nombre}" → "${r.costoEstimado}"`));

  // ── C3.4 — dificultad fuera de enum ──────────────────────────────────────
  const difFuera = reales.filter(r => !DIFICULTAD_ENUM.has(r.dificultad));
  console.log(`\nC3.2c — dificultad fuera de enum: ${difFuera.length}`);
  difFuera.forEach(r => console.log(`  "${r.nombre}" → "${r.dificultad}"`));

  // ── C4 — Mozzarella ──────────────────────────────────────────────────────
  console.log("\n=== C4 — Mozzarella / Muzzarella ===");

  const mozz = ingredientes.filter(i =>
    i.canonico?.toLowerCase().includes("mozz") ||
    i.canonico?.toLowerCase().includes("muzz") ||
    i.nombrePreferido?.toLowerCase().includes("mozz") ||
    i.nombrePreferido?.toLowerCase().includes("muzz")
  );
  console.log(`\nC4.1 — Ingredientes con mozz/muzz en canonico o nombrePreferido: ${mozz.length}`);
  mozz.forEach(i => console.log(`  ${i.idIngrediente}  canonico="${i.canonico}"  nombrePreferido="${i.nombrePreferido}"`));

  // Recetas que usan esos IDs
  const mozzIds = new Set(mozz.map((i: any) => i.idIngrediente));
  const recetasConMozz = reales.filter(r =>
    (r.ingredientes ?? []).some((ing: any) => mozzIds.has(ing.idIngrediente))
  );
  console.log(`\nC4.2 — Recetas que apuntan a esos IDs: ${recetasConMozz.length}`);
  recetasConMozz.forEach(r => {
    const ings = (r.ingredientes ?? []).filter((ing: any) => mozzIds.has(ing.idIngrediente));
    ings.forEach((ing: any) => console.log(`  "${r.nombre}"  → idIngrediente=${ing.idIngrediente}  textoOriginal="${ing.textoOriginal}"`));
  });

  // Buscar también por sinonimos
  const mozzSinonimos = ingredientes.filter(i =>
    (i.sinonimos ?? []).some((s: string) =>
      s.toLowerCase().includes("mozz") || s.toLowerCase().includes("muzz")
    )
  );
  if (mozzSinonimos.length > 0) {
    console.log(`\nC4.3 — Ingredientes con mozz/muzz en sinonimos: ${mozzSinonimos.length}`);
    mozzSinonimos.forEach(i => console.log(`  ${i.idIngrediente}  canonico="${i.canonico}"  sinonimos=${JSON.stringify(i.sinonimos)}`));
  } else {
    console.log("\nC4.3 — ningún ingrediente con mozz/muzz en sinonimos");
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
