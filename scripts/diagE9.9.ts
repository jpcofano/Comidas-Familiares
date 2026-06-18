/**
 * E9.9 — Diagnóstico read-only: costoEstimado fuera de enum + refs ING-0251.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const COSTOS_ENUM = new Set(["Bajo", "Medio", "Medio/Alto", "Alto"]);

async function main() {
  // D1 — costoEstimado fuera de enum
  console.log("=== D1 — costoEstimado fuera de enum ===");
  const recSnap = await db.collection("recetas").get();
  const recetas = recSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  const reales = recetas.filter(r => !r.esCompraRapida);
  const fuera = reales.filter(r => !COSTOS_ENUM.has(r.costoEstimado));
  console.log(`Total recetas con costoEstimado fuera de enum: ${fuera.length}`);
  fuera.forEach(r => console.log(`  ${r.id}  "${r.nombre}"  → costoEstimado="${r.costoEstimado}"`));

  // D2 — referencias a ING-0251 en todas las colecciones
  console.log("\n=== D2 — referencias a ING-0251 ===");
  const TARGET = "ING-0251";

  // recetas
  const refsRecetas = recetas.filter(r =>
    (r.ingredientes ?? []).some((i: any) => i.idIngrediente === TARGET)
  );
  console.log(`\nrecetas.ingredientes[].idIngrediente: ${refsRecetas.length} refs`);
  refsRecetas.forEach(r => console.log(`  ${r.id}  "${r.nombre}"`));

  // planes (itemsCompraRapida)
  const planesSnap = await db.collection("planes").get();
  const refsPlanes = planesSnap.docs.filter(d => {
    const items = d.data().itemsCompraRapida ?? [];
    return items.some((i: any) => i.idIngrediente === TARGET);
  });
  console.log(`\nplanes.itemsCompraRapida[].idIngrediente: ${refsPlanes.length} refs`);
  refsPlanes.forEach(d => console.log(`  ${d.id}`));

  // menus (componentes referencian recetas, no ingredientes — pero verifyamos)
  const menusSnap = await db.collection("menus").get();
  console.log(`\nmenus: ${menusSnap.size} docs (no almacenan idIngrediente directamente — OK)`);

  // listasCompras + subcollection items (si existe)
  const listasSnap = await db.collection("listasCompras").get();
  console.log(`\nlistasCompras: ${listasSnap.size} docs (metadata; items son computed in-memory)`);

  // historial
  const histSnap = await db.collection("historial").get();
  const refsHist = histSnap.docs.filter(d => {
    const data = d.data();
    return JSON.stringify(data).includes(TARGET);
  });
  console.log(`\nhistorial: ${refsHist.length} docs que contienen "${TARGET}"`);

  // config
  const configSnap = await db.collection("config").get();
  const refsConfig = configSnap.docs.filter(d => JSON.stringify(d.data()).includes(TARGET));
  console.log(`\nconfig: ${refsConfig.length} docs que contienen "${TARGET}"`);
  refsConfig.forEach(d => console.log(`  ${d.id}`));

  // ingredientes — verificar que ING-0251 existe y sus datos
  const ingSnap = await db.collection("ingredientes").get();
  const ing251 = ingSnap.docs.find(d => d.id === TARGET);
  const ing338 = ingSnap.docs.find(d => d.id === "ING-0338");
  console.log(`\n--- Datos de ING-0251 ---`);
  if (ing251) {
    const x = ing251.data();
    console.log(`  canonico="${x.canonico}"  nombrePreferido="${x.nombrePreferido}"`);
    console.log(`  sinonimos=${JSON.stringify(x.sinonimos)}`);
    console.log(`  vecesUsado=${x.vecesUsado}`);
  } else {
    console.log("  NO ENCONTRADO");
  }
  console.log(`--- Datos de ING-0338 ---`);
  if (ing338) {
    const x = ing338.data();
    console.log(`  canonico="${x.canonico}"  nombrePreferido="${x.nombrePreferido}"`);
    console.log(`  sinonimos=${JSON.stringify(x.sinonimos)}`);
    console.log(`  vecesUsado=${x.vecesUsado}`);
  } else {
    console.log("  NO ENCONTRADO");
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
