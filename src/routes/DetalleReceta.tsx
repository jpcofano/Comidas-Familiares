import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getReceta } from "../data/recetas";
import { subscribeToPlanesActivos } from "../data/planes";
import { elegirComoEspecial, sumarComoExtra, sumarComoEnProceso } from "../data/planes";
import { evaluarEspecial, evaluarExtra, evaluarEnProceso } from "../lib/elegibilidad";
import { getSemanaActual, getSemanaFin } from "../lib/fechas";
import { MetaCards } from "../components/receta/MetaCards";
import { RecetaPill } from "../components/receta/RecetaPill";
import { IngredientesPorGondola } from "../components/receta/IngredientesPorGondola";
import { PasosPreview } from "../components/receta/PasosPreview";
import { AccionesPlan } from "../components/receta/AccionesPlan";
import { CocinarSticky } from "../components/receta/CocinarSticky";
import type { Receta, Plan } from "../types/models";

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg { text: string; ok: boolean }

function Toast({ msg, onDone }: { msg: ToastMsg; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", bottom: "var(--space-5)", left: "50%", transform: "translateX(-50%)",
      background: msg.ok ? "var(--ok-bg)" : "var(--err-bg)",
      color: msg.ok ? "var(--ok-text)" : "var(--err-text)",
      padding: "10px 20px", borderRadius: "var(--radius-md)",
      boxShadow: "0 4px 12px rgba(0,0,0,.18)", fontSize: "var(--fs-sm)",
      zIndex: 9999, maxWidth: "90vw", textAlign: "center",
    }}>
      {msg.text}
    </div>
  );
}

// ─── Confirmación ─────────────────────────────────────────────────────────────

