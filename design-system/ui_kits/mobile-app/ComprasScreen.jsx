// ComprasScreen.jsx — Lista de compras v2 (Variant C: "recetas envueltas").
// Vista por receta (default): card con day badge + título + cocineros + chips
// de ingredientes agrupados por góndola, stamp "✓ Lista", barra de progreso.
// Vista lista completa: items agrupados por góndola. Sin filtros — los
// completados se ven inline atenuados. Tap en un chip = marcar "ya tengo".

// ─── Meta de secciones (color + letra) ───────────────────────────────────────

const SECCION_META = {
  'Carnicería': { letra: 'C', color: '#b5532f' },
  'Pescadería': { letra: 'P', color: '#3c4a6e' },
  'Verdulería': { letra: 'V', color: '#2e5d2e' },
  'Almacén':    { letra: 'A', color: '#7d5610' },
  'Fiambrería': { letra: 'F', color: '#74324a' },
  'Lácteos':    { letra: 'L', color: '#3c4a6e' },
  'Panadería':  { letra: 'P', color: '#a06a2c' },
};
function seccionMeta(s) { return SECCION_META[s] || { letra: (s || '?').charAt(0), color: 'var(--muted-strong)' }; }

const DIA_COLOR = {
  Dom: 'oklch(0.50 0.09 15)',  Lun: 'oklch(0.55 0.10 25)',
  Mar: 'oklch(0.62 0.09 50)',  Mié: 'oklch(0.55 0.08 130)',
  Jue: 'oklch(0.50 0.08 200)', Vie: 'oklch(0.45 0.10 320)',
  Sáb: 'oklch(0.55 0.07 260)',
};

// ─── CompraGondolaChip ──────────────────────────────────────────────────────────────

function CompraGondolaChip({ seccion, size = 22 }) {
  const meta = seccionMeta(seccion);
  return (
    <span aria-label={seccion} style={{
      width: size, height: size, borderRadius: size <= 18 ? 5 : 7,
      background: meta.color, color: '#fff', fontSize: size * 0.55, fontWeight: 700,
      lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>{meta.letra}</span>
  );
}

function CompraIngredienteSubheader({ seccion }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 0 8px' }}>
      <CompraGondolaChip seccion={seccion} size={18}/>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {seccion}
      </span>
    </div>
  );
}

// ─── CompraIngredienteChip (tap-eable) ──────────────────────────────────────────────

function CompraIngredienteChip({ item, onToggle }) {
  const done = item.yaTengo;
  const esAgregado = (item.recetas || 1) > 1;
  return (
    <button onClick={onToggle} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 12px 8px 9px', borderRadius: 999,
      background: done ? 'var(--ok-bg)' : 'var(--surface-alt)',
      border: `1px solid ${done ? 'var(--ok-line)' : 'var(--border-subtle)'}`,
      color: done ? 'var(--ok-text)' : 'var(--text)',
      fontSize: 14, fontWeight: 500, cursor: 'pointer',
      textDecoration: done ? 'line-through' : 'none',
      transition: 'all 160ms ease', lineHeight: 1.25, whiteSpace: 'nowrap', fontFamily: 'inherit',
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        background: done ? 'var(--ok-text)' : 'transparent',
        border: done ? 'none' : '1.5px solid var(--border)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 10, fontWeight: 700,
      }}>{done && '✓'}</span>
      <span>{item.nombre}</span>
      {item.cantidad && (
        <span style={{ fontSize: 12.5, color: done ? 'var(--ok-text)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, marginLeft: 1 }}>
          · {item.cantidad}
        </span>
      )}
      {esAgregado && (
        <span style={{
          fontSize: 10.5, fontWeight: 600, color: done ? 'var(--ok-text)' : 'var(--muted)',
          background: done ? 'transparent' : 'var(--surface)',
          border: `1px solid ${done ? 'var(--ok-line)' : 'var(--border)'}`,
          borderRadius: 999, padding: '1px 5px', whiteSpace: 'nowrap', lineHeight: 1.4,
        }}>+{item.recetas} recetas</span>
      )}
    </button>
  );
}

// ─── CompraProgressRing ─────────────────────────────────────────────────────────────

function CompraItem({ item, onToggle }) {
  const subs = item.sustitutos || [];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <CompraIngredienteChip item={item} onToggle={onToggle}/>
      {!item.yaTengo && subs.length > 0 && (
        <button
          onClick={onToggle}
          aria-label={`Tenés ${subs.join(' o ')} en casa`}
          title={`Usá ${subs.join(' o ')} — marcar como que ya lo tenés`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '7px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
            background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid transparent',
            fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
          }}
        >
          <Icon name="swap" size={12}/> o {subs.join(' o ')}
        </button>
      )}
    </span>
  );
}

function CompraProgressRing({ done, total }) {
  const r = 22, c = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  const faltan = total - done;
  return (
    <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
      <svg width="54" height="54" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="27" cy="27" r={r} fill="none" stroke="var(--surface-alt)" strokeWidth="4.5"/>
        <circle cx="27" cy="27" r={r} fill="none" stroke="var(--primary)" strokeWidth="4.5"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{faltan}</span>
        <span style={{ fontSize: 8, color: 'var(--muted)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>faltan</span>
      </div>
    </div>
  );
}

// ─── CompraPillToggle ───────────────────────────────────────────────────────────────

function CompraPillToggle({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', fontSize: 13, fontWeight: 600, borderRadius: 999, cursor: 'pointer',
      background: active ? 'var(--primary)' : 'transparent',
      color: active ? '#fff' : 'var(--muted)',
      border: active ? 'none' : '1px solid var(--border)',
      transition: 'all 160ms ease', fontFamily: 'inherit',
    }}>{children}</button>
  );
}

