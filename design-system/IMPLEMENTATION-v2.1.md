# Prompt para Claude Code — Comida Familiar v2 (refresh @ 4267df1)

> Copiá todo lo que está debajo de la línea horizontal y pegalo en una sesión de Claude Code abierta en el repo `Comidas-Familiares`. Carpeta `/design-system/` ya está en el repo con assets, tokens y prototipos.

---

Hola. Esta es una **revisión del IMPLEMENTATION-v2.md original**, actualizada contra el HEAD del repo (`4267df1`). Ya hiciste casi todo el Bloque 0 (brand install) y extrajiste los componentes v2 del Home — gracias. Quedan **4 fixes chiquitos**, las pantallas grandes (Compras, Cocinar, Detalle de receta, Historial) y el Home WeekStrip.

═══════════════════════════════════════════════════════════════════
ESTADO ACTUAL — qué ya está hecho
═══════════════════════════════════════════════════════════════════

✅ `src/index.css` y `src/App.css` borrados
✅ `src/styles/tokens.css` tiene `--fw-semibold`, `--shadow-toast`, `--on-primary`
✅ `public/favicon.svg` + `public/icons/*` + `public/manifest.json` con PWA bundle
✅ `index.html` con bloque PWA completo + 9 splashes
✅ `src/brand/PlatoMark.tsx` creado
✅ `LoginScreen` usa `<PlatoMark size={40} variant="vapor">`
✅ `Header` tiene el chip 28px con `<PlatoMark size={16} variant="simple">`
✅ Componentes v2 extraídos: `WeekStrip`, `MemberAvatar` + `AvatarStack`, `PlanCard` (~14KB), `CompraProgress`

═══════════════════════════════════════════════════════════════════
BLOQUE 0bis — Fixes chiquitos pendientes
═══════════════════════════════════════════════════════════════════

## 0bis.1 `index.html`

Dos micro-cambios:

```diff
-<html lang="en">
+<html lang="es-AR">

-<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
+<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

El peso 600 hace falta porque `--fw-semibold: 600` se usa en varios lugares (incluyendo el nuevo Cocinar).

## 0bis.2 `src/styles/tokens.css`

Borrar el comment header stale:

```diff
-     PALETA — Estilo B · Cocina cálida (provisoria)
-     A revisar en Etapa 6 con Claude Design
+     PALETA · Cocina cálida — Comida Familiar Design System v1.0
+     Source of truth: design-system/tokens/colors_and_type.css
```

## 0bis.3 Limpiar `public/splash/` duplicado

`public/splash/` tiene los mismos 11 archivos que `public/icons/splash/`. Solo se usa `public/icons/splash/` (es lo que referencia `index.html`). Borrar el folder duplicado:

```sh
rm -rf public/splash/
```

## 0bis.4 Bug semántico en `src/components/PlanCard.tsx` (descarte)

En la confirmación de descarte el botón Confirmar usa `background: 'var(--accent)'` inline. Está bien — pero ojo: cuando todo lo demás del sistema empiece a usar utility classes (`.btn-danger`), esto va a quedar inconsistente. Llevalo a una utility class de `utilities.css`:

```css
/* En src/styles/utilities.css */
.btn-danger {
  background: var(--accent);
  color: #fff;
}
.btn-danger:hover:not(:disabled) {
  background: var(--accent-strong);
}
```

Y en `PlanCard.tsx` linea ~262:

```diff
-<button
-  className="btn btn-primary"
-  onClick={handleDescartar}
-  disabled={busy}
-  style={{ fontSize: "var(--fs-sm)", background: "var(--accent)", flex: 1 }}
->
+<button
+  className="btn btn-danger"
+  onClick={handleDescartar}
+  disabled={busy}
+  style={{ fontSize: "var(--fs-sm)", flex: 1 }}
+>
```

═══════════════════════════════════════════════════════════════════
BLOQUE 1 — Helpers compartidos (extender los existentes)
═══════════════════════════════════════════════════════════════════

**OJO:** ya existe `src/lib/catalogo.ts` con `ORDEN_GONDOLA` exportado. No crear `src/lib/gondolas.ts` paralelo — **extender el existente**.

## 1.1 Extender `src/lib/catalogo.ts`

Agregar:

```ts
// src/lib/catalogo.ts (al final)

