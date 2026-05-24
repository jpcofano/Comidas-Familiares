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

export type ParseRecetaResult =
  | { ok: true; receta: ParsedReceta }
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

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseRecetaTxt(txt: string): ParseRecetaResult {
  const errors: string[] = [];

  const recetaIdx = txt.indexOf("#RECETA");
  const ingIdx = txt.indexOf("#INGREDIENTES");
  const pasosIdx = txt.indexOf("#PASOS");

  if (recetaIdx === -1) return { ok: false, errors: ["Falta el marcador #RECETA."] };
  if (ingIdx === -1) return { ok: false, errors: ["Falta el marcador #INGREDIENTES."] };
  if (pasosIdx === -1) return { ok: false, errors: ["Falta el marcador #PASOS."] };

  const recetaBlock = txt.slice(recetaIdx + "#RECETA".length, ingIdx);
  const ingBlock = txt.slice(ingIdx + "#INGREDIENTES".length, pasosIdx);
  const pasosBlock = txt.slice(pasosIdx + "#PASOS".length);

  // ─── Key-value del bloque #RECETA ─────────────────────────────────────────

  const kv: Record<string, string> = {};
  for (const line of recetaBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (key) kv[key] = val;
  }

  const nombre = kv["nombre"] ?? "";
  if (!nombre) errors.push("Falta el campo 'nombre'.");

  const tipoItem: TipoItem = matchEnum(kv["tipoItem"] ?? "", TIPOS_ITEM) ?? "Receta principal";

  const proteinaPrincipal = matchEnum(kv["proteinaPrincipal"] ?? "", PROTEINAS);
  if (!proteinaPrincipal) {
    errors.push(`Campo 'proteinaPrincipal' inválido: "${kv["proteinaPrincipal"] ?? ""}". Valores: ${PROTEINAS.join(", ")}.`);
  }

  const escenarioUso = matchEnum(kv["escenarioUso"] ?? "", ESCENARIOS);
  if (!escenarioUso) {
    errors.push(`Campo 'escenarioUso' inválido: "${kv["escenarioUso"] ?? ""}". Valores: ${ESCENARIOS.join(", ")}.`);
  }

  const climaDelPlato = matchEnum(kv["climaDelPlato"] ?? "", CLIMAS_PLATO) ?? undefined;

  const difResult = parseDificultad(kv["dificultad"] ?? "");
  if (!difResult.label) {
    errors.push(`Campo 'dificultad' inválido: "${kv["dificultad"] ?? ""}". Valores: Baja, Media, Media-alta, Alta.`);
  }
  const dificultad = (difResult.label || "Baja") as Dificultad;
  const dificultadOrden = difResult.orden || 1;

  const costoResult = parseCosto(kv["costoEstimado"] ?? "");
  if (!costoResult.label) {
    errors.push(`Campo 'costoEstimado' inválido: "${kv["costoEstimado"] ?? ""}". Valores: Bajo, Medio, Medio/Alto, Alto.`);
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

  // ─── Bloque #INGREDIENTES ─────────────────────────────────────────────────

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
    ingredientesRaw.push({
      seccion: seccion || "Principal",
      textoOriginal: ingrediente,
      ...(preparacion ? { preparacion } : {}),
      cantidadLabel: cantidadStr,
      cantidadMin: cantResult?.min ?? cantResult?.value ?? null,
      cantidadMax: cantResult?.max ?? cantResult?.value ?? null,
      unidad: unidad || "",
      opcional: parseSiNo(opcionalStr) === true,
      notas: notasIng,
    });
  }

  if (ingredientesRaw.length === 0 && errors.length === 0) {
    errors.push("El bloque #INGREDIENTES no tiene filas válidas.");
  }

  // ─── Bloque #PASOS ────────────────────────────────────────────────────────

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
    errors.push("El bloque #PASOS no tiene filas válidas.");
  }

  if (errors.length > 0) return { ok: false, errors };

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
      ingredientesRaw,
      pasos,
    },
  };
}
