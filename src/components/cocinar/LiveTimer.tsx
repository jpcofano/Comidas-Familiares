// src/components/cocinar/LiveTimer.tsx — timer de cuenta regresiva auto-start
//
// Arranca corriendo inmediatamente al montarse.
// Props: durMin (duración en minutos), onCancel (cerrar), variant (hero | compact)
// Al completar: fondo verde, vibrate([200,100,200]), Notification si permitida.
// Lazy init de notifPermission para evitar setState síncrono en effect.

import { useState, useEffect, useRef } from 'react';

interface LiveTimerProps {
  durMin: number;
  onCancel: () => void;
  variant?: 'hero' | 'compact';
}

export function LiveTimer({ durMin, onCancel, variant = 'hero' }: LiveTimerProps) {
  const durMs = durMin * 60_000;

  // endTime: timestamp absoluto en ms cuando el timer llega a cero
  const [endTime, setEndTime] = useState<number>(() => Date.now() + durMs);
  const [paused, setPaused]   = useState(false);
  const [msLeft, setMsLeft]   = useState(durMs);
  const [completed, setCompleted] = useState(false);

  // Lazy init: evita setState síncrono en effect
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(
    () => (typeof Notification !== 'undefined' ? Notification.permission : null),
  );

  // Remaining ms cuando se pausó (para calcular nuevo endTime al reanudar)
  const pausedAtRef = useRef(durMs);

  // Ticker: corre mientras !paused && !completed
  useEffect(() => {
    if (paused || completed) return;
    const id = window.setInterval(() => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        clearInterval(id);
        setMsLeft(0);
        setCompleted(true);
        try { navigator.vibrate?.([200, 100, 200]); } catch {}
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('⏱ Timer terminado', {
              body: `${durMin} min · ¡revisá la cocción!`,
              silent: false,
            });
          } catch {}
        }
      } else {
        setMsLeft(remaining);
      }
    }, 250);
    return () => clearInterval(id);
  }, [paused, completed, endTime, durMin]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handlePausar() {
    pausedAtRef.current = Math.max(0, endTime - Date.now());
    setPaused(true);
  }

  function handleReanudar() {
    setEndTime(Date.now() + pausedAtRef.current);
    setPaused(false);
  }

  function handleReiniciar() {
    setEndTime(Date.now() + durMs);
    setMsLeft(durMs);
    setCompleted(false);
    setPaused(false);
  }

  async function requestNotif() {
    if (typeof Notification === 'undefined') return;
    try {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
    } catch {}
  }

  // ── Display ───────────────────────────────────────────────────────────────────

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
      transition: 'background 200ms ease, border-color 200ms ease',
    }}>

      {/* Countdown */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: 6,
        marginBottom: big ? 8 : 4,
      }}>
        <span style={{
          fontSize: big ? 42 : 28,
          fontWeight: 700,
          color: completed ? 'var(--ok-text)' : 'var(--text-strong)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>
          {mm}:{ss}
        </span>
        {completed && (
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ok-text)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginLeft: 4,
          }}>
            ¡Listo!
          </span>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {!completed && (
          <button
            onClick={paused ? handleReanudar : handlePausar}
            style={{
              flex: 1,
              maxWidth: 140,
              padding: '8px 14px',
              borderRadius: 10,
              background: 'var(--surface-strong)',
              color: 'var(--text-strong)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            {paused ? 'Reanudar' : 'Pausar'}
          </button>
        )}
        <button
          onClick={handleReiniciar}
          style={{
            flex: completed ? 1 : 0.7,
            padding: '8px 14px',
            borderRadius: 10,
            background: completed ? 'var(--primary)' : 'transparent',
            color: completed ? '#fff' : 'var(--muted)',
            border: completed ? 'none' : '1px solid transparent',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          Reiniciar
        </button>
        <button
          onClick={onCancel}
          aria-label="Cerrar timer"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
      </div>

      {/* Notification permission affordance */}
      {!completed && notifPermission !== 'granted' && notifPermission !== null && (
        <button
          onClick={requestNotif}
          style={{
            marginTop: 8,
            padding: 0,
            background: 'transparent',
            border: 'none',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            textDecoration: 'underline',
            fontFamily: 'inherit',
            display: 'block',
            textAlign: 'left',
          }}
        >
          {notifPermission === 'denied'
            ? 'Avisos del navegador bloqueados'
            : 'Activar avisos del navegador'}
        </button>
      )}
    </div>
  );
}
