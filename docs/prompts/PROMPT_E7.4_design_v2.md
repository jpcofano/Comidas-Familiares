# Prompt para Claude Code — Comida Familiar v2

> Copiá todo lo que está debajo de la línea horizontal y pegalo en una sesión de Claude Code abierta en el repo `Comidas-Familiares`. El folder `/design-system/` en el repo tiene los assets y prototipos referenciados.

---

Hola. Diseño cerrado v2. Necesito implementar todo esto en un solo PR. Los prototipos React están en `/design-system/prototypes/<pantalla>/` con todo el código interactivo — usalos como referencia visual y de comportamiento. Tokens en `/design-system/tokens/`. Assets en `/design-system/assets/`.

Hacelo **en este orden**. Cada bloque depende del anterior.

═══════════════════════════════════════════════════════════════════
BLOQUE 0 — Brand install (heredado del audit anterior, sin hacer)
═══════════════════════════════════════════════════════════════════

## 0.1 Limpiar scaffold de Vite

Borrá `src/index.css` y `src/App.css` (son scaffold Vite que pisa los tokens con `--accent: #aa3bff` morado). Quitá los imports en `src/main.tsx` y `src/App.tsx`.

## 0.2 Completar tokens

Copiá `/design-system/tokens/colors_and_type.css` → `src/styles/tokens.css` (overwrite). Tiene `--fw-semibold: 600` y `--shadow-toast` que el código actual usa pero no estaban definidos.

## 0.3 PWA assets

Copiá:
```
design-system/assets/favicon.svg              → public/favicon.svg (overwrite)
design-system/assets/pwa/manifest.json        → public/manifest.json
design-system/assets/pwa/favicon-*.png        → public/icons/favicon-*.png
design-system/assets/pwa/apple-touch-icon.png → public/icons/apple-touch-icon.png
design-system/assets/pwa/icon-*.png           → public/icons/icon-*.png
design-system/assets/pwa/icon-maskable-*.png  → public/icons/icon-maskable-*.png
design-system/assets/pwa/splash/*.png         → public/icons/splash/*.png
```

## 0.4 `index.html`

Reemplazar completo por (`lang="es-AR"`, bloque PWA, Inter w/ 600, splash media queries — copiar de `/design-system/handoff/AUDIT.md § B.2`).

## 0.5 `src/brand/PlatoMark.tsx`

Carpeta nueva. Componente con `variant: 'vapor' | 'simple'`. Código completo en `/design-system/handoff/AUDIT.md § B.3`.

## 0.6 LoginScreen + Header

- En `src/auth/LoginScreen.tsx` reemplazar `<ChefHat>` por `<PlatoMark size={40} variant="vapor">`.
- En `src/layout/Header.tsx` agregar chip 28px con `<PlatoMark size={16} variant="simple">` antes del título. CSS en `Header.css` (snippet en AUDIT.md § B.5).

═══════════════════════════════════════════════════════════════════
BLOQUE 1 — Helpers compartidos
═══════════════════════════════════════════════════════════════════

## 1.1 `src/lib/gondolas.ts`

```ts
// src/lib/gondolas.ts
import type { Item } from "../types/models";

export const ORDEN_GONDOLA = [
  'Verdulería', 'Carnicería', 'Lácteos', 'Almacén', 'Panadería',
] as const;
export type Seccion = typeof ORDEN_GONDOLA[number];

export const SECCIONES: Record<Seccion, { color: string; letra: string }> = {
  'Verdulería': { color: 'oklch(0.62 0.07 130)', letra: 'V' },
  'Carnicería': { color: 'oklch(0.55 0.10 25)',  letra: 'C' },
  'Lácteos':    { color: 'oklch(0.78 0.04 90)',  letra: 'L' },
  'Almacén':    { color: 'oklch(0.62 0.08 60)',  letra: 'A' },
  'Panadería':  { color: 'oklch(0.65 0.07 50)',  letra: 'P' },
};

export interface GrupoGondola<T> {
  seccion: Seccion;
  items: T[];
}

/** Devuelve items agrupados por góndola, en orden canónico, solo secciones presentes. */
export function groupByGondola<T extends { seccion: string }>(items: T[]): GrupoGondola<T>[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    if (!map.has(it.seccion)) map.set(it.seccion, []);
    map.get(it.seccion)!.push(it);
  }
  // sort within sección by nombre if available
  for (const list of map.values()) {
    list.sort((a, b) => (a as any).nombre?.localeCompare?.((b as any).nombre, 'es') ?? 0);
  }
  const out: GrupoGondola<T>[] = [];
  for (const sec of ORDEN_GONDOLA) {
    if (map.has(sec)) out.push({ seccion: sec as Seccion, items: map.get(sec)! });
  }
  return out;
}
```

Si el tipo `Item` no tiene `seccion` literal a esos valores, ajustá el genérico — la idea es que sea reutilizable desde Compras y desde DetalleReceta.

## 1.2 `src/components/GondolaChip.tsx`

