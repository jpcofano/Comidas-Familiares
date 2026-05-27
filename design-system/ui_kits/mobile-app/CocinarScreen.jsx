// CocinarScreen.jsx — step-by-step cook flow (guiada + scroll modes, matches original)
//
// Modos:
//   - guiada (default): muestra un paso por vez con barra de dots y Anterior/Siguiente
//   - scroll:           muestra todos los pasos apilados
// Toggle entre modos con botón "Ver todos" / "Paso a paso" en el header.

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
              marginTop: 6, fontSize: 12, padding: '3px 10px', borderRadius: 6,
              background: 'var(--surface-alt)', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit',
            }}>⏱ Iniciar timer {paso.tiempoMin} min</button>
          )}
          {timerActivo && (
            <button onClick={onCancelarTimer} style={{
              marginTop: 6, fontSize: 12, padding: '3px 10px', borderRadius: 6,
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
  const total = pasos.length;

  const [modoVista, setModoVista]   = React.useState('guiada');   // 'guiada' | 'scroll'
  const [tachados, setTachados]     = React.useState(new Set());
  const [pasoActual, setPasoActual] = React.useState(1);
  const [timerEnPaso, setTimerEnPaso] = React.useState(null);
  const [confirmar, setConfirmar]   = React.useState(false);

  function toggleTachado(n) {
    const next = new Set(tachados);
    if (next.has(n)) next.delete(n); else next.add(n);
    setTachados(next);
  }

  function siguiente() {
    if (!tachados.has(pasoActual)) toggleTachado(pasoActual);
    const post = new Set([...tachados, pasoActual]);
    const next = pasos.find(p => p.n > pasoActual && !post.has(p.n));
    if (next) setPasoActual(next.n);
  }

  function anterior() {
    const prev = [...pasos].reverse().find(p => p.n < pasoActual);
    if (prev) setPasoActual(prev.n);
  }

  function toggleModo() {
    if (modoVista === 'guiada') {
      setModoVista('scroll');
    } else {
      const primero = pasos.find(p => !tachados.has(p.n)) ?? pasos[0];
      if (primero) setPasoActual(primero.n);
      setModoVista('guiada');
    }
  }

  const completados   = pasos.filter(p => tachados.has(p.n)).length;
  const pasoActualObj = pasos.find(p => p.n === pasoActual) ?? pasos[0];
  const idx           = pasos.findIndex(p => p.n === pasoActualObj?.n);

  // ── Chrome compartido: header con back + toggle modo ────────────────────────
  const headerChrome = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'transparent', border: 0, color: 'var(--muted)',
        fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
      }}>
        <Icon name="chevron-left" size={16}/>
        <span>Atrás</span>
      </button>
      <button onClick={toggleModo} style={{
        background: 'var(--surface-strong)', border: '1px solid var(--line)',
        color: 'var(--text)', borderRadius: 10, padding: '6px 12px',
        fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        {modoVista === 'guiada' ? 'Ver todos' : 'Paso a paso'}
      </button>
    </div>
  );

  // ── Bloque Finalizar (con confirmación) — compartido ────────────────────────
  const finalizarBlock = (
    <div style={{ marginTop: 12 }}>
      {confirmar ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" onClick={() => { setConfirmar(false); onFinalizar?.(); }} style={{ flex: 1 }}>
            Sí, finalizar
          </Button>
          <Button variant="secondary" onClick={() => setConfirmar(false)} style={{ flex: 1 }}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setConfirmar(true)} fullWidth>
          Finalizar cocción
        </Button>
      )}
    </div>
  );

  // ── Modo guiada — un paso por vez ───────────────────────────────────────────
  if (modoVista === 'guiada') {
    return (
      <div>
        {headerChrome}

        {/* Nombre + progreso (dots) */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 4px' }}>
            Cocinando
          </p>
          <h2 style={{ margin: '0 0 4px' }}>{receta.nombre}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 12px' }}>
            Paso {idx + 1} de {total} · {completados}/{total} completados
          </p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {pasos.map(p => (
              <div key={p.n} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: tachados.has(p.n)
                  ? 'var(--ok-text)'
                  : p.n === pasoActualObj?.n
                  ? 'var(--primary)'
                  : 'var(--surface-alt)',
                border: '1px solid var(--border)',
              }}/>
            ))}
          </div>
        </div>

        {/* PasoCard del paso actual */}
        {pasoActualObj && (
          <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 12 }}>
            <PasoCard
              paso={pasoActualObj}
              tachado={tachados.has(pasoActualObj.n)}
              esActual
              onToggleTachado={() => toggleTachado(pasoActualObj.n)}
              timerActivo={timerEnPaso === pasoActualObj.n}
              onIniciarTimer={() => setTimerEnPaso(pasoActualObj.n)}
              onCancelarTimer={() => setTimerEnPaso(null)}
            />
          </div>
        )}

        {/* Anterior / Siguiente */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={anterior} disabled={idx === 0} style={{ flex: 1 }}>
            ← Anterior
          </Button>
          <Button variant="primary" onClick={siguiente} disabled={idx === total - 1 && tachados.has(pasoActualObj?.n)} style={{ flex: 1 }}>
            Siguiente →
          </Button>
        </div>

        {finalizarBlock}
      </div>
    );
  }

  // ── Modo scroll — todos los pasos apilados ──────────────────────────────────
  return (
    <div>
      {headerChrome}

      {/* Nombre + resumen */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 4px' }}>
          Cocinando
        </p>
        <h2 style={{ margin: '0 0 4px' }}>{receta.nombre}</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
          {completados}/{total} pasos completados
        </p>
      </div>

      {/* Lista completa */}
      <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {pasos.map((p, i) => (
            <React.Fragment key={p.n}>
              {i > 0 && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '14px 0' }}/>}
              <PasoCard
                paso={p}
                tachado={tachados.has(p.n)}
                esActual={false}
                onToggleTachado={() => toggleTachado(p.n)}
                timerActivo={timerEnPaso === p.n}
                onIniciarTimer={() => setTimerEnPaso(p.n)}
                onCancelarTimer={() => setTimerEnPaso(null)}
              />
            </React.Fragment>
          ))}
        </div>
      </div>

      {finalizarBlock}
    </div>
  );
}

window.CocinarScreen = CocinarScreen;
