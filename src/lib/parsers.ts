import type { RangoNumerico, Dificultad, Costo } from "../types/models";

/**
 * Parsea un número que puede venir como:
 *   "1.5" → 1.5 | "1,5" → 1.5 | "1 a 2" → rango | "1-2" → rango
 *   "" / null / "abc" → null
 */
export function parseNumber(input: unknown): RangoNumerico | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const normalized = raw.replace(/(\d),(\d)/g, "$1.$2");

  const rangoMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*(?:a|-)\s*(-?\d+(?:\.\d+)?)$/i);
  if (rangoMatch) {
    const min = Number(rangoMatch[1]);
    const max = Number(rangoMatch[2]);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { value: min, min, max, raw };
  }

  const numMatch = normalized.match(/^(-?\d+(?:\.\d+)?)$/);
  if (numMatch) {
    const value = Number(numMatch[1]);
    if (!Number.isFinite(value)) return null;
    return { value, raw };
  }

  // número con sufijo ("3 unidades") — extrae solo el número inicial
  const inicioMatch = normalized.match(/^(-?\d+(?:\.\d+)?)/);
  if (inicioMatch) {
    const value = Number(inicioMatch[1]);
    if (Number.isFinite(value)) return { value, raw };
  }

  return null;
}

/**
 * Parsea un tiempo a minutos.
 *   "35 min" → 35 | "1 h" → 60 | "1 h 30 min" → 90 | "1,5 h" → 90
 *   "10 a 15 min" → { value: 10, min: 10, max: 15 } | "" / null → null
 */
export function parseTime(input: unknown): RangoNumerico | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const lc = raw.toLowerCase().replace(/(\d),(\d)/g, "$1.$2");

  // rango "X a Y min" o "X-Y min"
  const rangoMatch = lc.match(
    /^(\d+(?:\.\d+)?)\s*(?:a|-)\s*(\d+(?:\.\d+)?)\s*(min|mins?|minutos?|m|h|hs|hrs?|horas?)?\.?$/
  );
  if (rangoMatch) {
    const a = Number(rangoMatch[1]);
    const b = Number(rangoMatch[2]);
    const unit = rangoMatch[3] ?? "min";
    const mult = /^h/.test(unit) ? 60 : 1;
    return { value: a * mult, min: a * mult, max: b * mult, raw };
  }

  // "X h Y min" combinado
  const hMinMatch = lc.match(
    /^(\d+(?:\.\d+)?)\s*(?:h|hs|hrs?|horas?)\.?\s*(\d+(?:\.\d+)?)\s*(?:min|mins?|minutos?|m)?\.?$/
  );
  if (hMinMatch) {
    const h = Number(hMinMatch[1]);
    const m = Number(hMinMatch[2]);
    return { value: h * 60 + m, raw };
  }

  // solo horas
  const hMatch = lc.match(/^(\d+(?:\.\d+)?)\s*(?:h|hs|hrs?|horas?)\.?$/);
  if (hMatch) {
    return { value: Math.round(Number(hMatch[1]) * 60), raw };
  }

  // solo minutos
  const minMatch = lc.match(/^(\d+(?:\.\d+)?)\s*(?:min|mins?|minutos?|m)?\.?$/);
  if (minMatch) {
    return { value: Number(minMatch[1]), raw };
  }

  return null;
}

/**
 * Dificultad → orden 1-4. Case-insensitive, tolerante a tildes.
 * Devuelve { label: "", orden: 0 } si no matchea.
 */
export function parseDificultad(input: unknown): { label: Dificultad | ""; orden: number } {
  if (input == null) return { label: "", orden: 0 };
  const norm = String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

  switch (norm) {
    case "baja": return { label: "Baja", orden: 1 };
    case "media": return { label: "Media", orden: 2 };
    case "media-alta":
    case "media alta": return { label: "Media-alta", orden: 3 };
    case "alta": return { label: "Alta", orden: 4 };
    default: return { label: "", orden: 0 };
  }
}

/**
 * Costo → orden 1-4.
 * Devuelve { label: "", orden: 0 } si no matchea.
 */
export function parseCosto(input: unknown): { label: Costo | ""; orden: number } {
  if (input == null) return { label: "", orden: 0 };
  const norm = String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

  switch (norm) {
    case "bajo": return { label: "Bajo", orden: 1 };
    case "medio": return { label: "Medio", orden: 2 };
    case "medio/alto":
    case "medio-alto":
    case "medio alto": return { label: "Medio/Alto", orden: 3 };
    case "alto": return { label: "Alto", orden: 4 };
    default: return { label: "", orden: 0 };
  }
}

/**
 * "Sí" / "No" / "Adaptable" → boolean | null.
 * - "Sí", "si", "yes", "true", "1" → true
 * - "No", "no", "false", "0" → false
 * - "Adaptable", "" u otro → null
 */
export function parseSiNo(input: unknown): boolean | null {
  if (input == null) return null;
  const norm = String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

  if (["si", "yes", "true", "1"].includes(norm)) return true;
  if (["no", "false", "0"].includes(norm)) return false;
  return null;
}
