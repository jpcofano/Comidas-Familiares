# Comida Familiar — Design System

> **Comida Familiar** is a Spanish-language mobile-first PWA for family meal planning. One person (Juan Pablo, "JP") curates a library of recipes and weekly menus; the rest of the family (María, Sofía, Federico) sees what's being cooked this week, shops, cooks, and votes after dinner.

This design system captures the warm "cocina cálida" visual language and component vocabulary of the existing React + Vite + Firebase app, so future designs — mocks, marketing pages, prototype variants — stay consistent with what's already shipping.

---

## Sources

- **Codebase** (mounted, read-only): `Comidas-Familiares/` — React 19 + Vite 8 + Firebase, deployed via Firebase Hosting.
- **GitHub**: [`jpcofano/Comidas-Familiares`](https://github.com/jpcofano/Comidas-Familiares) — explore further to deepen any design built on top of this product.
- **Apps Script ancestor**: `Comidas-Familiares/Migracion/` — the original Google Apps Script implementation that the web app migrated from. The accent bordó (`#74324a`) in the current palette is a deliberate wink to that earlier tool.
- **No Figma file or slide deck was provided.** All tokens, copy, and component patterns below are reverse-engineered from the codebase.

---

## Index — what lives in this folder

| Path | What it is |
|---|---|
| `README.md` | This file. Content fundamentals, visual foundations, iconography. |
| `SKILL.md` | Agent-compatible skill entry-point. |
| `colors_and_type.css` | All design tokens (colors, type scale, spacing, radii, shadows, transitions) as CSS custom properties. Import this and you're set. |
| `assets/` | Brand mark, favicon, chef-hat glyph. |
| `preview/` | Static HTML cards that populate the Design System tab. Each card previews one foundation (color cluster, type specimen, spacing scale, etc.) or component cluster. |
| `ui_kits/mobile-app/` | High-fidelity, interactive recreation of the live app — synced through **E11 (macros UI)**. Covers LoginScreen, AppShell + BottomNav + Header (with dark-mode toggle), Home (JP + member dashboards), Biblioteca, Mis recetas / Visibilidad, Perfil de miembro, Catálogo de ingredientes, ¿Qué cocino con lo que tengo?, Compras, Detalle de receta (con macros), Detalle de menú, Cocinar, Voto e Historial. Role + screen switching via the Tweaks panel. Open `ui_kits/mobile-app/index.html`. |

---

## Content fundamentals

The product is **in Spanish (Argentina)**. Copy is friendly, imperative, and concrete — written for a household that already knows each other.

### Tone
- **Direct and warm.** "Esta semana", "Cocinar", "Marcar Cocinada", "+ Sumar extra", "+ Sumar en proceso", "Ir a evaluar". Verbs in command form, no preamble.
- **Familiar register.** Spanish second person is implied (no explicit *tú* or *vos* in surfaces seen) but the vibe is informal — like a shared whiteboard at home.
- **Concrete, never abstract.** "Lista de compras", "Quiénes cocinan este plato", "5 pendientes · 12 ya tengo", "Ninguna receta coincide con los filtros." Concrete things, concrete counts.
- **Internal vocabulary is preserved.** "Especial de la semana", "Especial extra", "En proceso", "JP", "Cofano". The product treats family members by name in code (`juanpablo`, `maria`, `sofia`, `federico`) and surfaces them as "Juan Pablo", "María", "Sofía", "Federico" in UI.

### Casing
- **Sentence case throughout.** Section headers ("Esta semana", "Herramientas JP", "Lista de compras"), card titles, and button labels are all sentence-case. The only uppercase you'll see is the small-caps overline pattern: `text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em` on tags like "Especial de la semana" inside featured cards, and on aisle headers ("VERDULERÍA", "CARNICERÍA") inside the shopping list.
- **No title case** for headings. "Detalle del menú" not "Detalle Del Menú".

### Voice patterns
- **Empty states are honest, not cute.** "Todavía no hay comidas elegidas para esta semana." → "Ver recetas". No emojis, no apologies.
- **Confirmations sound like a household conversation.** "¿Descartar la Especial? También se van a descartar sus extras." "Tiene que cocinarlo al menos una persona." "Ninguna receta coincide con los filtros."
- **Loading is just "Cargando…"** Sometimes "Calculando…" for derived menu metadata. Always with an ellipsis.
- **Counts are bolded inline.** `**5** pendientes · **12** ya tengo`. Numbers carry weight; the label sits in `--muted`.

### Emoji
- **No decorative emoji** in any UI surface. The codebase uses one unicode glyph: `⏱` (alarm clock) as a prefix on the "Iniciar timer N min" / "Timer activo — Cancelar" buttons inside `PasoCard`. That's it.
- A single check `✓` (U+2713) appears as the "ya tengo" tick inside the shopping list checkbox, drawn as text with `color: var(--ok-text)`. The "tachado" (struck-through) step indicator in `PasoCard` also swaps the step-number for `✓`.

### Example specimens
> **Hero (LoginScreen):**
> Comida Familiar
> Planificación semanal de comidas para la familia Cofano
> [Entrar con Google]

> **Section header (Home):**
> Esta semana
>   Especial de la semana
>   ↳ Extras
>   En proceso

> **State labels (badges, lowercase + sentence-case):**
> Elegida · Compra pendiente · Compra lista · Cocinando · Cocinada · Evaluada

> **Action buttons (verb-led):**
> Cocinar · Continuar cocinando · Marcar Cocinada · Ver receta · Descartar · + Sumar extra · + Sumar en proceso · Editar · Guardar · Cancelar

---

## Visual foundations

The palette is named **"Estilo B · Cocina cálida"** in the source code — *warm-kitchen* — and that label tells you everything. This is a domestic, indoors-at-night-with-the-oven-on system, not a startup.

### Palette
- **Cream backgrounds, all over.** Page is `#fdfaf6` (`--bg`), cards sit on a slightly warmer `#fdf8f3` (`--surface`), and elevated surfaces (menus, login card, the white inside a hover row) flatten to pure `#ffffff` (`--surface-strong`). A fourth surface `--surface-alt: #f6efe5` is the hover/pressed/secondary tone.
- **Primary is warm brown**, `#8a4a2f` (`--primary`), darkening to `#6e3a23` (`--primary-strong`) on hover. It is the ONLY tinted color used on filled buttons, the active bottom-nav state, the header title, and any "this is the action" affordance. Its 10%-opacity wash `--primary-soft` is the soft fill behind the chef-hat on LoginScreen and behind the active bottom-nav tab.
- **Accent bordó** `#74324a` (`--accent`) is used very rarely — kept in reserve as a "decorative second" that nods to the original Apps Script tool. Don't reach for it for state.
- **Semantic 4-pair system** — every state has a `*-bg`, `*-line`, `*-text` triplet: `ok` (green, plan cocinado), `err` (terracotta-red, descartar/errores), `warn` (mustard, compra pendiente / confirm-discard), `info` (slate-blue, compra lista). Always used as a chip/badge, never as a solid fill on a block of content.
- **No pure black.** Headings sit at `#0e0a07`, body at `#1f1a16`. Muted text is `#6b5d52` (a warm taupe), borders are `#e8dfd4` to `#d8cdbe`.

### Type
- **Inter** loaded from Google Fonts (`<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap">` in `index.html`), with `font-feature-settings: "cv02", "cv03", "cv04", "cv11"` for the alternate-1, plain-l, dotted-zero, and tail-y stylistic sets.
- **Scale is small and dense.** Base body is `14px`. H1 is `24px`, H2 is `20px`, H3 is `17px`. Captions (`.meta`) are `13px`. Smallest UI text (badges, tab counts, timer chips) is `12px`. There is *no* display size — this is a utility app, not an editorial one.
- **Three weights**: `400` regular for body, `500` medium for emphasized labels, buttons and active nav, `700` bold for headings and the "Especial de la semana" overline. `600` semibold is used inside `PasoCard` for step titles only.
- **Letter-spacing**: tight (`-0.01em`) on H1, near-tight (`-0.005em`) on H2, and **positive 0.05–0.07em** on uppercase overlines.

### Spacing
- **4px grid.** `--space-1` through `--space-12` step 4 → 8 → 12 → 16 → 20 → 24 → 32 → 40 → 48. The codebase uses `var(--space-N)` everywhere; no raw pixels.
- **Card padding** is asymmetric: `var(--space-4) var(--space-5)` (16 × 20). Most card stacks gap by `--space-3` (12px) between cards.
- **Bottom-nav padding** respects `env(safe-area-inset-bottom)`. Main content has `padding-bottom: 92px` to clear the nav.

### Borders & dividers
- **Three border tones** form a hierarchy: `--border-subtle #efe8de` for the lightest internal dividers, `--border #e8dfd4` as the default card border, `--line #d8cdbe` for stronger separators and the dashed/solid lines between rows.
- **Borders are 1px solid** in nearly every case. The only exceptions are the **featured "Especial" PlanCard** (`2px solid var(--primary)` + larger radius), the unchecked checkbox in the shopping list (`2px solid var(--border)`), and the active tab underline (`2px solid var(--primary)`).

### Radii
- A **5-step scale**: `6px` (sm) for inline tags / code, `10px` (md) for buttons and form controls, `14px` (lg) for cards and the featured plan, `20px` (xl) for the LoginScreen card and any hero container, and `9999px` (full) for status badges and the avatar circle.

### Shadows
- **No decorative shadows.** Three functional shadows only:
  - `--shadow-header`: `0 1px 3px rgba(31,26,22,0.06)` — the sticky header's hairline.
  - `--shadow-menu`: `0 4px 12px rgba(31,26,22,0.10)` — the user dropdown.
  - `--shadow-focus`: `0 0 0 3px var(--primary-soft)` — accessible focus ring, applied to every focusable element via `:focus-visible`.
- Cards do not have shadow; they are border-bounded. This is intentional — the cream surfaces and warm borders carry the depth.

### Backgrounds & imagery
- **No background images. No gradients. No patterns. No textures.** The product is pure typography + warm flat surfaces. The closest thing to a "visual" is the soft-primary circle behind the chef-hat icon on the LoginScreen.
- **No hero illustrations.** When something needs visual weight, it gets a bigger card, a primary border, or an overline label — never a graphic.

### Animation
- **Two duration tokens**: `--t-fast 120ms ease` and `--t-base 180ms ease`. Hand-rolled longer durations exist only on opacity/strike-through fade (`transition: opacity .2s` inside `PasoCard`).
- **Transitions are limited to**: `background`, `color`, `transform`, `border-color`, `box-shadow`. No spring physics, no bouncing, no scroll-linked anims.
- **No entrance animations.** Cards, dialogs, and toasts appear instantly. The Toast component fades by virtue of mounting; nothing else animates on mount.
- **Press = scale(0.96 → 0.97).** Buttons, nav buttons, and interactive cards shrink slightly on `:active`. That's the entire press feedback vocabulary.

### Hover & press states
- **Buttons**: background darkens by one step on hover. `btn-primary` → `--primary-strong`. `btn-secondary` and `btn-ghost` → `--surface-alt`. On press, `transform: scale(0.97)`.
- **Cards (`.card-interactive`)**: border darkens from `--border` to `--line` on hover, and `transform: scale(0.995)` on press.
- **Nav buttons**: text-color goes from `--muted` → `--muted-strong` on hover. Active state shows `background: var(--primary-soft)` + `color: var(--primary)`.
- **Disabled state** is universal: `opacity: 0.5` + `cursor: not-allowed` + `transform: none` (cancels the press shrink).

### Transparency & blur
- **Transparency is only used as 10% washes** of primary and accent (`--primary-soft`, `--accent-soft`). There are no blurred overlays, no glassmorphism, no translucent backdrops anywhere in the app.
- Modals use a flat `rgba(0,0,0,0.45)` scrim — no blur.

### Layout rules
- **Single-column, mobile-first.** Body has `overflow-x: hidden`. On desktop (`body.is-desktop`), the main content gets `max-width: 720px; margin: 0 auto;` — the app stays narrow, not a desktop layout.
- **Fixed elements**: the sticky header at top (`position: sticky; z-index: 10`) and the fixed bottom-nav (`position: fixed; z-index: 20`). Toasts pin to `bottom: var(--space-5)` centered, `z-index: 9999`. Modal scrims `z-index: 9998`.
- **Content respects iOS safe areas** via `env(safe-area-inset-bottom)` on the bottom-nav.

### Color vibe of imagery
- **N/A.** There is no imagery in the product. If photographs ever ship — for recipe thumbnails, family avatars, etc. — they should be **warm-toned, no cool blues, slight golden cast**, photographed in domestic kitchen lighting, no studio gloss. Imagine cookbook photography from the warmer end of the spectrum (think Ottolenghi's family-cooking books, not magazine food porn).

---

## Iconography

The app uses **[lucide-react](https://lucide.dev) v1.16.0** for every icon. Stroke icons, `strokeWidth={2}`, `size={20}` for nav items and `size={16}–{36}` elsewhere. No icon font, no SVG sprite of custom icons, no PNG icons.

### Icons in use (audited from the codebase)
- **Navigation**: `Home`, `BookOpen`, `ShoppingBag`, `History`, `Clock`
- **Branding**: `ChefHat` (the LoginScreen mark — see `assets/app-mark.svg` for a recreation)
- **Affordances**: `Plus` (import / add), `ChevronLeft` (back), `ChevronRight` / `ChevronDown` (expand toggles in shopping rows), `LogOut`

That's the complete set. The product is built deliberately with a small icon vocabulary; do not invent new icon use without confirming with the user.

### How to reference them in your designs
- **Inside React mocks**: `import { Home } from "lucide-react"` and follow the existing patterns (size 16/20, strokeWidth 2, color via `currentColor`).
- **Inside static HTML mocks** (e.g. slides, design canvas previews): pull the SVG body straight from [lucide.dev](https://lucide.dev) or CDN. `https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/<name>.svg` works.

### Brand mark
- The app uses **`ChefHat` in a circle** as its visual signature, sized 72px in a `--primary-soft` circle on the LoginScreen.
- `assets/app-mark.svg` recreates this exactly. `assets/chef-hat.svg` is the bare glyph. `assets/favicon.svg` is a brown-on-cream favicon (the real codebase ships an unrelated purple Vite-template favicon at `public/favicon.svg`, which is a bug — flagging here so you can offer the user a replacement).

### Emoji & unicode
- See the Content fundamentals section: **no decorative emoji.** The only unicode icons in use are `⏱` (alarm clock, in the timer button) and `✓` (check, in checkbox and tachado-step indicators).

### Substitution notes & open questions for the user
- **Fonts**: Inter is loaded straight from Google Fonts (matches the codebase). No font file substitution needed.
- **No proper brand mark exists.** The `ChefHat` lucide glyph functions as one. If you want a unique mark for marketing or app-store screenshots, this is the place to start.
- **The codebase ships with a leftover purple Vite/React-template favicon.** This system replaces it with `assets/favicon.svg`. Worth pointing out to the user.

---

## How to use this system

1. `@import "colors_and_type.css"` (or copy its `:root` block) — that gives you every token.
2. Drop in lucide icons via the CDN or the React package.
3. Reach for the `ui_kits/mobile-app/` components first; don't redraw the BottomNav or PlanCard from scratch.
4. When in doubt: warm browns, cream backgrounds, sentence case, 14px body, lucide icons, no shadows.

If you'd like to dig deeper into the source product, the GitHub repo is at <https://github.com/jpcofano/Comidas-Familiares>.
