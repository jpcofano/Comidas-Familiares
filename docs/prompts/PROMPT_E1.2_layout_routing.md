# PROMPT_E1.2 — Layout + Routing + Design tokens

> Tercer prompt de Etapa 1. Implementa el layout base de la app (header con avatar circular + nombre, bottom nav de 4 botones, main scrollable) replicando los tokens de diseño del Apps Script. Suma React Router con todas las rutas planeadas con placeholders por sección.
>
> Al cerrar este prompt, **Etapa 1 está completa**: cada miembro entra con Google, ve su nombre arriba, puede navegar entre Inicio / Biblioteca / Compras / Historial sin que nada termine de renderizar nada real (las pantallas vienen en Etapas 2 y 3).
>
> Tareas a ejecutar por Claude Code en el repo `Comidas-Familiares`.

---

## Contexto

- **Etapa 0 cerrada**: scaffold + Firebase + hosting deployado.
- **Etapa 1.0 cerrada**: docs `/config/familia` y `/config/diccionarios` en Firestore.
- **Etapa 1.1 cerrada**: auth con Google + whitelist + `/users/{uid}` funciona end-to-end.
- App actual: muestra "Hola, {nombre}" con un botón "Cerrar sesión" — UI provisoria.
- **Fuente de verdad** del diseño: `Styles.html` del Apps Script (tokens CSS, layouts, componentes base).
- **Fuente de verdad** del modelo: `docs/MAPEO_FIRESTORE.md` v1.2, especialmente §5.1 (inventario de pantallas), §5.2 (mapping ruta → query).

## Decisiones ya zanjadas

No reinterpretar. Preguntar si algo no cuadra.

1. **Bottom nav: 4 botones** — Inicio / Biblioteca / Compras / Historial. NO usar los 5 del Apps Script.
2. **Biblioteca con tabs internos**: tabs `Recetas` (default) y `Menús` dentro de `/biblioteca`.
3. **Bottom nav visible siempre**, incluso si la sección no tiene contenido (placeholders se encargan).
4. **Header**: avatar circular con inicial del nombre sobre fondo `#74324a`, al lado el nombre. Tap en el avatar abre menú con opción "Cerrar sesión".
5. **Importar receta** vive en `/biblioteca/importar` y aparece como botón "+ Importar" dentro del tab Recetas, **solo si el miembro logueado es `juanpablo`** (owner). El resto de los miembros no lo ven.
6. **Design tokens portados** desde `Styles.html` a `src/styles/tokens.css`. Misma paleta, mismo radius, mismas sombras (es decir: sin sombras). El bottom nav y header siguen el estilo actual del Apps Script.
7. **React Router** v6+. Rutas anidadas para `/biblioteca/:tab?` y `/biblioteca/importar`. Resto plano.
8. **Placeholders por ruta**: cada sección muestra una card "Esta sección llega en Etapa X" con número correcto según el roadmap (`MAPEO §7`). Sin lógica de datos.
9. **Modo desktop vs móvil**: detección JS via `ontouchstart` (mismo patrón que `Styles.html`). En desktop, `main` se centra a 720px. En móvil, full-width.
10. **Sin React.lazy** ni code splitting todavía. Una sola entry, rutas en el mismo bundle. Lo dividimos cuando el bundle pase los 250 KB.

## Política de commits

Igual que `PROMPT_E1.1`. **Un commit por tarea numerada.** Mensajes con prefijo `Stage 1.2:`, en inglés, modo imperativo.

Push solo al final. Antes de cada commit, `git status` para verificar que no se cuelan archivos no deseados.

---

## Tareas

### Tarea 1 — Instalar React Router

```bash
npm install react-router-dom
```

**Commit**: `Stage 1.2: install react-router-dom`

---

### Tarea 2 — Portar design tokens a `src/styles/tokens.css`

Crear el archivo `src/styles/tokens.css` con los tokens CSS extraídos de `Styles.html` del Apps Script. Mantener nombres semánticos (los del original), uno por línea, con comentario describiendo cada grupo.

