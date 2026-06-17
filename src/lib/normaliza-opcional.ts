/**
 * Lógica pura de normalización del campo `opcional` de IngredienteEnReceta.
 * Extraída para poder testarla sin dependencias de Firebase Admin SDK.
 * Importada por scripts/fix-opcional-ingredientes.ts.
 */

export type NormResultado =
  | { changed: false }
  | { changed: true; opcional: boolean; notas?: string };

function parseBooleanString(s: string): boolean | null {
  const norm = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (["si", "yes", "true", "1"].includes(norm)) return true;
  if (["no", "false", "0"].includes(norm)) return false;
  return null;
}

/**
 * Normaliza el campo `opcional` de un ingrediente de receta.
 *
 * - boolean        → sin cambio
 * - "" / espacios  → { changed: true, opcional: false }
 * - "Sí"/"No"/etc. → { changed: true, opcional: boolean }
 * - texto libre    → { changed: true, opcional: false, notas: texto [+ notasExistente] }
 * - null/undefined → sin cambio
 */
export function normalizaOpcional(
  raw: unknown,
  notasExistente?: string,
): NormResultado {
  if (typeof raw === "boolean") return { changed: false };
  if (raw == null) return { changed: false };

  const trimmed = String(raw).trim();
  if (!trimmed) return { changed: true, opcional: false };

  const b = parseBooleanString(trimmed);
  if (b !== null) return { changed: true, opcional: b };

  const notas = notasExistente ? `${notasExistente} · ${trimmed}` : trimmed;
  return { changed: true, opcional: false, notas };
}
