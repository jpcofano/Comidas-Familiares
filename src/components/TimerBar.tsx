import { useState, useEffect } from "react";
import type { TimerEntry } from "../hooks/useCocinarState";

interface TimerBarProps {
  timers: Record<number, TimerEntry>;
  pasos: { nroPaso: number; titulo: string }[];
  onCancelar: (nroPaso: number) => void;
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TimerBar({ timers, pasos, onCancelar }: TimerBarProps) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const entries = Object.entries(timers).map(([k, v]) => ({
    nroPaso: Number(k),
    timer: v as TimerEntry,
  }));

  if (entries.length === 0) return null;

  const now = Date.now();

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "var(--surface-strong)", borderTop: "1px solid var(--border)",
      padding: "var(--space-2) var(--space-4)",
      display: "flex", flexDirection: "column", gap: "var(--space-1)",
      zIndex: 100,
    }}>
      {entries.map(({ nroPaso, timer }) => {
        const remaining = timer.startMs + timer.durMs - now;
        const done = remaining <= 0;
        const titulo = pasos.find((p) => p.nroPaso === nroPaso)?.titulo ?? `Paso ${nroPaso}`;

        if (done) navigator.vibrate?.(500);

        return (
          <div key={nroPaso} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: "var(--space-3)",
          }}>
            <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", flex: 1, minWidth: 0 }}>
              {titulo}
            </span>
            <span style={{
              fontVariantNumeric: "tabular-nums",
              fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semibold)",
              color: done ? "var(--ok-text)" : "var(--text-strong)",
              minWidth: "3.5ch",
            }}>
              {done ? "✓ LISTO" : formatMs(remaining)}
            </span>
            <button
              onClick={() => onCancelar(nroPaso)}
              style={{
                fontSize: "var(--fs-xs)", padding: "2px 8px",
                borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
                background: "transparent", color: "var(--muted)", cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
