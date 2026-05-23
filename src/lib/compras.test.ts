import { describe, it, expect } from "vitest";
import { agruparPorReceta } from "./compras";
import type { ItemCompra, AporteCompra } from "../types/models";

function makeAporte(nombreReceta: string, overrides: Partial<AporteCompra> = {}): AporteCompra {
  return {
    idPlan: "P1",
    idReceta: "R1",
    nombreReceta,
    textoOriginal: "ingrediente de prueba",
    tipoAporte: "receta",
    cantidad: 1,
    unidad: "unidades",
    ...overrides,
  };
}

function makeItem(id: string, aportes: AporteCompra[]): ItemCompra {
  return {
    id,
    idIngrediente: id,
    nombrePreferido: id,
    categoria: "Verdura",
    cantidadTotal: 1,
    cantidadLabel: "1 unidades",
    unidad: "unidades",
    opcional: false,
    yaTengo: false,
    notas: "",
    aportes,
  };
}

// ─── agruparPorReceta ─────────────────────────────────────────────────────────

describe("agruparPorReceta", () => {
  it("agrupa ítems bajo cada receta que los aportó", () => {
    const item = makeItem("cebolla", [makeAporte("Bondiola")]);
    const grupos = agruparPorReceta([item]);
    expect(grupos.has("Bondiola")).toBe(true);
    expect(grupos.get("Bondiola")).toHaveLength(1);
  });

  it("un ítem con 2 aportes aparece en ambos grupos", () => {
    const item = makeItem("ajo", [
      makeAporte("Bondiola", { idPlan: "P1", idReceta: "R1", cantidad: 2 }),
      makeAporte("Berenjenas", { idPlan: "P2", idReceta: "R2", cantidad: 1 }),
    ]);
    const grupos = agruparPorReceta([item]);
    expect(grupos.get("Bondiola")).toHaveLength(1);
    expect(grupos.get("Berenjenas")).toHaveLength(1);
  });

  it("ítem sin aportes cae en 'Sin origen'", () => {
    const item = makeItem("sal", []);
    const grupos = agruparPorReceta([item]);
    expect(grupos.has("Sin origen")).toBe(true);
  });
});
