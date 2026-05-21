import { describe, it, expect } from "vitest";
import { calcularPromedio, calcularResultadoTextual } from "./voto";

describe("calcularPromedio", () => {
  it("4 votos → promedio con 1 decimal", () => {
    expect(calcularPromedio({ juanpablo: 8, maria: 9, sofia: 7, federico: 10 })).toBe(8.5);
  });

  it("1 voto → ese valor", () => {
    expect(calcularPromedio({ juanpablo: 8, maria: null, sofia: null, federico: null })).toBe(8);
  });

  it("sin votos → 0", () => {
    expect(calcularPromedio({ juanpablo: null, maria: null, sofia: null, federico: null })).toBe(0);
  });
});

describe("calcularResultadoTextual", () => {
  it("≥ 9 → Excelente", () => {
    expect(calcularResultadoTextual(9.5)).toBe("Excelente");
    expect(calcularResultadoTextual(9)).toBe("Excelente");
  });

  it("≥ 7.5 → Muy bueno", () => {
    expect(calcularResultadoTextual(7.5)).toBe("Muy bueno");
    expect(calcularResultadoTextual(8.9)).toBe("Muy bueno");
  });

  it("≥ 6 → Bueno", () => {
    expect(calcularResultadoTextual(6)).toBe("Bueno");
  });

  it("≥ 4 → Regular", () => {
    expect(calcularResultadoTextual(4)).toBe("Regular");
  });

  it("< 4 y > 0 → Malísimo", () => {
    expect(calcularResultadoTextual(3.9)).toBe("Malísimo");
    expect(calcularResultadoTextual(1)).toBe("Malísimo");
  });

  it("0 → vacío", () => {
    expect(calcularResultadoTextual(0)).toBe("");
  });
});
