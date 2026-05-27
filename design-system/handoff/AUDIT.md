# 🔍 Auditoría — `jpcofano/Comidas-Familiares` @ main (8d44aba)

> Revisado contra Comida Familiar Design System v1.0
> Fecha: 2026-05-27

## TL;DR

**El design system v1.0 quedó sin instalar.** Los tokens están parcialmente sincronizados (faltan 2 variables que el código ya usa), pero **todo el resto del handoff está sin hacer**: el favicon sigue siendo el rayo morado de Vite, no existe `src/brand/PlatoMark.tsx`, LoginScreen sigue con `<ChefHat>` de lucide, no hay PWA (ni manifest ni icons ni splashes), no se extrajeron los componentes v2 (WeekStrip / MemberAvatar / PlanCard / CompraProgress), y no hay dark mode. Además, `src/index.css` y `src/App.css` siguen siendo el scaffold de Vite con un `--accent: #aa3bff` morado y un `font: 18px/145%` que pisan los tokens del design system.

Estimo **1 PR mediano (~3-4 hs) para volver a v1.0 visual**.

---

## P0 — Bloqueantes

### 1. Favicon es el rayo morado de Vite, no el F·Plato
- **Archivo:** `public/favicon.svg`
- **Estado:** SVG con `fill:#863bff` / `#7e14ff` (rayo morado Vite, 48×46, con filtros gaussianos).
- **Debería ser:** el F·Plato marrón del design system → `assets/favicon.svg`.

### 2. Cero assets PWA
- **Estado en repo:** `public/` solo tiene `favicon.svg` (incorrecto) e `icons.svg`.
- **Falta:**
  - `public/manifest.json`
  - `public/icons/favicon-{16,32,48}.png`
  - `public/icons/apple-touch-icon.png`
  - `public/icons/icon-{192,512}.png`
  - `public/icons/icon-maskable-{192,512}.png`
  - `public/icons/splash/` × 11 PNG (los 9 iPhones + 2 cuadrados)
- **Disponibles ya generados:** todos en `design-system/assets/pwa/` listos para copiar.

### 3. `index.html` sin PWA meta
- **Estado:** solo `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` + fonts de Google.
- **Falta:** apple-touch-icon, manifest, theme-color (`#8a4a2f`), apple-mobile-web-app-capable/title/status-bar-style, y los 9 `apple-touch-startup-image` con media queries.

### 4. `src/brand/PlatoMark.tsx` no existe
- **Buscado:** carpeta `src/brand/` directamente no está creada.
- **Consecuencia:** ningún lugar del codebase puede importar el mark inline.

### 5. LoginScreen sigue usando `<ChefHat>` de lucide
- **Archivo:** `src/auth/LoginScreen.tsx:2,21`
  ```tsx
  import { ChefHat } from "lucide-react";
  // ...
  <ChefHat size={36} strokeWidth={1.5} />
  ```
- **Debería:** `<PlatoMark size={40} variant="vapor" strokeWidth={1.6} />`.

### 6. `src/index.css` es el scaffold morado de Vite — está pisando tokens
- **Archivo:** `src/index.css` (importado desde `src/main.tsx` *después* de `tokens.css`).
- **Define en `:root`:**
  - `--accent: #aa3bff` (purple) ← **pisa el `--accent: #74324a` bordó del design system**
  - `--bg: #fff` ← pisa el crema `#fdfaf6`
  - `--text: #6b6375` (gris frío) ← pisa el casi-negro cálido `#1f1a16`
  - `--border: #e5e4e7`, `--text-h: #08060d`, `--code-bg`, `--social-bg`, `--shadow`
- **También:**
  - `font: 18px/145% var(--sans)` ← pisa los `14px / 1.5` del design system
  - `#root { width: 1126px; max-width: 100%; margin: 0 auto; text-align: center; border-inline: 1px solid var(--border); }` ← envuelve toda la app en un container desktop centrado con bordes laterales
  - `h1 { font-size: 56px; letter-spacing: -1.68px; margin: 32px 0; }` ← pisa los 24px del design system
  - `h2 { font-size: 24px; ... color: var(--text-h); }` ← `--text-h` no existe en tokens.css, queda transparente/inherit
  - Bloque `@media (prefers-color-scheme: dark)` con tokens Vite (no los de "Cocina apagada" del design system)
- **Action:** borrar `src/index.css` completo y quitar el `import './index.css'` de `src/main.tsx`. Reemplazar por la versión de "Cocina apagada" (`tokens-dark.css`) si se quiere dark mode.

