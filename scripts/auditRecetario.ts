/**
 * E3.4.13 — Auditoría del recetario en producción. READ-ONLY.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// normalizeText inline (función pura, no importa firebase)
function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

const TIPOS_ITEM_VALID = new Set([
  "Receta principal","Entrada","Guarnición","Postre","Panificado","Snack",
  "Desayuno","Conserva","Hidrato opcional","Jugo natural",
]);
const PROTEINAS_VALID = new Set([
  "Vacuna","Cerdo","Cordero","Aves","Pescado","Mariscos","Huevos",
  "Legumbres","Semillas","Frutos secos","Vegetal","Bebida",
]);

const MANIFEST: Record<string, string[]> = {
  "Tanda 1 (E3.4.9)": [
    "Carré de cordero en costra de hierbas y almendra","Cordero estilo Rogan Josh",
    "Costillitas de cordero al romero y ajo","Salmón en costra de pistacho con beurre blanc",
    "Ceviche de corvina","Curry verde tailandés de pescado","Pulpo a la gallega sobre coliflor",
    "Vieiras selladas sobre puré de coliflor","Cochinita pibil","Lomo de cerdo a la pimienta verde",
    "Ossobuco a la gremolata","Bulgogi de res","Carpaccio de lomo","Pollo tikka masala",
    "Pollo a la cazadora","Hummus casero","Pesto de albahaca casero","Puré de coliflor cremoso",
  ],
  "Tanda 2 (E3.4.10)": [
    "Tataki de atún con costra de sésamo","Salmón teriyaki sin azúcar",
    "Gyudon de res sobre arroz de coliflor","Pollo katsu en costra de almendra",
    "Larb de res tailandés","Tom kha gai","Aguachile de langostinos","Tinga de pollo",
    "Dak galbi de pollo picante","Anticuchos de res al ají panca",
    "Calamares a la plancha con ajillo","Souvlaki de cerdo",
  ],
  "Jugos (E3.6)": [
    "Jugo verde de pepino, apio y limón","Limonada de jengibre","Jugo de pepino y menta",
    "Jugo verde de espinaca y pepino","Agua saborizada de pomelo y romero",
    "Jugo de tomate, apio y limón","Jugo de naranja exprimido","Jugo de manzana y zanahoria",
    "Licuado de frutilla y banana","Jugo de sandía y menta","Jugo de ananá y jengibre","Limonada clásica",
  ],
  "Tanda 3 (E3.4.12)": [
    "Mayonesa casera","Chimichurri","Salsa criolla","Vinagreta clásica","Alioli","Salsa golf",
    "Mollejas al verdeo","Lengua a la vinagreta","Riñones al jerez","Matambre arrollado",
    "Áspic de pollo","Escabeche de pescado","Mousse de chocolate amargo 85%",
  ],
};

const ING_NUEVOS: Record<string, string[]> = {
  "Tanda 1": ["albahaca","alcaparras","carre de cordero","conac","cordero en cubos","corvina",
    "costillas de cordero","crema de leche","film","garam masala","gochujang","hielo",
    "hilo de cocina","lomo","manteca","osobuco","papel aluminio","papel manteca","pasta de achiote",
    "pasta de curry verde","pimienta verde en grano","pistachos","pulpo","salmon","salsa de pescado",
    "solomillo de cerdo","vieiras"],
  "Tanda 2": ["aji panca","atun rojo","chipotle","lemongrass"],
  "Tanda 3": ["mollejas","lengua","rinones","matambre","gelatina sin sabor","jerez seco","cafe"],
};

async function main() {
  const [recSnap, ingSnap] = await Promise.all([
    db.collection("recetas").get(),
    db.collection("ingredientes").get(),
  ]);

  const recetas = recSnap.docs.map(d => d.data() as any);
  const ingredientes = ingSnap.docs.map(d => d.data() as any);
  const ingIds = new Set(ingredientes.map((x: any) => x.idIngrediente as string));
  const ingCanons = new Set(ingredientes.map((x: any) => x.canonico as string));

  // ── 1. Conteo global ───────────────────────────────────────────────────
  console.log("\n=== CONTEO GLOBAL ===");
  console.log(`recetas: ${recetas.length} | ingredientes: ${ingredientes.length}`);

  // ── 2. Desglose ────────────────────────────────────────────────────────
  const count = (arr: any[], key: string) => {
    const m: Record<string, number> = {};
    arr.forEach(x => { const v = x[key] ?? "(sin valor)"; m[v] = (m[v] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(" | ");
  };
  console.log("\n=== DESGLOSE ===");
  console.log("tipoItem:          ", count(recetas, "tipoItem"));
  console.log("proteinaPrincipal: ", count(recetas, "proteinaPrincipal"));
  console.log("estilo:            ", count(recetas, "estilo"));

  // ── 3. Presencia por tanda ─────────────────────────────────────────────
  const canonicosEnDB = new Set(recetas.map((r: any) => r.nombreCanonico as string));
  console.log("\n=== PRESENCIA POR TANDA ===");
  const todosFaltantes: string[] = [];
  for (const [tanda, nombres] of Object.entries(MANIFEST)) {
    const faltantes = nombres.filter(n => !canonicosEnDB.has(normalizeText(n)));
    const presentes = nombres.length - faltantes.length;
    const ok = faltantes.length === 0 ? "✓" : "✗";
    console.log(`${tanda}: ${presentes}/${nombres.length} ${ok}`);
    if (faltantes.length > 0) { console.log(`  FALTANTES: ${faltantes.join(", ")}`); todosFaltantes.push(...faltantes); }
  }
  console.log(`FALTANTES TOTAL: ${todosFaltantes.length === 0 ? "ninguna" : todosFaltantes.join(", ")}`);

  // ── 4. Integridad ──────────────────────────────────────────────────────
  console.log("\n=== INTEGRIDAD ===");

  // Duplicados
  const canonCount: Record<string, number> = {};
  recetas.forEach((r: any) => { const c = r.nombreCanonico; canonCount[c] = (canonCount[c] ?? 0) + 1; });
  const dupes = Object.entries(canonCount).filter(([, n]) => n > 1).map(([c]) => c);
  console.log(`duplicados nombreCanonico: ${dupes.length === 0 ? "ninguno" : dupes.join(", ")}`);

  // Refs huérfanas
  let huerfanas = 0;
  const huerfanasEj: string[] = [];
  for (const r of recetas) {
    for (const ing of r.ingredientes ?? []) {
      if (ing.idIngrediente && !ingIds.has(ing.idIngrediente)) {
        huerfanas++;
        if (huerfanasEj.length < 5) huerfanasEj.push(`${r.nombre} → ${ing.idIngrediente}`);
      }
    }
  }
  console.log(`refs huérfanas: ${huerfanas === 0 ? "ninguna" : `${huerfanas} (ej: ${huerfanasEj.join("; ")})`}`);

  // Campos faltantes / enums inválidos
  const problemas: string[] = [];
  for (const r of recetas) {
    if (r.dificultadOrden == null) problemas.push(`${r.nombre}: sin dificultadOrden`);
    if (r.costoOrden == null)       problemas.push(`${r.nombre}: sin costoOrden`);
    if (r.porcionesMin == null)      problemas.push(`${r.nombre}: sin porcionesMin`);
    if (!TIPOS_ITEM_VALID.has(r.tipoItem))         problemas.push(`${r.nombre}: tipoItem inválido "${r.tipoItem}"`);
    if (!PROTEINAS_VALID.has(r.proteinaPrincipal)) problemas.push(`${r.nombre}: proteína inválida "${r.proteinaPrincipal}"`);
  }
  if (problemas.length === 0) {
    console.log("campos faltantes / enums inválidos: ninguno");
  } else {
    console.log(`campos faltantes / enums inválidos: ${problemas.length}`);
    problemas.slice(0, 20).forEach(p => console.log(`  - ${p}`));
    if (problemas.length > 20) console.log(`  ... y ${problemas.length - 20} más`);
  }

  // ── 5. Ingredientes nuevos por tanda ───────────────────────────────────
  console.log("\n=== INGREDIENTES NUEVOS ===");
  for (const [tanda, canons] of Object.entries(ING_NUEVOS)) {
    const faltantes = canons.filter(c => !ingCanons.has(c));
    const presentes = canons.length - faltantes.length;
    const ok = faltantes.length === 0 ? "✓" : "✗";
    console.log(`${tanda}: ${presentes}/${canons.length} ${ok}${faltantes.length ? ` — faltantes: ${faltantes.join(", ")}` : ""}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
