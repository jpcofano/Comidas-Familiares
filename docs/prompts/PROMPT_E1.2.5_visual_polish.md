# PROMPT_E1.2.5 — Pulido visual base

> Mini-prompt entre Etapa 1 y Etapa 2. Quita las limitaciones que arrastrábamos del Apps Script ahora que estamos en React (sin Etapa 6 cerca todavía). Reemplaza emojis por íconos vectoriales, mejora tipografía, tokeniza spacing, suma estados hover/active/focus, y aplica el estilo visual "B · Cocina cálida".
>
> **Premisa importante**: este estilo es **provisorio**. En Etapa 6 (PWA pulida) revisaremos identidad visual completa con Claude Design. Por eso el código debe quedar **fácil de re-tematizar** — todos los colores y radios viven en CSS variables, ningún hex hardcodeado fuera de `tokens.css`.
>
> Tareas a ejecutar por Claude Code en el repo `Comidas-Familiares`.

---

## Contexto

- **Etapa 1 completa**: scaffold + auth + layout + routing con placeholders funcionando en `https://comida-familiar.web.app`.
- **Hoy la app usa emojis** (🏠 📖 🧾 ⭐) en el bottom nav, fuente Arial, spacing ad hoc, sin estados refinados.
- **Estilo visual aprobado**: B · Cocina cálida (paleta tierra + cards con tinte crema sutil + avatar marrón cálido). Mantener bordó del Apps Script en stand-by como acento.
- **Recordatorio**: Etapa 6 vamos a rediseñar todo con Claude Design. Este pulido es para no arrastrar fealdad innecesaria mientras tanto.

## Decisiones ya zanjadas

1. **Íconos**: `lucide-react` (~5KB por ícono tree-shaken). Sin emojis en el bottom nav ni en el resto de la app.
2. **Tipografía**: Inter via Google Fonts (con fallback a `system-ui`, `-apple-system`, `sans-serif`). Tres pesos: 400 (regular), 500 (medium), 700 (bold).
3. **Spacing tokenizado**: `--space-1` (4px) → `--space-8` (32px) en escala. Reemplaza padding/margin ad hoc del CSS actual.
4. **Estilo B · Cocina cálida**: paleta tierra cálida documentada abajo. Sobre-escribe los tokens actuales de `tokens.css` (no agregar — reemplazar).
5. **Themeability**: todos los colores en CSS variables. NO hardcodear hex en componentes React. Esto es crítico para poder cambiar de B a otra paleta en Etapa 6 sin tocar componentes.
6. **Sin animaciones decorativas**. Solo micro-feedback: scale al press, transición de color al hover. No bouncy, no spring.
7. **Sin librería de animaciones** (no framer-motion). Todo CSS transitions.
8. **Sin librería UI** (no Material UI, Chakra, shadcn). Mantenemos componentes propios sobre CSS modules / inline styles.
9. **Sin dark mode todavía**. El día que se quiera, agregamos `@media (prefers-color-scheme: dark)` a `tokens.css` con un segundo set de variables. Para esta etapa, solo light mode.
10. **Mismos componentes existentes**, solo refinados. NO crear componentes nuevos (eso es Etapa 3+).

## Política de commits

Igual que prompts anteriores. Un commit por tarea numerada. Prefijo `Stage 1.2.5:`. Push al final.

---

## Tareas

### Tarea 1 — Instalar `lucide-react` y agregar Inter

**a)** Instalar lucide:

```bash
npm install lucide-react
```

