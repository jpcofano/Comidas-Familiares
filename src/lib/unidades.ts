/**
 * Normaliza una unidad cruda a su forma canónica (singular, minúscula).
 * Devuelve null para unidades "a gusto", vacías o no reconocidas.
 *
 * Unidades nuevas no listadas caen en null + console.warn para señalizar
 * que la tabla necesita ampliarse.
 */

// Tabla canónica: entrada normalizada → forma canónica | null
// null = "a gusto" (sin medida precisa)
const TABLA: Record<string, string | null> = {
  // cucharadas
  "cda":  "cda",
  "cdas": "cda",

  // cucharaditas
  "cdita":  "cdita",
  "cditas": "cdita",
  "cdta":   "cdita",

  // unidades contables
  "unidad":   "unidad",
  "unidades": "unidad",
  "u":        "unidad",

  // taza
  "taza":  "taza",
  "tazas": "taza",
  "cup":   "taza",

  // diente (ajo, etc.)
  "diente":  "diente",
  "dientes": "diente",

  // rama / ramita
  "rama":    "rama",
  "ramas":   "rama",
  "ramita":  "ramita",
  "ramitas": "ramita",

  // grande
  "grande":  "grande",
  "grandes": "grande",

  // lata
  "lata":  "lata",
  "latas": "lata",

  // bife / feta / hoja
  "bife":  "bife",
  "bifes": "bife",
  "feta":  "feta",
  "fetas": "feta",
  "hoja":  "hoja",
  "hojas": "hoja",

  // métricas — ya canónicas, se pasan tal cual
  "g":     "g",
  "kg":    "kg",
  "ml":    "ml",
  "l":     "l",
  "pizca": "pizca",
  "punado": "punado",
  "atado": "atado",

  // sin medida → null (a gusto)
  "cantidad necesaria": null,
  "rama o cdita":       null,
  "cdita/diente":       null,
};

export function normalizarUnidad(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const norm = raw.toLowerCase().trim();
  if (norm === "") return null;

  if (Object.prototype.hasOwnProperty.call(TABLA, norm)) {
    return TABLA[norm];
  }

  console.warn("[unidad] no reconocida:", raw);
  return null;
}
