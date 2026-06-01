/**
 * Helper puro para calcular macros por porción de una receta.
 * No hace fetches — recibe el catálogo ya cargado (testeable sin Firebase).
 *
 * Resolución: ing.idIngrediente → catalogoById.get(id) (mismo patrón que compras.ts).
 * Se ignoran: opcionales, sin doc en catálogo, sin macros, sin conversión a gramos.
 */

import { aGramos } from "./conversiones";
import type { Receta, Ingrediente } from "../types/models";

export interface MacrosReceta {
  porTotal: MacroSet;
  porPorcion: MacroSet;
  hidratosNetosPorPorcion: number;  // max(0, carbohidratos - fibra) por porción
  porciones: number;                 // porcionesMin usado
  cobertura: number;                 // 0..1
  ingredientesSinDatos: string[];    // textoOriginal de los que no se pudieron computar
}

interface MacroSet {
  kcal: number;
  carbohidratos: number;
  proteinas: number;
  grasas: number;
  fibra: number;
}

const CERO: MacroSet = { kcal: 0, carbohidratos: 0, proteinas: 0, grasas: 0, fibra: 0 };

function addMacros(a: MacroSet, b: MacroSet): MacroSet {
  return {
    kcal:          a.kcal          + b.kcal,
    carbohidratos: a.carbohidratos + b.carbohidratos,
    proteinas:     a.proteinas     + b.proteinas,
    grasas:        a.grasas        + b.grasas,
    fibra:         a.fibra         + b.fibra,
  };
}

function scaleMacros(m: MacroSet, factor: number): MacroSet {
  return {
    kcal:          m.kcal          * factor,
    carbohidratos: m.carbohidratos * factor,
    proteinas:     m.proteinas     * factor,
    grasas:        m.grasas        * factor,
    fibra:         m.fibra         * factor,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function macrosDeReceta(
  receta: Receta,
  catalogoById: Map<string, Ingrediente>,
): MacrosReceta {
  const porciones = receta.porcionesMin ?? 4;
  let total: MacroSet = { ...CERO };
  const sinDatos: string[] = [];
  let conDatos = 0;

  for (const ing of receta.ingredientes) {
    if (ing.opcional) continue;

    const cat = catalogoById.get(ing.idIngrediente);
    if (!cat || !cat.macros) {
      sinDatos.push(ing.textoOriginal);
      continue;
    }

    // Cantidad media usada
    const cantidad = ing.cantidadMin != null && ing.cantidadMax != null
      ? (ing.cantidadMin + ing.cantidadMax) / 2
      : (ing.cantidadMin ?? 0);

    const gramos = aGramos(cantidad, ing.unidad ?? null, cat);
    if (gramos === null || gramos === 0) {
      sinDatos.push(ing.textoOriginal);
      continue;
    }

    const factor = gramos / 100;
    total = addMacros(total, scaleMacros(cat.macros as MacroSet, factor));
    conDatos++;
  }

  const porPorcion = scaleMacros(total, 1 / porciones);
  const hidratosNetosPorPorcion = Math.max(0, porPorcion.carbohidratos - porPorcion.fibra);

  const denominador = conDatos + sinDatos.length;
  const cobertura = denominador > 0 ? conDatos / denominador : 0;

  // Redondear a 2 decimales para presentación
  const roundSet = (m: MacroSet): MacroSet => ({
    kcal:          round2(m.kcal),
    carbohidratos: round2(m.carbohidratos),
    proteinas:     round2(m.proteinas),
    grasas:        round2(m.grasas),
    fibra:         round2(m.fibra),
  });

  return {
    porTotal:                roundSet(total),
    porPorcion:              roundSet(porPorcion),
    hidratosNetosPorPorcion: round2(hidratosNetosPorPorcion),
    porciones,
    cobertura,
    ingredientesSinDatos: sinDatos,
  };
}