export type SeccionGondola = typeof ORDEN_GONDOLA[number];

export interface SeccionMeta {
  color: string;  // oklch para mantener armonía con el brand
  letra: string;  // 1 char para el chip
}

export const SECCIONES_META: Record<string, SeccionMeta> = {
  'Verdulería': { color: 'oklch(0.62 0.07 130)', letra: 'V' },
  'Carnicería': { color: 'oklch(0.55 0.10 25)',  letra: 'C' },
  'Lácteos':    { color: 'oklch(0.78 0.04 90)',  letra: 'L' },
  'Almacén':    { color: 'oklch(0.62 0.08 60)',  letra: 'A' },
  'Panadería':  { color: 'oklch(0.65 0.07 50)',  letra: 'P' },
  // fallback para "Despensa / otros" y secciones no canónicas:
  'Despensa / otros': { color: 'var(--muted)', letra: '·' },
};

export function getSeccionMeta(seccion: string): SeccionMeta {
  return SECCIONES_META[seccion] ?? SECCIONES_META['Despensa / otros'];
}

/**
 * Agrupa items por sección de góndola en orden canónico de ORDEN_GONDOLA.
 * El campo de sección lo configurás vos vía el getter.
 * Útil para Compras (item.seccionGondola) y para Receta (ing.seccion).
 */
export function groupByGondola<T>(
  items: T[],
  getSeccion: (item: T) => string,
): Array<{ seccion: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const sec = getSeccion(it) || 'Despensa / otros';
    if (!map.has(sec)) map.set(sec, []);
    map.get(sec)!.push(it);
  }
  const out: Array<{ seccion: string; items: T[] }> = [];
  for (const sec of ORDEN_GONDOLA) {
    if (map.has(sec)) out.push({ seccion: sec, items: map.get(sec)! });
  }
  // No reconocidas al final
  for (const [sec, items] of map) {
    if (!ORDEN_GONDOLA.includes(sec as SeccionGondola)) out.push({ seccion: sec, items });
  }
  return out;
}
```

## 1.2 Nuevo `src/components/GondolaChip.tsx`

```tsx
// src/components/GondolaChip.tsx
import { getSeccionMeta } from "../lib/catalogo";

interface GondolaChipProps {
  seccion: string;
  size?: 16 | 18 | 20 | 22 | 26;
}

