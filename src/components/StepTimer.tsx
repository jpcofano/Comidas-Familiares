import { useState, useRef, useEffect } from "react";
import "./StepTimer.css";
import { iniciarAlarma } from "../lib/alarma";

interface StepTimerProps {
  /** Tiempo en minutos (ya parseado del modelo Paso). Si null/undefined/≤0 → no renderiza. */
  tiempoEstimadoMin: number | null | undefined;
  /** Texto para el body de la notificación; típicamente paso.momento || paso.titulo */
  stepLabel: string;
}

type TimerStatus = "idle" | "running" | "paused" | "done";

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function crearAudioContext(): AudioContext | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    return AudioCtx ? (new AudioCtx() as AudioContext) : null;
  } catch {
    return null;
  }
}

function fireNotification(stepLabel: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Paso terminado", { body: stepLabel, tag: "cs-step-timer" });
    }
  } catch {
    /* silencio — Safari iOS sin PWA */
  }
}

export function StepTimer({ tiempoEstimadoMin, stepLabel }: StepTimerProps) {
  const totalSegundos =
    tiempoEstimadoMin != null && tiempoEstimadoMin > 0
      ? Math.round(tiempoEstimadoMin * 60)
      : null;

  // Lazy init: lee permiso una sola vez al montar (evita useEffect + setState)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(
    () => (typeof Notification !== "undefined" ? Notification.permission : null),
  );

  const [status, setStatus] = useState<TimerStatus>("idle");
  // Estado inicial desde la prop — en modo guiada key={paso.nroPaso} en Cocinar.tsx
  // garantiza remount al cambiar de paso, reseteando este estado automáticamente.
  const [remainingSeconds, setRemainingSeconds] = useState(totalSegundos ?? 0);
  const [alarmaActiva, setAlarmaActiva] = useState(false);

  const intervalRef    = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmaStopRef  = useRef<(() => void) | null>(null);

  // Cleanup: detiene interval, alarma y cierra AudioContext al desmontar o cambiar la prop.
  // En modo guiada el remount por key dispara este cleanup automáticamente al cambiar paso.
  useEffect(() => {
    return () => {
      alarmaStopRef.current?.();
      alarmaStopRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, [tiempoEstimadoMin]);

  // Si no hay tiempo válido → no renderizar nada (cero espacio ocupado)
  if (totalSegundos === null) return null;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function detenerAlarma() {
    alarmaStopRef.current?.();
    alarmaStopRef.current = null;
    setAlarmaActiva(false);
  }

  // ── Tick compartido por Iniciar y Reanudar ──────────────────────────────────
  function startInterval() {
    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setStatus("done");

          // Arrancar alarma repetida usando el AudioContext desbloqueado en handleIniciar
          if (audioContextRef.current) {
            const stop = iniciarAlarma(audioContextRef.current);
            alarmaStopRef.current = stop;
            setAlarmaActiva(true);
          }

          fireNotification(stepLabel);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleIniciar() {
    // Crear el AudioContext aquí — este onClick ES un gesto del usuario, lo desbloquea en iOS
    if (!audioContextRef.current) {
      audioContextRef.current = crearAudioContext();
    }
    setStatus("running");
    startInterval();
  }

  function handlePausar() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus("paused");
  }

  function handleReanudar() {
    setStatus("running");
    startInterval();
  }

  function handleReiniciar() {
    detenerAlarma();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus("idle");
    setRemainingSeconds(totalSegundos!); // non-null: gateado por el early return de arriba
  }

  async function handleActivarAvisos() {
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    } catch {
      /* silencio */
    }
  }

  return (
    <div className="step-timer" data-state={status}>
      {/* Display */}
      <div className="step-timer-display">
        {status === "done" ? "¡Listo!" : formatSeconds(remainingSeconds)}
      </div>

      {/* Acciones según estado */}
      <div className="step-timer-actions">
        {status === "idle" && (
          <button className="btn btn-primary" onClick={handleIniciar}>
            Iniciar contador
          </button>
        )}
        {status === "running" && (
          <>
            <button className="btn btn-secondary" onClick={handlePausar}>
              Pausar
            </button>
            <button className="btn btn-ghost" onClick={handleReiniciar}>
              Reiniciar
            </button>
          </>
        )}
        {status === "paused" && (
          <>
            <button className="btn btn-primary" onClick={handleReanudar}>
              Reanudar
            </button>
            <button className="btn btn-ghost" onClick={handleReiniciar}>
              Reiniciar
            </button>
          </>
        )}
        {status === "done" && (
          <>
            {alarmaActiva && (
              <button className="btn btn-alarm" onClick={detenerAlarma}>
                Detener alarma
              </button>
            )}
            <button className="btn btn-ghost" onClick={handleReiniciar}>
              Reiniciar
            </button>
          </>
        )}
      </div>

      {/* Link de notificaciones — solo si el permiso está en 'default' (no pedido aún) */}
      {notifPermission === "default" && (
        <button className="step-timer-notif-link" onClick={handleActivarAvisos}>
          Activar avisos del navegador
        </button>
      )}
    </div>
  );
}
