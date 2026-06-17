// HistorialScreen.jsx — sincronizado con el git:
// SummaryMetrics (Total/Máximo/Top) interactivas: cada tarjeta ES el filtro
// (Total→Todos, Máximo→Para repetir, Top→★Top), con estado activo y toggle-back.
// SIN fila de chips. · agrupación por mes con header sticky · HistorialCard con
// bloque de fecha + estrellas + resultado + "queSalióBien" + Tu nota. EmptyState contextual.
// Filtro Para repetir por campo `repetir` (Sí) — la respuesta real de la familia.

// ─── Tones por resultado ──────────────────────────────────────────────────────

const RESULTADO_TONES = {
  'Excelente': { bg: 'var(--ok-bg)',   color: 'var(--ok-text)' },
  'Muy bueno': { bg: 'var(--ok-bg)',   color: 'var(--ok-text)' },
  'Bueno':     { bg: 'var(--info-bg)', color: 'var(--info-text)' },
  'Regular':   { bg: 'var(--warn-bg)', color: 'var(--warn-text)' },
  'Malísimo':  { bg: 'var(--err-bg)',  color: 'var(--err-text)' },
  '':          { bg: 'var(--surface-alt)', color: 'var(--muted)' },
};

// ─── Helpers de fecha ("12 may 2026") ─────────────────────────────────────────

const MES_ABBR = { ene:0, feb:1, mar:2, abr:3, may:4, jun:5, jul:6, ago:7, sep:8, oct:9, nov:10, dic:11 };
const MES_NOMBRE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function parseFecha(str) {
  // "12 may 2026" → { dia:'12', mesAbbr:'MAY', mesIdx:4, anio:2026, key:'2026-05' }
  const m = (str || '').trim().toLowerCase().match(/(\d{1,2})\s+([a-záéíóú]{3})\s+(\d{4})/);
  if (!m) return { dia: '–', mesAbbr: '', mesIdx: 0, anio: 0, key: '0000-00' };
  const dia = m[1];
  const mesIdx = MES_ABBR[m[2]] ?? 0;
  const anio = parseInt(m[3], 10);
  return {
    dia, mesAbbr: m[2].toUpperCase(), mesIdx, anio,
    key: `${anio}-${String(mesIdx + 1).padStart(2, '0')}`,
  };
}
function mesLabel(key) {
  const [anio, mm] = key.split('-');
  return `${MES_NOMBRE[parseInt(mm, 10) - 1]} ${anio}`;
}

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ value, scale = 10, max = 5 }) {
  const normalized = (value / scale) * max;
  return (
    <span style={{ display: 'inline-flex', gap: 1, alignItems: 'center' }} aria-label={`${value.toFixed(1)} de ${scale}`}>
      {Array.from({ length: max }, (_, i) => {
        const full = i + 1 <= normalized;
        const half = !full && i + 0.5 <= normalized;
        return (
          <svg key={i} width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block' }}>
            <polygon points="6,1 7.5,4.5 11.5,4.5 8.5,7 9.5,11 6,8.5 2.5,11 3.5,7 0.5,4.5 4.5,4.5"
              fill="var(--accent)" opacity={full ? 1 : half ? 0.5 : 0.18}/>
          </svg>
        );
      })}
    </span>
  );
}

// ─── SummaryMetrics ───────────────────────────────────────────────────────────

