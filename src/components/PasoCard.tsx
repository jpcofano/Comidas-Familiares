import type { Paso } from "../types/models";
import type { TimerEntry } from "../hooks/useCocinarState";

interface PasoCardProps {
  paso: Paso;
  tachado: boolean;
  esActual: boolean;
  onToggleTachado?: () => void;
  onIniciarTimer?: (durMs: number) => void;
  onCancelarTimer?: () => void;
  timerActivo?: TimerEntry;
}

export function PasoCard({
  paso, tachado, esActual, onToggleTachado, onIniciarTimer, onCancelarTimer, timerActivo,
}: PasoCardProps) {
  const circleColor = tachado
    ? "var(--muted)"
    : esActual
    ? "var(--primary)"
    : "var(--surface-alt)";
  const circleText = tachado || !esActual ? "var(--text)" : "#fff";

  return (
    <div style={{ opacity: tachado ? 0.55 : 1, transition: "opacity .2s" }}>
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
        {/* Número de paso */}
        <span style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
          background: circleColor, color: circleText,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semibold)",
        }}>
          {tachado ? "✓" : paso.nroPaso}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Título + tiempo */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {paso.titulo && (
              <p style={{
                fontWeight: "var(--fw-semibold)", color: "var(--text-strong)",
                margin: 0, fontSize: "var(--fs-base)", flex: 1,
                textDecoration: tachado ? "line-through" : "none",
              }}>
                {paso.titulo}
              </p>
            )}
            {paso.tiempoEstimadoLabel && (
              <span className="meta" style={{ flexShrink: 0 }}>{paso.tiempoEstimadoLabel}</span>
            )}
          </div>

          {/* Botón iniciar timer */}
          {paso.tiempoEstimadoMin != null && paso.tiempoEstimadoMin > 0 && onIniciarTimer && !timerActivo && (
            <button
              onClick={() => onIniciarTimer(paso.tiempoEstimadoMin! * 60_000)}
              style={{
                marginTop: "var(--space-1)", fontSize: "var(--fs-xs)",
                padding: "3px 10px", borderRadius: "var(--radius-sm)",
                background: "var(--surface-alt)", border: "1px solid var(--border)",
                color: "var(--text)", cursor: "pointer",
              }}
            >
              ⏱ Iniciar timer {paso.tiempoEstimadoMin} min
            </button>
          )}
          {timerActivo && onCancelarTimer && (
            <button
              onClick={onCancelarTimer}
              style={{
                marginTop: "var(--space-1)", fontSize: "var(--fs-xs)",
                padding: "3px 10px", borderRadius: "var(--radius-sm)",
                background: "var(--warn-bg)", border: "none",
                color: "var(--warn-text)", cursor: "pointer",
              }}
            >
              ⏱ Timer activo — Cancelar
            </button>
          )}

          {/* Detalle */}
          <p style={{
            fontSize: "var(--fs-sm)", color: "var(--text)", lineHeight: 1.6,
            margin: "var(--space-2) 0 0",
          }}>
            {paso.detalle}
          </p>

          {/* Clave — verde */}
          {paso.puntoClave && (
            <div style={{
              marginTop: "var(--space-2)", padding: "8px 12px",
              background: "var(--ok-bg)", borderRadius: "var(--radius-sm)",
            }}>
              <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--ok-text)" }}>
                ✓ Clave: {paso.puntoClave}
              </p>
            </div>
          )}

          {/* Riesgo — amarillo */}
          {paso.errorComun && (
            <div style={{
              marginTop: "var(--space-2)", padding: "8px 12px",
              background: "var(--warn-bg)", borderRadius: "var(--radius-sm)",
            }}>
              <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--warn-text)" }}>
                ⚠ Riesgo: {paso.errorComun}
              </p>
            </div>
          )}

          {/* Notas */}
          {paso.notas && (
            <p className="meta" style={{ marginTop: "var(--space-2)", fontStyle: "italic" }}>
              {paso.notas}
            </p>
          )}

          {/* Toggle tachado — solo modo scroll */}
          {onToggleTachado && (
            <button
              onClick={onToggleTachado}
              style={{
                marginTop: "var(--space-3)", fontSize: "var(--fs-xs)",
                padding: "4px 12px", borderRadius: "var(--radius-sm)",
                border: `1px solid ${tachado ? "var(--ok-text)" : "var(--border)"}`,
                background: tachado ? "var(--ok-bg)" : "transparent",
                color: tachado ? "var(--ok-text)" : "var(--muted)",
                cursor: "pointer",
              }}
            >
              {tachado ? "✓ Completado" : "Marcar completado"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
