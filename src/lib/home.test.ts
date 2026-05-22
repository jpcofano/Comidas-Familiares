import { describe, it, expect } from "vitest";
import { separarPlanes } from "./home";
import { getSemanaActual, getSemanaFin } from "./fechas";
import type { Plan } from "../types/models";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makePlan(overrides: Partial<Plan>): Plan {
  return {
    idPlan: "PLAN-X",
    semanaInicio: "2026-05-18",
    semanaFin: "2026-05-24",
    tipoSeleccion: "receta",
    tipoPlan: "Especial",
    idSeleccion: "REC-0001",
    nombreSeleccion: "Receta de prueba",
    recetaPrincipal: "Receta de prueba",
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

// ─── separarPlanes ────────────────────────────────────────────────────────────

describe("separarPlanes", () => {
  it("devuelve vacío para array vacío", () => {
    const r = separarPlanes([]);
    expect(r.especial).toBeNull();
    expect(r.extras).toHaveLength(0);
    expect(r.enProceso).toHaveLength(0);
  });

  it("identifica el plan Especial", () => {
    const especial = makePlan({ idPlan: "ESP-1", tipoPlan: "Especial" });
    const r = separarPlanes([especial]);
    expect(r.especial?.idPlan).toBe("ESP-1");
  });

  it("identifica planes En proceso", () => {
    const p1 = makePlan({ idPlan: "ENP-1", tipoPlan: "En proceso" });
    const p2 = makePlan({ idPlan: "ENP-2", tipoPlan: "En proceso" });
    const r = separarPlanes([p1, p2]);
    expect(r.especial).toBeNull();
    expect(r.enProceso).toHaveLength(2);
  });

  it("vincula extra al Especial correcto por origen", () => {
    const especial = makePlan({ idPlan: "ESP-1", tipoPlan: "Especial" });
    const extra = makePlan({
      idPlan: "EXT-1",
      tipoPlan: "Especial extra",
      origen: "extra:ESP-1",
    });
    const r = separarPlanes([especial, extra]);
    expect(r.extras).toHaveLength(1);
    expect(r.extras[0].idPlan).toBe("EXT-1");
  });

  it("no vincula extra si el origen no coincide con el Especial", () => {
    const especial = makePlan({ idPlan: "ESP-1", tipoPlan: "Especial" });
    const extraAjeno = makePlan({
      idPlan: "EXT-2",
      tipoPlan: "Especial extra",
      origen: "extra:ESP-OTRO",
    });
    const r = separarPlanes([especial, extraAjeno]);
    expect(r.extras).toHaveLength(0);
  });

  it("no incluye extras si no hay Especial", () => {
    const extraHuerfano = makePlan({
      idPlan: "EXT-1",
      tipoPlan: "Especial extra",
      origen: "extra:ESP-1",
    });
    const r = separarPlanes([extraHuerfano]);
    expect(r.especial).toBeNull();
    expect(r.extras).toHaveLength(0);
  });

  it("maneja combinación completa: Especial + extras + en proceso", () => {
    const especial = makePlan({ idPlan: "ESP-1", tipoPlan: "Especial" });
    const extra1 = makePlan({ idPlan: "EXT-1", tipoPlan: "Especial extra", origen: "extra:ESP-1" });
    const extra2 = makePlan({ idPlan: "EXT-2", tipoPlan: "Especial extra", origen: "extra:ESP-1" });
    const enp = makePlan({ idPlan: "ENP-1", tipoPlan: "En proceso" });
    const r = separarPlanes([especial, extra1, extra2, enp]);
    expect(r.especial?.idPlan).toBe("ESP-1");
    expect(r.extras).toHaveLength(2);
    expect(r.enProceso).toHaveLength(1);
  });
});

// ─── getSemanaActual / getSemanaFin ──────────────────────────────────────────

describe("getSemanaActual", () => {
  it("devuelve una fecha con formato YYYY-MM-DD", () => {
    const s = getSemanaActual();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("devuelve un lunes (día 1 de la semana local)", () => {
    const s = getSemanaActual();
    const d = new Date(s + "T12:00:00");
    expect(d.getDay()).toBe(1); // 1 = lunes
  });
});

describe("getSemanaFin", () => {
  it("devuelve el domingo 6 días después del lunes dado", () => {
    const fin = getSemanaFin("2026-05-18");
    expect(fin).toBe("2026-05-24");
  });
});
