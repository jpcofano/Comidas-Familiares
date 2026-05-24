import { describe, it, expect } from "vitest";
import { buildNuevoIngredienteDoc } from "./ingredientes";
import { CATEGORIAS_INGREDIENTE, ORDEN_GONDOLA } from "../lib/catalogo";

// Regression test for E3.4.8 — verifies that every ingredient created via
// the importer has the new 3-dimension schema and no legacy fields.

describe("buildNuevoIngredienteDoc", () => {
  const base = {
    id: "ING-0179",
    nombre: "Arroz",
    canon: "arroz",
    texNorm: "arroz",
    categoria: "Despensa varios",
    unidadNorm: "taza" as string | null,
  };

  it("tiene seccionGondola con valor de la lista canónica", () => {
    const doc = buildNuevoIngredienteDoc(base);
    expect(doc.seccionGondola).toBeDefined();
    expect(ORDEN_GONDOLA).toContain(doc.seccionGondola);
  });

  it("tiene rolNutricional como array vacío", () => {
    const doc = buildNuevoIngredienteDoc(base);
    expect(Array.isArray(doc.rolNutricional)).toBe(true);
  });

  it("ambiguo es true", () => {
    const doc = buildNuevoIngredienteDoc(base);
    expect(doc.ambiguo).toBe(true);
  });

  it("categoria está en la lista de 17 valores canónicos", () => {
    const doc = buildNuevoIngredienteDoc(base);
    expect(CATEGORIAS_INGREDIENTE).toContain(doc.categoria);
  });

  it("origen es import", () => {
    const doc = buildNuevoIngredienteDoc(base);
    expect(doc.origen).toBe("import");
  });

  it("NO tiene seccionDefault", () => {
    const doc = buildNuevoIngredienteDoc(base);
    expect(doc).not.toHaveProperty("seccionDefault");
  });

  it("NO tiene categoriaOverride", () => {
    const doc = buildNuevoIngredienteDoc(base);
    expect(doc).not.toHaveProperty("categoriaOverride");
  });

  it("unidadesHabituales se popula cuando hay unidad", () => {
    const doc = buildNuevoIngredienteDoc(base);
    expect(doc.unidadesHabituales).toEqual(["taza"]);
  });

  it("unidadesHabituales es array vacío cuando unidadNorm es null", () => {
    const doc = buildNuevoIngredienteDoc({ ...base, unidadNorm: null });
    expect(doc.unidadesHabituales).toEqual([]);
  });

  it("sinonimos se omite cuando canon === texNorm", () => {
    const doc = buildNuevoIngredienteDoc({ ...base, canon: "arroz", texNorm: "arroz" });
    expect(doc.sinonimos).toEqual([]);
  });

  it("sinonimos incluye texNorm cuando difiere del canon", () => {
    const doc = buildNuevoIngredienteDoc({ ...base, canon: "arroz", texNorm: "arrocito" });
    expect(doc.sinonimos).toContain("arrocito");
  });
});