**b)** Agregar Inter desde Google Fonts en `index.html` (en `<head>`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
```

Nota: usar Google Fonts con `display=swap` para que no haya FOIT (Flash of Invisible Text). Si Inter no está disponible, fallback a system-ui.

**Commit**: `Stage 1.2.5: install lucide-react and add Inter font`

---

### Tarea 2 — Re-escribir `src/styles/tokens.css` con estilo B

Reemplazar completamente el contenido actual de `src/styles/tokens.css` por:

```css
:root {
  /* ============================================
     PALETA — Estilo B · Cocina cálida (provisoria)
     A revisar en Etapa 6 con Claude Design
     ============================================ */

  /* Backgrounds — tonos crema cálidos */
  --bg:             #fdfaf6;   /* página: crema apenas tintado */
  --surface:        #fdf8f3;   /* cards: crema más visible */
  --surface-strong: #ffffff;   /* superficies elevadas: blanco puro */
  --surface-alt:    #f6efe5;   /* hovers, fondos secundarios */

  /* Text */
  --text:           #1f1a16;   /* casi negro con calidez */
  --text-strong:    #0e0a07;   /* títulos importantes */
  --muted:          #6b5d52;   /* secundario, hints */
  --muted-strong:   #4a3f37;   /* secundario contrastado */

  /* Borders */
  --line:           #d8cdbe;   /* divisores fuertes */
  --border:         #e8dfd4;   /* borders default cards */
  --border-subtle:  #efe8de;   /* borders sutiles */

  /* Brand — marrón cálido cocina */
  --primary:        #8a4a2f;
  --primary-strong: #6e3a23;
  --primary-soft:   rgba(138, 74, 47, 0.10);   /* fondos translúcidos */
  --primary-on:     #ffffff;   /* texto sobre primary */

  /* Accent — bordó del Apps Script (guiño, uso restringido) */
  --accent:         #74324a;
  --accent-strong:  #5b2438;
  --accent-soft:    rgba(116, 50, 74, 0.10);

  /* Semantic — ok / err / warn / info */
  --ok-bg:    #ecf5ec;
  --ok-line:  #b6d6b6;
  --ok-text:  #2e5d2e;
  --err-bg:   #f7e8e3;
  --err-line: #e8c0b3;
  --err-text: #8a3520;
  --warn-bg:  #fbf2dd;
  --warn-line:#ecd49a;
  --warn-text:#7d5610;
  --info-bg:  #ebeef5;
  --info-line:#bec5d8;
  --info-text:#3c4a6e;

  /* ============================================
     SPACING — escala 4px base
     ============================================ */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* ============================================
     RADIUS
     ============================================ */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* ============================================
     SHADOWS — solo funcionales
     ============================================ */
  --shadow-header: 0 1px 3px rgba(31, 26, 22, 0.06);
  --shadow-menu:   0 4px 12px rgba(31, 26, 22, 0.10);
  --shadow-focus:  0 0 0 3px var(--primary-soft);

  /* ============================================
     TYPOGRAPHY
     ============================================ */
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  --fs-xs:   12px;
  --fs-sm:   13px;
  --fs-base: 14px;
  --fs-md:   15px;
  --fs-lg:   17px;
  --fs-xl:   20px;
  --fs-2xl:  24px;

  --fw-regular: 400;
  --fw-medium:  500;
  --fw-bold:    700;

  --lh-tight:   1.25;
  --lh-base:    1.5;
  --lh-relaxed: 1.7;

  /* ============================================
     TRANSITIONS
     ============================================ */
  --t-fast: 120ms ease;
  --t-base: 180ms ease;
}

/* ============================================
   Resets compactos
   ============================================ */
* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  max-width: 100%;
}

body {
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  font-family: var(--font-sans);
  font-size: var(--fs-base);
  line-height: var(--lh-base);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";  /* tweaks de Inter */
}

h1, h2, h3, h4, p {
  margin: 0;
}

h1 { font-size: var(--fs-2xl); font-weight: var(--fw-bold); line-height: var(--lh-tight); letter-spacing: -0.01em; }
h2 { font-size: var(--fs-xl); font-weight: var(--fw-bold); line-height: var(--lh-tight); letter-spacing: -0.005em; }
h3 { font-size: var(--fs-lg); font-weight: var(--fw-medium); line-height: var(--lh-tight); }

/* Buttons reset */
button {
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
}

/* Focus visible — accesibilidad */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}
```

**Importante**: NO eliminar `tokens.css` y crear uno nuevo — **sobre-escribir** (reemplazar contenido). El import en `main.tsx` ya está hecho.

**Commit**: `Stage 1.2.5: redesign tokens.css with style B warm palette`

---

### Tarea 3 — Crear `src/styles/utilities.css` con clases reutilizables

Algunos patterns aparecen muchas veces. Crearlos como utilidades para evitar repetición. Crear `src/styles/utilities.css`:

```css
/* ============================================
   Cards
   ============================================ */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  transition: border-color var(--t-fast);
}

