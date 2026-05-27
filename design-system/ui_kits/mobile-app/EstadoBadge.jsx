// EstadoBadge.jsx — plan-status pill

function EstadoBadge({ estado }) {
  const styles = {
    "Elegida":          { bg: 'var(--surface-alt)',  color: 'var(--muted)' },
    "Compra pendiente": { bg: 'var(--warn-bg)',       color: 'var(--warn-text)' },
    "Compra lista":     { bg: 'var(--info-bg)',       color: 'var(--info-text)' },
    "Cocinando":        { bg: 'var(--primary)',       color: '#fff' },
    "Cocinada":         { bg: 'var(--ok-bg)',         color: 'var(--ok-text)' },
    "Evaluada":         { bg: 'var(--surface-alt)',  color: 'var(--muted-strong)' },
  };
  const s = styles[estado] || styles["Elegida"];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px',
      borderRadius: 9999, fontSize: 12, fontWeight: 500,
      whiteSpace: 'nowrap', background: s.bg, color: s.color,
    }}>{estado}</span>
  );
}

window.EstadoBadge = EstadoBadge;
