import type { Receta, Proteina } from "../types/models";
import { GRUPOS_PROTEINA } from "../types/models";
import { normalizeText } from "./canonical";

export interface FiltrosReceta {
  tipoItem: string;
  proteina: string;      // puede ser hoja ("Aves") o grupo ("Carnes rojas")
  cocina: string;
  sinLacteos: boolean;
  sinHidratos: boolean;
  esVegetariano: boolean;
  esKeto: boolean;
  busqueda: string;
  maxNetos: number | null;  // hidratos netos por porción ≤ N g; null = sin filtro
}

export const FILTROS_INICIALES: FiltrosReceta = {
  tipoItem: "",
  proteina: "",
  cocina: "",
  sinLacteos: false,
  sinHidratos: false,
  esVegetariano: false,
  esKeto: false,
  busqueda: "",
  maxNetos: null,
};

export type MacrosPorReceta = Map<string, { netos: number; cobertura: number }>;

export function filtrarRecetas(
  recetas: Receta[],
  filtros: FiltrosReceta,
  macrosPorReceta?: MacrosPorReceta,
): Receta[] {
  const nc = normalizeText(filtros.busqueda);
  return recetas.filter(r => {
    if (filtros.tipoItem && r.tipoItem !== filtros.tipoItem) return false;

    if (filtros.proteina) {
      const hojas = GRUPOS_PROTEINA[filtros.proteina] as Proteina[] | undefined;
      if (hojas) {
        // Seleccionó un grupo — coincide con cualquier hoja del grupo
        if (!hojas.includes(r.proteinaPrincipal as Proteina)) return false;
      } else {
        // Seleccionó una hoja — match exacto
        if (r.proteinaPrincipal !== filtros.proteina) return false;
      }
    }

    if (filtros.cocina && r.estilo !== filtros.cocina && r.cocina !== filtros.cocina) return false;
    if (filtros.sinLacteos && !r.sinLacteos) return false;
    if (filtros.sinHidratos && r.hidratos) return false;
    if (filtros.esVegetariano && !r.esVegetariano) return false;
    if (filtros.esKeto && !r.esKeto) return false;
    if (nc && !r.nombreCanonico.includes(nc)) return false;

    if (filtros.maxNetos != null) {
      const macros = macrosPorReceta?.get(r.idReceta);
      if (!macros || macros.cobertura === 0 || macros.netos > filtros.maxNetos) return false;
    }

    return true;
  });
}

export function hayFiltrosActivos(filtros: FiltrosReceta): boolean {
  return !!(
    filtros.tipoItem ||
    filtros.proteina ||
    filtros.cocina ||
    filtros.sinLacteos ||
    filtros.sinHidratos ||
    filtros.esVegetariano ||
    filtros.esKeto ||
    filtros.busqueda.trim() ||
    filtros.maxNetos != null
  );
}
