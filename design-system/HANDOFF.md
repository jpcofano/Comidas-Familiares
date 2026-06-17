# Comida Familiar — Handoff de sesión

> Resumen para retomar el diseño en otra cuenta de Claude / proyecto. Última actualización: mayo 2026.

## 🎯 Contexto del proyecto

PWA de planificación de comidas semanales para la familia Cofano (4 miembros: Juan Pablo, María, Sofía, Federico). Stack real del codebase: **React 19 + Vite 8 + Firebase**.

Este proyecto Omelette es el **design system + UI kit** para esa app — NO el código de producción. Sirve para diseñar, iterar y hacer handoff al dev.

---

## 📦 Estructura del proyecto

```
.
├── README.md                       # Content fundamentals, visual foundations
├── SKILL.md                        # Entry point para Claude Code
├── colors_and_type.css             # TODOS los tokens (paleta + tipografía + radii + shadows)
│
├── assets/
│   ├── favicon.svg                 # ChefHat actual (a reemplazar)
│   ├── app-mark.svg                # Idem (96×96)
│   ├── chef-hat.svg
│   └── pwa/                        # 8 PNG (favicons + apple-touch + maskable)
│       ├── manifest.json           # PWA manifest listo
│       ├── README.md               # Snippet <link> para pegar en index.html
│       ├── favicon-16.png, -32.png, -48.png
│       ├── apple-touch-icon.png
│       ├── icon-192.png, -512.png
│       ├── icon-maskable-192.png, -512.png
│       └── splash/                 # 9 splash screens iOS
│
├── preview/                        # 22 cards de specimens visuales (design system)
│   ├── colors-brand.html, colors-neutrals.html, colors-semantic.html
│   ├── type-headings.html, type-body.html, type-weights.html
│   ├── spacing.html, radii.html, shadows.html, surfaces.html
│   ├── buttons.html, badges.html, tabs-form.html
│   ├── header.html, bottom-nav.html
│   ├── plan-card.html, recipe-card.html, paso-card.html, shopping-row.html
│   ├── iconography.html, voice.html, brand-mark.html
│   ├── logomark-exploration.html      # 6 direcciones de logomark
│   └── logomark-03-variations.html    # 6 variaciones de la dir "Mesa familiar"
│
├── ui_kits/mobile-app/             # UI Kit interactivo (v2)
│   ├── index.html                  # ← Entry point. Pone el shell en 390×720 device frame
│   ├── index-v1.html               # v1 archivada (no tocar)
│   ├── App.jsx                     # Shell + sample data + routing + Tweaks
│   ├── tweaks-panel.jsx            # Panel de tweaks
│   ├── Icon.jsx                    # SVG inline (lucide subset)
│   │
│   │  ── Primitivos ──
│   ├── Button.jsx
│   ├── EstadoBadge.jsx
│   ├── MemberAvatar.jsx            # Iniciales + paleta por miembro
│   ├── WeekStrip.jsx               # Tira L-M-M-J-V-S-D
│   ├── SelectorPuntaje.jsx         # Grid 1-10 (5+5)
│   │
│   │  ── Chrome ──
│   ├── Header.jsx                  # ChefHat + título + avatar
│   ├── BottomNav.jsx               # 4 tabs (JP / Member)
│   │
│   │  ── Screens ──
│   ├── LoginScreen.jsx
│   ├── HomeScreen.jsx              # JP: semana + Especial + Extras + En proceso + progreso compras
│   ├── MemberDashboardScreen.jsx   # Members: Mi semana + Pendientes + Mi historial
│   ├── BibliotecaScreen.jsx
│   ├── ComprasScreen.jsx           # Agrupado por sección
│   ├── DetalleRecetaScreen.jsx
│   ├── CocinarScreen.jsx
│   ├── VotoScreen.jsx              # Cocinada → votar + VistaEvaluada (read-only)
│   ├── HistorialScreen.jsx         # Lista con buscador + ResultadoBadge
│   ├── HistorialDetalleScreen.jsx
│   └── ImportarMenuScreen.jsx      # JP-only: pegar TXT
│
├── _review/                        # Screenshots de referencia
└── design_handoff_mobile_app_v2/   # Bundle para dev (README con plan de 5 pasos)
```

---

## 🎨 Sistema de diseño (resumen rápido)

### Paleta "Cocina cálida"

| Token              | Valor      | Uso                                 |
|--------------------|------------|-------------------------------------|
| `--primary`        | `#8a4a2f`  | Marrón canela, brand                |
| `--primary-soft`   | `#f2e7df`  | Backgrounds suaves del primary      |
| `--bg`             | `#fdfaf6`  | Crema (background general)          |
| `--surface`        | `#faf6f0`  | Cards livianas                      |
| `--surface-strong` | `#ffffff`  | Cards principales                   |
| `--surface-alt`    | `#f0e9e0`  | Fondos alternativos                 |
| `--text-strong`    | `#1f1a16`  | Headings                            |
| `--text`           | `#332924`  | Body                                |
| `--muted`          | `#7a6c62`  | Secundario                          |
| `--border`         | `#e8dccf`  | Bordes                              |
| `--ok-*`, `--warn-*`, `--err-*`, `--info-*` | — | Estados |

Tokens completos en `colors_and_type.css`.

