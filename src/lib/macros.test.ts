import { describe, it, expect } from "vitest";
import { macrosDeReceta } from "./macros";
import { normalizaOpcional } from "./normaliza-opcional";
import type { Receta, Ingrediente, IngredienteEnReceta } from "../types/models";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeIng(id: string, override?: Partial<Ingrediente>): Ingrediente {
  return {
    idIngrediente: id, canonico: id, nombrePreferido: id,
    sinonimos: [], categoria: "Carne", rolNutricional: [],
    seccionGondola: "Carniceria", unidadesHabituales: [],
    vecesUsado: 0, ambiguo: false, origen: "seed",
    ...override,
  } as Ingrediente;
}

// Usa el campo `cantidad` (string | number) tal como lo guardan las recetas reales.
function makeItemReceta(id: string, cantidad: string | number, unidad: string, opcional = false): IngredienteEnReceta {
  return {
    idIngrediente: id, textoOriginal: id,
    cantidad, unidad, opcional,
  } as IngredienteEnReceta;
}

function makeReceta(ingredientes: IngredienteEnReceta[], porcionesMin = 4): Receta {
  return {
    idReceta: "TEST", nombre: "Test", nombreCanonico: "test",
    tipoItem: "Receta principal", proteinaPrincipal: "Vacuna",
    escenarioUso: "Cocina rápida", pensadaPara: "Semana",
    sinLacteos: true, hidratos: false, aptoNocheDeADos: "No",
    paraJuanPablo: true, paraFamilia: true,
    tiempoActivoLabel: "20 min", tiempoActivoMin: 20,
    tiempoTotalLabel: "30 min", tiempoTotalMin: 30,
    dificultad: "Baja", dificultadOrden: 1,
    porcionesLabel: String(porcionesMin), porcionesMin, porcionesMax: porcionesMin,
    costoEstimado: "Bajo", costoOrden: 1,
    fuente: "test", ingredientes, pasos: [], vecesCocinada: 0,
  } as unknown as Receta;
}

// ─── Catálogo mock ────────────────────────────────────────────────────────────
// Pollo: 100g → 165 kcal, 0 carbs, 31g prot, 3.6g grasa, 0g fibra (USDA)
// Aceite: 100g → 884 kcal, 0 carbs, 0 prot, 100g grasa, 0g fibra
// Lechuga: sin macros (simula E11.2 no corrido aún)

const ING_POLLO = makeIng("pollo", {
  macros: { kcal: 165, carbohidratos: 0, proteinas: 31, grasas: 3.6, fibra: 0 },
});
const ING_ACEITE = makeIng("aceite", {
  macros: { kcal: 884, carbohidratos: 0, proteinas: 0, grasas: 100, fibra: 0 },
});
const ING_LECHUGA = makeIng("lechuga"); // sin macros

