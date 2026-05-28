# PROMPT E7.7 — Distribución y onboarding: Open Graph + botón Instalar (Android)

> Pegar este prompt en Claude Code abierto en el repo `Comidas-Familiares`. Dos features de distribución independientes: (A) preview con logo al compartir el link, (B) botón "Instalar app" en el login para Android. Bajo riesgo, sin tocar el modelo de datos.

---

## Contexto del stack

React 19 + Vite + TypeScript + Firestore + react-router-dom v7. PWA vía `vite-plugin-pwa` con `registerType: 'autoUpdate'` (el SW se registra y actualiza solo). Manifest manual en `public/manifest.json`. Logomark `PlatoMark` (plato con vapor, color primario `#8a4a2f`, fondo `#fdfaf6`). Iconos PWA ya generados en `public/icons/` (incluye `icon-512.png` y `apple-touch-icon.png`).

La app vive en `https://comida-familiar.web.app`. Login con Google (`LoginScreen.tsx`), acceso restringido a la familia.

**Submodule `Migracion/` es código muerto — no tocar.**

---

## Parte A — Open Graph para compartir el link (§10.5)

**Problema:** `index.html` no tiene metas `og:*` ni `twitter:*`. Cuando alguien pega `https://comida-familiar.web.app` en WhatsApp / Telegram / iMessage, el preview sale sin logo ni descripción — solo la URL pelada.

**Objetivo:** que el preview muestre logo + nombre + descripción.

### A.1 Generar el asset de preview

Open Graph pide una imagen de **1200×630 px** (ratio ~1.91:1). Generarla a partir del branding existente. Dos caminos, elegir el más simple que funcione en este entorno:

**Camino preferido — SVG → PNG:** crear un SVG 1200×630 con:
- Fondo `#fdfaf6` (el `background_color` del manifest).
- El `PlatoMark` centrado-izquierda, en `#8a4a2f`, grande (~280px).
- A la derecha o debajo: "Comida Familiar" en Inter Bold ~72px color `#8a4a2f`, y debajo "Planificación semanal de comidas para la familia" en ~36px color un gris cálido (`#6b5d52` o similar).

Renderizar a PNG. Si hay alguna herramienta de rasterizado disponible (sharp, resvg, o similar vía npm), usarla. Si no, generar el PNG directamente con `canvas` de Node o con un script puntual. Guardar como:

```
public/og-image.png      (1200×630)
```

Si rasterizar resulta complicado en el entorno, **alternativa aceptable**: reusar `public/icons/icon-512.png` centrado sobre un lienzo 1200×630 con fondo `#fdfaf6`. Menos lindo (el logo cuadrado con padding lateral) pero funcional. Documentar cuál de los dos caminos se tomó.

**No** dejar el `og:image` apuntando a un archivo que no exista — eso es peor que no tener OG (algunos clientes muestran un roto).

### A.2 Agregar las metas a `index.html`

En el `<head>` de `index.html`, después del bloque de PWA (línea ~20, después de `apple-mobile-web-app-title`) y antes del bloque de splash screens, agregar:

```html
    <!-- SEO + descripción -->
    <meta name="description" content="Planificación semanal de comidas para la familia Cofano." />

    <!-- Open Graph (WhatsApp, Telegram, Facebook) -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Comida Familiar" />
    <meta property="og:title" content="Comida Familiar" />
    <meta property="og:description" content="Planificación semanal de comidas para la familia." />
    <meta property="og:url" content="https://comida-familiar.web.app/" />
    <meta property="og:image" content="https://comida-familiar.web.app/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="es_AR" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Comida Familiar" />
    <meta name="twitter:description" content="Planificación semanal de comidas para la familia." />
    <meta name="twitter:image" content="https://comida-familiar.web.app/og-image.png" />
```

**Notas importantes:**
- `og:image` y `twitter:image` deben ser **URL absolutas** (con `https://comida-familiar.web.app/`), no rutas relativas. WhatsApp y compañía no resuelven rutas relativas.
- El dominio en `og:url` y en las imágenes debe ser el de producción. Si el dominio definitivo cambia, actualizar acá.
- `og:image` debe estar precacheada por el SW: como está en `public/` y el glob de workbox incluye `png`, el build la toma. Verificar que no exceda límites de tamaño del SW (un PNG de ~100-200KB está bien).

### A.3 Verificar

- [ ] `public/og-image.png` existe, es 1200×630, pesa razonable (<300KB).
- [ ] `npm run build` incluye `og-image.png` en `dist/`.
- [ ] Las metas están en el `<head>` con URLs absolutas.
- [ ] (Post-deploy, manual) Pegar `https://comida-familiar.web.app` en un chat de WhatsApp y confirmar que aparece el preview con logo. También se puede validar con el Facebook Sharing Debugger o `https://www.opengraph.xyz/` apuntando a la URL.

---

## Parte B — Botón "Instalar app" en el login, para Android (§10.6)

**Problema:** no hay control de instalación en la app. En Android/Chrome el navegador a veces muestra su propio mini-prompt, pero JP quiere un botón explícito que el usuario pueda tocar.

