# PROMPT E6.1 — PWA instalable (manifest + íconos + service worker)

> **Tipo:** feature de infraestructura — PWA. No toca lógica de la app ni datos.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Ancla:** §7.6 del MAPEO (Etapa 6 — PWA pulida). **MAPEO vigente:** v1.6.7.

## Contexto y alcance

La app ya funciona y ya tiene **persistencia de datos offline**: el SDK de Firestore
tiene `enableIndexedDbPersistence` desde la Etapa 1 (MAPEO §1.2.ter, §6.4). Leer
recetas y tildar la lista de compras sin señal **ya anda**. E6.1 **no** toca eso.

Lo que E6.1 agrega es la **cáscara PWA**:
- Que la app sea **instalable** (ícono en la pantalla de inicio del celular, modo
  standalone sin barra de navegador).
- Un **service worker** que cachea el *shell* (HTML/JS/CSS/íconos) para que la app
  abra aunque no haya red — hoy, sin SW, si no hay conexión la app ni carga.

Los assets de marca (íconos + manifest) **ya están hechos** — JP los generó y se
entregan junto a este prompt en una carpeta `assets/pwa/` (8 PNG + `manifest.json` +
`README.md`). El color de marca oficial es **`#8a4a2f`** (marrón cálido); el
`background_color` del manifest es `#fdfaf6`.

> Nota: el MAPEO §8 menciona un color `#74324a` para la splash screen — ese dato quedó
> **desactualizado**. El color de marca vigente es `#8a4a2f`. Corregirlo en el MAPEO
> (C5).

## Qué NO entra en E6.1

- **E6.2 — push notifications** (Firebase Cloud Messaging). Es el otro prompt de la
  Etapa 6, con una decisión pendiente (plan Blaze vs. alternativa). No abordarlo.
- **Splash screen de iOS** — los assets entregados no la incluyen. Si JP la genera más
  adelante, se agrega aparte. No inventarla.
- **Estrategia de cacheo de datos / Firestore** — ya cubierta por el SDK. El SW cachea
  solo el shell estático, no las respuestas de Firestore.
- **Consolidación de tokens CSS** — tarea de diseño separada, no es parte de E6.1.

## Diagnóstico requerido ANTES de codear

Reportá cada punto con evidencia **literal** (código pegado con ruta+línea). No
escribas "✅"; pegá lo que respalda cada afirmación.

### D1 — Los assets entregados

Confirmá que recibiste la carpeta `assets/pwa/` con: `favicon-16.png`, `favicon-32.png`,
`favicon-48.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`,
`icon-maskable-192.png`, `icon-maskable-512.png`, `manifest.json`, `README.md`. Pegá
el `manifest.json` entregado tal cual. Si falta algún archivo, reportalo antes de
seguir.

### D2 — El `index.html` actual

Pegá el `<head>` completo de `index.html` (raíz del proyecto). Reportá: ¿qué favicon
referencia hoy (el `favicon.svg` de Vite, probablemente)? ¿hay ya algún `<link
rel="manifest">` o `<meta name="theme-color">`?

### D3 — Estructura de `public/` y build de Vite

¿Existe la carpeta `public/` en el proyecto? Pegá su contenido actual. Confirmá la
versión de Vite (`package.json`) — la estrategia de service worker depende de eso.

### D4 — ¿Hay algo de PWA o service worker ya?

Buscá en el proyecto cualquier rastro previo de PWA: un `manifest.json` viejo, un
`sw.js` / `service-worker.js`, un `serviceWorker.register(...)`, el plugin
`vite-plugin-pwa` en `package.json` o `vite.config.ts`. Reportá lo que haya. Si no hay
nada, decilo — se parte de cero.

### D5 — Punto de entrada de la app

Pegá `src/main.tsx` (o el punto de entrada). El registro del service worker se engancha
ahí o cerca.

## Decisión de implementación — service worker

Antes de codear, Code decide **una** de estas dos vías y la justifica en el reporte:

- **Vía A — `vite-plugin-pwa`**: plugin oficial de la comunidad para Vite. Genera el
  service worker, maneja el precache del shell y las actualizaciones. Es la opción
  estándar y la menos propensa a errores. Recomendada salvo que D3/D4 muestren un
  impedimento.
- **Vía B — service worker a mano**: un `sw.js` propio en `public/`, registrado desde
  `main.tsx`, con un precache explícito del shell. Más control, más código, más
  superficie de error.

Code elige según lo que D3/D4 revelen (versión de Vite, si ya hay algo). Reporta cuál
y por qué. El resto del prompt aplica a cualquiera de las dos.

## Cambios de código

### C1 — Colocar los assets

- Copiar los 8 PNG de `assets/pwa/` a `public/icons/` (crear la carpeta).
- Colocar `manifest.json` en `public/manifest.json`. El manifest entregado ya asume
  rutas `/icons/...` — coherente con `public/icons/`. No cambiar las rutas del
  manifest.
- El `favicon.svg` de Vite en `public/` puede borrarse o quedar — decidí y documentá.

### C2 — `index.html`