function ConfirmDialog({
  mensaje, onConfirmar, onCancelar,
}: {
  mensaje: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9998, padding: "var(--space-4)",
    }}>
      <div className="card" style={{ maxWidth: 380, width: "100%", margin: 0 }}>
        <p style={{ marginBottom: "var(--space-4)", lineHeight: 1.5 }}>{mensaje}</p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirmar}>Reemplazar</button>
        </div>
      </div>
    </div>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 style={{
      fontSize: "var(--fs-base)",
      fontWeight: "var(--fw-semibold)" as unknown as number,
      color: "var(--text-strong)",
      margin: "0 0 var(--space-3)",
    }}>
      {children}
    </h2>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export function DetalleRecetaRoute() {
  const { id: idReceta } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();
  const isJP = state.status === "authenticated" && state.user.memberId === "juanpablo";

  const [receta, setReceta] = useState<Receta | null>(null);
  const [loadingReceta, setLoadingReceta] = useState(true);
  const [errorReceta, setErrorReceta] = useState<string | null>(null);

  const [planesActivos, setPlanesActivos] = useState<Plan[]>([]);
  const semanaInicio = getSemanaActual();
  const semanaFin = getSemanaFin(semanaInicio);

  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [confirm, setConfirm] = useState<{ mensaje: string; accion: () => void } | null>(null);
  const [loadingAccion, setLoadingAccion] = useState<"especial" | "extra" | "enproceso" | null>(null);

  // Carga la receta
  useEffect(() => {
    if (!idReceta) return;
    getReceta(idReceta)
      .then((r) => {
        if (!r) setErrorReceta("Receta no encontrada.");
        else setReceta(r);
      })
      .catch(() => setErrorReceta("No se pudo cargar la receta."))
      .finally(() => setLoadingReceta(false));
  }, [idReceta]);

  // Suscripción a planes activos (solo JP)
  useEffect(() => {
    if (!isJP) return;
    const unsub = subscribeToPlanesActivos(semanaInicio, setPlanesActivos);
    return unsub;
  }, [isJP, semanaInicio]);

  const showToast = useCallback((text: string, ok: boolean) => {
    setToast({ text, ok });
  }, []);

  // ── Acciones ────────────────────────────────────────────────────────────────

  async function handleEspecial() {
    if (!receta) return;
    const { puede, razon, especialExistente } = evaluarEspecial(receta, planesActivos);
    if (!puede) { showToast(razon ?? "No se puede elegir como Especial.", false); return; }
    if (especialExistente) {
      setConfirm({
        mensaje: `Ya hay una Especial esta semana: "${especialExistente.nombreSeleccion}". ¿Reemplazarla? Se descartarán también sus extras.`,
        accion: () => ejecutarEspecial(especialExistente),
      });
    } else {
      await ejecutarEspecial();
    }
  }

  async function ejecutarEspecial(especialExistente?: Plan) {
    if (!receta) return;
    setConfirm(null);
    setLoadingAccion("especial");
    const result = await elegirComoEspecial(receta, semanaInicio, semanaFin, especialExistente);
    setLoadingAccion(null);
    if (result.ok) showToast(`"${receta.nombre}" agregada como Especial.`, true);
    else showToast(result.error.message, false);
  }

  async function handleExtra() {
    if (!receta) return;
    const { puede, razon } = evaluarExtra(receta, planesActivos);
    if (!puede) { showToast(razon ?? "No se puede agregar como extra.", false); return; }
    setLoadingAccion("extra");
    const especial = planesActivos.find(p => p.tipoPlan === "Especial")!;
    const result = await sumarComoExtra(receta, especial, semanaInicio, semanaFin);
    setLoadingAccion(null);
    if (result.ok) showToast(`"${receta.nombre}" sumada como Especial extra.`, true);
    else showToast(result.error.message, false);
  }

  async function handleEnProceso() {
    if (!receta) return;
    const { puede, razon } = evaluarEnProceso(receta, planesActivos);
    if (!puede) { showToast(razon ?? "No se puede agregar como En proceso.", false); return; }
    setLoadingAccion("enproceso");
    const result = await sumarComoEnProceso(receta, semanaInicio, semanaFin);
    setLoadingAccion(null);
    if (result.ok) showToast(`"${receta.nombre}" sumada como En proceso.`, true);
    else showToast(result.error.message, false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingReceta) {
    return <div className="card"><p className="meta">Cargando receta…</p></div>;
  }

  if (errorReceta || !receta) {
    return (
      <div className="card">
        <p style={{ color: "var(--err-text)" }}>{errorReceta ?? "Receta no encontrada."}</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: "var(--space-3)" }}>
          Volver
        </button>
      </div>
    );
  }

  const elegEspecial = evaluarEspecial(receta, planesActivos);
  const elegExtra = evaluarExtra(receta, planesActivos);
  const elegEnProceso = evaluarEnProceso(receta, planesActivos);

  // Padding extra abajo si hay sticky bottom (solo JP)
  const bottomPad = isJP ? 100 : 0;

  return (
    <div style={{ paddingBottom: bottomPad }}>
      {/* 1. Header con volver + chip tipo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        marginBottom: "var(--space-3)",
      }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ padding: "4px", display: "flex", alignItems: "center" }}
          aria-label="Volver"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="meta">{receta.tipoItem}</span>
      </div>

      {/* 2. Título + porQueEspecial */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: "var(--text-strong)",
          lineHeight: 1.2,
          letterSpacing: "-0.02em",
          margin: "0 0 var(--space-2)",
        }}>
          {receta.nombre}
        </h1>
        {receta.porQueEspecial && (
          <p style={{
            fontSize: "var(--fs-sm)",
            color: "var(--muted-strong)",
            fontStyle: "italic",
            margin: 0,
          }}>
            {receta.porQueEspecial}
          </p>
        )}
      </div>

      {/* 3. MetaCards */}
      <MetaCards
        tiempoTotalLabel={receta.tiempoTotalLabel}
        tiempoActivoLabel={receta.tiempoActivoLabel}
        porcionesLabel={receta.porcionesLabel}
        dificultad={receta.dificultad}
      />

      {/* 4. Acciones JP — plegadas, arriba de las pills */}
      {isJP && (
        <AccionesPlan
          elegEspecial={elegEspecial}
          elegExtra={elegExtra}
          elegEnProceso={elegEnProceso}
          loadingAccion={loadingAccion}
          onEspecial={() => void handleEspecial()}
          onExtra={() => void handleExtra()}
          onEnProceso={() => void handleEnProceso()}
        />
      )}

      {/* 5. Pills */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-2)",
        marginBottom: "var(--space-5)",
      }}>
        {receta.proteinaPrincipal && (
          <RecetaPill label={receta.proteinaPrincipal} variant="accent" />
        )}
        {receta.escenarioUso && <RecetaPill label={receta.escenarioUso} />}
        {receta.estilo && <RecetaPill label={receta.estilo} />}
        {receta.tecnicaPrincipal && <RecetaPill label={receta.tecnicaPrincipal} />}
        {receta.costoEstimado && <RecetaPill label={`Costo ${receta.costoEstimado}`} />}
        {receta.sinLacteos && <RecetaPill label="Sin lácteos" variant="ok" />}
        {!receta.hidratos && <RecetaPill label="Sin hidratos" variant="info" />}
        {receta.aptoNocheDeADos === "Sí" && <RecetaPill label="Noche de a dos ✓" variant="info" />}
      </div>

      {/* 6. Ingredientes */}
      {receta.ingredientes.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <SectionTitle>Ingredientes</SectionTitle>
          <IngredientesPorGondola ingredientes={receta.ingredientes} />
        </div>
      )}

      {/* 7. Preparación */}
      {receta.pasos.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <SectionTitle>Preparación</SectionTitle>
          <PasosPreview pasos={receta.pasos} riesgos={receta.riesgos} />
        </div>
      )}

      {/* 8. Tip del cocinero */}
      {receta.notas && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <SectionTitle>Tip del cocinero</SectionTitle>
          <p style={{
            fontSize: "var(--fs-sm)",
            color: "var(--muted-strong)",
            fontStyle: "italic",
            margin: 0,
            lineHeight: 1.55,
          }}>
            {receta.notas}
          </p>
        </div>
      )}

      {/* 9. Sticky bottom Cocinar (solo JP) */}
      {isJP && (
        <CocinarSticky onClick={() => navigate(`/recetas/${idReceta}/cocinar`)} />
      )}

      {/* Modal de confirmación */}
      {confirm && (
        <ConfirmDialog
          mensaje={confirm.mensaje}
          onConfirmar={confirm.accion}
          onCancelar={() => setConfirm(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