export function GondolaChip({ seccion, size = 22 }: GondolaChipProps) {
  const meta = getSeccionMeta(seccion);
  return (
    <span
      aria-label={seccion}
      style={{
        width: size, height: size,
        borderRadius: size <= 18 ? 5 : 7,
        background: meta.color, color: '#fff',
        fontSize: size * 0.55, fontWeight: 700, lineHeight: 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >{meta.letra}</span>
  );
}
```

═══════════════════════════════════════════════════════════════════
BLOQUE 2 — Lista de compras (rewrite)
═══════════════════════════════════════════════════════════════════

**Variante elegida:** C (Recetas envueltas con chips). Referencia: `/design-system/prototypes/lista-compras/index.html` tab C. Código: `compras-variant-c.jsx`.

## 2.1 Estructura final de `src/routes/Compras.tsx`

Mantené la lógica de fetch igual (`subscribeToPlanesActivos`, `getListaById`, `subscribeToItemsLista`, `toggleItemYaTengo`). Cambia toda la presentación.

**Borrar:**
- `ItemRow`, `GrupoSeccion` actuales
- El toggle `Filtro` (todo/pendientes/yaTengo) — ya no hay filtro
- Los dos toggles segmentados feos en `<div border-radius overflow:hidden>`

**Crear en `src/components/compras/`:**

- `ProgressRing.tsx` — ring 54px, dasharray bordó. Props: `done: number`, `total: number`. **OJO:** el número grande adentro es `total - done` (lo que falta), no `done`. Label "FALTAN" 8px uppercase abajo.
- `IngredienteChip.tsx` — props: `item: ItemCompra`, `idLista: string`. Toggle directo. Estados pending → `--surface-alt` bg, done → `--ok-bg` bg con line-through. **Crítico:** `whiteSpace: nowrap` en el chip y en el span de cantidad para que "3 un" no se rompa. `formatearCantidadUnidad(item.cantidadTotal, item.unidad)` para la cantidad.
- `RecetaCard.tsx` — wrapper de receta. Header: día badge a la izquierda (vertical: `DIA` uppercase + número grande), nombre + porciones + cocineros, stamp "✓ Lista" cuando completa, color band izquierdo (4px) según día. Body: ingredientes agrupados por góndola usando `groupByGondola(item.aportes, a => item.seccionGondola)` — esperá, no, group por sección de cada item, ver §2.3.
- `GondolaCard.tsx` — vista alterna. Header: `<GondolaChip size={26}>` + nombre sección + count. Body: mismos chips agrupados por nombre.
- `SubheaderGondola.tsx` — chip 18px + nombre uppercase 11px muted, dentro de RecetaCard al agrupar items.
- `PillToggle.tsx` — chip "Por receta" / "Por góndola" en `--primary` cuando activo.
- `EmptyState.tsx` (opcional) — caja con icono y copy distinta según si hay planes y si lista vacía.

## 2.2 Toggle y default

- Default: `"receta"` (era "gondola").
- 2 opciones: "Por receta" y "Por góndola". Sin filtro Todo/Pendientes/YaTengo.
- Items completados se ven inline atenuados, no se ocultan.

## 2.3 Agrupación por góndola DENTRO de cada receta

Cuando estás en vista "Por receta", para cada receta:

```ts
// Para cada receta (group lo da `agruparPorReceta(items)` que ya existe):
const itemsDeReceta: ItemCompra[] = ...;
const porGondola = groupByGondola(itemsDeReceta, (it) => it.seccionGondola);
// Renderea cada g.seccion con SubheaderGondola + chips
```

Subheader chico arriba de cada grupo (chip 18px V/C/L/A/P + nombre uppercase muted).

## 2.4 Tipo correcto

Es `ItemCompra` (no `Item`):

```ts
import type { ItemCompra } from "../types/models";

// Campos relevantes para los nuevos componentes:
// - item.id              (no item.id como string genérico — es el doc id)
// - item.nombrePreferido (no item.nombre)
// - item.seccionGondola  (no item.seccion)
// - item.cantidadTotal   (number)
// - item.cantidadLabel   (string display)
// - item.unidad
// - item.yaTengo
// - item.aportes: AporteCompra[]
// - item.opcional
```

## 2.5 Header + ProgressRing

```tsx
<header style={{ padding: '14px 20px 12px' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
    <div>
      <h1>Lista de compras</h1>
      <p className="meta">Cocinamos {planes.length} comidas esta semana</p>
    </div>
    <ProgressRing done={yaTengoCount} total={items.length} />
  </div>
</header>
```

═══════════════════════════════════════════════════════════════════
BLOQUE 3 — Cocinar (refactor)
═══════════════════════════════════════════════════════════════════

**Referencia:** `/design-system/prototypes/cocinar/index.html`. Código: `cocinar-flow.jsx`.

## 3.1 Estado y orquestador

`useCocinarState.ts` ya existe — extenderlo:

```ts
// src/hooks/useCocinarState.ts (agregar al state)
interface CocinarState {
  // ...existente
  pasoActual: number;       // cursor "acá vas", default = primer paso no completado
  modo: 'guiada' | 'scroll';  // por default 'guiada'
}

// Acciones nuevas:
// - setPasoActual(nro)
// - setModo(modo)
// - siguiente() → marca actual + busca próximo no-completado + scroll
// - anterior() → solo cambia pasoActual al previo
```

`src/routes/Cocinar.tsx` se convierte en orquestador que renderea `FlowHeader` + `GuidedBody | ScrollBody` + `FlowBottom`. **PasoCard.tsx existente** se mantiene pero se usa SOLO dentro de `ScrollBody`. **TimerBar.tsx existente** se reemplaza por `LiveTimer` nuevo.

## 3.2 Componentes nuevos en `src/components/cocinar/`

- `FlowHeader.tsx` — sticky top. Back button + chip "COCINANDO" + título de receta truncated + toggle "Ver todos" / "Paso a paso". Progress bars (una por paso, clickeables, color: `--ok-text` si done, `--primary` si actual, `--surface-alt` si pending, outline en el actual). Contador `Paso X de N · M hechos`.
- `FlowBottom.tsx` — sticky bottom. En guiada: botón Anterior cuadrado 48×48 + botón Siguiente flex con preview del título del próximo paso ("SIGUIENTE PASO" + título). En scroll: solo Siguiente. Cuando todo completo: muta a botón único "Finalizar cocción" full-width con sombra fuerte.
- `GuidedBody.tsx` — hero card: círculo 46px tap-eable (número o ✓) + tiempo uppercase + título 20px + LiveTimer si activo + descripción 16px + bloques Clave/Riesgo/Notas + botón "Marcar completado".
- `ScrollBody.tsx` — usa `PasoCard.tsx` existente (refactorlo si hace falta para el estado "acá vas" con borde `--primary` y pill).
- `LiveTimer.tsx` — countdown mm:ss vivo. Props: `durMin: number`, `variant: 'hero' | 'compact'`, `onCancel`. **Tipografía obligatoria:** `fontVariantNumeric: tabular-nums`, `letterSpacing: -0.03em` para que el ancho no salte. Pausar/Reanudar/Reiniciar/Cerrar. Al terminar: vira a `--ok-bg`, dispara `navigator.vibrate([200,100,200])` + `new Notification('⏱ Timer terminado', ...)`. Link "Activar avisos del navegador" en `--accent` con underline; muta a "Avisos bloqueados" si denied.
- `PasoBlock.tsx` — caja para Clave/Riesgo. Props: `variant: 'ok' | 'warn'`, `label: string`, children. Símbolo ✓ o ⚠ + label bold + texto.

## 3.3 Tipos

El tipo `Paso` del repo ya tiene los campos necesarios:

```ts
interface Paso {
  nroPaso: number;
  titulo: string;
  detalle: string;
  tiempoEstimadoLabel: string;
  tiempoEstimadoMin: number | null;  // ← usar para LiveTimer (si > 0)
  puntoClave?: string;     // ← bloque verde
  errorComun?: string;     // ← bloque amarillo
  notas?: string;          // ← párrafo italic muted
}
```

Si `tiempoEstimadoMin` es null o 0, no mostrar timer button. La descripción real es `paso.detalle` (no `paso.desc` del prototipo).

## 3.4 Notifications permission

```ts
// helper interno de LiveTimer
async function ensureNotifPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}
```

═══════════════════════════════════════════════════════════════════
BLOQUE 4 — Home WeekStrip (tweaks chicos)
═══════════════════════════════════════════════════════════════════

**Referencia:** `/design-system/prototypes/home/index.html`. Código: `home-prototype.jsx`.

## 4.1 Cambios en `src/components/WeekStrip.tsx`

### Reemplazar el header con SemanaBadge

```diff
-<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
-  <h1 style={{ margin: 0 }}>Esta semana</h1>
-  <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
-    Semana {weekNumber}
-  </span>
-</div>
+<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 14 }}>
+  <div style={{ minWidth: 0, flex: 1 }}>
+    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
+      Esta semana
+    </p>
+    <h1 style={{
+      margin: "4px 0 0", fontSize: 20, fontWeight: 700,
+      color: "var(--text-strong)", lineHeight: 1.15, letterSpacing: "-0.015em",
+      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
+    }}>
+      {planesCount} comidas planeadas
+    </h1>
+  </div>
+  <SemanaBadge rango={formatearRangoSemana(semanaInicio)} />
+</div>
```

Necesitás un `planesCount` prop nuevo (pasalo desde `HomeJP`).

**Saca `getISOWeek`** — ya no se usa.

### Crear `src/components/SemanaBadge.tsx`

```tsx
interface Props { rango: string; }
export function SemanaBadge({ rango }: Props) {
  return (
    <div style={{ textAlign: "right", lineHeight: 1.1, flexShrink: 0 }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Semana
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: "var(--text-strong)", letterSpacing: "-0.005em", whiteSpace: "nowrap" }}>
        {rango}
      </p>
    </div>
  );
}
```

Y un helper en `src/lib/fechas.ts`:

```ts
export function formatearRangoSemana(semanaInicio: string): string {
  // Input: "2026-05-26" (lunes)
  // Output: "26 may – 1 jun"
  const lunes = new Date(semanaInicio + "T12:00:00");
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const d1 = lunes.getDate(), m1 = MES[lunes.getMonth()];
  const d2 = domingo.getDate(), m2 = MES[domingo.getMonth()];
  return m1 === m2 ? `${d1} – ${d2} ${m1}` : `${d1} ${m1} – ${d2} ${m2}`;
}
```

### Cambiar el dot por Plate icon

```diff
-<span style={{
-  width: 4, height: 4, borderRadius: "50%",
-  background: hasMeal ? (isToday ? "var(--primary)" : "var(--line)") : "transparent",
-}} />
+<span style={{ height: 14, display: "flex", alignItems: "center", color: isToday ? "var(--primary)" : "var(--muted)" }}>
+  {hasMeal && <Plate size={13} filled={isToday} />}
+</span>
```

Componente nuevo en el mismo archivo (o en `src/brand/Plate.tsx` si querés):

```tsx
function Plate({ size = 12, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ display: 'block' }}>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" fill={filled ? 'currentColor' : 'none'} />
      {!filled && <circle cx="6" cy="6" r="2" fill="currentColor" />}
    </svg>
  );
}
```

═══════════════════════════════════════════════════════════════════
BLOQUE 5 — Detalle de receta (rewrite)
═══════════════════════════════════════════════════════════════════

**Referencia:** `/design-system/prototypes/detalle-receta/index.html`. Código: `detalle-receta.jsx`.

Reemplazar `src/routes/DetalleReceta.tsx`. Mantener: `getReceta`, `subscribeToPlanesActivos`, `evaluarEspecial/Extra/EnProceso`, `elegirComoEspecial`, `sumarComoExtra`, `sumarComoEnProceso`, `Toast`, `ConfirmDialog`. Cambia toda la presentación.

## 5.1 Componentes nuevos en `src/components/receta/`

- `RecetaHero.tsx` — si `receta.imagenUrl` existe, mostralo como `<img>`. Si no, placeholder 180px con gradient warm `linear-gradient(135deg, oklch(0.62 0.08 60), oklch(0.55 0.10 25))` + texto "FOTO DE LA RECETA" en `rgba(255,255,255,0.6)`.
- `MetaCards.tsx` — 3 cards en fila: Total (con `tiempoActivoLabel` activo como sub) / Porciones (`porcionesLabel`) / Dificultad (`dificultad`). Card a `--surface-alt`, label uppercase 9.5px muted, value 18px tabular-nums.
- `RecetaPill.tsx` — pill compacta. Variantes `neutral | ok | info | accent`.
- `IngredientesPorGondola.tsx` — usa `groupByGondola(receta.ingredientes, ing => ing.seccion ?? '')`. **OJO:** acá el campo es `seccion`, NO `seccionGondola` (ese es de `ItemCompra`).
  Para cada grupo: subheader con `<GondolaChip size={20}>` + nombre uppercase + count. Items en `<ul>`: nombre + cantidad-unidad tabular a la derecha. Opcionales en `--muted` con sufijo "(opcional)". Cantidad mostrada con `ing.cantidadLabel` o computada con `pluralizarUnidad(ing.unidad, ing.cantidadMax ?? ing.cantidadMin ?? 1)`.
- `PasosPreview.tsx` — muestra los primeros 3 pasos. Banner ⚠ `receta.riesgos` ANTES de los pasos. Cada paso: círculo `--primary-soft`/`--primary` con número 26px + título + `tiempoEstimadoLabel` + `detalle`. **No renderea puntoClave/errorComun acá** — esos se ven dentro de Cocinar. Botón "Ver los N pasos restantes ↓" expande inline.
- `AccionesPlan.tsx` (solo JP) — colapsable. Botón header "Agregar al plan de la semana · 3 opciones disponibles" + chevron rotate. Al expandir: 3 `<AccionRow>` (Especial / Especial extra / En proceso). Cada `AccionRow`: label bold + hint o razón cuando disabled. Click → handler. Disabled → opacity 0.6 + razón visible.
- `CocinarSticky.tsx` (solo JP) — botón sticky bottom "Empezar a cocinar" full-width `--primary` con `box-shadow: 0 6px 18px rgba(138, 74, 47, 0.28)`. Navega a `/recetas/${id}/cocinar`.

## 5.2 Orden top-to-bottom

1. `header` con back + chip `receta.tipoItem`
2. `<RecetaHero />`
3. Título 24px + `porQueEspecial` italic muted
4. `<MetaCards />` (3 cards)
5. Row de pills: `proteinaPrincipal` (accent), `escenarioUso`, `estilo`, `tecnicaPrincipal`, "Costo X", `sinLacteos`→ok, `!hidratos`→info, `aptoNocheDeADos === 'Sí'`→info
6. SectionTitle "Ingredientes" + `<IngredientesPorGondola />`
7. SectionTitle "Preparación" + `<PasosPreview />`
8. SectionTitle "Tip del cocinero" + `receta.notas` italic (solo si existe)
9. `<AccionesPlan />` (solo JP)
10. `<CocinarSticky />` (solo JP, sticky bottom, padding-bottom container ~110px)

## 5.3 Cambios de comportamiento

- **No hay botón "Cocinar" en el header de la sección Pasos.** La acción vive solo en el sticky bottom.
- **Banner ⚠ riesgos** ahora va dentro de Preparación (antes estaba siempre visible).
- **Acciones JP plegadas** por default. Antes eran 3 botones full-width apilados.

═══════════════════════════════════════════════════════════════════
BLOQUE 6 — Historial (rewrite)
═══════════════════════════════════════════════════════════════════

**Referencia:** `/design-system/prototypes/historial/index.html`. Código: `historial-prototype.jsx`.

Reemplazar `src/routes/Historial.tsx`. Mantener `getHistorialReciente`, `normalizeText`. Tipo: `Historial` con campos `idHist`, `nombreSeleccion`, `receta`, `fechaRealizada` (`"YYYY-MM-DD"`), `resultado: Resultado | ""`, `promedio: number`, `ocasion: Ocasion | ""`, `queSalioBien: string`, `queCambiaria: string`, `notasFamiliares: string`.

## 6.1 Componentes nuevos en `src/components/historial/`

- `SummaryMetrics.tsx` — 3 cards: Total / Promedio (con mini-stars + número 1 decimal) / Top (count de "Excelente" + "Muy bueno", con sub "★ excelentes"). Calculado sobre el array completo, NO sobre filtradas. Card `--surface-strong` con border `--border-subtle`.
- `Stars.tsx` — props: `value: number`, `max?: number = 5`. Color `--accent`. Half-star a opacity 0.5, vacías a 0.18.
- `FilterChips.tsx` — chips scrollables. Activo: `--primary` + #fff. Inactivo: `--surface-alt` + `--text`. Filtros fijos:
  - `todos` → "Todos"
  - `top` → "★ Top" → filtra `Excelente | Muy bueno`
  - `ok` → "Para repetir" → filtra `promedio >= 3.5`
  - `mal` → "No repetir" → filtra `Regular | Malísimo`
- `HistorialCard.tsx` — botón completo. Layout horizontal:
  - **Fecha block 48px** a la izquierda: mes uppercase 9px en color del tone + día tabular 18px
  - **Contenido medio**: nombre 15px + resultado badge (uppercase 10px, tones de la tabla `RESULTADO_TONES`), luego row `Stars` + promedio.toFixed(1) + ocasion, luego nota inline si existe (`queSalioBien` truncado a 1 línea entre comillas italic)
  - **Chevron `›`** a la derecha
- `MonthGroup.tsx` — agrupa entries por `fechaRealizada.slice(0,7)` (`YYYY-MM`). Header sticky con texto "Mayo 2026 · N", top: alto del header de la app.
- `EmptyState.tsx` — copy distinta según contexto (sin entries / sin matches por búsqueda / sin matches por filtro).

## 6.2 Helpers nuevos `src/lib/fechaHistorial.ts`

```ts
const MES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function formatFechaCorta(iso: string): { dia: string; mes: string } {
  const parts = iso.split('-');
  return { dia: String(parseInt(parts[2], 10)), mes: MES_CORTO[parseInt(parts[1], 10) - 1] };
}

