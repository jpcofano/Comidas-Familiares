import type { Ingrediente, IngredienteEnReceta, ItemCompra } from "../types/models";

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

// Para un ítem de la lista de compras: resuelve equivalencias del catálogo a nombres.
// Solo usa el catálogo (ItemCompra no tiene alternativas propias de receta).
// Devuelve [] si no hay equivalencias o el ingrediente no está en el catálogo.
export function sustitutosDeItemCompra(
  item: ItemCompra,
  catalogoById: Map<string, Ingrediente>,
): string[] {
  const ing = catalogoById.get(item.idIngrediente);
  if (!ing?.equivalencias?.length) return [];
  const vistos = new Set<string>();
  const nombres: string[] = [];
  for (const eqId of ing.equivalencias) {
    if (vistos.has(eqId)) continue;
    vistos.add(eqId);
    const eq = catalogoById.get(eqId);
    if (eq) nombres.push(eq.nombrePreferido);
  }
  return nombres;
}
