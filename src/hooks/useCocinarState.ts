import { useState, useCallback } from "react";

export interface TimerEntry {
  startMs: number;
  durMs: number;
}

export interface CocinarState {
  pasosTachados: number[];
  modoVista: "guiada" | "scroll";
  pasoActual: number;
  timersActivos: Record<number, TimerEntry>;
}

const INITIAL: CocinarState = {
  pasosTachados: [],
  modoVista: "guiada",
  pasoActual: 1,
  timersActivos: {},
};

function lsKey(sessionKey: string) {
  return `cocinar:${sessionKey}`;
}

function loadState(sessionKey: string): CocinarState {
  try {
    const raw = localStorage.getItem(lsKey(sessionKey));
    if (!raw) return { ...INITIAL };
    const parsed = JSON.parse(raw) as CocinarState;
    // Descartar timers vencidos al montar
    const now = Date.now();
    const timersActivos: Record<number, TimerEntry> = {};
    for (const [k, v] of Object.entries(parsed.timersActivos ?? {})) {
      const t = v as TimerEntry;
      if (t.startMs + t.durMs > now) timersActivos[Number(k)] = t;
    }
    return { ...INITIAL, ...parsed, timersActivos };
  } catch {
    return { ...INITIAL };
  }
}

function persist(sessionKey: string, state: CocinarState) {
  try {
    localStorage.setItem(lsKey(sessionKey), JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function useCocinarState(sessionKey: string) {
  const [state, setStateRaw] = useState<CocinarState>(() => loadState(sessionKey));

  function setState(updater: (prev: CocinarState) => CocinarState) {
    setStateRaw((prev) => {
      const next = updater(prev);
      persist(sessionKey, next);
      return next;
    });
  }

  const toggleTachado = useCallback((nroPaso: number) => {
    setState((prev) => {
      const already = prev.pasosTachados.includes(nroPaso);
      return {
        ...prev,
        pasosTachados: already
          ? prev.pasosTachados.filter((n) => n !== nroPaso)
          : [...prev.pasosTachados, nroPaso],
      };
    });
  }, []);

  const setModoVista = useCallback((modo: "guiada" | "scroll") => {
    setState((prev) => ({ ...prev, modoVista: modo }));
  }, []);

  const setPasoActual = useCallback((nroPaso: number) => {
    setState((prev) => ({ ...prev, pasoActual: nroPaso }));
  }, []);

  const iniciarTimer = useCallback((nroPaso: number, durMs: number) => {
    setState((prev) => ({
      ...prev,
      timersActivos: { ...prev.timersActivos, [nroPaso]: { startMs: Date.now(), durMs } },
    }));
  }, []);

  const cancelarTimer = useCallback((nroPaso: number) => {
    setState((prev) => {
      const { [nroPaso]: _, ...rest } = prev.timersActivos;
      return { ...prev, timersActivos: rest };
    });
  }, []);

  const clearAll = useCallback(() => {
    try { localStorage.removeItem(lsKey(sessionKey)); } catch { /* ignore */ }
    setStateRaw({ ...INITIAL });
  }, [sessionKey]);

  return { state, toggleTachado, setModoVista, setPasoActual, iniciarTimer, cancelarTimer, clearAll };
}
