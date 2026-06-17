// PerfilScreen.jsx — Perfil de miembro (Lote 10).
// Entrada: avatar del header. Cada uno ve el suyo; JP ve el de todos (selector).
// Contenido: avatar + nombre, color editable (se refleja en el header), preferencias,
// stats (calificó / promedio / en biblioteca), acceso a su historial, notificaciones
// (placeholder "próximamente"). Gestión de familia (agregar/quitar) solo para JP.
// Dos variaciones de layout vía tweak `perfilLayout`: 'hero' | 'compacto'.

const PERFIL_COLORES = ['#8a4a2f', '#74324a', '#3c4a6e', '#2e5d2e', '#7a5c1e', '#9a4d2e'];

// ─── Avatar ────────────────────────────────────────────────────────────────
function Avatar({ inicial, color, size = 64 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, lineHeight: 1,
    }}>{inicial}</span>
  );
}

// ─── Selector de color (solo perfil propio o JP) ─────────────────────────────
function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {PERFIL_COLORES.map(c => {
        const on = c === value;
        return (
          <button key={c} type="button" onClick={() => onChange(c)} aria-label={`Color ${c}`}
            style={{
              width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', padding: 0,
              background: c, border: on ? '2px solid var(--text-strong)' : '2px solid transparent',
              boxShadow: on ? '0 0 0 2px var(--bg)' : 'none',
              outline: on ? '1px solid var(--text-strong)' : 'none',
            }}/>
        );
      })}
    </div>
  );
}

