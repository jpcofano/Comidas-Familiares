import type { MiembroId } from "../types/models";

export function calcularPromedio(votos: Record<MiembroId, number | null>): number {
  const valores = Object.values(votos).filter((v): v is number => typeof v === "number");
  if (valores.length === 0) return 0;
  const sum = valores.reduce((a, b) => a + b, 0);
  return Math.round((sum / valores.length) * 10) / 10;
}

export function calcularResultadoTextual(promedio: number): string {
  if (promedio >= 9) return "Excelente";
  if (promedio >= 7.5) return "Muy bueno";
  if (promedio >= 6) return "Bueno";
  if (promedio >= 4) return "Regular";
  if (promedio > 0) return "Malísimo";
  return "";
}

export function proximoIdHistorial(): string {
  const now = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  const fecha = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `HIST-${fecha}-${rand}`;
}
