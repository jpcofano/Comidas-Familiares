// src/components/historial/SummaryMetrics.tsx — 3 tarjetas interactivas como filtro
// Total → "todos" · Máximo → "ok" (Para repetir) · Top → "top"
// Toggle-back: tocar la tarjeta activa vuelve a "todos".

import { Stars } from "./Stars";
import type { Historial } from "../../types/models";
import type { FiltroId } from "./FilterChips";

interface SummaryMetricsProps {
  entries: Historial[];
  activo: FiltroId;
  onSelect: (f: FiltroId) => void;
}

interface MetricCardProps {
  label: string;
  filtroId: FiltroId;
  activo: FiltroId;
  onSelect: (f: FiltroId) => void;
  children: React.ReactNode;
}

function MetricCard({ label, filtroId, activo, onSelect, children }: MetricCardProps) {
  const isActivo = activo === filtroId;
  return (
    <button
      onClick={() => onSelect(isActivo ? "todos" : filtroId)}
      style={{
        flex: 1,
        background: isActivo ? "var(--primary-soft)" : "var(--surface-strong)",
        border: isActivo ? "2px solid var(--primary)" : "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "10px 12px",
        minWidth: 0,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        transition: "background 140ms ease, border-color 140ms ease",
      }}
    >
      <p style={{
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: isActivo ? "var(--primary)" : "var(--muted)",
        margin: "0 0 4px",
        transition: "color 140ms ease",
      }}>
        {label}
      </p>
      {children}
    </button>
  );
}

export function SummaryMetrics({ entries, activo, onSelect }: SummaryMetricsProps) {
  const total = entries.length;
  const maximo = total > 0 ? Math.max(...entries.map(e => e.promedio)) : 0;
  const topCount = entries.filter(
    (e) => e.resultado === "Excelente" || e.resultado === "Muy bueno"
  ).length;

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-4)" }}>
      {/* Total → filtro "todos" */}
      <MetricCard label="Total" filtroId="todos" activo={activo} onSelect={onSelect}>
        <p style={{
          fontSize: 22, fontWeight: 700,
          color: "var(--text-strong)",
          fontVariantNumeric: "tabular-nums",
          margin: 0, lineHeight: 1,
        }}>
          {total}
        </p>
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>platos</p>
      </MetricCard>

      {/* Máximo → filtro "ok" (Para repetir) */}
      <MetricCard label="Máximo" filtroId="ok" activo={activo} onSelect={onSelect}>
        <p style={{
          fontSize: 22, fontWeight: 700,
          color: "var(--text-strong)",
          fontVariantNumeric: "tabular-nums",
          margin: 0, lineHeight: 1,
        }}>
          {total > 0 ? maximo.toFixed(1) : "—"}
        </p>
        {total > 0 && (
          <div style={{ marginTop: 4 }}>
            <Stars value={maximo} scale={10} />
          </div>
        )}
      </MetricCard>

      {/* Top → filtro "top" */}
      <MetricCard label="Top" filtroId="top" activo={activo} onSelect={onSelect}>
        <p style={{
          fontSize: 22, fontWeight: 700,
          color: "var(--text-strong)",
          fontVariantNumeric: "tabular-nums",
          margin: 0, lineHeight: 1,
        }}>
          {topCount}
        </p>
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>★ excelentes</p>
      </MetricCard>
    </div>
  );
}