.card-interactive {
  cursor: pointer;
}

.card-interactive:hover {
  border-color: var(--line);
}

.card-interactive:active {
  transform: scale(0.995);
}

.card-strong {
  background: var(--surface-strong);
}

/* ============================================
   Buttons
   ============================================ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: var(--space-2) var(--space-4);
  border: 0;
  border-radius: var(--radius-md);
  font-weight: var(--fw-medium);
  font-size: var(--fs-base);
  transition: background var(--t-fast), color var(--t-fast), transform var(--t-fast);
}

.btn:active {
  transform: scale(0.97);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-on);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-strong);
}

.btn-secondary {
  background: var(--surface-strong);
  color: var(--text);
  border: 1px solid var(--line);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-alt);
}

.btn-ghost {
  background: transparent;
  color: var(--text);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--surface-alt);
}

/* ============================================
   Meta text
   ============================================ */
.meta {
  color: var(--muted);
  font-size: var(--fs-sm);
  line-height: var(--lh-base);
}

/* ============================================
   Tabs (Biblioteca y futuras)
   ============================================ */
.tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.tab {
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  padding: var(--space-2) var(--space-1);
  font-weight: var(--fw-medium);
  font-size: var(--fs-base);
  color: var(--muted);
  cursor: pointer;
  transition: color var(--t-fast), border-color var(--t-fast);
}

.tab:hover:not(.active) {
  color: var(--muted-strong);
}

.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-action {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  background: var(--primary);
  color: var(--primary-on);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  text-decoration: none;
  transition: background var(--t-fast);
}

.tab-action:hover {
  background: var(--primary-strong);
}
```

Importar `utilities.css` desde `main.tsx` DESPUÉS de `tokens.css`:

```typescript
import "./styles/tokens.css";
import "./styles/utilities.css";
```

**Commit**: `Stage 1.2.5: add utilities.css with reusable patterns`

---

### Tarea 4 — Reemplazar emojis en BottomNav con íconos lucide

Modificar `src/layout/BottomNav.tsx`:

```typescript
import { NavLink } from "react-router-dom";
import { Home, BookOpen, ShoppingBag, History } from "lucide-react";

const items = [
  { to: "/",           label: "Inicio",     Icon: Home },
  { to: "/biblioteca", label: "Biblioteca", Icon: BookOpen },
  { to: "/compras",    label: "Compras",    Icon: ShoppingBag },
  { to: "/historial",  label: "Historial",  Icon: History },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => (isActive ? "nav-btn active" : "nav-btn")}
        >
          <Icon size={20} strokeWidth={2} aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

Actualizar los estilos del bottom nav (donde sea que estén, probablemente en `AppShell.module.css` o un CSS asociado). Reemplazar:

```css
.bottom-nav {
  position: fixed;
  z-index: 20;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
  padding: var(--space-2) var(--space-2) max(var(--space-2), env(safe-area-inset-bottom));
  background: var(--bg);
  border-top: 1px solid var(--border);
}

.nav-btn {
  min-height: 56px;
  padding: var(--space-2) var(--space-1);
  border-radius: var(--radius-md);
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  background: transparent;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  line-height: 1.1;
  text-decoration: none;
  transition: background var(--t-fast), color var(--t-fast), transform var(--t-fast);
}

.nav-btn:hover {
  color: var(--muted-strong);
}

.nav-btn:active {
  transform: scale(0.96);
}

.nav-btn.active {
  background: var(--primary-soft);
  color: var(--primary);
}
```

Notar: ya **no usamos `.nav-glyph`** porque el ícono es un componente React, no un span. Si ese estilo existía, eliminarlo.

**Commit**: `Stage 1.2.5: replace emoji icons with lucide-react in BottomNav`

---

### Tarea 5 — Refinar Header

Actualizar `src/layout/Header.tsx` para:

