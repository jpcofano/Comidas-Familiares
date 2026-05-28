import { normalizeText } from "../lib/canonical";
import { parseTime, parseDificultad, parseCosto, parseSiNo, parseNumber } from "../lib/parsers";
import type {
  TipoItem, Proteina, Escenario, ClimaPlato, PensadaPara,
  AptoNocheDeADos, Dificultad, Costo,
} from "../types/models";
import {
  TIPOS_ITEM, PROTEINAS, ESCENARIOS, CLIMAS_PLATO, PENSADA_PARA, APTO_NOCHE_DE_A_DOS,
} from "../types/models";

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export interface ParsedIngredienteRaw {
  seccion: string;
  textoOriginal: string;
  preparacion?: string;
  cantidadLabel: string;
  cantidadMin: number | null;
  cantidadMax: number | null;
  unidad: string;
  opcional: boolean;
  notas: string;
  grupoAlternativa?: string; // dos filas con el mismo valor son alternativas; la primera es la "cabeza"
}

export interface ParsedPasoRaw {
  nroPaso: number;
  titulo: string;
  detalle: string;
  tiempoEstimadoLabel: string;
  tiempoEstimadoMin: number | null;
  puntoClave: string;
  errorComun: string;
  notas: string;
}

export interface ParsedReceta {
  nombre: string;
  nombreCanonico: string;
  tipoItem: TipoItem;
  proteinaPrincipal: Proteina;
  escenarioUso: Escenario;
  climaDelPlato?: ClimaPlato;
  pensadaPara: PensadaPara;
  sinLacteos: boolean;
  hidratos: boolean;
  aptoNocheDeADos: AptoNocheDeADos;
  paraJuanPablo: boolean;
  paraFamilia: boolean;
  tiempoActivoLabel: string;
  tiempoActivoMin: number | null;
  tiempoTotalLabel: string;
  tiempoTotalMin: number | null;
  dificultad: Dificultad;
  dificultadOrden: number;
  porcionesLabel: string;
  porcionesMin: number | null;
  porcionesMax: number | null;
  costoEstimado: Costo;
  costoOrden: number;
  hidratoOpcional?: string;
  notas?: string;
  fuente: string;
  ingredientesRaw: ParsedIngredienteRaw[];
  pasos: ParsedPasoRaw[];
}

export interface ParsedFallida {
  nombre: string;
  errores: string[];
}

export type ParseRecetaResult =
  | { ok: true; recetas: ParsedReceta[]; fallidas: ParsedFallida[] }
  | { ok: false; errors: string[] };

// ─── Helpers internos ─────────────────────────────────────────────────────────

function matchEnum<T extends string>(value: string, choices: readonly T[]): T | null {
  if (!value) return null;
  const norm = normalizeText(value);
  return choices.find(c => normalizeText(c) === norm) ?? null;
}

function derivarPensadaPara(tiempoTotalMin: number | null, dificultad: Dificultad | ""): PensadaPara {
  const t = tiempoTotalMin ?? 0;
  if (t > 90 || dificultad === "Alta" || dificultad === "Media-alta") return "Especial";
  if (t > 0 && t <= 45 && dificultad === "Baja") return "Semana";
  return "Cualquiera";
}

// ─── Parser de un bloque individual ──────────────────────────────────────────

