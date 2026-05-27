// HistorialScreen.jsx — full list of evaluated plans with search + ResultadoBadge

const RESULTADO_PALETTE = {
  'Excelente': { bg: 'var(--ok-bg)',    color: 'var(--ok-text)',   line: 'var(--ok-line)' },
  'Muy bueno': { bg: 'var(--ok-bg)',    color: 'var(--ok-text)',   line: 'var(--ok-line)' },
  'Bueno':     { bg: 'var(--info-bg)',  color: 'var(--info-text)', line: 'var(--info-line)' },
  'Regular':   { bg: 'var(--warn-bg)',  color: 'var(--warn-text)', line: 'var(--warn-line)' },
  'Malísimo':  { bg: 'var(--err-bg)',   color: 'var(--err-text)',  line: 'var(--err-line)' },
};

function ResultadoBadge({ resultado }) {
  const s = RESULTADO_PALETTE[resultado] || {
    bg: 'var(--surface-alt)', color: 'var(--muted-strong)',
  };
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 9999,
      background: s.bg, color: s.color, whiteSpace: 'nowrap', flexShrink: 0,
      fontWeight: 500,
    }}>{resultado}</span>
  );
}

function PromedioPill({ promedio }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 2,
      padding: '2px 8px', borderRadius: 9999,
      background: 'var(--primary-soft)', color: 'var(--primary)',
      fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {promedio.toFixed(1)}
      <span style={{ fontSize: 10, opacity: 0.7 }}>/10</span>
    </span>
  );
}

function HistorialCard({ entry, miembroId, onOpen }) {
  const miNota = entry.calificaciones?.[miembroId];
  return (
    <div
      onClick={onOpen}
      style={{
        background: 'var(--surface-strong)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
        marginBottom: 10, transition: 'border-color 120ms ease',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--line)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <p style={{
          margin: 0, fontWeight: 500, color: 'var(--text-strong)',
          fontSize: 14, flex: 1, minWidth: 0, lineHeight: 1.3,
        }}>{entry.nombreSeleccion}</p>
        {entry.resultado && <ResultadoBadge resultado={entry.resultado}/>}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 8, marginTop: 8,
      }}>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span>{entry.fechaRealizada}</span>
          {entry.ocasion && <span>{entry.ocasion}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {miNota != null && miembroId && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Tu nota <strong style={{ color: 'var(--text)' }}>{miNota}</strong>
            </span>
          )}
          <PromedioPill promedio={entry.promedio}/>
        </div>
      </div>
    </div>
  );
}

function HistorialScreen({ entries, miembroId, onAbrir }) {
  const [busqueda, setBusqueda] = React.useState('');
  const [filtro, setFiltro] = React.useState('todos'); // todos | excelentes | regulares

  const normalized = (s) => (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const visibles = entries.filter(e => {
    if (busqueda.trim() && !normalized(e.nombreSeleccion).includes(normalized(busqueda))) return false;
    if (filtro === 'excelentes') return ['Excelente', 'Muy bueno'].includes(e.resultado);
    if (filtro === 'regulares')  return ['Regular', 'Malísimo'].includes(e.resultado);
    return true;
  });

  return (
    <>
      <h2 style={{ marginBottom: 4 }}>Historial</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 14px' }}>
        <strong>{entries.length}</strong> {entries.length === 1 ? 'plato evaluado' : 'platos evaluados'}
      </p>

      <input
        type="search"
        placeholder="Buscar por nombre…"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 10,
          border: '1px solid var(--border)', fontSize: 13,
          background: 'var(--surface-strong)', color: 'var(--text)',
          boxSizing: 'border-box', marginBottom: 10, fontFamily: 'inherit',
        }}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Button variant={filtro === 'todos' ? 'primary' : 'secondary'} size="sm" onClick={() => setFiltro('todos')}>
          Todos
        </Button>
        <Button variant={filtro === 'excelentes' ? 'primary' : 'secondary'} size="sm" onClick={() => setFiltro('excelentes')}>
          Muy buenos
        </Button>
        <Button variant={filtro === 'regulares' ? 'primary' : 'secondary'} size="sm" onClick={() => setFiltro('regulares')}>
          Para revisar
        </Button>
      </div>

      {visibles.length === 0 ? (
        <div style={{
          padding: '40px 0', textAlign: 'center',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14,
        }}>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            {entries.length === 0
              ? 'Todavía no hay platos evaluados.'
              : 'Ningún resultado para ese filtro.'}
          </p>
        </div>
      ) : (
        visibles.map(e => (
          <HistorialCard
            key={e.idHist} entry={e} miembroId={miembroId}
            onOpen={() => onAbrir(e)}
          />
        ))
      )}
    </>
  );
}

window.HistorialScreen = HistorialScreen;
window.ResultadoBadge = ResultadoBadge;
window.PromedioPill = PromedioPill;
