import { describe, it, expect } from "vitest";
import { normalizeText, canonicalizarIngrediente } from "./canonical";

describe("normalizeText", () => {
  it("lowercasea", () => {
    expect(normalizeText("Cebolla")).toBe("cebolla");
  });

  it("elimina tilde aguda", () => {
    expect(normalizeText("María")).toBe("maria");
  });

  it("elimina ñ → n", () => {
    expect(normalizeText("ÑOQUI")).toBe("noqui");
  });

  it("colapsa espacios múltiples", () => {
    expect(normalizeText("  con   espacios  ")).toBe("con espacios");
  });

  it("string vacío", () => {
    expect(normalizeText("")).toBe("");
  });

  it("null → string vacío", () => {
    expect(normalizeText(null)).toBe("");
  });

  it("undefined → string vacío", () => {
    expect(normalizeText(undefined)).toBe("");
  });

  it("number como input", () => {
    expect(normalizeText(123)).toBe("123");
  });

  it("preserva guiones y barras", () => {
    expect(normalizeText("Media-alta")).toBe("media-alta");
  });
});

describe("canonicalizarIngrediente", () => {
  it("plural cebolla → cebolla", () => {
    expect(canonicalizarIngrediente("Cebollas")).toBe("cebolla");
  });

  it("ajo pasthrough (en tabla)", () => {
    expect(canonicalizarIngrediente("ajo")).toBe("ajo");
  });

  it("dientes de ajo → ajo (mayúsculas)", () => {
    expect(canonicalizarIngrediente("DIENTES DE AJO")).toBe("ajo");
  });

  it("leche de coco normalizada", () => {
    expect(canonicalizarIngrediente("Leche de coco")).toBe("leche de coco");
  });

  it("ingrediente no listado → passthrough normalizado", () => {
    expect(canonicalizarIngrediente("Algo no listado")).toBe("algo no listado");
  });

  it("string vacío → string vacío", () => {
    expect(canonicalizarIngrediente("")).toBe("");
  });

  it("null → string vacío", () => {
    expect(canonicalizarIngrediente(null)).toBe("");
  });

  it("cebolla blanca → cebolla", () => {
    expect(canonicalizarIngrediente("Cebolla blanca")).toBe("cebolla");
  });
});
