import type { Plan, Receta, ItemCompra } from "../types/models";
import { canonicalizarIngrediente } from "./canonical";

export interface AporteInput {
  idPlan: string;
  idReceta: string;
  nombreReceta: string;
  cantidad: number;
  cantidadLabel: string;
  unidad: string;
  tipoOrigen: "receta" | "menu";
}

interface ItemAccum {
  ingredienteCanonico: string;
  ingredienteLabel: string;
  cantidadTotal: number;
  unidad: string;
  categoria: string;
  opcional: boolean;
  notas: string[];
  yaTengo: boolean;
  aportes: AporteInput[];
}

/**
 * Aggregates plan ingredients into ItemCompra list.
 * Respects previously-set yaTengo flags from prior sync.
 * Pure function — no Firestore calls.
 */
export function agruparPorClaveCanonica(
  planes: Array<{ plan: Plan; receta: Receta }>,
  itemsAnteriores: ItemCompra[] = []
): ItemCompra[] {
  const prevByKey = new Map<string, boolean>();
  for (const item of itemsAnteriores) {
    prevByKey.set(itemKey(item.ingredienteCanonico, item.unidad), item.yaTengo);
  }

  const accum = new Map<string, ItemAccum>();

  for (const { plan, receta } of planes) {
    for (const ing of receta.ingredientes) {
      const canonico = canonicalizarIngrediente(ing.ingrediente);
      const unidad = ing.unidad ?? "";
      const key = itemKey(canonico, unidad);
      const cantidad = ing.cantidad ?? ing.cantidadMin ?? 0;

      const aporte: AporteInput = {
        idPlan: plan.idPlan,
        idReceta: receta.idReceta,
        nombreReceta: receta.nombre,
        cantidad,
        cantidadLabel: ing.cantidadLabel,
        unidad,
        tipoOrigen: plan.tipoSeleccion,
      };

      if (accum.has(key)) {
        const existing = accum.get(key)!;
        existing.cantidadTotal += cantidad;
        existing.aportes.push(aporte);
        if (ing.notas) existing.notas.push(ing.notas);
        // opcional = true solo si TODOS los aportes son opcionales
        if (!ing.opcional) existing.opcional = false;
      } else {
        accum.set(key, {
          ingredienteCanonico: canonico,
          ingredienteLabel: ing.ingrediente,
          cantidadTotal: cantidad,
          unidad,
          categoria: ing.categoria ?? "",
          opcional: ing.opcional,
          notas: ing.notas ? [ing.notas] : [],
          yaTengo: prevByKey.get(key) ?? false,
          aportes: [aporte],
        });
      }
    }
  }

  return Array.from(accum.values()).map((item, idx) => ({
    id: `ITEM-${idx.toString().padStart(4, "0")}`,
    ingredienteCanonico: item.ingredienteCanonico,
    ingredienteLabel: item.ingredienteLabel,
    cantidadTotal: item.cantidadTotal,
    cantidadLabel: `${item.cantidadTotal} ${item.unidad}`.trim(),
    unidad: item.unidad,
    categoria: item.categoria,
    yaTengo: item.yaTengo,
    aportes: item.aportes.map((a) => ({
      idPlan: a.idPlan,
      idReceta: a.idReceta,
      nombreReceta: a.nombreReceta,
      cantidad: a.cantidad,
      cantidadLabel: a.cantidadLabel,
    })),
    notas: item.notas.join(" | ") || "",
  }));
}

function itemKey(canonico: string, unidad: string): string {
  return `${canonico}||${unidad}`;
}

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
