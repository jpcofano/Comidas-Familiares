# PROMPT E8.2 — Dark mode ("Cocina nocturna") con toggle en el header

> **Etapa 8 — ciclo de diseño post-E7.13.** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** la versión que dejó E8.1. Verificá el header y reportá.
> **Al terminar: commit + push** — ver "Cierre".

## Por qué

La app es solo light. Se diseñó un **dark mode cálido** ("Cocina nocturna") que **solo
reescribe tokens** — los componentes ya usan `var(--token)`, así que el tema se propaga sin
tocar markup. Decisión de producto (revisión del ciclo de diseño): **toggle manual en el
header**, con persistencia. (El handoff viejo del DS proponía `prefers-color-scheme` sin
toggle; queda **reemplazado** por esta decisión: toggle manual, default = light.)

## Cambios de código

### 1. Tokens dark  (`src/styles/tokens.css`)
Agregar, **después** del bloque `:root { … }`, este bloque (nombres de token idénticos a los
de `:root`, así que solo hay que pegar los overrides):

```css
/* ============================================
   DARK MODE — "Cocina nocturna"
   Activar con <html data-theme="dark">. Solo reescribe tokens.
   ============================================ */
[data-theme="dark"] {
  --bg:             #18130f;
  --surface:        #211a15;
  --surface-strong: #2a221c;
  --surface-alt:    #2f261f;

  --text:           #f1e9df;
  --text-strong:    #fbf6ef;
  --muted:          #b3a597;
  --muted-strong:   #cdbfb0;

  --line:           #463a30;
  --border:         #382e26;
  --border-subtle:  #2f2620;

  --primary:        #e08a63;
  --primary-strong: #ec9d79;
  --primary-soft:   rgba(224, 138, 99, 0.16);
  --primary-on:     #2a1610;

  --accent:         #d18aa3;
  --accent-strong:  #dc9cb1;
  --accent-soft:    rgba(209, 138, 163, 0.16);

  --ok-bg:    #1e2c1e;  --ok-line:  #3a5a3a;  --ok-text:  #a8d6a8;
  --err-bg:   #321e18;  --err-line: #6a3a2c;  --err-text: #f0a98f;
  --warn-bg:  #2e2616;  --warn-line:#5c4a26;  --warn-text:#e6c374;
  --info-bg:  #1c2230;  --info-line:#39455e;  --info-text:#aeb9d6;

  --shadow-header: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-menu:   0 4px 14px rgba(0,0,0,0.5);
  --shadow-toast:  0 4px 14px rgba(0,0,0,0.55);
  --shadow-focus:  0 0 0 3px var(--primary-soft);

  --on-primary: #ffffff;
  color-scheme: dark;
}
```
> Si hay tokens que en `:root` no figuran arriba y se ven mal en oscuro (p. ej. `--member-*`
> de los avatares, `--ok-line/--err-line/--warn-line/--info-line` light si no estaban
> mapeados), incluí su override en este bloque. Reportá cuáles agregaste.

### 2. Toggle en el header  (`src/layout/Header.tsx` + helper)
- Helper de tema (nuevo, ej. `src/lib/theme.ts`):
  - `getInitialTheme(): "light" | "dark"` — lee `localStorage["cf-theme"]`; default `"light"`.
  - `applyTheme(t)` — si `dark` → `document.documentElement.setAttribute("data-theme","dark")`,
    si `light` → `removeAttribute("data-theme")`; y persiste en `localStorage["cf-theme"]`.
  - Aplicar el tema inicial **lo antes posible** (idealmente un script chiquito inline en
    `index.html` antes del bundle para evitar flash; si no, en el `main.tsx`).
- En el `Header`: botón circular (32×32) **a la izquierda del avatar** que togglea el tema.
  Ícono `Moon` (lucide) en light, `Sun` en dark. `aria-label` "Activar modo oscuro/claro".
  Estado local + `applyTheme` en `useEffect`.

### 3. Sin regresiones de contraste
Revisar a ojo en dark las pantallas principales (Home, Biblioteca, Detalle receta/menú,
Compras, Cocinar, Catálogo, Voto, Historial, MemberDashboard) — que no haya texto sobre
texto ni pills ilegibles. Los `*-line` y `*-text` semánticos del bloque ya están calibrados.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch del header. Reportá versión.
2. Subsección `### 1.2.E8.2 Cambios en vX.Y.Z (E8.2 — dark mode)`: explicar que es solo
   reescritura de tokens + toggle manual en header con persistencia `cf-theme`, y que
   **reemplaza** la propuesta vieja de `prefers-color-scheme` del handoff del DS.
3. Si en §9/§10 figura "dark mode pendiente / por system-preference", anotá que se cerró
   acá con toggle manual.
4. Registrar `**PROMPT_E8.2_dark_mode.md** ✅ CERRADO (vX.Y.Z)` en la lista de prompts.

## Criterio de aceptación
1. Toggle en el header alterna toda la app a oscuro/claro sin recargar.
2. La preferencia persiste al recargar (no flash de light al abrir en dark — idealmente).
3. Ninguna pantalla queda ilegible en dark.
4. Build + typecheck + tests verdes.
5. Pegá la subsección 1.2.E8.2 del MAPEO.

## Fuera de scope
- No mover el toggle a una pantalla de Ajustes (no existe; si se crea, será otro prompt).
- No tocar lógica de datos.

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E8.2: dark mode (tokens Cocina nocturna + toggle header con persistencia) + MAPEO"
git push
```
Confirmá el push OK.
