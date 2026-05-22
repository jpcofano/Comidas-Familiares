import { describe, it, expect } from "vitest";
import { parseMenuTxt } from "./parseMenu";

// ─── Helper ───────────────────────────────────────────────────────────────────

function validTxt(overrides: Record<string, string> = {}, extraComponents = "") {
  const fields: Record<string, string> = {
    nombre: "Menú de prueba",
    escenarioUso: "Noche de a dos",
    estilo: "Italiano",
    ...overrides,
  };
  const lines = Object.keys(fields)
    .filter(k => fields[k] !== "")
    .map(k => `${k}: ${fields[k]}`)
    .join("\n");
  const comps = extraComponents || "1 | Principal | Pollo al horno | Sí |";
  return `#MENU\n${lines}\n\n#COMPONENTES\norden | tipo | receta | obligatorio | notas\n${comps}`;
}

// ─── Bloque #MENU / #COMPONENTES ─────────────────────────────────────────────

describe("estructura del TXT", () => {
  it("falla si falta #MENU", () => {
    const r = parseMenuTxt("#COMPONENTES\n1|Principal|X|Sí|");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/#MENU/);
  });

  it("falla si falta #COMPONENTES", () => {
    const r = parseMenuTxt("#MENU\nnombre: Test\nescenarioUso: Noche de a dos");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/#COMPONENTES/);
  });

  it("falla si #COMPONENTES viene antes de #MENU", () => {
    const r = parseMenuTxt("#COMPONENTES\n1|Principal|X|Sí|\n#MENU\nnombre: Test");
    expect(r.ok).toBe(false);
  });
});

// ─── Campos obligatorios ──────────────────────────────────────────────────────

describe("campos obligatorios de #MENU", () => {
  it("falla si falta 'nombre'", () => {
    const r = parseMenuTxt(validTxt({ nombre: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some(e => e.includes("nombre"))).toBe(true);
  });

  it("falla si falta 'escenarioUso'", () => {
    const r = parseMenuTxt(validTxt({ escenarioUso: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some(e => e.includes("escenarioUso"))).toBe(true);
  });

  it("falla si 'escenarioUso' tiene un valor inválido", () => {
    const r = parseMenuTxt(validTxt({ escenarioUso: "Domingo familiar" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some(e => e.includes("escenarioUso"))).toBe(true);
  });
});

// ─── Validaciones de componentes ──────────────────────────────────────────────

describe("validaciones de componentes", () => {
  it("falla si no hay componente Principal obligatorio", () => {
    const txt = validTxt({}, "1 | Entrada | Langostinos | Sí |");
    const r = parseMenuTxt(txt);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some(e => e.includes("Principal"))).toBe(true);
  });

  it("falla si el tipo del componente no está en el enum", () => {
    const txt = validTxt({}, "1 | Bebida | Vino | Sí |");
    const r = parseMenuTxt(txt);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some(e => e.includes("Bebida"))).toBe(true);
  });

  it("falla si #COMPONENTES no tiene filas válidas", () => {
    const r = parseMenuTxt("#MENU\nnombre: Test\nescenarioUso: Noche de a dos\n\n#COMPONENTES\n");
    expect(r.ok).toBe(false);
  });
});

// ─── TXT bien formado ─────────────────────────────────────────────────────────

describe("TXT bien formado", () => {
  it("parsea un menú completo correctamente", () => {
    const txt = `#MENU
nombre: Español de mar
escenarioUso: Noche de a dos
estilo: Español / mediterráneo
estado: Para probar
aptoNocheDeADos: Sí
hidratoOpcional: Arroz blanco o pan aparte
paraJuanPablo: Zarzuela sola
paraFamilia: Arroz o pan para todos
notas: Muy especial

#COMPONENTES
orden | tipo        | idReceta_o_nombre           | obligatorio | notas
1     | Entrada     | Langostinos al ajillo       | Sí          | Sin manteca
2     | Principal   | REC-0102                    | Sí          |
3     | Postre      | Frutas asadas con canela    | No          | Sin crema`;

    const r = parseMenuTxt(txt);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.menu.nombre).toBe("Español de mar");
    expect(r.menu.escenarioUso).toBe("Noche de a dos");
    expect(r.menu.estado).toBe("Para probar");
    expect(r.menu.aptoNocheDeADos).toBe("Sí");
    expect(r.menu.paraJuanPablo).toBe("Zarzuela sola");
    expect(r.menu.componentes).toHaveLength(3);

    const [e1, e2, e3] = r.menu.componentes;
    expect(e1.tipo).toBe("Entrada");
    expect(e1.idRecetaONombre).toBe("Langostinos al ajillo");
    expect(e1.obligatorio).toBe(true);
    expect(e1.notas).toBe("Sin manteca");

    expect(e2.tipo).toBe("Principal");
    expect(e2.idRecetaONombre).toBe("REC-0102");
    expect(e2.obligatorio).toBe(true);

    expect(e3.tipo).toBe("Postre");
    expect(e3.obligatorio).toBe(false);
  });

  it("detecta cross-check 'REC-XXXX / nombre' como idRecetaONombre crudo", () => {
    const txt = validTxt({}, "1 | Principal | REC-0001 / Bondiola braseada al Malbec | Sí |");
    const r = parseMenuTxt(txt);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.menu.componentes[0].idRecetaONombre).toBe("REC-0001 / Bondiola braseada al Malbec");
  });
});

// ─── Defaults ─────────────────────────────────────────────────────────────────

describe("defaults aplicados", () => {
  it("estado por defecto es 'Para probar'", () => {
    const r = parseMenuTxt(validTxt({ estado: "" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.menu.estado).toBe("Para probar");
  });

  it("obligatorio por defecto es true cuando no se especifica", () => {
    const txt = `#MENU\nnombre: Test\nescenarioUso: Noche de a dos\n\n#COMPONENTES\n1|Principal|Receta X|`;
    const r = parseMenuTxt(txt);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.menu.componentes[0].obligatorio).toBe(true);
  });

  it("nombreCanonico se deriva del nombre si no se especifica", () => {
    const r = parseMenuTxt(validTxt());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.menu.nombreCanonico).toBe("menu de prueba");
  });

  it("acepta nombreCanonico explícito si viene en el TXT", () => {
    const txt = `#MENU\nnombre: Menú de prueba\nnombreCanonico: mi-menu\nescenarioUso: Noche de a dos\n\n#COMPONENTES\n1|Principal|Receta X|Sí|`;
    const r = parseMenuTxt(txt);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.menu.nombreCanonico).toBe("mi-menu");
  });

  it("aptoNocheDeADos inválido queda como undefined", () => {
    const r = parseMenuTxt(validTxt({ aptoNocheDeADos: "Quizás" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.menu.aptoNocheDeADos).toBeUndefined();
  });
});
