// src/components/historial/Stars.tsx — estrellas visuales
// `scale` es la escala original del `value`. Si no se pasa, se asume igual a `max`
// (retrocompatibilidad). Pasar `scale={10}` para valores 0–10 representados en 5 estrellas.

interface StarsProps {
  value: number;
  max?: number;
  scale?: number;
}

export function Stars({ value, max = 5, scale }: StarsProps) {
  const normalized = scale ? (value / scale) * max : value;
  return (
    <span
      style={{ display: "inline-flex", gap: 1, alignItems: "center" }}
      aria-label={`${value.toFixed(1)} de ${scale ?? max}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const full = i + 1 <= normalized;
        const half = !full && i + 0.5 <= normalized;
        return (
          <svg
            key={i}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            style={{ display: "block" }}
          >
            <polygon
              points="6,1 7.5,4.5 11.5,4.5 8.5,7 9.5,11 6,8.5 2.5,11 3.5,7 0.5,4.5 4.5,4.5"
              fill="var(--accent)"
              opacity={full ? 1 : half ? 0.5 : 0.18}
            />
          </svg>
        );
      })}
    </span>
  );
}
