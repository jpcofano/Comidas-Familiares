import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { parseRecetaTxt, type ParsedReceta, type ParsedIngredienteRaw, type ParsedFallida } from "../import/parseReceta";
import { matchIngrediente, type ResultadoMatch } from "../lib/matcherIngredientes";
import {
  getCatalogo, crearIngrediente, buildNuevoIngredienteDoc, agregarSinonimo,
  invalidateCatalogCache, proximoIdIngrediente,
} from "../data/ingredientes";
import { proximoIdReceta, crearReceta, buscarRecetasPorNombre } from "../data/recetas";
import { getPromptLLM } from "../data/config";
import { normalizeText } from "../lib/canonical";
import { normalizarUnidad, pluralizarUnidad } from "../lib/unidades";
import type { IngredienteEnReceta } from "../types/models";

// ─── Tipos locales ────────────────────────────────────────────────────────────

type DecisionIngrediente =
  | { tipo: "exacto"; idIngrediente: string; nombrePreferido: string }
  | { tipo: "sugerencia"; idIngrediente: string; nombrePreferido: string }
  | { tipo: "nuevo"; nombre: string; categoria: string };

interface FilaIngrediente {
  raw: ParsedIngredienteRaw;
  match: ResultadoMatch;
  decision: DecisionIngrediente;
}

type GuardadoState =
  | { fase: "guardando"; progreso: number; total: number }
  | { fase: "exito"; creadas: Array<{ idReceta: string; nombre: string }>; duplicadas: Array<{ nombre: string; razon: string }>; fallidas: Array<{ nombre: string; errores: string[] }> }
  | { fase: "error"; mensaje: string };

// ─── Placeholder ──────────────────────────────────────────────────────────────

const PLACEHOLDER = `#RECETA
nombre: Pollo al curry rojo
tipoItem: Receta principal
proteinaPrincipal: Pollo
escenarioUso: Cocina rápida
porciones: 4
dificultad: Baja
sinLacteos: No
hidratos: No
tiempoActivo: 20 min
tiempoTotal: 45 min
costoEstimado: Bajo
aptoNocheDeADos: Adaptable
paraJuanPablo: Sí
paraFamilia: Sí
climaDelPlato: Medio
pensadaPara: Semana
hidratoOpcional: Arroz basmati
notas: Ajustar picante al gusto.
fuente: ChatGPT

#INGREDIENTES
seccion | ingrediente | preparacion | cantidad | unidad | opcional | notas
Principal | Muslos de pollo | sin piel | 800 | g | No |
Principal | Leche de coco | | 400 | ml | No |
Base de sabor | Cebolla | picada | 1 | u | No |
Condimentos | Curry rojo en pasta | | 2 | cda | No | Maesri o similar

#PASOS
nroPaso | titulo | detalle | tiempoEstimadoLabel | puntoClave | errorComun | notas
1 | Saltear aromáticos | Dorar la cebolla en aceite a fuego medio hasta transparente, agregar el curry. | 5 min | La pasta de curry debe fraguar en el aceite antes de agregar el pollo. | No saltear el curry suficiente y que quede crudo. |
2 | Sellar el pollo | Agregar los muslos y sellar 3 min por lado. | 6 min | Secar el pollo antes para que se selle, no hierva. | |
3 | Cocción con coco | Agregar la leche de coco, tapar y cocinar 25 min a fuego suave. | 25 min | | | Si la salsa queda muy líquida, destapé los últimos 5 min.`;

// ─── Estilos inline reutilizables ─────────────────────────────────────────────

const badge = (color: string, bg: string) => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "0.7rem",
  fontWeight: 600,
  color,
  background: bg,
  whiteSpace: "nowrap" as const,
});

const BADGE_EXACTO  = badge("#1b5e20", "#e8f5e9");
const BADGE_SUGER   = badge("#6d4c00", "#fff8e1");
const BADGE_NUEVO   = badge("#424242", "#eeeeee");

// ─── Componente principal ─────────────────────────────────────────────────────

