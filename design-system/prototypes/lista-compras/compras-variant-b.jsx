// compras-variant-b.jsx — VARIANT B: "Pasillos enfocados"
// Modo supermercado one-handed. Una góndola por vez, fila grande,
// nombre de pasillo HUGE, chips de pasillos arriba para saltar.
// Ya tengo cae al fondo del pasillo actual, atenuado.
// "Por receta" cambia a un swipe equivalente entre recetas.

function VariantB({ items, onToggle }) {
  const [vista, setVista] = React.useState('gondola');
  const [idx, setIdx] = React.useState(0);

  // Build buckets: array of { key, label, items }
  const buckets = React.useMemo(() => {
    if (vista === 'gondola') {
      return window.ORDEN_GONDOLA
        .map((sec) => ({
          key: sec, label: sec,
          color: window.SECCIONES[sec].color,
          letra: window.SECCIONES[sec].letra,
          items: items.filter((i) => i.seccion === sec),
        }))
        .filter((b) => b.items.length);
    }
    return window.RECETAS
      .map((r) => ({
        key: r.id, label: r.nombre, recipe: r,
        color: 'var(--primary)', letra: r.dia[0],
        items: items.filter((i) => i.recetas.includes(r.id)),
      }))
      .filter((b) => b.items.length);
  }, [items, vista]);

  const safeIdx = Math.min(idx, buckets.length - 1);
  const bucket = buckets[safeIdx];

  React.useEffect(() => { if (idx >= buckets.length) setIdx(0); }, [buckets.length]);

  if (!bucket) return null;

  const pendientes = bucket.items.filter((i) => !i.yaTengo);
  const yaTengo    = bucket.items.filter((i) =>  i.yaTengo);
  const completed  = pendientes.length === 0;

  // Global progress
  const totalY = items.filter((i) => i.yaTengo).length;
  const totalP = items.length;

  return (
    <div style={{
      paddingTop: 56, paddingBottom: 90, minHeight: '100%',
      background: 'var(--bg)', fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top: vista toggle + dots indicator */}
      <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => setVista(vista === 'gondola' ? 'receta' : 'gondola')}
          style={{
            padding: '6px 10px', fontSize: 12, fontWeight: 600,
            borderRadius: 999, background: 'var(--surface-alt)',
            color: 'var(--text)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 4h10M1 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {vista === 'gondola' ? 'Lista completa' : 'Por receta'}
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {buckets.map((_, i) => (
            <span key={i} style={{
              width: i === safeIdx ? 18 : 5, height: 5, borderRadius: 999,
              background: i === safeIdx ? 'var(--primary)' : 'var(--border)',
              transition: 'all 220ms ease',
            }} />
          ))}
        </div>

        <span style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
          {totalY}/{totalP}
        </span>
      </div>

      {/* Aisle hero header */}
      <div style={{
        padding: '24px 24px 16px', display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontWeight: 600 }}>
            Pasillo {safeIdx + 1} de {buckets.length}
          </p>
          <h1 style={{
            fontSize: 36, fontWeight: 700, lineHeight: 1.05,
            color: 'var(--text-strong)', letterSpacing: '-0.025em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{bucket.label}</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6, fontWeight: 500 }}>
            {completed ? (
              <span style={{ color: 'var(--ok-text)' }}>✓ Pasillo completo</span>
            ) : (
              <>{pendientes.length} faltan · {yaTengo.length} ya tengo</>
            )}
          </p>
        </div>
        {/* Big letter chip */}
        <span style={{
          width: 56, height: 56, borderRadius: 14, background: bucket.color,
          color: '#fff', fontSize: 30, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          letterSpacing: '-0.02em', flexShrink: 0,
        }}>{bucket.letra}</span>
      </div>

      {/* If receta: show day/cocineros chip row */}
      {vista === 'receta' && bucket.recipe && (
        <div style={{ padding: '0 24px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            padding: '3px 9px', borderRadius: 6, background: 'var(--accent-soft)',
            color: 'var(--accent)', fontSize: 11, fontWeight: 700,
          }}>{bucket.recipe.dia} · {bucket.recipe.porciones} porciones</span>
          <AvatarStackB miembros={bucket.recipe.cocineros.map((id) => window.MIEMBROS[id])} size={20} />
        </div>
      )}

      {/* Big rows — pending */}
      <div style={{ flex: 1, padding: '8px 16px' }}>
        {vista === 'receta'
          ? window.groupByGondola(pendientes).map((g) => (
              <React.Fragment key={g.seccion}>
                <BigSubheader seccion={g.seccion} count={g.items.length} />
                {g.items.map((it) => <BigRow key={it.id} item={it} onToggle={onToggle} />)}
              </React.Fragment>
            ))
          : pendientes.map((it) => <BigRow key={it.id} item={it} onToggle={onToggle} />)
        }

        {/* Got it band — collapsed inline at bottom of this aisle */}
        {yaTengo.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{
              fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase',
              letterSpacing: '0.08em', padding: '8px 8px 4px', fontWeight: 600,
            }}>Ya tengo en este pasillo ({yaTengo.length})</p>
            {yaTengo.map((it) => (
              <BigRow key={it.id} item={it} onToggle={onToggle} done />
            ))}
          </div>
        )}
      </div>

      {/* Nav fixed at bottom */}
      <div style={{
        position: 'sticky', bottom: 20, padding: '0 16px',
        display: 'flex', gap: 10, marginTop: 12,
      }}>
        <NavButton
          disabled={safeIdx === 0}
          onClick={() => setIdx(safeIdx - 1)}
          direction="prev"
          label={safeIdx > 0 ? buckets[safeIdx - 1].label : 'Inicio'}
        />
        <NavButton
          disabled={safeIdx === buckets.length - 1}
          onClick={() => setIdx(safeIdx + 1)}
          direction="next"
          label={safeIdx < buckets.length - 1 ? buckets[safeIdx + 1].label : 'Fin'}
          primary
        />
      </div>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────

function BigSubheader({ seccion, count }) {
  const meta = window.SECCIONES[seccion];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 12px 6px',
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 5, background: meta.color,
        color: '#fff', fontSize: 10, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>{meta.letra}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--muted)', flex: 1,
      }}>{seccion}</span>
      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </span>
    </div>
  );
}

