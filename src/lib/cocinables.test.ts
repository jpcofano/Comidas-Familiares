import { describe, it, expect } from "vitest";
import { evaluarCocinables } from "./cocinables";
import type { Receta, Ingrediente, IngredienteEnReceta } from "../types/models";

// ─── Helpers de construcción ──────────────────────────────────────────────────

function makeIng(id: string, equivalencias?: string[]): Ingrediente {
  return {
    idIngrediente: id, canonico: id, nombrePreferido: id,
    sinonimos: [], categoria: "Despensa varios", rolNutricional: [],
    seccionGondola: "Almacen / secos", unidadesHabituales: [],
    vecesUsado: 0, ambiguo: false, origen: "seed",
    ...(equivalencias ? { equivalencias } : {}),
  } as Ingrediente;
}

function makeItem(id: string, opts: { opcional?: boolean; alternativas?: { idIngrediente: string }[] } = {}): IngredienteEnReceta {
  return { idIngrediente: id, textoOriginal: id, ...opts } as IngredienteEnReceta;
}

function makeReceta(nombre: string, ingredientes: IngredienteEnReceta[]): Receta {
  return { idReceta: nombre, nombre, nombreCanonico: nombre, ingredientes } as unknown as Receta;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("evaluarCocinables", () => {
  it("bucket ahora — tengo todos los requeridos", () => {
    const cat = new Map([["ing-a", makeIng("ing-a")], ["ing-b", makeIng("ing-b")]]);
    const receta = makeReceta("Sopa", [makeItem("ing-a"), makeItem("ing-b")]);
    const despensa = new Set(["ing-a", "ing-b"]);
    const [r] = evaluarCocinables([receta], despensa, cat);
    expect(r.bucket).toBe("ahora");
    expect(r.cocinable).toBe(true);
    expect(r.conCambio).toBe(false);
    expect(r.cobertura).toBe(1);
  });

  it("bucket cambio — falta uno pero tiene equivalencia en despensa", () => {
    const cat = new Map([
      ["ing-a", makeIng("ing-a", ["ing-eq"])],
      ["ing-eq", makeIng("ing-eq")],
    ]);
    const receta = makeReceta("Guiso", [makeItem("ing-a")]);
    const despensa = new Set(["ing-eq"]);
    const [r] = evaluarCocinables([receta], despensa, cat);
    expect(r.bucket).toBe("cambio");
    expect(r.cocinable).toBe(true);
    expect(r.sustituciones).toHaveLength(1);
    expect(r.sustituciones[0]).toEqual({ faltaId: "ing-a", conId: "ing-eq" });
  });

  it("bucket cambio — falta uno pero tiene alternativa de receta en despensa", () => {
    const cat = new Map([
      ["ing-a", makeIng("ing-a")],
      ["ing-alt", makeIng("ing-alt")],
    ]);
    const receta = makeReceta("Tarta", [makeItem("ing-a", { alternativas: [{ idIngrediente: "ing-alt" }] })]);
    const despensa = new Set(["ing-alt"]);
    const [r] = evaluarCocinables([receta], despensa, cat);
    expect(r.bucket).toBe("cambio");
    expect(r.sustituciones[0]).toEqual({ faltaId: "ing-a", conId: "ing-alt" });
  });

  it("bucket falta1 — falta exactamente un requerido sin sustituto", () => {
    const cat = new Map([["ing-a", makeIng("ing-a")], ["ing-b", makeIng("ing-b")]]);
    const receta = makeReceta("Milanesa", [makeItem("ing-a"), makeItem("ing-b")]);
    const despensa = new Set(["ing-a"]);
    const [r] = evaluarCocinables([receta], despensa, cat);
    expect(r.bucket).toBe("falta1");
    expect(r.faltan).toEqual(["ing-b"]);
  });

  it("bucket faltaN — faltan dos o más requeridos", () => {
    const cat = new Map([
      ["a", makeIng("a")], ["b", makeIng("b")], ["c", makeIng("c")],
    ]);
    const receta = makeReceta("Estofado", [makeItem("a"), makeItem("b"), makeItem("c")]);
    const despensa = new Set(["a"]);
    const [r] = evaluarCocinables([receta], despensa, cat);
    expect(r.bucket).toBe("faltaN");
    expect(r.faltan).toHaveLength(2);
  });

  it("opcionales ignorados — no bloquean ni cuentan en cobertura", () => {
    const cat = new Map([["req", makeIng("req")], ["opt", makeIng("opt")]]);
    const receta = makeReceta("Ensalada", [makeItem("req"), makeItem("opt", { opcional: true })]);
    const despensa = new Set(["req"]);
    const [r] = evaluarCocinables([receta], despensa, cat);
    expect(r.bucket).toBe("ahora");
    expect(r.requeridos).toHaveLength(1); // solo el requerido
    expect(r.cobertura).toBe(1);
  });

  it("orden: ahora < cambio < falta1 < faltaN", () => {
    const cat = new Map([
      ["a", makeIng("a", ["eq-a"])], ["eq-a", makeIng("eq-a")],
      ["b", makeIng("b")], ["c", makeIng("c")], ["d", makeIng("d")],
    ]);
    const despensa = new Set(["a", "b", "eq-a"]);
    const r3 = makeReceta("Falta1", [makeItem("a"), makeItem("c")]);        // falta1: c no está
    const r4 = makeReceta("FaltaN", [makeItem("c"), makeItem("d")]);        // faltaN: c,d no están
    const recetaAhora = makeReceta("ZAhora", [makeItem("a"), makeItem("b")]);
    const results = evaluarCocinables([r4, r3, recetaAhora], despensa, cat);
    expect(results[0].bucket).toBe("ahora");
    expect(results[1].bucket).toBe("falta1");
    expect(results[2].bucket).toBe("faltaN");
  });

  it("básicos en despensa no generan falta", () => {
    const cat = new Map([
      ["sal", makeIng("sal")],
      ["pollo", makeIng("pollo")],
    ]);
    const receta = makeReceta("Pollo salado", [makeItem("sal"), makeItem("pollo")]);
    const despensa = new Set(["sal", "pollo"]); // simula básicos pre-cargados
    const [r] = evaluarCocinables([receta], despensa, cat);
    expect(r.bucket).toBe("ahora");
  });
});