### 7. `src/App.css` también es scaffold de Vite
- **Archivo:** `src/App.css` (importado desde donde? — verificar; aparece pero no es claro si está siendo importado o quedó huérfano).
- **Contiene:** `.counter`, `.hero { .base, .framework, .vite }`, `#center`, `#next-steps`, `#docs`, `#spacer`, `.ticks` — todo demo de Vite, ningún uso real.
- **Action:** borrar el archivo completo. Si `App.tsx` lo importa, quitar el import.

### 8. `--fw-semibold` está roto (silenciosamente)
- **Archivo:** `src/styles/tokens.css` define `--fw-regular: 400`, `--fw-medium: 500`, `--fw-bold: 700`. **No define `--fw-semibold: 600`**.
- **Pero** `src/routes/Cocinar.tsx:144,233` usa `fontWeight: "var(--fw-semibold)"` en dos lugares (título de receta en modo guiada y modo scroll).
- **Consecuencia:** la propiedad CSS queda inválida → cae al default (`normal` = 400) → los títulos de Cocinar se ven más delgados que el resto.
- **Fix:** agregar `--fw-semibold: 600;` a `tokens.css` (ya está en `colors_and_type.css` del design system).

### 9. `--shadow-toast` no está en tokens del repo
- **Archivo:** `src/styles/tokens.css` falta `--shadow-toast`.
- **Design system la tiene:** `0 4px 12px rgba(0, 0, 0, 0.18)`.
- **Impacto:** ninguno hoy (nadie la usa), pero el design system la espera.

### 10. Comentario stale en tokens.css
- **Archivo:** `src/styles/tokens.css:5`
  ```
  /* PALETA — Estilo B · Cocina cálida (provisoria) — A revisar en Etapa 6 con Claude Design */
  ```
- **Estado real:** la revisión ya pasó, los colores están finales. El comentario miente al próximo dev.
- **Fix:** reemplazar header por `Sourced from design-system colors_and_type.css v1.0`.

---

## P1 — Componentes v2 sin extraer

### 11. Header no tiene el brand mark chip
- **Archivo:** `src/layout/Header.tsx`
- **Estado:** solo título "Comida Familiar" en `--primary` + avatar de iniciales.
- **Falta:** el chip circular de 28px con `--primary-soft` que contiene `<PlatoMark size={16} variant="simple">` al lado del título.
- **Snippet listo:** ver `design_handoff_mobile_app_v2/LOGOMARK.md § 6`.

### 12. v2 Home rewrite a medias
- **Archivo:** `src/routes/Home.tsx` (21KB, todo inline).
- **`EstadoBadge`** vive inline dentro de Home.tsx en vez de `src/components/EstadoBadge.tsx`.
- **`PlanCard`** vive inline dentro de Home.tsx (250 líneas, llena de estilos inline).
- **Faltan completamente:**
  - `src/components/WeekStrip.tsx` — strip de 7 días arriba del Home
  - `src/components/MemberAvatar.tsx` + `AvatarStack` — iniciales-color por miembro de la familia
  - `src/components/PlanCard.tsx` — featured + standard variants (extraer del Home.tsx actual)
  - `src/components/CompraProgress.tsx` — barra de progreso de la lista de compras (hoy es solo "X pendientes · Y ya tengo" inline)
- **Referencia en design system:** `ui_kits/mobile-app/{HomeScreen,PlanCard,WeekStrip,MemberAvatar}.jsx`.

### 13. Bug semántico en Home.tsx: usar `--err-text` como background
- **Archivo:** `src/routes/Home.tsx:182`
  ```tsx
  <button ... style={{ background: "var(--err-text)" }}>Confirmar descarte</button>
  ```
- **Problema:** `--err-text` es `#8a3520` (color pensado para texto sobre `--err-bg`). Usarlo como fondo de botón rompe la jerarquía de tokens y va a romper en dark mode (donde `--err-text` pasa a `#e8a988` para contraste sobre fondo oscuro → el botón quedaría coral salmón sobre marrón en dark).
- **Fix:** crear un `--danger` / `--danger-on` o usar `--accent` (bordó). Mínimo: `background: var(--err-line)` con `color: var(--err-text)` (washed), o introducir tokens dedicados destructive.

### 14. Botón "+ Importar menú" hardcoded
- **Archivo:** `src/routes/Home.tsx:482`
- **Estado:** styles inline con `background: var(--primary)`, `color: #fff`, `padding: "0.4rem 0.9rem"`, `borderRadius: "6px"`.
- **Fix:** usar `<Link className="btn btn-primary">` — la utility class ya existe en `utilities.css`.

---

## P1 — Dark mode missing

