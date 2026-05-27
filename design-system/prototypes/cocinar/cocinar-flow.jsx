// cocinar-flow.jsx — Cocinar con modos GUIADA + SCROLL compartiendo chrome
//
// Header sticky con progress bars + bottom sticky con botón Siguiente / Finalizar.
// El cuerpo cambia según el modo:
//   - guiada: solo el paso actual, grande y centrado.
//   - scroll: lista completa con cursor "Acá vas".
// Toggle "Ver todos" / "Paso a paso" en el header.

function CocinarFlow({ receta, onBack, onFinalizar, modoInicial = 'guiada' }) {
  const pasos = receta.pasos;
  const total = pasos.length;

  const [modo, setModo]               = React.useState(modoInicial);
  const [tachados, setTachados]       = React.useState(new Set());
  const [pasoActual, setPasoActual]   = React.useState(1);
  const [timerEnPaso, setTimerEnPaso] = React.useState(null);
  const [finalizado, setFinalizado]   = React.useState(false);

  const completados      = pasos.filter((p) => tachados.has(p.nroPaso)).length;
  const todoCompletado   = completados === total;

  // For scroll mode auto-scroll
  const stepRefs    = React.useRef({});
  const scrollerRef = React.useRef(null);

  function toggleTachado(nro) {
    setTachados((prev) => {
      const next = new Set(prev);
      if (next.has(nro)) next.delete(nro); else next.add(nro);
      return next;
    });
  }

  function scrollToStep(nro) {
    if (modo !== 'scroll') return;
    const el = stepRefs.current[nro];
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    scroller.scrollTo({ top: el.offsetTop - 64, behavior: 'smooth' });
  }

  function siguiente() {
    // Mark current done if not already
    let next = new Set(tachados);
    if (!next.has(pasoActual)) {
      next.add(pasoActual);
      setTachados(next);
    }
    // Find next undone after current, or first undone anywhere
    const np = pasos.find((p) => p.nroPaso > pasoActual && !next.has(p.nroPaso))
            || pasos.find((p) => !next.has(p.nroPaso));
    if (np) {
      setPasoActual(np.nroPaso);
      requestAnimationFrame(() => scrollToStep(np.nroPaso));
    }
  }

  function anterior() {
    const prev = [...pasos].reverse().find((p) => p.nroPaso < pasoActual);
    if (prev) {
      setPasoActual(prev.nroPaso);
      requestAnimationFrame(() => scrollToStep(prev.nroPaso));
    }
  }

  function saltarA(nro) {
    setPasoActual(nro);
    requestAnimationFrame(() => scrollToStep(nro));
  }

  function finalizar() {
    setFinalizado(true);
    setTimeout(() => onFinalizar?.(), 800);
  }

  function toggleModo() {
    if (modo === 'guiada') {
      setModo('scroll');
      requestAnimationFrame(() => scrollToStep(pasoActual));
    } else {
      // Volver a guiada: jumpear al primer paso no tachado, o el actual
      const primero = pasos.find((p) => !tachados.has(p.nroPaso));
      if (primero) setPasoActual(primero.nroPaso);
      setModo('guiada');
    }
  }

  const pasoActualObj = pasos.find((p) => p.nroPaso === pasoActual) || pasos[0];
  const idxActual     = pasos.findIndex((p) => p.nroPaso === pasoActual);
  const proximoPaso   = pasos.find((p) => p.nroPaso > pasoActual && !tachados.has(p.nroPaso))
                     || pasos.find((p) => !tachados.has(p.nroPaso));

  return (
    <div style={{
      paddingTop: 56, minHeight: '100%', background: 'var(--bg)',
      fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column',
    }}>
      {/* ── HEADER (compartido) ────────────────────────────────────── */}
      <FlowHeader
        receta={receta}
        pasos={pasos}
        tachados={tachados}
        pasoActual={pasoActual}
        completados={completados}
        total={total}
        modo={modo}
        onBack={onBack}
        onToggleModo={toggleModo}
        onSaltarPaso={saltarA}
      />

      {/* ── BODY ──────────────────────────────────────────────────── */}
      {modo === 'guiada' ? (
        <GuidedBody
          receta={receta}
          paso={pasoActualObj}
          idx={idxActual}
          total={total}
          tachado={tachados.has(pasoActualObj.nroPaso)}
          onToggle={() => toggleTachado(pasoActualObj.nroPaso)}
          timerActivo={timerEnPaso === pasoActualObj.nroPaso}
          onIniciarTimer={() => setTimerEnPaso(pasoActualObj.nroPaso)}
          onCancelarTimer={() => setTimerEnPaso(null)}
        />
      ) : (
        <ScrollBody
          receta={receta}
          pasos={pasos}
          tachados={tachados}
          pasoActual={pasoActual}
          stepRefs={stepRefs}
          scrollerRef={scrollerRef}
          onToggle={toggleTachado}
          onSetActivo={setPasoActual}
          timerEnPaso={timerEnPaso}
          onIniciarTimer={setTimerEnPaso}
          onCancelarTimer={() => setTimerEnPaso(null)}
        />
      )}

      {/* ── BOTTOM ACTION (compartido) ─────────────────────────────── */}
      <FlowBottom
        modo={modo}
        idxActual={idxActual}
        proximoPaso={proximoPaso}
        todoCompletado={todoCompletado}
        finalizado={finalizado}
        onSiguiente={siguiente}
        onAnterior={anterior}
        onFinalizar={finalizar}
      />
    </div>
  );
}

