import { describe, it, expect } from "vitest";
import { filtrarRecetas, hayFiltrosActivos, FILTROS_INICIALES } from "./filtros";
import type { Receta } from "../types/models";

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeReceta(overrides: Partial<Receta>): Receta {
  return {
    idReceta: "REC-0001",
    nombre: "Receta base",
    nombreCanonico: "receta base",
    tipoItem: "Receta principal",
    proteinaPrincipal: "Vacuna",
    estilo: "Argentino",
    tecnicaPrincipal: "Braseado",
    escenarioUso: "Cena Especial",
    pensadaPara: "Especial",
    sinLacteos: false,
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

const recetaVacuna   = makeReceta({ idReceta: "REC-001", nombre: "Bondiola braseada", nombreCanonico: "bondiola braseada", tipoItem: "Receta principal", proteinaPrincipal: "Vacuna", sinLacteos: false, hidratos: true });
const recetaAves     = makeReceta({ idReceta: "REC-002", nombre: "Pollo al horno", nombreCanonico: "pollo al horno", tipoItem: "Receta principal", proteinaPrincipal: "Aves", sinLacteos: true, hidratos: false });
const recetaEntrada  = makeReceta({ idReceta: "REC-003", nombre: "Langostinos al ajillo", nombreCanonico: "langostinos al ajillo", tipoItem: "Entrada", proteinaPrincipal: "Mariscos", sinLacteos: true, hidratos: false });
const recetaPostre   = makeReceta({ idReceta: "REC-004", nombre: "Peras al Malbec", nombreCanonico: "peras al malbec", tipoItem: "Postre", proteinaPrincipal: "Vegetal", sinLacteos: true, hidratos: true, esVegetariano: true });

const RECETAS = [recetaVacuna, recetaAves, recetaEntrada, recetaPostre];

// ─── Sin filtros ──────────────────────────────────────────────────────────────

describe("filtrarRecetas — sin filtros", () => {
  it("devuelve todas las recetas cuando no hay filtros activos", () => {
    expect(filtrarRecetas(RECETAS, FILTROS_INICIALES)).toHaveLength(4);
  });
});

// ─── Filtro por tipoItem ──────────────────────────────────────────────────────

describe("filtrarRecetas — tipoItem", () => {
  it("filtra por tipo Entrada", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, tipoItem: "Entrada" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-003");
  });

  it("filtra por tipo Postre", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, tipoItem: "Postre" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-004");
  });

  it("devuelve vacío cuando no hay coincidencia", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, tipoItem: "Desayuno" });
    expect(r).toHaveLength(0);
  });
});

// ─── Filtro por proteína ──────────────────────────────────────────────────────

describe("filtrarRecetas — proteína (hoja)", () => {
  it("filtra por hoja Aves", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, proteina: "Aves" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-002");
  });

  it("filtra por hoja Mariscos", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, proteina: "Mariscos" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-003");
  });
});

describe("filtrarRecetas — proteína (grupo)", () => {
  it("filtra por grupo Carnes rojas incluye Vacuna", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, proteina: "Carnes rojas" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-001");
  });

  it("filtra por grupo Aves incluye Aves", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, proteina: "Aves" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-002");
  });

  it("filtra por grupo Vegetales incluye Vegetal", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, proteina: "Vegetales" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-004");
  });
});

describe("filtrarRecetas — dieta (esVegetariano, esKeto)", () => {
  it("filtra por esVegetariano", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, esVegetariano: true });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-004");
  });

  it("esKeto no filtra nada si ninguna receta tiene esKeto", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, esKeto: true });
    expect(r).toHaveLength(0);
  });
});

// ─── Filtros booleanos ────────────────────────────────────────────────────────

describe("filtrarRecetas — sinLacteos", () => {
  it("filtra recetas sin lácteos", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, sinLacteos: true });
    expect(r.every(x => x.sinLacteos)).toBe(true);
    expect(r).toHaveLength(3);
  });
});

describe("filtrarRecetas — sinHidratos", () => {
  it("filtra recetas sin hidratos (hidratos === false)", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, sinHidratos: true });
    expect(r.every(x => !x.hidratos)).toBe(true);
    expect(r).toHaveLength(2);
  });
});

// ─── Búsqueda por texto ───────────────────────────────────────────────────────

