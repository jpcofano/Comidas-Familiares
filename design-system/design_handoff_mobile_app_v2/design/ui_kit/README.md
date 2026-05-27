# Comida Familiar — Mobile UI Kit (v2)

High-fidelity recreation of the mobile app's screens and components. Each `.jsx` exports its component to `window.*` so other scripts can read them. Open `index.html` for the interactive demo.

**v2 changes** (vs. `index-v1.html` / `HomeScreen-v1.jsx` / `Header-v1.jsx`, kept for reference):

- **Weekday strip** at the top of Home — the app is about *this week*, so show it (`WeekStrip.jsx`).
- **Member-initial avatars** for "Quiénes cocinan" — each family member has a distinct brand-aligned color (`MemberAvatar.jsx` + `AvatarStack`).
- **PlanCard restructured**: title + metadata row (proteína · tiempo · dificultad), badge top-right, cocineros row with avatar stack, action footer in a tinted bottom strip.
- **No outer card-in-card** wrapping the Home content — sections breathe directly on the page background.
- **Compras summary with a progress bar** instead of plain counts.
- **Tighter Header** with the chef-hat brand mark inline.

## Components

| File | What it is |
|---|---|
| `Button.jsx` | `<Button variant="primary|secondary|ghost|danger" size="sm|md|lg" />` with press-shrink, hover, disabled states. |
| `EstadoBadge.jsx` | `<EstadoBadge estado="…" />` — six plan states as pill badges. |
| `MemberAvatar.jsx` | `<MemberAvatar name="María" size={22} />` + `<AvatarStack names={[…]} max={4} />` — color-coded initials per family member. |
| `WeekStrip.jsx` | `<WeekStrip today={N} marked={[idx,…]} />` — 7-day chip strip with today highlight + dot markers. |
| `Header.jsx` | `<Header nombre="…" subtitle?="…" />` — sticky app header with chef-hat brand mark + title + avatar. |
| `BottomNav.jsx` | `<BottomNav active="home|biblioteca|…" onNavigate isJP />` — 4-tab nav using lucide icons. Has JP and member variants. |
| `LoginScreen.jsx` | `<LoginScreen onSignIn />` — chef-hat logomark in a soft-primary circle, "Entrar con Google". |
| `HomeScreen.jsx` | `<HomeScreen planes lista onCocinar onVerReceta onIrCompras onAgregar />` — featured `Especial` card + nested extras + en-proceso list + shopping-list summary. |
| `BibliotecaScreen.jsx` | `<BibliotecaScreen recetas onAbrir />` — underline tabs, search, two selects, filter chip, recipe cards. |
| `ComprasScreen.jsx` | `<ComprasScreen items />` — by-aisle/by-recipe toggle, status filters, ya-tengo checkboxes, line-through state. |
| `DetalleRecetaScreen.jsx` | `<DetalleRecetaScreen receta onBack onCocinar onElegirComoEspecial onSumarExtra />` — recipe detail with chips, ingredients, steps, action stack. |
| `CocinarScreen.jsx` | `<CocinarScreen receta onBack onFinalizar />` — step-by-step with `PasoCard`, timer button, "Siguiente paso" / "Finalizar". |
| `App.jsx` | Wires it all into a route-state app with sample data. |
| `index.html` | Entry point — loads React 18, Babel, lucide, and all component files. |

## How to use a single component elsewhere

Each component writes itself to `window`, so you can pull just what you need:

```html
<link rel="stylesheet" href="../../colors_and_type.css">
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<script type="text/babel" src="Button.jsx"></script>
<script type="text/babel">
  // Button is now on window.
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<Button variant="primary">Cocinar</Button>);
</script>
```

## Click-through path the demo supports

`LoginScreen` → `HomeScreen` → tap **Ver receta** → `DetalleRecetaScreen` → tap **Cocinar ahora** → `CocinarScreen` (mark steps, start timers).
Tap any bottom-nav tab to jump between `Inicio`, `Biblioteca` (search + filter recipes → open detail), `Compras` (toggle ya-tengo), `Historial` (empty).