function BigRow({ item, onToggle, done = false }) {
  const cocineros = window.cocinerosDe(item);
  return (
    <button
      onClick={() => onToggle(item.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%',
        padding: '14px 12px', border: 'none', textAlign: 'left',
        background: done ? 'transparent' : 'var(--surface-strong)',
        borderRadius: 14, marginBottom: 6, cursor: 'pointer',
        opacity: done ? 0.5 : 1,
        boxShadow: done ? 'none' : '0 1px 3px rgba(31, 26, 22, 0.04)',
      }}
    >
      {/* Big checkbox */}
      <span style={{
        flexShrink: 0, width: 30, height: 30, borderRadius: 9,
        border: done ? '0' : '2px solid var(--border)',
        background: done ? 'var(--ok-bg)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ok-text)', fontSize: 18, fontWeight: 700, lineHeight: 1,
      }}>{done && '✓'}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 17, fontWeight: 600, color: 'var(--text-strong)',
          lineHeight: 1.25, textDecoration: done ? 'line-through' : 'none',
        }}>{item.nombre}</div>
        {item.recetas.length > 1 && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            para {item.recetas.length} comidas
          </div>
        )}
      </div>

      {/* Cantidad as hero number */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <CantidadHero cantidad={item.cantidad} done={done} />
      </div>

      {item.recetas.length > 1 && !done && (
        <AvatarStackB miembros={cocineros} size={20} />
      )}
    </button>
  );
}

function CantidadHero({ cantidad, done }) {
  // Split number from unit, e.g. "1.5 kg" → "1.5", "kg"
  const m = cantidad.match(/^([\d.]+|\d+)\s*(.+)$/);
  if (!m) return <span style={{ fontSize: 14, fontWeight: 600 }}>{cantidad}</span>;
  return (
    <div style={{ lineHeight: 1, color: done ? 'var(--muted)' : 'var(--text-strong)' }}>
      <span style={{
        fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
      }}>{m[1]}</span>
      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 3, fontWeight: 600 }}>{m[2]}</span>
    </div>
  );
}

function AvatarStackB({ miembros, size = 20 }) {
  return (
    <div style={{ display: 'flex' }}>
      {miembros.map((m, i) => (
        <span key={m.id} style={{
          width: size, height: size, borderRadius: '50%', background: m.color,
          color: '#fff', fontSize: size * 0.45, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginLeft: i === 0 ? 0 : -6, border: '2px solid var(--surface-strong)',
        }}>{m.nombre[0]}</span>
      ))}
    </div>
  );
}

function NavButton({ disabled, onClick, direction, label, primary }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: direction === 'prev' ? '0 0 auto' : 1,
        display: 'flex', alignItems: 'center', justifyContent: direction === 'prev' ? 'center' : 'space-between',
        gap: 8, padding: '13px 16px', borderRadius: 14,
        background: primary ? 'var(--primary)' : 'var(--surface-strong)',
        color: primary ? '#fff' : 'var(--text)',
        border: primary ? 'none' : '1px solid var(--border)',
        fontWeight: 600, fontSize: 14, cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        boxShadow: primary ? '0 4px 12px rgba(138, 74, 47, 0.25)' : 'none',
      }}
    >
      {direction === 'prev' ? (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      ) : (
        <>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            <span style={{ opacity: 0.75, fontSize: 11, fontWeight: 500, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Siguiente</span>
            {label}
          </span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </>
      )}
    </button>
  );
}

window.VariantB = VariantB;
