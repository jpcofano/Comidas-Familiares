// CocinarConQueTengoScreen.jsx — "¿Qué cocino con lo que tengo?"
// Matcher inverso: la familia marca lo que hay en casa (despensa persistente) y
// la pantalla ordena recetas por cercanía: cocinables ahora → con un cambio
// (usando las EQUIVALENCIAS del catálogo) → te falta 1 → te faltan 2+.
//
// Dos variaciones de la zona de resultados, vía tweak `matchLayout`:
//   'cercania' — lista agrupada por bucket (cuántas tareas para cocinar)
//   'ranking'  — cards con barra de match %, ordenadas por completitud
//
// Reusa los design tokens y el lenguaje de chips (letra + color) del kit.

// ─── Lógica de match ─────────────────────────────────────────────────────────

function computarMatch(recetas, idToIng, tengoSet) {
  return recetas.map(r => {
    const reqIds = r.usa || [];
    const tengo = [];
    const sustituye = [];   // { faltaId, conId }
    const falta = [];       // ids sin tener y sin sustituto

    reqIds.forEach(id => {
      if (tengoSet.has(id)) { tengo.push(id); return; }
      // ¿hay un equivalente en la despensa?
      const ing = idToIng[id];
      const equis = (ing && ing.equivalencias) || [];
      const conId = equis.find(e => tengoSet.has(e));
      if (conId) sustituye.push({ faltaId: id, conId });
      else falta.push(id);
    });

    const total = reqIds.length || 1;
    const cubiertos = tengo.length + sustituye.length;
    const score = cubiertos / total;
    const cocinable = falta.length === 0;
    const conCambio = cocinable && sustituye.length > 0;

    let bucket;
    if (cocinable && !conCambio) bucket = 'ahora';
    else if (conCambio)         bucket = 'cambio';
    else if (falta.length === 1) bucket = 'falta1';
    else                         bucket = 'falta2';

    return { receta: r, total, tengo, sustituye, falta, score, cocinable, conCambio, bucket };
  });
}

const BUCKET_META = {
  ahora:  { label: 'Cocinás ahora',  hint: 'Tenés todo',            tone: 'ok'   },
  cambio: { label: 'Con un cambio',  hint: 'Usando una sustitución', tone: 'info' },
  falta1: { label: 'Te falta 1',     hint: 'Casi lo tenés',          tone: 'warn' },
  falta2: { label: 'Te faltan varios', hint: 'Para otra vuelta',      tone: 'muted' },
};
const BUCKET_ORDER = ['ahora', 'cambio', 'falta1', 'falta2'];

// ─── Chip de despensa (toggle) ───────────────────────────────────────────────

function PantryChip({ ing, activo, onToggle }) {
  const meta = window.seccionMeta ? window.seccionMeta(ing.gondola) : { letra: ing.nombre[0], color: 'var(--muted)' };
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 11px 6px 7px', borderRadius: 9999,
        border: activo ? '1px solid transparent' : '1px solid var(--border)',
        background: activo ? 'var(--primary-soft)' : 'var(--surface-strong)',
        color: activo ? 'var(--primary)' : 'var(--muted-strong)',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        cursor: 'pointer', transition: 'background 120ms ease, color 120ms ease',
        minHeight: 34,
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        background: activo ? meta.color : 'var(--surface-alt)',
        color: activo ? '#fff' : 'var(--muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, lineHeight: 1,
      }}>{activo ? '✓' : meta.letra}</span>
      {ing.nombre}
    </button>
  );
}

// ─── Despensa (editor) ───────────────────────────────────────────────────────

