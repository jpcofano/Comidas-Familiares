// CocinarScreen.jsx — sincronizado con el git: dos modos (guiada / scroll),
// dots de progreso, pill "ACÁ VAS", Siguiente con preview, StepTimer con cuenta
// regresiva real, punto clave / error común por paso, banner de riesgos.
// Estado (modo · paso actual · tachados) persistido en localStorage por receta.

// ─── Estado persistente ───────────────────────────────────────────────────────

function useCocinar(sessionKey, totalPasos) {
  const lsKey = `cocinar:${sessionKey}`;
  const [state, setState] = React.useState(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) return { modoVista: 'guiada', pasoActual: 1, tachados: [], ...JSON.parse(raw) };
    } catch (e) {}
    return { modoVista: 'guiada', pasoActual: 1, tachados: [] };
  });
  React.useEffect(() => {
    try { localStorage.setItem(lsKey, JSON.stringify(state)); } catch (e) {}
  }, [lsKey, state]);

  return {
    state,
    toggleTachado: (n) => setState(p => ({ ...p, tachados: p.tachados.includes(n) ? p.tachados.filter(x => x !== n) : [...p.tachados, n] })),
    setModo: (m) => setState(p => ({ ...p, modoVista: m })),
    setPasoActual: (n) => setState(p => ({ ...p, pasoActual: n })),
    reset: () => { try { localStorage.removeItem(lsKey); } catch (e) {} setState({ modoVista: 'guiada', pasoActual: 1, tachados: [] }); },
  };
}

// ─── StepTimer — cuenta regresiva real ────────────────────────────────────────

