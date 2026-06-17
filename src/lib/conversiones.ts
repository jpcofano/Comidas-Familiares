/**
 * Conversión unidad → gramos para el cálculo de macros.
 * Factores por defecto son aproximaciones de cocina; override por ingrediente
 * mediante `ing.gramosPorUnidad`.
 */

import { normalizarUnidad } from "./unidades";
import type { Ingrediente } from "../types/models";

// ─── Tabla de factores por defecto (gramos por 1 unidad canónica) ─────────────
// Fuentes: etiquetas nutricionales estándar + referencia USDA.

const GRAMOS_POR_UNIDAD: Record<string, number> = {
  // Métricas exactas
  g:  1,
  kg: 1000,
  ml: 1,       // 1 ml ≈ 1 g (densidad agua)
  l:  1000,    // 1 l = 1000 ml ≈ 1000 g

  // Volumen de cocina
  cda:   15,   // 1 cucharada = 15 ml ≈ 15 g
  cdita: 5,    // 1 cucharadita = 5 ml ≈ 5 g
  taza:  240,  // 1 taza = 240 ml ≈ 240 g

  // Contables genéricos (override recomendado vía gramosPorUnidad)
  unidad: 100, // fallback genérico; muy variable — override por ingrediente
  diente: 5,   // diente de ajo ≈ 5 g
  rama:   10,  // rama de apio/canela ≈ 10 g
  ramita: 3,   // ramita de perejil/tomillo ≈ 3 g
  grande: 150, // unidad grande genérica ≈ 150 g; override por ingrediente
  lata:   400, // lata estándar ≈ 400 g netos
  bife:   180, // bife promedio ≈ 180 g; override recomendado
  feta:   20,  // feta/lámina de queso/fiambre ≈ 20 g
  hoja:   2,   // hoja de laurel/lechuga ≈ 2 g
  pizca:  0.5, // pizca de sal/especias ≈ 0.5 g
  punado: 30,  // puñado de hierbas/semillas ≈ 30 g
  atado:  50,  // atado de perejil/espinaca ≈ 50 g
};

// Unidades de conteo que admiten override por `ing.gramosPorUnidad`
const UNIDADES_CONTEO = new Set([
  "unidad", "diente", "rama", "ramita", "grande", "bife", "feta", "hoja",
]);

/**
 * Convierte una cantidad en la unidad dada a gramos.
 *
 * @param cantidad  Cantidad numérica del ingrediente.
 * @param unidad    Unidad cruda (puede ser null/"a gusto").
 * @param ing       Doc de catálogo del ingrediente (para override gramosPorUnidad).
 * @returns         Gramos equivalentes, o null si no es convertible.
 */
export function aGramos(
  cantidad: number,
  unidad: string | null | undefined,
  ing?: Ingrediente,
): number | null {
  const canon = normalizarUnidad(unidad);

  if (canon === null) return null; // "a gusto" o unidad vacía

  // Override por ingrediente en unidades de conteo
  if (UNIDADES_CONTEO.has(canon) && ing?.gramosPorUnidad != null) {
    return cantidad * ing.gramosPorUnidad;
  }

  const factor = GRAMOS_POR_UNIDAD[canon];
  if (factor == null) {
    console.warn("[conversiones] unidad sin factor:", canon);
    return null;
  }

  return cantidad * factor;
}
