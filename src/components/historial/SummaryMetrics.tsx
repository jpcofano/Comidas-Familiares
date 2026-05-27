// src/components/historial/SummaryMetrics.tsx — 3 cards: Total / Promedio / Top

import { Stars } from "./Stars";
import type { Historial } from "../../types/models";

interface SummaryMetricsProps {
  entries: Historial[];
}

function MetricCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1,
      background: "var(--surface-strong)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      padding: "10px 12px",
      minWidth: 0,
    }}>
      <p style={{
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--muted)",
        margin: "0 0 4px",
      }}>
        {label}
      </p>
      {children}
    </div>
  );
}

export function SummaryMetrics({ entries }: SummaryMetricsProps) {
  const total = entries.length;
  const promedio = total > 0
    ? entries.reduce((s, e) => s + e.promedio, 0) / total
    : 0;
  const topCount = entries.filter(
    (e) => e.resultado === "Excelente" || e.resultado === "Muy bueno"
  ).length;

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-4)" }}>
      <MetricCard label="Total">
        <p style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-strong)",
          fontVariantNumeric: "tabular-nums",
          margin: 0,
          lineHeight: 1,
        }}>
          {total}
        </p>
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>platos</p>
      </MetricCard>

      <MetricCard label="Promedio">
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <p style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-strong)",
            fontVariantNumeric: "tabular-nums",
            margin: 0,
            lineHeight: 1,
          }}>
            {total > 0 ? promedio.toFixed(1) : "—"}
          </p>
        </div>
        {total > 0 && (
          <div style={{ marginTop: 4 }}>
            <Stars value={promedio} />
          </div>
        )}
      </MetricCard>

      <MetricCard label="Top">
        <p style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-strong)",
          fontVariantNumeric: "tabular-nums",
          margin: 0,
          lineHeight: 1,
        }}>
          {topCount}
        </p>
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>★ excelentes</p>
      </MetricCard>
    </div>
  );
}