function parseBloqueReceta(
  bloqueContent: string,
  bloqueIdx: number,
  grupoBaseCounter: { value: number },
): { ok: true; receta: ParsedReceta } | { ok: false; nombre: string; errores: string[] } {
  const errors: string[] = [];
  const etiqueta = `Bloque ${bloqueIdx + 1}`;

  const ingLocalIdx = bloqueContent.indexOf("#INGREDIENTES");
  const pasosLocalIdx = bloqueContent.indexOf("#PASOS");

  if (ingLocalIdx === -1) return { ok: false, nombre: etiqueta, errores: [`${etiqueta}: falta #INGREDIENTES.`] };
  if (pasosLocalIdx === -1) return { ok: false, nombre: etiqueta, errores: [`${etiqueta}: falta #PASOS.`] };
  if (pasosLocalIdx < ingLocalIdx) return { ok: false, nombre: etiqueta, errores: [`${etiqueta}: #PASOS aparece antes que #INGREDIENTES.`] };

  const recetaBlock = bloqueContent.slice(0, ingLocalIdx);
  const ingBlock = bloqueContent.slice(ingLocalIdx + "#INGREDIENTES".length, pasosLocalIdx);
  const pasosBlock = bloqueContent.slice(pasosLocalIdx + "#PASOS".length);

  // ─── Key-value del bloque #RECETA ───────────────────────────────────────

  const kv: Record<string, string> = {};
  for (const line of recetaBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (key) kv[key] = val;
  }

  const nombre = kv["nombre"] ?? "";
  const nombreDisplay = nombre || etiqueta;
  if (!nombre) errors.push(`${nombreDisplay}: falta el campo 'nombre'.`);

  const tipoItem: TipoItem = matchEnum(kv["tipoItem"] ?? "", TIPOS_ITEM) ?? "Receta principal";

  const proteinaPrincipal = matchEnum(kv["proteinaPrincipal"] ?? "", PROTEINAS);
  if (!proteinaPrincipal) {
    errors.push(`${nombreDisplay}: 'proteinaPrincipal' inválido: "${kv["proteinaPrincipal"] ?? ""}". Valores: ${PROTEINAS.join(", ")}.`);
  }

  const escenarioUso = matchEnum(kv["escenarioUso"] ?? "", ESCENARIOS);
  if (!escenarioUso) {
    errors.push(`${nombreDisplay}: 'escenarioUso' inválido: "${kv["escenarioUso"] ?? ""}". Valores: ${ESCENARIOS.join(", ")}.`);
  }

  const climaDelPlato = matchEnum(kv["climaDelPlato"] ?? "", CLIMAS_PLATO) ?? undefined;

  const difResult = parseDificultad(kv["dificultad"] ?? "");
  if (!difResult.label) {
    errors.push(`${nombreDisplay}: 'dificultad' inválido: "${kv["dificultad"] ?? ""}". Valores: Baja, Media, Media-alta, Alta.`);
  }
  const dificultad = (difResult.label || "Baja") as Dificultad;
  const dificultadOrden = difResult.orden || 1;

  const costoResult = parseCosto(kv["costoEstimado"] ?? "");
  if (!costoResult.label) {
    errors.push(`${nombreDisplay}: 'costoEstimado' inválido: "${kv["costoEstimado"] ?? ""}". Valores: Bajo, Medio, Medio/Alto, Alto.`);
  }
  const costoEstimado = (costoResult.label || "Medio") as Costo;
  const costoOrden = costoResult.orden || 2;

  const porcionesRaw = kv["porciones"] ?? "";
  const porcionesResult = parseNumber(porcionesRaw);
  const porcionesMin = porcionesResult?.min ?? porcionesResult?.value ?? null;
  const porcionesMax = porcionesResult?.max ?? porcionesResult?.value ?? null;

  const tiempoActivoRaw = kv["tiempoActivo"] ?? "";
  const tiempoActivoMin = parseTime(tiempoActivoRaw)?.value ?? null;

  const tiempoTotalRaw = kv["tiempoTotal"] ?? "";
  const tiempoTotalMin = parseTime(tiempoTotalRaw)?.value ?? null;

  const sinLacteosRaw = kv["sinLacteos"];
  const sinLacteos = sinLacteosRaw !== undefined ? (parseSiNo(sinLacteosRaw) ?? true) : true;

  const hidratosRaw = kv["hidratos"];
  const hidratos = hidratosRaw !== undefined ? (parseSiNo(hidratosRaw) ?? false) : false;

  const aptoNocheDeADos: AptoNocheDeADos = matchEnum(kv["aptoNocheDeADos"] ?? "", APTO_NOCHE_DE_A_DOS) ?? "No";

  const paraJPRaw = kv["paraJuanPablo"];
  const paraJuanPablo = paraJPRaw !== undefined ? (parseSiNo(paraJPRaw) ?? true) : true;

  const paraFamRaw = kv["paraFamilia"];
  const paraFamilia = paraFamRaw !== undefined ? (parseSiNo(paraFamRaw) ?? true) : true;

  const pensadaParaExplicita = matchEnum(kv["pensadaPara"] ?? "", PENSADA_PARA);
  const pensadaPara: PensadaPara = pensadaParaExplicita ?? derivarPensadaPara(tiempoTotalMin, difResult.label);

  const hidratoOpcional = kv["hidratoOpcional"] || undefined;
  const notas = kv["notas"] || undefined;
  const fuente = kv["fuente"] || "ChatGPT";

  // ─── Bloque #INGREDIENTES ──────────────────────────────────────────────

  const ingDataLines = ingBlock
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.toLowerCase().startsWith("seccion"));

  const ingredientesRaw: ParsedIngredienteRaw[] = [];
  for (const line of ingDataLines) {
    const cells = line.split("|").map(c => c.trim());
    if (cells.length < 5) continue;
    const [seccion, ingrediente, preparacion, cantidadStr, unidad, opcionalStr = "", notasIng = ""] = cells;
    if (!ingrediente) continue;

    const cantResult = parseNumber(cantidadStr);
    const baseProps = {
      seccion: seccion || "Principal",
      ...(preparacion ? { preparacion } : {}),
      cantidadLabel: cantidadStr,
      cantidadMin: cantResult?.min ?? cantResult?.value ?? null,
      cantidadMax: cantResult?.max ?? cantResult?.value ?? null,
      unidad: unidad || "",
      notas: notasIng,
    };

    // Split alternativas: "X o Y" → dos filas vinculadas por grupoAlternativa
    if (ingrediente.includes(" o ")) {
      const oIdx = ingrediente.indexOf(" o ");
      const partA = ingrediente.slice(0, oIdx).trim();
      const partB = ingrediente.slice(oIdx + 3).trim();
      const grupoKey = `g${grupoBaseCounter.value++}`;
      ingredientesRaw.push({ ...baseProps, textoOriginal: partA, opcional: true, grupoAlternativa: grupoKey });
      ingredientesRaw.push({ ...baseProps, textoOriginal: partB, opcional: true, grupoAlternativa: grupoKey });
    } else {
      ingredientesRaw.push({ ...baseProps, textoOriginal: ingrediente, opcional: parseSiNo(opcionalStr) === true });
    }
  }

  // Anti-dup dentro del bloque: (normalizeText(textoOriginal), unidad) — §3.5
  const seenInBlock = new Set<string>();
  const ingredientesDedupados = ingredientesRaw.filter(raw => {
    const key = `${normalizeText(raw.textoOriginal)}|${raw.unidad}`;
    if (seenInBlock.has(key)) return false;
    seenInBlock.add(key);
    return true;
  });

  if (ingredientesDedupados.length === 0 && errors.length === 0) {
    errors.push(`${nombreDisplay}: el bloque #INGREDIENTES no tiene filas válidas.`);
  }

  // ─── Bloque #PASOS ─────────────────────────────────────────────────────

  const pasosDataLines = pasosBlock
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.toLowerCase().startsWith("nropaso"));

  const pasos: ParsedPasoRaw[] = [];
  for (const line of pasosDataLines) {
    const cells = line.split("|").map(c => c.trim());
    if (cells.length < 3) continue;
    const [nroPasoStr, titulo, detalle, tiempoLabel = "", puntoClave = "", errorComun = "", notasPaso = ""] = cells;
    const nroPaso = parseInt(nroPasoStr, 10);
    if (isNaN(nroPaso) || !titulo) continue;

    pasos.push({
      nroPaso,
      titulo,
      detalle: detalle || "",
      tiempoEstimadoLabel: tiempoLabel,
      tiempoEstimadoMin: parseTime(tiempoLabel)?.value ?? null,
      puntoClave,
      errorComun,
      notas: notasPaso,
    });
  }

  if (pasos.length === 0 && errors.length === 0) {
    errors.push(`${nombreDisplay}: el bloque #PASOS no tiene filas válidas.`);
  }

  if (errors.length > 0) {
    return { ok: false, nombre: nombreDisplay, errores: errors };
  }

  return {
    ok: true,
    receta: {
      nombre,
      nombreCanonico: normalizeText(nombre),
      tipoItem,
      proteinaPrincipal: proteinaPrincipal!,
      escenarioUso: escenarioUso!,
      ...(climaDelPlato ? { climaDelPlato } : {}),
      pensadaPara,
      sinLacteos,
      hidratos,
      aptoNocheDeADos,
      paraJuanPablo,
      paraFamilia,
      tiempoActivoLabel: tiempoActivoRaw,
      tiempoActivoMin,
      tiempoTotalLabel: tiempoTotalRaw,
      tiempoTotalMin,
      dificultad,
      dificultadOrden,
      porcionesLabel: porcionesRaw,
      porcionesMin,
      porcionesMax,
      costoEstimado,
      costoOrden,
      ...(hidratoOpcional ? { hidratoOpcional } : {}),
      ...(notas ? { notas } : {}),
      fuente,
      ingredientesRaw: ingredientesDedupados,
      pasos,
    },
  };
}

// ─── Parser principal (multi-receta) ─────────────────────────────────────────

export function parseRecetaTxt(txt: string): ParseRecetaResult {
  // Normalizar saltos de línea
  const normalized = txt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Dividir por #RECETA al inicio de línea
  const segmentos = normalized.split(/^#RECETA\b/m);
  // El primer segmento es el texto anterior al primer #RECETA (vacío o preamble)
  const bloques = segmentos.slice(1).filter(s => s.trim() !== "");

  if (bloques.length === 0) {
    return { ok: false, errors: ["No se encontró ningún bloque #RECETA en el texto."] };
  }

  const recetas: ParsedReceta[] = [];
  const fallidas: ParsedFallida[] = [];
  // Contador compartido para grupoAlternativa único entre todos los bloques
  const grupoCounter = { value: 0 };

  for (let i = 0; i < bloques.length; i++) {
    const result = parseBloqueReceta(bloques[i], i, grupoCounter);
    if (result.ok) {
      recetas.push(result.receta);
    } else {
      fallidas.push({ nombre: result.nombre, errores: result.errores });
    }
  }

  return { ok: true, recetas, fallidas };
}
