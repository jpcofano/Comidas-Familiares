import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { parseRecetaTxt, type ParsedReceta, type ParsedIngredienteRaw } from "../import/parseReceta";
import { matchIngrediente, type ResultadoMatch, type MatchConSimilitud } from "../lib/matcherIngredientes";
import {
  getCatalogo, crearIngrediente, agregarSinonimo,
  invalidateCatalogCache, proximoIdIngrediente,
} from "../data/ingredientes";
import { proximoIdReceta, crearReceta } from "../data/recetas";
import { normalizeText } from "../lib/canonical";
import { normalizarUnidad } from "../lib/unidades";

// ─── Tipos locales ────────────────────────────────────────────────────────────

type DecisionIngrediente =
  | { tipo: "exacto"; idIngrediente: string; nombrePreferido: string }
  | { tipo: "candidato"; idIngrediente: string; nombrePreferido: string }
  | { tipo: "nuevo"; nombre: string; categoria: string };

interface FilaIngrediente {
  raw: ParsedIngredienteRaw;
  match: ResultadoMatch;
  decision: DecisionIngrediente;
}

type GuardadoState =
  | { fase: "guardando" }
  | { fase: "exito"; idReceta: string; nombre: string }
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
const BADGE_CANDID  = badge("#6d4c00", "#fff8e1");
const BADGE_NUEVO   = badge("#424242", "#eeeeee");

// ─── Componente principal ─────────────────────────────────────────────────────

