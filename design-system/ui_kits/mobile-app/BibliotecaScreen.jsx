// BibliotecaScreen.jsx — tabs (Recetas | Menús) + filters + recipe list

// Lista canónica de cocinas de origen (espejo de COCINAS en types/models.ts)
const COCINAS = [
  'Argentina', 'Italiana', 'Española', 'Francesa', 'Mediterránea',
  'China', 'Japonesa', 'Coreana', 'Tailandesa', 'India', 'Mexicana',
  'Peruana', 'Árabe / Medio Oriente', 'Estadounidense', 'Otra',
];

// Proteínas jerárquicas (E9.0) — espejo de GRUPOS_PROTEINA en types/models.ts
const GRUPOS_PROTEINA = {
  'Carnes rojas':        ['Vacuna', 'Cerdo', 'Cordero'],
  'Aves':                ['Aves'],
  'Pescados y mariscos': ['Pescado', 'Mariscos'],
  'Huevos':              ['Huevos'],
  'Vegetales':           ['Legumbres', 'Semillas', 'Frutos secos', 'Vegetal'],
};
const GRUPOS_PROTEINA_ORDEN = ['Carnes rojas', 'Aves', 'Pescados y mariscos', 'Huevos', 'Vegetales'];
const TIPOS_ITEM = ['Receta principal', 'Entrada', 'Guarnición', 'Postre', 'Panificado', 'Snack', 'Desayuno', 'Conserva', 'Hidrato opcional'];

// match por grupo (cualquier hoja) o por hoja exacta — igual que filtros.ts del repo
function matchProteina(valor, filtro) {
  if (GRUPOS_PROTEINA[filtro]) return GRUPOS_PROTEINA[filtro].includes(valor);
  return valor === filtro;
}

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
        {receta.cocina && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontWeight: 600 }}>
            <Icon name="globe" size={13} strokeWidth={2}/>{receta.cocina}
          </span>
        )}
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