1. Reemplazar el botón "Cerrar sesión" del menú con uno que tenga ícono lucide.
2. Sumar transición suave de hover en el avatar-button.
3. Usar tokens de spacing y typography.

```typescript
import { useState, useEffect, useRef } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../auth/useAuth";

export function Header() {
  const { state, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Click outside cierra el menú.
  useEffect(() => {
    if (!menuOpen) return;

    function handleClick(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  if (state.status !== "authenticated") return null;

  const { nombre } = state.user;
  const inicial = nombre.charAt(0).toUpperCase();

  return (
    <header ref={headerRef}>
      <div className="header-inner">
        <h1>Comida Familiar</h1>
        <button
          className="avatar-button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menú de usuario"
          aria-expanded={menuOpen}
        >
          <span className="avatar" aria-hidden>{inicial}</span>
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
            <LogOut size={16} aria-hidden />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </header>
  );
}
```

Estilos refinados (reemplazar lo que haya):

```css
header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-header);
  padding: var(--space-3) var(--space-4);
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.avatar-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: transparent;
  border: 0;
  border-radius: var(--radius-full);
  transition: background var(--t-fast);
}

.avatar-button:hover {
  background: var(--surface-alt);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary);
  color: var(--primary-on);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--fw-medium);
  font-size: var(--fs-sm);
}

.username {
  font-weight: var(--fw-medium);
  color: var(--text);
  font-size: var(--fs-base);
}

@media (max-width: 419px) {
  .username {
    display: none;
  }
}

.user-menu {
  position: absolute;
  top: 100%;
  right: var(--space-4);
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  min-width: 180px;
  box-shadow: var(--shadow-menu);
  margin-top: var(--space-1);
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  font-size: var(--fs-base);
  color: var(--text);
  transition: background var(--t-fast);
}

.user-menu-item:hover {
  background: var(--surface-alt);
}
```

**Commit**: `Stage 1.2.5: refine Header with lucide icon and refined hover states`

---

### Tarea 6 — Sumar íconos al botón "+ Importar" de Biblioteca

En `src/routes/Biblioteca.tsx`, reemplazar el "+" textual por el ícono lucide:

```typescript
import { Plus } from "lucide-react";
// ...
{isJP && tab === "recetas" && (
  <Link to="/biblioteca/importar" className="tab-action">
    <Plus size={16} aria-hidden />
    <span>Importar</span>
  </Link>
)}
```

**Commit**: `Stage 1.2.5: replace text "+" with lucide Plus icon in Biblioteca tab action`

---

### Tarea 7 — Limpiar estilos inline / hardcoded en placeholders

Revisar TODOS los archivos en `src/routes/*.tsx`. En cada placeholder:

1. Si tiene `style={{ padding: 32 }}` o similar → reemplazar con `className="card"`.
2. Si usa texto con color hardcodeado (`color: '#888'`, etc.) → reemplazar con `className="meta"` o variable CSS.
3. Si tiene `<p>` para texto secundario → usar `<p className="meta">`.

Ejemplo: Home pasa de esto:

```typescript
return (
  <div className="card">
    <h2>Inicio</h2>
    <p>Esta sección llega en Etapa 3.</p>
    <p style={{ color: '#888', fontSize: 14 }}>
      Va a mostrar...
    </p>
  </div>
);
```

A esto:

```typescript
return (
  <div className="card">
    <h2>Inicio</h2>
    <p>Esta sección llega en Etapa 3.</p>
    <p className="meta">
      Va a mostrar la Especial activa de la semana, extras, planes En proceso,
      resumen de compras, y accesos rápidos.
    </p>
  </div>
);
```

Aplicar el mismo cleanup en:
- `src/routes/Home.tsx`
- `src/routes/Biblioteca.tsx`
- `src/routes/Compras.tsx`
- `src/routes/Historial.tsx`
- `src/routes/ImportarReceta.tsx`
- `src/routes/DetalleReceta.tsx`
- `src/routes/Cocinar.tsx`
- `src/routes/DetalleMenu.tsx`
- `src/routes/Voto.tsx`
- `src/routes/NotFound.tsx`
- `src/auth/LoginScreen.tsx`
- `src/auth/UnauthorizedScreen.tsx`

