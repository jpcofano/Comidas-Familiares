// SelectorPuntaje.jsx — 1–10 grid score selector (5+5)

function SelectorPuntaje({ valor, onChange, disabled }) {
  const fila = (nums) => (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
      {nums.map(n => {
        const active = valor === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange && onChange(n)}
            disabled={disabled}
            style={{
              width: 38, height: 38, borderRadius: 8,
              border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: active ? 'var(--primary)' : 'var(--surface-strong)',
              color: active ? '#fff' : 'var(--text)',
              fontWeight: active ? 600 : 500,
              fontFamily: 'inherit', fontSize: 14,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
            }}
          >{n}</button>
        );
      })}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {fila([1, 2, 3, 4, 5])}
      {fila([6, 7, 8, 9, 10])}
    </div>
  );
}

window.SelectorPuntaje = SelectorPuntaje;