### Tipografía
- **Sans:** Inter (cargado por defecto en HTMLs del UI kit)
- **Mono:** ui-monospace (para campos de import TXT)
- Escala: 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32 px

### Espaciado
- Base: **4px** (4, 8, 12, 16, 20, 24, 32…)

### Radii
- `8` botones · `10–12` inputs · `14` cards · `18` cards grandes · `9999` pills · `22` app icons

---

## 🖼️ UI Kit — qué hace `index.html`

Abrí `ui_kits/mobile-app/index.html`. Es un device frame de 390×720 con la app montada adentro. Es 100% interactivo.

### Switch de rol (Tweaks)
En el panel de Tweaks (toggle en la barra) podés cambiar el rol:
- **JP** → vista de administrador (HomeScreen con planes editables, Biblioteca, Compras, Historial, **Importar menú**)
- **M / S / F** → vista de miembro (MemberDashboard, Compras, **Pendientes**, Historial)

Cambia el BottomNav, el saludo, y los permisos (Importar es solo JP).

### Estados de plan disponibles en sample data

| ID  | Plato                       | Estado            | Notas                       |
|-----|-----------------------------|-------------------|-----------------------------|
| p1  | Bondiola al Malbec          | Compra pendiente  | Hero "Especial · Martes"    |
| p2  | Langostinos al ajillo       | Compra lista      |                             |
| p3  | Berenjenas grilladas        | Cocinando         |                             |
| p4  | Pollo al limón              | Cocinada          | 0 votos (todos pendientes)  |
| p5  | Risotto de hongos           | Cocinada          | Sofía ya votó (8)           |
| p6  | Tarta de manzana            | **Evaluada**      | Cerrada — abre VistaEvaluada |

Botones de salto rápido en el panel de Tweaks navegan a cada estado.

### Historial: 6 entradas que cubren los 5 ResultadoBadges
Excelente · Muy bueno · Bueno · Regular (no hay "Malísimo" en sample, pero el badge existe).

---

## ✅ Decisiones cerradas en esta sesión

1. **Paleta de avatares de miembros confirmada:**
   - JP marrón (`--primary`)
   - M bordó
   - S azul
   - F verde
   Derivados de tokens semánticos. Ver `MemberAvatar.jsx`.

2. **Plan: solo `dia`, sin `momento`** — el badge dice "Especial · Martes", no "Martes a la noche".

3. **UI Kit extendido a v2 completo:** Login + Home + Biblioteca + Compras + Detalle + Cocinar + MemberDashboard + Pendientes + Voto + VistaEvaluada + Historial + HistorialDetalle + ImportarMenu. **Todas las solapas que estaban abiertas, cerradas.**

4. **PWA assets generados** — manifest.json + 8 PNG + 9 splash. Snippet `<link>` en `assets/pwa/README.md`.

---

## 🚧 Lo que está pendiente

### En curso: Logomark único (reemplazar lucide ChefHat)

Exploración hecha, esperando elección:

**Ronda 1** — 6 direcciones en `preview/logomark-exploration.html`:
- 01 Monograma cf · 02 Olla al fuego · **03 Mesa familiar** · 04 Abrazo+cuchara · 05 Sello plato · 06 Casa-cuchara

**Ronda 2** — 6 variaciones de "Mesa familiar" en `preview/logomark-03-variations.html`:
- A Sólido · B Mantel radial · C Pétalos íntimos · D Bowl+4 cucharas · E Mesa con borde · F Plato con vapor

**Próximo paso cuando se elija:** actualizar `assets/favicon.svg`, `assets/app-mark.svg`, los 8 PNG de `assets/pwa/`, los 9 splash, el icono del `Header.jsx`, y el `preview/brand-mark.html`.

---

## 🔁 Cómo retomar en otra cuenta

1. **Descargá el zip del proyecto** (te dejo el botón abajo).
2. En la cuenta nueva, creá un proyecto Omelette nuevo y subí el zip — todos los archivos quedan ubicados igual.
3. Mensaje inicial sugerido:

   > Hola, estoy continuando un proyecto. Adjunto el handoff completo en `HANDOFF.md` y todos los archivos del UI kit. Para arrancar:
   > - Abrí `ui_kits/mobile-app/index.html` para ver el estado actual
   > - Leé `HANDOFF.md` para entender qué está hecho y qué queda
   > - El pendiente más fresco es elegir un logomark de `preview/logomark-03-variations.html` (A-F)
   > - Una vez elegido, hay que aplicarlo a: favicon.svg, app-mark.svg, los 8 PNG de assets/pwa/, los splash screens, y el Header del UI kit

4. **NO subas la carpeta `Comidas-Familiares/`** del codebase — ese se monta aparte como local folder en la cuenta nueva si querés que Claude lea types/data shapes.

---

## 📂 Archivos críticos para entender el proyecto rápido

| Si querés ver…                  | Abrí                                          |
|---------------------------------|-----------------------------------------------|
| El estado actual de la app      | `ui_kits/mobile-app/index.html`               |
| Todos los tokens en un solo CSS | `colors_and_type.css`                         |
| Specimens del design system     | `preview/*.html`                              |
| Plan de implementación dev      | `design_handoff_mobile_app_v2/README.md`      |
| Estructura mental del proyecto  | `README.md` (raíz) + `SKILL.md`               |
| Logomark pendiente de elegir    | `preview/logomark-03-variations.html`         |