**Importante**: NO cambiar el contenido del texto. Solo limpiar el styling.

**Commit**: `Stage 1.2.5: replace inline styles with token-based classes in routes`

---

### Tarea 8 — Refinar LoginScreen y UnauthorizedScreen

Estas pantallas son lo primero que ven los usuarios nuevos. Aplicar el estilo B con cuidado.

**LoginScreen** (`src/auth/LoginScreen.tsx`):

```typescript
import { useState } from "react";
import { ChefHat } from "lucide-react";
import { useAuth } from "./useAuth";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon" aria-hidden>
          <ChefHat size={36} strokeWidth={1.5} />
        </div>
        <h1>Comida Familiar</h1>
        <p className="meta">
          Planificación semanal de comidas para la familia Cofano
        </p>
        <button
          type="button"
          className="btn btn-primary login-button"
          onClick={handleSignIn}
          disabled={busy}
        >
          {busy ? "Entrando…" : "Entrar con Google"}
        </button>
        {error && (
          <p className="login-error">{error}</p>
        )}
      </div>
    </div>
  );
}
```

Estilos (agregar a `src/auth/auth.css` — crear si no existe — e importarlo desde `LoginScreen.tsx`):

```css
.login-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-6);
  background: var(--bg);
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-8) var(--space-6);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.login-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  display: grid;
  place-items: center;
  margin-bottom: var(--space-2);
}

.login-card h1 {
  margin-top: 0;
}

.login-card .meta {
  margin-bottom: var(--space-4);
}

.login-button {
  width: 100%;
  margin-top: var(--space-2);
}

.login-error {
  color: var(--err-text);
  font-size: var(--fs-sm);
  margin-top: var(--space-3);
  background: var(--err-bg);
  border: 1px solid var(--err-line);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  width: 100%;
}
```

**UnauthorizedScreen** (`src/auth/UnauthorizedScreen.tsx`): usar la misma estructura general pero con ícono `Lock` de lucide, mensaje correspondiente y botón "Salir" usando `btn-secondary`. Reutilizar las clases `.login-screen` y `.login-card` (o crear `.auth-screen` / `.auth-card` si preferís nombres más genéricos).

**Commit**: `Stage 1.2.5: refine LoginScreen and UnauthorizedScreen with lucide icons and warm style`

---

### Tarea 9 — Verificación local

```bash
npm run dev
```

Verificar en `http://localhost:5173/`:

1. **Login screen**: ChefHat ícono visible, fondo crema sutil, card centrado, botón "Entrar con Google" en marrón cálido.
2. **Header**: avatar con fondo `#8a4a2f` (marrón), nombre al lado, tap abre menú con ícono LogOut.
3. **Bottom nav**: 4 íconos lucide vectoriales (Home, BookOpen, ShoppingBag, History). El activo tiene fondo translúcido marrón + texto marrón.
4. **Biblioteca**: tabs con la línea inferior animando suavemente al cambiar. Botón "+ Importar" con ícono Plus para JP.
5. **Cualquier route placeholder**: la card tiene tinte crema sutil (no blanco puro). Texto meta en marrón apagado.
6. **Hover**: en desktop, las cards interactivas mostrar border más fuerte. Los botones cambian de fondo. Las tabs hover cambian color.
7. **Focus visible**: tabbeá con teclado. Todo elemento focuseable tiene ring marrón translúcido.
8. **Active state**: al press, los botones hacen scale(0.97) sutil.
9. **Fuente**: tipografía debería ser Inter (más limpia que Arial). Confirmar en DevTools → Computed → font-family.
10. **NO romper nada**: todas las rutas siguen funcionando, login/logout sigue funcionando, navegación sigue funcionando.

Si encontrás alguna inconsistencia visual o algo que se rompió, parar y diagnosticar.

---

### Tarea 10 — Build + deploy

```bash
npm run build
firebase deploy --only hosting
```

