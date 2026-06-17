import type { EstadoPlan } from "../types/models";

const ESTILOS: Record<string, { bg: string; color: string }> = {
  "Elegida":          { bg: "var(--surface-alt)", color: "var(--muted)" },
  "Compra pendiente": { bg: "var(--warn-bg)",     color: "var(--warn-text)" },
  "Compra lista":     { bg: "var(--info-bg)",     color: "var(--info-text)" },
  "Cocinando":        { bg: "var(--primary)",     color: "var(--primary-on)" },
  "Cocinada":         { bg: "var(--ok-bg)",       color: "var(--ok-text)" },
  "Evaluada":         { bg: "var(--surface-alt)", color: "var(--muted-strong)" },
};

export function EstadoBadge({ estado }: { estado: EstadoPlan | string }) {
  const s = ESTILOS[estado] ?? ESTILOS["Elegida"];
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px",
      borderRadius: "var(--radius-full)", fontSize: "var(--fs-xs)",
      fontWeight: 500, background: s.bg, color: s.color,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>{estado}</span>
  );
}
