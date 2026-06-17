// src/components/historial/HistorialCard.tsx — card horizontal con fecha block

import { Stars } from "./Stars";
import { RESULTADO_TONES } from "./tones";
import { formatFechaCorta } from "../../lib/fechaHistorial";
import type { Historial } from "../../types/models";

interface HistorialCardProps {
  entry: Historial;
  onClick: () => void;
}

export function HistorialCard({ entry, onClick }: HistorialCardProps) {
  const { dia, mes } = formatFechaCorta(entry.fechaRealizada);
  const tone = RESULTADO_TONES[entry.resultado];

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: 14,
        padding: "12px 14px",
        background: "var(--surface-strong)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        marginBottom: 8,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        transition: "border-color var(--t-fast)",
      }}
    >
      {/* Fecha block 48px */}
      <div style={{
        width: 48,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 1,
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: tone.color,
          marginBottom: 2,
        }}>
          {mes}
        </span>
        <span style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-strong)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {dia}
        </span>
      </div>

      {/* Contenido medio */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Nombre + badge */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
          <p style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-strong)",
            margin: 0,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {entry.nombreSeleccion}
          </p>
          {entry.resultado && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              padding: "2px 7px",
              borderRadius: "var(--radius-full)",
              background: tone.bg,
              color: tone.color,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}>
              {entry.resultado}
            </span>
          )}
        </div>

        {/* Stars + promedio + ocasion */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: entry.queSalioBien ? 4 : 0,
        }}>
          <Stars value={entry.promedio} scale={10} />
          <span style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
            {entry.promedio.toFixed(1)}
          </span>
          {entry.ocasion && (
            <>
              <span style={{ color: "var(--border)", fontSize: 12 }}>·</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{entry.ocasion}</span>
            </>
          )}
        </div>

        {/* queSalioBien — nota inline truncada */}
        {entry.queSalioBien && (
          <p style={{
            fontSize: 12,
            color: "var(--muted-strong)",
            fontStyle: "italic",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            "{entry.queSalioBien}"
          </p>
        )}
      </div>

      {/* Chevron */}
      <span style={{
        fontSize: 18,
        color: "var(--muted)",
        flexShrink: 0,
        lineHeight: 1,
      }}>
        ›
      </span>
    </button>
  );
}