function MenuCard({ menu, onClick }) {
  const d = menu.derived || {};
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
          {menu.nombre}
        </p>
        <span style={{
          fontSize: 12, padding: '2px 8px', borderRadius: 9999,
          background: 'var(--surface-alt)', color: 'var(--muted-strong)',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>{menu.escenarioUso}</span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
        <span>{(menu.componentes || []).length} componentes</span>
        {d.tiempo && <span>{d.tiempo}</span>}
        {d.porciones && <span>{d.porciones} porc.</span>}
      </div>
    </div>
  );
}

function BibliotecaScreen({ recetas, menus = [], onAbrir, onAbrirMenu, onImportar, onVerCatalogo, onVerVisibilidad, memberMode = false, miNombre }) {
  const [tab, setTab] = React.useState('recetas');
  const [busqueda, setBusqueda] = React.useState('');
  const [sinLacteos, setSinLacteos] = React.useState(false);
  const [sinHidratos, setSinHidratos] = React.useState(false);
  const [tipo, setTipo] = React.useState('');
  const [proteina, setProteina] = React.useState('');
  const [cocina, setCocina] = React.useState('');
  const [esVeg, setEsVeg] = React.useState(false);
  const [esKeto, setEsKeto] = React.useState(false);

  const filtradas = recetas.filter(r =>
    (!busqueda || r.nombre.toLowerCase().includes(busqueda.toLowerCase())) &&
    (!sinLacteos || r.sinLacteos) &&
    (!sinHidratos || r.sinHidratos) &&
    (!tipo || r.tipo === tipo) &&
    (!proteina || matchProteina(r.proteina, proteina)) &&
    (!cocina || r.cocina === cocina) &&
    (!esVeg || r.esVegetariano) &&
    (!esKeto || r.esKeto)
  );

  const hayFiltros = busqueda || sinLacteos || sinHidratos || tipo || proteina || cocina || esVeg || esKeto;
  function limpiar() {
    setBusqueda(''); setSinLacteos(false); setSinHidratos(false);
    setTipo(''); setProteina(''); setCocina(''); setEsVeg(false); setEsKeto(false);
  }

  const selectStyle = {
    padding: '6px 10px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--surface-strong)',
    color: 'var(--text)', fontSize: 13, flex: 1, fontFamily: 'inherit',
  };

  // ── Modo miembro: solo sus recetas curadas, lectura, sin admin ───────────────
  if (memberMode) {
    const visiblesMiembro = filtradas; // ya vienen pre-curadas desde App
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <header>
          <h1 style={{ margin: 0, fontSize: 21 }}>Mis recetas</h1>
          <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.45 }}>
            Las recetas que JP eligió para vos. Elegí una para ver el paso a paso.
          </p>
        </header>

        {recetas.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '32px 20px', textAlign: 'center',
          }}>
            <span style={{
              display: 'inline-flex', width: 44, height: 44, borderRadius: 12, marginBottom: 10,
              alignItems: 'center', justifyContent: 'center',
              background: 'var(--primary-soft)', color: 'var(--primary)',
            }}><Icon name="book-open" size={22}/></span>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>
              Todavía no tenés recetas
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>
              Pedile a JP que te habilite algunas desde “Asignar recetas”.
            </p>
          </div>
        ) : (
          <>
            <input
              type="search"
              placeholder="Buscar en mis recetas…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--surface-strong)',
                color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
              }}
            />
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {visiblesMiembro.length} {visiblesMiembro.length === 1 ? 'receta' : 'recetas'}
            </span>
            <div>
              {visiblesMiembro.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)', fontSize: 13 }}>
                  Ninguna receta coincide con la búsqueda.
                </p>
              ) : (
                visiblesMiembro.map(r => <RecetaCard key={r.id} receta={r} onClick={() => onAbrir(r)}/>)
              )}
            </div>
          </>
        )}
      </div>
    );
  }

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
        {tab === 'recetas' && onImportar && (
          <button onClick={onImportar} style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 12px', background: 'var(--primary)', color: '#fff',
            borderRadius: 10, fontSize: 13, fontWeight: 500, border: 0, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Icon name="plus" size={16}/>
            <span>Importar</span>
          </button>
        )}
      </div>

      {onVerCatalogo && (
        <button onClick={onVerCatalogo} style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8, marginBottom: 12,
          background: 'var(--surface-strong)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 16px', cursor: 'pointer', fontFamily: 'inherit',
          color: 'var(--text-strong)', fontSize: 14, fontWeight: 500,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="carrot" size={18} style={{ color: 'var(--primary)' }}/>
            Catálogo de ingredientes
          </span>
          <Icon name="chevron-right" size={16} style={{ color: 'var(--muted)' }}/>
        </button>
      )}

      {onVerVisibilidad && (
        <button onClick={onVerVisibilidad} style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8, marginBottom: 12,
          background: 'var(--surface-strong)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 16px', cursor: 'pointer', fontFamily: 'inherit',
          color: 'var(--text-strong)', fontSize: 14, fontWeight: 500,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="users" size={18} style={{ color: 'var(--primary)' }}/>
            Asignar recetas a la familia
          </span>
          <Icon name="chevron-right" size={16} style={{ color: 'var(--muted)' }}/>
        </button>
      )}

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
              <select style={selectStyle} value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="">Todos los tipos</option>
                {TIPOS_ITEM.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select style={selectStyle} value={proteina} onChange={e => setProteina(e.target.value)}>
                <option value="">Todas las proteínas</option>
                {GRUPOS_PROTEINA_ORDEN.map(grupo => (
                  <optgroup key={grupo} label={grupo}>
                    <option value={grupo}>Todas: {grupo}</option>
                    {GRUPOS_PROTEINA[grupo].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select style={selectStyle} value={cocina} onChange={e => setCocina(e.target.value)}>
                <option value="">Todas las cocinas</option>
                {COCINAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant={sinLacteos ? 'primary' : 'secondary'} size="sm" onClick={() => setSinLacteos(!sinLacteos)}>
                Sin lácteos
              </Button>
              <Button variant={sinHidratos ? 'primary' : 'secondary'} size="sm" onClick={() => setSinHidratos(!sinHidratos)}>
                Sin hidratos
              </Button>
              <Button variant={esVeg ? 'primary' : 'secondary'} size="sm" onClick={() => setEsVeg(!esVeg)}>
                Vegetariana
              </Button>
              <Button variant={esKeto ? 'primary' : 'secondary'} size="sm" onClick={() => setEsKeto(!esKeto)}>
                Keto
              </Button>
              {hayFiltros && <Button variant="ghost" size="sm" onClick={limpiar}>Limpiar</Button>}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {menus.length} {menus.length === 1 ? 'menú' : 'menús'}
              </span>
            </div>
            {menus.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
                No hay menús todavía.
              </p>
            ) : (
              menus.map(m => <MenuCard key={m.id} menu={m} onClick={() => onAbrirMenu(m)}/>)
            )}
          </div>
        )}
      </div>
    </>
  );
}

window.BibliotecaScreen = BibliotecaScreen;