describe("filtrarRecetas — búsqueda", () => {
  it("busca ignorando mayúsculas", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, busqueda: "POLLO" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-002");
  });

  it("busca ignorando tildes", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, busqueda: "Peras al Malbec" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-004");
  });

  it("coincidencia parcial dentro del nombre", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, busqueda: "ajillo" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-003");
  });

  it("busqueda sin resultados", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, busqueda: "xyz no existe" });
    expect(r).toHaveLength(0);
  });
});

// ─── Filtros combinados (AND) ─────────────────────────────────────────────────

describe("filtrarRecetas — combinados", () => {
  it("tipoItem + proteína combinados", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, tipoItem: "Receta principal", proteina: "Aves" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-002");
  });

  it("sinLacteos + sinHidratos combinados", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, sinLacteos: true, sinHidratos: true });
    expect(r.every(x => x.sinLacteos && !x.hidratos)).toBe(true);
    expect(r).toHaveLength(2);
  });

  it("búsqueda + filtro booleano combinados", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, busqueda: "langostinos", sinLacteos: true });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-003");
  });

  it("filtro que no coincide anula el resultado aunque la búsqueda coincida", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, busqueda: "bondiola", sinLacteos: true });
    expect(r).toHaveLength(0);
  });
});

// ─── hayFiltrosActivos ────────────────────────────────────────────────────────

describe("hayFiltrosActivos", () => {
  it("false para FILTROS_INICIALES", () => {
    expect(hayFiltrosActivos(FILTROS_INICIALES)).toBe(false);
  });

  it("true si tipoItem tiene valor", () => {
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, tipoItem: "Entrada" })).toBe(true);
  });

  it("true si sinLacteos es true", () => {
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, sinLacteos: true })).toBe(true);
  });

  it("true si busqueda no está vacía", () => {
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, busqueda: "algo" })).toBe(true);
  });

  it("true si maxNetos tiene valor", () => {
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, maxNetos: 20 })).toBe(true);
  });
});

// ─── Filtro por cocina ────────────────────────────────────────────────────────

describe("filtrarRecetas — cocina", () => {
  const recetaJaponesa = makeReceta({ idReceta: "REC-010", nombre: "Sopa de miso", nombreCanonico: "sopa de miso", estilo: "Japonesa" });
  const recetaFrancesa = makeReceta({ idReceta: "REC-011", nombre: "Coq au vin", nombreCanonico: "coq au vin", estilo: "Francesa" });
  const recetaConEnum  = makeReceta({ idReceta: "REC-012", nombre: "Asado", nombreCanonico: "asado", estilo: "Parrilla", cocina: "Argentina" });

  it("filtra por estilo cuando cocina enum está vacío", () => {
    const r = filtrarRecetas([recetaJaponesa, recetaFrancesa], { ...FILTROS_INICIALES, cocina: "Japonesa" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-010");
  });

  it("filtra por cocina enum cuando el estilo no coincide", () => {
    const r = filtrarRecetas([recetaConEnum, recetaFrancesa], { ...FILTROS_INICIALES, cocina: "Argentina" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-012");
  });

  it("sin filtro de cocina devuelve todas", () => {
    const r = filtrarRecetas([recetaJaponesa, recetaFrancesa, recetaConEnum], FILTROS_INICIALES);
    expect(r).toHaveLength(3);
  });

  it("filtra por cocina backfilleada aunque el estilo sea descriptivo", () => {
    const r = makeReceta({ idReceta: "REC-020", estilo: "Steakhouse", cocina: "Argentina" });
    expect(filtrarRecetas([r], { ...FILTROS_INICIALES, cocina: "Argentina" })).toHaveLength(1);
  });

  it("receta con estilo descriptivo y sin cocina no matchea ninguna opción del enum", () => {
    const r = makeReceta({ idReceta: "REC-021", estilo: "Steakhouse" });
    expect(filtrarRecetas([r], { ...FILTROS_INICIALES, cocina: "Argentina" })).toHaveLength(0);
  });
});

// ─── filtrarRecetas — maxNetos ────────────────────────────────────────────────

describe("filtrarRecetas — maxNetos", () => {
  const macros = new Map([
    ["REC-001", { netos: 8, cobertura: 0.9 }],   // bajo umbral
    ["REC-002", { netos: 25, cobertura: 0.8 }],  // sobre umbral
    ["REC-003", { netos: 5, cobertura: 0 }],     // cobertura 0 → sin datos
    // REC-004 no tiene entrada → ausente del mapa
  ]);

  it("sin maxNetos devuelve todas las recetas sin importar el mapa", () => {
    const r = filtrarRecetas(RECETAS, FILTROS_INICIALES, macros);
    expect(r).toHaveLength(4);
  });

  it("con maxNetos=10 solo pasa la receta con netos ≤ 10 y cobertura > 0", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, maxNetos: 10 }, macros);
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-001");
  });

  it("receta con netos > maxNetos no matchea", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, maxNetos: 10 }, macros);
    expect(r.find(x => x.idReceta === "REC-002")).toBeUndefined();
  });

  it("receta con cobertura 0 no matchea aunque netos sea bajo", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, maxNetos: 10 }, macros);
    expect(r.find(x => x.idReceta === "REC-003")).toBeUndefined();
  });

  it("receta sin entrada en el mapa no matchea", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, maxNetos: 10 }, macros);
    expect(r.find(x => x.idReceta === "REC-004")).toBeUndefined();
  });

  it("con maxNetos=30 pasan recetas con netos ≤ 30 y cobertura > 0", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, maxNetos: 30 }, macros);
    expect(r.map(x => x.idReceta)).toEqual(expect.arrayContaining(["REC-001", "REC-002"]));
    expect(r).toHaveLength(2);
  });

  it("con maxNetos activo pero mapa vacío no matchea nada", () => {
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, maxNetos: 20 }, new Map());
    expect(r).toHaveLength(0);
  });

  it("maxNetos se combina con otros filtros (sinLacteos)", () => {
    // REC-001 tiene sinLacteos: false — no pasa el filtro booleano
    const r = filtrarRecetas(RECETAS, { ...FILTROS_INICIALES, maxNetos: 10, sinLacteos: true }, macros);
    expect(r).toHaveLength(0);
  });
});