// ─── Agrupar items por góndola ────────────────────────────────────────────────

function groupByGondola(items) {
  const order = [], groups = {};
  items.forEach(it => {
    if (!groups[it.seccion]) { groups[it.seccion] = []; order.push(it.seccion); }
    groups[it.seccion].push(it);
  });
  return order.map(seccion => ({ seccion, items: groups[seccion] }));
}

// ─── CompraRecetaCard (vista por receta) ────────────────────────────────────────────

function CompraRecetaCard({ plan, onToggle }) {
  const total = plan.items.length;
  const completados = plan.items.filter(i => i.yaTengo).length;
  const done = total > 0 && completados === total;
  const bandColor = DIA_COLOR[plan.dia] || 'var(--primary)';
  const grupos = groupByGondola(plan.items);

  return (
    <div style={{
      background: 'var(--surface-strong)', borderRadius: 18, marginBottom: 14,
      overflow: 'hidden', position: 'relative', border: '1px solid var(--border-subtle)',
      opacity: done ? 0.82 : 1, transition: 'opacity 200ms ease',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: bandColor }}/>

      <div style={{ padding: '14px 16px 10px 18px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid var(--border-subtle)' }}>
        {plan.dia ? (
          <div style={{ width: 44, flexShrink: 0, padding: '8px 0', borderRadius: 10, background: 'var(--surface-alt)', textAlign: 'center', lineHeight: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: bandColor, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{plan.dia}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{plan.diaNum}</div>
          </div>
        ) : <div style={{ width: 44, flexShrink: 0 }}/>}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-.01em', lineHeight: 1.2, marginBottom: 3 }}>{plan.nombre}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{plan.porciones} porc · {total} ingredientes</span>
            {plan.asignaciones.length > 0 && (
              <>
                <span style={{ color: 'var(--border)' }}>·</span>
                <AvatarStack names={plan.asignaciones} size={18}/>
              </>
            )}
          </div>
        </div>

        {done && (
          <span style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--ok-bg)', color: 'var(--ok-text)', fontSize: 11, fontWeight: 700, letterSpacing: '.02em', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            ✓ Lista
          </span>
        )}
      </div>

      <div style={{ padding: '10px 14px 14px 18px' }}>
        {grupos.map((g, gi) => (
          <div key={g.seccion} style={{ marginTop: gi === 0 ? 0 : 8 }}>
            <CompraIngredienteSubheader seccion={g.seccion}/>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {g.items.map(item => (
                <CompraItem key={item.id} item={item} onToggle={() => onToggle(plan.idPlan, item.id)}/>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!done && completados > 0 && (
        <div style={{ position: 'absolute', left: 0, bottom: 0, height: 3, background: 'var(--primary)', width: `${(completados / total) * 100}%`, transition: 'width 280ms ease' }}/>
      )}
    </div>
  );
}

// ─── CompraGondolaCard (vista lista completa) ───────────────────────────────────────

function CompraGondolaCard({ seccion, items, onToggle }) {
  const pendientes = items.filter(i => !i.yaTengo).length;
  return (
    <div style={{ background: 'var(--surface-strong)', borderRadius: 18, marginBottom: 12, padding: '12px 14px 14px 16px', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <CompraGondolaChip seccion={seccion} size={26}/>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', flex: 1 }}>{seccion}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {pendientes > 0 ? `${pendientes} faltan` : '✓ todo listo'}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(item => (
          <CompraItem key={item.id} item={item} onToggle={() => onToggle(item._idPlan, item.id)}/>
        ))}
      </div>
    </div>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

function ComprasScreen({ planes: initialPlanes }) {
  const [planes, setPlanes] = React.useState(initialPlanes);
  const [modoVista, setModoVista] = React.useState('receta'); // receta | gondola

  function toggle(idPlan, itemId) {
    setPlanes(prev => prev.map(p => p.idPlan !== idPlan ? p : {
      ...p, items: p.items.map(it => it.id === itemId ? { ...it, yaTengo: !it.yaTengo } : it),
    }));
  }

  const allItems = planes.flatMap(p => p.items.map(it => ({ ...it, _idPlan: p.idPlan })));
  const total = allItems.length;
  const yaTengo = allItems.filter(i => i.yaTengo).length;
  const porGondola = groupByGondola(allItems);

  return (
    <div style={{ paddingBottom: 'var(--space-4)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-.015em', lineHeight: 1.1, margin: 0 }}>
            Lista de compras
          </h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            {planes.length} {planes.length === 1 ? 'comida' : 'comidas'} esta semana
          </p>
        </div>
        {total > 0 && <CompraProgressRing done={yaTengo} total={total}/>}
      </div>

      {/* Toggle vista */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <CompraPillToggle active={modoVista === 'receta'} onClick={() => setModoVista('receta')}>Por receta</CompraPillToggle>
        <CompraPillToggle active={modoVista === 'gondola'} onClick={() => setModoVista('gondola')}>Lista completa</CompraPillToggle>
      </div>

      {/* Contenido */}
      {modoVista === 'receta'
        ? planes.map(plan => <CompraRecetaCard key={plan.idPlan} plan={plan} onToggle={toggle}/>)
        : porGondola.map(g => <CompraGondolaCard key={g.seccion} seccion={g.seccion} items={g.items} onToggle={toggle}/>)}
    </div>
  );
}

window.ComprasScreen = ComprasScreen;
