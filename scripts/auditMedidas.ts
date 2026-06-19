/**
 * E9.11 — Auditoría de medidas e ingredientes. READ-ONLY.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(readFileSync(resolve("scripts/service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Marcadores vagos ──────────────────────────────────────────────────────────
const VAGUE_ING  = ["a gusto","al gusto","c/n","cantidad necesaria","lo necesario","a ojo"];
const VAGUE_PASO = ["a gusto","al gusto","c/n","cantidad necesaria","un poco de","un chorrito",
                    "unas gotas","a ojo","rocío de","cantidad a gusto"];
// "un hilo de" solo si NO es "hilo de cocina"
const HILO_RE = /un hilo de(?!\s+cocina)/i;

// ── Ingredientes Tier B: sal/pimienta/agua/aceite genérico ───────────────────
const TIER_B_CANONICOS_RE = /^(sal\b|pimienta|agua\b|aceite\b)/i;

// ── Sal / pimienta canónicos (para D3) ───────────────────────────────────────
const SAL_CANON_RE     = /\bsal\b/i;     // sal fina, sal gruesa, sal de mar…
const PIMIENTA_CANON_RE = /\bpimienta\b/i;

// ── Palabras en pasos que indican uso de sal/pimienta ────────────────────────
const SAL_PASO_RE     = /\b(sal\b|salar|salpimentar|sazonar|condimentar)/i;
const PIMIENTA_PASO_RE = /\b(pimienta|salpimentar)/i;

// ── Términos a ignorar en D4b (demasiado genéricos) ─────────────────────────
const D4B_IGNORE = new Set(["sal","agua","aceite","pimienta","ajo","cebolla","sal fina","sal gruesa",
  "pimienta negra","aceite de oliva","aceite de coco","aceite de girasol"]);

function hayVaguedad(s: string | null | undefined, markers: string[]): string | null {
  if (!s) return null;
  const l = s.toLowerCase();
  for (const m of markers) if (l.includes(m)) return m;
  if (HILO_RE.test(s)) return "un hilo de";
  return null;
}

function isTierB(canon: string): boolean { return TIER_B_CANONICOS_RE.test(canon); }

function palabrasClave(texto: string): Set<string> {
  return new Set(texto.toLowerCase().split(/[\s,.()/;:!?]+/).filter(w => w.length > 3));
}

async function main() {
  const [recSnap, ingSnap] = await Promise.all([
    db.collection("recetas").get(),
    db.collection("ingredientes").get(),
  ]);

  const reales = recSnap.docs.map(d => d.data() as any).filter(r => !r.esCompraRapida);
  const catByID = new Map<string, any>();
  ingSnap.forEach(d => { const x = d.data(); catByID.set(x.idIngrediente, x); });

  // ── D1 — medidas vagas/ausentes en ingredientes[] ─────────────────────────
  console.log("=== D1 — Medidas vagas/ausentes en ingredientes[] ===");
  const d1A: string[] = [], d1B: string[] = [];
  for (const r of reales) {
    for (const ing of r.ingredientes ?? []) {
      const canon = catByID.get(ing.idIngrediente)?.canonico ?? "";
      const tierB = isTierB(canon);
      const cantNull = ing.cantidad == null || ing.cantidad === "" || ing.cantidad === 0;
      const vagnotas = hayVaguedad(ing.notas, VAGUE_ING);
      const vagtexto = hayVaguedad(ing.textoOriginal, VAGUE_ING);
      const marker = vagnotas ?? vagtexto;
      const line = `  "${r.nombre}" | ${ing.textoOriginal ?? canon} | cant=${JSON.stringify(ing.cantidad)} | unidad=${ing.unidad ?? "—"} | marcador=${marker ?? (cantNull ? "(sin cantidad)" : "—")}`;
      if (marker || cantNull) {
        if (tierB) d1B.push(line); else d1A.push(line);
      }
    }
  }
  console.log(`\nTier A (${d1A.length}):`); d1A.forEach(l => console.log(l));
  console.log(`\nTier B (${d1B.length}):`); d1B.forEach(l => console.log(l));

  // ── D2 — medidas vagas en pasos ───────────────────────────────────────────
  console.log("\n=== D2 — Medidas vagas en pasos ===");
  const d2A: string[] = [], d2B: string[] = [];
  for (const r of reales) {
    if (!(r.pasos?.length)) continue;
    for (const p of r.pasos) {
      const txt = `${p.titulo ?? ""} ${p.detalle ?? ""}`;
      const m = hayVaguedad(txt, VAGUE_PASO);
      if (!m) continue;
      // extraer fragmento
      const idx = txt.toLowerCase().indexOf(m);
      const frag = txt.slice(Math.max(0, idx - 15), idx + m.length + 20).replace(/\n/g, " ");
      const line = `  "${r.nombre}" | paso ${p.nroPaso} | «…${frag}…» | marcador="${m}"`;
      // sal/pimienta "a gusto" en paso → Tier B; otros → Tier A
      const palabras = txt.toLowerCase();
      const esSalPim = (SAL_PASO_RE.test(palabras) || PIMIENTA_PASO_RE.test(palabras)) && m === "a gusto";
      if (esSalPim) d2B.push(line); else d2A.push(line);
    }
  }
  console.log(`\nTier A (${d2A.length}):`); d2A.forEach(l => console.log(l));
  console.log(`\nTier B (${d2B.length}):`); d2B.forEach(l => console.log(l));

  // ── D3a — sal/pimienta en pasos pero no en lista ─────────────────────────
  console.log("\n=== D3a — Sal/pimienta en pasos sin estar listadas [Tier B] ===");
  const d3a: string[] = [];
  for (const r of reales) {
    if (!(r.pasos?.length)) continue;
    const pasoTxt = (r.pasos as any[]).map((p: any) => `${p.titulo ?? ""} ${p.detalle ?? ""}`).join(" ");
    const tieneSalEnPaso = SAL_PASO_RE.test(pasoTxt);
    const tienePimEnPaso = PIMIENTA_PASO_RE.test(pasoTxt);
    const ingCanons = (r.ingredientes ?? []).map((i: any) => catByID.get(i.idIngrediente)?.canonico ?? "");
    const tieneSalEnLista     = ingCanons.some((c: string) => SAL_CANON_RE.test(c));
    const tienePimEnLista     = ingCanons.some((c: string) => PIMIENTA_CANON_RE.test(c));
    const faltaSal = tieneSalEnPaso && !tieneSalEnLista;
    const faltaPim = tienePimEnPaso && !tienePimEnLista;
    if (faltaSal || faltaPim) {
      const faltantes = [faltaSal ? "SAL" : null, faltaPim ? "PIMIENTA" : null].filter(Boolean).join(", ");
      d3a.push(`  "${r.nombre}" | falta en lista: ${faltantes}`);
    }
  }
  console.log(`Total: ${d3a.length}`); d3a.forEach(l => console.log(l));

  // ── D3b — sal/pimienta listadas con cantidad vaga/0 ──────────────────────
  console.log("\n=== D3b — Sal/pimienta listadas con cantidad vaga/0 [Tier B] ===");
  const d3b: string[] = [];
  for (const r of reales) {
    for (const ing of r.ingredientes ?? []) {
      const canon = catByID.get(ing.idIngrediente)?.canonico ?? "";
      if (!SAL_CANON_RE.test(canon) && !PIMIENTA_CANON_RE.test(canon)) continue;
      const cantNull = ing.cantidad == null || ing.cantidad === "" || ing.cantidad === 0;
      const uniNull  = !ing.unidad;
      const marker   = hayVaguedad(ing.notas, VAGUE_ING) ?? hayVaguedad(ing.textoOriginal, VAGUE_ING);
      if (cantNull || uniNull || marker) {
        d3b.push(`  "${r.nombre}" | ${ing.textoOriginal ?? canon} | cant=${JSON.stringify(ing.cantidad)} | unidad=${ing.unidad ?? "—"} | marcador=${marker ?? "—"}`);
      }
    }
  }
  console.log(`Total: ${d3b.length}`); d3b.forEach(l => console.log(l));

  // ── D4a — ingredientes listados no mencionados en pasos ──────────────────
  console.log("\n=== D4a — Ingredientes listados no mencionados en pasos (CANDIDATOS) ===");
  console.log("NOTA: solo recetas con pasos cargados. Falsos positivos posibles cuando el ingrediente");
  console.log("      se usa por nombre compuesto o sinónimo en el paso.");
  const d4aA: string[] = [], d4aB: string[] = [];
  let recetasSinPasos = 0;
  for (const r of reales) {
    if (!(r.pasos?.length)) { recetasSinPasos++; continue; }
    const pasoTxt = (r.pasos as any[]).map((p: any) => `${p.titulo ?? ""} ${p.detalle ?? ""}`).join(" ").toLowerCase();
    for (const ing of r.ingredientes ?? []) {
      if (ing.opcional === true) continue; // opcionales no cuentan
      const canon = catByID.get(ing.idIngrediente)?.canonico ?? "";
      const texto = (ing.textoOriginal ?? "").toLowerCase();
      // extraer primera palabra significativa
      const primeraPalabra = texto.split(/[\s,]+/).find((w: string) => w.length > 2) ?? "";
      const encontrado = primeraPalabra && pasoTxt.includes(primeraPalabra);
      if (!encontrado && primeraPalabra) {
        const tierB = isTierB(canon);
        const line  = `  "${r.nombre}" | ${ing.textoOriginal ?? canon} | canon="${canon}"`;
        if (tierB) d4aB.push(line); else d4aA.push(line);
      }
    }
  }
  console.log(`\nRecetas sin pasos (excluidas de D4a): ${recetasSinPasos}`);
  console.log(`\nTier A — no mencionados en pasos (${d4aA.length}):`);
  d4aA.slice(0, 80).forEach(l => console.log(l));
  if (d4aA.length > 80) console.log(`  … y ${d4aA.length - 80} más`);
  console.log(`\nTier B — no mencionados en pasos (${d4aB.length}):`);
  d4aB.slice(0, 30).forEach(l => console.log(l));
  if (d4aB.length > 30) console.log(`  … y ${d4aB.length - 30} más`);

  // ── D4b — términos canónicos en pasos ausentes de la lista ───────────────
  console.log("\n=== D4b — Canónicos en texto de pasos ausentes de la lista (best-effort CANDIDATOS) ===");
  console.log("ADVERTENCIA: alto índice de falsos positivos. agua/sal/pimienta/aceite/ajo/cebolla excluidos.");
  const d4b: string[] = [];
  // canonicos largos del catálogo (> 4 chars, no genéricos)
  const canonicosLargos = ingSnap.docs
    .map(d => d.data().canonico as string)
    .filter(c => c && c.length > 4 && !D4B_IGNORE.has(c));

  for (const r of reales) {
    if (!(r.pasos?.length)) continue;
    const pasoTxt = (r.pasos as any[]).map((p: any) => `${p.titulo ?? ""} ${p.detalle ?? ""}`).join(" ").toLowerCase();
    const ingsEnReceta = new Set((r.ingredientes ?? []).map((i: any) => catByID.get(i.idIngrediente)?.canonico ?? ""));
    for (const c of canonicosLargos) {
      if (ingsEnReceta.has(c)) continue;
      if (pasoTxt.includes(c.toLowerCase())) {
        d4b.push(`  "${r.nombre}" | mencionado en pasos: "${c}" (no en lista)`);
      }
    }
  }
  // deduplicar por receta+canon
  const d4bUniq = [...new Set(d4b)];
  console.log(`\nCandidatos únicos: ${d4bUniq.length}`);
  d4bUniq.slice(0, 60).forEach(l => console.log(l));
  if (d4bUniq.length > 60) console.log(`  … y ${d4bUniq.length - 60} más`);

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log("\n=== RESUMEN ===");
  console.log(`D1  Tier A: ${d1A.length}  |  Tier B: ${d1B.length}`);
  console.log(`D2  Tier A: ${d2A.length}  |  Tier B: ${d2B.length}`);
  console.log(`D3a Tier B: ${d3a.length}  (sal/pimienta en pasos sin listar)`);
  console.log(`D3b Tier B: ${d3b.length}  (sal/pimienta listadas con cantidad vaga)`);
  console.log(`D4a Tier A: ${d4aA.length}  |  Tier B: ${d4aB.length}  (sin pasos excluidas: ${recetasSinPasos})`);
  console.log(`D4b candidatos: ${d4bUniq.length}  (best-effort, alto FP)`);
  const totalRecetasConHallazgo = new Set<string>();
  [...d1A,...d1B,...d2A,...d2B,...d3a,...d3b,...d4aA,...d4aB]
    .forEach(l => { const m = l.match(/"([^"]+)"/); if (m) totalRecetasConHallazgo.add(m[1]); });
  console.log(`Recetas con ≥1 hallazgo D1-D4a: ${totalRecetasConHallazgo.size} de ${reales.length}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
