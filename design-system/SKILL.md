---
name: comida-familiar-design
description: Use this skill to generate well-branded interfaces and assets for Comida Familiar (the Cofano family meal-planning PWA), either for production or throwaway prototypes/mocks/decks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping in the warm "cocina cálida" visual language.
user-invocable: true
---

# Comida Familiar — design skill

Read `README.md` in this skill first — it contains the brand voice, content fundamentals, visual foundations, and iconography. Then explore:

- `colors_and_type.css` — all design tokens as CSS custom properties. Drop this into any HTML file (`<link>` or `@import`) and you get the full token system.
- `assets/` — chef-hat brand mark, favicon, lucide-ChefHat glyph.
- `preview/` — small specimen cards (colors, type, spacing, components) that document each token cluster visually.
- `ui_kits/mobile-app/` — high-fidelity React + JSX recreations of the actual app screens (LoginScreen, AppShell, Home for JP, MemberDashboard, Biblioteca, Compras, DetalleReceta, Cocinar with PasoCard). Open `ui_kits/mobile-app/index.html` for an interactive demo, and lift components into new designs.

When creating visual artifacts (slides, marketing mocks, throwaway prototypes), copy the assets and tokens you need out and create static HTML files for the user to view. When working on production code (the real React + Vite + Firebase app at `github.com/jpcofano/Comidas-Familiares`), read the rules here to become an expert in designing with this brand.

If the user invokes this skill without other guidance, ask them what they want to build or design. Confirm:

- Surface (mobile app screen, marketing site, deck, social asset, etc).
- Whether to match the existing app exactly, or extend the system into new territory.
- Spanish (default) or another language.

Then act as an expert designer and produce HTML artifacts or production code, depending on the need. Default rules:

- Spanish (Argentina) copy. Sentence case. Verb-led buttons. No decorative emoji.
- Inter from Google Fonts; sizes 12 / 13 / 14 / 15 / 17 / 20 / 24 px.
- Warm brown `#8a4a2f` primary on cream `#fdfaf6` backgrounds.
- 1px borders, no shadows on cards, `radius: 10–14px`, lucide icons stroke-2.
- Reach for `ui_kits/mobile-app/` components before drawing anything new.
