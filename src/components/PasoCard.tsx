import type { Paso } from "../types/models";
import type { TimerEntry } from "../hooks/useCocinarState";
import { StepTimer } from "./StepTimer";

interface PasoCardProps {
  paso: Paso;
  tachado: boolean;
  esActual: boolean;
  onToggleTachado?: () => void;
  // Props de compatibilidad con Cocinar.tsx — ya no se renderizan aquí;
  // StepTimer reemplaza los botones de timer inline.
  onIniciarTimer?: (durMs: number) => void;
  onCancelarTimer?: () => void;
  timerActivo?: TimerEntry;
}

export function PasoCard({
  paso, tachado, esActual, onToggleTachado,
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
          {/* Título + tiempo estimado */}
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

          {/* Contador de tiempo — se autorenderiza si hay tiempo válido */}
          <StepTimer
            tiempoEstimadoMin={paso.tiempoEstimadoMin}
            stepLabel={paso.momento || paso.titulo || "Tu paso terminó"}
          />

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
