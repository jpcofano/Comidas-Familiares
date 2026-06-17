// Pill "⇄ o {sustituto}" para ítems de la lista de compras.
// Tap = misma acción que marcar yaTengo (lo cubrís con el sustituto).

interface SustitutoPillProps {
  nombres: string[];
  onToggle: () => void;
}

export function SustitutoPill({ nombres, onToggle }: SustitutoPillProps) {
  return (
    <button
      onClick={onToggle}
      title={`Tenés: ${nombres.join(" o ")}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 10px",
        borderRadius: 999,
        background: "var(--accent-soft)",
        border: "1px solid var(--accent)",
        color: "var(--accent-strong)",
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        lineHeight: 1.25,
        transition: "opacity 160ms ease",
      }}
    >
      ⇄ o {nombres.join(" o ")}
    </button>
  );
}
