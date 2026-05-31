import { describe, it, expect } from "vitest";
import { sustitutosDeItem } from "./sustitutos";
import type { Ingrediente, IngredienteEnReceta } from "../types/models";

function makeIng(id: string, nombrePreferido: string, equivalencias?: string[]): Ingrediente {
  return {
    idIngrediente: id,
    canonico: id,
    nombrePreferido,
    sinonimos: [],
    categoria: "Despensa varios",
    rolNutricional: [],
    seccionGondola: "Almacen / secos",
    unidadesHabituales: [],
    vecesUsado: 0,
    ambiguo: false,
    origen: "seed",
    ...(equivalencias ? { equivalencias } : {}),
  } as Ingrediente;
}

function makeItem(idIngrediente: string, alternativas?: { idIngrediente: string }[]): IngredienteEnReceta {
  return {
    idIngrediente,
    textoOriginal: idIngrediente,
    ...(alternativas ? { alternativas } : {}),
  } as IngredienteEnReceta;
}

describe("sustitutosDeItem", () => {
  it("devuelve [] si no hay alternativas ni equivalencias", () => {
    const cat = new Map([["ing-a", makeIng("ing-a", "Aceite de oliva")]]);
    const item = makeItem("ing-a");
    expect(sustitutosDeItem(item, cat)).toEqual([]);
  });

  it("resuelve alternativas de la receta con fuente 'receta'", () => {
    const cat = new Map([
      ["ing-a", makeIng("ing-a", "Manteca")],
      ["ing-b", makeIng("ing-b", "Aceite de coco")],
    ]);
    const item = makeItem("ing-a", [{ idIngrediente: "ing-b" }]);
    const result = sustitutosDeItem(item, cat);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ idIngrediente: "ing-b", nombre: "Aceite de coco", fuente: "receta" });
  });

  it("resuelve equivalencias del catálogo con fuente 'catalogo'", () => {
    const cat = new Map([
      ["ing-a", makeIng("ing-a", "Manteca", ["ing-c"])],
      ["ing-c", makeIng("ing-c", "Margarina")],
    ]);
    const item = makeItem("ing-a");
    const result = sustitutosDeItem(item, cat);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ idIngrediente: "ing-c", nombre: "Margarina", fuente: "catalogo" });
  });

  it("deduplica si el mismo id aparece en alternativas y equivalencias", () => {
    const cat = new Map([
      ["ing-a", makeIng("ing-a", "Manteca", ["ing-b"])],
      ["ing-b", makeIng("ing-b", "Aceite de coco")],
    ]);
    const item = makeItem("ing-a", [{ idIngrediente: "ing-b" }]);
    const result = sustitutosDeItem(item, cat);
    expect(result).toHaveLength(1);
    expect(result[0].fuente).toBe("receta"); // primero en aparecer gana
  });

  it("ignora alternativas cuyo id no está en el catálogo", () => {
    const cat = new Map([["ing-a", makeIng("ing-a", "Manteca")]]);
    const item = makeItem("ing-a", [{ idIngrediente: "ing-inexistente" }]);
    expect(sustitutosDeItem(item, cat)).toEqual([]);
  });

  it("combina alternativas receta + equivalencias catálogo sin dedup entre sí", () => {
    const cat = new Map([
      ["ing-a", makeIng("ing-a", "Manteca", ["ing-c"])],
      ["ing-b", makeIng("ing-b", "Aceite de coco")],
      ["ing-c", makeIng("ing-c", "Margarina")],
    ]);
    const item = makeItem("ing-a", [{ idIngrediente: "ing-b" }]);
    const result = sustitutosDeItem(item, cat);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ idIngrediente: "ing-b", fuente: "receta" });
    expect(result[1]).toMatchObject({ idIngrediente: "ing-c", fuente: "catalogo" });
  });
});