```css
:root {
  /* Backgrounds */
  --bg:             #ffffff;
  --surface:        #f9fafb;
  --surface-strong: #ffffff;
  --surface-alt:    #f3f4f6;

  /* Text */
  --text:   #111827;
  --muted:  #6b7280;

  /* Borders */
  --line:   #d1d5db;
  --border: #e5e7eb;

  /* Brand */
  --primary:        #74324a;
  --primary-strong: #5b2438;
  --accent:         #3b82f6;

  /* Semantic — ok / err / warn / wait */
  --ok-bg:    #ecfdf5;
  --ok-line:  #a7f3d0;
  --ok-text:  #065f46;
  --err-bg:   #fef2f2;
  --err-line: #fecaca;
  --err-text: #991b1b;
  --warn-bg:  #fffbeb;
  --warn-line:#fde68a;
  --warn-text:#92400e;
  --wait-bg:  #eff6ff;
  --wait-line:#bfdbfe;
  --wait-text:#1e40af;

  /* Persona (member chip) */
  --persona-bg:   #dbeafe;
  --persona-text: #1e40af;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;

  /* Shadow (header only) */
  --shadow-header: 0 1px 4px rgba(0, 0, 0, 0.06);

  /* Typography */
  --font-family: Arial, sans-serif;
}

/* Resets compactos del Apps Script */
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; padding: 0; overflow-x: hidden; max-width: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  font-family: var(--font-family);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, p { margin: 0; }
```

Importar `tokens.css` desde `src/main.tsx` antes de cualquier otro CSS (para que los tokens estén disponibles globalmente).

**Commit**: `Stage 1.2: port design tokens from Apps Script Styles.html`

---

### Tarea 3 — Helper de detección desktop

Crear `src/styles/detectDesktop.ts`:

```typescript
/**
 * Detects whether the device is a real desktop (no touch) vs touch/mobile.
 * Returns true for desktop, false for touch devices.
 * Runs once at app start; the result is added as a class on document.body
 * so CSS can react via body.is-desktop.
 *
 * Same technique as the Apps Script Styles.html — feature detection via
 * ontouchstart + maxTouchPoints, not media queries (which lie inside
 * embedded WebViews).
 */
export function detectAndMarkDesktop(): void {
  const isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error legacy IE
    navigator.msMaxTouchPoints > 0;

  if (!isTouch) {
    document.body.classList.add("is-desktop");
  }
}
```

Llamar a `detectAndMarkDesktop()` desde `src/main.tsx` antes del `createRoot`.

**Commit**: `Stage 1.2: add desktop/touch detection helper`

---

### Tarea 4 — Crear el layout shell `src/layout/AppShell.tsx`

Layout con tres regiones: header sticky arriba, main scrollable en el medio, bottom-nav fijo abajo.

Estructura:

```typescript
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
```

Crear `src/layout/AppShell.module.css` o estilos inline en cada componente, lo que sea más simple. Reglas:

- `header`: sticky top, fondo `var(--bg)`, border-bottom 1px `var(--border)`, box-shadow `var(--shadow-header)`, padding `14px 16px 12px`.
- `main`: padding `16px 14px 92px` (los 92px abajo son para no quedar tapado por el bottom nav). En desktop (`body.is-desktop main`), max-width `720px`, margin auto.
- `.bottom-nav`: position fixed, bottom 0, left 0, right 0, grid 4 columnas iguales, padding `8px 8px max(8px, env(safe-area-inset-bottom))`, fondo `var(--bg)`, border-top 1px `var(--border)`.

**Commit**: `Stage 1.2: add AppShell layout with header, main, bottom nav`

---

### Tarea 5 — `src/layout/Header.tsx` con avatar circular + nombre + menú logout

Estructura:

```typescript
import { useState } from "react";
import { useAuth } from "../auth/useAuth";

export function Header() {
  const { state, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (state.status !== "authenticated") return null;

  const { nombre } = state.user;
  const inicial = nombre.charAt(0).toUpperCase();

  return (
    <header>
      <div className="header-inner">
        <h1>Comida Familiar</h1>
        <button
          className="avatar-button"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menú de usuario"
        >
          <span className="avatar">{inicial}</span>
          <span className="username">{nombre}</span>
        </button>
      </div>
      {menuOpen && (
        <div className="user-menu" role="menu">
          <button
            type="button"
            className="user-menu-item"
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </header>
  );
}
```

Estilos clave:

