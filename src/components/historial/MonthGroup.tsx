// src/components/historial/MonthGroup.tsx — header sticky por mes + entries

import { HistorialCard } from "./HistorialCard";
import { formatMesAnio } from "../../lib/fechaHistorial";
import type { Historial } from "../../types/models";

interface MonthGroupProps {
  mesKey: string;          // "YYYY-MM"
  entries: Historial[];
  onClickEntry: (entry: Historial) => void;
}

export function MonthGroup({ mesKey, entries, onClickEntry }: MonthGroupProps) {
  const label = formatMesAnio(mesKey);

  return (
    <section>
      {/* Header sticky */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--surface)",
        padding: "8px 0 6px",
        marginBottom: 4,
      }}>
        <p style={{
          fontSize: "var(--fs-xs)",
          fontWeight: 700,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: 0,
        }}>
          {label} · {entries.length}
        </p>
      </div>

      {entries.map((entry) => (
        <HistorialCard
          key={entry.idHist}
          entry={entry}
          onClick={() => onClickEntry(entry)}
        />
      ))}
    </section>
  );
}
