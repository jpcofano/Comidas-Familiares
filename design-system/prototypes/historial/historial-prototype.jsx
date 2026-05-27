// historial-prototype.jsx — Historial v2
// Mejoras vs actual:
// 1. Hero summary: total cocinadas + promedio general + chip de top mes
// 2. Filtro por resultado (chips: Todos / Top / Probar de nuevo / Malos)
// 3. Cards visuales: fecha rich, mini-stars del promedio, nota inline
// 4. Agrupado por mes (sticky headers)
// 5. Empty state amigable

const RESULTADO_TONES = {
  'Excelente':  { bg: 'var(--ok-bg)',    color: 'var(--ok-text)',    sym: '★' },
  'Muy bueno':  { bg: 'var(--ok-bg)',    color: 'var(--ok-text)',    sym: '★' },
  'Bueno':      { bg: 'var(--info-bg)',  color: 'var(--info-text)',  sym: '·' },
  'Regular':    { bg: 'var(--warn-bg)',  color: 'var(--warn-text)',  sym: '~' },
  'Malísimo':   { bg: 'var(--err-bg)',   color: 'var(--err-text)',   sym: '✕' },
};

const FILTROS = [
  { k: 'todos', label: 'Todos',           match: () => true },
  { k: 'top',   label: '★ Top',           match: (e) => ['Excelente', 'Muy bueno'].includes(e.resultado) },
  { k: 'ok',    label: 'Para repetir',    match: (e) => e.promedio >= 3.5 },
  { k: 'mal',   label: 'No repetir',      match: (e) => ['Regular', 'Malísimo'].includes(e.resultado) },
];

function Stars({ value, max = 5 }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span style={{ display: 'inline-flex', gap: 1, fontSize: 11, letterSpacing: '0.05em', color: 'var(--accent)' }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ opacity: i < full ? 1 : (i === full && half ? 0.5 : 0.18) }}>
          ★
        </span>
      ))}
    </span>
  );
}