function MetricCard({ label, children, active, onClick }) {
  const interactive = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      style={{
        flex: 1, minWidth: 0, textAlign: 'left', fontFamily: 'inherit',
        background: active ? 'var(--primary-soft)' : 'var(--surface-strong)',
        border: `${active ? 2 : 1}px solid ${active ? 'var(--primary)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        padding: active ? '9px 11px' : '10px 12px',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'border-color var(--t-fast), background var(--t-fast)',
      }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: active ? 'var(--primary)' : 'var(--muted)', margin: '0 0 4px' }}>{label}</p>
      {children}
    </button>
  );
}

// Mapeo tarjeta → filtro (sincronizado con los chips)
const METRIC_FILTRO = { total: 'todos', maximo: 'ok', top: 'top' };

function SummaryMetrics({ entries, activo, onSelect }) {
  const total = entries.length;
  const maximo = total > 0 ? Math.max(...entries.map(e => e.promedio)) : 0;
  const topCount = entries.filter(e => e.resultado === 'Excelente' || e.resultado === 'Muy bueno').length;
  const big = { fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', margin: 0, lineHeight: 1 };

  // Tocar la tarjeta activa de nuevo → vuelve a "todos"
  const toggle = (key) => {
    const target = METRIC_FILTRO[key];
    onSelect(activo === target ? 'todos' : target);
  };

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-4)' }}>
      <MetricCard label="Total" active={activo === 'todos'} onClick={() => toggle('total')}>
        <p style={big}>{total}</p>
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>platos</p>
      </MetricCard>
      <MetricCard label="Máximo" active={activo === 'ok'} onClick={() => toggle('maximo')}>
        <p style={big}>{total > 0 ? maximo.toFixed(1) : '—'}</p>
        {total > 0 && <div style={{ marginTop: 4 }}><Stars value={maximo} scale={10}/></div>}
      </MetricCard>
      <MetricCard label="Top" active={activo === 'top'} onClick={() => toggle('top')}>
        <p style={big}>{topCount}</p>
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>★ excelentes</p>
      </MetricCard>
    </div>
  );
}

// ─── FilterChips ──────────────────────────────────────────────────────────────

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'top',   label: '★ Top' },
  { id: 'ok',    label: 'Para repetir' },
  { id: 'mal',   label: 'No repetir' },
];
function matchFiltro(id, e) {
  if (id === 'top') return e.resultado === 'Excelente' || e.resultado === 'Muy bueno';
  if (id === 'ok')  return e.repetir === 'Sí';
  if (id === 'mal') return e.repetir === 'No';
  return true;
}

function FilterChips({ activo, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
      {FILTROS.map(f => (
        <button key={f.id} onClick={() => onChange(f.id)} style={{
          padding: '6px 14px', borderRadius: 9999, border: 0, fontFamily: 'inherit',
          fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
          transition: 'background var(--t-fast), color var(--t-fast)',
          background: f.id === activo ? 'var(--primary)' : 'var(--surface-alt)',
          color: f.id === activo ? '#fff' : 'var(--text)',
        }}>{f.label}</button>
      ))}
    </div>
  );
}

// ─── HistorialCard (bloque de fecha + estrellas + Tu nota) ────────────────────

function HistorialCard({ entry, miembroId, onOpen }) {
  const f = parseFecha(entry.fechaRealizada);
  const tone = RESULTADO_TONES[entry.resultado] || RESULTADO_TONES[''];
  const miNota = entry.calificaciones?.[miembroId];
  const [hover, setHover] = React.useState(false);

  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', width: '100%', alignItems: 'center', gap: 14,
        padding: '12px 14px', background: 'var(--surface-strong)',
        border: `1px solid ${hover ? 'var(--line)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)', marginBottom: 8, cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left', transition: 'border-color var(--t-fast)',
      }}>
      {/* Bloque de fecha */}
      <div style={{ width: 48, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: tone.color, marginBottom: 2 }}>{f.mesAbbr}</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{f.dia}</span>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)', margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.nombreSeleccion}
          </p>
          {entry.resultado && (
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', padding: '2px 7px', borderRadius: 9999, background: tone.bg, color: tone.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {entry.resultado}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: entry.queSalioBien ? 4 : 0 }}>
          <Stars value={entry.promedio} scale={10}/>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{entry.promedio.toFixed(1)}</span>
          {miNota != null && (
            <>
              <span style={{ color: 'var(--border)', fontSize: 12 }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Tu nota <strong style={{ color: 'var(--text)' }}>{miNota}</strong></span>
            </>
          )}
          {entry.ocasion && (
            <>
              <span style={{ color: 'var(--border)', fontSize: 12 }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{entry.ocasion}</span>
            </>
          )}
        </div>

        {entry.queSalioBien && (
          <p style={{ fontSize: 12, color: 'var(--muted-strong)', fontStyle: 'italic', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            "{entry.queSalioBien}"
          </p>
        )}
      </div>

      <span style={{ fontSize: 18, color: 'var(--muted)', flexShrink: 0, lineHeight: 1 }}>›</span>
    </button>
  );
}

// ─── MonthGroup ───────────────────────────────────────────────────────────────

function MonthGroup({ mesKey, entries, miembroId, onOpen }) {
  return (
    <section>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)', padding: '8px 0 6px', marginBottom: 4 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>
          {mesLabel(mesKey)} · {entries.length}
        </p>
      </div>
      {entries.map(e => (
        <HistorialCard key={e.idHist} entry={e} miembroId={miembroId} onOpen={() => onOpen(e)}/>
      ))}
    </section>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function HistorialEmpty({ context }) {
  const C = {
    'sin-entries':          { title: 'Sin historial todavía', desc: 'Los platos evaluados aparecerán acá.' },
    'sin-matches-busqueda': { title: 'Sin resultados',        desc: 'Ningún plato coincide con esa búsqueda.' },
    'sin-matches-filtro':   { title: 'Sin resultados',        desc: 'Ningún plato coincide con ese filtro.' },
  }[context];
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)', margin: '0 0 8px' }}>{C.title}</p>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{C.desc}</p>
    </div>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

function HistorialScreen({ entries, miembroId, onAbrir }) {
  const [busqueda, setBusqueda] = React.useState('');
  const [filtro, setFiltro] = React.useState('todos');

  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filtradas = entries.filter(e => {
    if (!matchFiltro(filtro, e)) return false;
    if (busqueda.trim() && !norm(e.nombreSeleccion).includes(norm(busqueda)) && !norm(e.queSalioBien).includes(norm(busqueda))) return false;
    return true;
  });

  // Agrupar por mes, descendente
  const porMes = (() => {
    const map = {};
    const order = [];
    filtradas.forEach(e => {
      const key = parseFecha(e.fechaRealizada).key;
      if (!map[key]) { map[key] = []; order.push(key); }
      map[key].push(e);
    });
    return order.sort((a, b) => b.localeCompare(a)).map(key => [key, map[key]]);
  })();

  const emptyContext = entries.length === 0 ? 'sin-entries' : busqueda.trim() ? 'sin-matches-busqueda' : 'sin-matches-filtro';

  return (
    <>
      {/* Header + métricas + filtros + buscador */}
      <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 var(--space-3)', color: 'var(--text-strong)' }}>Historial</h2>
        <SummaryMetrics entries={entries} activo={filtro} onSelect={setFiltro}/>
        <input
          type="search" placeholder="Buscar por nombre…"
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface-strong)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
      </div>

      {filtradas.length === 0
        ? <HistorialEmpty context={emptyContext}/>
        : porMes.map(([mesKey, mesEntries]) => (
            <MonthGroup key={mesKey} mesKey={mesKey} entries={mesEntries} miembroId={miembroId} onOpen={onAbrir}/>
          ))}
    </>
  );
}

window.HistorialScreen = HistorialScreen;

// ResultadoBadge — usado también por HistorialDetalleScreen
function ResultadoBadge({ resultado }) {
  const t = RESULTADO_TONES[resultado] || RESULTADO_TONES[''];
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 9999,
      background: t.bg, color: t.color, whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 500,
    }}>{resultado}</span>
  );
}
window.ResultadoBadge = ResultadoBadge;