- `.header-inner`: display flex, justify-content space-between, align-items center, gap 12px.
- `.avatar-button`: sin border, background transparente, padding `4px 8px`, gap 8px, display flex, align-items center, cursor pointer.
- `.avatar`: width 36px, height 36px, border-radius 50%, background `var(--primary)`, color white, display flex, center align, font-weight 700, font-size 14px.
- `.username`: font-weight 500, color `var(--text)`. En móvil con ancho <420px, ocultar (`@media (max-width: 419px)`) — solo se ve el avatar.
- `.user-menu`: position absolute, top 100%, right 16px, background `var(--surface-strong)`, border `1px solid var(--border)`, border-radius `var(--radius-md)`, padding 4px, min-width 160px, box-shadow `var(--shadow-header)`. El header tiene que ser `position: sticky` con `z-index: 10` para que el menu no quede tapado.
- `.user-menu-item`: width 100%, text-align left, padding `8px 12px`, background transparent, border 0, border-radius `var(--radius-sm)`, font-size 14px, cursor pointer. Hover: background `var(--surface-alt)`.

**Detalle UX**: tap fuera del menú o tap en otro elemento del header debería cerrarlo. Para esto, usar un `useEffect` con `document.addEventListener("click", ...)` que cierre el menú si el click no está dentro del header. Documentar el approach en un comentario en el código.

**Commit**: `Stage 1.2: add Header with avatar and user menu`

---

### Tarea 6 — `src/layout/BottomNav.tsx`

4 botones: Inicio / Biblioteca / Compras / Historial. Cada uno con un emoji como glyph y un label. El botón "active" usa el color primary con fondo translúcido.