function HistorialPrototype({ entries, onPick }) {
  const [busqueda, setBusqueda] = React.useState('');
  const [filtro, setFiltro]     = React.useState('todos');

  const filtradas = React.useMemo(() => {
    let xs = entries;
    const f = FILTROS.find((x) => x.k === filtro);
    if (f) xs = xs.filter(f.match);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      xs = xs.filter((e) =>
        e.nombreSeleccion.toLowerCase().includes(q) ||
        (e.nota || '').toLowerCase().includes(q)
      );
    }
    return xs;
  }, [entries, busqueda, filtro]);

  // Group by mes-año
  const porMes = React.useMemo(() => {
    const groups = new Map();
    for (const e of filtradas) {
      const key = e.fechaRealizada.slice(0, 7); // YYYY-MM
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtradas]);

  // Summary numbers
  const summary = React.useMemo(() => {
    const total = entries.length;
    const avg = total > 0
      ? (entries.reduce((s, e) => s + (e.promedio || 0), 0) / total).toFixed(1)
      : '—';
    const tops = entries.filter((e) => ['Excelente', 'Muy bueno'].includes(e.resultado)).length;
    return { total, avg, tops };
  }, [entries]);

  return (
    <div style={{
      paddingTop: 56, paddingBottom: 80, minHeight: '100%',
      background: 'var(--bg)', fontFamily: 'var(--font-sans)',
    }}>
      {/* HEADER */}
      <div style={{ padding: '16px 20px 0' }}>
        <p style={{
          margin: 0, fontSize: 11, fontWeight: 600,
          color: 'var(--muted)', textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>Historial</p>
        <h1 style={{
          margin: '4px 0 0', fontSize: 24, fontWeight: 700,
          color: 'var(--text-strong)', letterSpacing: '-0.02em',
          lineHeight: 1.15,
        }}>Cocinadas recientes</h1>
      </div>

      {/* SUMMARY 3 metrics */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8 }}>
        <SummaryCard label="Total" value={summary.total}/>
        <SummaryCard label="Promedio" value={summary.avg}
                     sub={<Stars value={parseFloat(summary.avg) || 0}/>}/>
        <SummaryCard label="Top" value={summary.tops}
                     sub={<span style={{ fontSize: 10, color: 'var(--muted)' }}>★ excelentes</span>}/>
      </div>

      {/* SEARCH */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 12,
          background: 'var(--surface-alt)',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="var(--muted)" strokeWidth="1.5"/>
            <path d="M11 11l3.5 3.5" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            placeholder="Buscar receta…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontSize: 14, color: 'var(--text)', padding: 0,
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* FILTROS horizontales scrollables */}
      <div style={{
        padding: '14px 16px 0',
        display: 'flex', gap: 6, overflowX: 'auto',
      }}>
        {FILTROS.map((f) => (
          <button
            key={f.k}
            onClick={() => setFiltro(f.k)}
            style={{
              padding: '7px 14px', borderRadius: 999,
              background: filtro === f.k ? 'var(--primary)' : 'var(--surface-alt)',
              color: filtro === f.k ? '#fff' : 'var(--text)',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'inherit',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ padding: '20px 16px 0' }}>
        {filtradas.length === 0 ? (
          <EmptyState busqueda={busqueda} filtro={filtro}/>
        ) : (
          porMes.map(([mesKey, items]) => (
            <div key={mesKey} style={{ marginBottom: 20 }}>
              <h2 style={{
                margin: '0 4px 10px', fontSize: 12, fontWeight: 700,
                color: 'var(--muted)', textTransform: 'uppercase',
                letterSpacing: '0.08em',
                position: 'sticky', top: 56, zIndex: 2,
                background: 'var(--bg)', padding: '6px 4px',
              }}>{window.formatMesAnio(items[0].fechaRealizada)} · <span style={{ color: 'var(--text)' }}>{items.length}</span></h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((entry) => (
                  <HistorialCard key={entry.idHist} entry={entry} onClick={() => onPick?.(entry)}/>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub }) {
  return (
    <div style={{
      flex: 1, padding: '14px 10px', borderRadius: 12,
      background: 'var(--surface-strong)',
      border: '1px solid var(--border-subtle)',
      textAlign: 'center', lineHeight: 1.1,
    }}>
      <p style={{
        margin: 0, fontSize: 10, fontWeight: 700,
        color: 'var(--muted)', textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>{label}</p>
      <p style={{
        margin: '6px 0 4px', fontSize: 22, fontWeight: 700,
        color: 'var(--text-strong)', letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</p>
      {sub && <div>{sub}</div>}
    </div>
  );
}

function HistorialCard({ entry, onClick }) {
  const tone = RESULTADO_TONES[entry.resultado] || RESULTADO_TONES['Bueno'];
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '12px 14px', borderRadius: 14,
      background: 'var(--surface-strong)',
      border: '1px solid var(--border-subtle)',
      cursor: 'pointer', textAlign: 'left',
      fontFamily: 'inherit',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      {/* Fecha block */}
      <div style={{
        flexShrink: 0, width: 48, padding: '8px 0',
        borderRadius: 10, background: 'var(--surface-alt)',
        textAlign: 'center', lineHeight: 1,
      }}>
        <p style={{
          margin: 0, fontSize: 9, fontWeight: 700,
          color: tone.color, textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>{window.formatFecha(entry.fechaRealizada).split(' ')[1]}</p>
        <p style={{
          margin: '3px 0 0', fontSize: 18, fontWeight: 700,
          color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums',
        }}>{window.formatFecha(entry.fechaRealizada).split(' ')[0]}</p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
          <p style={{
            margin: 0, fontSize: 15, fontWeight: 600,
            color: 'var(--text-strong)', lineHeight: 1.25,
            flex: 1, minWidth: 0,
          }}>{entry.nombreSeleccion}</p>
          <span style={{
            padding: '2px 8px', borderRadius: 999,
            background: tone.bg, color: tone.color,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
            textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
          }}>{entry.resultado}</span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 12, color: 'var(--muted)',
        }}>
          <Stars value={entry.promedio}/>
          <span style={{ color: 'var(--muted)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {entry.promedio.toFixed(1)}
          </span>
          {entry.ocasion && (
            <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.ocasion}
              </span>
            </>
          )}
        </div>

        {entry.nota && (
          <p style={{
            margin: '6px 0 0', fontSize: 12.5, color: 'var(--muted-strong)',
            fontStyle: 'italic', lineHeight: 1.45,
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>"{entry.nota}"</p>
        )}
      </div>

      <span style={{
        color: 'var(--muted)', fontSize: 18, alignSelf: 'center',
        flexShrink: 0,
      }}>›</span>
    </button>
  );
}

function EmptyState({ busqueda, filtro }) {
  return (
    <div style={{
      padding: '40px 20px', textAlign: 'center',
      background: 'var(--surface-strong)', borderRadius: 14,
      border: '1px dashed var(--border)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'var(--primary-soft)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 24, color: 'var(--primary)' }}>·</span>
      </div>
      <p style={{
        margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-strong)',
      }}>
        {busqueda ? 'Nada matchea esa búsqueda' :
         filtro !== 'todos' ? 'Nada en este filtro todavía' :
         'Todavía no cocinaste nada'}
      </p>
      <p style={{
        margin: '6px 0 0', fontSize: 13, color: 'var(--muted)',
        lineHeight: 1.5,
      }}>
        {busqueda ? 'Probá con otra palabra o limpiar el buscador.' :
         filtro !== 'todos' ? 'Cocíná algo y evaluálo para que aparezca acá.' :
         'Cuando cocines tu primer plato, vas a poder evaluarlo y aparecerá acá.'}
      </p>
    </div>
  );
}

window.HistorialPrototype = HistorialPrototype;