En el `<head>`, reemplazar el favicon de Vite por los links a los íconos nuevos +
manifest + theme-color. El `README.md` de `assets/pwa/` trae el bloque exacto a usar:
links de favicon 16/32, `apple-touch-icon`, `<link rel="manifest">`,
`<meta name="theme-color" content="#8a4a2f">`. Agregar también los meta de iOS
standalone (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`)
que el README sugiere.

### C3 — Service worker — registro y precache del shell

Según la vía elegida:
- **Vía A:** instalar y configurar `vite-plugin-pwa` en `vite.config.ts`. Apuntarlo al
  `manifest.json` ya existente de `public/` (o a la config equivalente — sin duplicar
  el manifest; una sola fuente). Estrategia de precache: el **app shell** (el HTML, el
  bundle JS/CSS, los íconos). **No** cachear llamadas a Firestore / Firebase Auth — esas
  van por la red y el SDK ya maneja su offline.
- **Vía B:** crear `public/sw.js` con un `install` que precachee el shell y un `fetch`
  que sirva del cache con fallback a red para el shell. Registrarlo desde `main.tsx`.

En ambos casos: el service worker **solo** intercepta y cachea assets estáticos del
shell. Las peticiones a `firestore.googleapis.com` / `firebase` pasan directo a la red
(o las maneja el SDK) — el SW no se mete.

### C4 — Manejo de actualizaciones

Cuando se despliega una versión nueva, el usuario con la PWA instalada tiene que poder
recibirla. Como mínimo: que la app no quede "congelada" en una versión vieja para
siempre. Si la vía A (`vite-plugin-pwa`) ofrece un mecanismo de update simple
(`autoUpdate` o un prompt "hay una versión nueva, recargá"), usarlo. Documentá qué
estrategia de actualización quedó. No hace falta una UI elaborada — alcanza con que las
actualizaciones lleguen.

### C5 — MAPEO

En `MAPEO_FIRESTORE.md`: documentar la PWA (manifest, service worker, estrategia de
cacheo del shell, que el offline de datos sigue siendo del SDK). **Corregir** la
mención de `#74324a` en §8 → el color de marca vigente es **`#8a4a2f`**. Header a
**v1.6.8**.

## Fuera de scope (no hacer)

- **No** tocar la persistencia offline del SDK de Firestore — ya funciona, no se
  duplica ni se reemplaza.
- **No** hacer que el SW cachee respuestas de Firestore.
- **No** abordar push notifications (E6.2).
- **No** inventar una splash screen de iOS (los assets no la traen).
- **No** tocar lógica de la app, rutas, ni datos.

## Criterios de aceptación — verificación literal obligatoria

1. **Compila y linta.** Salida literal de `npm run build` y `npm run lint` — sin
   errores nuevos sobre la línea base (20 pre-existentes).
2. **Build genera el SW.** Tras `npm run build`, confirmá que el `dist/` contiene el
   service worker y el manifest. Pegá el listado relevante de `dist/`.
3. **Decisión de vía.** Reportá si se usó vía A o B y por qué.
4. **Verificación REAL en producción** (tras `firebase deploy`) — JP completa el
   checklist en https://comida-familiar.web.app:
   - **Instalable:** abrir la app en Chrome (desktop o Android) → el navegador ofrece
     "Instalar app" / aparece el ícono de instalación. Instalarla → abre en modo
     standalone (sin barra de URL), con el ícono marrón en la pantalla de inicio.
   - **iOS:** abrir en Safari (iPhone) → "Agregar a pantalla de inicio" → el ícono es
     el `apple-touch-icon`, no un screenshot genérico.
   - **Offline de shell:** con la app ya cargada una vez, activar modo avión y
     recargar → la app **abre igual** (muestra su shell), no la pantalla de error del
     navegador. (Que los datos se vean depende del cache del SDK — eso ya andaba.)
   - **theme-color:** en Android, la barra de estado toma el color marrón `#8a4a2f`.
5. **Actualizaciones.** JP confirma el mecanismo de C4 — tras un deploy nuevo, la app
   instalada termina tomando la versión nueva (recargando, o con el prompt de update).
6. **El offline de datos sigue intacto.** Confirmar que tildar un ítem de compras sin
   red sigue funcionando como antes (no se rompió la persistencia del SDK).
7. **MAPEO** en v1.6.8, con el color corregido a `#8a4a2f`.

## Cierre del reporte de Code

- Vía elegida (A o B) y justificación.
- Resultado del checklist de verificación (lo completa JP).
- Estrategia de actualización que quedó (C4).
- Confirmación de que no se tocó la persistencia del SDK ni lógica de la app.

## Commits

```
Stage E6.1: PWA instalable -- manifest, iconos, service worker, offline de shell
```

```
Docs: MAPEO v1.6.8 (E6.1 -- PWA + color de marca #8a4a2f)
```

## Próximo paso (no ejecutar ahora)

Con E6.1, la app es instalable y abre offline. Queda de la Etapa 6:
- **E6.2 — push notifications** (Firebase Cloud Messaging). Tiene una decisión pendiente
  de JP: usar plan **Blaze** de Firebase (pago, permite push desde servidor) o la
  alternativa cliente-a-cliente vía Firestore listener (gratis, más limitada). El
  prompt de E6.2 se arma cuando JP decida.
Otros pendientes: splash screen de iOS (si JP la genera), consolidación de tokens CSS,
limpieza de datos (`ING-0178`, `REC-15xx`), §10.2.3 ("a gusto").
