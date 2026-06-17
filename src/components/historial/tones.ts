// src/components/historial/tones.ts — colores por resultado

import type { Resultado } from "../../types/models";

export const RESULTADO_TONES: Record<Resultado | "", { bg: string; color: string }> = {
  "Excelente":  { bg: 'var(--ok-bg)',      color: 'var(--ok-text)' },
  "Muy bueno":  { bg: 'var(--ok-bg)',      color: 'var(--ok-text)' },
  "Bueno":      { bg: 'var(--info-bg)',    color: 'var(--info-text)' },
  "Regular":    { bg: 'var(--warn-bg)',    color: 'var(--warn-text)' },
  "Malísimo":   { bg: 'var(--err-bg)',     color: 'var(--err-text)' },
  "":           { bg: 'var(--surface-alt)', color: 'var(--muted)' },
};
