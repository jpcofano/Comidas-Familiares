// src/components/cocinar/PasoBlock.tsx — bloque semántico de Clave / Riesgo
// variant "ok" = verde (✓ Clave), "warn" = amarillo (⚠ Riesgo)

interface PasoBlockProps {
  variant: 'ok' | 'warn';
  label: string;
  children: React.ReactNode;
}

const TONES = {
  ok:   { bg: 'var(--ok-bg)',   text: 'var(--ok-text)',   line: 'var(--ok-line)',   sym: '✓' },
  warn: { bg: 'var(--warn-bg)', text: 'var(--warn-text)', line: 'var(--warn-line)', sym: '⚠' },
} as const;

export function PasoBlock({ variant, label, children }: PasoBlockProps) {
  const t = TONES[variant];
  return (
    <div style={{
      marginTop: 12,
      padding: '10px 12px',
      background: t.bg,
      borderRadius: 10,
      border: `1px solid ${t.line}`,
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start',
    }}>
      <span style={{
        color: t.text,
        fontWeight: 700,
        fontSize: 13,
        lineHeight: 1.3,
        flexShrink: 0,
      }}>
        {t.sym}
      </span>
      <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.45 }}>
        <b style={{ fontWeight: 700 }}>{label}:</b>{' '}{children}
      </p>
    </div>
  );
}
