import { describe, it, expect, vi, afterEach } from "vitest";
import { aGramos } from "./conversiones";
import type { Ingrediente } from "../types/models";

function makeIng(gramosPorUnidad?: number): Ingrediente {
  return {
    idIngrediente: "test", canonico: "test", nombrePreferido: "test",
    sinonimos: [], categoria: "Despensa varios", rolNutricional: [],
    seccionGondola: "Almacen / secos", unidadesHabituales: [],
    vecesUsado: 0, ambiguo: false, origen: "seed",
    ...(gramosPorUnidad != null ? { gramosPorUnidad } : {}),
  } as Ingrediente;
}

afterEach(() => { vi.restoreAllMocks(); });

describe("aGramos", () => {
  it("g → ×1", () => {
    expect(aGramos(250, "g")).toBe(250);
  });

  it("kg → ×1000", () => {
    expect(aGramos(1.5, "kg")).toBe(1500);
  });

  it("ml → ×1", () => {
    expect(aGramos(200, "ml")).toBe(200);
  });

  it("l → ×1000", () => {
    expect(aGramos(0.5, "l")).toBe(500);
  });

  it("cda → 15g cada una", () => {
    expect(aGramos(2, "cda")).toBe(30);
  });

  it("cdita → 5g", () => {
    expect(aGramos(1, "cdita")).toBe(5);
  });

  it("taza → 240g", () => {
    expect(aGramos(1, "taza")).toBe(240);
  });

  it("unidad sin override → factor por defecto 100g", () => {
    expect(aGramos(2, "u")).toBe(200);
  });

  it("unidad con override → cantidad × gramosPorUnidad", () => {
    const ing = makeIng(60); // ej. huevo = 60g
    expect(aGramos(3, "u", ing)).toBe(180);
  });

  it("diente con override → usa override", () => {
    const ing = makeIng(4); // ajo pequeño = 4g
    expect(aGramos(2, "diente", ing)).toBe(8);
  });

  it("'a gusto' (null) → null", () => {
    expect(aGramos(1, null)).toBeNull();
  });

  it("unidad vacía → null", () => {
    expect(aGramos(1, "")).toBeNull();
  });

  it("unidad no reconocida → null + warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(aGramos(1, "zanahoria")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("pizca → 0.5g", () => {
    expect(aGramos(1, "pizca")).toBe(0.5);
  });
});