// ─── LiveTimer (compartido) ────────────────────────────────────
// Live mm:ss countdown. Self-contained: pausar / reanudar / reiniciar.
// onComplete fires once when reaches 0 (used to vibrate / play sound).

function LiveTimer({ durMin, onCancel, variant = 'hero' }) {
  const durMs = durMin * 60_000;
  const [msLeft, setMsLeft]    = React.useState(durMs);
  const [running, setRunning]  = React.useState(true);
  const [completed, setCompleted] = React.useState(false);
  const [notif, setNotif]      = React.useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  // Ticker
  React.useEffect(() => {
    if (!running || msLeft <= 0) return;
    const startedAt = Date.now();
    const startLeft = msLeft;
    const id = setInterval(() => {
      const remaining = startLeft - (Date.now() - startedAt);
      if (remaining <= 0) {
        setMsLeft(0);
        setRunning(false);
        setCompleted(true);
        clearInterval(id);
        try { navigator.vibrate?.([200, 100, 200]); } catch {}
        if (notif === 'granted') {
          try { new Notification('⏱ Timer terminado', { body: `${durMin} min · ¡revisá la cocción!`, silent: false }); } catch {}
        }
      } else {
        setMsLeft(remaining);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  async function requestNotif() {
    if (typeof Notification === 'undefined') return;
    try {
      const res = await Notification.requestPermission();
      setNotif(res);
    } catch {}
  }

  function reiniciar() {
    setMsLeft(durMs);
    setCompleted(false);
    setRunning(true);
  }

  const mm = Math.floor(msLeft / 60_000).toString().padStart(2, '0');
  const ss = Math.floor((msLeft % 60_000) / 1000).toString().padStart(2, '0');

  const big = variant === 'hero';

  return (
    <div style={{
      marginTop: big ? 12 : 8,
      padding: big ? '14px 16px 12px' : '10px 12px 10px',
      borderRadius: 14,
      background: completed ? 'var(--ok-bg)' : 'var(--surface-alt)',
      border: `1px solid ${completed ? 'var(--ok-line)' : 'var(--border-subtle)'}`,
      transition: 'background 200ms ease',
    }}>
      {/* Countdown */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'center',
        gap: 6, marginBottom: big ? 8 : 4,
      }}>
        <span style={{
          fontSize: big ? 42 : 28, fontWeight: 700,
          color: completed ? 'var(--ok-text)' : 'var(--text-strong)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.03em', lineHeight: 1,
        }}>{mm}:{ss}</span>
        {completed && (
          <span style={{
            fontSize: 13, fontWeight: 700, color: 'var(--ok-text)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginLeft: 4,
          }}>¡Listo!</span>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {!completed && (
          <button onClick={() => setRunning((r) => !r)} style={{
            flex: 1, maxWidth: 140, padding: '8px 14px', borderRadius: 10,
            background: 'var(--surface-strong)', color: 'var(--text-strong)',
            border: '1px solid var(--border)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          }}>
            {running ? 'Pausar' : 'Reanudar'}
          </button>
        )}
        <button onClick={reiniciar} style={{
          flex: completed ? 1 : 0.7, padding: '8px 14px', borderRadius: 10,
          background: completed ? 'var(--primary)' : 'transparent',
          color: completed ? '#fff' : 'var(--muted)',
          border: completed ? 'none' : '1px solid transparent',
          cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
        }}>
          {completed ? 'Reiniciar' : 'Reiniciar'}
        </button>
        <button onClick={onCancel} aria-label="Cerrar timer" style={{
          width: 34, height: 34, borderRadius: 10, background: 'transparent',
          border: '1px solid var(--border-subtle)', cursor: 'pointer',
          color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontFamily: 'inherit',
        }}>✕</button>
      </div>

      {/* Notification permission affordance */}
      {!completed && notif !== 'granted' && notif !== 'unsupported' && (
        <button onClick={requestNotif} style={{
          marginTop: 8, padding: 0,
          background: 'transparent', border: 'none',
          color: 'var(--accent)', cursor: 'pointer',
          fontSize: 12, fontWeight: 500,
          textDecoration: 'underline', textDecorationColor: 'var(--accent-soft)',
          textDecorationThickness: 1.5, textUnderlineOffset: 3,
          fontFamily: 'inherit', display: 'block', textAlign: 'left',
        }}>
          {notif === 'denied' ? 'Avisos del navegador bloqueados' : 'Activar avisos del navegador'}
        </button>
      )}
    </div>
  );
}

// ─── HEADER ─────────────────────────────────────────────────────

function FlowHeader({ receta, pasos, tachados, pasoActual, completados, total, modo, onBack, onToggleModo, onSaltarPaso }) {
  return (
    <div style={{
      position: 'sticky', top: 56, zIndex: 4,
      background: 'rgba(253, 250, 246, 0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '10px 16px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', padding: 4,
          display: 'flex', alignItems: 'center', cursor: 'pointer',
          color: 'var(--text)',
        }} aria-label="Volver">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: 'var(--primary)',
            textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0,
          }}>Cocinando</p>
          <h1 style={{
            fontSize: 16, fontWeight: 700, color: 'var(--text-strong)',
            letterSpacing: '-0.01em', lineHeight: 1.2, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{receta.nombre}</h1>
        </div>
        <button onClick={onToggleModo} style={{
          padding: '6px 10px', borderRadius: 999,
          background: 'var(--surface-alt)', border: '1px solid var(--border-subtle)',
          color: 'var(--text)', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
          fontFamily: 'inherit',
        }}>
          {modo === 'guiada' ? 'Ver todos' : 'Paso a paso'}
        </button>
      </div>

      {/* Progress bars */}
      <div style={{ display: 'flex', gap: 4 }}>
        {pasos.map((p) => {
          const tachado = tachados.has(p.nroPaso);
          const actual  = p.nroPaso === pasoActual && !tachado;
          return (
            <button
              key={p.nroPaso}
              onClick={() => onSaltarPaso(p.nroPaso)}
              aria-label={`Saltar al paso ${p.nroPaso}`}
              style={{
                flex: 1, height: 5, borderRadius: 999, border: 'none',
                cursor: 'pointer', padding: 0,
                background: tachado ? 'var(--ok-text)'
                          : actual  ? 'var(--primary)'
                          :           'var(--surface-alt)',
                outline: actual ? '1.5px solid var(--primary)' : 'none',
                outlineOffset: 2,
                transition: 'background 200ms ease',
              }}
            />
          );
        })}
      </div>

      {/* Counter line */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 8,
      }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
          Paso {Math.max(1, pasos.findIndex(p => p.nroPaso === pasoActual) + 1)} de {total}
        </span>
        <span style={{
          fontSize: 11, color: 'var(--muted)', fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          <b style={{ color: 'var(--text-strong)' }}>{completados}</b>/{total} hechos
        </span>
      </div>
    </div>
  );
}

// ─── GUIDED BODY (un paso por vez) ──────────────────────────────

function GuidedBody({ receta, paso, idx, total, tachado, onToggle, timerActivo, onIniciarTimer, onCancelarTimer }) {
  const esPrimer = idx === 0;
  return (
    <div style={{ flex: 1, padding: '14px 16px 120px', overflowY: 'auto' }}>
      {/* Banner riesgo general solo en paso 1 */}
      {receta.riesgos && esPrimer && (
        <div style={{
          marginBottom: 14, padding: '10px 12px',
          background: 'var(--warn-bg)', borderRadius: 10,
          border: '1px solid var(--warn-line, var(--border))',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 14, lineHeight: 1.2 }}>⚠</span>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--warn-text)', lineHeight: 1.4 }}>
            {receta.riesgos}
          </p>
        </div>
      )}

      {/* Hero step card */}
      <div style={{
        background: 'var(--surface-strong)',
        borderRadius: 18, padding: '22px 20px',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 4px 18px rgba(31, 26, 22, 0.05)',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
          <button
            onClick={onToggle}
            aria-label={tachado ? 'Desmarcar paso' : 'Marcar paso como hecho'}
            style={{
              flexShrink: 0, width: 46, height: 46, borderRadius: '50%',
              background: tachado ? 'var(--ok-text)' : 'var(--primary)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 19, fontWeight: 700, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontVariantNumeric: 'tabular-nums',
              boxShadow: tachado ? 'none' : '0 4px 12px rgba(138, 74, 47, 0.30)',
              transition: 'all 220ms ease',
            }}
          >
            {tachado ? (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M5 11l4 4 8.5-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : paso.nroPaso}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            {paso.tiempo && (
              <p style={{
                fontSize: 11, color: 'var(--muted)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                margin: '4px 0 4px',
              }}>{paso.tiempo}</p>
            )}
            <h2 style={{
              fontSize: 20, fontWeight: 700, color: 'var(--text-strong)',
              letterSpacing: '-0.015em', lineHeight: 1.2, margin: 0,
              textDecoration: tachado ? 'line-through' : 'none',
            }}>{paso.titulo}</h2>
          </div>
        </div>

        {/* Live timer (replaces inline button when active) */}
        {timerActivo && (
          <LiveTimer
            key={`hero-${paso.nroPaso}`}
            durMin={paso.tiempoMin}
            onCancel={onCancelarTimer}
            variant="hero"
          />
        )}
        {!timerActivo && paso.tiempoMin > 0 && (
          <button onClick={onIniciarTimer} style={{
            marginBottom: 14, marginTop: 4,
            fontSize: 13, padding: '8px 14px', borderRadius: 10,
            background: 'var(--surface-alt)', border: '1px solid var(--border-subtle)',
            color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>⏱ Iniciar timer {paso.tiempoMin} min</button>
        )}

        {/* Description */}
        {paso.desc && (
          <p style={{
            fontSize: 16, lineHeight: 1.5,
            color: tachado ? 'var(--muted)' : 'var(--text)',
            margin: timerActivo || paso.tiempoMin > 0 ? '14px 0 0' : '0',
          }}>{paso.desc}</p>
        )}

        {/* Clave (verde) */}
        {paso.puntoClave && (
          <PasoBlock variant="ok" label="Clave">{paso.puntoClave}</PasoBlock>
        )}
        {/* Riesgo (amarillo) */}
        {paso.errorComun && (
          <PasoBlock variant="warn" label="Riesgo">{paso.errorComun}</PasoBlock>
        )}
        {/* Notas (italic muted) */}
        {paso.notas && (
          <p style={{
            margin: '12px 0 0', fontSize: 13, color: 'var(--muted)',
            fontStyle: 'italic', lineHeight: 1.5,
          }}>{paso.notas}</p>
        )}

        {/* Marcar completado — botón secundario explícito */}
        <button onClick={onToggle} style={{
          marginTop: 16, padding: '9px 14px', borderRadius: 10,
          border: `1px solid ${tachado ? 'var(--ok-text)' : 'var(--border)'}`,
          background: tachado ? 'var(--ok-bg)' : 'transparent',
          color: tachado ? 'var(--ok-text)' : 'var(--text)',
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          {tachado
            ? (<><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg> Completado</>)
            : 'Marcar completado'}
        </button>
      </div>
    </div>
  );
}

function PasoBlock({ variant, label, children }) {
  const tones = {
    ok:   { bg: 'var(--ok-bg)',   text: 'var(--ok-text)',   line: 'var(--ok-line)',   sym: '✓' },
    warn: { bg: 'var(--warn-bg)', text: 'var(--warn-text)', line: 'var(--warn-line, var(--border))', sym: '⚠' },
  };
  const t = tones[variant];
  return (
    <div style={{
      marginTop: 12, padding: '10px 12px',
      background: t.bg, borderRadius: 10,
      border: `1px solid ${t.line}`,
      display: 'flex', gap: 8, alignItems: 'flex-start',
    }}>
      <span style={{ color: t.text, fontWeight: 700, fontSize: 13, lineHeight: 1.3, flexShrink: 0 }}>{t.sym}</span>
      <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.45 }}>
        <b style={{ fontWeight: 700 }}>{label}:</b> {children}
      </p>
    </div>
  );
}

// ─── SCROLL BODY (todos los pasos) ──────────────────────────────

function ScrollBody({ receta, pasos, tachados, pasoActual, stepRefs, scrollerRef, onToggle, onSetActivo, timerEnPaso, onIniciarTimer, onCancelarTimer }) {
  return (
    <div
      ref={scrollerRef}
      style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px 120px',
        display: 'flex', flexDirection: 'column', gap: 10,
        scrollBehavior: 'smooth',
      }}
    >
      {receta.riesgos && (
        <div style={{
          marginBottom: 4, padding: '10px 12px',
          background: 'var(--warn-bg)', borderRadius: 10,
          border: '1px solid var(--warn-line, var(--border))',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 14, lineHeight: 1.2 }}>⚠</span>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--warn-text)', lineHeight: 1.4 }}>
            {receta.riesgos}
          </p>
        </div>
      )}

      {pasos.map((paso) => (
        <StepCard
          key={paso.nroPaso}
          ref={(el) => { stepRefs.current[paso.nroPaso] = el; }}
          paso={paso}
          tachado={tachados.has(paso.nroPaso)}
          esActual={paso.nroPaso === pasoActual && !tachados.has(paso.nroPaso)}
          onToggle={() => onToggle(paso.nroPaso)}
          onSetActivo={() => onSetActivo(paso.nroPaso)}
          timerActivo={timerEnPaso === paso.nroPaso}
          onIniciarTimer={() => onIniciarTimer(paso.nroPaso)}
          onCancelarTimer={onCancelarTimer}
        />
      ))}

      <p style={{
        textAlign: 'center', fontSize: 11, color: 'var(--muted)',
        padding: '4px 0 0', margin: 0,
      }}>
        Tap círculo para marcar · botón <b style={{color:'var(--text)'}}>Siguiente</b> para avanzar guiado
      </p>
    </div>
  );
}

// ─── BOTTOM (compartido) ───────────────────────────────────────

function FlowBottom({ modo, idxActual, proximoPaso, todoCompletado, finalizado, onSiguiente, onAnterior, onFinalizar }) {
  if (todoCompletado) {
    return (
      <div style={{
        position: 'sticky', bottom: 0, padding: '12px 16px 20px',
        background: 'linear-gradient(180deg, rgba(253, 250, 246, 0) 0%, var(--bg) 35%)',
        zIndex: 5,
      }}>
        <button
          onClick={onFinalizar}
          disabled={finalizado}
          style={{
            width: '100%', padding: '15px 16px', borderRadius: 14,
            background: finalizado ? 'var(--ok-text)' : 'var(--primary)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 15, fontWeight: 700,
            boxShadow: '0 6px 18px rgba(138, 74, 47, 0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'inherit',
          }}
        >
          {finalizado ? (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3.5 9.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              ¡Listo!
            </>
          ) : <>Finalizar cocción</>}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'sticky', bottom: 0, padding: '12px 16px 20px',
      background: 'linear-gradient(180deg, rgba(253, 250, 246, 0) 0%, var(--bg) 35%)',
      zIndex: 5,
      display: 'flex', gap: 10,
    }}>
      {/* Anterior — only in guided mode */}
      {modo === 'guiada' && (
        <button
          onClick={onAnterior}
          disabled={idxActual === 0}
          aria-label="Paso anterior"
          style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--surface-strong)', color: 'var(--text)',
            border: '1px solid var(--border)', cursor: idxActual === 0 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: idxActual === 0 ? 0.4 : 1,
            flexShrink: 0,
            fontFamily: 'inherit',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      <button
        onClick={onSiguiente}
        style={{
          flex: 1, padding: '14px 16px', borderRadius: 14,
          background: 'var(--primary)', color: '#fff', border: 'none',
          cursor: 'pointer', fontSize: 15, fontWeight: 700,
          boxShadow: '0 4px 14px rgba(138, 74, 47, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.78, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Siguiente paso
          </span>
          <span style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {proximoPaso?.titulo || '—'}
          </span>
        </span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

// ─── StepCard (scroll mode) ───────────────────────────────────

const StepCard = React.forwardRef(function StepCard(
  { paso, tachado, esActual, onToggle, onSetActivo, timerActivo, onIniciarTimer, onCancelarTimer },
  ref
) {
  return (
    <div
      ref={ref}
      onClick={() => { if (!tachado && !esActual) onSetActivo(); }}
      style={{
        background: 'var(--surface-strong)',
        borderRadius: 14,
        padding: '14px 14px 14px 12px',
        border: esActual ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
        boxShadow: esActual ? '0 4px 14px rgba(138, 74, 47, 0.10)' : 'none',
        opacity: tachado ? 0.55 : 1,
        transition: 'opacity 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
        cursor: tachado ? 'default' : 'pointer',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={tachado ? `Desmarcar paso ${paso.nroPaso}` : `Marcar paso ${paso.nroPaso}`}
          style={{
            flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
            background: tachado ? 'var(--ok-text)' : esActual ? 'var(--primary)' : 'var(--surface-alt)',
            color: tachado || esActual ? '#fff' : 'var(--text)',
            border: !tachado && !esActual ? '1.5px solid var(--border)' : 'none',
            cursor: 'pointer', fontSize: 13, fontWeight: 700, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontVariantNumeric: 'tabular-nums',
            transition: 'all 200ms ease',
            fontFamily: 'inherit',
          }}
        >
          {tachado ? (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M3 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : paso.nroPaso}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <p style={{
              fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)', margin: 0,
              textDecoration: tachado ? 'line-through' : 'none',
              flex: 1, lineHeight: 1.3,
            }}>{paso.titulo}</p>
            {paso.tiempo && (
              <span style={{
                fontSize: 12, color: 'var(--muted)', fontWeight: 500,
                flexShrink: 0, fontVariantNumeric: 'tabular-nums',
              }}>{paso.tiempo}</span>
            )}
          </div>
          {paso.desc && (
            <p style={{
              fontSize: 13.5, color: tachado ? 'var(--muted)' : 'var(--text)',
              margin: 0, lineHeight: 1.5,
            }}>{paso.desc}</p>
          )}
          {paso.puntoClave && (
            <PasoBlock variant="ok" label="Clave">{paso.puntoClave}</PasoBlock>
          )}
          {paso.errorComun && (
            <PasoBlock variant="warn" label="Riesgo">{paso.errorComun}</PasoBlock>
          )}
          {paso.notas && (
            <p style={{
              margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)',
              fontStyle: 'italic', lineHeight: 1.45,
            }}>{paso.notas}</p>
          )}
          {timerActivo && (
            <LiveTimer
              key={`scroll-${paso.nroPaso}`}
              durMin={paso.tiempoMin}
              onCancel={onCancelarTimer}
              variant="compact"
            />
          )}
          {paso.tiempoMin > 0 && !timerActivo && (
            <button onClick={(e) => { e.stopPropagation(); onIniciarTimer(); }} style={{
              marginTop: 10, fontSize: 12, padding: '5px 10px', borderRadius: 8,
              background: 'var(--surface-alt)', border: '1px solid var(--border-subtle)',
              color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>⏱ Timer {paso.tiempoMin} min</button>
          )}
        </div>
      </div>

      {esActual && (
        <span style={{
          position: 'absolute', top: -8, left: 24,
          padding: '2px 8px', borderRadius: 999,
          background: 'var(--primary)', color: '#fff',
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>Acá vas</span>
      )}
    </div>
  );
});

window.CocinarFlow = CocinarFlow;