**Cómo funciona en la plataforma:** Chrome/Edge en Android (y desktop) disparan el evento `beforeinstallprompt` cuando la PWA es instalable. Hay que:
1. Capturar el evento y `preventDefault()` (para que no aparezca el mini-infobar nativo).
2. Guardar el evento.
3. Mostrar un botón propio; al click, llamar `evento.prompt()`.
4. Ocultar el botón una vez instalada o si el navegador no soporta el evento.

**iOS queda fuera:** Safari **no** dispara `beforeinstallprompt`. En iOS la instalación es manual ("Compartir → Agregar a pantalla de inicio"), ya cubierta por el splash de E6.1.1. El botón simplemente no se mostrará en iOS porque el evento nunca llega — comportamiento correcto, no hay que hacer nada especial salvo no romper.

### B.1 Hook `useInstallPrompt`

Crear `src/lib/useInstallPrompt.ts`:

```ts
import { useEffect, useState, useCallback } from "react";

// El evento beforeinstallprompt no está tipado en el DOM lib estándar.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null); // el evento es de un solo uso
  }, [deferred]);

  // Detectar si ya corre como app instalada (display-mode standalone).
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari expone navigator.standalone
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  // Mostrar el botón solo si: hay evento disponible, no está instalada, no corre standalone.
  const canInstall = !!deferred && !installed && !isStandalone;

  return { canInstall, promptInstall };
}
```

### B.2 Usar el hook en `LoginScreen`

En `src/auth/LoginScreen.tsx`, importar el hook y agregar el botón debajo del botón "Entrar con Google":

```tsx
import { useInstallPrompt } from "../lib/useInstallPrompt";
```

Dentro del componente:

```tsx
const { canInstall, promptInstall } = useInstallPrompt();
```

En el JSX, después del `<button>` de "Entrar con Google" y del bloque de error, agregar:

```tsx
{canInstall && (
  <button
    type="button"
    className="btn btn-secondary"
    onClick={promptInstall}
    style={{ marginTop: "var(--space-3)", width: "100%" }}
  >
    Instalar app
  </button>
)}
```

**Notas:**
- El botón solo aparece cuando `canInstall` es `true` — o sea, en Android/Chrome/Edge cuando la PWA es instalable y todavía no se instaló. En iOS y en la app ya instalada, no aparece. Esto es correcto y deseado.
- Usar `btn-secondary` para que sea claramente secundario respecto a "Entrar con Google" (la acción primaria).
- No agregar texto explicativo largo. Si querés un hint chico, un `<p className="meta">` debajo con "Agregala a tu pantalla de inicio" — pero es opcional, el botón se explica solo.

### B.3 Verificar

- [ ] `npm run build` sin errores TS (el tipado custom de `BeforeInstallPromptEvent` compila).
- [ ] En Chrome desktop con DevTools: Application → Manifest → "Installability" sin errores. Recargar el login; si la app es instalable y no está instalada, el botón "Instalar app" aparece. Al tocarlo, sale el diálogo nativo de instalación.
- [ ] En la app ya instalada (abierta como standalone): el botón NO aparece.
- [ ] En un navegador que no soporta `beforeinstallprompt` (Firefox, Safari): el botón NO aparece, el login funciona normal.
- [ ] (Manual en Android real, post-deploy) abrir la URL en Chrome Android → el botón "Instalar app" aparece → tocar → se instala → ícono en el cajón de apps.

---

## Orden sugerido

A y B son independientes; se pueden hacer en cualquier orden o en commits separados. Sugerido: A primero (es más rápido), B después.

---

## Fuera de scope

- No tocar `vite.config.ts` ni la config de `vite-plugin-pwa` — el SW ya se registra solo, el `beforeinstallprompt` se captura desde `window` sin tocar el plugin.
- No tocar el manifest salvo que falte algún campo que bloquee la instalabilidad (si DevTools → Manifest reporta un error de installability, reportarlo pero no arreglar sin confirmar — el manifest ya pasó instalación en E6.1).
- No agregar push notifications (eso es E6.2, postergado).
- No modificar el flujo de auth.

---

## Cierre del reporte de Code

- Lista de archivos creados/modificados.
- Confirmar qué camino se tomó para `og-image.png` (SVG rasterizado vs icon-512 sobre lienzo).
- Screenshot del login en Chrome desktop mostrando el botón "Instalar app" (con DevTools forzando installability si hace falta).
- Recordatorio para JP: la validación real del preview de WhatsApp y de la instalación en Android es **post-deploy** — hay que `firebase deploy` y probar con el dominio de producción, porque OG e instalabilidad no funcionan desde `localhost`.

## Commits

```
Stage E7.7-A: Open Graph + Twitter Card para compartir el link
```
```
Stage E7.7-B: botón Instalar app (Android) en el login
```
```
Docs: MAPEO — E7.7 cerrado (§10.5 y §10.6)
```

## Actualización del MAPEO al cerrar

Cuando A y B estén hechos y deployados, marcar en `docs/MAPEO_FIRESTORE.md`:
- §10.5 y §10.6 → cerrados.
- §7.7 → E7.7 pasa de ⏳ PENDIENTE a ✅ CERRADO.
- Header → con E7.7 cerrado, el ciclo queda completo; ajustar la nota de versión (bump a v1.8.1 o v1.9.0 según criterio).
