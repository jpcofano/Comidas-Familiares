// DetalleRecetaScreen.jsx — recipe detail with chips, ingredients, actions

function Chip({ label, tone }) {
  const tones = {
    default: { bg: 'var(--surface-alt)', color: 'var(--muted-strong)' },
    ok:      { bg: 'var(--ok-bg)',       color: 'var(--ok-text)' },
    info:    { bg: 'var(--info-bg)',     color: 'var(--info-text)' },
  };
  const t = tones[tone] || tones.default;
  return (
    <span style={{
      fontSize: 12, padding: '2px 9px', borderRadius: 9999,
      background: t.bg, color: t.color, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function DetalleRecetaScreen({ receta, onBack, onCocinar, onElegirComoEspecial, onSumarExtra }) {
  return (
    <div>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'transparent', border: 0, color: 'var(--muted)',
        fontSize: 13, cursor: 'pointer', marginBottom: 12,
        padding: 0, fontFamily: 'inherit',
      }}>
        <Icon name="chevron-left" size={16}/>
        <span>Atrás</span>
      </button>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
        <h1 style={{ marginBottom: 8 }}>{receta.nombre}</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          <Chip label={receta.tipo}/>
          <Chip label={receta.proteina}/>
          <Chip label={receta.tiempo}/>
          <Chip label={receta.dificultad}/>
          {receta.sinLacteos && <Chip tone="ok" label="Sin lácteos"/>}
          {receta.sinHidratos && <Chip tone="info" label="Sin hidratos"/>}
        </div>

        <h3 style={{ marginTop: 16, marginBottom: 8 }}>Ingredientes</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>
          {receta.ingredientes.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>

        <h3 style={{ marginTop: 20, marginBottom: 8 }}>Pasos</h3>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>
          {receta.pasos.map((p, idx) => (
            <li key={idx}>{p.titulo} <span style={{ color: 'var(--muted)', fontSize: 13 }}>· {p.tiempo}</span></li>
          ))}
        </ol>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
          <Button variant="primary" fullWidth onClick={onCocinar}>Cocinar ahora</Button>
          <Button variant="secondary" fullWidth onClick={onElegirComoEspecial}>Elegir como Especial</Button>
          <Button variant="secondary" fullWidth onClick={onSumarExtra}>+ Sumar como extra</Button>
        </div>
      </div>
    </div>
  );
}

window.DetalleRecetaScreen = DetalleRecetaScreen;
