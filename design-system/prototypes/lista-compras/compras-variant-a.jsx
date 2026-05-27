// compras-variant-a.jsx — VARIANT A: "Jerarquía + Bucket"
// — Por góndola con cards visualmente jerárquicas (color band + letter chip)
// — Tap entera la fila para marcar (hit area grande, one-handed)
// — Items con cantidad como número HERO + nombre secundario
// — Avatars de cocineros a la derecha cuando hay aporte cruzado
// — Ya tengo → al fondo en un BUCKET único colapsable

function VariantA({ items, onToggle }) {
  const [vista, setVista] = React.useState('gondola'); // gondola | receta
  const [bucketOpen, setBucketOpen] = React.useState(false);

  const pendientes = items.filter((i) => !i.yaTengo);
  const yaTengo    = items.filter((i) =>  i.yaTengo);
  const progreso   = Math.round((yaTengo.length / items.length) * 100);

  // Group pending items
  const grupos = vista === 'gondola'
    ? window.ORDEN_GONDOLA
        .map((sec) => ({ key: sec, items: pendientes.filter((i) => i.seccion === sec) }))
        .filter((g) => g.items.length)
    : window.RECETAS
        .map((r) => ({ key: r.id, recipe: r, items: pendientes.filter((i) => i.recetas.includes(r.id)) }))
        .filter((g) => g.items.length);

  // Active cocineros this week (avatar stack in header)
  const cocinerosSemana = Array.from(new Set(window.RECETAS.flatMap((r) => r.cocineros)))
    .map((id) => window.MIEMBROS[id]);

  return (
    <div style={{ paddingTop: 56, paddingBottom: 80, minHeight: '100%', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      {/* HEADER */}
      <div style={{ padding: '16px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Lista de<br/>compras
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
              Semana del 27 de mayo
            </p>
          </div>
          {/* Progress ring */}
          <ProgressRing pct={progreso} pendientes={pendientes.length} />
        </div>

        {/* Cocineros chip + total */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <AvatarStack miembros={cocinerosSemana} size={22} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            <b style={{ color: 'var(--text)' }}>{pendientes.length}</b> faltan ·{' '}
            <b style={{ color: 'var(--text)' }}>{yaTengo.length}</b> ya tengo
          </span>
        </div>
      </div>

      {/* TOGGLE */}
      <div style={{ padding: '0 20px 16px' }}>
        <Segmented
          options={[{ k: 'gondola', label: 'Lista completa' }, { k: 'receta', label: 'Por receta' }]}
          value={vista}
          onChange={setVista}
        />
      </div>

      {/* GROUPS */}
      <div style={{ padding: '0 16px' }}>
        {grupos.map((g) => (
          vista === 'gondola'
            ? <GondolaCard key={g.key} seccion={g.key} items={g.items} onToggle={onToggle} />
            : <RecetaCardA key={g.key} receta={g.recipe} items={g.items} onToggle={onToggle} />
        ))}
      </div>

      {/* BUCKET — Ya tengo */}
      {yaTengo.length > 0 && (
        <div style={{ padding: '8px 16px 24px' }}>
          <button
            onClick={() => setBucketOpen(!bucketOpen)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 14,
              background: bucketOpen ? 'var(--surface)' : 'var(--surface-alt)',
              border: '1px solid var(--border)', cursor: 'pointer',
              transition: 'background 180ms ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 6, background: 'var(--ok-bg)',
                border: '1.5px solid var(--ok-line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--ok-text)', fontSize: 14, fontWeight: 700, lineHeight: 1,
              }}>✓</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Ya tengo ({yaTengo.length})
              </span>
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 18, transition: 'transform 180ms ease', display: 'inline-block', transform: bucketOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
          </button>

          {bucketOpen && (
            <div style={{ marginTop: 8, padding: '4px 4px' }}>
              {yaTengo.map((it) => (
                <RowGotIt key={it.id} item={it} onToggle={onToggle} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────

function ProgressRing({ pct, pendientes }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: 64, height: 64 }}>
      <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-alt)" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--primary)" strokeWidth="5"
                strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
                style={{ transition: 'stroke-dashoffset 300ms ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' }}>{pendientes}</span>
        <span style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>faltan</span>
      </div>
    </div>
  );
}

function AvatarStack({ miembros, size = 22 }) {
  return (
    <div style={{ display: 'flex' }}>
      {miembros.map((m, i) => (
        <span key={m.id} style={{
          width: size, height: size, borderRadius: '50%', background: m.color,
          color: '#fff', fontSize: size * 0.42, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginLeft: i === 0 ? 0 : -7, border: '2px solid var(--bg)',
          letterSpacing: 0,
        }}>{m.nombre[0]}</span>
      ))}
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex', padding: 3, background: 'var(--surface-alt)',
      borderRadius: 12, gap: 2,
    }}>
      {options.map((o) => (
        <button key={o.k} onClick={() => onChange(o.k)} style={{
          flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 600,
          border: 'none', cursor: 'pointer', borderRadius: 9,
          background: value === o.k ? 'var(--surface-strong)' : 'transparent',
          color: value === o.k ? 'var(--text-strong)' : 'var(--muted)',
          boxShadow: value === o.k ? 'var(--shadow-header)' : 'none',
          transition: 'all 180ms ease',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function GondolaCard({ seccion, items, onToggle }) {
  const meta = window.SECCIONES[seccion];
  return (
    <div style={{
      background: 'var(--surface-strong)', borderRadius: 18,
      marginBottom: 12, padding: '14px 16px', border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 8, background: meta.color,
          color: '#fff', fontSize: 13, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{meta.letra}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)', flex: 1 }}>{seccion}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
          {items.length} <span style={{ opacity: 0.5 }}>items</span>
        </span>
      </div>
      {items.map((it, idx) => (
        <ItemRowA key={it.id} item={it} onToggle={onToggle} isLast={idx === items.length - 1} />
      ))}
    </div>
  );
}

function RecetaCardA({ receta, items, onToggle }) {
  const grupos = window.groupByGondola(items);
  return (
    <div style={{
      background: 'var(--surface-strong)', borderRadius: 18,
      marginBottom: 12, padding: '14px 16px', border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{
          padding: '2px 8px', borderRadius: 6, background: 'var(--accent-soft)',
          color: 'var(--accent)', fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
        }}>{receta.dia}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)', flex: 1 }}>{receta.nombre}</span>
        <AvatarStack miembros={receta.cocineros.map((id) => window.MIEMBROS[id])} size={18} />
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
        {receta.porciones} porciones · {items.length} ingredientes
      </p>
      {grupos.map((g, gi) => (
        <React.Fragment key={g.seccion}>
          <SubGondolaHeader seccion={g.seccion} count={g.items.length} />
          {g.items.map((it, idx) => (
            <ItemRowA
              key={it.id}
              item={it}
              onToggle={onToggle}
              isLast={idx === g.items.length - 1 && gi === grupos.length - 1}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function SubGondolaHeader({ seccion, count }) {
  const meta = window.SECCIONES[seccion];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 0 4px',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0,
      }} />
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--muted)',
      }}>{seccion}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </span>
    </div>
  );
}

function ItemRowA({ item, onToggle, isLast }) {
  const cocineros = window.cocinerosDe(item);
  const multiReceta = item.recetas.length > 1;

  return (
    <button
      onClick={() => onToggle(item.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '12px 0', border: 'none', background: 'transparent',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{
        flexShrink: 0, width: 22, height: 22, borderRadius: 6,
        border: '2px solid var(--border)', background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-strong)', lineHeight: 1.3 }}>
          {item.nombre}
        </div>
        {multiReceta && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            ↳ {item.recetas.length} recetas
          </div>
        )}
      </div>
      <span style={{
        fontSize: 13, fontWeight: 600, color: 'var(--text)',
        padding: '3px 10px', borderRadius: 999, background: 'var(--surface-alt)',
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
      }}>{item.cantidad}</span>
      {multiReceta && (
        <AvatarStack miembros={cocineros} size={18} />
      )}
    </button>
  );
}

function RowGotIt({ item, onToggle }) {
  return (
    <button
      onClick={() => onToggle(item.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '8px 12px', border: 'none', background: 'transparent',
        cursor: 'pointer', textAlign: 'left', opacity: 0.62,
      }}
    >
      <span style={{
        flexShrink: 0, width: 18, height: 18, borderRadius: 5, background: 'var(--ok-bg)',
        border: '1.5px solid var(--ok-line)', color: 'var(--ok-text)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, lineHeight: 1,
      }}>✓</span>
      <span style={{ flex: 1, fontSize: 14, color: 'var(--muted)', textDecoration: 'line-through' }}>
        {item.nombre}
      </span>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.cantidad}</span>
    </button>
  );
}

window.VariantA = VariantA;
