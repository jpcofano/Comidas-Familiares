// src/components/CompraProgress.tsx — card con progreso de lista de compras

interface CompraProgressProps {
  pendientes: number;
  yaTengo: number;
  onClick?: () => void;
}

export function CompraProgress({ pendientes, yaTengo, onClick }: CompraProgressProps) {
  const total = pendientes + yaTengo;
  const pct = total > 0 ? Math.round((yaTengo / total) * 100) : 0;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      style={{
        padding: "14px 16px",
        background: "var(--surface-strong)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        gap: 8, marginBottom: 8,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: "var(--fw-semibold)" as unknown as number, color: "var(--text-strong)", margin: 0 }}>
          Lista de compras
        </h3>
        <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 500 }}>
          Ver todo →
        </span>
      </div>

      <div style={{
        height: 6, borderRadius: "var(--radius-full)",
        background: "var(--surface-alt)",
        overflow: "hidden", marginBottom: 8,
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: "var(--ok-text)",
          transition: "width 240ms ease",
        }} />
      </div>

      <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
        <strong style={{ color: "var(--text)" }}>{pendientes}</strong> pendientes
        {" · "}
        <strong style={{ color: "var(--text)" }}>{yaTengo}</strong> ya tengo
        {" · "}
        {pct}%
      </p>
    </div>
  );
}
