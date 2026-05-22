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

function formatLocal(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
