// compras-variant-c.jsx — VARIANT C: "Recetas envueltas"
// Vista PRINCIPAL por receta: cada comida es un card grande con
// header rico (día, porciones, cocineros), ingredientes como chips
// compactos abajo. Tap chip = toggle. "✓ Lista" stamp cuando completa.
// Cards con band de color izquierda por día. Por góndola = vista alterna
// (mismos chips agrupados por góndola, sin recipe wrapping).

function VariantC({ items, onToggle }) {
  const [vista, setVista] = React.useState('receta'); // hero is receta

  const yaTengo  = items.filter((i) => i.yaTengo).length;
  const total    = items.length;
  const progreso = Math.round((yaTengo / total) * 100);

  return (
    <div style={{ paddingTop: 56, paddingBottom: 80, minHeight: '100%', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      {/* HEADER */}
      <div style={{ padding: '14px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontSize: 22, fontWeight: 700, color: 'var(--text-strong)',
              letterSpacing: '-0.015em', lineHeight: 1.1,
            }}>Lista de compras</h1>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Cocinamos {window.RECETAS.length} comidas esta semana
            </p>
          </div>
          <ProgressRingC done={yaTengo} total={total} />
        </div>
      </div>

      {/* Toggle */}
      <div style={{ padding: '12px 20px 4px', display: 'flex', gap: 8 }}>
        <PillToggle active={vista === 'receta'} onClick={() => setVista('receta')}>
          Por receta
        </PillToggle>
        <PillToggle active={vista === 'gondola'} onClick={() => setVista('gondola')}>
          Lista completa
        </PillToggle>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '10px 16px' }}>
        {vista === 'receta'
          ? window.RECETAS.map((r) => (
              <RecetaCardC
                key={r.id}
                receta={r}
                items={items.filter((i) => i.recetas.includes(r.id))}
                onToggle={onToggle}
              />
            ))
          : window.ORDEN_GONDOLA
              .map((sec) => ({ sec, items: items.filter((i) => i.seccion === sec) }))
              .filter((g) => g.items.length)
              .map((g) => (
                <GondolaCardC key={g.sec} seccion={g.sec} items={g.items} onToggle={onToggle} />
              ))}
      </div>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────

function ProgressRingC({ done, total }) {
  const r = 22, c = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  const pendientes = total - done;
  return (
    <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
      <svg width="54" height="54" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="27" cy="27" r={r} fill="none" stroke="var(--surface-alt)" strokeWidth="4.5" />
        <circle cx="27" cy="27" r={r} fill="none" stroke="var(--primary)" strokeWidth="4.5"
                strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
                style={{ transition: 'stroke-dashoffset 300ms ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>
          {pendientes}
        </span>
        <span style={{ fontSize: 8, color: 'var(--muted)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          faltan
        </span>
      </div>
    </div>
  );
}

function PillToggle({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px', fontSize: 13, fontWeight: 600,
        borderRadius: 999, cursor: 'pointer',
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? '#fff' : 'var(--muted)',
        border: active ? 'none' : '1px solid var(--border)',
        transition: 'all 160ms ease',
      }}
    >{children}</button>
  );
}

const DIA_COLOR = {
  Lun: 'oklch(0.55 0.10 25)',   // terracotta
  Mar: 'oklch(0.62 0.09 50)',   // amber
  Mié: 'oklch(0.55 0.08 130)',  // sage
  Jue: 'oklch(0.50 0.08 200)',  // teal warm
  Vie: 'oklch(0.45 0.10 320)',  // bordó hint
  Sab: 'oklch(0.55 0.07 260)',  // indigo warm
  Dom: 'oklch(0.50 0.09 15)',   // brick
};

function RecetaCardC({ receta, items, onToggle }) {
  const done = items.length > 0 && items.every((i) => i.yaTengo);
  const completedCount = items.filter((i) => i.yaTengo).length;
  const cocineros = receta.cocineros.map((id) => window.MIEMBROS[id]);
  const bandColor = DIA_COLOR[receta.dia] || 'var(--primary)';

  return (
    <div style={{
      background: 'var(--surface-strong)', borderRadius: 18,
      marginBottom: 14, overflow: 'hidden', position: 'relative',
      border: '1px solid var(--border-subtle)',
      transition: 'opacity 200ms ease',
      opacity: done ? 0.82 : 1,
    }}>
      {/* Left color band */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: bandColor,
      }} />

      {/* Recipe header */}
      <div style={{
        padding: '14px 16px 10px 18px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        {/* Day badge — bold */}
        <div style={{
          width: 44, flexShrink: 0, padding: '8px 0', borderRadius: 10,
          background: 'var(--surface-alt)', textAlign: 'center',
          lineHeight: 1,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: bandColor,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2,
          }}>{receta.dia}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>
            {28 + ['Lun','Mar','Mié','Jue','Vie','Sab','Dom'].indexOf(receta.dia)}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontSize: 17, fontWeight: 700, color: 'var(--text-strong)',
            letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 3,
          }}>{receta.nombre}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
              {receta.porciones} porc · {items.length} ingredientes
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <AvatarStackC miembros={cocineros} size={18} />
          </div>
        </div>

        {/* Stamp if done */}
        {done && (
          <span style={{
            padding: '4px 8px', borderRadius: 999,
            background: 'var(--ok-bg)', color: 'var(--ok-text)',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
            display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Lista
          </span>
        )}
      </div>

      {/* Ingredients as chips, grouped by góndola */}
      <div style={{ padding: '10px 14px 14px 18px' }}>
        {window.groupByGondola(items).map((g, gi) => (
          <div key={g.seccion} style={{ marginTop: gi === 0 ? 0 : 8 }}>
            <ChipSubheader seccion={g.seccion} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {g.items.map((it) => (
                <IngredienteChip key={it.id} item={it} onToggle={onToggle} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Progress fill at bottom */}
      {!done && completedCount > 0 && (
        <div style={{
          position: 'absolute', left: 0, bottom: 0, height: 3,
          background: 'var(--primary)',
          width: `${(completedCount / items.length) * 100}%`,
          transition: 'width 280ms ease',
        }} />
      )}
    </div>
  );
}

function ChipSubheader({ seccion }) {
  const meta = window.SECCIONES[seccion];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '6px 0 8px',
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 5, background: meta.color,
        color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>{meta.letra}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--muted)',
      }}>{seccion}</span>
    </div>
  );
}

function IngredienteChip({ item, onToggle }) {
  const done = item.yaTengo;
  return (
    <button
      onClick={() => onToggle(item.id)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 12px 8px 9px', borderRadius: 999,
        background: done ? 'var(--ok-bg)' : 'var(--surface-alt)',
        border: `1px solid ${done ? 'var(--ok-line)' : 'var(--border-subtle)'}`,
        color: done ? 'var(--ok-text)' : 'var(--text)',
        fontSize: 14, fontWeight: 500, cursor: 'pointer',
        textDecoration: done ? 'line-through' : 'none',
        transition: 'all 160ms ease', lineHeight: 1.25,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        background: done ? 'var(--ok-text)' : 'transparent',
        border: done ? 'none' : '1.5px solid var(--border)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 10, fontWeight: 700,
      }}>{done && '✓'}</span>
      <span>{item.nombre}</span>
      <span style={{
        fontSize: 12.5, color: done ? 'var(--ok-text)' : 'var(--muted)',
        fontVariantNumeric: 'tabular-nums', fontWeight: 600,
        marginLeft: 1, whiteSpace: 'nowrap',
      }}>· {item.cantidad}</span>
    </button>
  );
}

function GondolaCardC({ seccion, items, onToggle }) {
  const meta = window.SECCIONES[seccion];
  const pendientes = items.filter((i) => !i.yaTengo).length;
  return (
    <div style={{
      background: 'var(--surface-strong)', borderRadius: 18,
      marginBottom: 12, padding: '12px 14px 14px 16px',
      border: '1px solid var(--border-subtle)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: meta.color,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 8, background: meta.color,
          color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{meta.letra}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', flex: 1 }}>{seccion}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {pendientes ? `${pendientes} faltan` : '✓ todo listo'}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((it) => <IngredienteChip key={it.id} item={it} onToggle={onToggle} />)}
      </div>
    </div>
  );
}

function AvatarStackC({ miembros, size = 18 }) {
  return (
    <div style={{ display: 'inline-flex' }}>
      {miembros.map((m, i) => (
        <span key={m.id} style={{
          width: size, height: size, borderRadius: '50%', background: m.color,
          color: '#fff', fontSize: size * 0.5, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginLeft: i === 0 ? 0 : -5, border: '1.5px solid var(--surface-strong)',
        }}>{m.nombre[0]}</span>
      ))}
    </div>
  );
}

window.VariantC = VariantC;