const catalogo = new Map<string, Ingrediente>([
  ["pollo",  ING_POLLO],
  ["aceite", ING_ACEITE],
  ["lechuga", ING_LECHUGA],
]);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("macrosDeReceta", () => {
  /**
   * Ejemplo trabajado a mano (verificable con calculadora):
   *
   * Receta 4 porciones:
   *  - 400g pollo  → 400/100 × {165,0,31,3.6,0}   = {660, 0, 124, 14.4, 0}
   *  - 2 cda aceite → 2×15g=30g → 30/100 × {884,0,0,100,0} = {265.2, 0, 0, 30, 0}
   *  - lechuga (sin macros) → sinDatos
   *  - sal (opcional) → ignorada
   *
   * Total:  kcal=925.2, carbs=0, prot=124, grasa=44.4, fibra=0
   * Porción (÷4): kcal=231.3, carbs=0, prot=31, grasa=11.1, fibra=0
   * HidratosNetosPorPorcion = max(0, 0 - 0) = 0
   * Cobertura = 2 con datos / (2 + 1 sin datos) = 2/3 ≈ 0.667
   */
  it("calcula totales, por porción, hidratos netos y cobertura correctamente (cantidad numérica)", () => {
    const receta = makeReceta([
      makeItemReceta("pollo",   400, "g"),
      makeItemReceta("aceite",  2,   "cda"),
      makeItemReceta("lechuga", 50,  "g"),
      makeItemReceta("sal",     1,   "pizca", true), // opcional → ignorado
    ]);

    const r = macrosDeReceta(receta, catalogo);

    // Totales
    expect(r.porTotal.kcal).toBeCloseTo(925.2, 1);
    expect(r.porTotal.proteinas).toBeCloseTo(124, 1);
    expect(r.porTotal.grasas).toBeCloseTo(44.4, 1);
    expect(r.porTotal.carbohidratos).toBe(0);
    expect(r.porTotal.fibra).toBe(0);

    // Por porción (÷4)
    expect(r.porPorcion.kcal).toBeCloseTo(231.3, 1);
    expect(r.porPorcion.proteinas).toBeCloseTo(31, 1);
    expect(r.porPorcion.grasas).toBeCloseTo(11.1, 1);

    // Hidratos netos
    expect(r.hidratosNetosPorPorcion).toBe(0);

    // Cobertura 2/3
    expect(r.cobertura).toBeCloseTo(2 / 3, 3);

    // Sin datos: lechuga (sal fue ignorada por opcional)
    expect(r.ingredientesSinDatos).toEqual(["lechuga"]);

    // Porciones usadas
    expect(r.porciones).toBe(4);
  });

  it("parsea cantidad como string con rango y coma decimal (dato real)", () => {
    // "1,2 a 1,5" kg pollo → promedio 1.35 kg = 1350 g
    // 1350/100 × {165,0,31,3.6,0} = {2227.5, 0, 418.5, 48.6, 0}
    // Porción (÷4): kcal=556.875, prot=104.625, grasas=12.15
    const receta = makeReceta([makeItemReceta("pollo", "1,2 a 1,5", "kg")]);
    const r = macrosDeReceta(receta, catalogo);

    expect(r.cobertura).toBe(1);
    expect(r.porPorcion.kcal).toBeCloseTo(556.9, 0);
    expect(r.porPorcion.proteinas).toBeCloseTo(104.6, 0);
  });

  it("cantidad 'a gusto' → sinDatos (no lanza, no suma)", () => {
    const receta = makeReceta([
      makeItemReceta("pollo",  400,      "g"),
      makeItemReceta("aceite", "a gusto", ""),
    ]);
    const r = macrosDeReceta(receta, catalogo);
    expect(r.cobertura).toBeCloseTo(1 / 2, 3); // solo pollo computable
    expect(r.ingredientesSinDatos).toContain("aceite");
  });

  it("hidratos netos = max(0, carbs - fibra)", () => {
    const brócoli = makeIng("brocoli", {
      macros: { kcal: 34, carbohidratos: 7, proteinas: 2.8, grasas: 0.4, fibra: 2.6 },
    });
    const cat2 = new Map([["brocoli", brócoli]]);
    const receta = makeReceta([makeItemReceta("brocoli", 200, "g")]);
    const r = macrosDeReceta(receta, cat2);
    // Por porción (÷4): carbs = 200/100×7 /4 = 3.5g, fibra = 200/100×2.6 /4 = 1.3g
    // HidratosNetos = 3.5 - 1.3 = 2.2
    expect(r.hidratosNetosPorPorcion).toBeCloseTo(2.2, 1);
  });

  it("cobertura = 0 si no hay ingredientes computables", () => {
    const receta = makeReceta([makeItemReceta("lechuga", 50, "g")]);
    const r = macrosDeReceta(receta, catalogo);
    expect(r.cobertura).toBe(0);
    expect(r.ingredientesSinDatos).toContain("lechuga");
  });

  it("opcionales no cuentan ni en datos ni en sin datos", () => {
    const receta = makeReceta([
      makeItemReceta("pollo",   200, "g"),
      makeItemReceta("lechuga", 50,  "g", true), // opcional
    ]);
    const r = macrosDeReceta(receta, catalogo);
    expect(r.cobertura).toBe(1); // solo pollo computable, lechuga ignorada
    expect(r.ingredientesSinDatos).toHaveLength(0);
  });

  it("fallback a porcionesMin=4 si falta", () => {
    const receta = makeReceta([makeItemReceta("pollo", 400, "g")]);
    Object.assign(receta, { porcionesMin: null });
    const r = macrosDeReceta(receta, catalogo);
    expect(r.porciones).toBe(4);
    expect(r.porPorcion.kcal).toBeCloseTo(165, 0); // 400g × 165/100 / 4 = 165
  });

  it("fallback a cantidadMin/Max si ing.cantidad es undefined", () => {
    // Datos de tests viejos: sin campo cantidad, con cantidadMin/Max
    const ing: IngredienteEnReceta = {
      idIngrediente: "pollo", textoOriginal: "pollo",
      cantidadMin: 400, cantidadMax: 400,
      unidad: "g", opcional: false,
    } as IngredienteEnReceta;
    const receta = makeReceta([ing]);
    const r = macrosDeReceta(receta, catalogo);
    expect(r.cobertura).toBe(1);
    expect(r.porPorcion.kcal).toBeCloseTo(165, 0);
  });

  it("opcional string (nota) NO se saltea — entra al cálculo", () => {
    // Dato real corrupto: opcional = "Picada especial" (truthy string)
    const ing: IngredienteEnReceta = {
      idIngrediente: "pollo", textoOriginal: "pollo",
      cantidad: 400, unidad: "g",
      opcional: "Nota de preparación" as unknown as boolean,
    } as IngredienteEnReceta;
    const receta = makeReceta([ing]);
    const r = macrosDeReceta(receta, catalogo);
    expect(r.cobertura).toBe(1);          // no se saltea
    expect(r.porPorcion.kcal).toBeCloseTo(165, 0);
  });

  it("opcional: true SÍ se saltea", () => {
    const receta = makeReceta([
      makeItemReceta("pollo",   400, "g", true),  // opcional: true → saltear
      makeItemReceta("aceite",  2,   "cda"),
    ]);
    const r = macrosDeReceta(receta, catalogo);
    // Solo aceite computable: 2 cda × 15g = 30g → 30/100 × 884 = 265.2 kcal total / 4 = 66.3
    expect(r.porPorcion.kcal).toBeCloseTo(66.3, 0);
    expect(r.ingredientesSinDatos).toHaveLength(0);
  });
});

