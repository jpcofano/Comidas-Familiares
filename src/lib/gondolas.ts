// src/lib/gondolas.ts — Secciones display (6 groups) mapeadas desde los 9
// valores raw de `seccionGondola` en Firestore / catalogo.ts.

export const ORDEN_GONDOLA_DISPLAY = [
  'Verdulería', 'Carnicería', 'Fiambrería', 'Lácteos', 'Almacén', 'Panadería',
] as const;

export type Seccion = typeof ORDEN_GONDOLA_DISPLAY[number];

export const SECCIONES: Record<Seccion, { color: string; letra: string }> = {
  'Verdulería': { color: 'oklch(0.62 0.07 130)', letra: 'V' },
  'Carnicería': { color: 'oklch(0.55 0.10 25)',  letra: 'C' },
  'Fiambrería': { color: 'oklch(0.58 0.09 350)', letra: 'F' },
  'Lácteos':    { color: 'oklch(0.78 0.04 90)',  letra: 'L' },
  'Almacén':    { color: 'oklch(0.62 0.08 60)',  letra: 'A' },
  'Panadería':  { color: 'oklch(0.65 0.07 50)',  letra: 'P' },
};

// Maps raw seccionGondola values (9, sin acentos) → display section (6, con acentos)
const GONDOLA_MAP: Record<string, Seccion> = {
  'Verduleria':        'Verdulería',
  'Carniceria':        'Carnicería',
  'Pescaderia':        'Carnicería',   // pescado sigue con carnes (casi sin uso)
  'Fiambreria':        'Fiambrería',   // sección propia desde E14.6
  'Lacteos y frescos': 'Lácteos',
  'Almacen / secos':   'Almacén',
  'Panaderia':         'Panadería',
  'Bazar / otros':     'Almacén',      // agrupado con Almacén
  'Despensa / otros':  'Almacén',      // agrupado con Almacén
};

export interface GrupoGondola<T> {
  seccion: Seccion;
  items: T[];
}

/**
 * Devuelve items agrupados por góndola (6 secciones display), en orden canónico.
 * Acepta cualquier tipo que tenga `seccionGondola: string` (valor raw de Firestore).
 * Secciones no reconocidas caen a 'Almacén'.
 */
export function groupByGondola<T extends { seccionGondola: string }>(
  items: T[],
): GrupoGondola<T>[] {
  const map = new Map<Seccion, T[]>();
  for (const item of items) {
    const sec: Seccion = GONDOLA_MAP[item.seccionGondola] ?? 'Almacén';
    if (!map.has(sec)) map.set(sec, []);
    map.get(sec)!.push(item);
  }
  const out: GrupoGondola<T>[] = [];
  for (const sec of ORDEN_GONDOLA_DISPLAY) {
    if (map.has(sec)) out.push({ seccion: sec, items: map.get(sec)! });
  }
  return out;
}
