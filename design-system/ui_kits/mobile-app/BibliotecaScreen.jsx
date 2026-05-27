// BibliotecaScreen.jsx — tabs (Recetas | Menús) + filters + recipe list

function RecetaCard({ receta, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 18px', cursor: 'pointer',
        transition: 'border-color 120ms ease', marginBottom: 12,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--line)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <p style={{ fontWeight: 500, color: 'var(--text-strong)', margin: 0, flex: 1, fontSize: 14 }}>
          {receta.nombre}
        </p>
        <span style={{
          fontSize: 12, padding: '2px 8px', borderRadius: 9999,
          background: 'var(--surface-alt)', color: 'var(--muted-strong)',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>{receta.tipo}</span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
        <span>{receta.proteina}</span>
        <span>{receta.tiempo}</span>
        <span>{receta.dificultad}</span>
      </div>
      {(receta.sinLacteos || receta.sinHidratos) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {receta.sinLacteos && <span style={{ fontSize: 12, padding: '1px 7px', borderRadius: 9999, background: 'var(--ok-bg)', color: 'var(--ok-text)' }}>Sin lácteos</span>}
          {receta.sinHidratos && <span style={{ fontSize: 12, padding: '1px 7px', borderRadius: 9999, background: 'var(--info-bg)', color: 'var(--info-text)' }}>Sin hidratos</span>}
        </div>
      )}
    </div>
  );
}

function BibliotecaScreen({ recetas, onAbrir }) {
  const [tab, setTab] = React.useState('recetas');
  const [busqueda, setBusqueda] = React.useState('');
  const [sinLacteos, setSinLacteos] = React.useState(false);

  const filtradas = recetas.filter(r =>
    (!busqueda || r.nombre.toLowerCase().includes(busqueda.toLowerCase())) &&
    (!sinLacteos || r.sinLacteos)
  );

  const selectStyle = {
    padding: '6px 10px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--surface-strong)',
    color: 'var(--text)', fontSize: 13, flex: 1, fontFamily: 'inherit',
  };

  return (
    <>
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16,
        alignItems: 'center', borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={() => setTab('recetas')} style={{
          background: 'transparent', border: 0,
          borderBottom: '2px solid ' + (tab === 'recetas' ? 'var(--primary)' : 'transparent'),
          marginBottom: -1, padding: '8px 4px',
          fontWeight: 500, fontSize: 14, fontFamily: 'inherit',
          color: tab === 'recetas' ? 'var(--primary)' : 'var(--muted)', cursor: 'pointer',
        }}>Recetas</button>
        <button onClick={() => setTab('menus')} style={{
          background: 'transparent', border: 0,
          borderBottom: '2px solid ' + (tab === 'menus' ? 'var(--primary)' : 'transparent'),
          marginBottom: -1, padding: '8px 4px',
          fontWeight: 500, fontSize: 14, fontFamily: 'inherit',
          color: tab === 'menus' ? 'var(--primary)' : 'var(--muted)', cursor: 'pointer',
        }}>Menús</button>
        {tab === 'recetas' && (
          <a style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 12px', background: 'var(--primary)', color: '#fff',
            borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: 'none', cursor: 'pointer',
          }}>
            <Icon name="plus" size={16}/>
            <span>Importar</span>
          </a>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
        {tab === 'recetas' ? (
          <div>
            <input
              type="search"
              placeholder="Buscar receta…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 10,
                border: '1px solid var(--border)', fontSize: 13,
                background: 'var(--surface-strong)', color: 'var(--text)',
                boxSizing: 'border-box', marginBottom: 12, fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select style={selectStyle}>
                <option>Todos los tipos</option>
                <option>Receta principal</option>
                <option>Guarnición</option>
                <option>Postre</option>
              </select>
              <select style={selectStyle}>
                <option>Todas las proteínas</option>
                <option>Vacuna</option>
                <option>Pollo</option>
                <option>Pescado</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant={sinLacteos ? 'primary' : 'secondary'} size="sm" onClick={() => setSinLacteos(!sinLacteos)}>
                Sin lácteos
              </Button>
              <Button variant="secondary" size="sm">Sin hidratos</Button>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>
                {filtradas.length} {filtradas.length === 1 ? 'receta' : 'recetas'}
              </span>
            </div>
            {filtradas.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
                Ninguna receta coincide con los filtros.
              </p>
            ) : (
              filtradas.map(r => <RecetaCard key={r.id} receta={r} onClick={() => onAbrir(r)}/>)
            )}
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
            No hay menús todavía.
          </p>
        )}
      </div>
    </>
  );
}

window.BibliotecaScreen = BibliotecaScreen;
