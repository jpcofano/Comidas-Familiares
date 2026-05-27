import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getReceta } from "../data/recetas";
import { subscribeToPlanesActivos } from "../data/planes";
import { elegirComoEspecial, sumarComoExtra, sumarComoEnProceso } from "../data/planes";
import { evaluarEspecial, evaluarExtra, evaluarEnProceso } from "../lib/elegibilidad";
import { getSemanaActual, getSemanaFin } from "../lib/fechas";
import { pluralizarUnidad } from "../lib/unidades";
import type { Receta, Plan } from "../types/models";
import { SkeletonHeader } from "../components/skeletons/SkeletonHeader";
import { SkeletonRow } from "../components/skeletons/SkeletonRow";

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
  mensaje,
  onConfirmar,
  onCancelar,
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

// ─── Chip de dato ──────────────────────────────────────────────────────────────

function Chip({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: "var(--fs-xs)", padding: "2px 9px",
      borderRadius: "var(--radius-full)", background: "var(--surface-alt)",
      color: "var(--muted-strong)", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ─── Botón de acción ──────────────────────────────────────────────────────────

function ActionBtn({
  label,
  disabled,
  razon,
  loading,
  onClick,
}: {
  label: string;
  disabled: boolean;
  razon?: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div style={{ marginBottom: "var(--space-2)" }}>
      <button
        className={`btn ${disabled ? "btn-secondary" : "btn-primary"}`}
        disabled={disabled || loading}
        onClick={onClick}
        style={{ width: "100%", opacity: disabled ? 0.6 : 1 }}
      >
        {loading ? "…" : label}
      </button>
      {disabled && razon && (
        <p className="meta" style={{ marginTop: "var(--space-1)", fontSize: "var(--fs-xs)" }}>
          {razon}
        </p>
      )}
    </div>
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

  // Carga la receta (1 query)
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

  // Suscripción a planes activos de la semana (realtime)
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
    return (
      <div className="card">
        <SkeletonHeader />
        <div style={{ marginTop: "var(--space-3)" }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
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

  return (
    <>
      {/* Cabecera con volver */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
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

      {/* Ficha principal */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <h1 style={{
          fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)",
          color: "var(--text-strong)", marginBottom: "var(--space-3)",
          lineHeight: 1.3,
        }}>
          {receta.nombre}
        </h1>

        {/* Chips de datos clave */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
          <Chip label={receta.proteinaPrincipal} />
          <Chip label={receta.dificultad} />
          <Chip label={receta.costoEstimado} />
          {receta.tiempoActivoLabel && <Chip label={`Activo: ${receta.tiempoActivoLabel}`} />}
          {receta.tiempoTotalLabel && <Chip label={`Total: ${receta.tiempoTotalLabel}`} />}
          {receta.porcionesLabel && <Chip label={`${receta.porcionesLabel} porciones`} />}
          <Chip label={receta.escenarioUso} />
          {receta.estilo && <Chip label={receta.estilo} />}
          {receta.tecnicaPrincipal && <Chip label={receta.tecnicaPrincipal} />}
        </div>

        {/* Flags dietéticos */}
        {(receta.sinLacteos || !receta.hidratos || receta.aptoNocheDeADos === "Sí") && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            {receta.sinLacteos && (
              <span style={{ fontSize: "var(--fs-xs)", padding: "2px 9px", borderRadius: "var(--radius-full)", background: "var(--ok-bg)", color: "var(--ok-text)" }}>
                Sin lácteos
              </span>
            )}
            {!receta.hidratos && (
              <span style={{ fontSize: "var(--fs-xs)", padding: "2px 9px", borderRadius: "var(--radius-full)", background: "var(--info-bg)", color: "var(--info-text)" }}>
                Sin hidratos
              </span>
            )}
            {receta.aptoNocheDeADos === "Sí" && (
              <span style={{ fontSize: "var(--fs-xs)", padding: "2px 9px", borderRadius: "var(--radius-full)", background: "var(--surface-alt)", color: "var(--muted-strong)" }}>
                Noche de a dos ✓
              </span>
            )}
          </div>
        )}

        {/* Notas especiales */}
        {receta.porQueEspecial && (
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted-strong)", fontStyle: "italic", marginBottom: "var(--space-2)" }}>
            {receta.porQueEspecial}
          </p>
        )}
        {receta.notas && (
          <p className="meta" style={{ marginBottom: 0 }}>{receta.notas}</p>
        )}
      </div>

      {/* Ingredientes */}
      {receta.ingredientes.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <h2 style={{ fontSize: "var(--fs-base)", fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", marginBottom: "var(--space-3)" }}>
            Ingredientes
          </h2>
          {(() => {
            const secciones = new Map<string, typeof receta.ingredientes>();
            for (const ing of receta.ingredientes) {
              const sec = ing.seccion ?? "";
              if (!secciones.has(sec)) secciones.set(sec, []);
              secciones.get(sec)!.push(ing);
            }
            return Array.from(secciones.entries()).map(([sec, ings]) => (
              <div key={sec} style={{ marginBottom: sec ? "var(--space-3)" : 0 }}>
                {sec && (
                  <p style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-medium)", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)", marginBottom: "var(--space-2)" }}>
                    {sec}
                  </p>
                )}
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {ings.map((ing, idx) => (
                    <li key={idx} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "5px 0", borderBottom: "1px solid var(--line)",
                      fontSize: "var(--fs-sm)", color: ing.opcional ? "var(--muted)" : "var(--text)",
                    }}>
                      <span>{ing.textoOriginal}{ing.opcional ? " (opcional)" : ""}</span>
                      <span style={{ color: "var(--muted-strong)", flexShrink: 0, marginLeft: "var(--space-3)" }}>
                        {ing.cantidadLabel ?? (ing.cantidad != null ? String(ing.cantidad) : "")}{" "}
                        {pluralizarUnidad(ing.unidad ?? "", ing.cantidadMax ?? ing.cantidadMin ?? 1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Pasos */}
      {receta.pasos.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
            <h2 style={{ fontSize: "var(--fs-base)", fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: 0 }}>
              Preparación
            </h2>
            {isJP && (
              <Link
                to={`/recetas/${idReceta}/cocinar`}
                className="btn btn-primary"
                style={{ fontSize: "var(--fs-xs)", textDecoration: "none" }}
              >
                Cocinar
              </Link>
            )}
          </div>

          {/* Banner riesgos a nivel receta */}
          {receta.riesgos && (
            <div style={{
              marginBottom: "var(--space-3)", padding: "var(--space-3)",
              background: "var(--warn-bg)", borderRadius: "var(--radius-sm)",
            }}>
              <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--warn-text)" }}>
                ⚠ {receta.riesgos}
              </p>
            </div>
          )}

          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {[...receta.pasos].sort((a, b) => a.nroPaso - b.nroPaso).map((paso) => (
              <li key={paso.nroPaso} style={{ marginBottom: "var(--space-4)" }}>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                  <span style={{
                    flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
                    background: "var(--primary)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semibold)",
                  }}>
                    {paso.nroPaso}
                  </span>
                  <div style={{ flex: 1 }}>
                    {paso.titulo && (
                      <p style={{ fontWeight: "var(--fw-medium)", color: "var(--text-strong)", marginBottom: "var(--space-1)", fontSize: "var(--fs-sm)" }}>
                        {paso.titulo}
                      </p>
                    )}
                    <p style={{ fontSize: "var(--fs-sm)", color: "var(--text)", lineHeight: 1.55, margin: 0 }}>
                      {paso.detalle}
                    </p>
                    {paso.tiempoEstimadoLabel && (
                      <p className="meta" style={{ marginTop: "var(--space-1)" }}>{paso.tiempoEstimadoLabel}</p>
                    )}
                    {paso.puntoClave && (
                      <div style={{ marginTop: "var(--space-1)", padding: "6px 10px", background: "var(--ok-bg)", borderRadius: "var(--radius-sm)" }}>
                        <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--ok-text)" }}>
                          ✓ Clave: {paso.puntoClave}
                        </p>
                      </div>
                    )}
                    {paso.errorComun && (
                      <div style={{ marginTop: "var(--space-1)", padding: "6px 10px", background: "var(--warn-bg)", borderRadius: "var(--radius-sm)" }}>
                        <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--warn-text)" }}>
                          ⚠ Riesgo: {paso.errorComun}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Acciones JP — solo JP ve los botones */}
      {isJP && (
        <div className="card" style={{ marginBottom: "var(--space-5)" }}>
          <h2 style={{ fontSize: "var(--fs-base)", fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", marginBottom: "var(--space-3)" }}>
            Agregar al plan de la semana
          </h2>

          <ActionBtn
            label="Elegir como Especial"
            disabled={!elegEspecial.puede}
            razon={elegEspecial.razon}
            loading={loadingAccion === "especial"}
            onClick={handleEspecial}
          />
          <ActionBtn
            label="Sumar como Especial extra"
            disabled={!elegExtra.puede}
            razon={elegExtra.razon}
            loading={loadingAccion === "extra"}
            onClick={handleExtra}
          />
          <ActionBtn
            label="Sumar como En proceso"
            disabled={!elegEnProceso.puede}
            razon={elegEnProceso.razon}
            loading={loadingAccion === "enproceso"}
            onClick={handleEnProceso}
          />
        </div>
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
    </>
  );
}