export function formatMesAnio(iso: string): string {
  const [y, m] = iso.split('-');
  return `${MES_LARGO[parseInt(m, 10) - 1]} ${y}`;
}
```

## 6.3 Tabla de tonos exportable

```ts
// src/components/historial/tones.ts
import type { Resultado } from "../../types/models";

export const RESULTADO_TONES: Record<Resultado | "", { bg: string; color: string }> = {
  "Excelente":  { bg: 'var(--ok-bg)',    color: 'var(--ok-text)' },
  "Muy bueno":  { bg: 'var(--ok-bg)',    color: 'var(--ok-text)' },
  "Bueno":      { bg: 'var(--info-bg)',  color: 'var(--info-text)' },
  "Regular":    { bg: 'var(--warn-bg)',  color: 'var(--warn-text)' },
  "Malísimo":   { bg: 'var(--err-bg)',   color: 'var(--err-text)' },
  "":           { bg: 'var(--surface-alt)', color: 'var(--muted)' },
};
```

## 6.4 Lógica del filtro

```ts
const FILTROS = {
  todos: () => true,
  top:   (e: Historial) => e.resultado === 'Excelente' || e.resultado === 'Muy bueno',
  ok:    (e: Historial) => e.promedio >= 3.5,
  mal:   (e: Historial) => e.resultado === 'Regular' || e.resultado === 'Malísimo',
};
```

Aplicar **filtro primero, búsqueda después** (búsqueda con `normalizeText` ya existente). Búsqueda cubre `nombreSeleccion` + `receta` + `queSalioBien`.

## 6.5 Nota inline en la card

El prototipo asume `entry.nota`. En el repo no existe. Usá `queSalioBien` (es el comentario libre más positivo). Si está vacío, no renderees nada. Truncar a 1 línea con ellipsis.

═══════════════════════════════════════════════════════════════════
QA — antes de mergear
═══════════════════════════════════════════════════════════════════

```sh
npm install
npm run build
npm run preview
```

### Brand (ya casi todo)
- [ ] Inter cargando peso 600 (revisar Network del browser).
- [ ] `lang="es-AR"` en el html (revisar accesibilidad).

### Lista de compras
- [ ] Default vista "Por receta". Cada receta envuelta como card con día + porciones + cocineros + stamp "Lista" cuando completa.
- [ ] Toggle a "Por góndola" muestra los mismos chips agrupados por sección con chip de letra colored.
- [ ] **Dentro de cada receta**, ingredientes agrupados por góndola en orden V→C→L→A→P, con `<GondolaChip size={18}>`.
- [ ] Header con `<ProgressRing>` mostrando número de pendientes grande (no done).
- [ ] Chips no parten la cantidad ("3 un" en una sola línea).
- [ ] Sin filtro Todo/Pendientes/YaTengo. Items completados inline atenuados.

### Cocinar
- [ ] Toggle "Ver todos" / "Paso a paso" en el header funciona y preserva el estado (qué tachaste, cursor, timer).
- [ ] Bars de progreso clickeables saltan al paso.
- [ ] En guiada: botón Siguiente muestra el título del próximo paso. Anterior 48×48 a la izquierda.
- [ ] En scroll: paso actual tiene borde `--primary` + pill "ACÁ VAS".
- [ ] LiveTimer: countdown mm:ss, ancho estable (tabular-nums + tracking ajustado). Pausar/reanudar mantiene tiempo. Al terminar: verde + vibrate + Notification si permite.
- [ ] Clave/Riesgo/Notas aparecen cuando el paso los tiene en el campo correcto del tipo `Paso`.

### Home
- [ ] "SEMANA / 26 may – 1 jun" arriba a la derecha. Sin número de semana ISO.
- [ ] Título "N comidas planeadas" en una sola línea (20px, ellipsis si overflowa).
- [ ] Días con comida muestran `<Plate>`: hoy filled, otros outlined. Días sin comida no muestran nada (mantienen altura).

### Detalle de receta
- [ ] Hero placeholder gradient o `<img>` real si `receta.imagenUrl`.
- [ ] 3 meta cards Total / Porciones / Dificultad.
- [ ] Pills: `proteinaPrincipal` en accent, dietéticos en ok/info.
- [ ] Ingredientes agrupados por góndola en V→C→L→A→P, chip de letra coloreado.
- [ ] Solo 3 pasos visibles por default; botón "Ver los N pasos restantes ↓".
- [ ] Riesgos como banner ⚠ DENTRO de Preparación.
- [ ] Acciones JP plegadas en un botón único "Agregar al plan".
- [ ] Botón "Empezar a cocinar" sticky bottom.
- [ ] Confirmación de reemplazo de Especial sigue funcionando.

### Historial
- [ ] 3 summary cards Total / Promedio (+ stars) / Top.
- [ ] Filtros chips Todos / ★ Top / Para repetir / No repetir scrollables.
- [ ] Search bar combinable con filtros.
- [ ] Cards con fecha block 48px + nombre + badge resultado + Stars + promedio + ocasion + `queSalioBien` como blockquote italic truncada.
- [ ] Agrupado por mes con headers sticky "Mayo 2026 · N".
- [ ] Empty state cambia copy según contexto.

═══════════════════════════════════════════════════════════════════
NO toques
═══════════════════════════════════════════════════════════════════

- Routing en `App.tsx` (rutas ya están perfectas).
- `BottomNav.tsx`.
- `src/data/*` y `src/auth/*`.
- Schema de Firestore.
- Hooks de fetch (`subscribeToPlanesActivos`, `getReceta`, `getListaById`, `subscribeToItemsLista`, `toggleItemYaTengo`, `getHistorialReciente`, etc).
- `src/lib/elegibilidad.ts`, `src/lib/canonical.ts`, `src/lib/unidades.ts`, `src/lib/fechas.ts` (extender, no rewrite).
- Tests existentes (si rompen por tipos nuevos, avisame antes).

═══════════════════════════════════════════════════════════════════
Cuando termines
═══════════════════════════════════════════════════════════════════

`git diff --stat` + lista de archivos nuevos creados + lista de tests que rompieron (si rompió alguno).
