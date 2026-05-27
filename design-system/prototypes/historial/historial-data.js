// historial-data.js — Mock historial entries spanning 3 months
window.HISTORIAL_ENTRIES = [
  { idHist: 'h01', nombreSeleccion: 'Milanesas con puré', receta: 'r1', fechaRealizada: '2026-05-24', resultado: 'Excelente', promedio: 4.8, ocasion: 'Cena familiar', nota: 'Salieron perfectas. Repetir tal cual.' },
  { idHist: 'h02', nombreSeleccion: 'Pollo al horno con papas', receta: 'r2', fechaRealizada: '2026-05-22', resultado: 'Muy bueno', promedio: 4.4, ocasion: 'Almuerzo', nota: 'Faltó un poco de sal' },
  { idHist: 'h03', nombreSeleccion: 'Tallarines bolognesa', receta: 'r3', fechaRealizada: '2026-05-19', resultado: 'Muy bueno', promedio: 4.2, ocasion: 'Cena familiar' },
  { idHist: 'h04', nombreSeleccion: 'Ensalada caprese', receta: 'r4', fechaRealizada: '2026-05-16', resultado: 'Bueno', promedio: 3.7, ocasion: 'Almuerzo liviano' },
  { idHist: 'h05', nombreSeleccion: 'Risotto de hongos', receta: 'r5', fechaRealizada: '2026-05-14', resultado: 'Regular', promedio: 2.9, ocasion: 'Probando', nota: 'Quedó muy líquido — bajar el caldo.' },
  { idHist: 'h06', nombreSeleccion: 'Pizza casera', receta: 'r6', fechaRealizada: '2026-05-10', resultado: 'Excelente', promedio: 4.9, ocasion: 'Sábado familiar' },
  { idHist: 'h07', nombreSeleccion: 'Wok de verduras', receta: 'r7', fechaRealizada: '2026-05-08', resultado: 'Bueno', promedio: 3.5, ocasion: 'Cena rápida' },
  { idHist: 'h08', nombreSeleccion: 'Tarta de jamón y queso', receta: 'r8', fechaRealizada: '2026-04-29', resultado: 'Muy bueno', promedio: 4.1, ocasion: 'Cena familiar' },
  { idHist: 'h09', nombreSeleccion: 'Sopa de calabaza', receta: 'r9', fechaRealizada: '2026-04-25', resultado: 'Malísimo', promedio: 1.8, ocasion: 'Probando', nota: 'No volver a hacer. Faltó sabor.' },
  { idHist: 'h10', nombreSeleccion: 'Empanadas de carne', receta: 'r10', fechaRealizada: '2026-04-22', resultado: 'Excelente', promedio: 4.7, ocasion: 'Reunión' },
  { idHist: 'h11', nombreSeleccion: 'Quinoa con vegetales', receta: 'r11', fechaRealizada: '2026-04-18', resultado: 'Bueno', promedio: 3.4, ocasion: 'Almuerzo' },
  { idHist: 'h12', nombreSeleccion: 'Asado del domingo', receta: 'r12', fechaRealizada: '2026-04-13', resultado: 'Excelente', promedio: 4.9, ocasion: 'Familia ampliada' },
];

window.formatFecha = function (iso) {
  const [y, m, d] = iso.split('-');
  const MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d, 10)} ${MES[parseInt(m, 10) - 1]}`;
};

window.formatMesAnio = function (iso) {
  const [y, m] = iso.split('-');
  const MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${MES[parseInt(m, 10) - 1]} ${y}`;
};
