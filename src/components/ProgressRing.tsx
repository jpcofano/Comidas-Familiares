// src/components/ProgressRing.tsx — anillo de progreso circular (reutilizable)
// El número grande en el centro es `total - done` (lo que falta, no lo hecho).

interface ProgressRingProps {
  done: number;
  total: number;
}

export function ProgressRing({ done, total }: ProgressRingProps) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  const pendientes = total - done;

  return (
    <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
      <svg width="54" height="54" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="27" cy="27" r={r}
          fill="none"
          stroke="var(--surface-alt)"
          strokeWidth="4.5"
        />
        <circle
          cx="27" cy="27" r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        lineHeight: 1,
      }}>
        <span style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-strong)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {pendientes}
        </span>
        <span style={{
          fontSize: 8,
          color: 'var(--muted)',
          marginTop: 1,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
        }}>
          faltan
        </span>
      </div>
    </div>
  );
}
