// Listas canónicas de las tres dimensiones del catálogo de ingredientes.
// Fuente de verdad para validaciones en el reseed, ordenamiento en compras y UI.

export const CATEGORIAS_INGREDIENTE = [
  "Verdura",
  "Fruta",
  "Carne",
  "Pescado y marisco",
  "Huevo",
  "Lacteo",
  "Fiambre y embutido",
  "Cereal y derivado",
  "Legumbre",
  "Semilla y fruto seco",
  "Hierba y especia",
  "Condimento y aderezo",
  "Aceite y grasa",
  "Endulzante",
  "Caldo y fondo",
  "Despensa varios",
  "Utensilio",
] as const;

export const ROLES_NUTRICIONALES = [
  "Proteina",
  "Hidrato",
  "Grasa",
  "Fibra/Vegetal",
  "Azucar/Dulce",
  "Neutro",
] as const;

// Orden de recorrido del supermercado: Verdulería primero, Despensa al final.
// La lista de compras agrupa y ordena secciones según este array.
export const ORDEN_GONDOLA = [
  "Verduleria",
  "Carniceria",
  "Pescaderia",
  "Fiambreria",
  "Lacteos y frescos",
  "Almacen / secos",
  "Panaderia",
  "Bazar / otros",
  "Despensa / otros",
] as const;

export type CategoriaIngrediente = typeof CATEGORIAS_INGREDIENTE[number];
export type RolNutricional = typeof ROLES_NUTRICIONALES[number];
export type SeccionGondola = typeof ORDEN_GONDOLA[number];

// ─── Secciones de góndola con metadata visual ─────────────────────────────────

export interface SeccionMeta {
  color: string;  // oklch para mantener armonía con el brand
  letra: string;  // 1 char para el chip
}

export const SECCIONES_META: Record<string, SeccionMeta> = {
  'Verdulería':   { color: 'oklch(0.62 0.07 130)', letra: 'V' },
  'Carnicería':   { color: 'oklch(0.55 0.10 25)',  letra: 'C' },
  'Lácteos':      { color: 'oklch(0.78 0.04 90)',  letra: 'L' },
  'Almacén':      { color: 'oklch(0.62 0.08 60)',  letra: 'A' },
  'Panadería':    { color: 'oklch(0.65 0.07 50)',  letra: 'P' },
  // Raw Firestore values (mapeados igual para uso directo)
  'Verduleria':   { color: 'oklch(0.62 0.07 130)', letra: 'V' },
  'Carniceria':   { color: 'oklch(0.55 0.10 25)',  letra: 'C' },
  'Pescaderia':   { color: 'oklch(0.55 0.10 25)',  letra: 'C' },
  'Fiambreria':   { color: 'oklch(0.55 0.10 25)',  letra: 'C' },
  'Lacteos y frescos': { color: 'oklch(0.78 0.04 90)', letra: 'L' },
  'Almacen / secos':   { color: 'oklch(0.62 0.08 60)', letra: 'A' },
  'Panaderia':    { color: 'oklch(0.65 0.07 50)',  letra: 'P' },
  'Bazar / otros':     { color: 'oklch(0.62 0.08 60)', letra: 'A' },
  'Despensa / otros':  { color: 'var(--muted)',         letra: '·' },
};

export function getSeccionMeta(seccion: string): SeccionMeta {
  return SECCIONES_META[seccion] ?? SECCIONES_META['Despensa / otros'];
}

// ─── Secciones culinarias (ing.seccion en IngredienteEnReceta) ─────────────────
// Distinto a SECCIONES_META (que es de góndola de supermercado).
// Las secciones culinarias vienen del importador como texto libre; por eso el fallback
// usa la inicial del string en vez de un enum cerrado.

export const SECCIONES_RECETA_META: Record<string, SeccionMeta> = {
  'Principal':          { color: 'oklch(0.55 0.10 25)',  letra: 'P' },
  'Base de sabor':      { color: 'oklch(0.62 0.08 60)',  letra: 'B' },
  'Líquido de cocción': { color: 'oklch(0.60 0.07 200)', letra: 'L' },
  'Salsa':              { color: 'oklch(0.55 0.12 35)',   letra: 'S' },
  'Condimentos':        { color: 'oklch(0.62 0.07 130)', letra: 'C' },
  'Cocción':            { color: 'oklch(0.60 0.08 50)',   letra: 'C' },
  'Guarnición':         { color: 'oklch(0.65 0.07 140)', letra: 'G' },
  'Opcional familia':   { color: 'oklch(0.78 0.04 90)',  letra: 'O' },
};

export function getSeccionRecetaMeta(seccion: string): SeccionMeta {
  if (SECCIONES_RECETA_META[seccion]) return SECCIONES_RECETA_META[seccion];
  const letra = seccion.trim().charAt(0).toUpperCase() || '?';
  return { color: 'var(--muted)', letra };
}

/**
 * Agrupa items por sección de góndola en orden canónico de ORDEN_GONDOLA.
 * El campo de sección lo configurás vos vía el getter.
 * Útil para Compras (item.seccionGondola) y para Receta (ing.seccion).
 */
export function groupByGondola<T>(
  items: T[],
  getSeccion: (item: T) => string,
): Array<{ seccion: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const sec = getSeccion(it) || 'Despensa / otros';
    if (!map.has(sec)) map.set(sec, []);
    map.get(sec)!.push(it);
  }
  const out: Array<{ seccion: string; items: T[] }> = [];
  for (const sec of ORDEN_GONDOLA) {
    if (map.has(sec)) out.push({ seccion: sec, items: map.get(sec)! });
  }
  // No reconocidas al final
  for (const [sec, secItems] of map) {
    if (!ORDEN_GONDOLA.includes(sec as SeccionGondola)) out.push({ seccion: sec, items: secItems });
  }
  return out;
}
