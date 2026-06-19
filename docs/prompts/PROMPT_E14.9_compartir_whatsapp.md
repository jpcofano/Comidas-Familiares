# PROMPT E14.9 — Compartir la compra por WhatsApp

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> **A implementar ahora.** Numerar al próximo libre si `E14.9` ya existe.
>
> **Nota:** este prompt es **solo la parte de WhatsApp**. La otra parte que se había propuesto
> (avisos in-app sin push) queda **descartada** — se reemplaza por el push real del PROMPT E15.0.
>
> **Contexto verificado:** la compra rápida vive como `Plan` con `tipoSeleccion:"compra-rapida"`,
> `itemsCompraRapida: ItemCompraRapida[]` (`nombre`, `cantidad`, `unidad`, `seccionGondola`,
> `comprado`). La lista agregada de recetas vive en `compras/{idLista}` + subcolección `items`
> (con `seccion`, cantidad sumada, flag de comprado/"ya tengo"). El mapeo de góndolas display está
> en `src/lib/gondolas.ts` (`ORDEN_GONDOLA_DISPLAY`, con Fiambrería ya separada).
>
> **Es capa de lectura + UI. NO toca reglas de Firestore ni agrega colecciones.**

---

## TAREA 1 — `src/lib/compartirLista.ts` (nuevo)

```ts
import { ORDEN_GONDOLA_DISPLAY, seccionDisplay } from "./gondolas"; // usar el mapeo real existente

interface ItemTexto {
  nombre: string;
  cantidad?: string;
  unidad?: string;
  seccion: string;     // valor raw de góndola (ej. "Fiambreria")
  comprado: boolean;
}

// Arma el texto de los PENDIENTES, agrupado por góndola en el orden de la lista.
export function construirTextoLista(
  titulo: string,
  subtitulo: string | null,
  items: ItemTexto[],
): string {
  const pend = items.filter((i) => !i.comprado);
  const porSeccion = new Map<string, ItemTexto[]>();
  for (const it of pend) {
    const s = seccionDisplay(it.seccion);              // "Fiambreria" → "Fiambrería"
    if (!porSeccion.has(s)) porSeccion.set(s, []);
    porSeccion.get(s)!.push(it);
  }
  const lineas: string[] = [`🛒 ${titulo}`];
  if (subtitulo) lineas.push(subtitulo);
  lineas.push("");
  for (const sec of ORDEN_GONDOLA_DISPLAY) {           // respeta el orden de góndola
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

// Comparte: hoja nativa en móvil (WhatsApp/Telegram/etc.), wa.me como fallback.
export async function compartirLista(texto: string): Promise<void> {
  if (navigator.share) {
    try { await navigator.share({ text: texto }); }
    catch { /* el usuario canceló → no abrir wa.me (sería doble) */ }
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
}
```
> Si en `gondolas.ts` la función de normalización raw→display tiene otro nombre, usar ese; lo
> importante es que **agrupe por el orden de `ORDEN_GONDOLA_DISPLAY`** y muestre Fiambrería separada.

---

## TAREA 2 — Botón "Compartir lista"

Botón verde WhatsApp (definir el verde como constante local del componente, ej. `#1f8a4c`; **no**
agregarlo a la paleta global), con ícono de WhatsApp inline SVG. Dos lugares:

1. **Compra rápida activa** (card del dashboard y/o detalle): mapear `itemsCompraRapida` →
   `ItemTexto` (`seccionGondola`→`seccion`) y llamar:
   ```ts
   const texto = construirTextoLista(
     `Compra · ${destino}`,
     plan.encargado ? `(la hace ${nombreEncargado})` : null,
     items,
   );
   compartirLista(texto);
   ```
2. **Lista agregada** (`/compras`): mapear los `items` de `compras/{idLista}` → `ItemTexto`
   (`nombrePreferido`/`nombre`, cantidad sumada + unidad, `seccion`, comprado/"ya tengo").

---

## Cierre
1. **MAPEO_FIRESTORE.md**: anotar que compartir es **derivado** (no persiste nada). Bump de versión.
2. **Tests** (`compartirLista.test.ts`): agrupa por góndola en el orden correcto; omite los
   comprados; formato de líneas (título, secciones en mayúscula, viñetas, cierre); `compartirLista`
   usa `wa.me` cuando no hay `navigator.share` (mock de `window.open`).
3. `npm test` verde, `npm run build` ok. Sin cambios de reglas ni deploy de Firestore.
4. Pegar diff de `compartirLista.ts`, la card de compra activa y `Compras.tsx`.

```
git commit -m "E14.9: compartir compra por WhatsApp (navigator.share / wa.me), agrupada por góndola"
```

## Criterios de aceptación
1. "Compartir lista" arma el texto agrupado por góndola (orden correcto, solo pendientes,
   Fiambrería separada) y abre la hoja nativa en móvil o `wa.me` en desktop.
2. Funciona para la compra rápida y para la lista agregada de `/compras`.
3. Los ítems ya comprados no aparecen en el texto.
4. Sin permisos nuevos, sin push, sin cambios de reglas.
```
