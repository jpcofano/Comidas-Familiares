import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { SkeletonHeader } from "../components/skeletons/SkeletonHeader";
import { getReceta } from "../data/recetas";
import { getPlan, marcarCocinada, marcarComponenteCocinado } from "../data/planes";
import { useCocinarState } from "../hooks/useCocinarState";
import { PasoCard } from "../components/PasoCard";
import { TimerBar } from "../components/TimerBar";
import type { Receta, Plan } from "../types/models";

// ─── Modo libre: /recetas/:id/cocinar ────────────────────────────────────────
// ─── Modo plan:  /planes/:idPlan/cocinar/:idReceta ────────────────────────────

export function CocinarRoute() {
  // Ambos path params opcionales según la ruta activa
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
    ]).then(([r, p]) => {
      setReceta(r);
      setPlan(p);
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
    // Tachar el paso actual si no está tachado; no finaliza automáticamente
    if (!tachados.has(pasoActualObj.nroPaso)) {
      toggleTachado(pasoActualObj.nroPaso);
    }
    const postTachados = new Set([...state.pasosTachados, pasoActualObj.nroPaso]);
    const nextPaso = pasosOrdenados.find(
      (p) => p.nroPaso > pasoActualObj.nroPaso && !postTachados.has(p.nroPaso)
    );
    if (nextPaso) setPasoActual(nextPaso.nroPaso);
    // Si no hay next: queda en el paso actual (tachado), JP aprieta "Finalizar" explícito
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
      // Volver a guiada: primer paso NO tachado
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
  // Guard: en modo plan, solo JP o miembro asignado puede cocinar
  if (modo === "plan" && plan && !isJP && !(plan.asignaciones as string[])?.includes(memberId)) {
    return <Navigate to="/" replace />;
  }

  const timerBarPasos = pasosOrdenados.map((p) => ({ nroPaso: p.nroPaso, titulo: p.titulo }));
  const hasTimers = Object.keys(state.timersActivos).length > 0;

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
            Paso {idx + 1} de {total}
          </p>
          {/* Barra de progreso */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {pasosOrdenados.map((p) => (
              <div
                key={p.nroPaso}
                style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: tachados.has(p.nroPaso)
                    ? "var(--ok-text)"
                    : p.nroPaso === pasoActualObj?.nroPaso
                    ? "var(--primary)"
                    : "var(--surface-alt)",
                  border: "1px solid var(--border)",
                }}
              />
            ))}
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

        {/* PasoCard */}
        {pasoActualObj && (
          <div className="card" style={{ marginBottom: "var(--space-3)" }}>
            <PasoCard
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

        {/* PasoCard con toggle para desmarcar en modo guiada */}
        {/* (onToggleTachado ya pasado arriba en el bloque PasoCard) */}

        {/* Navegación */}
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <button
            className="btn btn-secondary"
            onClick={handleAnterior}
            disabled={idx === 0 || finalizando}
            style={{ flex: 1, fontSize: "var(--fs-sm)" }}
          >
            ← Anterior
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSiguiente}
            disabled={finalizando}
            style={{ flex: 1, fontSize: "var(--fs-sm)" }}
          >
            Siguiente →
          </button>
        </div>

        {/* Botón finalizar explícito */}
        <div style={{ marginTop: "var(--space-3)", marginBottom: hasTimers ? 64 : 0 }}>
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

      {/* Nombre + resumen */}
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

      {/* Banner riesgo general — siempre visible en scroll */}
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

      {/* Todos los pasos */}
      {pasosOrdenados.map((paso) => (
        <div key={paso.nroPaso} className="card" style={{ marginBottom: "var(--space-2)" }}>
          <PasoCard
            paso={paso}
            tachado={tachados.has(paso.nroPaso)}
            esActual={false}
            onToggleTachado={() => toggleTachado(paso.nroPaso)}
            onIniciarTimer={(durMs) => iniciarTimer(paso.nroPaso, durMs)}
            onCancelarTimer={() => cancelarTimer(paso.nroPaso)}
            timerActivo={state.timersActivos[paso.nroPaso]}
          />
        </div>
      ))}

      <div style={{ height: hasTimers ? 64 : 0 }} />
      <TimerBar timers={state.timersActivos} pasos={timerBarPasos} onCancelar={cancelarTimer} />
    </>
  );
}
