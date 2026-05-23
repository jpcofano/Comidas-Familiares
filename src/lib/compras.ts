import type { ItemCompra } from "../types/models";

// Agrupa los mismos items por receta de origen.
// Un item aparece en todos los grupos de las recetas que lo aportaron.
export function agruparPorReceta(items: ItemCompra[]): Map<string, ItemCompra[]> {
  const map = new Map<string, ItemCompra[]>();
  for (const item of items) {
    const recetas = item.aportes.length > 0
      ? [...new Set(item.aportes.map((a) => a.nombreReceta))]
      : ["Sin origen"];
    for (const nombre of recetas) {
      if (!map.has(nombre)) map.set(nombre, []);
      map.get(nombre)!.push(item);
    }
  }
  return map;
}