function Despensa({ catalogo, tengoSet, onToggle, abierta, onToggleAbierta }) {
  const [q, setQ] = React.useState('');
  const enDespensa = catalogo.filter(i => tengoSet.has(i.id));
  const filtro = q.trim().toLowerCase();
  const visibles = filtro
    ? catalogo.filter(i => i.nombre.toLowerCase().includes(filtro))
    : catalogo;

  return (
    <section style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Encabezado tappable */}
      <button
        type="button"
        onClick={onToggleAbierta}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, padding: '13px 15px', background: 'transparent', border: 0,
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'var(--primary-soft)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="carrot" size={16}/></span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-strong)', lineHeight: 1.2 }}>
              Tu despensa
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', lineHeight: 1.3 }}>
              {enDespensa.length} {enDespensa.length === 1 ? 'ingrediente' : 'ingredientes'} en casa
            </span>
          </span>
        </div>
        <span style={{
          color: 'var(--muted)', flexShrink: 0,
          transform: abierta ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease',
          display: 'inline-flex',
        }}><Icon name="chevron-down" size={18}/></span>
      </button>

      {/* Cuerpo editable */}
      {abierta && (
        <div style={{ padding: '0 15px 15px', animation: 'cf-fade-in 180ms ease' }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar ingrediente…"
            style={{
              width: '100%', boxSizing: 'border-box', marginBottom: 12,
              padding: '9px 12px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--surface-strong)',
              fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {visibles.map(ing => (
              <PantryChip
                key={ing.id}
                ing={ing}
                activo={tengoSet.has(ing.id)}
                onToggle={() => onToggle(ing.id)}
              />
            ))}
            {visibles.length === 0 && (
              <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--muted)' }}>
                No hay ingredientes que coincidan con “{q}”.
              </p>
            )}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
            Tocá para sumar o sacar. Se guarda para la próxima.
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Detalle de "qué falta / qué cambiar" por receta ─────────────────────────

function FaltaSwapLines({ m, idToIng, compact }) {
  const nombre = id => (idToIng[id] ? idToIng[id].nombre : '—');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
      {m.sustituye.map((s, i) => (
        <div key={'s' + i} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 12.5, color: 'var(--info-text)',
        }}>
          <span style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
            background: 'var(--info-bg)', color: 'var(--info-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="swap" size={12}/></span>
          <span style={{ lineHeight: 1.35 }}>
            Usá <strong style={{ fontWeight: 600 }}>{nombre(s.conId)}</strong> en vez de {nombre(s.faltaId)}
          </span>
        </div>
      ))}
      {m.falta.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, fontSize: 12.5, color: 'var(--warn-text)' }}>
          <span style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0, alignSelf: 'flex-start',
            background: 'var(--warn-bg)', color: 'var(--warn-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
          }}>+</span>
          <span style={{ lineHeight: 1.35 }}>
            {compact ? 'Comprá ' : 'Te falta '}
            <strong style={{ fontWeight: 600 }}>{m.falta.map(nombre).join(', ')}</strong>
          </span>
        </div>
      )}
      {m.cocinable && !m.conCambio && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--ok-text)' }}>
          <span style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
            background: 'var(--ok-bg)', color: 'var(--ok-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
          }}>✓</span>
          <span>Tenés todos los ingredientes</span>
        </div>
      )}
    </div>
  );
}

// ─── Card de receta (compartida; el header cambia según layout) ──────────────

function RecetaMatchCard({ m, idToIng, layout, onAbrir }) {
  const r = m.receta;
  const pct = Math.round(m.score * 100);
  const ringColor = m.cocinable
    ? (m.conCambio ? 'var(--info-text)' : 'var(--ok-text)')
    : (m.bucket === 'falta1' ? 'var(--warn-text)' : 'var(--muted)');

  return (
    <button
      type="button"
      onClick={() => onAbrir(r)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'var(--surface-strong)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '13px 14px', cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-strong)', lineHeight: 1.25, textWrap: 'pretty' }}>
            {r.nombre}
          </h3>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '2px 10px', marginTop: 5,
            fontSize: 12.5, color: 'var(--muted)',
          }}>
            {r.proteina   && <span>{r.proteina}</span>}
            {r.tiempo     && <span>· {r.tiempo}</span>}
            {r.dificultad && <span>· {r.dificultad}</span>}
          </div>
        </div>

        {layout === 'ranking' ? (
          <MatchRing pct={pct} color={ringColor}/>
        ) : (
          <span style={{
            flexShrink: 0, fontSize: 11.5, fontWeight: 600,
            color: 'var(--muted-strong)', fontVariantNumeric: 'tabular-nums',
            background: 'var(--surface-alt)', borderRadius: 9999, padding: '3px 9px',
          }}>{m.tengo.length + m.sustituye.length}/{m.total}</span>
        )}
      </div>

      <FaltaSwapLines m={m} idToIng={idToIng} compact={layout === 'ranking'}/>

      {layout === 'ranking' && (
        <div style={{ height: 5, borderRadius: 9999, background: 'var(--surface-alt)', overflow: 'hidden', marginTop: 11 }}>
          <div style={{ width: pct + '%', height: '100%', background: ringColor, transition: 'width 240ms ease' }}/>
        </div>
      )}
    </button>
  );
}

function MatchRing({ pct, color }) {
  const r = 15, c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
      <svg width="38" height="38" viewBox="0 0 38 38">
        <circle cx="19" cy="19" r={r} fill="none" stroke="var(--surface-alt)" strokeWidth="4"/>
        <circle cx="19" cy="19" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform="rotate(-90 19 19)" style={{ transition: 'stroke-dashoffset 280ms ease' }}/>
      </svg>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10.5, fontWeight: 700, color: color, fontVariantNumeric: 'tabular-nums',
      }}>{pct}</span>
    </div>
  );
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

