// ComprasScreen.jsx — shopping list grouped by aisle, with ya-tengo checkboxes

function ComprasScreen({ items: initialItems }) {
  const [items, setItems] = React.useState(initialItems);
  const [modoVista, setModoVista] = React.useState('gondola'); // gondola | receta
  const [filtro, setFiltro] = React.useState('todo'); // todo | pendientes | yaTengo

  function toggle(id) {
    setItems(items.map(it => it.id === id ? { ...it, yaTengo: !it.yaTengo } : it));
  }

  const visibles = items.filter(it => {
    if (filtro === 'pendientes') return !it.yaTengo;
    if (filtro === 'yaTengo')    return it.yaTengo;
    return true;
  });

  // Group by aisle (seccion)
  const grupos = {};
  visibles.forEach(it => {
    const key = modoVista === 'gondola' ? it.seccion : it.receta;
    (grupos[key] ||= []).push(it);
  });

  const pendientes = items.filter(i => !i.yaTengo).length;
  const yaTengo = items.length - pendientes;

  return (
    <>
      <h2 style={{ marginBottom: 12 }}>Lista de compras</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
        <strong>{pendientes}</strong> pendientes · <strong>{yaTengo}</strong> ya tengo
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Button variant={modoVista === 'gondola' ? 'primary' : 'secondary'} size="sm" onClick={() => setModoVista('gondola')}>
          Por góndola
        </Button>
        <Button variant={modoVista === 'receta' ? 'primary' : 'secondary'} size="sm" onClick={() => setModoVista('receta')}>
          Por receta
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['todo', 'pendientes', 'yaTengo'].map(f => (
          <Button key={f} variant={filtro === f ? 'primary' : 'secondary'} size="sm" onClick={() => setFiltro(f)}>
            {f === 'todo' ? 'Todo' : f === 'pendientes' ? 'Pendientes' : 'Ya tengo'}
          </Button>
        ))}
      </div>

      {Object.entries(grupos).map(([titulo, list]) => (
        <div key={titulo} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '12px 16px', marginBottom: 8,
        }}>
          <p style={{
            fontSize: 12, fontWeight: 500, textTransform: 'uppercase',
            letterSpacing: '.05em', color: 'var(--muted)', marginBottom: 8,
          }}>{titulo}</p>
          {list.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 0', borderBottom: '1px solid var(--line)',
              opacity: item.yaTengo ? 0.45 : 1,
            }}>
              <button
                onClick={() => toggle(item.id)}
                aria-label={item.yaTengo ? 'Quitar ya tengo' : 'Marcar ya tengo'}
                style={{
                  flexShrink: 0, width: 24, height: 24, borderRadius: 6,
                  border: `2px solid ${item.yaTengo ? 'var(--ok-text)' : 'var(--border)'}`,
                  background: item.yaTengo ? 'var(--ok-bg)' : 'transparent',
                  cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {item.yaTengo && <span style={{ fontSize: 13, color: 'var(--ok-text)', lineHeight: 1 }}>✓</span>}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 13, color: 'var(--text)',
                  textDecoration: item.yaTengo ? 'line-through' : 'none',
                }}>{item.nombre}</span>
                <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--muted)' }}>{item.cantidad}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

window.ComprasScreen = ComprasScreen;
