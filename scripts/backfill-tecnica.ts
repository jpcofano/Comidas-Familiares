/**
 * E14.8 — Backfill del campo `tecnica` (enum filtrable) desde `tecnicaPrincipal` (texto libre).
 *
 * Uso:
 *   npx tsx scripts/backfill-tecnica.ts           → modo propuesta (sin escribir)
 *   npx tsx scripts/backfill-tecnica.ts --apply   → aplica en Firestore
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { normalizeText } from "../src/lib/canonical";
import type { Tecnica } from "../src/types/models";

const APPLY = process.argv.includes("--apply");

const serviceAccount = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TEXTO_A_TECNICA: Record<string, Tecnica> = {
  // Horno
  "horno":                  "Horno",
  "horneado":               "Horno",
  "horno electrico":        "Horno",
  "horno lento":            "Horno",
  "doble horneado":         "Horno",
  "horno reduccion":        "Horno",
  "horno laqueado":         "Horno",
  "gratinado":              "Horno",
  // Parrilla / Plancha
  "asado":                  "Parrilla / Plancha",
  "grillado":               "Parrilla / Plancha",
  "plancha":                "Parrilla / Plancha",
  "parrilla":               "Parrilla / Plancha",
  // Salteado / Sartén
  "salteado":               "Salteado / Sartén",
  "sarten":                 "Salteado / Sartén",
  "sellado":                "Salteado / Sartén",
  "sellado reduccion":      "Salteado / Sartén",
  "sarten salsa":           "Salteado / Sartén",
  "wok":                    "Salteado / Sartén",
  // Frito
  "frito":                  "Frito",
  "fritura":                "Frito",
  // Hervido
  "hervido":                "Hervido",
  "hervido servicio":       "Hervido",
  "coccion vapor":          "Hervido",
  // Guiso / Braseado
  "braseado":               "Guiso / Braseado",
  "guiso":                  "Guiso / Braseado",
  "guisado":                "Guiso / Braseado",
  "estofado":               "Guiso / Braseado",
  "guiso coccion lenta":    "Guiso / Braseado",
  "guiso reduccion":        "Guiso / Braseado",
  "reduccion":              "Guiso / Braseado",
  // Crudo / Sin cocción
  "crudo":                  "Crudo / Sin cocción",
  "ensalada":               "Crudo / Sin cocción",
  "sin coccion":            "Crudo / Sin cocción",
  "marinado en frio":       "Crudo / Sin cocción",
  "macerado":               "Crudo / Sin cocción",
  "escabechado":            "Crudo / Sin cocción",
  "emulsion":               "Crudo / Sin cocción",
  "frio":                   "Crudo / Sin cocción",
  "mezclado":               "Crudo / Sin cocción",
  "armado":                 "Crudo / Sin cocción",
  // Licuado / Procesado
  "licuado":                "Licuado / Procesado",
  "exprimido":              "Licuado / Procesado",
  "procesado":              "Licuado / Procesado",
  "batido":                 "Licuado / Procesado",
  // Otra
  "emplatado":              "Otra",
  "reposo":                 "Otra",
  "hidratado":              "Otra",
  "gelificado":             "Otra",
  "arrollado":              "Otra",
  "picado":                 "Otra",
};

function resolverTecnica(tecnicaPrincipal: string): Tecnica | null {
  const norm = normalizeText(tecnicaPrincipal.trim());
  if (TEXTO_A_TECNICA[norm]) return TEXTO_A_TECNICA[norm];
  // Compuestos ("Hervido + Horno", "Sartén / Salsa"): tomar la primera parte
  const primera = norm.split(/[\/\+\-]/).map(p => p.trim()).find(p => TEXTO_A_TECNICA[p]);
  return primera ? TEXTO_A_TECNICA[primera] : null;
}

async function main() {
  const snap = await db.collection("recetas").get();

  const asignar:   Array<{ id: string; nombre: string; tecnicaLibre: string; tecnica: Tecnica }> = [];
  const revisar:   Array<{ id: string; nombre: string; tecnicaLibre: string }> = [];
  let yaTenía = 0;

  snap.forEach(doc => {
    const r = doc.data();
    if (r.tecnica) { yaTenía++; return; }

    const libre: string = (r.tecnicaPrincipal ?? "").trim();
    const tecnica = resolverTecnica(libre);
    if (tecnica) {
      asignar.push({ id: doc.id, nombre: r.nombre, tecnicaLibre: libre, tecnica });
    } else {
      revisar.push({ id: doc.id, nombre: r.nombre, tecnicaLibre: libre });
    }
  });

  const colW = [12, 38, 24, 22];
  console.log(`\n${"═".repeat(70)}`);
  console.log(`BLOQUE 1 — Se asignarán (${asignar.length} recetas)`);
  console.log("─".repeat(70));
  console.log(
    "idReceta".padEnd(colW[0]) + "nombre".padEnd(colW[1]) +
    "tecnicaPrincipal".padEnd(colW[2]) + "tecnica →"
  );
  console.log("─".repeat(70));
  for (const x of asignar) {
    console.log(
      x.id.padEnd(colW[0]) +
      x.nombre.substring(0, 36).padEnd(colW[1]) +
      x.tecnicaLibre.substring(0, 22).padEnd(colW[2]) +
      `→ ${x.tecnica}`
    );
  }

  console.log(`\n${"═".repeat(70)}`);
  console.log(`BLOQUE 2 — A revisar (${revisar.length} recetas — técnica no contemplada en el mapa)`);
  console.log("─".repeat(70));
  // Agrupar por tecnicaLibre para facilitar la revisión
  const grupos: Record<string, string[]> = {};
  for (const x of revisar) {
    grupos[x.tecnicaLibre] = grupos[x.tecnicaLibre] ?? [];
    grupos[x.tecnicaLibre].push(x.nombre);
  }
  for (const [lib, nombres] of Object.entries(grupos).sort()) {
    console.log(`  "${lib}" (${nombres.length}): ${nombres.slice(0, 2).join(", ")}${nombres.length > 2 ? "…" : ""}`);
  }

  console.log(`\n${"═".repeat(70)}`);
  console.log(`Resumen: ${asignar.length} asignar | ${revisar.length} a revisar | ${yaTenía} ya tenían tecnica`);

  if (!APPLY) {
    console.log(`\n⚠  MODO PROPUESTA — nada fue escrito.`);
    console.log(`   Revisá y corré con --apply para aplicar el bloque 1.`);
    return;
  }

  console.log(`\n🔄 Aplicando ${asignar.length} actualizaciones...`);
  const BATCH_SIZE = 400;
  for (let i = 0; i < asignar.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const x of asignar.slice(i, i + BATCH_SIZE)) {
      batch.update(db.collection("recetas").doc(x.id), {
        tecnica: x.tecnica,
        ultimaModificacion: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}: ${Math.min(i + BATCH_SIZE, asignar.length) - i} docs`);
  }
  console.log(`✅ Backfill tecnica aplicado (${asignar.length} recetas).`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
