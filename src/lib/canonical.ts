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

/**
 * Tabla de sinónimos manuales. Conservadora: mejor que dos ingredientes queden
 * separados a que se fusionen mal (resultado incorrecto en lista de compras).
 */
export const SINONIMOS_INGREDIENTES: Record<string, string> = {
  // cebolla
  "cebolla": "cebolla",
  "cebollas": "cebolla",
  "cebolla blanca": "cebolla",
  "cebolla colorada": "cebolla",
  "cebolla morada": "cebolla",

  // ajo
  "ajo": "ajo",
  "ajos": "ajo",
  "diente de ajo": "ajo",
  "dientes de ajo": "ajo",

  // zanahoria
  "zanahoria": "zanahoria",
  "zanahorias": "zanahoria",

  // tomate
  "tomate": "tomate",
  "tomates": "tomate",
  "tomate perita": "tomate",

  // morron
  "morron": "morron",
  "morrones": "morron",
  "aji morron": "morron",
  "pimiento": "morron",
  "pimientos": "morron",

  // aceite
  "aceite de oliva": "aceite de oliva",
  "oliva extra virgen": "aceite de oliva",
  "aceite oliva": "aceite de oliva",

  // leche de coco
  "leche de coco": "leche de coco",
  "crema de coco": "leche de coco",

  // sal / pimienta
  "sal": "sal",
  "sal fina": "sal",
  "sal gruesa": "sal gruesa",
  "pimienta": "pimienta",
  "pimienta negra": "pimienta",

  // huevos
  "huevo": "huevo",
  "huevos": "huevo",

  // hierbas comunes
  "perejil": "perejil",
  "cilantro": "cilantro",
  "albahaca": "albahaca",
  "tomillo": "tomillo",
  "romero": "romero",
};

/**
 * Canonicaliza un nombre de ingrediente para sumabilidad y anti-duplicado.
 * Aplica normalizeText + mapeo de sinónimos.
 */
export function canonicalizarIngrediente(input: unknown): string {
  const normalized = normalizeText(input);
  if (!normalized) return "";
  return SINONIMOS_INGREDIENTES[normalized] ?? normalized;
}