export function ImportarRecetaRoute() {
  const { state } = useAuth();

  const [txt, setTxt]                       = useState("");
  const [paso, setPaso]                     = useState<1 | 2 | 3>(1);
  const [parseErrors, setParseErrors]       = useState<string[]>([]);
  const [recetaParsed, setRecetaParsed]     = useState<ParsedReceta | null>(null);
  const [filas, setFilas]                   = useState<FilaIngrediente[]>([]);
  const [categorias, setCategorias]         = useState<string[]>([]);
  const [cargandoCat, setCargandoCat]       = useState(false);
  const [guardado, setGuardado]             = useState<GuardadoState | null>(null);

  if (state.status !== "authenticated" || state.user.memberId !== "juanpablo") {
    return <Navigate to="/biblioteca" replace />;
  }

  // ─── Paso 1 → 2: parsear TXT + cargar catálogo ──────────────────────────

  async function handleParsear() {
    setParseErrors([]);
    const result = parseRecetaTxt(txt);
    if (!result.ok) {
      setParseErrors(result.errors);
      return;
    }
    setCargandoCat(true);
    try {
      const catalogo = await getCatalogo();
      const cats = [...new Set([...catalogo.values()].map(i => i.categoria).filter(Boolean))].sort();
      setCategorias(cats);

      const newFilas: FilaIngrediente[] = result.receta.ingredientesRaw.map(raw => {
        const match = matchIngrediente(raw.textoOriginal, catalogo);
        let decision: DecisionIngrediente;
        if (match.tipo === "exacto") {
          decision = { tipo: "exacto", idIngrediente: match.ingrediente.idIngrediente, nombrePreferido: match.ingrediente.nombrePreferido };
        } else if (match.tipo === "candidatos") {
          const best = match.candidatos[0].ingrediente;
          decision = { tipo: "candidato", idIngrediente: best.idIngrediente, nombrePreferido: best.nombrePreferido };
        } else {
          decision = { tipo: "nuevo", nombre: raw.textoOriginal, categoria: cats[0] ?? "" };
        }
        return { raw, match, decision };
      });

      setRecetaParsed(result.receta);
      setFilas(newFilas);
      setPaso(2);
    } finally {
      setCargandoCat(false);
    }
  }

  function updateDecision(idx: number, decision: DecisionIngrediente) {
    setFilas(prev => prev.map((f, i) => i === idx ? { ...f, decision } : f));
  }

  // ─── Paso 2 → 3: guardar todo ───────────────────────────────────────────

  async function handleGuardar() {
    if (!recetaParsed) return;
    setPaso(3);
    setGuardado({ fase: "guardando" });

    try {
      invalidateCatalogCache();

      // 1. agregarSinonimo para candidatos elegidos
      for (const fila of filas) {
        if (fila.decision.tipo === "candidato") {
          const r = await agregarSinonimo(fila.decision.idIngrediente, normalizeText(fila.raw.textoOriginal));
          if (!r.ok) { setGuardado({ fase: "error", mensaje: r.error.message }); return; }
        }
      }

      // 2. crearIngrediente para nuevos
      const idsNuevos: (string | null)[] = filas.map(() => null);
      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        if (fila.decision.tipo !== "nuevo") continue;
        const id = await proximoIdIngrediente();
        const canon = normalizeText(fila.decision.nombre);
        const texNorm = normalizeText(fila.raw.textoOriginal);
        // New ingredients created via importer get fallback values; JP completes them
        // in /biblioteca/catalogo (Catálogo de ingredientes) before the flag clears.
        const r = await crearIngrediente({
          idIngrediente: id,
          canonico: canon,
          nombrePreferido: fila.decision.nombre,
          sinonimos: canon !== texNorm && texNorm ? [texNorm] : [],
          categoria: fila.decision.categoria,
          rolNutricional: [],
          seccionGondola: "Despensa / otros",
          unidadesHabituales: normalizarUnidad(fila.raw.unidad) ? [normalizarUnidad(fila.raw.unidad)!] : [],
          ambiguo: true,
          origen: "import",
        });
        if (!r.ok) { setGuardado({ fase: "error", mensaje: r.error.message }); return; }
        idsNuevos[i] = id;
      }

      // 3. Construir ingredientes resueltos
      const ingredientes = filas.map((fila, i) => {
        const idIngrediente = fila.decision.tipo === "nuevo" ? idsNuevos[i]! : fila.decision.idIngrediente;
        // normalizarUnidad returns null for "a gusto" (empty/unrecognized) — omit the key in that case.
        // Unrecognized units emit console.warn; recipe is still saved with unidad omitted.
        const unidadNorm = normalizarUnidad(fila.raw.unidad);
        return {
          idIngrediente,
          textoOriginal: fila.raw.textoOriginal,
          ...(fila.raw.preparacion ? { preparacion: fila.raw.preparacion } : {}),
          seccion: fila.raw.seccion,
          cantidadLabel: fila.raw.cantidadLabel,
          cantidad: fila.raw.cantidadMin ?? undefined,
          cantidadMin: fila.raw.cantidadMin ?? undefined,
          cantidadMax: fila.raw.cantidadMax ?? undefined,
          ...(unidadNorm != null ? { unidad: unidadNorm } : {}),
          opcional: fila.raw.opcional,
          ...(fila.raw.notas ? { notas: fila.raw.notas } : {}),
        };
      });

      // 4. Construir pasos
      const pasos = recetaParsed.pasos.map(p => ({
        nroPaso: p.nroPaso,
        titulo: p.titulo,
        detalle: p.detalle,
        tiempoEstimadoLabel: p.tiempoEstimadoLabel,
        tiempoEstimadoMin: p.tiempoEstimadoMin,
        ...(p.puntoClave ? { puntoClave: p.puntoClave } : {}),
        ...(p.errorComun ? { errorComun: p.errorComun } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
      }));

      // 5. Obtener ID y crear receta
      const idReceta = await proximoIdReceta();
      const r = await crearReceta({
        idReceta,
        nombre: recetaParsed.nombre,
        nombreCanonico: recetaParsed.nombreCanonico,
        tipoItem: recetaParsed.tipoItem,
        proteinaPrincipal: recetaParsed.proteinaPrincipal,
        estilo: "",
        tecnicaPrincipal: "",
        escenarioUso: recetaParsed.escenarioUso,
        ...(recetaParsed.climaDelPlato ? { climaDelPlato: recetaParsed.climaDelPlato } : {}),
        pensadaPara: recetaParsed.pensadaPara,
        sinLacteos: recetaParsed.sinLacteos,
        hidratos: recetaParsed.hidratos,
        aptoNocheDeADos: recetaParsed.aptoNocheDeADos,
        paraJuanPablo: recetaParsed.paraJuanPablo,
        paraFamilia: recetaParsed.paraFamilia,
        tiempoActivoLabel: recetaParsed.tiempoActivoLabel,
        tiempoActivoMin: recetaParsed.tiempoActivoMin,
        tiempoTotalLabel: recetaParsed.tiempoTotalLabel,
        tiempoTotalMin: recetaParsed.tiempoTotalMin,
        dificultad: recetaParsed.dificultad,
        dificultadOrden: recetaParsed.dificultadOrden,
        porcionesLabel: recetaParsed.porcionesLabel,
        porcionesMin: recetaParsed.porcionesMin,
        porcionesMax: recetaParsed.porcionesMax,
        costoEstimado: recetaParsed.costoEstimado,
        costoOrden: recetaParsed.costoOrden,
        ...(recetaParsed.hidratoOpcional ? { hidratoOpcional: recetaParsed.hidratoOpcional } : {}),
        ...(recetaParsed.notas ? { notas: recetaParsed.notas } : {}),
        fuente: recetaParsed.fuente,
        ingredientes,
        pasos,
      } as Parameters<typeof crearReceta>[0]);

      if (!r.ok) { setGuardado({ fase: "error", mensaje: r.error.message }); return; }
      setGuardado({ fase: "exito", idReceta, nombre: recetaParsed.nombre });
    } catch (e) {
      setGuardado({ fase: "error", mensaje: "Error inesperado al guardar." });
    }
  }

  function resetAll() {
    setTxt(""); setParseErrors([]); setRecetaParsed(null);
    setFilas([]); setGuardado(null); setPaso(1);
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
          onTxtChange={setTxt}
          onParsear={handleParsear}
          parseErrors={parseErrors}
          cargando={cargandoCat}
        />
      )}

      {paso === 2 && recetaParsed && (
        <RenderPaso2
          receta={recetaParsed}
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
}: {
  txt: string;
  onTxtChange: (v: string) => void;
  onParsear: () => void;
  parseErrors: string[];
  cargando: boolean;
}) {
  return (
    <>
      <p className="meta" style={{ marginBottom: "0.75rem" }}>
        Pegá el TXT con el formato <code>#RECETA</code> / <code>#INGREDIENTES</code> / <code>#PASOS</code>.
      </p>

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
          <button className="btn-secondary" onClick={() => onTxtChange("")}>Limpiar</button>
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
  receta, filas, categorias, onDecisionChange, onGuardar, onVolver,
}: {
  receta: ParsedReceta;
  filas: FilaIngrediente[];
  categorias: string[];
  onDecisionChange: (idx: number, d: DecisionIngrediente) => void;
  onGuardar: () => void;
  onVolver: () => void;
}) {
  const pendientes = filas.filter(f => f.decision.tipo === "nuevo" && !f.decision.nombre.trim()).length;

  return (
    <>
      <div style={{ marginBottom: "0.75rem" }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{receta.nombre}</p>
        <p className="meta" style={{ margin: "0.2rem 0 0" }}>
          {receta.ingredientesRaw.length} ingredientes · {receta.pasos.length} pasos
        </p>
      </div>

      <p className="meta" style={{ marginBottom: "0.5rem" }}>
        Revisá cómo se resolvió cada ingrediente contra el catálogo.
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
          Confirmar y guardar
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
  const { raw, match, decision } = fila;

  const titulo = raw.preparacion
    ? `${raw.textoOriginal} (${raw.preparacion})`
    : raw.textoOriginal;
  const unidadLabel = [raw.cantidadLabel, raw.unidad].filter(Boolean).join(" ");

  function handleCandidatoSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "__nuevo__") {
      onChange(idx, { tipo: "nuevo", nombre: raw.textoOriginal, categoria: categorias[0] ?? "" });
    } else {
      const cands = (match.tipo === "candidatos" ? match.candidatos : []) as MatchConSimilitud[];
      const ing = cands.find(c => c.ingrediente.idIngrediente === val)?.ingrediente;
      if (ing) onChange(idx, { tipo: "candidato", idIngrediente: ing.idIngrediente, nombrePreferido: ing.nombrePreferido });
    }
  }

  const currentCandidatoId = decision.tipo === "candidato" ? decision.idIngrediente
    : decision.tipo === "nuevo" && match.tipo === "candidatos" ? "__nuevo__"
    : null;

  return (
    <div style={{ padding: "0.6rem 0.75rem", border: "1px solid #e0e0e0", borderRadius: "6px", background: "#fafafa" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 500, fontSize: "0.88rem" }}>{titulo}</span>
        {unidadLabel && <span className="meta">{unidadLabel}</span>}

        {decision.tipo === "exacto" && <span style={BADGE_EXACTO}>✓ Exacto</span>}
        {decision.tipo === "candidato" && <span style={BADGE_CANDID}>⚠ Candidatos</span>}
        {decision.tipo === "nuevo" && match.tipo !== "candidatos" && <span style={BADGE_NUEVO}>+ Nuevo</span>}
        {decision.tipo === "nuevo" && match.tipo === "candidatos" && <span style={BADGE_NUEVO}>+ Nuevo</span>}
      </div>

      {decision.tipo === "exacto" && (
        <p className="meta" style={{ margin: "0.25rem 0 0" }}>
          Catálogo: <strong>{decision.nombrePreferido}</strong>
        </p>
      )}

      {match.tipo === "candidatos" && (
        <div style={{ marginTop: "0.35rem" }}>
          <select
            value={currentCandidatoId ?? "__nuevo__"}
            onChange={handleCandidatoSelect}
            style={{ fontSize: "0.82rem", padding: "3px 6px", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            {match.candidatos.map(c => (
              <option key={c.ingrediente.idIngrediente} value={c.ingrediente.idIngrediente}>
                {c.ingrediente.nombrePreferido} ({Math.round(c.similitud * 100)}%)
              </option>
            ))}
            <option value="__nuevo__">Nuevo ingrediente…</option>
          </select>
        </div>
      )}

      {decision.tipo === "nuevo" && (
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
        Guardando receta…
      </div>
    );
  }

  if (guardado.fase === "exito") {
    return (
      <div style={{ padding: "0.75rem 1rem", background: "#e8f5e9", borderRadius: "6px", borderLeft: "4px solid #2e7d32" }}>
        <strong>Receta creada</strong>
        <p style={{ margin: "0.35rem 0 0" }}>
          <strong>{guardado.idReceta}</strong> — "{guardado.nombre}"
        </p>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
          <Link
            to={`/recetas/${guardado.idReceta}`}
            style={{ fontSize: "0.875rem", color: "var(--color-primary)", textDecoration: "underline" }}
          >
            Ver receta
          </Link>
          <button className="btn-secondary" onClick={onImportarOtra}>Importar otra</button>
        </div>
      </div>
    );
  }

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