Verificar visualmente en `https://comida-familiar.web.app`. Probar especialmente en celular (la paleta cálida tiene que verse bien en pantalla pequeña).

**Commit**: `Stage 1.2.5: deploy visual polish to production`

---

### Tarea 11 — Documentar el estado provisorio en README

Agregar al `README.md` una sección al final llamada **"Diseño visual"**:

```markdown
## Diseño visual

**Estado actual**: estilo "B · Cocina cálida" — paleta tierra cálida (marrón #8a4a2f + crema #fdfaf6).

**Provisorio**. La identidad visual definitiva se rediseñará en Etapa 6 (PWA pulida) con Claude Design. Hasta entonces, este estilo es la base de trabajo.

**Themeability**: todos los colores y radios viven en CSS variables en `src/styles/tokens.css`. Para cambiar paleta:

1. Editar los `--bg`, `--surface`, `--primary`, etc en `tokens.css`.
2. Ningún componente React tiene hex hardcodeado.
3. Re-deploy.

El cambio de paleta es 100% en CSS — no requiere modificar componentes.
```

**Commit**: `Stage 1.2.5: document provisional design state in README`

---

### Tarea 12 — Push final

```bash
git status
git log --oneline -20
git push
```

---

## Criterios de aceptación

1. ✅ `lucide-react` instalado.
2. ✅ Inter cargado desde Google Fonts.
3. ✅ `tokens.css` re-escrito con paleta cálida + escala de spacing + tokens de tipografía.
4. ✅ `utilities.css` creado e importado.
5. ✅ Bottom nav usa íconos lucide (Home, BookOpen, ShoppingBag, History) — sin emojis.
6. ✅ Header refinado con avatar marrón y menú con ícono LogOut.
7. ✅ Biblioteca: botón "+ Importar" con ícono Plus.
8. ✅ Todos los routes placeholders usan `className="card"` y `className="meta"` — sin estilos inline para padding/colores.
9. ✅ LoginScreen y UnauthorizedScreen rediseñados con ChefHat / Lock + paleta cálida.
10. ✅ Estados hover/active/focus visibles en bottom nav, header, cards interactivas, tabs, botones.
11. ✅ `npm run dev` sin errores ni warnings de TypeScript.
12. ✅ `npm run build` exitoso, deploy a producción funciona.
13. ✅ README documenta el estado provisorio y cómo re-tematizar.
14. ✅ Historial con commits granulares con prefijo `Stage 1.2.5:`.

---

## Qué NO tocar

- **NO cambiar** la lógica de auth, routing, o cualquier funcionalidad. Esto es 100% visual.
- **NO crear** componentes nuevos. Solo refinar los existentes.
- **NO instalar** otras librerías UI (framer-motion, shadcn, etc).
- **NO hardcodear** hex colors en componentes React. Todo via CSS variables.
- **NO agregar** dark mode. Llega en otra etapa si se decide.
- **NO mover** archivos de carpeta. Solo modificar contenido.
- **NO modificar** Firestore Rules, Firebase config, o cualquier infra.
- **NO portar el design system completo** de `Styles.html` del Apps Script (sus tokens viejos). Estamos re-armando con tokens nuevos.

---

## Para JP, después de cerrar el prompt

Cuando los 14 criterios estén cumplidos:

1. **Probá la app en producción** desde celular y desktop. Confirmá que la paleta cálida se ve bien en ambos contextos.
2. **Pedile a María o los chicos** que entren con sus cuentas. Verificá que la experiencia es coherente para todos.
3. **Anotame cualquier cosa que te chirríe visualmente** — colores muy pálidos, contraste bajo, íconos que no representan bien, spacing raro. No vamos a perfectizar ahora (eso es Etapa 6), pero si algo es claramente molesto lo ajustamos rápido.
4. **Recordá**: este estilo es provisorio. En Etapa 6 lo revisamos con Claude Design. Lo importante hoy es no arrastrar limitaciones visuales del Apps Script al laburo de Etapas 2-5.

Si todo OK, cerramos `PROMPT_E1.2.5` y arrancamos **Etapa 2 — Modelo de datos** con `PROMPT_E2.1_types_and_helpers.md`.