// ─── normalizaOpcional ────────────────────────────────────────────────────────

describe("normalizaOpcional", () => {
  it("boolean → sin cambio", () => {
    expect(normalizaOpcional(true)).toEqual({ changed: false });
    expect(normalizaOpcional(false)).toEqual({ changed: false });
  });

  it("null / undefined → sin cambio", () => {
    expect(normalizaOpcional(null)).toEqual({ changed: false });
    expect(normalizaOpcional(undefined)).toEqual({ changed: false });
  });

  it("string vacío → false", () => {
    expect(normalizaOpcional("")).toEqual({ changed: true, opcional: false });
    expect(normalizaOpcional("   ")).toEqual({ changed: true, opcional: false });
  });

  it('"Sí" / "No" / "true" → boolean correspondiente', () => {
    expect(normalizaOpcional("Sí")).toEqual({ changed: true, opcional: true });
    expect(normalizaOpcional("si")).toEqual({ changed: true, opcional: true });
    expect(normalizaOpcional("No")).toEqual({ changed: true, opcional: false });
    expect(normalizaOpcional("true")).toEqual({ changed: true, opcional: true });
  });

  it("texto libre → opcional:false + notas con el texto", () => {
    const r = normalizaOpcional("Picada especial");
    expect(r).toEqual({ changed: true, opcional: false, notas: "Picada especial" });
  });

  it("texto libre + notas existente → concatena con ' · '", () => {
    const r = normalizaOpcional("Rallada fina", "Nota previa");
    expect(r).toEqual({ changed: true, opcional: false, notas: "Nota previa · Rallada fina" });
  });
});
