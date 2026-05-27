# Comida Familiar — Design System v2

Carpeta de handoff para implementación. Drop en `/design-system/` del repo `Comidas-Familiares`.

## Qué hay acá

```
design-system/
├── README.md                         ← este archivo
├── IMPLEMENTATION-v2.md              ← prompt para Claude Code, copy-paste
├── tokens/
│   ├── colors_and_type.css           → src/styles/tokens.css
│   └── colors_and_type-dark.css      → src/styles/tokens-dark.css
├── assets/
│   ├── favicon.svg                   → public/favicon.svg
│   └── pwa/                          → public/icons/ + public/manifest.json
│       ├── manifest.json
│       ├── favicon-{16,32,48}.png
│       ├── apple-touch-icon.png
│       ├── icon-{192,512}.png
│       ├── icon-maskable-{192,512}.png
│       └── splash/                   (11 PNGs)
├── prototypes/                       ← refs interactivas (no se copian al repo)
│   ├── lista-compras/                · 3 variantes — elegida: Variant C
│   ├── cocinar/                      · flow guiada + scroll compartiendo chrome
│   ├── home/                         · week strip + semana badge
│   ├── detalle-receta/               · hero + meta + ingredientes por góndola + acciones plegables
│   ├── historial/                    · summary + filtros + cards rich + agrupado por mes
│   └── _shared/                      · ios-frame + design-canvas (starters)
└── handoff/
    └── AUDIT.md                      ← auditoría del repo actual (P0/P1/P2)
```

## Cómo usar

1. **Drop en el repo.** Copiá la carpeta entera a `/design-system/` del repo.
2. **Implementación.** Abrí `IMPLEMENTATION-v2.md` y pegale el contenido a Claude Code en una sesión abierta en el repo. Hace todo el trabajo.
3. **QA.** Abrí los prototipos en `prototypes/<screen>/index.html` para comparar el resultado contra la referencia visual.

## Estado del repo @ 4267df1 (último pull)

✅ **Hecho:** Bloque 0 brand install (PlatoMark + LoginScreen + Header chip + PWA + tokens limpios). Componentes v2 extraídos del Home (WeekStrip, PlanCard, MemberAvatar, CompraProgress).

🚧 **Pendiente:** 4 micro-fixes (`lang="es-AR"`, peso 600 de Inter, comentario stale, dup `public/splash/`). Y las pantallas grandes: Compras v2, Cocinar refactor, Home WeekStrip tweaks, Detalle de receta rewrite, Historial rewrite. Todo está en `IMPLEMENTATION-v2.md`.

## Decisiones cerradas en esta sesión

- **Lista de compras** → variante C (recetas envueltas con chips). Por receta = default, por góndola = vista alterna. **Dentro de cada receta**, ingredientes agrupados por góndola en orden canónico (Verdulería → Carnicería → Lácteos → Almacén → Panadería).
- **Cocinar** → modos Guiada y Ver todos comparten chrome (header sticky con bars + bottom sticky con botón Siguiente preview-título). Timer en vivo embebido (countdown mm:ss, pausar/reanudar, vibrate + Notification al terminar). Bloques Clave (verde) / Riesgo (amarillo) / Notas (italic muted) reciben datos del paso.
- **Home** → "SEMANA / 26 may – 1 jun" arriba a la derecha (sin número de semana). Icono de plato en lugar de dot en días con comida. Título "3 comidas planeadas" en una sola línea.
- **Detalle de receta** → hero photo placeholder + 3 meta cards (Total / Porciones / Dificultad) + tags row + ingredientes agrupados por góndola (consistente con Lista de Compras) + pasos preview (3 + expand) + tip + acciones JP plegables (collapse, no 3 botones gigantes apilados) + sticky bottom Cocinar.
- **Historial** → 3 summary cards (Total / Promedio + stars / Top) + búsqueda + filtros chips (Todos / ★ Top / Para repetir / No repetir) + cards con fecha rich, mini-stars del promedio, badge de resultado, nota inline como blockquote, agrupado por mes con headers sticky.
- **Tokens** → `colors_and_type.css` v1.0 (cocina cálida, primary #8a4a2f, accent #74324a). Dark mode "cocina apagada" disponible para `prefers-color-scheme: dark`.

## Pendientes pre-v2 (de auditoría anterior)

Ver `handoff/AUDIT.md`. **La mayor parte ya está aplicada en `4267df1`.** Lo que queda son micro-fixes que cubre el primer bloque de `IMPLEMENTATION-v2.md`.