function fmt(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function beep(ctx) {
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

function StepTimer({ tiempoMin, label }) {
  const total = tiempoMin != null && tiempoMin > 0 ? Math.round(tiempoMin * 60) : null;
  const [status, setStatus] = React.useState('idle'); // idle|running|paused|done
  const [rem, setRem] = React.useState(total || 0);
  const [alarma, setAlarma] = React.useState(false);
  const intRef = React.useRef(null);
  const audioRef = React.useRef(null);
  const alarmRef = React.useRef(null);

  React.useEffect(() => () => {
    if (intRef.current) clearInterval(intRef.current);
    if (alarmRef.current) clearInterval(alarmRef.current);
    if (audioRef.current) { try { audioRef.current.close(); } catch (e) {} }
  }, []);

  if (total === null) return null;

  function tick() {
    intRef.current = setInterval(() => {
      setRem(prev => {
        if (prev <= 1) {
          clearInterval(intRef.current); intRef.current = null;
          setStatus('done');
          if (audioRef.current) {
            beep(audioRef.current);
            alarmRef.current = setInterval(() => beep(audioRef.current), 1200);
            setAlarma(true);
          }
          navigator.vibrate?.(500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }
  function iniciar() {
    if (!audioRef.current) { try { audioRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    setStatus('running'); tick();
  }
  function pausar() { if (intRef.current) { clearInterval(intRef.current); intRef.current = null; } setStatus('paused'); }
  function reanudar() { setStatus('running'); tick(); }
  function detenerAlarma() { if (alarmRef.current) { clearInterval(alarmRef.current); alarmRef.current = null; } setAlarma(false); }
  function reiniciar() { detenerAlarma(); if (intRef.current) { clearInterval(intRef.current); intRef.current = null; } setStatus('idle'); setRem(total); }

  const done = status === 'done';
  return (
    <div style={{
      marginTop: 10, padding: '12px', borderRadius: 'var(--radius-md)',
      background: done ? 'var(--ok-bg)' : 'var(--surface-alt)',
      border: `1px solid ${done ? 'var(--ok-line)' : 'var(--border-subtle)'}`,
      textAlign: 'center', transition: 'background .2s',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700,
        color: done ? 'var(--ok-text)' : 'var(--text-strong)',
        fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 10,
      }}>{done ? '¡Listo!' : fmt(rem)}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {status === 'idle' && <Button variant="primary" size="sm" onClick={iniciar}>Iniciar contador</Button>}
        {status === 'running' && <>
          <Button variant="secondary" size="sm" onClick={pausar}>Pausar</Button>
          <Button variant="ghost" size="sm" onClick={reiniciar}>Reiniciar</Button>
        </>}
        {status === 'paused' && <>
          <Button variant="primary" size="sm" onClick={reanudar}>Reanudar</Button>
          <Button variant="ghost" size="sm" onClick={reiniciar}>Reiniciar</Button>
        </>}
        {done && <>
          {alarma && <Button variant="primary" size="sm" onClick={detenerAlarma}>Detener alarma</Button>}
          <Button variant="ghost" size="sm" onClick={reiniciar}>Reiniciar</Button>
        </>}
      </div>
    </div>
  );
}

// ─── PasoCard ─────────────────────────────────────────────────────────────────

function PasoCard({ paso, n, tachado, esActual, onToggleTachado }) {
  const circleColor = tachado ? 'var(--muted)' : esActual ? 'var(--primary)' : 'var(--surface-alt)';
  const circleText  = tachado || !esActual ? 'var(--text)' : '#fff';
  return (
    <div style={{ opacity: tachado ? 0.55 : 1, transition: 'opacity .2s' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
          background: circleColor, color: circleText,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600,
        }}>{tachado ? '✓' : n}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            {paso.titulo && (
              <p style={{ fontWeight: 600, color: 'var(--text-strong)', margin: 0, fontSize: 14, flex: 1, textDecoration: tachado ? 'line-through' : 'none' }}>
                {paso.titulo}
              </p>
            )}
            {paso.tiempo && <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{paso.tiempo}</span>}
          </div>

          <StepTimer tiempoMin={paso.tiempoMin} label={paso.titulo}/>

          {paso.desc && <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: '10px 0 0' }}>{paso.desc}</p>}

          {paso.puntoClave && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--ok-bg)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ok-text)' }}>✓ Clave: {paso.puntoClave}</p>
            </div>
          )}
          {paso.errorComun && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--warn-bg)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--warn-text)' }}>⚠ Riesgo: {paso.errorComun}</p>
            </div>
          )}

          {onToggleTachado && (
            <button onClick={onToggleTachado} style={{
              marginTop: 12, fontSize: 12, padding: '4px 12px', borderRadius: 'var(--radius-sm)',
              border: `1px solid ${tachado ? 'var(--ok-text)' : 'var(--border)'}`,
              background: tachado ? 'var(--ok-bg)' : 'transparent',
              color: tachado ? 'var(--ok-text)' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit',
            }}>{tachado ? '✓ Completado' : 'Marcar completado'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Header de cocción ────────────────────────────────────────────────────────

function CocinarHeader({ onBack, modoVista, onToggleModo }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <button onClick={onBack} aria-label="Volver" style={{
        display: 'flex', alignItems: 'center', background: 'transparent', border: 0,
        color: 'var(--muted)', cursor: 'pointer', padding: 4, fontFamily: 'inherit',
      }}>
        <Icon name="chevron-left" size={20}/>
      </button>
      <Button variant="secondary" size="sm" onClick={onToggleModo}>
        {modoVista === 'guiada' ? 'Ver todos' : 'Paso a paso'}
      </Button>
    </div>
  );
}

function CocinarCard({ children, style = {} }) {
  return <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', marginBottom: 12, ...style }}>{children}</div>;
}

function RiesgosBanner({ texto }) {
  if (!texto) return null;
  return (
    <div style={{ marginBottom: 12, padding: 12, background: 'var(--warn-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--warn-line)' }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--warn-text)' }}>⚠ {texto}</p>
    </div>
  );
}

function FinalizarBtn({ confirmando, setConfirmando, onFinalizar }) {
  if (confirmando) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" size="sm" style={{ flex: 1 }} onClick={onFinalizar}>Sí, finalizar</Button>
        <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => setConfirmando(false)}>Cancelar</Button>
      </div>
    );
  }
  return <Button variant="secondary" size="sm" fullWidth onClick={() => setConfirmando(true)}>Finalizar cocción</Button>;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

function CocinarScreen({ receta, catalogo = [], mostrarSubs = true, onBack, onFinalizar }) {
  const pasos = (receta.pasos || []).map((p, i) => ({ ...p, n: i + 1 }));
  const total = pasos.length;
  const { state, toggleTachado, setModo, setPasoActual, reset } = useCocinar(receta.id, total);
  const [confirmando, setConfirmando] = React.useState(false);

  const tachados = new Set(state.tachados);
  const completados = pasos.filter(p => tachados.has(p.n)).length;
  const actual = pasos.find(p => p.n === state.pasoActual) || pasos[0];
  const idx = pasos.findIndex(p => p.n === actual?.n);

  function finalizar() { setConfirmando(false); reset(); onFinalizar(); }
  function toggleModo() {
    if (state.modoVista === 'guiada') setModo('scroll');
    else { const primero = pasos.find(p => !tachados.has(p.n)); if (primero) setPasoActual(primero.n); setModo('guiada'); }
  }
  function siguiente() {
    if (!actual) return;
    if (!tachados.has(actual.n)) toggleTachado(actual.n);
    const post = new Set([...state.tachados, actual.n]);
    const next = pasos.find(p => p.n > actual.n && !post.has(p.n));
    if (next) setPasoActual(next.n);
  }
  function anterior() {
    if (!actual) return;
    const prev = [...pasos].reverse().find(p => p.n < actual.n);
    if (prev) setPasoActual(prev.n);
  }
  const proxPaso = actual ? pasos.find(p => p.n > actual.n && !tachados.has(p.n)) : null;

  if (total === 0) {
    return (
      <div>
        <CocinarHeader onBack={onBack} modoVista="guiada" onToggleModo={() => {}}/>
        <CocinarCard style={{ textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Esta receta no tiene pasos cargados.</p>
        </CocinarCard>
      </div>
    );
  }

  // ── Modo GUIADA ──────────────────────────────────────────────────────────────
  if (state.modoVista === 'guiada') {
    return (
      <div>
        <CocinarHeader onBack={onBack} modoVista="guiada" onToggleModo={toggleModo}/>

        <CocinarCard style={{ padding: '14px 16px' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-strong)', margin: '0 0 2px' }}>{receta.nombre}</p>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>
            Paso {idx + 1} de {total} · {completados} hecho{completados !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {pasos.map(p => {
              const t = tachados.has(p.n);
              const act = p.n === actual?.n && !t;
              return (
                <button key={p.n} onClick={() => setPasoActual(p.n)} aria-label={`Ir al paso ${p.n}`} style={{
                  width: 12, height: 12, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                  background: t ? 'var(--ok-text)' : act ? 'var(--primary)' : 'var(--surface-alt)',
                  outline: act ? '2px solid var(--primary)' : '1px solid var(--border)',
                  outlineOffset: act ? 2 : 0, transition: 'background 180ms ease',
                }}/>
              );
            })}
          </div>
        </CocinarCard>

        {actual?.n === pasos[0]?.n && <RiesgosBanner texto={receta.riesgos}/>}
        {mostrarSubs && <SustitutosRecap receta={receta} catalogo={catalogo}/>}

        {actual && (
          <CocinarCard>
            <PasoCard key={actual.n} paso={actual} n={actual.n} tachado={tachados.has(actual.n)} esActual onToggleTachado={() => toggleTachado(actual.n)}/>
          </CocinarCard>
        )}

        {/* Navegación */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <button onClick={anterior} disabled={idx === 0} aria-label="Paso anterior" style={{
            width: 48, height: 48, flexShrink: 0, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--line)',
            background: 'var(--surface-strong)', color: 'var(--text)',
            cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.4 : 1, fontFamily: 'inherit',
          }}>
            <Icon name="chevron-left" size={20}/>
          </button>
          <button onClick={siguiente} style={{
            flex: 1, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, padding: '0 16px', textAlign: 'left', borderRadius: 'var(--radius-md)', border: 0,
            background: 'var(--primary)', color: 'var(--on-primary)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Siguiente paso</span>
              <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proxPaso?.titulo || 'Último paso'}</span>
            </span>
            <Icon name="chevron-right" size={18}/>
          </button>
        </div>

        <FinalizarBtn confirmando={confirmando} setConfirmando={setConfirmando} onFinalizar={finalizar}/>
      </div>
    );
  }

  // ── Modo SCROLL ────────────────────────────────────────────────────────────────
  return (
    <div>
      <CocinarHeader onBack={onBack} modoVista="scroll" onToggleModo={toggleModo}/>

      <CocinarCard style={{ padding: '14px 16px' }}>
        <p style={{ fontWeight: 600, color: 'var(--text-strong)', margin: '0 0 2px' }}>{receta.nombre}</p>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--muted)' }}>{completados}/{total} pasos completados</p>
        <FinalizarBtn confirmando={confirmando} setConfirmando={setConfirmando} onFinalizar={finalizar}/>
      </CocinarCard>

      <RiesgosBanner texto={receta.riesgos}/>
      {mostrarSubs && <SustitutosRecap receta={receta} catalogo={catalogo}/>}

      {pasos.map(p => {
        const esActual = p.n === actual?.n && !tachados.has(p.n);
        const clickable = !tachados.has(p.n) && !esActual;
        return (
          <div key={p.n} style={{ marginBottom: 8, position: 'relative' }}>
            {esActual && (
              <span style={{
                position: 'absolute', top: -9, left: 20, zIndex: 1, padding: '2px 8px', borderRadius: 999,
                background: 'var(--primary)', color: '#fff', fontSize: 9.5, fontWeight: 700,
                letterSpacing: '.06em', textTransform: 'uppercase', pointerEvents: 'none',
              }}>Acá vas</span>
            )}
            <div
              onClick={clickable ? () => setPasoActual(p.n) : undefined}
              style={{
                background: 'var(--surface-strong)', borderRadius: 14, padding: '16px 18px',
                border: esActual ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                boxShadow: esActual ? '0 4px 14px rgba(138,74,47,0.10)' : undefined,
                cursor: clickable ? 'pointer' : undefined,
              }}>
              <PasoCard paso={p} n={p.n} tachado={tachados.has(p.n)} esActual={esActual} onToggleTachado={() => toggleTachado(p.n)}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.CocinarScreen = CocinarScreen;