export function ImportarRecetaRoute() {
  const { state } = useAuth();

  const [txt, setTxt]                           = useState("");
  const [paso, setPaso]                         = useState<1 | 2 | 3>(1);
  const [parseErrors, setParseErrors]           = useState<string[]>([]);
  const [recetasParsed, setRecetasParsed]       = useState<ParsedReceta[]>([]);
  const [fallidasParseo, setFallidasParseo]     = useState<ParsedFallida[]>([]);
  const [filas, setFilas]                       = useState<FilaIngrediente[]>([]);
  const [categorias, setCategorias]             = useState<string[]>([]);
  const [cargandoCat, setCargandoCat]           = useState(false);
  const [guardado, setGuardado]                 = useState<GuardadoState | null>(null);
  const [promptLLM, setPromptLLM]               = useState("");
  const [copiado, setCopiado]                   = useState(false);
  const [archivoNombre, setArchivoNombre]       = useState<string | null>(null);

  useEffect(() => {
    getPromptLLM().then(setPromptLLM);
  }, []);

  if (state.status !== "authenticated" || state.user.memberId !== "juanpablo") {
    return <Navigate to="/biblioteca" replace />;
  }

  async function handleCopiarPrompt() {
    if (!promptLLM) return;
    await navigator.clipboard.writeText(promptLLM);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  // ─── Paso 1 → 2: parsear TXT + cargar catálogo ──────────────────────────

  async function handleParsear() {
    setParseErrors([]);
    const result = parseRecetaTxt(txt);

    if (!result.ok) {
      setParseErrors(result.errors);
      return;
    }

    const { recetas, fallidas } = result;

    if (recetas.length === 0) {
      const msgs = ["No se encontraron recetas válidas en el texto."];
      for (const f of fallidas) {
        msgs.push(`${f.nombre}: ${f.errores.join("; ")}`);
      }
      setParseErrors(msgs);
      return;
    }

    setCargandoCat(true);
    try {
      const catalogo = await getCatalogo();
      const cats = [...new Set([...catalogo.values()].map(i => i.categoria).filter(Boolean))].sort();
      setCategorias(cats);

      // Matcheo deduplicado: un mismo ingrediente (por canon) se resuelve UNA vez
      const filasMap = new Map<string, FilaIngrediente>();
      for (const receta of recetas) {
        for (const raw of receta.ingredientesRaw) {
          const canonKey = normalizeText(raw.textoOriginal);
          if (filasMap.has(canonKey)) continue;
          const match = matchIngrediente(raw.textoOriginal, catalogo);
          let decision: DecisionIngrediente;
          if (match.tipo === "exacto") {
            decision = { tipo: "exacto", idIngrediente: match.ingrediente.idIngrediente, nombrePreferido: match.ingrediente.nombrePreferido };
          } else if (match.tipo === "sugerencias") {
            const best = match.sugerencias[0].ingrediente;
            decision = { tipo: "sugerencia", idIngrediente: best.idIngrediente, nombrePreferido: best.nombrePreferido };
          } else {
            decision = { tipo: "nuevo", nombre: raw.textoOriginal, categoria: "Despensa varios" };
          }
          filasMap.set(canonKey, { raw, match, decision });
        }
      }

      setRecetasParsed(recetas);
      setFallidasParseo(fallidas);
      setFilas([...filasMap.values()]);
      setPaso(2);
    } finally {
      setCargandoCat(false);
    }
  }

  function updateDecision(idx: number, decision: DecisionIngrediente) {
    setFilas(prev => prev.map((f, i) => i === idx ? { ...f, decision } : f));
  }

  // ─── Paso 2 → 3: guardar todas las recetas ──────────────────────────────

  async function handleGuardar() {
    if (recetasParsed.length === 0) return;
    setPaso(3);
    setGuardado({ fase: "guardando", progreso: 0, total: recetasParsed.length });

    const creadas: Array<{ idReceta: string; nombre: string }> = [];
    const duplicadas: Array<{ nombre: string; razon: string }> = [];
    const fallidasGuardado: Array<{ nombre: string; errores: string[] }> = [];

    try {
      invalidateCatalogCache();

      // ── 1. Operaciones de ingredientes (una vez, deduplicadas) ──────────

      // canon → idIngrediente resuelto
      const resolvedIds = new Map<string, string>();

      // Sinónimos para sugerencias elegidas
      for (const fila of filas) {
        if (fila.decision.tipo === "sugerencia") {
          const r = await agregarSinonimo(fila.decision.idIngrediente, normalizeText(fila.raw.textoOriginal));
          if (!r.ok) { setGuardado({ fase: "error", mensaje: r.error.message }); return; }
        }
        if (fila.decision.tipo !== "nuevo") {
          resolvedIds.set(normalizeText(fila.raw.textoOriginal), fila.decision.idIngrediente);
        }
      }

      // Crear ingredientes nuevos
      for (const fila of filas) {
        if (fila.decision.tipo !== "nuevo") continue;
        const canonKey = normalizeText(fila.raw.textoOriginal);
        const id = await proximoIdIngrediente();
        const canon = normalizeText(fila.decision.nombre);
        const texNorm = normalizeText(fila.raw.textoOriginal);
        const r = await crearIngrediente(buildNuevoIngredienteDoc({
          id,
          nombre: fila.decision.nombre,
          canon,
          texNorm,
          categoria: fila.decision.categoria,
          unidadNorm: normalizarUnidad(fila.raw.unidad),
        }));
        if (!r.ok) { setGuardado({ fase: "error", mensaje: r.error.message }); return; }
        resolvedIds.set(canonKey, id);
      }

      // ── 2. Crear recetas una por una ─────────────────────────────────────

      for (let ri = 0; ri < recetasParsed.length; ri++) {
        const receta = recetasParsed[ri];
        setGuardado({ fase: "guardando", progreso: ri, total: recetasParsed.length });

        // Mapa de grupos de alternativas para esta receta
        const altGroups = new Map<string, ParsedIngredienteRaw[]>();
        for (const raw of receta.ingredientesRaw) {
          if (raw.grupoAlternativa) {
            const arr = altGroups.get(raw.grupoAlternativa) ?? [];
            arr.push(raw);
            altGroups.set(raw.grupoAlternativa, arr);
          }
        }

        // Construir ingredientes resueltos con anti-dup y vínculo alternativas
        const seenDedup = new Set<string>();
        const ingredientes: IngredienteEnReceta[] = [];

        for (const raw of receta.ingredientesRaw) {
          const canonKey = normalizeText(raw.textoOriginal);
          const idIngrediente = resolvedIds.get(canonKey);
          if (!idIngrediente) continue;

          const unidadNorm = normalizarUnidad(raw.unidad);
          const dedupKey = `${idIngrediente}|${unidadNorm ?? ""}`;
          if (seenDedup.has(dedupKey)) continue;
          seenDedup.add(dedupKey);

          // Alternativas: vínculo unidireccional cabeza → alternativa
          let alternativas: Array<{ idIngrediente: string }> | undefined;
          if (raw.grupoAlternativa) {
            const group = altGroups.get(raw.grupoAlternativa)!;
            if (group[0] === raw && group[1]) {
              const idB = resolvedIds.get(normalizeText(group[1].textoOriginal));
              if (idB) alternativas = [{ idIngrediente: idB }];
            }
          }

          ingredientes.push({
            idIngrediente,
            textoOriginal: raw.textoOriginal,
            ...(raw.preparacion ? { preparacion: raw.preparacion } : {}),
            seccion: raw.seccion,
            cantidadLabel: raw.cantidadLabel,
            cantidad: raw.cantidadMin ?? undefined,
            cantidadMin: raw.cantidadMin ?? undefined,
            cantidadMax: raw.cantidadMax ?? undefined,
            ...(unidadNorm != null ? { unidad: unidadNorm } : {}),
            opcional: raw.opcional,
            ...(raw.notas ? { notas: raw.notas } : {}),
            ...(alternativas ? { alternativas } : {}),
          });
        }

        // Construir pasos
        const pasos = receta.pasos.map(p => ({
          nroPaso: p.nroPaso,
          titulo: p.titulo,
          detalle: p.detalle,
          tiempoEstimadoLabel: p.tiempoEstimadoLabel,
          tiempoEstimadoMin: p.tiempoEstimadoMin,
          ...(p.puntoClave ? { puntoClave: p.puntoClave } : {}),
          ...(p.errorComun ? { errorComun: p.errorComun } : {}),
          ...(p.notas ? { notas: p.notas } : {}),
        }));

        // Anti-dup por nombreCanonico antes de crear
        const existing = await buscarRecetasPorNombre(receta.nombre);
        if (existing.length > 0) {
          duplicadas.push({ nombre: receta.nombre, razon: `Ya existe "${existing[0].nombre}" (${existing[0].idReceta}).` });
          setGuardado({ fase: "guardando", progreso: ri + 1, total: recetasParsed.length });
          continue;
        }

        const idReceta = await proximoIdReceta();
        const r = await crearReceta({
          idReceta,
          nombre: receta.nombre,
          nombreCanonico: receta.nombreCanonico,
          tipoItem: receta.tipoItem,
          proteinaPrincipal: receta.proteinaPrincipal,
          estilo: "",
          tecnicaPrincipal: "",
          escenarioUso: receta.escenarioUso,
          ...(receta.climaDelPlato ? { climaDelPlato: receta.climaDelPlato } : {}),
          pensadaPara: receta.pensadaPara,
          sinLacteos: receta.sinLacteos,
          hidratos: receta.hidratos,
          aptoNocheDeADos: receta.aptoNocheDeADos,
          paraJuanPablo: receta.paraJuanPablo,
          paraFamilia: receta.paraFamilia,
          tiempoActivoLabel: receta.tiempoActivoLabel,
          tiempoActivoMin: receta.tiempoActivoMin,
          tiempoTotalLabel: receta.tiempoTotalLabel,
          tiempoTotalMin: receta.tiempoTotalMin,
          dificultad: receta.dificultad,
          dificultadOrden: receta.dificultadOrden,
          porcionesLabel: receta.porcionesLabel,
          porcionesMin: receta.porcionesMin,
          porcionesMax: receta.porcionesMax,
          costoEstimado: receta.costoEstimado,
          costoOrden: receta.costoOrden,
          ...(receta.hidratoOpcional ? { hidratoOpcional: receta.hidratoOpcional } : {}),
          ...(receta.notas ? { notas: receta.notas } : {}),
          fuente: receta.fuente,
          ingredientes,
          pasos,
        } as Parameters<typeof crearReceta>[0]);

        if (!r.ok) {
          if (r.error.code === "recipe-already-exists") {
            duplicadas.push({ nombre: receta.nombre, razon: r.error.message });
          } else {
            fallidasGuardado.push({ nombre: receta.nombre, errores: [r.error.message] });
          }
        } else {
          creadas.push({ idReceta, nombre: receta.nombre });
        }

        setGuardado({ fase: "guardando", progreso: ri + 1, total: recetasParsed.length });
      }

      setGuardado({
        fase: "exito",
        creadas,
        duplicadas,
        fallidas: [
          ...fallidasParseo.map(f => ({ nombre: f.nombre, errores: f.errores })),
          ...fallidasGuardado,
        ],
      });
    } catch {
      setGuardado({ fase: "error", mensaje: "Error inesperado al guardar." });
    }
  }

  function resetAll() {
    setTxt(""); setParseErrors([]); setRecetasParsed([]); setFallidasParseo([]);
    setFilas([]); setGuardado(null); setPaso(1); setArchivoNombre(null);
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <Link to="/" style={{ fontSize: "0.875rem", color: "var(--color-primary)" }}>← Inicio</Link>
        <h2 style={{ margin: 0 }}>Importar receta</h2>
        <span style={{ fontSize: "0.75rem", color: "#888", marginLeft: "auto" }}>Paso {paso} de 3</span>
      </div>

      {paso === 1 && (
        <RenderPaso1
          txt={txt}
          onTxtChange={v => { setTxt(v); if (!v) setArchivoNombre(null); }}
          onParsear={handleParsear}
          parseErrors={parseErrors}
          cargando={cargandoCat}
          tienePrompt={!!promptLLM}
          copiado={copiado}
          onCopiarPrompt={handleCopiarPrompt}
          archivoNombre={archivoNombre}
          onArchivoNombre={setArchivoNombre}
        />
      )}

      {paso === 2 && recetasParsed.length > 0 && (
        <RenderPaso2
          recetas={recetasParsed}
          fallidasParseo={fallidasParseo}
          filas={filas}
          categorias={categorias}
          onDecisionChange={updateDecision}
          onGuardar={handleGuardar}
          onVolver={() => { setPaso(1); setParseErrors([]); }}
        />
      )}

      {paso === 3 && guardado && (
        <RenderPaso3
          guardado={guardado}
          onImportarOtra={resetAll}
          onVolver={() => { setPaso(2); setGuardado(null); }}
        />
      )}
    </div>
  );
}

// ─── Paso 1 ───────────────────────────────────────────────────────────────────

function RenderPaso1({
  txt, onTxtChange, onParsear, parseErrors, cargando,
  tienePrompt, copiado, onCopiarPrompt,
  archivoNombre, onArchivoNombre,
}: {
  txt: string;
  onTxtChange: (v: string) => void;
  onParsear: () => void;
  parseErrors: string[];
  cargando: boolean;
  tienePrompt: boolean;
  copiado: boolean;
  onCopiarPrompt: () => void;
  archivoNombre: string | null;
  onArchivoNombre: (nombre: string | null) => void;
}) {
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      if (!content || !content.trim()) {
        setFileError("El archivo está vacío.");
        onArchivoNombre(null);
        return;
      }
      onTxtChange(content);
      onArchivoNombre(file.name);
    };
    reader.onerror = () => {
      setFileError("No se pudo leer el archivo.");
      onArchivoNombre(null);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  return (
    <>
      {/* Sección: copiar prompt para LLM */}
      {tienePrompt && (
        <div style={{
          marginBottom: "1rem", padding: "0.75rem 1rem",
          background: "var(--surface-alt, #f5f5f5)", borderRadius: "6px",
          border: "1px solid var(--border, #e0e0e0)",
        }}>
          <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-strong, #222)" }}>
            Copiar prompt para LLM
          </p>
          <p style={{ margin: "0 0 0.6rem", fontSize: "0.78rem", color: "var(--muted, #666)" }}>
            Copiá este prompt, pegáselo a tu IA junto con la receta en texto libre, y traé el resultado acá.
          </p>
          <button
            onClick={onCopiarPrompt}
            style={{
              padding: "0.35rem 0.9rem", fontSize: "0.82rem", fontWeight: 600,
              border: "1px solid var(--primary, #1976d2)",
              borderRadius: "4px", cursor: "pointer",
              background: copiado ? "var(--ok-bg, #e8f5e9)" : "var(--surface, #fff)",
              color: copiado ? "var(--ok-text, #2e7d32)" : "var(--primary, #1976d2)",
              transition: "all 0.15s",
            }}
          >
            {copiado ? "Copiado ✓" : "Copiar prompt"}
          </button>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.72rem", color: "var(--muted, #888)" }}>
            Nota: el prompt está acoplado al formato exacto que este importador entiende. Si lo editás en Firestore y cambiás la estructura, el LLM puede devolver un TXT que el parser no reconozca.
          </p>
        </div>
      )}

      <p className="meta" style={{ marginBottom: "0.5rem" }}>
        Pegá el TXT o subí un archivo <code>.txt</code> con formato <code>#RECETA</code> / <code>#INGREDIENTES</code> / <code>#PASOS</code>. Podés incluir múltiples recetas en el mismo archivo.
      </p>

      {/* Subir archivo */}
      <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <label style={{
          display: "inline-block", padding: "0.35rem 0.9rem", fontSize: "0.82rem", fontWeight: 600,
          border: "1px solid var(--primary, #1976d2)", borderRadius: "4px", cursor: "pointer",
          background: "var(--surface, #fff)", color: "var(--primary, #1976d2)", userSelect: "none",
        }}>
          Subir archivo .txt
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileChange}
            disabled={cargando}
            style={{ display: "none" }}
          />
        </label>
        {archivoNombre && (
          <span style={{ fontSize: "0.8rem", color: "var(--muted, #666)" }}>
            Cargado: <strong>{archivoNombre}</strong>
          </span>
        )}
        {fileError && (
          <span style={{ fontSize: "0.8rem", color: "#c62828" }}>{fileError}</span>
        )}
      </div>

      <textarea
        value={txt}
        onChange={e => onTxtChange(e.target.value)}
        placeholder={PLACEHOLDER}
        disabled={cargando}
        rows={20}
        style={{
          width: "100%", fontFamily: "monospace", fontSize: "0.78rem",
          padding: "0.75rem", border: "1px solid #ddd", borderRadius: "6px",
          resize: "vertical", boxSizing: "border-box",
        }}
      />

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
        <button
          className="btn-primary"
          onClick={onParsear}
          disabled={cargando || !txt.trim()}
        >
          {cargando ? "Cargando catálogo…" : "Parsear"}
        </button>
        {txt && !cargando && (
          <button className="btn-secondary" onClick={() => { onTxtChange(""); onArchivoNombre(null); setFileError(null); }}>Limpiar</button>
        )}
      </div>

      {parseErrors.length > 0 && (
        <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#fdecea", borderRadius: "6px", borderLeft: "4px solid #c62828" }}>
          <strong>Errores de parseo</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
            {parseErrors.map((e, i) => <li key={i} style={{ marginBottom: "0.2rem" }}>{e}</li>)}
          </ul>
        </div>
      )}
    </>
  );
}

// ─── Paso 2 ───────────────────────────────────────────────────────────────────

function RenderPaso2({
  recetas, fallidasParseo, filas, categorias, onDecisionChange, onGuardar, onVolver,
}: {
  recetas: ParsedReceta[];
  fallidasParseo: ParsedFallida[];
  filas: FilaIngrediente[];
  categorias: string[];
  onDecisionChange: (idx: number, d: DecisionIngrediente) => void;
  onGuardar: () => void;
  onVolver: () => void;
}) {
  const pendientes = filas.filter(f => f.decision.tipo === "nuevo" && !f.decision.nombre.trim()).length;
  const totalPasos = recetas.reduce((s, r) => s + r.pasos.length, 0);

  return (
    <>
      <div style={{ marginBottom: "0.75rem" }}>
        <p style={{ margin: 0, fontWeight: 600 }}>
          {recetas.length === 1 ? recetas[0].nombre : `${recetas.length} recetas detectadas`}
        </p>
        <p className="meta" style={{ margin: "0.2rem 0 0" }}>
          {filas.length} ingredientes únicos · {totalPasos} pasos totales
        </p>
        {fallidasParseo.length > 0 && (
          <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "#fff8e1", borderRadius: "6px", borderLeft: "4px solid #f9a825" }}>
            <strong style={{ fontSize: "0.82rem" }}>
              {fallidasParseo.length === 1 ? "1 receta no pudo parsearse" : `${fallidasParseo.length} recetas no pudieron parsearse`}:
            </strong>
            <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem", fontSize: "0.78rem" }}>
              {fallidasParseo.map((f, i) => (
                <li key={i}><strong>{f.nombre}:</strong> {f.errores.join("; ")}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="meta" style={{ marginBottom: "0.5rem" }}>
        Revisá cómo se resolvió cada ingrediente contra el catálogo. Las decisiones se aplican a todas las recetas que usen ese ingrediente.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {filas.map((fila, idx) => (
          <FilaRow
            key={idx}
            idx={idx}
            fila={fila}
            categorias={categorias}
            onChange={onDecisionChange}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-secondary" onClick={onVolver}>← Volver</button>
        <button
          className="btn-primary"
          onClick={onGuardar}
          disabled={pendientes > 0}
          title={pendientes > 0 ? "Completá los nombres de los ingredientes nuevos" : undefined}
        >
          {recetas.length === 1 ? "Confirmar y guardar" : `Confirmar y guardar ${recetas.length} recetas`}
        </button>
      </div>
    </>
  );
}

// ─── Fila de ingrediente ──────────────────────────────────────────────────────

function FilaRow({
  idx, fila, categorias, onChange,
}: {
  idx: number;
  fila: FilaIngrediente;
  categorias: string[];
  onChange: (idx: number, d: DecisionIngrediente) => void;
}) {
  const [verMas, setVerMas] = useState(false);
  const { raw, match, decision } = fila;

  const titulo = raw.preparacion
    ? `${raw.textoOriginal} (${raw.preparacion})`
    : raw.textoOriginal;
  const unidadLabel = [
    raw.cantidadLabel,
    raw.unidad ? pluralizarUnidad(raw.unidad, raw.cantidadMin ?? 1) : undefined,
  ].filter(Boolean).join(" ");

  return (
    <div style={{ padding: "0.6rem 0.75rem", border: "1px solid #e0e0e0", borderRadius: "6px", background: "#fafafa" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 500, fontSize: "0.88rem" }}>{titulo}</span>
        {unidadLabel && <span className="meta">{unidadLabel}</span>}
        {raw.grupoAlternativa && (
          <span style={badge("#5c35a0", "#ede7f6")}>alternativa</span>
        )}
        {decision.tipo === "exacto"    && <span style={BADGE_EXACTO}>✓ Exacto</span>}
        {decision.tipo === "sugerencia" && <span style={BADGE_SUGER}>⚠ Sugerencias</span>}
        {decision.tipo === "nuevo"     && <span style={BADGE_NUEVO}>+ Nuevo</span>}
      </div>

      {decision.tipo === "exacto" && (
        <p className="meta" style={{ margin: "0.25rem 0 0" }}>
          Catálogo: <strong>{decision.nombrePreferido}</strong>
        </p>
      )}

      {match.tipo === "sugerencias" && (
        <div style={{ marginTop: "0.35rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {(verMas ? match.sugerencias : match.sugerencias.slice(0, 3)).map(s => {
            const ing = s.ingrediente;
            const sel = decision.tipo === "sugerencia" && decision.idIngrediente === ing.idIngrediente;
            return (
              <button
                key={ing.idIngrediente}
                onClick={() => onChange(idx, { tipo: "sugerencia", idIngrediente: ing.idIngrediente, nombrePreferido: ing.nombrePreferido })}
                style={{
                  textAlign: "left", padding: "0.3rem 0.6rem",
                  border: `1px solid ${sel ? "#1976d2" : "#ccc"}`,
                  borderRadius: "4px", background: sel ? "#e3f2fd" : "#fff",
                  cursor: "pointer", fontSize: "0.82rem", fontFamily: "inherit",
                }}
              >
                <strong>{ing.nombrePreferido}</strong>
                <span style={{ color: "var(--muted-strong)", marginLeft: "0.5rem", fontWeight: 400 }}>{ing.categoria}</span>
              </button>
            );
          })}

          {!verMas && match.sugerencias.length > 3 && (
            <button
              onClick={() => setVerMas(true)}
              style={{
                textAlign: "left", background: "none", border: "none",
                color: "var(--color-primary)", cursor: "pointer",
                fontSize: "0.8rem", padding: "0.1rem 0.6rem", fontFamily: "inherit",
              }}
            >
              ver más ({match.sugerencias.length - 3} más)
            </button>
          )}

          <button
            onClick={() => onChange(idx, { tipo: "nuevo", nombre: raw.textoOriginal, categoria: "Despensa varios" })}
            style={{
              textAlign: "left", padding: "0.3rem 0.6rem",
              border: decision.tipo === "nuevo" ? "1px solid #424242" : "1px dashed #aaa",
              borderRadius: "4px",
              background: decision.tipo === "nuevo" ? "#f5f5f5" : "transparent",
              cursor: "pointer", fontSize: "0.82rem", color: "#555", fontFamily: "inherit",
            }}
          >
            + Crear nuevo ingrediente
          </button>

          {decision.tipo === "nuevo" && (
            <div style={{ paddingLeft: "0.6rem", borderLeft: "2px solid #ccc", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                value={decision.nombre}
                onChange={e => onChange(idx, { ...decision, nombre: e.target.value })}
                placeholder="Nombre en catálogo"
                style={{ fontSize: "0.82rem", padding: "3px 6px", borderRadius: "4px", border: "1px solid #ccc", minWidth: "160px" }}
              />
              {categorias.length > 0 && (
                <select
                  value={decision.categoria}
                  onChange={e => onChange(idx, { ...decision, categoria: e.target.value })}
                  style={{ fontSize: "0.82rem", padding: "3px 6px", borderRadius: "4px", border: "1px solid #ccc" }}
                >
                  {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              )}
            </div>
          )}
        </div>
      )}

      {match.tipo !== "sugerencias" && decision.tipo === "nuevo" && (
        <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            value={decision.nombre}
            onChange={e => onChange(idx, { ...decision, nombre: e.target.value })}
            placeholder="Nombre en catálogo"
            style={{ fontSize: "0.82rem", padding: "3px 6px", borderRadius: "4px", border: "1px solid #ccc", minWidth: "160px" }}
          />
          {categorias.length > 0 && (
            <select
              value={decision.categoria}
              onChange={e => onChange(idx, { ...decision, categoria: e.target.value })}
              style={{ fontSize: "0.82rem", padding: "3px 6px", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Paso 3 ───────────────────────────────────────────────────────────────────

function RenderPaso3({
  guardado, onImportarOtra, onVolver,
}: {
  guardado: GuardadoState;
  onImportarOtra: () => void;
  onVolver: () => void;
}) {
  if (guardado.fase === "guardando") {
    return (
      <div style={{ padding: "2rem 0", textAlign: "center", color: "#666" }}>
        Guardando recetas… ({guardado.progreso} / {guardado.total})
      </div>
    );
  }

  if (guardado.fase === "exito") {
    const { creadas, duplicadas, fallidas } = guardado;
    return (
      <div>
        {creadas.length > 0 && (
          <div style={{ padding: "0.75rem 1rem", background: "#e8f5e9", borderRadius: "6px", borderLeft: "4px solid #2e7d32", marginBottom: "0.75rem" }}>
            <strong>{creadas.length === 1 ? "1 receta creada" : `${creadas.length} recetas creadas`}</strong>
            <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.25rem" }}>
              {creadas.map(c => (
                <li key={c.idReceta} style={{ marginBottom: "0.15rem" }}>
                  <Link
                    to={`/recetas/${c.idReceta}`}
                    style={{ color: "var(--color-primary)", textDecoration: "underline", fontSize: "0.875rem" }}
                  >
                    {c.idReceta} — {c.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {duplicadas.length > 0 && (
          <div style={{ padding: "0.75rem 1rem", background: "#fff8e1", borderRadius: "6px", borderLeft: "4px solid #f9a825", marginBottom: "0.75rem" }}>
            <strong>{duplicadas.length === 1 ? "1 duplicada" : `${duplicadas.length} duplicadas`}</strong>
            <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.25rem" }}>
              {duplicadas.map((d, i) => (
                <li key={i} style={{ marginBottom: "0.15rem", fontSize: "0.85rem" }}>
                  <strong>{d.nombre}:</strong> {d.razon}
                </li>
              ))}
            </ul>
          </div>
        )}

        {fallidas.length > 0 && (
          <div style={{ padding: "0.75rem 1rem", background: "#fdecea", borderRadius: "6px", borderLeft: "4px solid #c62828", marginBottom: "0.75rem" }}>
            <strong>{fallidas.length === 1 ? "1 fallida" : `${fallidas.length} fallidas`}</strong>
            <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.25rem" }}>
              {fallidas.map((f, i) => (
                <li key={i} style={{ marginBottom: "0.15rem", fontSize: "0.85rem" }}>
                  <strong>{f.nombre}:</strong> {f.errores.join("; ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {creadas.length === 0 && duplicadas.length === 0 && fallidas.length === 0 && (
          <p style={{ color: "#666" }}>No se procesaron recetas.</p>
        )}

        <button className="btn-secondary" style={{ marginTop: "0.5rem" }} onClick={onImportarOtra}>
          Importar más
        </button>
      </div>
    );
  }

  // fase === "error"
  return (
    <div style={{ padding: "0.75rem 1rem", background: "#fdecea", borderRadius: "6px", borderLeft: "4px solid #c62828" }}>
      <strong>Error al guardar</strong>
      <p style={{ margin: "0.35rem 0 0" }}>{guardado.mensaje}</p>
      <button className="btn-secondary" style={{ marginTop: "0.75rem" }} onClick={onVolver}>
        Volver y reintentar
      </button>
    </div>
  );
}
