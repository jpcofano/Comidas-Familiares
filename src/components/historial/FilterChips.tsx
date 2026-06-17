// src/components/historial/FilterChips.tsx — chips de filtro horizontales scrollables

export type FiltroId = "todos" | "top" | "ok" | "mal";

interface FilterChipsProps {
  activo: FiltroId;
  onChange: (f: FiltroId) => void;
}

const FILTROS: { id: FiltroId; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "top",   label: "★ Top" },
  { id: "ok",    label: "Para repetir" },
  { id: "mal",   label: "No repetir" },
];

export function FilterChips({ activo, onChange }: FilterChipsProps) {
  return (
    <div style={{
      display: "flex",
      gap: 8,
      overflowX: "auto",
      paddingBottom: 2,
      scrollbarWidth: "none",
    }}>
      {FILTROS.map((f) => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-full)",
            border: 0,
            fontFamily: "inherit",
            fontSize: "var(--fs-sm)",
            fontWeight: 600,
            whiteSpace: "nowrap",
            cursor: "pointer",
            transition: "background var(--t-fast), color var(--t-fast)",
            background: f.id === activo ? "var(--primary)" : "var(--surface-alt)",
            color: f.id === activo ? "#fff" : "var(--text)",
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
