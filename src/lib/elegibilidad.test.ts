import { describe, it, expect } from "vitest";
import { evaluarEspecial, evaluarExtra, evaluarEnProceso } from "./elegibilidad";
import type { Receta, Plan } from "../types/models";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeReceta(overrides: Partial<Receta> = {}): Receta {
  return {
    idReceta: "REC-0001",
    nombre: "Bondiola braseada",
    nombreCanonico: "bondiola braseada",
    tipoItem: "Receta principal",
    proteinaPrincipal: "Cerdo",
    estilo: "Argentino",
    tecnicaPrincipal: "Braseado",
    escenarioUso: "Cena Especial",
    pensadaPara: "Especial",
    sinLacteos: true,
    sinGluten: false,
    hidratos: false,
    aptoNocheDeADos: "Sí",
    paraJuanPablo: true,
    paraFamilia: true,
    tiempoActivoLabel: "30 min",
    tiempoActivoMin: 30,
    tiempoTotalLabel: "2h",
    tiempoTotalMin: 120,
    dificultad: "Media",
    dificultadOrden: 2,
    porcionesLabel: "4",
    porcionesMin: 4,
    porcionesMax: 4,
    costoEstimado: "Medio",
    costoOrden: 2,
    ingredientes: [],
    pasos: [],
    vecesCocinada: 0,
    ...overrides,
  };
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    idPlan: "PLAN-ESP",
    semanaInicio: "2026-05-18",
    semanaFin: "2026-05-24",
    tipoSeleccion: "receta",
    tipoPlan: "Especial",
    idSeleccion: "REC-0001",
    nombreSeleccion: "Bondiola braseada",
    recetaPrincipal: "Bondiola braseada",
    estado: "Elegida",
    fechaEleccion: { seconds: 0, nanoseconds: 0 },
    fechaPrevistaComida: null,
    cantidadPersonas: 4,
    listaComprasId: null,
    notas: "",
    origen: null,
    asignaciones: ["juanpablo"],
    votos: { juanpablo: null, maria: null, sofia: null, federico: null },
    comentariosPlan: { juanpablo: "", maria: "", sofia: "", federico: "" },
    datosCocinero: null,
    ...overrides,
  };
}

const recetaPrincipal = makeReceta({ idReceta: "REC-0001", tipoItem: "Receta principal" });
const recetaEntrada   = makeReceta({ idReceta: "REC-0101", tipoItem: "Entrada", nombre: "Langostinos" });
const recetaPostre    = makeReceta({ idReceta: "REC-0104", tipoItem: "Postre", nombre: "Frutas asadas" });

const planEspecial = makePlan({
  idPlan: "PLAN-ESP",
  tipoPlan: "Especial",
  idSeleccion: "REC-0001",
});
const planExtra = makePlan({
  idPlan: "PLAN-EXT",
  tipoPlan: "Especial extra",
  idSeleccion: "REC-0101",
  origen: "extra:PLAN-ESP",
});
const planEnProceso = makePlan({
  idPlan: "PLAN-ENP",
  tipoPlan: "En proceso",
  idSeleccion: "REC-0104",
});

// ─── evaluarEspecial ──────────────────────────────────────────────────────────

describe("evaluarEspecial", () => {
  it("puede si tipoItem === 'Receta principal' y no hay Especial activa", () => {
    const r = evaluarEspecial(recetaPrincipal, []);
    expect(r.puede).toBe(true);
    expect(r.especialExistente).toBeUndefined();
  });

  it("no puede si tipoItem !== 'Receta principal'", () => {
    expect(evaluarEspecial(recetaEntrada, []).puede).toBe(false);
    expect(evaluarEspecial(recetaPostre,  []).puede).toBe(false);
  });

  it("incluye la razon cuando no puede", () => {
    const r = evaluarEspecial(recetaEntrada, []);
    expect(r.razon).toBeTruthy();
  });

  it("puede pero con especialExistente cuando ya hay otra Especial activa", () => {
    const otraReceta = makeReceta({ idReceta: "REC-OTRA", tipoItem: "Receta principal" });
    const r = evaluarEspecial(otraReceta, [planEspecial]);
    expect(r.puede).toBe(true);
    expect(r.especialExistente?.idPlan).toBe("PLAN-ESP");
  });

  it("no puede si la receta ya ES la Especial activa", () => {
    const r = evaluarEspecial(recetaPrincipal, [planEspecial]);
    expect(r.puede).toBe(false);
    expect(r.razon).toMatch(/ya es la Especial/i);
  });
});

