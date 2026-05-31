import { describe, it, expect } from "vitest";
import { detectarDuplicado } from "./detectarDuplicado";
import type { Ingrediente } from "../types/models";

function ing(overrides: Partial<Ingrediente> = {}): Ingrediente {
  return {
    idIngrediente: "ING-0001",
    canonico: "ajo",
    nombrePreferido: "Ajo",
    sinonimos: ["diente de ajo"],
    categoria: "Verdura",
    rolNutricional: [],
    seccionGondola: "Verduleria",
    unidadesHabituales: [],
    vecesUsado: 5,
    ambiguo: false,
    origen: "seed",
    ...overrides,
  };
}

function catalog(...items: Ingrediente[]): Map<string, Ingrediente> {
  return new Map(items.map((i) => [i.idIngrediente, i]));
}

describe("detectarDuplicado", () => {
  it("devuelve el ingrediente cuando el canonico coincide", () => {
    const c = catalog(ing({ canonico: "ajo", nombrePreferido: "Ajo" }));
    const result = detectarDuplicado("Ajo", c);
    expect(result?.idIngrediente).toBe("ING-0001");
  });

  it("devuelve el ingrediente cuando el texto está en sinonimos", () => {
    const c = catalog(ing({ sinonimos: ["diente de ajo"] }));
    const result = detectarDuplicado("diente de ajo", c);
    expect(result?.idIngrediente).toBe("ING-0001");
  });

  it("devuelve null cuando no hay colisión", () => {
    const c = catalog(ing({ canonico: "ajo" }));
    expect(detectarDuplicado("cebolla", c)).toBeNull();
  });

  it("es case-insensitive y diacritic-insensitive (normalización)", () => {
    const c = catalog(ing({ canonico: "ajo" }));
    expect(detectarDuplicado("AJO", c)).not.toBeNull();
    expect(detectarDuplicado("  Ajo  ", c)).not.toBeNull();
    // "Ají" normaliza a "aji" ≠ "ajo" → null
    expect(detectarDuplicado("Ají", c)).toBeNull();
  });

  it("devuelve null con nombre vacío", () => {
    const c = catalog(ing());
    expect(detectarDuplicado("", c)).toBeNull();
    expect(detectarDuplicado("   ", c)).toBeNull();
  });

  it("detecta colisión en catálogo con múltiples ingredientes", () => {
    const c = catalog(
      ing({ idIngrediente: "ING-0001", canonico: "ajo" }),
      ing({ idIngrediente: "ING-0002", canonico: "cebolla", nombrePreferido: "Cebolla", sinonimos: [] }),
    );
    expect(detectarDuplicado("cebolla", c)?.idIngrediente).toBe("ING-0002");
    expect(detectarDuplicado("ajo", c)?.idIngrediente).toBe("ING-0001");
  });
});
