import { normalizeText } from "./canonical";
import type { Ingrediente } from "../types/models";

/**
 * Detecta si ya existe un ingrediente en el catálogo con el mismo nombre canónico
 * o con ese nombre entre sus sinónimos.
 * Devuelve el ingrediente existente, o null si no hay colisión.
 * Función pura — no tiene side-effects.
 */
export function detectarDuplicado(
  nombre: string,
  catalogo: Map<string, Ingrediente>,
): Ingrediente | null {
  const canon = normalizeText(nombre);
  if (!canon) return null;
  for (const ing of catalogo.values()) {
    if (ing.canonico === canon) return ing;
    if (ing.sinonimos.some((s) => normalizeText(s) === canon)) return ing;
  }
  return null;
}
