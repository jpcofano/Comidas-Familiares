/**
 * E9.11b — Contexto para fixes de medidas. READ-ONLY.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function find(recetas: any[], nombreFrag: string): any | undefined {
  return recetas.find(r => r.nombre?.toLowerCase().includes(nombreFrag.toLowerCase()));
}
function findAll(recetas: any[], nombreFrag: string): any[] {
  return recetas.filter(r => r.nombre?.toLowerCase().includes(nombreFrag.toLowerCase()));
}
function ingLine(ing: any): string {
  return `  textoOriginal="${ing.textoOriginal}" | preparacion="${ing.preparacion ?? ""}" | cantidad=${JSON.stringify(ing.cantidad)} | unidad="${ing.unidad ?? ""}" | notas="${ing.notas ?? ""}"`;
}
function ingShort(ing: any, catByID: Map<string, any>): string {
  const nombre = catByID.get(ing.idIngrediente)?.nombrePreferido ?? ing.idIngrediente;
  return `  ${nombre} | cant=${JSON.stringify(ing.cantidad)} | unidad="${ing.unidad ?? ""}"`;
}

// D2 hits: [nombreFrag, nroPaso]
const D2_HITS: [string, number][] = [
  ["Manzanas al horno con nueces", 3],
  ["Ribs laqueadas con jengibre", 2],
  ["Hummus con bastones de verdura", 1],
  ["Tostadas de huevo y palta", 2],
  ["Cochinita pibil", 11],
  ["Arañita al malbec", 6],
  ["Arañita al malbec", 8],
  ["Vieiras selladas sobre puré", 4],
  ["Pollo tikka masala", 2],
  ["Tinga de pollo", 3],
  ["Calamares a la plancha con ajillo", 2],
  ["Limonada de jengibre", 2],
  ["Áspic de pollo", 1],
  ["Involtini de carne al sugo", 1],
  ["Butter chicken", 2],
  ["Sopa azteca sin tortilla", 2],
  ["Tortilla española de zucchini", 3],
  ["Trucha al horno con almendras", 1],
  ["Abadejo en papillote", 1],
  ["Pollo salteado con brócoli", 2],
];

// D1 targets: [nombreFrag, ingredienteFragmento]
const D1_TARGETS: [string, string][] = [
  ["Brownie keto", "eritritol"],
  ["Limonada de jengibre", "eritritol"],
  ["Limonada clásica", "azúcar mascabo"],
  ["Tinga de pollo", "chipotle"],
  ["Chimichurri", "ají molido"],
  ["Cochinita pibil", "papel manteca"],
];

// D4b real: recetas a inspeccionar
const D4B_RECETAS: [string, string[]][] = [
  ["Cochinita pibil", ["pasta de achiote","papel aluminio","papel manteca","pomelo","manteca"]],
  ["Flan de coco", ["leche de coco","bebida de coco"]],
  ["Crema helada de frutilla", ["leche de coco","frutilla","bebida de coco"]],
  ["Ojo de bife", ["mostaza","echalote"]],
  ["Zarzuela de mariscos", ["calamar","mejillón","mejillon","langostino"]],
];

async function main() {
  const [recSnap, ingSnap] = await Promise.all([
    db.collection("recetas").get(),
    db.collection("ingredientes").get(),
  ]);
  const recetas = recSnap.docs.map(d => d.data() as any).filter(r => !r.esCompraRapida);
  const catByID = new Map<string, any>();
  ingSnap.forEach(d => { const x = d.data(); catByID.set(x.idIngrediente, x); });

  // ── C1 — Registros D1 ─────────────────────────────────────────────────────
  console.log("════════════════════════════════════════════════════════");
  console.log("C1 — REGISTROS D1 (ingredientes vagos Tier A)");
  console.log("════════════════════════════════════════════════════════");
  for (const [nombreFrag, ingFrag] of D1_TARGETS) {
    const r = find(recetas, nombreFrag);
    if (!r) { console.log(`\n[NO ENCONTRADA: ${nombreFrag}]`); continue; }
    console.log(`\n▶ "${r.nombre}"`);
    for (const ing of r.ingredientes ?? []) {
      const txt = (ing.textoOriginal ?? "").toLowerCase();
      const notas = (ing.notas ?? "").toLowerCase();
      const nombre = (catByID.get(ing.idIngrediente)?.nombrePreferido ?? "").toLowerCase();
      if (txt.includes(ingFrag.toLowerCase()) || notas.includes(ingFrag.toLowerCase()) || nombre.includes(ingFrag.toLowerCase())) {
        console.log(ingLine(ing));
      }
    }
  }

  // ── C2 — Contexto pasos D2 ────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════════════");
  console.log("C2 — PASOS D2 (medidas vagas) + LISTA DE INGREDIENTES");
  console.log("════════════════════════════════════════════════════════");

  // clasificación manual de cada hit
  const clasificacion: Record<string, string> = {
    "Manzanas al horno con nueces-3":       "(a) cantidad de cocción — agua/vino para cocción",
    "Ribs laqueadas con jengibre-2":        "(a) cantidad de cocción — agua/caldo para braseado",
    "Hummus con bastones de verdura-1":     "(a) cantidad de cocción — líquido de proceso",
    "Tostadas de huevo y palta-2":          "(c) punto de cocción — huevos al gusto del comensal",
    "Cochinita pibil-11":                   "(b) terminación — jugo para humedecer al servir",
    "Arañita al malbec-6":                  "(a) cantidad de cocción — caldo de ajuste en salsa",
    "Arañita al malbec-8":                  "(b) terminación — unas gotas de limón al final",
    "Vieiras selladas sobre puré-4":        "(b) terminación — hilo de manteca de terminación",
    "Pollo tikka masala-2":                 "(a) cantidad de cocción — manteca para dorar",
    "Tinga de pollo-3":                     "(a) cantidad de cocción — caldo para cocción",
    "Calamares a la plancha con ajillo-2":  "(a) cantidad de cocción — aceite para plancha",
    "Limonada de jengibre-2":               "(c) punto de cocción — eritritol al gusto",
    "Áspic de pollo-1":                     "(a) cantidad de cocción — caldo para hidratar gelatina",
    "Involtini de carne al sugo-1":         "(a) cantidad de cocción — parmesano en el relleno",
    "Butter chicken-2":                     "(a) cantidad de cocción — manteca para dorar",
    "Sopa azteca sin tortilla-2":           "(a) cantidad de cocción — caldo para licuar",
    "Tortilla española de zucchini-3":      "(a) cantidad de cocción — aceite para cuajar",
    "Trucha al horno con almendras-1":      "(b) terminación — hilo de aceite al ensamblar",
    "Abadejo en papillote-1":               "(b) terminación — chorrito de vino en papillote",
    "Pollo salteado con brócoli-2":         "(a) cantidad de cocción — agua para vaporizador",
  };

  const procesadas = new Set<string>();
  for (const [nombreFrag, nroPaso] of D2_HITS) {
    const r = find(recetas, nombreFrag);
    if (!r) { console.log(`\n[NO ENCONTRADA: ${nombreFrag}]`); continue; }
    const paso = (r.pasos ?? []).find((p: any) => p.nroPaso === nroPaso);
    if (!paso) { console.log(`\n[PASO ${nroPaso} NO ENCONTRADO en "${r.nombre}"]`); continue; }
    const key = `${nombreFrag}-${nroPaso}`;
    const clf = clasificacion[key] ?? "—";
    console.log(`\n▶ "${r.nombre}" | paso ${nroPaso} | ${clf}`);
    console.log(`  TÍTULO: ${paso.titulo}`);
    console.log(`  DETALLE: ${paso.detalle}`);
    // solo imprimir lista de ingredientes una vez por receta
    if (!procesadas.has(r.nombre)) {
      procesadas.add(r.nombre);
      console.log(`  INGREDIENTES:`);
      for (const ing of r.ingredientes ?? []) {
        console.log(ingShort(ing, catByID));
      }
    }
  }

  // ── C3 — Verificación D4b real ────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════════════");
  console.log("C3 — D4b REAL: ingredientes en pasos vs lista");
  console.log("════════════════════════════════════════════════════════");
  for (const [nombreFrag, terminos] of D4B_RECETAS) {
    const r = find(recetas, nombreFrag);
    if (!r) { console.log(`\n[NO ENCONTRADA: ${nombreFrag}]`); continue; }
    console.log(`\n▶ "${r.nombre}"`);
    console.log(`  LISTA DE INGREDIENTES:`);
    for (const ing of r.ingredientes ?? []) {
      const canon = catByID.get(ing.idIngrediente)?.canonico ?? ing.idIngrediente;
      console.log(`    ${ing.textoOriginal ?? canon} | id=${ing.idIngrediente} | canon="${canon}"`);
    }
    console.log(`  PASOS RELEVANTES (que mencionan: ${terminos.join(", ")}):`);
    for (const p of r.pasos ?? []) {
      const txt = `${p.titulo ?? ""} ${p.detalle ?? ""}`.toLowerCase();
      const match = terminos.some(t => txt.includes(t.toLowerCase()));
      if (match) {
        console.log(`    Paso ${p.nroPaso} — ${p.titulo}`);
        console.log(`      ${p.detalle}`);
      }
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