// ─── evaluarExtra ─────────────────────────────────────────────────────────────

describe("evaluarExtra", () => {
  it("no puede si tipoItem === 'Receta principal'", () => {
    const otraPrincipal = makeReceta({ idReceta: "REC-0099", tipoItem: "Receta principal", nombre: "Otra principal" });
    const r = evaluarExtra(otraPrincipal, [planEspecial]);
    expect(r.puede).toBe(false);
    expect(r.razon).toMatch(/receta principal/i);
  });

  it("sí puede si tipoItem !== 'Receta principal' (Guarnición)", () => {
    const guarnicion = makeReceta({ idReceta: "REC-0200", tipoItem: "Guarnición", nombre: "Puré" });
    const r = evaluarExtra(guarnicion, [planEspecial]);
    expect(r.puede).toBe(true);
    expect(r.especial?.idPlan).toBe("PLAN-ESP");
  });

  it("no puede si no hay Especial activa", () => {
    const r = evaluarExtra(recetaEntrada, []);
    expect(r.puede).toBe(false);
    expect(r.razon).toMatch(/Primero/i);
  });

  it("no puede si la receta es la Especial activa", () => {
    const r = evaluarExtra(recetaPrincipal, [planEspecial]);
    expect(r.puede).toBe(false);
    expect(r.razon).toMatch(/ya es la Especial/i);
  });

  it("no puede si la receta ya es extra de esa Especial", () => {
    const r = evaluarExtra(recetaEntrada, [planEspecial, planExtra]);
    expect(r.puede).toBe(false);
    expect(r.razon).toMatch(/ya es un extra/i);
  });

  it("puede si hay Especial activa y la receta no la duplica", () => {
    const r = evaluarExtra(recetaPostre, [planEspecial]);
    expect(r.puede).toBe(true);
    expect(r.especial?.idPlan).toBe("PLAN-ESP");
  });

  it("puede aunque la misma receta sea extra de OTRA Especial (origen distinto)", () => {
    const otraExtra = makePlan({
      idPlan: "PLAN-EXT-2",
      tipoPlan: "Especial extra",
      idSeleccion: "REC-0104",
      origen: "extra:PLAN-OTRA-ESP",  // pertenece a un Especial diferente
    });
    const r = evaluarExtra(recetaPostre, [planEspecial, otraExtra]);
    expect(r.puede).toBe(true);
  });
});

// ─── evaluarEnProceso ─────────────────────────────────────────────────────────

describe("evaluarEnProceso", () => {
  it("puede si la receta no está en proceso esta semana", () => {
    expect(evaluarEnProceso(recetaPrincipal, []).puede).toBe(true);
  });

  it("no puede si la receta ya es la Especial activa", () => {
    const r = evaluarEnProceso(recetaPrincipal, [planEspecial]);
    expect(r.puede).toBe(false);
    expect(r.razon).toMatch(/ya está activa/i);
  });

  it("no puede si la receta ya es un extra activo", () => {
    const r = evaluarEnProceso(recetaEntrada, [planEspecial, planExtra]);
    expect(r.puede).toBe(false);
    expect(r.razon).toMatch(/ya está activa/i);
  });

  it("no puede si la misma receta ya está En proceso", () => {
    const r = evaluarEnProceso(recetaPostre, [planEnProceso]);
    expect(r.puede).toBe(false);
    expect(r.razon).toMatch(/ya está En proceso/i);
  });

  it("puede para una receta distinta aunque haya otras En proceso", () => {
    const r = evaluarEnProceso(recetaEntrada, [planEnProceso]);
    expect(r.puede).toBe(true);
  });
});
