const MES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'] as const;

/** Input: "2026-05-26" (lunes). Output: "26 may – 1 jun" */
export function formatearRangoSemana(semanaInicio: string): string {
  const lunes = new Date(semanaInicio + "T12:00:00");
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const d1 = lunes.getDate(), m1 = MES_CORTO[lunes.getMonth()];
  const d2 = domingo.getDate(), m2 = MES_CORTO[domingo.getMonth()];
  return m1 === m2 ? `${d1} – ${d2} ${m1}` : `${d1} ${m1} – ${d2} ${m2}`;
}

export function getSemanaActual(): string {
  return getLunesLocal(new Date());
}

export function getSemanaFin(semanaInicio: string): string {
  const d = new Date(semanaInicio + "T12:00:00");
  d.setDate(d.getDate() + 6);
  return formatLocal(d);
}

function getLunesLocal(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() + diff);
  return formatLocal(lunes);
}

/**
 * Convierte una fecha "YYYY-MM-DD" al índice de día de la semana (0=Lun, 6=Dom).
 * Devuelve null si la cadena es vacía o inválida.
 */
export function fechaToWeekIdx(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const dow = d.getDay(); // 0=Dom, 1=Lun … 6=Sáb
  return dow === 0 ? 6 : dow - 1; // Mon=0 … Sun=6
}

/** Devuelve la fecha de hoy en formato "YYYY-MM-DD" (local time). */
export function fechaHoy(): string {
  return formatLocal(new Date());
}

export function formatLocal(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
