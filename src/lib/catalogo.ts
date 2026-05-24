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
