import { describe, it, expect } from "vitest";
import { parseNumber, parseTime, parseDificultad, parseCosto, parseSiNo, parseTiempoEstimadoASegundos } from "./parsers";

describe("parseNumber", () => {
  it("punto decimal", () => {
    expect(parseNumber("1.5")).toMatchObject({ value: 1.5 });
  });

  it("coma decimal latina", () => {
    expect(parseNumber("1,5")).toMatchObject({ value: 1.5 });
  });

  it("rango 'a'", () => {
    expect(parseNumber("1 a 2")).toMatchObject({ value: 1, min: 1, max: 2 });
  });

  it("rango guion", () => {
    expect(parseNumber("1-2")).toMatchObject({ value: 1, min: 1, max: 2 });
  });

  it("entero simple", () => {
    expect(parseNumber("3")).toMatchObject({ value: 3 });
  });

  it("string vacío → null", () => {
    expect(parseNumber("")).toBeNull();
  });

  it("null → null", () => {
    expect(parseNumber(null)).toBeNull();
  });

  it("texto → null", () => {
    expect(parseNumber("abc")).toBeNull();
  });

  it("rango con coma decimal", () => {
    expect(parseNumber("1,5 a 2,5")).toMatchObject({ value: 1.5, min: 1.5, max: 2.5 });
  });

  it("número con sufijo extrae solo el número", () => {
    const r = parseNumber("3 unidades");
    expect(r?.value).toBe(3);
  });

  it("preserva raw", () => {
    expect(parseNumber("1,5")?.raw).toBe("1,5");
  });
});

describe("parseTime", () => {
  it("solo minutos", () => {
    expect(parseTime("35 min")).toMatchObject({ value: 35 });
  });

  it("solo hora", () => {
    expect(parseTime("1 h")).toMatchObject({ value: 60 });
  });

  it("hora y minutos combinados", () => {
    expect(parseTime("1 h 30 min")).toMatchObject({ value: 90 });
  });

  it("hora decimal (1,5 h = 90 min)", () => {
    expect(parseTime("1,5 h")).toMatchObject({ value: 90 });
  });

  it("rango de minutos", () => {
    expect(parseTime("10 a 15 min")).toMatchObject({ value: 10, min: 10, max: 15 });
  });

  it("horas con 'hs'", () => {
    expect(parseTime("2 hs")).toMatchObject({ value: 120 });
  });

  it("rango 30 a 40 min", () => {
    expect(parseTime("30 a 40 min")).toMatchObject({ value: 30, min: 30, max: 40 });
  });

  it("string vacío → null", () => {
    expect(parseTime("")).toBeNull();
  });

  it("texto sin número → null", () => {
    expect(parseTime("no especificado")).toBeNull();
  });
});

describe("parseDificultad", () => {
  it("Baja → orden 1", () => {
    expect(parseDificultad("Baja")).toEqual({ label: "Baja", orden: 1 });
  });

  it("media (minúscula) → orden 2", () => {
    expect(parseDificultad("media")).toEqual({ label: "Media", orden: 2 });
  });

  it("Media-alta con guion → orden 3", () => {
    expect(parseDificultad("Media-alta")).toEqual({ label: "Media-alta", orden: 3 });
  });

  it("media alta sin guion → orden 3", () => {
    expect(parseDificultad("media alta")).toEqual({ label: "Media-alta", orden: 3 });
  });

  it("ALTA mayúscula → orden 4", () => {
    expect(parseDificultad("ALTA")).toEqual({ label: "Alta", orden: 4 });
  });

  it("string vacío → orden 0", () => {
    expect(parseDificultad("")).toEqual({ label: "", orden: 0 });
  });

  it("valor desconocido → orden 0", () => {
    expect(parseDificultad("muy alta")).toEqual({ label: "", orden: 0 });
  });
});

describe("parseCosto", () => {
  it("Bajo → orden 1", () => {
    expect(parseCosto("Bajo").orden).toBe(1);
  });

  it("Medio → orden 2", () => {
    expect(parseCosto("Medio").orden).toBe(2);
  });

  it("Medio/Alto → orden 3", () => {
    expect(parseCosto("Medio/Alto").orden).toBe(3);
  });

  it("Alto → orden 4", () => {
    expect(parseCosto("Alto").orden).toBe(4);
  });

  it("label correcto para Medio/Alto", () => {
    expect(parseCosto("Medio/Alto").label).toBe("Medio/Alto");
  });
});

describe("parseTiempoEstimadoASegundos", () => {
  it('"20 min" → 1200', () => {
    expect(parseTiempoEstimadoASegundos("20 min")).toBe(1200);
  });

  it('"1 h 15 min" → 4500', () => {
    expect(parseTiempoEstimadoASegundos("1 h 15 min")).toBe(4500);
  });

  it('"2 h" → 7200', () => {
    expect(parseTiempoEstimadoASegundos("2 h")).toBe(7200);
  });

  it('"45" (solo número) → 2700', () => {
    expect(parseTiempoEstimadoASegundos("45")).toBe(2700);
  });

  it('"1h30min" → 5400', () => {
    expect(parseTiempoEstimadoASegundos("1h30min")).toBe(5400);
  });

  it('"30 mins" → 1800', () => {
    expect(parseTiempoEstimadoASegundos("30 mins")).toBe(1800);
  });

  it('"1 hora 30 minutos" → 5400', () => {
    expect(parseTiempoEstimadoASegundos("1 hora 30 minutos")).toBe(5400);
  });

  it('string vacío → null', () => {
    expect(parseTiempoEstimadoASegundos("")).toBeNull();
  });

  it('null → null', () => {
    expect(parseTiempoEstimadoASegundos(null)).toBeNull();
  });

  it('undefined → null', () => {
    expect(parseTiempoEstimadoASegundos(undefined)).toBeNull();
  });

  it('"-" → null', () => {
    expect(parseTiempoEstimadoASegundos("-")).toBeNull();
  });

  it('"un rato" → null', () => {
    expect(parseTiempoEstimadoASegundos("un rato")).toBeNull();
  });

  it('"0 min" → null', () => {
    expect(parseTiempoEstimadoASegundos("0 min")).toBeNull();
  });
});

describe("parseSiNo", () => {
  it("Sí con tilde → true", () => {
    expect(parseSiNo("Sí")).toBe(true);
  });

  it("si sin tilde → true", () => {
    expect(parseSiNo("si")).toBe(true);
  });

  it("no → false", () => {
    expect(parseSiNo("no")).toBe(false);
  });

  it("No mayúscula → false", () => {
    expect(parseSiNo("No")).toBe(false);
  });

  it("Adaptable → null", () => {
    expect(parseSiNo("Adaptable")).toBeNull();
  });

  it("string vacío → null", () => {
    expect(parseSiNo("")).toBeNull();
  });

  it("null → null", () => {
    expect(parseSiNo(null)).toBeNull();
  });
});
