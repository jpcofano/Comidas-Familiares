import { ORDEN_GONDOLA_DISPLAY, seccionDisplay } from "./gondolas";

export interface ItemTexto {
  nombre: string;
  cantidad?: string;
  unidad?: string;
  seccion: string;  // valor raw de góndola (ej. "Fiambreria")
  comprado: boolean;
}

/** Arma el texto de los PENDIENTES, agrupado por góndola en el orden de la lista. */
export function construirTextoLista(
  titulo: string,
  subtitulo: string | null,
  items: ItemTexto[],
): string {
  const pend = items.filter((i) => !i.comprado);
  const porSeccion = new Map<string, ItemTexto[]>();
  for (const it of pend) {
    const s = seccionDisplay(it.seccion);
    if (!porSeccion.has(s)) porSeccion.set(s, []);
    porSeccion.get(s)!.push(it);
  }
  const lineas: string[] = [`🛒 ${titulo}`];
  if (subtitulo) lineas.push(subtitulo);
  lineas.push("");
  for (const sec of ORDEN_GONDOLA_DISPLAY) {
    const grupo = porSeccion.get(sec);
    if (!grupo?.length) continue;
    lineas.push(sec.toUpperCase());
    for (const it of grupo) {
      const cant = [it.cantidad, it.unidad].filter(Boolean).join(" ");
      lineas.push(`• ${it.nombre}${cant ? ` — ${cant}` : ""}`);
    }
    lineas.push("");
  }
  lineas.push("— Comida Familiar");
  return lineas.join("\n");
}

/** Comparte: hoja nativa en móvil (WhatsApp/Telegram/etc.), wa.me como fallback. */
export async function compartirLista(texto: string): Promise<void> {
  if (navigator.share) {
    try { await navigator.share({ text: texto }); }
    catch { /* usuario canceló → no abrir wa.me */ }
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
}