```tsx
import { SECCIONES, type Seccion } from "../lib/gondolas";

interface GondolaChipProps {
  seccion: Seccion;
  size?: 18 | 22 | 26;
}

export function GondolaChip({ seccion, size = 22 }: GondolaChipProps) {
  const meta = SECCIONES[seccion];
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
BLOQUE 2 — Lista de compras (rewrite total)
═══════════════════════════════════════════════════════════════════

**Variante elegida: C (Recetas envueltas).** Referencia visual: `/design-system/prototypes/lista-compras/index.html` → tab C. Código completo en `compras-variant-c.jsx`.

## 2.1 Estructura

Reemplazar `src/routes/Compras.tsx` completo. Componentes a extraer en `src/components/`:

- `ProgressRing.tsx` — reutilizable. Props: `done: number`, `total: number`. Muestra arco bordó + número de pendientes en el centro. **Cuidado:** el número grande es `total - done`, no `done` (lo que falta, no lo hecho).
- `IngredienteChip.tsx` — el chip tap-eable. Props: `item`, `onToggle`. Estados: pending / done (verde `--ok-bg` con line-through). `whiteSpace: nowrap` obligatorio para que "3 un" no se rompa.
- `RecetaCardV2.tsx` — wrapper de la receta con: day badge a la izquierda (`Dom 28` apilado), título + porciones + cocineros (`AvatarStack`), stamp "✓ Lista" cuando completa, color band izquierdo según día, barrita de progreso al fondo cuando hay items hechos.
- `GondolaCardV2.tsx` — vista alterna (toggle "Por góndola"). Mismo lenguaje visual: GondolaChip 26px a la izquierda, items como chips abajo.
- `IngredienteSubheader.tsx` — dentro de RecetaCardV2 y GondolaCardV2 cuando agrupa: chip 18px + nombre en uppercase 11px muted.

## 2.2 Comportamientos

- Toggle "Por receta" / "Por góndola" en el header. Default: por receta.
- **Dentro de cada receta**, items agrupados por góndola (usando `groupByGondola`).
- Header con ProgressRing a la derecha. **Sacar** la barra lineal y el pill `0/16`.
- Click en un chip → toggle yaTengo del item.
- Cuando una receta entera está completa → stamp "✓ Lista" + opacity 0.82 en el card.

## 2.3 Tipos & data

El backend ya devuelve `Item` con `seccion`, `recetas: string[]`, `yaTengo: boolean`. Usá los hooks existentes (`useListaCompras` o equivalente). **Eliminá** la lógica actual de filtro Todo/Pendientes/Ya tengo — ya no hay filtro, los completed se ven inline (atenuados) y el toggle es solo el icono.

═══════════════════════════════════════════════════════════════════
BLOQUE 3 — Cocinar (refactor completo)
═══════════════════════════════════════════════════════════════════

**Referencia visual:** `/design-system/prototypes/cocinar/index.html`. Código en `cocinar-flow.jsx`.

## 3.1 Estructura nueva

`src/routes/Cocinar.tsx` se convierte en orquestador. Componentes nuevos en `src/components/cocinar/`:

- `FlowHeader.tsx` — sticky top, contiene: back button + título de receta + toggle modo ("Ver todos" / "Paso a paso") + barra de progreso (dots clickeables, uno por paso) + contador `Paso X de N` + `N hechos`.
- `FlowBottom.tsx` — sticky bottom, contiene: en guiada → botón Anterior cuadrado (48×48) + botón Siguiente flex con preview del título del próximo paso. En scroll → solo botón Siguiente. Cuando todo está completo → muta a "Finalizar cocción" full-width bordó.
- `GuidedBody.tsx` — un paso a la vez. Hero card con número 46px tap-eable + título 20px + descripción 16px + LiveTimer si corresponde + Clave/Riesgo/Notas + botón "Marcar completado" explícito.
- `ScrollBody.tsx` — lista entera scrollable. Cada paso es un StepCard. El paso actual tiene borde `--primary` + pill "ACÁ VAS" arriba.
- `StepCard.tsx` — compartida en scroll. Click en círculo = toggle, click en cuerpo = setActivo.
- `LiveTimer.tsx` — countdown mm:ss vivo con tabular-nums + tracking -0.03em. Props: `durMin`, `onCancel`, `variant: 'hero' | 'compact'`. Controles: Pausar/Reanudar/Reiniciar/Cerrar. Al terminar: vira a verde `--ok-bg`, dispara `navigator.vibrate([200,100,200])` + `new Notification(...)`. Pide permiso al toque con underline link "Activar avisos del navegador".
- `PasoBlock.tsx` — caja para Clave/Riesgo. Props: `variant: 'ok' | 'warn'`, `label: string`, children. Icono ✓ o ⚠.

## 3.2 State

Mantener `useCocinarState` actual pero **agregar `pasoActual: number`** al estado (el cursor "acá vas"). Función `siguiente()` debe:
1. Marcar el actual como done.
2. Buscar el próximo no-completado (>actual o el primero anywhere).
3. Setear pasoActual a ese.
4. En modo scroll, hacer scroll suave al card del nuevo actual.

## 3.3 Datos por paso

El tipo `Paso` debe soportar (opcionales):
- `puntoClave?: string` → renderea PasoBlock verde con "Clave: ..."
- `errorComun?: string` → renderea PasoBlock amarillo con "Riesgo: ..."
- `notas?: string` → párrafo italic muted al pie
- `tiempoMin: number` → si > 0 muestra timer iniciable
- `tiempo: string` → label "20 min" arriba del título (display, no se usa para timer)

El backend / data ya tiene estos campos (vi `puntoClave` y `errorComun` en `PasoCard.tsx` actual). Si faltan, son opcionales y simplemente no se renderean.

## 3.4 Notifications

```ts
// Pedir permiso solo al primer iniciar de timer
async function ensureNotifPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}
```

No bloquees el inicio del timer si el permiso falla. El timer sigue funcionando con vibrate.

═══════════════════════════════════════════════════════════════════
BLOQUE 4 — Home (tweaks)
═══════════════════════════════════════════════════════════════════

**Referencia:** `/design-system/prototypes/home/index.html`. Código en `home-prototype.jsx`.

## 4.1 SemanaBadge

Componente nuevo `src/components/SemanaBadge.tsx`:
```tsx
interface Props { rango: string; }  // "26 may – 1 jun"
```
Renderea: label "SEMANA" uppercase 10px muted, rango 12px text-strong, ambos right-aligned, `flexShrink: 0`. **Sin número de semana** (esa notación nadie la usa).

Va a la derecha del título "3 comidas planeadas" en el Home, en un flex row.

## 4.2 Título Home

`h1 { fontSize: 20px; whiteSpace: nowrap; overflow: hidden; textOverflow: ellipsis; }` para que entre en una línea. El kicker "ESTA SEMANA" arriba en 11px muted uppercase.

## 4.3 WeekStrip — Plate icon

En `src/components/WeekStrip.tsx`:
- Cambiar el dot actual (4×4 gris) por un icono `<Plate>` 12×12.
- `<Plate filled={isToday} />`: cuando es hoy → círculo lleno bordó. Cuando es otro día con comida → círculo outlined muted con centro relleno.
- Cuando no hay comida → no se renderea pero el slot mantiene la altura (`height: 14px`) para que la grilla no salte.

```tsx
function Plate({ size = 12, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ display: 'block' }}>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"
              fill={filled ? 'currentColor' : 'none'} />
      {!filled && <circle cx="6" cy="6" r="2" fill="currentColor" />}
    </svg>
  );
}
```

Color sale del color que ya tenga el ChipDía (heredá `currentColor`).

═══════════════════════════════════════════════════════════════════
QA — antes de mergear
═══════════════════════════════════════════════════════════════════

```sh
npm install
npm run build
npm run preview
```

### Brand
- [ ] Favicon: plato marrón, no rayo morado.
- [ ] LoginScreen: plato con vapor, no ChefHat.
- [ ] Header: chip con plato simple a la izquierda del título.
- [ ] `grep -r "ChefHat" src/` vacío.

### Lista de compras
- [ ] Default "Por receta" — cada receta es un card con día/porciones/cocineros + stamp "Lista" cuando completa.
- [ ] Toggle a "Por góndola" muestra los mismos chips agrupados por sección.
- [ ] **Dentro de cada receta**, ingredientes agrupados por góndola en orden V→C→L→A→P, con chip de letra coloreado.
- [ ] Header tiene ProgressRing con número de pendientes grande (no done).
- [ ] Chips no parten la cantidad ("3 un" en una sola línea).

### Cocinar
- [ ] Toggle "Ver todos" / "Paso a paso" en el header funciona y preserva estado (qué tachaste, cursor, timer).
- [ ] Bars de progreso clickeables saltan al paso.
- [ ] En guiada: botón Siguiente muestra el título del próximo paso. Anterior cuadrado a la izquierda.
- [ ] En scroll: paso actual tiene borde bordó + pill "ACÁ VAS".
- [ ] LiveTimer: cuenta regresiva mm:ss, no se rompe el ancho (tabular-nums). Pausar/reanudar mantiene tiempo. Al terminar: verde + vibrate + Notification si permite.
- [ ] Clave/Riesgo/Notas aparecen cuando el paso los tiene. Paso 1 (Preparar mezcla) muestra Clave + Riesgo. Paso 2 (Hervir papas) muestra los 3.

### Home
- [ ] "SEMANA / 26 may – 1 jun" arriba a la derecha del título, sin número de semana.
- [ ] Título "3 comidas planeadas" en una sola línea, no se rompe.
- [ ] Días con comida muestran icono de plato (no dot). Hoy: relleno. Otros: outlined.

═══════════════════════════════════════════════════════════════════
NO toques
═══════════════════════════════════════════════════════════════════

- Routing en `App.tsx`.
- `src/data/*` y `src/auth/*` (excepto LoginScreen para PlatoMark).
- Schema de Firestore / hooks de fetch.
- BottomNav (está OK).

═══════════════════════════════════════════════════════════════════
Cuando termines
═══════════════════════════════════════════════════════════════════

`git diff --stat` + lista de tests que rompieron (si rompió alguno).
