import { describe, it, expect } from "vitest";
import { agruparPorClaveCanonica } from "./compras";
import type { Plan, Receta, ItemCompra } from "../types/models";

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    idPlan: "PLAN-001",
    semanaInicio: "2026-05-18",
    semanaFin: "2026-05-24",
    tipoSeleccion: "receta",
    tipoPlan: "Especial",
    idSeleccion: "REC-001",
    nombreSeleccion: "Test",
    recetaPrincipal: "Test",
    estado: "Cocinada",
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

function makeReceta(ingredientes: Receta["ingredientes"], overrides: Partial<Receta> = {}): Receta {
  return {
    idReceta: "REC-001",
    nombre: "Receta Test",
    nombreCanonico: "receta test",
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
    ingredientes,
    pasos: [],
    vecesCocinada: 0,
    ...overrides,
  } as Receta;
}

describe("agruparPorClaveCanonica", () => {
  it("fusiona 'Cebolla 2 unidades' + 'Cebollas 1 unidades' → 1 item con 3 y 2 aportes", () => {
    const ing1 = {
      nroOrden: 1, ingrediente: "Cebolla", ingredienteCanonico: "cebolla",
      cantidad: 2, cantidadLabel: "2", unidad: "unidades", categoria: "Verdura", opcional: false,
    };
    const ing2 = {
      nroOrden: 1, ingrediente: "Cebollas", ingredienteCanonico: "cebolla",
      cantidad: 1, cantidadLabel: "1", unidad: "unidades", categoria: "Verdura", opcional: false,
    };
    const r1 = makeReceta([ing1], { idReceta: "REC-001", nombre: "Receta A" });
    const r2 = makeReceta([ing2], { idReceta: "REC-002", nombre: "Receta B" });
    const p1 = makePlan({ idPlan: "PLAN-001", idSeleccion: "REC-001" });
    const p2 = makePlan({ idPlan: "PLAN-002", idSeleccion: "REC-002" });

    const items = agruparPorClaveCanonica([{ plan: p1, receta: r1 }, { plan: p2, receta: r2 }]);

    expect(items).toHaveLength(1);
    expect(items[0].cantidadTotal).toBe(3);
    expect(items[0].aportes).toHaveLength(2);
    expect(items[0].ingredienteCanonico).toBe("cebolla");
  });

  it("NO fusiona 'Cebolla 200g' + 'Cebolla 1 unidades' (unidades distintas)", () => {
    const ingG = {
      nroOrden: 1, ingrediente: "Cebolla", ingredienteCanonico: "cebolla",
      cantidad: 200, cantidadLabel: "200", unidad: "g", categoria: "Verdura", opcional: false,
    };
    const ingU = {
      nroOrden: 1, ingrediente: "Cebolla", ingredienteCanonico: "cebolla",
      cantidad: 1, cantidadLabel: "1", unidad: "unidades", categoria: "Verdura", opcional: false,
    };
    const r1 = makeReceta([ingG], { idReceta: "REC-001" });
    const r2 = makeReceta([ingU], { idReceta: "REC-002" });
    const p1 = makePlan({ idPlan: "PLAN-001" });
    const p2 = makePlan({ idPlan: "PLAN-002" });

    const items = agruparPorClaveCanonica([{ plan: p1, receta: r1 }, { plan: p2, receta: r2 }]);

    expect(items).toHaveLength(2);
  });

  it("preserva yaTengo=true de sync anterior", () => {
    const ing = {
      nroOrden: 1, ingrediente: "Cebolla", ingredienteCanonico: "cebolla",
      cantidad: 2, cantidadLabel: "2", unidad: "unidades", categoria: "Verdura", opcional: false,
    };
    const r = makeReceta([ing]);
    const p = makePlan();

    const anterior: ItemCompra[] = [{
      id: "ITEM-0000",
      ingredienteCanonico: "cebolla",
      ingredienteLabel: "Cebolla",
      cantidadTotal: 2,
      cantidadLabel: "2 unidades",
      unidad: "unidades",
      categoria: "Verdura",
      yaTengo: true,
      aportes: [],
    }];

    const items = agruparPorClaveCanonica([{ plan: p, receta: r }], anterior);

    expect(items[0].yaTengo).toBe(true);
  });
});
