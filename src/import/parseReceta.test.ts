import { describe, it, expect } from "vitest";
import { parseRecetaTxt } from "./parseReceta";

// ─── Helper: genera un bloque de receta mínimo y válido ───────────────────────

function bloqueReceta(
  nombre: string,
  ingredientesLineas: string,
  pasosLineas: string,
  overrides: Record<string, string> = {},
): string {
  const defaults: Record<string, string> = {
    tipoItem: "Receta principal",
    proteinaPrincipal: "Vacuna",
    escenarioUso: "Cocina rápida",
    porciones: "4",
    dificultad: "Baja",
    sinLacteos: "No",
    hidratos: "No",
    tiempoActivo: "20 min",
    tiempoTotal: "30 min",
    costoEstimado: "Bajo",
    aptoNocheDeADos: "No",
    paraJuanPablo: "Sí",
    paraFamilia: "Sí",
    fuente: "Test",
    ...overrides,
  };
  const campos = Object.entries(defaults).map(([k, v]) => `${k}: ${v}`).join("\n");
  return `#RECETA
nombre: ${nombre}
${campos}

#INGREDIENTES
seccion | ingrediente | preparacion | cantidad | unidad | opcional | notas
${ingredientesLineas}

#PASOS
nroPaso | titulo | detalle | tiempoEstimadoLabel | puntoClave | errorComun | notas
${pasosLineas}`;
}

const ING_BASE = "Principal | Pollo | | 1 | kg | No |";
const PASO_BASE = "1 | Sellar | Dorar el pollo. | 10 min | | |";

// ─── Test 1: TXT con 1 receta → array de 1 ────────────────────────────────────

describe("parseRecetaTxt — 1 receta", () => {
  it("devuelve array de 1 receta válida", () => {
    const txt = bloqueReceta("Pollo asado", ING_BASE, PASO_BASE);
    const result = parseRecetaTxt(txt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recetas).toHaveLength(1);
    expect(result.fallidas).toHaveLength(0);
    expect(result.recetas[0].nombre).toBe("Pollo asado");
    expect(result.recetas[0].pasos).toHaveLength(1);
    expect(result.recetas[0].ingredientesRaw).toHaveLength(1);
  });
});

// ─── Test 2: TXT con 3 recetas → array de 3, pasos independientes ─────────────

describe("parseRecetaTxt — 3 recetas", () => {
  it("devuelve array de 3 y numeración de pasos reinicia por receta", () => {
    const txt = [
      bloqueReceta("Receta A", ING_BASE, "1 | Paso 1A | Detalle. | 5 min | | |"),
      bloqueReceta(
        "Receta B",
        ING_BASE,
        "1 | Paso 1B | Detalle. | 5 min | | |\n2 | Paso 2B | Detalle. | 5 min | | |",
      ),
      bloqueReceta("Receta C", ING_BASE, "1 | Paso 1C | Detalle. | 5 min | | |"),
    ].join("\n\n");

    const result = parseRecetaTxt(txt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recetas).toHaveLength(3);
    expect(result.fallidas).toHaveLength(0);

    expect(result.recetas[0].pasos[0].nroPaso).toBe(1);

    expect(result.recetas[1].pasos[0].nroPaso).toBe(1);
    expect(result.recetas[1].pasos[1].nroPaso).toBe(2);

    expect(result.recetas[2].pasos[0].nroPaso).toBe(1);
  });
});

// ─── Test 3: la del medio falla → 2 válidas + 1 fallida ──────────────────────

describe("parseRecetaTxt — bloque inválido al medio", () => {
  it("saltea el bloque inválido y sigue con los demás", () => {
    const invalida = bloqueReceta(
      "Receta Inválida",
      ING_BASE,
      PASO_BASE,
      { proteinaPrincipal: "NO_EXISTE_NUNCA" }, // valor fuera del diccionario
    );
    const txt = [
      bloqueReceta("Receta OK1", ING_BASE, PASO_BASE),
      invalida,
      bloqueReceta("Receta OK2", ING_BASE, PASO_BASE),
    ].join("\n\n");

    const result = parseRecetaTxt(txt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recetas).toHaveLength(2);
    expect(result.fallidas).toHaveLength(1);
    expect(result.recetas[0].nombre).toBe("Receta OK1");
    expect(result.recetas[1].nombre).toBe("Receta OK2");
    expect(result.fallidas[0].nombre).toBe("Receta Inválida");
    expect(result.fallidas[0].errores[0]).toContain("proteinaPrincipal");
  });
});

