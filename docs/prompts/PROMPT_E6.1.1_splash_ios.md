# PROMPT E6.1.1 — Activar las splash screens de iOS

> **Tipo:** feature chica — `<link>` en `index.html` + diagnóstico de 2 assets.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Ancla:** E6.1 (PWA instalable). **MAPEO vigente:** v1.6.8.

## Contexto

E6.1 dejó la PWA instalable, pero las splash screens de iOS quedaron fuera de scope.
El reporte de E6.1 lo anotó: hay archivos de splash en `public/splash/` ya commiteados,
sin enganchar en `index.html`. E6.1.1 los activa.

En iOS, la splash screen (la pantalla que se ve mientras la PWA carga) **no** se toma
del manifest. Se declara con etiquetas `<link rel="apple-touch-startup-image">` en el
`<head>` del `index.html`, **una por cada resolución de pantalla de iPhone**, cada una
con un `media` query que indica a qué dispositivo corresponde. Sin esto, la PWA en
iPhone muestra una pantalla en blanco al abrir.

## Qué hay en `public/splash/` — 11 archivos, 9 son splash

JP confirmó por captura los 11 archivos de `public/splash/`:

**9 splash de iPhone (estos SÍ se enganchan):**
- `splash-iphone-8-7-se.png`
- `splash-iphone-8plus-7plus.png`
- `splash-iphone-14.png`
- `splash-iphone-14-plus.png`
- `splash-iphone-15-pro.png`
- `splash-iphone-15-pro-max.png`
- `splash-iphone-xr-11.png`
- `splash-iphone-xs-max-11promax.png`
- `splash-iphone-x-xs-11pro.png`

**2 archivos "square" (estos NO son splash — diagnosticar, no enganchar):**
- `splash-square-1024.png`
- `splash-square-2048.png`

Una splash de iPhone es siempre **vertical**, del tamaño exacto de la pantalla. Un PNG
**cuadrado** no es una splash. Estos dos no van en las etiquetas
`apple-touch-startup-image`.

## Diagnóstico requerido ANTES de codear

Reportá cada punto con evidencia **literal**. No escribas "✅".

### D1 — Confirmar los archivos y sus dimensiones reales

Listá `public/splash/` y, para cada uno de los 9 `splash-iphone-*`, reportá sus
**dimensiones reales en píxeles** (ancho × alto). Esto es necesario para construir el
`media` query correcto de cada uno — no alcanza con el nombre, hay que confirmar el
tamaño real del PNG. Reportá también las dimensiones de los 2 `splash-square-*`.

### D2 — El `<head>` actual de `index.html`

Pegá el `<head>` completo de `index.html` tal como quedó tras E6.1 (con los íconos y el
manifest ya enganchados). Acá es donde se agregan los nuevos `<link>` de splash.

### D3 — Qué son los 2 archivos "square"

Con las dimensiones de D1 a la vista, diagnosticá qué son `splash-square-1024.png` y
`splash-square-2048.png`. Posibilidades: íconos extra de alta resolución, assets que la
herramienta de diseño generó de más, otra cosa. **No los toques** — solo reportá tu
mejor hipótesis de qué son y si algo del proyecto los referencia (buscá esos nombres en
`src/`, `public/manifest.json`, `index.html`). JP decide después qué hacer con ellos.

## Cambios de código

### C1 — Las 9 etiquetas `apple-touch-startup-image`

En el `<head>` de `index.html`, agregar 9 `<link rel="apple-touch-startup-image">`, una
por cada `splash-iphone-*.png`, cada una con su atributo `media` correcto.

El `media` query de cada splash combina: `device-width`, `device-height` (en puntos CSS,
no en píxeles) y `-webkit-device-pixel-ratio`. Code construye cada query a partir de las
dimensiones reales del PNG (D1) y del modelo de iPhone que el nombre indica. La
correspondencia nombre → modelos:

