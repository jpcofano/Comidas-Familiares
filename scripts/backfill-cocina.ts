/**
 * E14.7 — Backfill del campo `cocina` en recetas que solo tienen `estilo`.
 *
 * Uso:
 *   npx tsx scripts/backfill-cocina.ts            → modo propuesta (imprime tabla, no escribe)
 *   npx tsx scripts/backfill-cocina.ts --apply    → aplica los cambios en Firestore
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { Cocina } from "../src/types/models";

const APPLY = process.argv.includes("--apply");

const serviceAccount = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── Mapa estilo → cocina ─────────────────────────────────────────────────────
const ESTILO_A_COCINA: Record<string, Cocina> = {
  // exactos
  "Argentina":             "Argentina",
  "Italiana":              "Italiana",
  "Francesa":              "Francesa",
  "Española":              "Española",
  "Mediterránea":          "Mediterránea",
  "China":                 "China",
  "Japonesa":              "Japonesa",
  "Coreana":               "Coreana",
  "Tailandesa":            "Tailandesa",
  "India":                 "India",
  "Mexicana":              "Mexicana",
  "Peruana":               "Peruana",
  "Árabe / Medio Oriente": "Árabe / Medio Oriente",
  // descriptivos argentinos
  "Argentino gourmet":     "Argentina",
  "Criollo":               "Argentina",
  "Criollo / parrilla":    "Argentina",
  "Steakhouse":            "Argentina",
  "Wok criollo":           "Argentina",
  // mediterráneos / españoles
  "Español / mediterráneo":  "Mediterránea",
  "Mediterráneo simple":     "Mediterránea",
  "Mediterráneo / marino":   "Mediterránea",
  // medio oriente
  "Marroquí":                "Árabe / Medio Oriente",
  "Marroquí / Medio Oriente":"Árabe / Medio Oriente",
};

// Ambiguos: no autoasignar, listar para revisión manual
const REVISAR_MANUAL = new Set(["Asiático"]);

async function main() {
  const snap = await db.collection("recetas").get();

  const asignar:   Array<{ id: string; nombre: string; estilo: string; cocina: Cocina }> = [];
  const revisar:   Array<{ id: string; nombre: string; estilo: string }> = [];
  const sinClasif: Array<{ id: string; nombre: string; estilo: string }> = [];
  const yaTeníaCocina: number[] = [];

  snap.forEach(doc => {
    const r = doc.data();
    if (r.cocina) { yaTeníaCocina.push(1); return; }

    const estilo: string = (r.estilo ?? "").trim();
    if (ESTILO_A_COCINA[estilo]) {
      asignar.push({ id: doc.id, nombre: r.nombre, estilo, cocina: ESTILO_A_COCINA[estilo] });
    } else if (REVISAR_MANUAL.has(estilo)) {
      revisar.push({ id: doc.id, nombre: r.nombre, estilo });
    } else {
      sinClasif.push({ id: doc.id, nombre: r.nombre, estilo });
    }
  });

  // ── Bloque 1: Se asignarán ──────────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log(`BLOQUE 1 — Se asignarán (${asignar.length} recetas)`);
  console.log("─".repeat(70));
  if (asignar.length === 0) {
    console.log("  (ninguna)");
  } else {
    const colW = [12, 40, 22, 25];
    console.log(
      "idReceta".padEnd(colW[0]) +
      "nombre".padEnd(colW[1]) +
      "estilo".padEnd(colW[2]) +
      "cocina → asignada"
    );
    console.log("─".repeat(70));
    for (const x of asignar) {
      console.log(
        x.id.padEnd(colW[0]) +
        x.nombre.substring(0, 38).padEnd(colW[1]) +
        x.estilo.substring(0, 20).padEnd(colW[2]) +
        `→ ${x.cocina}`
      );
    }
  }

  // ── Bloque 2: A revisar manualmente ────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log(`BLOQUE 2 — A revisar manualmente (${revisar.length} recetas)`);
  console.log("─".repeat(70));
  if (revisar.length === 0) {
    console.log("  (ninguna)");
  } else {
    for (const x of revisar) {
      console.log(`  ${x.id}  "${x.nombre}"  (estilo: "${x.estilo}")`);
    }
    console.log('  → ¿China / Japonesa / Tailandesa / Coreana? Decidir por receta.');
  }

  // ── Bloque 3: Sin clasificar a propósito ────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log(`BLOQUE 3 — Sin clasificar (${sinClasif.length} recetas, dejar sin cocina)`);
  console.log("─".repeat(70));
  const grupos: Record<string, string[]> = {};
  for (const x of sinClasif) {
    const e = x.estilo || "(sin estilo)";
    grupos[e] = grupos[e] ?? [];
    grupos[e].push(x.nombre);
  }
  for (const [estilo, nombres] of Object.entries(grupos).sort()) {
    console.log(`  "${estilo}" (${nombres.length}): ${nombres.slice(0, 3).join(", ")}${nombres.length > 3 ? "…" : ""}`);
  }

  console.log(`\n${"═".repeat(70)}`);
  console.log(`Resumen: ${asignar.length} asignar | ${revisar.length} revisar | ${sinClasif.length} sin clasificar | ${yaTeníaCocina.length} ya tenían cocina`);

  if (!APPLY) {
    console.log(`\n⚠  MODO PROPUESTA — nada fue escrito.`);
    console.log(`   Revisá la tabla y corré con --apply para aplicar el bloque 1.`);
    return;
  }

  // ── Aplicar ─────────────────────────────────────────────────────────────────
  console.log(`\n🔄 Aplicando ${asignar.length} actualizaciones...`);
  const BATCH_SIZE = 400;
  for (let i = 0; i < asignar.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const x of asignar.slice(i, i + BATCH_SIZE)) {
      batch.update(db.collection("recetas").doc(x.id), {
        cocina: x.cocina,
        ultimaModificacion: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}: ${Math.min(i + BATCH_SIZE, asignar.length) - i} docs`);
  }
  console.log(`✅ Backfill aplicado (${asignar.length} recetas).`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
