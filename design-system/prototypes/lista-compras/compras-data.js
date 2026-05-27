// compras-data.js — Mock data for shopping list prototypes
// Realistic week: 4 recetas, ~16 items consolidados, varios overlaps.

window.MIEMBROS = {
  jp:   { id: 'jp',   nombre: 'JP',   color: '#8a4a2f' },
  caro: { id: 'caro', nombre: 'Caro', color: '#74324a' },
  lola: { id: 'lola', nombre: 'Lola', color: 'oklch(0.55 0.07 130)' },
};

window.RECETAS = [
  { id: 'r1', nombre: 'Tallarines bolognesa', dia: 'Lun', porciones: 4, cocineros: ['jp'] },
  { id: 'r2', nombre: 'Pollo al horno',       dia: 'Mié', porciones: 4, cocineros: ['caro'] },
  { id: 'r3', nombre: 'Ensalada de palta',    dia: 'Jue', porciones: 4, cocineros: ['jp', 'lola'] },
  { id: 'r4', nombre: 'Milanesas con puré',   dia: 'Vie', porciones: 5, cocineros: ['jp', 'caro'] },
];

// Section colors (derived from brand, harmonious oklch)
window.SECCIONES = {
  'Verdulería':   { color: 'oklch(0.62 0.07 130)', letra: 'V' }, // sage
  'Carnicería':   { color: 'oklch(0.55 0.10 25)',  letra: 'C' }, // terracotta
  'Lácteos':      { color: 'oklch(0.78 0.04 90)',  letra: 'L' }, // butter
  'Almacén':      { color: 'oklch(0.62 0.08 60)',  letra: 'A' }, // amber
  'Panadería':    { color: 'oklch(0.65 0.07 50)',  letra: 'P' }, // honey
};

window.ORDEN_GONDOLA = ['Verdulería', 'Carnicería', 'Lácteos', 'Almacén', 'Panadería'];

// Group an array of items by góndola, preserving ORDEN_GONDOLA sequence.
// Returns [{ seccion, items: [...] }, …] — only sections present in the input.
window.groupByGondola = function (items) {
  const map = new Map();
  for (const it of items) {
    if (!map.has(it.seccion)) map.set(it.seccion, []);
    map.get(it.seccion).push(it);
  }
  for (const [, list] of map) list.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const out = [];
  for (const sec of window.ORDEN_GONDOLA) {
    if (map.has(sec)) out.push({ seccion: sec, items: map.get(sec) });
  }
  return out;
};

// Flatten the same data into a single array, in góndola order.
window.sortByGondola = function (items) {
  return window.groupByGondola(items).flatMap((g) => g.items);
};

// 16 items, ya con cantidades consolidadas + recetas que aportan
window.ITEMS_INICIALES = [
  { id: 'i01', nombre: 'Cebolla',       cantidad: '3 un',    seccion: 'Verdulería',  recetas: ['r1', 'r2'],       yaTengo: false },
  { id: 'i02', nombre: 'Tomate',        cantidad: '1 kg',    seccion: 'Verdulería',  recetas: ['r1', 'r3'],       yaTengo: false },
  { id: 'i03', nombre: 'Zanahoria',     cantidad: '4 un',    seccion: 'Verdulería',  recetas: ['r1', 'r2'],       yaTengo: false },
  { id: 'i04', nombre: 'Palta',         cantidad: '2 un',    seccion: 'Verdulería',  recetas: ['r3'],             yaTengo: false },
  { id: 'i05', nombre: 'Ajo',           cantidad: '1 cab',   seccion: 'Verdulería',  recetas: ['r1', 'r2', 'r4'], yaTengo: true },
  { id: 'i06', nombre: 'Papas',         cantidad: '1.5 kg',  seccion: 'Verdulería',  recetas: ['r4'],             yaTengo: false },
  { id: 'i07', nombre: 'Carne picada',  cantidad: '500 g',   seccion: 'Carnicería',  recetas: ['r1'],             yaTengo: false },
  { id: 'i08', nombre: 'Pollo entero',  cantidad: '1.5 kg',  seccion: 'Carnicería',  recetas: ['r2'],             yaTengo: false },
  { id: 'i09', nombre: 'Nalga',         cantidad: '800 g',   seccion: 'Carnicería',  recetas: ['r4'],             yaTengo: false },
  { id: 'i10', nombre: 'Leche',         cantidad: '2 L',     seccion: 'Lácteos',     recetas: ['r4'],             yaTengo: true },
  { id: 'i11', nombre: 'Queso rallado', cantidad: '200 g',   seccion: 'Lácteos',     recetas: ['r1', 'r4'],       yaTengo: false },
  { id: 'i12', nombre: 'Manteca',       cantidad: '200 g',   seccion: 'Lácteos',     recetas: ['r2'],             yaTengo: true },
  { id: 'i13', nombre: 'Huevos',        cantidad: '12 un',   seccion: 'Lácteos',     recetas: ['r4'],             yaTengo: false },
  { id: 'i14', nombre: 'Tallarines',    cantidad: '500 g',   seccion: 'Almacén',     recetas: ['r1'],             yaTengo: false },
  { id: 'i15', nombre: 'Pan rallado',   cantidad: '500 g',   seccion: 'Almacén',     recetas: ['r4'],             yaTengo: true },
  { id: 'i16', nombre: 'Aceite oliva',  cantidad: '500 ml',  seccion: 'Almacén',     recetas: ['r3'],             yaTengo: false },
];

// Helper: get recetas that contribute to an item
window.recetasDe = function (item) {
  return item.recetas.map((rid) => window.RECETAS.find((r) => r.id === rid)).filter(Boolean);
};

// Helper: get cocineros for an item (union of cocineros of its recetas)
window.cocinerosDe = function (item) {
  const set = new Set();
  for (const r of window.recetasDe(item)) for (const c of r.cocineros) set.add(c);
  return Array.from(set).map((id) => window.MIEMBROS[id]);
};
