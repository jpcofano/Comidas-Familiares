/**
 * E14.8 — Backfill del campo `sinGluten` en recetas existentes.
 *
 * Uso:
 *   npx tsx scripts/backfill-singluten.ts           → modo propuesta (sin escribir)
 *   npx tsx scripts/backfill-singluten.ts --apply   → aplica en Firestore
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { normalizeText } from "../src/lib/canonical";

const APPLY = process.argv.includes("--apply");

const serviceAccount = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Ingredientes que contienen TACC (normalizado)
// "pasta" removido: demasiado amplio (matchea "pasta de maní", "pasta de achiote").
// "fideos" y "ñoquis" cubren el caso real.
const TACC_TERMS = [
  "harina de trigo", "harina 0000", "harina leudante", "harina integral",
  "pan rallado", "pan lactal", "pan de molde", "pan de hamburguesa", "pan de pancho",
  "pan pita", "pan", "baguette",
  "fideos", "ñoquis", "cous cous", "semola", "semola de trigo",
  "tapas de empanada", "tapas de tarta", "masa",
  "cebada", "centeno",
  "galletitas", "bizcochuelo", "rebozador", "prepizza",
  "tortillas de harina", "wonton", "panko", "vermicelli",
  "cerveza",
];

// A revisar (pueden tener versión sin TACC)
const TACC_REVISAR = ["avena", "salsa de soja"];

// Para términos de una sola palabra usa word-boundary para evitar falsos positivos:
// "pan" no matchea "panceta" ni "aji panca"; "masa" no matchea "masala".
function matchTaccTerm(nombreNorm: string, termNorm: string): boolean {
  if (termNorm.includes(" ")) return nombreNorm.includes(termNorm);
  return new RegExp(`(^|\\s)${termNorm}(\\s|$)`).test(nombreNorm);
}

function checkIngredientes(ingredientes: any[]): "sinGluten" | "conGluten" | "revisar" {
  let revisar = false;
  for (const ing of ingredientes) {
    if (ing.opcional) continue;
    const nombre = normalizeText(ing.textoOriginal ?? ing.canonico ?? "");
    for (const term of TACC_REVISAR) {
      if (matchTaccTerm(nombre, normalizeText(term))) { revisar = true; }
    }
    for (const term of TACC_TERMS) {
      if (matchTaccTerm(nombre, normalizeText(term))) return "conGluten";
    }
  }
  return revisar ? "revisar" : "sinGluten";
}

async function main() {
  const snap = await db.collection("recetas").get();

  const asignarTrue:  Array<{ id: string; nombre: string }> = [];
  const asignarFalse: Array<{ id: string; nombre: string; motivo: string }> = [];
  const revisar:      Array<{ id: string; nombre: string; motivo: string }> = [];
  let yaTeníaSinGluten = 0;

  snap.forEach(doc => {
    const r = doc.data();
    if (r.sinGluten !== undefined) { yaTeníaSinGluten++; return; }

    const ingredientes: any[] = r.ingredientes ?? [];
    const resultado = checkIngredientes(ingredientes);

    if (resultado === "sinGluten") {
      asignarTrue.push({ id: doc.id, nombre: r.nombre });
    } else if (resultado === "conGluten") {
      const motivo = ingredientes
        .filter(i => !i.opcional)
        .map(i => normalizeText(i.textoOriginal ?? ""))
        .find(n => TACC_TERMS.some(t => n.includes(normalizeText(t)))) ?? "";
      asignarFalse.push({ id: doc.id, nombre: r.nombre, motivo });
    } else {
      const motivo = ingredientes
        .filter(i => !i.opcional)
        .map(i => normalizeText(i.textoOriginal ?? ""))
        .find(n => TACC_REVISAR.some(t => n.includes(normalizeText(t)))) ?? "";
      revisar.push({ id: doc.id, nombre: r.nombre, motivo });
    }
  });

  console.log(`\n${"═".repeat(70)}`);
  console.log(`BLOQUE 1 — sinGluten: true (${asignarTrue.length} recetas)`);
  console.log("─".repeat(70));
  for (const x of asignarTrue.slice(0, 20)) console.log(`  ${x.id}  ${x.nombre}`);
  if (asignarTrue.length > 20) console.log(`  … y ${asignarTrue.length - 20} más`);

  console.log(`\n${"═".repeat(70)}`);
  console.log(`BLOQUE 2 — sinGluten: false (${asignarFalse.length} recetas, tienen TACC)`);
  console.log("─".repeat(70));
  for (const x of asignarFalse) console.log(`  ${x.id}  ${x.nombre}  (por: ${x.motivo})`);

  console.log(`\n${"═".repeat(70)}`);
  console.log(`BLOQUE 3 — A revisar (${revisar.length} recetas — avena o salsa de soja)`);
  console.log("─".repeat(70));
  for (const x of revisar) console.log(`  ${x.id}  "${x.nombre}"  (ingrediente: ${x.motivo})`);
  console.log("  → ¿usan tamari / avena certificada? Si sí: marcar sinGluten: true manualmente.");

  console.log(`\n${"═".repeat(70)}`);
  console.log(`Resumen: ${asignarTrue.length} sin TACC | ${asignarFalse.length} con TACC | ${revisar.length} a revisar | ${yaTeníaSinGluten} ya tenían sinGluten`);

  if (!APPLY) {
    console.log(`\n⚠  MODO PROPUESTA — nada fue escrito.`);
    console.log(`   Revisá y corré con --apply para aplicar bloques 1 y 2.`);
    return;
  }

  console.log(`\n🔄 Aplicando...`);
  const todos = [
    ...asignarTrue.map(x => ({ id: x.id, val: true })),
    ...asignarFalse.map(x => ({ id: x.id, val: false })),
  ];
  const BATCH_SIZE = 400;
  for (let i = 0; i < todos.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const x of todos.slice(i, i + BATCH_SIZE)) {
      batch.update(db.collection("recetas").doc(x.id), {
        sinGluten: x.val,
        ultimaModificacion: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}: ${Math.min(i + BATCH_SIZE, todos.length) - i} docs`);
  }
  console.log(`✅ Backfill sinGluten aplicado (${asignarTrue.length} true + ${asignarFalse.length} false).`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