```typescript
import { NavLink } from "react-router-dom";

const items = [
  { to: "/",          label: "Inicio",    glyph: "🏠" },
  { to: "/biblioteca",label: "Biblioteca",glyph: "📖" },
  { to: "/compras",   label: "Compras",   glyph: "🧾" },
  { to: "/historial", label: "Historial", glyph: "⭐" },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => (isActive ? "nav-btn active" : "nav-btn")}
        >
          <span className="nav-glyph" aria-hidden>{item.glyph}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

Estilos:

- `.bottom-nav`: grid-template-columns: repeat(4, 1fr); gap 4px.
- `.nav-btn`: min-height 56px, border-radius `var(--radius-sm)`, font-size 0.7rem, font-weight 700, background transparent, color `var(--muted)`, display flex, flex-direction column, align-items center, justify-content center, gap 4px, line-height 1.1, text-decoration none.
- `.nav-btn.active`: background `rgba(116, 50, 74, 0.10)` (primary con alpha), color `var(--primary)`.
- `.nav-glyph`: font-size 18px, line-height 1.

**Importante**: el `end` en el NavLink de `/` es para que NO se marque como active cuando estamos en `/biblioteca` (sin `end`, NavLink trata cualquier sub-ruta de `/` como active).

**Commit**: `Stage 1.2: add BottomNav with 4 sections`

---

### Tarea 7 — Crear las rutas con placeholders

Crear `src/routes/` con un archivo por pantalla, todos con un placeholder simple. Para esta etapa, cada archivo es algo así:

```typescript
// src/routes/Home.tsx
export function HomeRoute() {
  return (
    <div className="card">
      <h2>Inicio</h2>
      <p>Esta sección llega en Etapa 3.</p>
      <p className="meta">
        Va a mostrar: la Especial activa de la semana, extras, planes En proceso,
        resumen de compras, y accesos rápidos.
      </p>
    </div>
  );
}
```

Crear:

- `src/routes/Home.tsx`
- `src/routes/Biblioteca.tsx` (con tabs internos)
- `src/routes/Compras.tsx`
- `src/routes/Historial.tsx`
- `src/routes/ImportarReceta.tsx` (solo accesible si memberId === "juanpablo")
- `src/routes/DetalleReceta.tsx`
- `src/routes/Cocinar.tsx`
- `src/routes/Voto.tsx`
- `src/routes/DetalleMenu.tsx`
- `src/routes/NotFound.tsx`

Cada uno con su placeholder y un texto que indique en qué Etapa se implementa la lógica real (referencia a `MAPEO §7`).

**Biblioteca con tabs internos**: usar `searchParams` para el tab activo (`?tab=recetas` o `?tab=menus`). Default: `recetas`. Renderizar dos `<button>` tabs arriba que cambien el query param. Cada tab muestra su placeholder.

```typescript
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export function BibliotecaRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useAuth();
  const tab = searchParams.get("tab") ?? "recetas";

  const isJP = state.status === "authenticated" && state.user.memberId === "juanpablo";

  return (
    <>
      <div className="tabs">
        <button
          className={tab === "recetas" ? "tab active" : "tab"}
          onClick={() => setSearchParams({ tab: "recetas" })}
        >
          Recetas
        </button>
        <button
          className={tab === "menus" ? "tab active" : "tab"}
          onClick={() => setSearchParams({ tab: "menus" })}
        >
          Menús
        </button>
        {isJP && tab === "recetas" && (
          <Link to="/biblioteca/importar" className="tab-action">
            + Importar
          </Link>
        )}
      </div>

      <div className="card">
        {tab === "recetas" ? (
          <>
            <h2>Recetas</h2>
            <p>Esta sección llega en Etapa 3.</p>
            <p className="meta">
              Va a mostrar las 78 recetas seedeadas con filtros por proteína,
              tipo, sin lácteos, sin hidratos.
            </p>
          </>
        ) : (
          <>
            <h2>Menús</h2>
            <p>Esta sección llega en Etapa 3.</p>
            <p className="meta">
              Va a mostrar los 5 menús compuestos por recetas (modelo M).
              Tiempos y dificultad se derivan al vuelo de las componentes.
            </p>
          </>
        )}
      </div>
    </>
  );
}
```

Estilos para tabs en `src/layout/AppShell.module.css` o donde corresponda:

- `.tabs`: display flex, gap 8px, margin-bottom 16px, align-items center.
- `.tab`: background transparent, border 0, border-bottom 2px solid transparent, padding `8px 4px`, font-weight 700, color `var(--muted)`, cursor pointer, font-size 14px.
- `.tab.active`: color `var(--primary)`, border-bottom-color `var(--primary)`.
- `.tab-action`: margin-left auto, padding `6px 12px`, background `var(--primary)`, color white, border-radius `var(--radius-sm)`, font-size 13px, font-weight 700, text-decoration none.

**Commit**: `Stage 1.2: add route components with placeholders`

---

### Tarea 8 — Wiring del router en `src/App.tsx`

Reemplazar el contenido actual de `App.tsx` por la versión con router:

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import { LoginScreen } from "./auth/LoginScreen";
import { UnauthorizedScreen } from "./auth/UnauthorizedScreen";
import { AppShell } from "./layout/AppShell";
import { HomeRoute } from "./routes/Home";
import { BibliotecaRoute } from "./routes/Biblioteca";
import { ImportarRecetaRoute } from "./routes/ImportarReceta";
import { DetalleRecetaRoute } from "./routes/DetalleReceta";
import { CocinarRoute } from "./routes/Cocinar";
import { DetalleMenuRoute } from "./routes/DetalleMenu";
import { ComprasRoute } from "./routes/Compras";
import { HistorialRoute } from "./routes/Historial";
import { VotoRoute } from "./routes/Voto";
import { NotFoundRoute } from "./routes/NotFound";

function App() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return <div style={{ padding: 32 }}>Cargando…</div>;
  }
  if (state.status === "unauthenticated") {
    return <LoginScreen />;
  }
  if (state.status === "unauthorized") {
    return <UnauthorizedScreen email={state.email} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/biblioteca" element={<BibliotecaRoute />} />
          <Route path="/biblioteca/importar" element={<ImportarRecetaRoute />} />
          <Route path="/recetas/:id" element={<DetalleRecetaRoute />} />
          <Route path="/recetas/:id/cocinar" element={<CocinarRoute />} />
          <Route path="/menus/:id" element={<DetalleMenuRoute />} />
          <Route path="/compras" element={<ComprasRoute />} />
          <Route path="/historial" element={<HistorialRoute />} />
          <Route path="/voto/:idPlan" element={<VotoRoute />} />
          <Route path="*" element={<NotFoundRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Importante**:
- El `<AppShell />` envuelve todas las rutas autenticadas vía `<Route element={<AppShell />}>`. El `<Outlet />` dentro de AppShell renderiza la ruta hija.
- `LoginScreen` y `UnauthorizedScreen` NO van adentro del router — se renderizan antes según el state de auth.
- `<Route path="*">` captura cualquier URL que no matchee y muestra el NotFound.

**Commit**: `Stage 1.2: wire React Router with all routes and placeholders`

---

### Tarea 9 — Verificación local

```bash
npm run dev
```

Pedirme al usuario (JP) que verifique en `http://localhost:5173/`:

1. Se loguea con `jpcofano@gmail.com` → ve el AppShell completo: header con avatar "J" y "Juan Pablo", bottom nav con 4 ítems, "Inicio" activo, placeholder de Home.
2. Tap en bottom nav → cada ítem navega y se marca como active. Las URLs cambian: `/`, `/biblioteca`, `/compras`, `/historial`.
3. En `/biblioteca`: tabs Recetas/Menús, click en cada tab cambia el contenido y el query param. Como es JP, ve el botón "+ Importar" arriba a la derecha cuando el tab "Recetas" está activo. Click en "+ Importar" lleva a `/biblioteca/importar`.
4. Tap en el avatar arriba → aparece menú con "Cerrar sesión". Click → vuelve a LoginScreen.
5. Si se loguea con otro mail autorizado que no sea jpcofano (ej. fede o sofi), **NO** ve el botón "+ Importar" en Biblioteca/Recetas.
6. Test móvil con DevTools (responsive mode, ancho ~375px): el username del header se oculta (solo avatar), el bottom nav sigue siendo accesible.
7. Test desktop: el `main` está centrado a 720px max-width.

Mostrarme las observaciones. Si todo OK, seguir a Tarea 10.

---

### Tarea 10 — Build + deploy

```bash
npm run build
firebase deploy --only hosting
```

Verificar en `https://comida-familiar.web.app` que el flow funciona en vivo.

**Commit**: `Stage 1.2: deploy layout + routing to production`

---

### Tarea 11 — Push final

```bash
git status     # verificar staging limpio
git log --oneline -15
git push
```

---

## Criterios de aceptación

1. ✅ `react-router-dom` instalado.
2. ✅ `src/styles/tokens.css` existe y se importa desde `main.tsx`.
3. ✅ Detección desktop funciona (en desktop sin touch, el body tiene class `is-desktop`).
4. ✅ Header con avatar circular + nombre + menú logout funciona.
5. ✅ Bottom nav con 4 secciones; active state visible; navegación cambia la URL.
6. ✅ Biblioteca con tabs Recetas/Menús; botón "+ Importar" solo visible para JP.
7. ✅ Las 10 rutas (Home, Biblioteca, Compras, Historial, ImportarReceta, DetalleReceta, Cocinar, DetalleMenu, Voto, NotFound) existen y renderizan placeholders informativos.
8. ✅ `npm run dev` sin warnings ni errores de TypeScript.
9. ✅ `npm run build` exitoso, deploy a producción funciona.
10. ✅ Historial con commits granulares (uno por tarea) con prefijo `Stage 1.2:`.

---

## Qué NO tocar

- **NO modificar** `src/auth/*` (Etapa 1.1 cerrada). Si el flow de auth pide cambios, frenar y avisar.
- **NO modificar** los docs en Firestore. El layout es 100% client-side.
- **NO implementar lógica de datos** (Firestore queries). Las pantallas son placeholders.
- **NO instalar librerías UI** (Material UI, Chakra, etc). Estilos custom basados en los tokens del Apps Script.
- **NO crear** la carpeta `src/data/` ni los types completos del MAPEO §2. Eso es Etapa 2.
- **NO mejorar visualmente más allá** de lo descrito en este prompt. Pulido visual fino, micro-interacciones, animaciones — no.
- **NO portar el design system completo** de `Styles.html`. Solo los tokens y los componentes nombrados (header, bottom-nav, card básica). El resto se va portando a medida que se necesiten en Etapa 3+.

---

## Para JP, después de cerrar el prompt

Cuando los 10 criterios estén cumplidos:

1. **Probá la app en producción** desde el celular: `comida-familiar.web.app`. El layout debería sentirse usable en pantalla pequeña.
2. **Pedile a otro miembro de la familia** (María, idealmente) que entre. Verificá que:
   - Ve su nombre en el header.
   - NO ve el botón "+ Importar" en Biblioteca.
   - Puede navegar entre las 4 secciones.
3. **Si te molesta algo del look** (espaciados, contrastes, tamaño de fuente, posición del avatar, etc.), anotalo. No es bloqueante para Etapa 2, pero lo ajustamos antes de meternos en lógica de datos.

Si todo OK, **cierro Etapa 1** y arrancamos **Etapa 2** con `PROMPT_E2.1_types_and_helpers.md` (tipos TypeScript + helpers de canonicalización para soportar el modelo de datos completo).