// ─── Preferencias (chips editables) ──────────────────────────────────────────
function Preferencias({ prefs, editable, onAdd, onRemove }) {
  const [txt, setTxt] = React.useState('');
  const SUGER = ['No come pescado', 'Sin picante', 'Sin lácteos', 'Vegetariano', 'Sin gluten'];
  const add = (v) => { const t = (v ?? txt).trim(); if (t) { onAdd(t); setTxt(''); } };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: editable ? 10 : 0 }}>
        {prefs.length === 0 && !editable && (
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Sin preferencias cargadas.</span>
        )}
        {prefs.map((p, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 6px 5px 11px',
            borderRadius: 9999, background: 'var(--surface-alt)', color: 'var(--text)',
            fontSize: 12.5, fontWeight: 500,
          }}>
            {p}
            {editable && (
              <button type="button" onClick={() => onRemove(i)} aria-label={`Quitar ${p}`} style={{
                width: 18, height: 18, borderRadius: '50%', border: 0, cursor: 'pointer',
                background: 'var(--surface-strong)', color: 'var(--muted)', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, lineHeight: 1,
              }}>×</button>
            )}
          </span>
        ))}
      </div>
      {editable && (
        <>
          <div style={{ display: 'flex', gap: 7 }}>
            <input value={txt} onChange={e => setTxt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add(); }}
              placeholder="Agregar preferencia…"
              style={{
                flex: 1, padding: '8px 11px', borderRadius: 9, border: '1px solid var(--border)',
                background: 'var(--surface-strong)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
              }}/>
            <button type="button" onClick={() => add()} style={{
              padding: '0 14px', borderRadius: 9, border: 0, cursor: 'pointer', fontFamily: 'inherit',
              background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600,
            }}>Sumar</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {SUGER.filter(s => !prefs.includes(s)).map(s => (
              <button key={s} type="button" onClick={() => add(s)} style={{
                padding: '3px 10px', borderRadius: 9999, cursor: 'pointer', fontFamily: 'inherit',
                border: '1px dashed var(--border)', background: 'transparent', color: 'var(--muted-strong)', fontSize: 12,
              }}>+ {s}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stats ───────────────────────────────────────────────────────────────────
function StatsRow({ stats }) {
  const item = (n, label) => (
    <div style={{ flex: 1, textAlign: 'center', padding: '10px 6px' }}>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{n}</p>
      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)', lineHeight: 1.25 }}>{label}</p>
    </div>
  );
  return (
    <div style={{ display: 'flex', background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {item(stats.evaluados, 'platos calificó')}
      <div style={{ width: 1, background: 'var(--border)' }}/>
      {item(stats.promedio != null ? stats.promedio.toFixed(1) : '—', 'su promedio')}
      <div style={{ width: 1, background: 'var(--border)' }}/>
      {item(stats.enBiblioteca, 'en su biblioteca')}
    </div>
  );
}

// ─── Sección genérica ────────────────────────────────────────────────────────
function Seccion({ icon, titulo, accion, children }) {
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {icon && <Icon name={icon} size={16} style={{ color: 'var(--primary)' }}/>}
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-strong)', flex: 1 }}>{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  );
}

// ─── Mini historial del miembro ──────────────────────────────────────────────
function MiniHistorial({ entries, perfilId, onVerTodo }) {
  const conNota = entries.filter(e => e.calificaciones?.[perfilId] != null).slice(0, 3);
  if (conNota.length === 0) {
    return <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Todavía no calificó ningún plato.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {conNota.map(e => (
        <div key={e.idHist} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.nombreSeleccion}</span>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{e.fechaRealizada}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-soft)', borderRadius: 9999, padding: '2px 9px' }}>{e.calificaciones[perfilId]}</span>
        </div>
      ))}
      <button type="button" onClick={onVerTodo} style={{
        marginTop: 6, alignSelf: 'flex-start', background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
        color: 'var(--primary)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
      }}>Ver historial completo →</button>
    </div>
  );
}

// ─── Notificaciones (placeholder) ────────────────────────────────────────────
function NotifPlaceholder() {
  const rows = ['Avisos de compra', 'Recordatorio de cocción', 'Recordatorio de votar'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {rows.map((r, i) => (
        <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid var(--border-subtle)' : 'none', opacity: 0.55 }}>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{r}</span>
          <span style={{ width: 36, height: 20, borderRadius: 9999, background: 'var(--surface-alt)', border: '1px solid var(--border)', position: 'relative', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--muted)' }}/>
          </span>
        </div>
      ))}
      <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>Próximamente — todavía no están activas.</p>
    </div>
  );
}

// ─── Selector de miembro (solo JP) ───────────────────────────────────────────
function MemberSwitcher({ miembros, activo, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
      {miembros.map(m => {
        const on = m.id === activo;
        return (
          <button key={m.id} type="button" onClick={() => onSelect(m.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 4px',
            background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, width: 56,
          }}>
            <span style={{ position: 'relative' }}>
              <Avatar inicial={m.inicial} color={m.color} size={40}/>
              {on && <span style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '2px solid var(--primary)' }}/>}
            </span>
            <span style={{ fontSize: 11, color: on ? 'var(--primary)' : 'var(--muted)', fontWeight: on ? 700 : 500, maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.nombre.split(' ')[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Pantalla ────────────────────────────────────────────────────────────────
function PerfilScreen({
  miembros, perfilId, viewerId, isJP, layout = 'hero', historial = [],
  onCambiarPerfil, onCambiarColor, onAddPref, onRemovePref,
  onVerHistorial, onBack,
}) {
  const perfil = miembros.find(m => m.id === perfilId) || miembros[0];
  const esPropio = perfilId === viewerId;
  const puedeEditar = esPropio || isJP;
  const esYo = perfilId === viewerId;

  // Stats del miembro
  const calif = historial.filter(e => e.calificaciones?.[perfilId] != null).map(e => e.calificaciones[perfilId]);
  const stats = {
    evaluados: calif.length,
    promedio: calif.length ? calif.reduce((a, b) => a + b, 0) / calif.length : null,
    enBiblioteca: perfil.enBiblioteca,
  };

  const hero = layout === 'hero';

  const colorBlock = puedeEditar && (
    <div>
      <p style={{ margin: '0 0 7px', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Color de tu avatar</p>
      <ColorPicker value={perfil.color} onChange={c => onCambiarColor(perfil.id, c)}/>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Back */}
      {onBack && (
        <button type="button" onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
          background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit',
          color: 'var(--muted)', fontSize: 13, padding: 0,
        }}><Icon name="chevron-left" size={16}/> Volver</button>
      )}

      {/* Selector de miembro (solo JP) */}
      {isJP && (
        <MemberSwitcher miembros={miembros} activo={perfilId} onSelect={onCambiarPerfil}/>
      )}

      {/* Encabezado del perfil */}
      {hero ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '6px 0 2px' }}>
          <Avatar inicial={perfil.inicial} color={perfil.color} size={84}/>
          <div>
            <h1 style={{ margin: 0, fontSize: 23 }}>{perfil.nombre}</h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              {esYo ? 'Tu perfil' : 'Perfil de la familia'}{perfil.id === 'juanpablo' ? ' · planifica' : ''}
            </p>
          </div>
          {colorBlock}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
          <Avatar inicial={perfil.inicial} color={perfil.color} size={56}/>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 20 }}>{perfil.nombre}</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
              {esYo ? 'Tu perfil' : 'Perfil de la familia'}{perfil.id === 'juanpablo' ? ' · planifica' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Color (en compacto va como sección) */}
      {!hero && puedeEditar && <Seccion icon="user" titulo="Color de avatar">{<ColorPicker value={perfil.color} onChange={c => onCambiarColor(perfil.id, c)}/>}</Seccion>}

      {/* Stats */}
      <StatsRow stats={stats}/>

      {/* Preferencias */}
      <Seccion icon="carrot" titulo="Preferencias de comida">
        <Preferencias
          prefs={perfil.preferencias}
          editable={puedeEditar}
          onAdd={p => onAddPref(perfil.id, p)}
          onRemove={i => onRemovePref(perfil.id, i)}
        />
      </Seccion>

      {/* Historial del miembro */}
      <Seccion icon="history" titulo={esYo ? 'Mi historial' : 'Su historial'}>
        <MiniHistorial entries={historial} perfilId={perfilId} onVerTodo={onVerHistorial}/>
      </Seccion>

      {/* Notificaciones (placeholder) */}
      <Seccion icon="bell" titulo="Notificaciones">
        <NotifPlaceholder/>
      </Seccion>
    </div>
  );
}

window.PerfilScreen = PerfilScreen;
