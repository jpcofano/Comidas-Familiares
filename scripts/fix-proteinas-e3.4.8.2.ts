/**
 * E3.4.8.2 — Corrección puntual de proteinaPrincipal + diccionarios.proteinas
 *
 * F1: 3 recetas compuestas → "Mixta"  (REC-1012, REC-1104, REC-1503)
 * F2: 1 receta "Frutas"   → "Vegetariana"  (REC-1409)
 * F3: /config/diccionarios.proteinas → 13 valores canónicos
 *
 * Idempotente: si ya tiene el valor correcto, el update no cambia nada.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");
if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error("ERROR: No se encontró scripts/service-account.json");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const PROTEINAS_CANONICAS = [
  "Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado", "Mariscos", "Huevos", "Fiambre",
  "Legumbres", "Semillas", "Frutos secos",
  "Mixta", "Vegetariana",
];

async function main() {
  const projectId = (serviceAccount as { project_id: string }).project_id;
  console.log(`Conectado a: ${projectId}`);

  // F1 — compuestas → "Mixta"
  const f1 = [
    { id: "REC-1012", nombre: "Brochettes rápidas de pollo y carne al horno fuerte", antes: "Pollo y Vacuna" },
    { id: "REC-1104", nombre: "Bowl de yogur opcional con frutas, semillas y base sin lácteos", antes: "Huevos y semillas" },
    { id: "REC-1503", nombre: "Huevos rellenos de atún y oliva sin mayonesa láctea", antes: "Huevos y Pescado" },
  ];
  for (const r of f1) {
    await db.collection("recetas").doc(r.id).update({
      proteinaPrincipal: "Mixta",
      ultimaModificacion: FieldValue.serverTimestamp(),
    });
    console.log(`F1 ✓  ${r.id} | ${r.nombre}`);
    console.log(`      "${r.antes}" → "Mixta"`);
  }

  // F2 — "Frutas" → "Vegetariana"
  await db.collection("recetas").doc("REC-1409").update({
    proteinaPrincipal: "Vegetariana",
    ultimaModificacion: FieldValue.serverTimestamp(),
  });
  console.log(`F2 ✓  REC-1409 | Crema helada de frutilla y coco sin leche`);
  console.log(`      "Frutas" → "Vegetariana"`);

  // F3 — /config/diccionarios.proteinas → 13 valores
  await db.collection("config").doc("diccionarios").update({
    proteinas: PROTEINAS_CANONICAS,
    ultimaActualizacion: FieldValue.serverTimestamp(),
  });
  console.log(`F3 ✓  /config/diccionarios.proteinas → ${PROTEINAS_CANONICAS.length} valores`);
  console.log(`      [${PROTEINAS_CANONICAS.join(", ")}]`);

  // Verificación — leer los 4 docs actualizados
  console.log("\n=== VERIFICACIÓN POST-UPDATE ===");

  const allIds = [...f1.map(r => r.id), "REC-1409"];
  for (const id of allIds) {
    const snap = await db.collection("recetas").doc(id).get();
    const d = snap.data();
    console.log(`${id}: proteinaPrincipal = "${d?.proteinaPrincipal}"`);
  }

  const dicSnap = await db.collection("config").doc("diccionarios").get();
  const proteinas = dicSnap.data()?.proteinas as string[];
  console.log(`/config/diccionarios.proteinas (${proteinas?.length} valores):`, proteinas);

  // Cruce final — todos los valores distintos en recetas
  console.log("\n=== CRUCE FINAL: valores distintos de proteinaPrincipal ===");
  const recetasSnap = await db.collection("recetas").get();
  const conteo: Record<string, number> = {};
  recetasSnap.forEach(doc => {
    const val = doc.data().proteinaPrincipal as string;
    conteo[val] = (conteo[val] ?? 0) + 1;
  });
  const canonSet = new Set(PROTEINAS_CANONICAS);
  Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([val, count]) => {
      const ok = canonSet.has(val) ? "OK" : "FUERA";
      console.log(`  ${FUERA_MARK(ok)} ${val}: ${count}`);
    });
  console.log(`Total recetas: ${recetasSnap.size}`);

  process.exit(0);
}

function FUERA_MARK(ok: string) { return ok === "OK" ? "[OK  ]" : "[FUERA]"; }

main().catch(err => {
  console.error("ERROR:", err);
  process.exit(1);
});
