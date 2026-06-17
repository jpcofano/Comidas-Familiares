const COLORES: Record<string, { bg: string; color: string }> = {
  "Excelente": { bg: "var(--ok-bg)",   color: "var(--ok-text)" },
  "Muy bueno": { bg: "var(--ok-bg)",   color: "var(--ok-text)" },
  "Bueno":     { bg: "var(--info-bg)", color: "var(--info-text)" },
  "Regular":   { bg: "var(--warn-bg)", color: "var(--warn-text)" },
  "Malísimo":  { bg: "var(--err-bg)",  color: "var(--err-text)" },
};

export function ResultadoBadge({ resultado }: { resultado: string }) {
  const s = COLORES[resultado] ?? { bg: "var(--surface-alt)", color: "var(--muted)" };
  return (
    <span style={{
      fontSize: "var(--fs-xs)", padding: "2px 8px",
      borderRadius: "var(--radius-full)", background: s.bg, color: s.color,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>{resultado}</span>
  );
}
