// src/lib/fechaHistorial.ts — helpers de formato para el historial

const MES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'] as const;
const MES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'] as const;

export function formatFechaCorta(iso: string): { dia: string; mes: string } {
  const parts = iso.split('-');
  return {
    dia: String(parseInt(parts[2], 10)),
    mes: MES_CORTO[parseInt(parts[1], 10) - 1],
  };
}

export function formatMesAnio(iso: string): string {
  const [y, m] = iso.split('-');
  return `${MES_LARGO[parseInt(m, 10) - 1]} ${y}`;
}
