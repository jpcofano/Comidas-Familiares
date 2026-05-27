// src/components/receta/RecetaPill.tsx — pill compacta con variantes

type PillVariant = "neutral" | "ok" | "info" | "accent";

interface RecetaPillProps {
  label: string;
  variant?: PillVariant;
}

const VARIANT_STYLES: Record<PillVariant, { bg: string; color: string }> = {
  neutral: { bg: "var(--surface-alt)", color: "var(--muted-strong)" },
  ok:      { bg: "var(--ok-bg)",       color: "var(--ok-text)" },
  info:    { bg: "var(--info-bg)",     color: "var(--info-text)" },
  accent:  { bg: "var(--primary-soft)", color: "var(--primary)" },
};

export function RecetaPill({ label, variant = "neutral" }: RecetaPillProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: "var(--radius-full)",
      fontSize: "var(--fs-xs)",
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}
