import type { Ingrediente, IngredienteEnReceta } from "../types/models";

export interface Sustituto {
  idIngrediente: string;
  nombre: string;
  fuente: "receta" | "catalogo";
}

// Para un ítem de receta: junta alternativas (receta) + equivalencias del catálogo
// del ingrediente referenciado. Dedup por idIngrediente. Devuelve [] si no hay.
export function sustitutosDeItem(
  item: IngredienteEnReceta,
  catalogoById: Map<string, Ingrediente>,
): Sustituto[] {
  const vistos = new Set<string>();
  const result: Sustituto[] = [];

  for (const alt of item.alternativas ?? []) {
    if (vistos.has(alt.idIngrediente)) continue;
    const ing = catalogoById.get(alt.idIngrediente);
    if (ing) {
      result.push({ idIngrediente: alt.idIngrediente, nombre: ing.nombrePreferido, fuente: "receta" });
      vistos.add(alt.idIngrediente);
    }
  }

  const ingPrincipal = catalogoById.get(item.idIngrediente);
  for (const eqId of ingPrincipal?.equivalencias ?? []) {
    if (vistos.has(eqId)) continue;
    const ing = catalogoById.get(eqId);
    if (ing) {
      result.push({ idIngrediente: eqId, nombre: ing.nombrePreferido, fuente: "catalogo" });
      vistos.add(eqId);
    }
  }

  return result;
}
