import { normalizeText } from "./canonical";
import type { Ingrediente } from "../types/models";

export type Sugerencia = { ingrediente: Ingrediente };

export type ResultadoMatch =
  | { tipo: "exacto"; ingrediente: Ingrediente }
  | { tipo: "sugerencias"; sugerencias: Sugerencia[] }
  | { tipo: "nuevo" };

function trigramas(texto: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i <= texto.length - 3; i++) {
    set.add(texto.slice(i, i + 3));
  }
  return set;
}

function similitudTrigramas(a: string, b: string): number {
  const tA = trigramas(a);
  const tB = trigramas(b);
  if (tA.size === 0 || tB.size === 0) return 0;
  let interseccion = 0;
  for (const t of tA) {
    if (tB.has(t)) interseccion++;
  }
  return interseccion / (tA.size + tB.size - interseccion);
}

// Returns true if any word in 'palabras' is a prefix of 'nombre'
// (nombre starts with "word " or equals "word" — whole-word prefix, not substring).
// This distinguishes real variants ("arroz largo fino" for "arroz") from
// incidental matches ("galletas de arroz").
function prefijoPalabra(palabras: string[], nombre: string): boolean {
  return palabras.some(word => nombre === word || nombre.startsWith(word + " "));
}

export function matchIngrediente(
  textoRaw: string,
  catalogo: Map<string, Ingrediente>
): ResultadoMatch {
  const textoNorm = normalizeText(textoRaw);
  if (!textoNorm) return { tipo: "nuevo" };

  // Step 1 — exact match against canonico and sinonimos
  for (const ing of catalogo.values()) {
    if (normalizeText(ing.canonico) === textoNorm) return { tipo: "exacto", ingrediente: ing };
    for (const sin of ing.sinonimos ?? []) {
      if (normalizeText(sin) === textoNorm) return { tipo: "exacto", ingrediente: ing };
    }
  }

  // Step 2 — word-prefix over canonico and sinonimos
  const palabras = textoNorm.split(/\s+/).filter(Boolean);
  const porPalabraIds = new Set<string>();
  const porPalabra: Ingrediente[] = [];

  for (const ing of catalogo.values()) {
    const nombres = [
      normalizeText(ing.canonico),
      ...(ing.sinonimos ?? []).map(s => normalizeText(s)),
    ];
    if (nombres.some(n => prefijoPalabra(palabras, n))) {
      porPalabraIds.add(ing.idIngrediente);
      porPalabra.push(ing);
    }
  }

  // Step 3 — fuzzy fallback for typos; adds ingredients not already in Step 2
  const UMBRAL = 0.4;
  const porFuzzy: Ingrediente[] = [];

  for (const ing of catalogo.values()) {
    if (porPalabraIds.has(ing.idIngrediente)) continue;
    const sim = similitudTrigramas(textoNorm, normalizeText(ing.canonico));
    if (sim >= UMBRAL) porFuzzy.push(ing);
  }

  // Step 4 — merge, sort by vecesUsado desc, alphabetical tiebreak
  const todas = [...porPalabra, ...porFuzzy];
  if (todas.length === 0) return { tipo: "nuevo" };

  todas.sort((a, b) => {
    const diff = (b.vecesUsado ?? 0) - (a.vecesUsado ?? 0);
    return diff !== 0 ? diff : a.nombrePreferido.localeCompare(b.nombrePreferido);
  });

  return { tipo: "sugerencias", sugerencias: todas.map(ing => ({ ingrediente: ing })) };
}
