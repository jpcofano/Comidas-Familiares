# 📦 Implementation handoff — Comida Familiar

> Master index for shipping the design system changes into the production codebase
> [`jpcofano/Comidas-Familiares`](https://github.com/jpcofano/Comidas-Familiares) (React 19 + Vite 8 + Firebase).
>
> Read this first, then drill into the linked specialist docs. Estimated effort: **1–2 PRs over a couple days** depending on appetite.

---

## 0. What's in this system

| File / folder | What it is |
|---|---|
| `README.md` | Content fundamentals + visual foundations + iconography (long-form). |
| `SKILL.md` | Agent-compatible skill entry point (Claude Code). |
| `colors_and_type.css` | All tokens — colors, type, spacing, radii, shadows, transitions. |
| `colors_and_type-dark.css` | Dark mode override (`@media prefers-color-scheme: dark`). Optional ship. |
| `assets/` | Brand mark SVGs + PWA icons (8 PNG) + splash screens (11 PNG) + manifest. |
| `preview/` | 30+ specimen cards rendered as standalone HTML. Open `preview/brand-mark.html` to see the canonical lockup. |
| `ui_kits/mobile-app/` | High-fidelity JSX recreations of every app screen. Open `ui_kits/mobile-app/index.html` for an interactive demo with role switch + deep-link navigation. |
| `design_handoff_mobile_app_v2/` | Per-feature dev handoffs (README + LOGOMARK). **Start here for code-level specs.** |
| `_review/` | Reference screenshots. |

---

## 1. Quick start

```
1. Open `ui_kits/mobile-app/index.html` in a browser.
2. Toggle Tweaks (toolbar) → switch between JP / M / S / F roles, deep-link to any screen.
3. Read `design_handoff_mobile_app_v2/README.md` for v2 Home + components.
4. Read `design_handoff_mobile_app_v2/LOGOMARK.md` for the brand mark + favicon + PWA.
5. Copy assets per the file map below.
6. Implement components per the screen index below.
```

---

## 2. File copy map

Move these from this design system into `Comidas-Familiares/`:

```
design system                                  → codebase
─────────────────────────────────────────────────────────────────────────────
colors_and_type.css                            → already in src/styles/tokens.css (verify match)
colors_and_type-dark.css                       → src/styles/tokens-dark.css        (optional)

assets/favicon.svg                             → public/favicon.svg                (overwrites Vite leftover)
assets/pwa/manifest.json                       → public/manifest.json
assets/pwa/favicon-16.png                      → public/icons/favicon-16.png
assets/pwa/favicon-32.png                      → public/icons/favicon-32.png
assets/pwa/favicon-48.png                      → public/icons/favicon-48.png
assets/pwa/apple-touch-icon.png                → public/icons/apple-touch-icon.png
assets/pwa/icon-192.png                        → public/icons/icon-192.png
assets/pwa/icon-512.png                        → public/icons/icon-512.png
assets/pwa/icon-maskable-192.png               → public/icons/icon-maskable-192.png
assets/pwa/icon-maskable-512.png               → public/icons/icon-maskable-512.png
assets/pwa/splash/*.png  (11 files)            → public/icons/splash/*.png
```

`assets/app-mark.svg` and `assets/chef-hat.svg` are **references** — they're inline-encoded as a React component (see step 3.2).

---

## 3. Code changes

### 3.1 `index.html` — `<head>` block

Replace the current favicon `<link>` line with the full PWA block. See **`design_handoff_mobile_app_v2/LOGOMARK.md` § 2** for the exact snippet (favicon + apple-touch + manifest + theme-color + 9 splash media queries + apple-mobile-web-app meta tags).

### 3.2 New component: `src/brand/PlatoMark.tsx`

Inline-SVG of the brand mark, with two variants (`vapor` for ≥28px, `simple` for chrome <28px).

**Source code:** **`design_handoff_mobile_app_v2/LOGOMARK.md` § 4** — copy-paste ready TSX.

### 3.3 Replace `<ChefHat>` from lucide-react

- **`src/auth/LoginScreen.tsx`**: replace `<ChefHat size={36} strokeWidth={1.5} />` with `<PlatoMark size={40} variant="vapor" strokeWidth={1.6} />`. **`design_handoff_mobile_app_v2/LOGOMARK.md` § 5**.
- **`src/layout/Header.tsx`**: optionally add a brand mark chip at left (v2 Header layout). **`design_handoff_mobile_app_v2/README.md`** → "Header" section + `design_handoff_mobile_app_v2/LOGOMARK.md` § 6.
- Search for any other `ChefHat` import: `grep -r "ChefHat" src/`. None should remain.

`lucide-react` stays — still used for `Home`, `BookOpen`, `ShoppingBag`, `History`, `Clock`, `Plus`, `ChevronLeft/Right/Down`, `LogOut`, `Upload`.

### 3.4 Tokens — verify `src/styles/tokens.css` matches

Compare `colors_and_type.css` (this system) against `Comidas-Familiares/src/styles/tokens.css`. They should be identical — this design system mirrors what's already shipped. If anything drifted, sync them.

### 3.5 New screens to add to v2 Home

See **`design_handoff_mobile_app_v2/README.md`** for full specs of:

- `WeekStrip.tsx` — 7-day strip above Home
- `MemberAvatar.tsx` + `AvatarStack` — colored-initial circles per family member
- `PlanCard.tsx` — featured + standard variants with footer in cream stripe
- `CompraProgress.tsx` — shopping list summary with bar

Reference live JSX: `ui_kits/mobile-app/{HomeScreen,PlanCard,MemberAvatar,WeekStrip}.jsx`.

---

## 4. Screens already covered in the kit

| Screen in app | Reference JSX (this system) | Notes |
|---|---|---|
| Login | `ui_kits/mobile-app/LoginScreen.jsx` | Uses new `<PlatoMark variant="vapor">`. |
| Home (JP) | `ui_kits/mobile-app/HomeScreen.jsx` | v2 layout — full rewrite, see § 3.5. |
| Home (member) | `ui_kits/mobile-app/MemberDashboardScreen.jsx` | New surface — see kit for layout. |
| Biblioteca | `ui_kits/mobile-app/BibliotecaScreen.jsx` | Matches current. Tabs Recetas/Menús. |
| Compras | `ui_kits/mobile-app/ComprasScreen.jsx` | Grouped by section, checkbox + qty + ya-tengo. |
| Detalle receta | `ui_kits/mobile-app/DetalleRecetaScreen.jsx` | Matches current. |
| Cocinar | `ui_kits/mobile-app/CocinarScreen.jsx` | Defaults to **guiada** (1 step at a time) + "Ver todos" toggle to scroll. Matches `src/routes/Cocinar.tsx`. |
| Voto / Vista evaluada | `ui_kits/mobile-app/VotoScreen.jsx` | Cocinada → votar + cerrada read-only. |
| Historial | `ui_kits/mobile-app/HistorialScreen.jsx` | Lista con buscador + ResultadoBadge. |
| Historial detalle | `ui_kits/mobile-app/HistorialDetalleScreen.jsx` | |
| Importar menú | `ui_kits/mobile-app/ImportarMenuScreen.jsx` | JP-only. |
| **Detalle menú** ⭐ | `ui_kits/mobile-app/DetalleMenuScreen.jsx` | Multi-receta bundle. Match `src/routes/DetalleMenu.tsx`. |
| **Seleccionar componente menú** ⭐ | `ui_kits/mobile-app/SeleccionarComponenteMenuScreen.jsx` | Mid-cook for menu plans. Match `src/routes/SeleccionarComponenteMenu.tsx`. |

⭐ = new in this design system, not yet implemented in the codebase (codebase has the routes/state but the UI was generic — these are the polished versions).

---

## 5. Optional / recommended additions

These are **not blockers** but the design system has them ready. Ship them when you want.

### 5.1 Dark mode — "Cocina apagada"

- Drop `colors_and_type-dark.css` into `src/styles/tokens-dark.css`
- Import after `tokens.css`: `<link>` or `@import`
- Activation by `prefers-color-scheme` system-wide (default proposed) — no UI toggle required
- Spec: see `preview/dark-mode.html` open in browser
- Decision needed: ship with system preference, or add a manual toggle in the user menu

### 5.2 Skeleton loaders

Replace the text `"Cargando…"` everywhere with the patterns specified in `preview/skeleton-loaders.html`. 4 components cover all loading states:

- `<SkeletonRow>` — avatar + 2 lines (history, member rows)
- `<SkeletonHeader>` — title + meta (page top)
- `<SkeletonPlanCard>` — for the Home plan cards
- `<SkeletonList count={3}>` — Biblioteca and Historial

CSS animation: `pulse-bg 1.6s ease-in-out infinite` between `--surface-alt` and `--border`.

### 5.3 Motion tokens

Already in `tokens.css` (`--t-fast 120ms`, `--t-base 180ms`). Make sure new components use these — never hardcode durations. See `preview/motion.html` for the system catalog and a visualization of each duration.

### 5.4 Voice & tone audit

Run the existing copy through the patterns in `preview/voice-do-dont.html`. Worth a UX pass before shipping the v2 home — the patterns are stricter than the current copy (some buttons drift toward Title Case in v1).

### 5.5 Cleanup: deprecate `'chef-hat'` Icon key

`ui_kits/mobile-app/Icon.jsx` keeps a deprecated alias `'chef-hat'` that draws the new plate mark. If the production codebase ever uses an internal icon map (it doesn't today — it imports from lucide-react directly), don't carry the alias forward — use `'plato'` / `'plato-vapor'` keys instead.

---

## 6. QA checklist (manual)

After implementing the steps above:

**Build & install**
- [ ] `npm run build` finishes without warnings
- [ ] `npm run preview` serves cleanly, no console errors
- [ ] Favicon shows the brown rounded-square plate mark in the browser tab

**Mobile · iPhone Safari**
- [ ] Add to Home Screen → icon is the plate, not a Vite default
- [ ] Tap installed icon → splash screen shows cream + plate + "Comida Familiar / Cocina familiar Cofano" briefly before the app loads
- [ ] App runs in standalone mode (no browser chrome)
- [ ] Status bar uses theme-color when in PWA mode

**Mobile · Android Chrome**
- [ ] Install prompt shows the brown icon
- [ ] Launcher icon is the maskable variant (full-bleed brown, crops to launcher shape)
- [ ] Theme color on status bar is `#8a4a2f` when PWA is open

**Functional**
- [ ] LoginScreen shows plate-with-vapor in the soft circle
- [ ] Header chip shows the small plate variant
- [ ] DetalleMenu screen renders for each menu in the library (tap from Biblioteca → Menús tab)
- [ ] SeleccionarComponenteMenu opens when JP/member taps "Cocinar" on a menu-typed plan in Home
- [ ] Cocinar opens in **guiada mode** with dot progress + Anterior/Siguiente
- [ ] "Ver todos" toggle switches to scroll mode; "Paso a paso" toggles back
- [ ] All other screens still render (regression check)

**Accessibility**
- [ ] `<PlatoMark>` is `aria-hidden` when paired with the wordmark; has `aria-label="Comida Familiar"` when standalone
- [ ] Focus ring shows on all interactive elements (uses `--shadow-focus`)
- [ ] Color contrast: button text on brown is AA (currently 7.78:1 — fine), muted text on cream is AA Large (3.0+)

---

## 7. Where to ask questions

- **Logomark / brand**: see `preview/logomark-03-variations.html` for the full A-F rationale of why F was picked. F = "Plato con vapor".
- **Tokens**: `colors_and_type.css` has comments on each cluster.
- **Voice**: `README.md` § Content fundamentals + `preview/voice-do-dont.html`.
- **Live component reference**: every JSX in `ui_kits/mobile-app/` is annotated.
- **Things that look weird in the kit**: open the file in `ui_kits/mobile-app/` and look at the actual code — the kit is not a fully-stubbed prototype, it's the source of truth for visuals.

---

## 8. Versions

- **Design system version**: 1.0 (logomark + dark mode + menu screens + skeletons all locked in)
- **Codebase version expected**: v2 (post Home rewrite + brand mark integrated)
- **Last touched**: May 2026
