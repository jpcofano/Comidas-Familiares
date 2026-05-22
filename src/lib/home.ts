import type { Plan } from "../types/models";

export interface PlanesDesglosados {
  especial: Plan | null;
  extras: Plan[];
  enProceso: Plan[];
}

export function separarPlanes(planes: Plan[]): PlanesDesglosados {
  const especial = planes.find(p => p.tipoPlan === "Especial") ?? null;
  const extras = especial
    ? planes.filter(
        p => p.tipoPlan === "Especial extra" && p.origen === `extra:${especial.idPlan}`
      )
    : [];
  const enProceso = planes.filter(p => p.tipoPlan === "En proceso");
  return { especial, extras, enProceso };
}
