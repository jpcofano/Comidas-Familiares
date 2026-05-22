import type { Receta, Plan } from "../types/models";

// ─── Especial ─────────────────────────────────────────────────────────────────

export interface ElegibilidadEspecial {
  puede: boolean;
  razon?: string;
  especialExistente?: Plan;
}

export function evaluarEspecial(receta: Receta, planesActivos: Plan[]): ElegibilidadEspecial {
  if (receta.tipoItem !== "Receta principal") {
    return { puede: false, razon: "Solo las recetas de tipo 'Receta principal' pueden ser la Especial." };
  }
  const actual = planesActivos.find(p => p.tipoPlan === "Especial");
  if (actual) {
    if (actual.idSeleccion === receta.idReceta) {
      return { puede: false, razon: "Esta receta ya es la Especial de la semana." };
    }
    return { puede: true, especialExistente: actual };
  }
  return { puede: true };
}

// ─── Especial extra ───────────────────────────────────────────────────────────

export interface ElegibilidadExtra {
  puede: boolean;
  razon?: string;
  especial?: Plan;
}

export function evaluarExtra(receta: Receta, planesActivos: Plan[]): ElegibilidadExtra {
  const especial = planesActivos.find(p => p.tipoPlan === "Especial");
  // "ya es la Especial" tiene precedencia para preservar el mensaje cuando la receta está asignada
  if (especial && especial.idSeleccion === receta.idReceta) {
    return { puede: false, razon: "Esta receta ya es la Especial de la semana." };
  }
  if (receta.tipoItem === "Receta principal") {
    return { puede: false, razon: "Una receta principal no puede ser un extra; elegila como Especial." };
  }
  if (!especial) {
    return { puede: false, razon: "Primero elegí una Especial para esta semana." };
  }
  const yaEsExtra = planesActivos.some(
    p => p.tipoPlan === "Especial extra"
      && p.tipoSeleccion === "receta"
      && p.idSeleccion === receta.idReceta
      && p.origen === `extra:${especial.idPlan}`
  );
  if (yaEsExtra) {
    return { puede: false, razon: "Esta receta ya es un extra de la Especial de esta semana." };
  }
  return { puede: true, especial };
}

// ─── En proceso ───────────────────────────────────────────────────────────────

export interface ElegibilidadEnProceso {
  puede: boolean;
  razon?: string;
}

export function evaluarEnProceso(receta: Receta, planesActivos: Plan[]): ElegibilidadEnProceso {
  // Primero: ¿ya es un plan "En proceso" exacto? (preserva mensaje original)
  const yaEnProceso = planesActivos.some(
    p => p.tipoPlan === "En proceso"
      && p.tipoSeleccion === "receta"
      && p.idSeleccion === receta.idReceta
  );
  if (yaEnProceso) {
    return { puede: false, razon: "Esta receta ya está En proceso esta semana." };
  }
  // Segundo: ¿ya está activa en cualquier otro tipo de plan? (Especial, extra…)
  const yaActiva = planesActivos.some(
    p => p.tipoSeleccion === "receta" && p.idSeleccion === receta.idReceta
  );
  if (yaActiva) {
    return { puede: false, razon: "Esta receta ya está activa esta semana." };
  }
  return { puede: true };
}
