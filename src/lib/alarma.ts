// Alarma repetida para el StepTimer de Cocinar.
// Patrón: beep (1200 Hz) + beep (1000 Hz), pausa 1.2 s, repetir hasta stop() o ALARMA_MAX_MS.
// Recibe un AudioContext ya desbloqueado (creado en el gesto del usuario que inició el timer).

export const ALARMA_MAX_MS = 60_000;

export function iniciarAlarma(ctx: AudioContext): () => void {
  let stopped = false;
  let loopTimeout: ReturnType<typeof setTimeout> | null = null;
  const autoStop = setTimeout(() => stop(), ALARMA_MAX_MS);

  function stop() {
    if (stopped) return;
    stopped = true;
    if (loopTimeout) { clearTimeout(loopTimeout); loopTimeout = null; }
    clearTimeout(autoStop);
  }

  function beepAt(when: number, freq: number, durSeg: number) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // Envelope corto: ataque 10ms, decay hasta durSeg — evita clic y es claro en altavoz mobile
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.7, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + durSeg);
      osc.connect(gain).connect(ctx.destination);
      osc.start(when);
      osc.stop(when + durSeg + 0.01);
    } catch { /* silencio si el contexto ya cerró */ }
  }

  function dispararPatron() {
    if (stopped) return;
    const t0 = ctx.currentTime;
    beepAt(t0,        1200, 0.15); // primer tono (agudo)
    beepAt(t0 + 0.3,  1000, 0.15); // segundo tono (ligeramente más grave)
    // Programar la próxima repetición después de la pausa total (~1.2 s)
    loopTimeout = setTimeout(() => {
      if (!stopped) dispararPatron();
    }, 1200);
  }

  // Reanudar el contexto si quedó suspended (tab en background)
  const resumeP = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
  resumeP.then(() => { if (!stopped) dispararPatron(); }).catch(() => {});

  return stop;
}
