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

// ─── Display helpers ──────────────────────────────────────────────────────────

// Unidades canónicas que pluralizan al mostrar (cantidad > 1).
// Las métricas científicas (g, kg, ml, l) no se listan aquí → se devuelven tal cual.
const PLURALES: Record<string, string> = {
  cda:    "cdas",
  cdita:  "cditas",
  unidad: "unidades",
  taza:   "tazas",
  diente: "dientes",
  rama:   "ramas",
  ramita: "ramitas",
  grande: "grandes",
  lata:   "latas",
  bife:   "bifes",
  feta:   "fetas",
  hoja:   "hojas",
  pizca:  "pizcas",
  punado: "punados",
  atado:  "atados",
};

/** Devuelve la forma (singular o plural) de una unidad canónica para mostrar. */
export function pluralizarUnidad(unidad: string, cantidad: number): string {
  if (!unidad) return "";
  if (cantidad <= 1) return unidad;
  return PLURALES[unidad] ?? unidad;
}

/** Formatea cantidad + unidad para mostrar (sin tocar el dato almacenado). */
export function formatearCantidadUnidad(cantidad: number, unidad: string): string {
  const u = pluralizarUnidad(unidad, cantidad);
  return u ? `${cantidad} ${u}` : String(cantidad);
}

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