### 15. `src/styles/tokens-dark.css` no existe
- **Design system tiene:** `colors_and_type-dark.css` con la paleta "Cocina apagada" completa.
- **Falta:** copiar a `src/styles/tokens-dark.css` y agregar `import './styles/tokens-dark.css'` en `main.tsx` después de `tokens.css`.
- **Bonus:** decisión pendiente del usuario sobre si activar por `prefers-color-scheme` o con toggle manual en el menú. **Default propuesto en handoff: system preference**, ningún toggle.

### 16. `index.css` tiene un `@media (prefers-color-scheme: dark)` con tokens Vite morados
- Esto es parte de #6 — al borrar `index.css`, ese dark mode roto también desaparece.

---

## P2 — Cleanup

### 17. Username se oculta en mobile sin razón en el design
- **Archivo:** `src/layout/Header.css:55-58`
  ```css
  @media (max-width: 419px) { .username { display: none; } }
  ```
- En el design system el `username` se mantiene visible (se trunca con ellipsis si hace falta).

### 18. `package.json` — versiones a verificar
- `react ^19.2.6`, `react-dom ^19.2.6`, `vite ^8.0.12`, `typescript ~6.0.2`, `lucide-react ^1.16.0`, `eslint ^10.3.0`.
- Asegurar que `npm install` resuelve limpio. `lucide-react ^1.16.0` en particular: la última que conozco era 0.x; verificar.

### 19. Pantallas marcadas ⭐ en el handoff
- `src/routes/DetalleMenu.tsx` y `src/routes/SeleccionarComponenteMenu.tsx` existen en el repo, pero hay que verificar contra las versiones polished en `ui_kits/mobile-app/{DetalleMenuScreen,SeleccionarComponenteMenuScreen}.jsx`. **No las leí en detalle en esta auditoría** — son las dos que el design system marca como "nuevas, codebase tenía routes pero UI genérica".

### 20. Skeleton loaders no implementados
- Pendiente: reemplazar `<p className="meta">Cargando…</p>` por los 4 `<Skeleton*>` del `preview/skeleton-loaders.html`. **Opt-in según handoff** — no es bloqueante.

---

## Lo que SÍ está bien

- ✅ `src/styles/tokens.css` tiene la paleta correcta `--primary: #8a4a2f` + warm cream + accent bordó. Solo le faltan 2 vars (`--fw-semibold`, `--shadow-toast`).
- ✅ `src/styles/utilities.css` ya tiene `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.card` / `.tabs` con tokens correctos.
- ✅ El routing en `App.tsx` cubre todas las pantallas del UI kit incluida `/planes/:idPlan/componentes` (SeleccionarComponenteMenu) y `/menus/:id` (DetalleMenu).
- ✅ `Cocinar.tsx` soporta modo guiada + scroll con toggle — match con el handoff.
- ✅ Header tiene click-outside, avatar, menú con LogOut.
- ✅ BottomNav diferencia JP vs miembro correctamente.

---

## Orden sugerido de fixes

| # | Fix | Impacto | Esfuerzo |
|---|---|---|---|
| 1 | Borrar `src/index.css` + `src/App.css`, quitar imports | Quita el accent morado y los overrides | 5 min |
| 2 | Sumar `--fw-semibold: 600` y `--shadow-toast` a tokens.css | Arregla los títulos de Cocinar | 2 min |
| 3 | Copiar PWA assets (favicon.svg + manifest.json + 8 icons + 11 splashes) | Activa el brand | 10 min |
| 4 | Actualizar `index.html <head>` con bloque PWA completo | Activa add-to-home-screen | 5 min |
| 5 | Crear `src/brand/PlatoMark.tsx` | Habilita el mark | 5 min |
| 6 | Reemplazar `<ChefHat>` en LoginScreen | Logo correcto en login | 2 min |
| 7 | Agregar chip + `<PlatoMark variant="simple">` al Header | Logo correcto en chrome | 10 min |
| 8 | Arreglar el `background: var(--err-text)` en Home (P1.13) | Bug de tokens | 5 min |
| 9 | Cambiar el "+ Importar menú" a `.btn .btn-primary` | Consistencia | 2 min |
| 10 | Copiar `colors_and_type-dark.css` → `tokens-dark.css` + import | Dark mode | 5 min |
| 11 | Extraer `EstadoBadge`, `PlanCard`, `WeekStrip`, `MemberAvatar`, `CompraProgress` a `src/components/` | v2 Home completo | 1-2 hs |

Total mínimo (1-9): **~45 min**. Con todo (1-11): **~3 hs**.
