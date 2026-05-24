import { describe, it, expect } from "vitest";
import { agruparPorReceta } from "./compras";
import { ORDEN_GONDOLA } from "./catalogo";
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

function makeItem(id: string, aportes: AporteCompra[], seccionGondola = "Verduleria"): ItemCompra {
  return {
    id,
    idIngrediente: id,
    nombrePreferido: id,
    seccionGondola,
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

// ─── ORDEN_GONDOLA ────────────────────────────────────────────────────────────

describe("ORDEN_GONDOLA", () => {
  it("tiene 9 secciones", () => {
    expect(ORDEN_GONDOLA).toHaveLength(9);
  });

  it("empieza con Verduleria y termina con Despensa / otros", () => {
    expect(ORDEN_GONDOLA[0]).toBe("Verduleria");
    expect(ORDEN_GONDOLA[ORDEN_GONDOLA.length - 1]).toBe("Despensa / otros");
  });

  it("ordena 3 ítems de distintas secciones según recorrido de súper", () => {
    const items: ItemCompra[] = [
      makeItem("aceite", [makeAporte("Receta A")], "Almacen / secos"),
      makeItem("carne", [makeAporte("Receta A")], "Carniceria"),
      makeItem("lechuga", [makeAporte("Receta A")], "Verduleria"),
    ];

    // Simular la lógica de porGondola de Compras.tsx
    const map = new Map<string, ItemCompra[]>();
    for (const item of items) {
      const sec = item.seccionGondola || "Despensa / otros";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(item);
    }
    const ordered: [string, ItemCompra[]][] = [];
    for (const sec of ORDEN_GONDOLA) {
      if (map.has(sec)) ordered.push([sec, map.get(sec)!]);
    }

    expect(ordered).toHaveLength(3);
    expect(ordered[0][0]).toBe("Verduleria");
    expect(ordered[1][0]).toBe("Carniceria");
    expect(ordered[2][0]).toBe("Almacen / secos");
  });
});
