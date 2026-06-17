// src/components/historial/EmptyState.tsx — estado vacío contextual

type EmptyContext = "sin-entries" | "sin-matches-busqueda" | "sin-matches-filtro";

interface EmptyStateProps {
  context: EmptyContext;
}

const COPIES: Record<EmptyContext, { title: string; desc: string }> = {
  "sin-entries":          { title: "Sin historial todavía", desc: "Los platos evaluados aparecerán acá." },
  "sin-matches-busqueda": { title: "Sin resultados", desc: "Ningún plato coincide con esa búsqueda." },
  "sin-matches-filtro":   { title: "Sin resultados", desc: "Ningún plato coincide con ese filtro." },
};

export function EmptyState({ context }: EmptyStateProps) {
  const { title, desc } = COPIES[context];
  return (
    <div style={{
      textAlign: "center",
      padding: "var(--space-8) var(--space-4)",
    }}>
      <p style={{
        fontSize: "var(--fs-base)",
        fontWeight: 600,
        color: "var(--text-strong)",
        margin: "0 0 var(--space-2)",
      }}>
        {title}
      </p>
      <p className="meta">{desc}</p>
    </div>
  );
}
