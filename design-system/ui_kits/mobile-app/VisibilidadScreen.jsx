// VisibilidadScreen.jsx — curación de biblioteca por miembro (owner/JP).
// E9.9: reemplaza la grilla de checkboxes por CHIPS de miembro por receta
// (toggle rápido). Cada receta muestra 3 chips (M/S/F); tocar = mostrar/ocultar
// esa receta en la biblioteca de ese miembro. Contadores arriba.

const VIS_MIEMBROS = [
  { id: 'maria',    nombre: 'María',    inicial: 'M', color: '#74324a' },
  { id: 'sofia',    nombre: 'Sofía',    inicial: 'S', color: '#3c4a6e' },
  { id: 'federico', nombre: 'Federico', inicial: 'F', color: '#2e5d2e' },
];

function MiembroChip({ m, activo, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={activo}
      aria-label={`${activo ? 'Quitar de' : 'Agregar a'} la biblioteca de ${m.nombre}`}
      title={m.nombre}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 10px 5px 5px', borderRadius: 9999, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, minHeight: 32,
        border: '1px solid ' + (activo ? 'transparent' : 'var(--border)'),
        background: activo ? m.color : 'var(--surface-strong)',
        color: activo ? '#fff' : 'var(--muted-strong)',
        transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, lineHeight: 1,
        background: activo ? 'rgba(255,255,255,0.22)' : m.color,
        color: '#fff',
      }}>{m.inicial}</span>
      {m.nombre}
    </button>
  );
}

function VisibilidadRow({ receta, vis, onToggle, isLast }) {
  return (
    <div style={{
      padding: '13px 0', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
    }}>
      <div style={{ marginBottom: 9 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-strong)', lineHeight: 1.25 }}>
          {receta.nombre}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
          {[receta.proteina, receta.tipo].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {VIS_MIEMBROS.map(m => (
          <MiembroChip
            key={m.id}
            m={m}
            activo={(vis[m.id] || []).includes(receta.id)}
            onToggle={() => onToggle(m.id, receta.id)}
          />
        ))}
      </div>
    </div>
  );
}

function VisibilidadScreen({ recetas, vis, onToggle, onBack }) {
  const [busqueda, setBusqueda] = React.useState('');
  const filtradas = recetas.filter(r =>
    !busqueda || r.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        {onBack && (
          <button type="button" onClick={onBack} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8,
            background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit',
            color: 'var(--muted)', fontSize: 13, padding: 0,
          }}>
            <Icon name="chevron-left" size={16}/> Biblioteca
          </button>
        )}
        <h1 style={{ margin: 0, fontSize: 21 }}>Asignar recetas</h1>
        <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.45 }}>
          Elegí qué recetas ve cada miembro en su biblioteca. Pueden cocinar cualquier receta que les asignes en un plan, esté o no acá.
        </p>
      </header>

      {/* Contadores por miembro */}
      <div style={{ display: 'flex', gap: 8 }}>
        {VIS_MIEMBROS.map(m => (
          <div key={m.id} style={{
            flex: 1, padding: '10px 8px', textAlign: 'center',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          }}>
            <span style={{
              display: 'inline-flex', width: 22, height: 22, borderRadius: '50%',
              alignItems: 'center', justifyContent: 'center', marginBottom: 4,
              background: m.color, color: '#fff', fontSize: 11, fontWeight: 700,
            }}>{m.inicial}</span>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {(vis[m.id] || []).length}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>{m.nombre}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <input
        type="search"
        placeholder="Buscar receta…"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10,
          border: '1px solid var(--border)', background: 'var(--surface-strong)',
          color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
        }}
      />

      {/* Lista */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '4px 16px' }}>
        {filtradas.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)', fontSize: 13 }}>
            Ninguna receta coincide con “{busqueda}”.
          </p>
        ) : (
          filtradas.map((r, i) => (
            <VisibilidadRow
              key={r.id}
              receta={r}
              vis={vis}
              onToggle={onToggle}
              isLast={i === filtradas.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}

window.VisibilidadScreen = VisibilidadScreen;
