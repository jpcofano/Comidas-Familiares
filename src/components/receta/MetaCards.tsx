// src/components/receta/MetaCards.tsx — 3 cards: Total / Porciones / Dificultad

interface MetaCardsProps {
  tiempoTotalLabel?: string;
  tiempoActivoLabel?: string;
  porcionesLabel?: string;
  dificultad: string;
}

function MetaCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      flex: 1,
      background: "var(--surface-alt)",
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
      <p style={{
        fontSize: 18,
        fontWeight: 700,
        color: "var(--text-strong)",
        fontVariantNumeric: "tabular-nums",
        margin: 0,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function MetaCards({ tiempoTotalLabel, tiempoActivoLabel, porcionesLabel, dificultad }: MetaCardsProps) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-4)" }}>
      <MetaCard
        label="Total"
        value={tiempoTotalLabel ?? "—"}
        sub={tiempoActivoLabel ? `${tiempoActivoLabel} activo` : undefined}
      />
      <MetaCard
        label="Porciones"
        value={porcionesLabel ?? "—"}
      />
      <MetaCard
        label="Dificultad"
        value={dificultad}
      />
    </div>
  );
}
