import type { Receta } from "../types/models";
import { normalizeText } from "./canonical";

export interface FiltrosReceta {
  tipoItem: string;
  proteina: string;
  sinLacteos: boolean;
  sinHidratos: boolean;
  busqueda: string;
}

export const FILTROS_INICIALES: FiltrosReceta = {
  tipoItem: "",
  proteina: "",
  sinLacteos: false,
  sinHidratos: false,
  busqueda: "",
};

export function filtrarRecetas(recetas: Receta[], filtros: FiltrosReceta): Receta[] {
  const nc = normalizeText(filtros.busqueda);
  return recetas.filter(r => {
    if (filtros.tipoItem && r.tipoItem !== filtros.tipoItem) return false;
    if (filtros.proteina && r.proteinaPrincipal !== filtros.proteina) return false;
    if (filtros.sinLacteos && !r.sinLacteos) return false;
    if (filtros.sinHidratos && r.hidratos) return false;
    if (nc && !r.nombreCanonico.includes(nc)) return false;
    return true;
  });
}

export function hayFiltrosActivos(filtros: FiltrosReceta): boolean {
  return !!(
    filtros.tipoItem ||
    filtros.proteina ||
    filtros.sinLacteos ||
    filtros.sinHidratos ||
    filtros.busqueda.trim()
  );
}
