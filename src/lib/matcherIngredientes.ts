import { normalizeText } from "./canonical";
import type { Ingrediente } from "../types/models";

export interface MatchConSimilitud {
  ingrediente: Ingrediente;
  similitud: number;
}

export type ResultadoMatch =
  | { tipo: "exacto"; ingrediente: Ingrediente }
  | { tipo: "candidatos"; candidatos: MatchConSimilitud[] }
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

export function matchIngrediente(
  textoRaw: string,
  catalogo: Map<string, Ingrediente>
): ResultadoMatch {
  const textoNorm = normalizeText(textoRaw);
  if (!textoNorm) return { tipo: "nuevo" };

  for (const ing of catalogo.values()) {
    if (normalizeText(ing.canonico) === textoNorm) return { tipo: "exacto", ingrediente: ing };
    for (const sin of ing.sinonimos ?? []) {
      if (normalizeText(sin) === textoNorm) return { tipo: "exacto", ingrediente: ing };
    }
  }

  const UMBRAL = 0.4;
  const candidatos: MatchConSimilitud[] = [];

  for (const ing of catalogo.values()) {
    const sim = similitudTrigramas(textoNorm, normalizeText(ing.canonico));
    if (sim >= UMBRAL) candidatos.push({ ingrediente: ing, similitud: sim });
  }

  if (candidatos.length === 0) return { tipo: "nuevo" };

  candidatos.sort((a, b) => b.similitud - a.similitud);
  return { tipo: "candidatos", candidatos: candidatos.slice(0, 4) };
}
