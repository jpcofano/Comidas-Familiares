import { normalizeText } from "../lib/canonical";
import { parseSiNo } from "../lib/parsers";
import type {
  TipoComponente, Escenario, EstadoMenu, AptoNocheDeADos,
} from "../types/models";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ParsedComponente {
  orden: number;
  tipo: TipoComponente;
  /** Raw "REC-XXXX", "nombre" or "REC-XXXX / nombre" — resolved async by data layer */
  idRecetaONombre: string;
  obligatorio: boolean;
  notas?: string;
}

export interface ParsedMenu {
  nombre: string;
  nombreCanonico: string;
  escenarioUso: Escenario;
  estado: EstadoMenu;
  descripcion?: string;
  climaDelMenu?: string;
  idealPara?: string;
  estilo?: string;
  aptoNocheDeADos?: AptoNocheDeADos;
  hidratoOpcional?: string;
  paraJuanPablo?: string;
  paraFamilia?: string;
  riesgos?: string;
  notas?: string;
  notasOcasion?: string;
  componentes: ParsedComponente[];
}

export type ParseMenuResult =
  | { ok: true; menu: ParsedMenu }
  | { ok: false; errors: string[] };

// ─── Internal constants ───────────────────────────────────────────────────────

const TIPOS_COMPONENTE = new Set<string>(["Entrada", "Principal", "Acompañamiento", "Postre"]);
const ESCENARIOS       = new Set<string>(["Noche de a dos", "Cocina rápida", "Cena Especial", "Celebración"]);
const ESTADOS_MENU     = new Set<string>(["Para probar", "Probado", "Archivado"]);
const APTO_NOCHE       = new Set<string>(["Sí", "No", "Adaptable"]);

// ─── Pure parser ──────────────────────────────────────────────────────────────

export function parseMenuTxt(txt: string): ParseMenuResult {
  const errors: string[] = [];

  const menuIdx = txt.indexOf("#MENU");
  if (menuIdx === -1) return { ok: false, errors: ["El texto debe contener el marcador #MENU."] };

  const compIdx = txt.indexOf("#COMPONENTES");
  if (compIdx === -1) return { ok: false, errors: ["El texto debe contener el marcador #COMPONENTES."] };

  if (compIdx < menuIdx) return { ok: false, errors: ["#MENU debe aparecer antes de #COMPONENTES."] };

  const menuBlock = txt.slice(menuIdx + "#MENU".length, compIdx);
  const compBlock = txt.slice(compIdx + "#COMPONENTES".length);

  // ─── Parse #MENU key:value pairs ─────────────────────────────────────────

  const kv: Record<string, string> = {};
  for (const raw of menuBlock.split("\n")) {
    const colonIdx = raw.indexOf(":");
    if (colonIdx === -1) continue;
    const key = raw.slice(0, colonIdx).trim();
    const val = raw.slice(colonIdx + 1).trim();
    if (key) kv[key] = val;
  }

  const nombre = kv["nombre"] ?? "";
  if (!nombre) errors.push("Falta el campo 'nombre' en #MENU.");

  const escenarioRaw = kv["escenarioUso"] ?? "";
  if (!escenarioRaw) {
    errors.push("Falta el campo 'escenarioUso' en #MENU.");
  } else if (!ESCENARIOS.has(escenarioRaw)) {
    errors.push(
      `'escenarioUso' inválido: "${escenarioRaw}". Valores válidos: ${[...ESCENARIOS].join(", ")}.`
    );
  }

  const estadoRaw = kv["estado"] ?? "";
  const estado: EstadoMenu = ESTADOS_MENU.has(estadoRaw) ? estadoRaw as EstadoMenu : "Para probar";

  const aptoRaw = kv["aptoNocheDeADos"] ?? "";
  const aptoNocheDeADos = APTO_NOCHE.has(aptoRaw) ? aptoRaw as AptoNocheDeADos : undefined;

  // ─── Parse #COMPONENTES pipe-delimited table ──────────────────────────────

  const dataLines = compBlock
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.toLowerCase().startsWith("orden"));

  const componentes: ParsedComponente[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const cells = dataLines[i].split("|").map(c => c.trim());
    if (cells.length < 3) continue;

    const [ordenRaw, tipoRaw, idRecetaONombreRaw, obligatorioRaw = "Sí", notasRaw = ""] = cells;

    const orden = parseInt(ordenRaw, 10);
    if (isNaN(orden)) {
      errors.push(`Componente fila ${i + 1}: 'orden' inválido: "${ordenRaw}".`);
      continue;
    }

    if (!TIPOS_COMPONENTE.has(tipoRaw)) {
      errors.push(
        `Componente fila ${i + 1}: tipo "${tipoRaw}" inválido. Valores válidos: ${[...TIPOS_COMPONENTE].join(", ")}.`
      );
      continue;
    }

    const idRecetaONombre = idRecetaONombreRaw.trim();
    if (!idRecetaONombre) {
      errors.push(`Componente fila ${i + 1}: falta el ID o nombre de la receta.`);
      continue;
    }

    // Cross-check format: "REC-XXXX / nombre" — validated (Firestore lookup) by resolverEImportarMenu
    componentes.push({
      orden,
      tipo: tipoRaw as TipoComponente,
      idRecetaONombre,
      obligatorio: parseSiNo(obligatorioRaw) ?? true,
      ...(notasRaw ? { notas: notasRaw } : {}),
    });
  }

  if (componentes.length === 0 && errors.length === 0) {
    errors.push("El bloque #COMPONENTES no tiene filas válidas.");
  }

  const hasPrincipalObligatorio = componentes.some(c => c.tipo === "Principal" && c.obligatorio);
  if (!hasPrincipalObligatorio) {
    errors.push("Debe haber al menos un componente con tipo 'Principal' y obligatorio 'Sí'.");
  }

  if (errors.length > 0) return { ok: false, errors };

  const menu: ParsedMenu = {
    nombre,
    nombreCanonico: normalizeText(kv["nombreCanonico"] || nombre),
    escenarioUso: escenarioRaw as Escenario,
    estado,
    ...(kv["descripcion"]      ? { descripcion: kv["descripcion"] }           : {}),
    ...(kv["climaDelMenu"]     ? { climaDelMenu: kv["climaDelMenu"] }         : {}),
    ...(kv["idealPara"]        ? { idealPara: kv["idealPara"] }               : {}),
    ...(kv["estilo"]           ? { estilo: kv["estilo"] }                     : {}),
    ...(aptoNocheDeADos        ? { aptoNocheDeADos }                          : {}),
    ...(kv["hidratoOpcional"]  ? { hidratoOpcional: kv["hidratoOpcional"] }   : {}),
    ...(kv["paraJuanPablo"]    ? { paraJuanPablo: kv["paraJuanPablo"] }       : {}),
    ...(kv["paraFamilia"]      ? { paraFamilia: kv["paraFamilia"] }           : {}),
    ...(kv["riesgos"]          ? { riesgos: kv["riesgos"] }                   : {}),
    ...(kv["notas"]            ? { notas: kv["notas"] }                       : {}),
    ...(kv["notasOcasion"]     ? { notasOcasion: kv["notasOcasion"] }         : {}),
    componentes,
  };

  return { ok: true, menu };
}
