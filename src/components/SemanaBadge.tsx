// src/components/SemanaBadge.tsx — badge de rango semanal (right-aligned)
// Muestra "SEMANA" en 10px muted uppercase y el rango "26 may – 1 jun" abajo.

interface SemanaBadgeProps {
  rango: string;  // e.g. "26 may – 1 jun"
}

export function SemanaBadge({ rango }: SemanaBadgeProps) {
  return (
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        lineHeight: 1.2,
        marginBottom: 2,
      }}>
        Semana
      </div>
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-strong)',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}>
        {rango}
      </div>
    </div>
  );
}
