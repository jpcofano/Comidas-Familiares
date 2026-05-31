import type { Receta, Ingrediente } from "../types/models";

// ─── Básicos de despensa — siempre asumidos disponibles ───────────────────────
// Se mapean por canonico (normalizado) al inicializar la despensa default.
// Para agregar/quitar un básico: editar aquí + re-inicializar la despensa local.

export const BASICOS_CANONICOS = new Set([
  "sal fina",
  "sal gruesa",
  "pimienta negra",
  "agua",
  "aceite de oliva",
  "aceite de oliva suave",
  "aceite de coco",
  "azucar mascabo",
  "vinagre de manzana",
  "vinagre de vino",
]);

// Resuelve los básicos a idIngrediente usando el catálogo cargado.
export function despensaDefaultIds(catalogoById: Map<string, Ingrediente>): Set<string> {
  const ids = new Set<string>();
  for (const [id, ing] of catalogoById) {
    if (BASICOS_CANONICOS.has(ing.canonico.toLowerCase())) ids.add(id);
  }
  return ids;
}

// ─── Tipos de resultado ───────────────────────────────────────────────────────

export type EstadoReq =
  | { id: string; estado: "tengo" }
  | { id: string; estado: "sustituye"; conId: string }
  | { id: string; estado: "falta" };

export type Bucket = "ahora" | "cambio" | "falta1" | "faltaN";

export interface RecetaCocinable {
  receta: Receta;
  requeridos: EstadoReq[];
  faltan: string[];
  sustituciones: { faltaId: string; conId: string }[];
  cobertura: number;        // (tengo + sustituye) / requeridos.length — 0..1
  cocinable: boolean;       // faltan.length === 0
  conCambio: boolean;       // cocinable && sustituciones.length > 0
  bucket: Bucket;
}

// ─── Evaluador principal ──────────────────────────────────────────────────────

export function evaluarCocinables(
  recetas: Receta[],
  despensa: Set<string>,
  catalogoById: Map<string, Ingrediente>,
): RecetaCocinable[] {
  const resultado: RecetaCocinable[] = [];

  for (const receta of recetas) {
    const requeridos = receta.ingredientes.filter(i => !i.opcional);
    const estadoReqs: EstadoReq[] = [];
    const faltan: string[] = [];
    const sustituciones: { faltaId: string; conId: string }[] = [];

    for (const item of requeridos) {
      const id = item.idIngrediente;

      if (despensa.has(id)) {
        estadoReqs.push({ id, estado: "tengo" });
        continue;
      }

      // Buscar sustituto: equivalencias del catálogo
      const eqs = catalogoById.get(id)?.equivalencias ?? [];
      const eqEnDespensa = eqs.find(eqId => despensa.has(eqId));

      if (eqEnDespensa) {
        estadoReqs.push({ id, estado: "sustituye", conId: eqEnDespensa });
        sustituciones.push({ faltaId: id, conId: eqEnDespensa });
        continue;
      }

      // Buscar sustituto: alternativas propias de la receta
      const alts = item.alternativas ?? [];
      const altEnDespensa = alts.find(a => despensa.has(a.idIngrediente));

      if (altEnDespensa) {
        estadoReqs.push({ id, estado: "sustituye", conId: altEnDespensa.idIngrediente });
        sustituciones.push({ faltaId: id, conId: altEnDespensa.idIngrediente });
        continue;
      }

      estadoReqs.push({ id, estado: "falta" });
      faltan.push(id);
    }

    const cocinable = faltan.length === 0;
    const conCambio = cocinable && sustituciones.length > 0;
    const cubiertos = estadoReqs.filter(r => r.estado !== "falta").length;
    const cobertura = requeridos.length > 0 ? cubiertos / requeridos.length : 1;

    let bucket: Bucket;
    if (cocinable && !conCambio) bucket = "ahora";
    else if (cocinable && conCambio) bucket = "cambio";
    else if (faltan.length === 1) bucket = "falta1";
    else bucket = "faltaN";

    resultado.push({ receta, requeridos: estadoReqs, faltan, sustituciones, cobertura, cocinable, conCambio, bucket });
  }

  // Orden: ahora → cambio → falta1 → faltaN; dentro de cada uno cobertura desc, nombre asc
  const orden: Bucket[] = ["ahora", "cambio", "falta1", "faltaN"];
  resultado.sort((a, b) => {
    const da = orden.indexOf(a.bucket);
    const db = orden.indexOf(b.bucket);
    if (da !== db) return da - db;
    if (b.cobertura !== a.cobertura) return b.cobertura - a.cobertura;
    return a.receta.nombre.localeCompare(b.receta.nombre, "es");
  });

  return resultado;
}
