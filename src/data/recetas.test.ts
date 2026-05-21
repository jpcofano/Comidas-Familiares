import { describe, it, expect } from "vitest";
import { normalizeText } from "../lib/canonical";

describe("recetas: nombreCanonico computation", () => {
  it("lowercases and removes diacritics", () => {
    expect(normalizeText("Bondiola Braseada al Malbec")).toBe("bondiola braseada al malbec");
  });

  it("strips tildes and ñ", () => {
    expect(normalizeText("Pollo al Limón con Perejil")).toBe("pollo al limon con perejil");
  });

  it("collapses extra whitespace", () => {
    expect(normalizeText("  Arroz   con   Leche  ")).toBe("arroz con leche");
  });

  it("returns empty string for null/undefined", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
  });
});