| Archivo | Modelos de iPhone que cubre |
|---|---|
| `splash-iphone-8-7-se.png` | 8, 7, 6s, SE 2/3 |
| `splash-iphone-8plus-7plus.png` | 8 Plus, 7 Plus |
| `splash-iphone-x-xs-11pro.png` | X, XS, 11 Pro |
| `splash-iphone-xr-11.png` | XR, 11 |
| `splash-iphone-xs-max-11promax.png` | XS Max, 11 Pro Max |
| `splash-iphone-14.png` | 12, 13, 14 (y 12/13 Pro) |
| `splash-iphone-14-plus.png` | 14 Plus, 12/13 Pro Max |
| `splash-iphone-15-pro.png` | 14 Pro, 15, 15 Pro, 16 |
| `splash-iphone-15-pro-max.png` | 14 Pro Max, 15 Plus, 15 Pro Max |

> Code: las dimensiones en puntos y el `device-pixel-ratio` de cada modelo son datos
> técnicos conocidos de los dispositivos Apple. Construí cada `media` query con esos
> valores y verificá que coincidan con las dimensiones reales del PNG de D1 (un PNG de
> splash debe medir, en píxeles, `device-width × dpr` por `device-height × dpr`). Si
> algún PNG **no** coincide con la resolución del modelo que su nombre dice, **paralo y
> reportalo** — significa que el asset está mal generado, y enganchar un `media` query
> incorrecto haría que iOS no muestre la splash. No "ajustes" el query para que cierre:
> reportá el desajuste.

Las rutas en el `href` apuntan a `/splash/...` (los archivos están en `public/splash/`,
Vite los sirve desde `/splash/`).

### C2 — Modelos no cubiertos

Si algún modelo de iPhone reciente (ej. iPhone 16 Pro / Pro Max, u otros) no tiene una
splash que le corresponda entre las 9, **no inventes una**. Reportá en el cierre qué
modelos quedan sin splash propia — esos caen al `background_color` del manifest
(`#fdfaf6`) como pantalla de carga, que es un fallback aceptable. Es información para
JP, no un bloqueante.

## Fuera de scope (no hacer)

- **No** tocar los 2 archivos `splash-square-*` — solo diagnosticarlos (D3).
- **No** generar splash screens nuevas para modelos no cubiertos.
- **No** tocar el manifest, el service worker, los íconos, ni nada de E6.1.
- **No** tocar lógica de la app ni datos.

## Criterios de aceptación — verificación literal obligatoria

1. **Compila.** `npm run build` sin errores. (Lint: `index.html` no lo cubre ESLint,
   pero corré `npm run lint` igual y confirmá la línea base de 20.)
2. **Las 9 etiquetas.** Pegá el bloque final de los 9 `<link
   rel="apple-touch-startup-image">` del `index.html`, con sus `media` queries.
3. **Coincidencia PNG ↔ query.** Confirmá, para cada una de las 9, que las dimensiones
   reales del PNG (D1) coinciden con la resolución del modelo de su `media` query. Si
   alguna no coincide, está reportada como problema (no enganchada en silencio).
4. **Verificación REAL en iPhone (JP)** — tras `firebase deploy`, JP completa:
   - Abrir la PWA ya instalada en un iPhone → al abrir, aparece la **splash marrón**
     (`#8a4a2f`) con el logo, no una pantalla en blanco.
   - (Si JP tiene acceso a más de un modelo de iPhone, probar en cada uno.)
5. **Diagnóstico de los square.** D3 está respondido en el reporte.
6. **Nada de E6.1 se rompió.** La PWA sigue instalable y abriendo offline igual que
   antes.

## Cierre del reporte de Code

- La tabla de D1 (los 11 archivos con sus dimensiones reales).
- Resultado de D3 — qué son los 2 `splash-square-*` y si algo los referencia.
- Modelos de iPhone que quedan sin splash propia (C2), si los hay.
- Confirmación de que cada PNG coincide con su `media` query (o el desajuste, si lo
  hubo).

## Commit

```
Stage E6.1.1: activar splash screens de iOS en index.html
```

Si se actualiza el MAPEO documentando la splash: `Docs: MAPEO v1.6.9`.

## Próximo paso (no ejecutar ahora)

Con E6.1.1, la PWA queda completa en iOS (instalable + splash). Decisión pendiente
sobre los 2 `splash-square-*` según D3. Y sigue de la Etapa 6: **E6.2 — push
notifications** (con la decisión Blaze vs. alternativa gratis sin resolver). Más la
pasada de diseño (auditoría de tokens + mockups) que JP decidió hacer — su paso 1 es un
prompt de auditoría para Code.
