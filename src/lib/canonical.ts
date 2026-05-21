/**
 * Normaliza un string para comparaciones case/diacritic-insensitive.
 * - lowercase
 * - NFD + remove diacritics (tildes, ñ → n)
 * - collapse whitespace
 * - trim
 */
export function normalizeText(input: unknown): string {
  if (input == null) return "";
  return String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