// ─── Filtro sinGluten (Sin TACC) ──────────────────────────────────────────────

describe("filtrarRecetas — sinGluten", () => {
  const sinTacc  = makeReceta({ idReceta: "REC-030", sinGluten: true });
  const conTacc  = makeReceta({ idReceta: "REC-031", sinGluten: false });
  const sinCampo = makeReceta({ idReceta: "REC-032" }); // sinGluten ausente → false

  it("sinGluten:true solo devuelve recetas con sinGluten=true", () => {
    const r = filtrarRecetas([sinTacc, conTacc, sinCampo], { ...FILTROS_INICIALES, sinGluten: true });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-030");
  });

  it("sinGluten:false (filtro desactivado) devuelve todas", () => {
    const r = filtrarRecetas([sinTacc, conTacc, sinCampo], FILTROS_INICIALES);
    expect(r).toHaveLength(3);
  });

  it("receta con sinGluten ausente no pasa el filtro sinGluten", () => {
    const r = filtrarRecetas([sinCampo], { ...FILTROS_INICIALES, sinGluten: true });
    expect(r).toHaveLength(0);
  });

  it("hayFiltrosActivos es true cuando sinGluten está activo", () => {
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, sinGluten: true })).toBe(true);
  });
});

// ─── Filtro tecnica ───────────────────────────────────────────────────────────

describe("filtrarRecetas — tecnica", () => {
  const alHorno    = makeReceta({ idReceta: "REC-040", tecnica: "Horno" });
  const aLaPlancha = makeReceta({ idReceta: "REC-041", tecnica: "Parrilla / Plancha" });
  const sinTecnica = makeReceta({ idReceta: "REC-042" }); // tecnica ausente

  it("filtra por técnica Horno", () => {
    const r = filtrarRecetas([alHorno, aLaPlancha, sinTecnica], { ...FILTROS_INICIALES, tecnica: "Horno" });
    expect(r).toHaveLength(1);
    expect(r[0].idReceta).toBe("REC-040");
  });

  it("receta sin campo tecnica no matchea ninguna técnica", () => {
    const r = filtrarRecetas([sinTecnica], { ...FILTROS_INICIALES, tecnica: "Horno" });
    expect(r).toHaveLength(0);
  });

  it("sin filtro de tecnica devuelve todas", () => {
    const r = filtrarRecetas([alHorno, aLaPlancha, sinTecnica], FILTROS_INICIALES);
    expect(r).toHaveLength(3);
  });

  it("hayFiltrosActivos es true cuando tecnica tiene valor", () => {
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, tecnica: "Horno" })).toBe(true);
  });
});