// ─── Test 4: split de alternativas ───────────────────────────────────────────

describe("parseRecetaTxt — split de alternativas", () => {
  it("divide 'Calvados o sidra seca' en dos ingredientesRaw vinculados", () => {
    const txt = bloqueReceta(
      "Receta con alternativa",
      "Principal | Calvados o sidra seca | | 100 | ml | No |",
      PASO_BASE,
    );
    const result = parseRecetaTxt(txt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ings = result.recetas[0].ingredientesRaw;
    expect(ings).toHaveLength(2);
    expect(ings[0].textoOriginal).toBe("Calvados");
    expect(ings[1].textoOriginal).toBe("sidra seca");
    expect(ings[0].grupoAlternativa).toBeDefined();
    expect(ings[0].grupoAlternativa).toBe(ings[1].grupoAlternativa);
    expect(ings[0].opcional).toBe(true);
    expect(ings[1].opcional).toBe(true);
    // la alternativa (B) no tiene grupoAlternativa propio apuntando hacia atrás
    // (el vínculo es solo cabeza → alternativa, generado en handleGuardar)
  });

  it("preserva los otros campos (seccion, unidad) en ambas filas", () => {
    const txt = bloqueReceta(
      "Receta alt campos",
      "Utensilios | Colador fino o paño | limpio | 1 | u | No | Filtrar bien",
      PASO_BASE,
    );
    const result = parseRecetaTxt(txt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ings = result.recetas[0].ingredientesRaw;
    expect(ings).toHaveLength(2);
    expect(ings[0].textoOriginal).toBe("Colador fino");
    expect(ings[1].textoOriginal).toBe("paño");
    expect(ings[0].seccion).toBe("Utensilios");
    expect(ings[1].seccion).toBe("Utensilios");
    expect(ings[0].unidad).toBe("u");
    expect(ings[1].unidad).toBe("u");
  });
});

// ─── Test 5: ingrediente sin " o " → no se divide ────────────────────────────

describe("parseRecetaTxt — sin split", () => {
  it("no divide ingredientes que no tienen ' o '", () => {
    const txt = bloqueReceta(
      "Receta sin split",
      "Principal | Aceite de oliva | | 2 | cda | No |",
      PASO_BASE,
    );
    const result = parseRecetaTxt(txt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ings = result.recetas[0].ingredientesRaw;
    expect(ings).toHaveLength(1);
    expect(ings[0].textoOriginal).toBe("Aceite de oliva");
    expect(ings[0].grupoAlternativa).toBeUndefined();
  });
});

// ─── Test 6: anti-dup dentro de receta y NO entre recetas ────────────────────

describe("parseRecetaTxt — anti-dup", () => {
  it("colapsa ingrediente duplicado (misma unidad) dentro de una receta", () => {
    const txt = bloqueReceta(
      "Receta con sal duplicada",
      "Principal | Sal | | 1 | cdita | No |\nPrincipal | Sal | | 2 | cdita | No |",
      PASO_BASE,
    );
    const result = parseRecetaTxt(txt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recetas[0].ingredientesRaw).toHaveLength(1);
    expect(result.recetas[0].ingredientesRaw[0].textoOriginal).toBe("Sal");
  });

  it("NO colapsa el mismo ingrediente entre dos recetas distintas", () => {
    const txt = [
      bloqueReceta("Receta X", "Principal | Sal | | 1 | cdita | No |", PASO_BASE),
      bloqueReceta("Receta Y", "Principal | Sal | | 1 | cdita | No |", PASO_BASE),
    ].join("\n\n");
    const result = parseRecetaTxt(txt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recetas[0].ingredientesRaw).toHaveLength(1);
    expect(result.recetas[1].ingredientesRaw).toHaveLength(1);
    // Ambas recetas conservan su "Sal" de forma independiente
    expect(result.recetas[0].ingredientesRaw[0].textoOriginal).toBe("Sal");
    expect(result.recetas[1].ingredientesRaw[0].textoOriginal).toBe("Sal");
  });

  it("no colapsa el mismo ingrediente con distinta unidad (son ítems distintos en compras)", () => {
    const txt = bloqueReceta(
      "Receta unidades distintas",
      "Principal | Sal | | 1 | cdita | No |\nPrincipal | Sal | | | | No |",
      PASO_BASE,
    );
    const result = parseRecetaTxt(txt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // unidad "cdita" vs unidad "" son clave distintas → no se colapsa
    expect(result.recetas[0].ingredientesRaw).toHaveLength(2);
  });
});
