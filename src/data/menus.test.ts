import { describe, it, expect } from "vitest";
import { computeMenuDerived } from "./menus";
import type { Receta } from "../types/models";

function makeReceta(overrides: Partial<Receta>): Receta {
  return {
    idReceta: "REC-TEST",
    nombre: "Test",
    nombreCanonico: "test",
    tipoItem: "Receta principal",
    proteinaPrincipal: "Vacuna",
    estilo: "",
    tecnicaPrincipal: "",
    escenarioUso: "Cena Especial",
    pensadaPara: "Especial",
    sinLacteos: true,
    hidratos: false,
    aptoNocheDeADos: "Sí",
    paraJuanPablo: true,
    paraFamilia: true,
    tiempoActivoLabel: "",
    tiempoActivoMin: 0,
    tiempoTotalLabel: "",
    tiempoTotalMin: 0,
    dificultad: "Baja",
    dificultadOrden: 1,
    porcionesLabel: "",
    porcionesMin: 4,
    porcionesMax: 6,
    costoEstimado: "Bajo",
    costoOrden: 1,
    ingredientes: [],
    pasos: [],
    vecesCocinada: 0,
    ...overrides,
  } as Receta;
}

describe("computeMenuDerived", () => {
  it("returns safe defaults for 0 components", () => {
    const result = computeMenuDerived([]);
    expect(result.tiempoActivoMin).toBe(0);
    expect(result.tiempoTotalMin).toBe(0);
    expect(result.dificultadOrden).toBe(1);
    expect(result.sinLacteos).toBe(true);
    expect(result.hidratos).toBe(false);
    expect(result.porcionesMin).toBe(1);
    expect(result.porcionesMax).toBe(1);
    expect(result.costoOrden).toBe(1);
  });

  it("1 component: tiempoTotal = tiempoTotalMin, tiempoActivo = tiempoActivoMin", () => {
    const r = makeReceta({ tiempoActivoMin: 30, tiempoTotalMin: 60 });
    const result = computeMenuDerived([r]);
    expect(result.tiempoActivoMin).toBe(30);
    expect(result.tiempoTotalMin).toBe(60);
  });

  it("2 components: tiempoTotal = max(total) + activo of the rest", () => {
    // A: activo 20, total 30 — B: activo 15, total 90
    // B has max total: 90 + activo de A (20) = 110
    const a = makeReceta({ tiempoActivoMin: 20, tiempoTotalMin: 30 });
    const b = makeReceta({ tiempoActivoMin: 15, tiempoTotalMin: 90 });
    const result = computeMenuDerived([a, b]);
    expect(result.tiempoTotalMin).toBe(110);
    expect(result.tiempoActivoMin).toBe(35); // 20 + 15
  });

  it("sinLacteos is false if any component has sinLacteos=false", () => {
    const recetas = [
      makeReceta({ sinLacteos: true }),
      makeReceta({ sinLacteos: true }),
      makeReceta({ sinLacteos: false }),
    ];
    expect(computeMenuDerived(recetas).sinLacteos).toBe(false);
  });

  it("hidratos is true if any component has hidratos=true", () => {
    const recetas = [
      makeReceta({ hidratos: false }),
      makeReceta({ hidratos: true }),
    ];
    expect(computeMenuDerived(recetas).hidratos).toBe(true);
  });

  it("dificultadOrden = max across components", () => {
    const recetas = [
      makeReceta({ dificultadOrden: 2 }),
      makeReceta({ dificultadOrden: 4 }),
      makeReceta({ dificultadOrden: 1 }),
    ];
    expect(computeMenuDerived(recetas).dificultadOrden).toBe(4);
  });

  it("porcionesMin = min, porcionesMax = min (bottleneck component)", () => {
    const recetas = [
      makeReceta({ porcionesMin: 4, porcionesMax: 6 }),
      makeReceta({ porcionesMin: 2, porcionesMax: 4 }),
    ];
    const result = computeMenuDerived(recetas);
    expect(result.porcionesMin).toBe(2);
    expect(result.porcionesMax).toBe(4);
  });

  it("costoOrden = max across components", () => {
    const recetas = [
      makeReceta({ costoOrden: 1 }),
      makeReceta({ costoOrden: 3 }),
    ];
    expect(computeMenuDerived(recetas).costoOrden).toBe(3);
  });
});