function CocinarConQueTengoScreen({ recetas, ingredientes, layout = 'cercania', onBack, onAbrirReceta }) {
  // Catálogo navegable (sin ambiguos ni duplicados de ejemplo)
  const catalogo = React.useMemo(
    () => ingredientes.filter(i => !i.ambiguo && !['i17', 'i18'].includes(i.id)),
    [ingredientes]
  );
  const idToIng = React.useMemo(() => {
    const m = {}; ingredientes.forEach(i => { m[i.id] = i; }); return m;
  }, [ingredientes]);

  // Despensa por defecto (realista: deja ver los 4 buckets)
  const DEFAULT_TENGO = ['i3', 'i4', 'i5', 'i6', 'i8', 'i9', 'i11', 'i12', 'i13'];
  const [tengo, setTengo] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cf-despensa') || 'null');
      if (Array.isArray(saved)) return saved;
    } catch (e) {}
    return DEFAULT_TENGO;
  });
  const [despensaAbierta, setDespensaAbierta] = React.useState(false);

  React.useEffect(() => {
    try { localStorage.setItem('cf-despensa', JSON.stringify(tengo)); } catch (e) {}
  }, [tengo]);

  const tengoSet = React.useMemo(() => new Set(tengo), [tengo]);
  function toggle(id) {
    setTengo(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  // Faceta Dieta (E9.0): filtra el universo de recetas antes de matchear
  const [dieta, setDieta] = React.useState('todas');
  const universo = recetas.filter(r => {
    if (dieta === 'veg')  return r.esVegetariano;
    if (dieta === 'keto') return r.esKeto;
    return true;
  });

  // Solo recetas con ingredientes mapeados
  const conUsa = universo.filter(r => (r.usa || []).length > 0);
  const matches = computarMatch(conUsa, idToIng, tengoSet);

  const ordenadas = [...matches].sort((a, b) => b.score - a.score || a.receta.nombre.localeCompare(b.receta.nombre));
  const cocinablesYa = matches.filter(m => m.bucket === 'ahora' || m.bucket === 'cambio').length;

  const porBucket = {};
  BUCKET_ORDER.forEach(b => { porBucket[b] = matches.filter(m => m.bucket === b)
    .sort((a, b2) => b2.score - a.score || a.receta.nombre.localeCompare(b2.receta.nombre)); });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Encabezado */}
      <header>
        {onBack && (
          <button type="button" onClick={onBack} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8,
            background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit',
            color: 'var(--muted)', fontSize: 13, padding: 0,
          }}>
            <Icon name="chevron-left" size={16}/> Inicio
          </button>
        )}
        <h1 style={{ margin: 0, fontSize: 21 }}>¿Qué cocino hoy?</h1>
        <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.45 }}>
          Con lo que tenés en casa podés cocinar{' '}
          <strong style={{ color: 'var(--text)' }}>{cocinablesYa}</strong>{' '}
          {cocinablesYa === 1 ? 'receta' : 'recetas'} de {matches.length}.
        </p>
      </header>

      {/* Despensa editable */}
      <Despensa
        catalogo={catalogo}
        tengoSet={tengoSet}
        onToggle={toggle}
        abierta={despensaAbierta}
        onToggleAbierta={() => setDespensaAbierta(o => !o)}
      />

      {/* Faceta Dieta (E9.0) */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { v: 'todas', label: 'Todas' },
          { v: 'veg',   label: 'Vegetariana' },
          { v: 'keto',  label: 'Keto' },
        ].map(o => {
          const on = dieta === o.v;
          return (
            <button key={o.v} type="button" onClick={() => setDieta(o.v)} style={{
              flex: 1, padding: '8px 0', borderRadius: 9999, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
              border: on ? '1px solid transparent' : '1px solid var(--border)',
              background: on ? 'var(--primary)' : 'var(--surface-strong)',
              color: on ? 'var(--on-primary)' : 'var(--muted-strong)',
              transition: 'background 120ms ease, color 120ms ease',
            }}>{o.label}</button>
          );
        })}
      </div>

      {/* Resultados */}
      {matches.length === 0 ? (
        <div style={{
          padding: '32px 16px', textAlign: 'center',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>
            No hay recetas {dieta === 'veg' ? 'vegetarianas' : dieta === 'keto' ? 'keto' : ''} para mostrar.
          </p>
        </div>
      ) : layout === 'ranking' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 -2px',
          }}>Ordenadas por lo que tenés</p>
          {ordenadas.map(m => (
            <RecetaMatchCard key={m.receta.id} m={m} idToIng={idToIng} layout="ranking" onAbrir={onAbrirReceta}/>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {BUCKET_ORDER.map(b => {
            const items = porBucket[b];
            if (!items.length) return null;
            const meta = BUCKET_META[b];
            return (
              <section key={b}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
                  <BucketDot tone={meta.tone}/>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>
                    {meta.label}
                  </h2>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {items.length}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted)' }}>{meta.hint}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map(m => (
                    <RecetaMatchCard key={m.receta.id} m={m} idToIng={idToIng} layout="cercania" onAbrir={onAbrirReceta}/>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BucketDot({ tone }) {
  const c = {
    ok:    'var(--ok-text)',
    info:  'var(--info-text)',
    warn:  'var(--warn-text)',
    muted: 'var(--muted)',
  }[tone] || 'var(--muted)';
  return <span style={{ width: 9, height: 9, borderRadius: '50%', background: c, flexShrink: 0 }}/>;
}

window.CocinarConQueTengoScreen = CocinarConQueTengoScreen;
