import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getReceta } from "../data/recetas";
import { getCatalogo } from "../data/ingredientes";
import { getPlan, marcarCocinada, marcarComponenteCocinado } from "../data/planes";
import { useCocinarState } from "../hooks/useCocinarState";
import { PasoCard } from "../components/PasoCard";
import { TimerBar } from "../components/TimerBar";
import { sustitutosDeItem } from "../lib/sustitutos";
import type { Receta, Plan, Ingrediente, IngredienteEnReceta } from "../types/models";
import { SkeletonHeader } from "../components/skeletons/SkeletonHeader";

// ─── Sustitutos a mano ────────────────────────────────────────────────────────

function SustitutosRecap({
  ingredientes,
  catalogo,
}: {
  ingredientes: IngredienteEnReceta[];
  catalogo: Map<string, Ingrediente>;
}) {
  const [abierto, setAbierto] = useState(false);

  const items = useMemo(
    () => ingredientes
      .map(ing => ({ ing, sustitutos: sustitutosDeItem(ing, catalogo) }))
      .filter(({ sustitutos }) => sustitutos.length > 0),
    [ingredientes, catalogo],
  );

  if (items.length === 0) return null;

  return (
    <div style={{
      marginBottom: "var(--space-3)",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setAbierto(v => !v)}
        style={{
          width: "100%", padding: "var(--space-3)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "var(--surface-strong)", border: "none",
          cursor: "pointer", fontFamily: "inherit",
          fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--text-strong)",
        }}
      >
        <span>Sustitutos a mano ({items.length})</span>
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>{abierto ? "▲" : "▼"}</span>
      </button>
      {abierto && (
        <div style={{ padding: "var(--space-3)", borderTop: "1px solid var(--border-subtle)" }}>
          {items.map(({ ing, sustitutos }) => (
            <p key={ing.idIngrediente} style={{ margin: "0 0 var(--space-2)", fontSize: "var(--fs-sm)" }}>
              <span style={{ color: "var(--text-strong)" }}>{ing.textoOriginal}</span>
              <span style={{ color: "var(--muted)" }}> — o {sustitutos.map(s => s.nombre).join(" o ")}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modo libre: /recetas/:id/cocinar ────────────────────────────────────────
// ─── Modo plan:  /planes/:idPlan/cocinar/:idReceta ────────────────────────────

export function CocinarRoute() {
  const { id, idPlan, idReceta: idRecetaParam } = useParams<{
    id?: string;
    idPlan?: string;
    idReceta?: string;
  }>();

  const modo: "libre" | "plan" = idPlan ? "plan" : "libre";
  const idReceta = idPlan ? (idRecetaParam ?? "") : (id ?? "");
  const sessionKey = idPlan ? `plan:${idPlan}:${idReceta}` : `libre:${idReceta}`;

  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const memberId = authState.status === "authenticated" ? authState.user.memberId : "";
  const isJP = memberId === "juanpablo";

  const [receta, setReceta] = useState<Receta | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [catalogo, setCatalogo] = useState<Map<string, Ingrediente> | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [confirmarFinalizar, setConfirmarFinalizar] = useState(false);

  const { state, toggleTachado, setModoVista, setPasoActual, iniciarTimer, cancelarTimer, clearAll } =
    useCocinarState(sessionKey);

  useEffect(() => {
    if (!idReceta) return;
    Promise.all([
      getReceta(idReceta),
      idPlan ? getPlan(idPlan) : Promise.resolve(null),
      getCatalogo(),
    ]).then(([r, p, cat]) => {
      setReceta(r);
      setPlan(p);
      setCatalogo(cat);
      setLoading(false);
    });
  }, [idReceta, idPlan]);

  const pasosOrdenados = useMemo(
    () => [...(receta?.pasos ?? [])].sort((a, b) => a.nroPaso - b.nroPaso),
    [receta]
  );

  const pasoActualObj = pasosOrdenados.find((p) => p.nroPaso === state.pasoActual) ?? pasosOrdenados[0];
  const tachados = new Set(state.pasosTachados);
  const completados = pasosOrdenados.filter((p) => tachados.has(p.nroPaso)).length;
  const total = pasosOrdenados.length;

  // Refs para scroll mode
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Auto-scroll al paso actual en modo scroll
  useEffect(() => {
    if (state.modoVista !== "scroll") return;
    const el = stepRefs.current[state.pasoActual];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state.pasoActual, state.modoVista]);

  async function finalizar() {
    setFinalizando(true);
    setConfirmarFinalizar(false);
    clearAll();

    if (modo === "libre") {
      navigate(-1);
      return;
    }

    if (!plan) { navigate("/"); return; }

    if (plan.tipoSeleccion === "receta") {
      await marcarCocinada(plan.idPlan);
      navigate("/");
    } else {
      const r = await marcarComponenteCocinado(plan.idPlan, idReceta);
      if (r.ok) {
        navigate(`/planes/${plan.idPlan}/componentes`);
      } else {
        console.error("[cocinar] marcarComponenteCocinado falló:", r.error);
        navigate("/");
      }
    }
  }

  function handleSiguiente() {
    if (!pasoActualObj) return;
    if (!tachados.has(pasoActualObj.nroPaso)) {
      toggleTachado(pasoActualObj.nroPaso);
    }
    const postTachados = new Set([...state.pasosTachados, pasoActualObj.nroPaso]);
    const nextPaso = pasosOrdenados.find(
      (p) => p.nroPaso > pasoActualObj.nroPaso && !postTachados.has(p.nroPaso)
    );
    if (nextPaso) setPasoActual(nextPaso.nroPaso);
  }

  function handleAnterior() {
    if (!pasoActualObj) return;
    const prev = [...pasosOrdenados].reverse().find((p) => p.nroPaso < pasoActualObj.nroPaso);
    if (prev) setPasoActual(prev.nroPaso);
  }

  function handleToggleModo() {
    if (state.modoVista === "guiada") {
      setModoVista("scroll");
    } else {
      const primero = pasosOrdenados.find((p) => !tachados.has(p.nroPaso));
      if (primero) setPasoActual(primero.nroPaso);
      setModoVista("guiada");
    }
  }

  if (loading) {
    return <div className="card"><SkeletonHeader /></div>;
  }
  if (!receta) {
    return <div className="card"><p style={{ color: "var(--err-text)" }}>Receta no encontrada.</p></div>;
  }
  if (modo === "plan" && plan && !isJP && !(plan.asignaciones as string[])?.includes(memberId)) {
    return <Navigate to="/" replace />;
  }

  const timerBarPasos = pasosOrdenados.map((p) => ({ nroPaso: p.nroPaso, titulo: p.titulo }));
  const hasTimers = Object.keys(state.timersActivos).length > 0;

  // Próximo paso (para preview en botón Siguiente)
  const proxPasoIdx = pasoActualObj
    ? pasosOrdenados.findIndex((p) => p.nroPaso > pasoActualObj.nroPaso && !tachados.has(p.nroPaso))
    : -1;
  const proxPaso = proxPasoIdx >= 0 ? pasosOrdenados[proxPasoIdx] : null;

  // ── Modo guiada ──────────────────────────────────────────────────────────────
  if (state.modoVista === "guiada") {
    const idx = pasosOrdenados.findIndex((p) => p.nroPaso === pasoActualObj?.nroPaso);

    return (
      <>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
          <button
            className="btn btn-ghost"
            onClick={() => navigate(-1)}
            style={{ padding: "4px", display: "flex", alignItems: "center" }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleToggleModo}
            style={{ fontSize: "var(--fs-xs)" }}
          >
            Ver todos
          </button>
        </div>

        {/* Nombre + progreso */}
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: "0 0 var(--space-1)" }}>
            {receta.nombre}
          </p>
          <p className="meta" style={{ margin: "0 0 var(--space-2)" }}>
            Paso {idx + 1} de {total} · {completados} hecho{completados !== 1 ? "s" : ""}
          </p>

          {/* Barra de progreso — dots clickeables */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {pasosOrdenados.map((p) => {
              const tachado = tachados.has(p.nroPaso);
              const actual  = p.nroPaso === pasoActualObj?.nroPaso && !tachado;
              return (
                <button
                  key={p.nroPaso}
                  onClick={() => setPasoActual(p.nroPaso)}
                  aria-label={`Ir al paso ${p.nroPaso}`}
                  style={{
                    width: 12, height: 12,
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    background: tachado
                      ? "var(--ok-text)"
                      : actual
                      ? "var(--primary)"
                      : "var(--surface-alt)",
                    outline: actual ? "2px solid var(--primary)" : "1px solid var(--border)",
                    outlineOffset: actual ? 2 : 0,
                    transition: "background 180ms ease",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Banner riesgo general — solo paso 1 */}
        {receta.riesgos && pasoActualObj?.nroPaso === pasosOrdenados[0]?.nroPaso && (
          <div style={{
            marginBottom: "var(--space-3)", padding: "var(--space-3)",
            background: "var(--warn-bg)", borderRadius: "var(--radius-md)",
            border: "1px solid var(--warn-line, var(--border))",
          }}>
            <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--warn-text)" }}>
              ⚠ {receta.riesgos}
            </p>
          </div>
        )}

        {/* Sustitutos a mano — solo paso 1 */}
        {catalogo && pasoActualObj?.nroPaso === pasosOrdenados[0]?.nroPaso && (
          <SustitutosRecap ingredientes={receta.ingredientes} catalogo={catalogo} />
        )}

        {/* PasoCard — key asegura remount al cambiar paso (limpia StepTimer) */}
        {pasoActualObj && (
          <div className="card" style={{ marginBottom: "var(--space-3)" }}>
            <PasoCard
              key={pasoActualObj.nroPaso}
              paso={pasoActualObj}
              tachado={tachados.has(pasoActualObj.nroPaso)}
              esActual
              onToggleTachado={() => toggleTachado(pasoActualObj.nroPaso)}
              onIniciarTimer={(durMs) => iniciarTimer(pasoActualObj.nroPaso, durMs)}
              onCancelarTimer={() => cancelarTimer(pasoActualObj.nroPaso)}
              timerActivo={state.timersActivos[pasoActualObj.nroPaso]}
            />
          </div>
        )}

        {/* Navegación: Anterior cuadrado + Siguiente con preview */}
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          {/* Anterior — botón cuadrado 48×48 */}
          <button
            className="btn btn-secondary"
            onClick={handleAnterior}
            disabled={idx === 0 || finalizando}
            aria-label="Paso anterior"
            style={{
              width: 48, height: 48, flexShrink: 0,
              padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: idx === 0 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Siguiente — con preview del próximo paso */}
          <button
            className="btn btn-primary"
            onClick={handleSiguiente}
            disabled={finalizando}
            style={{
              flex: 1, height: 48,
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "0 var(--space-4)",
              gap: "var(--space-2)",
              textAlign: "left",
            }}
          >
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, minWidth: 0, overflow: "hidden" }}>
              <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Siguiente paso
              </span>
              <span style={{
                fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {proxPaso?.titulo ?? "—"}
              </span>
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Botón finalizar explícito */}
        <div style={{ marginBottom: hasTimers ? 64 : 0 }}>
          {confirmarFinalizar ? (
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                className="btn btn-primary"
                onClick={finalizar}
                disabled={finalizando}
                style={{ flex: 1, fontSize: "var(--fs-sm)" }}
              >
                {finalizando ? "…" : "Sí, finalizar"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmarFinalizar(false)}
                style={{ flex: 1, fontSize: "var(--fs-sm)" }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmarFinalizar(true)}
              disabled={finalizando}
              style={{ width: "100%", fontSize: "var(--fs-sm)" }}
            >
              {modo === "libre"
                ? "Salir"
                : plan?.tipoSeleccion === "menu"
                ? "Componente listo ✓"
                : "Finalizar cocción"}
            </button>
          )}
        </div>

        <TimerBar timers={state.timersActivos} pasos={timerBarPasos} onCancelar={cancelarTimer} />
      </>
    );
  }

  // ── Modo scroll ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ padding: "4px", display: "flex", alignItems: "center" }}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleToggleModo}
          style={{ fontSize: "var(--fs-xs)" }}
        >
          Paso a paso
        </button>
      </div>

      {/* Nombre + resumen + finalizar */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: "0 0 var(--space-1)" }}>
          {receta.nombre}
        </p>
        <p className="meta" style={{ margin: 0 }}>
          {completados}/{total} pasos completados
        </p>
        <div style={{ marginTop: "var(--space-3)" }}>
          {confirmarFinalizar ? (
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                className="btn btn-primary"
                onClick={finalizar}
                disabled={finalizando}
                style={{ flex: 1, fontSize: "var(--fs-sm)" }}
              >
                {finalizando ? "…" : "Sí, finalizar"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmarFinalizar(false)}
                style={{ flex: 1, fontSize: "var(--fs-sm)" }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmarFinalizar(true)}
              disabled={finalizando}
              style={{ width: "100%", fontSize: "var(--fs-sm)" }}
            >
              {modo === "libre"
                ? "Salir"
                : plan?.tipoSeleccion === "menu"
                ? "Componente listo ✓"
                : "Finalizar cocción"}
            </button>
          )}
        </div>
      </div>

      {/* Banner riesgo general */}
      {receta.riesgos && (
        <div style={{
          marginBottom: "var(--space-3)", padding: "var(--space-3)",
          background: "var(--warn-bg)", borderRadius: "var(--radius-md)",
          border: "1px solid var(--warn-line, var(--border))",
        }}>
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--warn-text)" }}>
            ⚠ {receta.riesgos}
          </p>
        </div>
      )}

      {/* Sustitutos a mano */}
      {catalogo && <SustitutosRecap ingredientes={receta.ingredientes} catalogo={catalogo} />}

      {/* Todos los pasos — con ACÁ VAS pill y borde bordó en el actual */}
      {pasosOrdenados.map((paso) => {
        const esActual = paso.nroPaso === pasoActualObj?.nroPaso && !tachados.has(paso.nroPaso);
        return (
          <div
            key={paso.nroPaso}
            style={{ marginBottom: "var(--space-2)", position: "relative" }}
          >
            {/* Pill "ACÁ VAS" */}
            {esActual && (
              <span style={{
                position: "absolute",
                top: -9, left: 20,
                zIndex: 1,
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--primary)",
                color: "#fff",
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                pointerEvents: "none",
              }}>
                Acá vas
              </span>
            )}

            {/* Card con borde activo */}
            <div
              className="card"
              style={{
                border: esActual ? "1.5px solid var(--primary)" : undefined,
                boxShadow: esActual ? "0 4px 14px rgba(138, 74, 47, 0.10)" : undefined,
                cursor: !tachados.has(paso.nroPaso) && !esActual ? "pointer" : undefined,
              }}
              onClick={
                !tachados.has(paso.nroPaso) && !esActual
                  ? () => setPasoActual(paso.nroPaso)
                  : undefined
              }
            >
              <PasoCard
                paso={paso}
                tachado={tachados.has(paso.nroPaso)}
                esActual={esActual}
                onToggleTachado={() => toggleTachado(paso.nroPaso)}
                onIniciarTimer={(durMs) => iniciarTimer(paso.nroPaso, durMs)}
                onCancelarTimer={() => cancelarTimer(paso.nroPaso)}
                timerActivo={state.timersActivos[paso.nroPaso]}
              />
            </div>

            {/* Invisible ref anchor (for scrollIntoView) */}
            <div
              ref={(el) => { stepRefs.current[paso.nroPaso] = el; }}
              style={{ position: "absolute", top: -12 }}
            />
          </div>
        );
      })}

      <div style={{ height: hasTimers ? 64 : 0 }} />
      <TimerBar timers={state.timersActivos} pasos={timerBarPasos} onCancelar={cancelarTimer} />
    </>
  );
}
