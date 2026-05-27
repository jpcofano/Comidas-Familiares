// CocinarScreen.jsx — step-by-step cook flow with PasoCard + timer

function PasoCard({ paso, tachado, esActual, onToggleTachado, timerActivo, onIniciarTimer, onCancelarTimer }) {
  const circleColor = tachado ? 'var(--muted)' : esActual ? 'var(--primary)' : 'var(--surface-alt)';
  const circleText  = tachado || !esActual ? 'var(--text)' : '#fff';
  return (
    <div style={{ opacity: tachado ? 0.55 : 1, transition: 'opacity .2s' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span
          onClick={onToggleTachado}
          style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
            background: circleColor, color: circleText,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {tachado ? '✓' : paso.n}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            <p style={{
              fontWeight: 600, color: 'var(--text-strong)', margin: 0,
              fontSize: 14, flex: 1, textDecoration: tachado ? 'line-through' : 'none',
            }}>{paso.titulo}</p>
            {paso.tiempo && <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>{paso.tiempo}</span>}
          </div>
          {paso.desc && (
            <p style={{ fontSize: 13, color: 'var(--text)', margin: '4px 0 0', lineHeight: 1.5 }}>{paso.desc}</p>
          )}
          {paso.tiempoMin && !timerActivo && onIniciarTimer && (
            <button onClick={() => onIniciarTimer(paso.tiempoMin)} style={{
              marginTop: 4, fontSize: 12, padding: '3px 10px', borderRadius: 6,
              background: 'var(--surface-alt)', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit',
            }}>⏱ Iniciar timer {paso.tiempoMin} min</button>
          )}
          {timerActivo && (
            <button onClick={onCancelarTimer} style={{
              marginTop: 4, fontSize: 12, padding: '3px 10px', borderRadius: 6,
              background: 'var(--warn-bg)', border: 0,
              color: 'var(--warn-text)', cursor: 'pointer', fontFamily: 'inherit',
            }}>⏱ Timer activo — Cancelar</button>
          )}
        </div>
      </div>
    </div>
  );
}

function CocinarScreen({ receta, onBack, onFinalizar }) {
  const pasos = receta.pasos.map((p, i) => ({ ...p, n: i + 1 }));
  const [tachados, setTachados] = React.useState(new Set());
  const [pasoActual, setPasoActual] = React.useState(1);
  const [timerEnPaso, setTimerEnPaso] = React.useState(null);

  function toggleTachado(n) {
    const next = new Set(tachados);
    if (next.has(n)) next.delete(n); else next.add(n);
    setTachados(next);
  }

  function siguiente() {
    if (!tachados.has(pasoActual)) toggleTachado(pasoActual);
    const next = pasos.find(p => p.n > pasoActual && !tachados.has(p.n));
    if (next) setPasoActual(next.n);
  }

  const completados = pasos.filter(p => tachados.has(p.n)).length;

  return (
    <div>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'transparent', border: 0, color: 'var(--muted)',
        fontSize: 13, cursor: 'pointer', marginBottom: 12,
        padding: 0, fontFamily: 'inherit',
      }}>
        <Icon name="chevron-left" size={16}/>
        <span>Atrás</span>
      </button>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
          Cocinando
        </p>
        <h2 style={{ marginBottom: 4 }}>{receta.nombre}</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>{completados}/{pasos.length} pasos completados</p>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {pasos.map((p, i) => (
            <React.Fragment key={p.n}>
              {i > 0 && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '14px 0' }}/>}
              <PasoCard
                paso={p}
                tachado={tachados.has(p.n)}
                esActual={p.n === pasoActual}
                onToggleTachado={() => toggleTachado(p.n)}
                timerActivo={timerEnPaso === p.n}
                onIniciarTimer={() => setTimerEnPaso(p.n)}
                onCancelarTimer={() => setTimerEnPaso(null)}
              />
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <Button variant="primary" onClick={siguiente} style={{ flex: 1 }}>Siguiente paso</Button>
          <Button variant="secondary" onClick={onFinalizar}>Finalizar</Button>
        </div>
      </div>
    </div>
  );
}

window.CocinarScreen = CocinarScreen;
