# Logomark handoff — Comida Familiar

> Implementación del logomark **F · Plato con vapor** en el codebase real
> [`jpcofano/Comidas-Familiares`](https://github.com/jpcofano/Comidas-Familiares).
>
> Reemplaza el `<ChefHat>` de lucide-react que se usaba como mark provisorio en LoginScreen + Header + favicon + (faltaba) PWA assets.

---

## 0. Resumen de cambios

| Antes | Después |
|---|---|
| `<ChefHat>` de lucide-react en LoginScreen + Header | SVG inline custom (component `<PlatoMark>`) en LoginScreen + Header |
| `public/favicon.svg` = template Vite morado | `public/favicon.svg` = brown rounded-square con el mark |
| No hay `manifest.json` ni PWA install | `public/manifest.json` + 8 PNG en `public/icons/` + 11 splash en `public/icons/splash/` |
| Status bar / theme color por default | `theme-color: #8a4a2f` (warm brown brand) |

**No se toca:** la paleta, el spacing scale, los tokens en `src/styles/tokens.css`, la estructura del router. Lucide-react sigue siendo el icon set para todo el resto (`Home`, `BookOpen`, etc.).

---

## 1. Copiar archivos del design system al codebase

```
design system (este repo)             → codebase Comidas-Familiares
─────────────────────────────────────────────────────────────────────
assets/favicon.svg                    → public/favicon.svg            (overwrites)
assets/pwa/manifest.json              → public/manifest.json
assets/pwa/favicon-16.png             → public/icons/favicon-16.png
assets/pwa/favicon-32.png             → public/icons/favicon-32.png
assets/pwa/favicon-48.png             → public/icons/favicon-48.png
assets/pwa/apple-touch-icon.png       → public/icons/apple-touch-icon.png
assets/pwa/icon-192.png               → public/icons/icon-192.png
assets/pwa/icon-512.png               → public/icons/icon-512.png
assets/pwa/icon-maskable-192.png      → public/icons/icon-maskable-192.png
assets/pwa/icon-maskable-512.png      → public/icons/icon-maskable-512.png
assets/pwa/splash/*.png  (11 files)   → public/icons/splash/*.png
```

`assets/app-mark.svg` y `assets/chef-hat.svg` quedan en este sistema como **referencia visual** — el codebase no los necesita porque vamos a inline-ar el mark como componente React.

---

## 2. `index.html` — `<head>` definitivo

Reemplazá el bloque actual:

```html
<!-- ANTES (línea 5 de index.html) -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

por:

```html
<!-- Favicon + PWA -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">

<!-- Brand color para la barra de status (Chrome Android + PWA) -->
<meta name="theme-color" content="#8a4a2f">

<!-- iOS PWA: standalone + texto blanco en la status bar -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Comida Familiar">

<!-- iOS splash screens (9 dispositivos cubre del iPhone 7 al 15 Pro Max) -->
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-15-pro-max.png"
      media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-15-pro.png"
      media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-14-plus.png"
      media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-14.png"
      media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-xr-11.png"
      media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)">
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-xs-max-11promax.png"
      media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-x-xs-11pro.png"
      media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-8plus-7plus.png"
      media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-8-7-se.png"
      media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)">

<!-- Tipografía (sin cambios) -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">

<title>Comida Familiar</title>
```

Android arma la splash automáticamente desde `manifest.json` (background `#fdfaf6` + icon-512). No hace falta nada extra para Android.

---

## 3. `manifest.json` (ya incluido en `assets/pwa/manifest.json`)

Copiá ese archivo a `public/manifest.json`. No requiere cambios — apunta a `/icons/...`.

```json
{
  "name": "Comida Familiar",
  "short_name": "Comida Familiar",
  "description": "Planificación semanal de comidas para la familia Cofano.",
  "lang": "es-AR",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#fdfaf6",
  "theme_color": "#8a4a2f",
  "icons": [
    { "src": "/icons/favicon-16.png",        "sizes": "16x16",   "type": "image/png" },
    { "src": "/icons/favicon-32.png",        "sizes": "32x32",   "type": "image/png" },
    { "src": "/icons/favicon-48.png",        "sizes": "48x48",   "type": "image/png" },
    { "src": "/icons/apple-touch-icon.png",  "sizes": "180x180", "type": "image/png" },
    { "src": "/icons/icon-192.png",          "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png",          "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## 4. Componente React — crear `src/brand/PlatoMark.tsx`

El mark inline como componente. Una sola fuente de verdad para todos los lugares donde lo usemos en React (LoginScreen, Header, futuras pantallas de bienvenida, share cards, etc.).

```tsx
// src/brand/PlatoMark.tsx
//
// Comida Familiar — logomark "Plato con vapor" (F).
// Dos variantes:
//   - "vapor"  → variante hero (con vapor). Para ≥28px.
//   - "simple" → variante chrome (sin vapor, 4 placemats). Para <28px y favicon-likes.
// Color toma de currentColor; controlable con `color` prop o estilo CSS.

import type { CSSProperties } from "react";

interface PlatoMarkProps {
  size?: number;
  variant?: "vapor" | "simple";
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
  "aria-label"?: string;
}

export function PlatoMark({
  size = 24,
  variant = "vapor",
  strokeWidth = 1.6,
  color,
  style,
  className,
  "aria-label": ariaLabel,
}: PlatoMarkProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": ariaLabel ? undefined : true,
    role: ariaLabel ? "img" : undefined,
    "aria-label": ariaLabel,
    style: { display: "inline-block", verticalAlign: "middle", color, ...style },
    className,
  };

  if (variant === "vapor") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" {...common}>
        {/* Steam: 3 organic S-curves with varied amplitude + opacity */}
        <path d="M9 7 C 10.5 6, 8.5 4, 9 2.5" strokeWidth={strokeWidth * 0.72} opacity="0.55" />
        <path d="M12 6.5 C 10 5, 14 3.5, 12 1.5" strokeWidth={strokeWidth * 0.94} opacity="0.95" />
        <path d="M15 7 C 13.5 6, 15.5 4, 15 2.5" strokeWidth={strokeWidth * 0.72} opacity="0.65" />
        {/* Plate ring + food */}
        <circle cx="12" cy="13" r="5" />
        <circle cx="12" cy="13" r="2.4" fill="currentColor" stroke="none" />
        {/* 3 placemats (top open for steam) */}
        <path d="M9 22h6" />
        <path d="M22 10v6" />
        <path d="M2 10v6" />
      </svg>
    );
  }

  // simple: 4 placemats, no steam — for chrome / small sizes
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...common}>
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <path d="M9 21h6" />
      <path d="M21 9v6" />
      <path d="M3 9v6" />
      <path d="M9 3h6" />
    </svg>
  );
}
```

---

## 5. Reemplazar `<ChefHat>` en `src/auth/LoginScreen.tsx`

```tsx
// ANTES
import { ChefHat } from "lucide-react";
// ...
<div className="login-icon" aria-hidden="true">
  <ChefHat size={36} strokeWidth={1.5} />
</div>

// DESPUÉS
import { PlatoMark } from "../brand/PlatoMark";
// ...
<div className="login-icon" aria-hidden="true">
  <PlatoMark size={40} variant="vapor" strokeWidth={1.6} />
</div>
```

> El tamaño sube de 36→40 para compensar que el plato es ópticamente más chico que el chef-hat dentro del círculo de 72px. No hace falta cambiar `auth.css` — `.login-icon` ya centra cualquier hijo.

---

## 6. Reemplazar el chef-hat (si existe) en `src/layout/Header.tsx`

El Header actual del codebase NO renderiza un chef-hat — sólo título + avatar. Si en v2 (per el `design_handoff_mobile_app_v2/README.md`) querés agregar el brand mark al lado del título:

```tsx
import { PlatoMark } from "../brand/PlatoMark";

<header className="app-header" ref={headerRef}>
  <div className="header-inner">
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <span aria-hidden style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "var(--primary-soft)", color: "var(--primary)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <PlatoMark size={16} variant="simple" strokeWidth={1.6} />
      </span>
      <h1 className="header-title">Comida Familiar</h1>
    </div>
    {/* avatar button stays the same */}
  </div>
</header>
```

> Usá `variant="simple"` en chrome (chip de 28px, ícono interior 16px) — el vapor no se lee a esa escala y agrega ruido.

---

## 7. Borrar el `ChefHat` de lucide-react (opcional)

Si después del paso 5 ya nadie importa `ChefHat`, dejá de importarlo. `lucide-react` sigue siendo dep porque tenemos `Home`, `BookOpen`, `ShoppingBag`, `History`, `Clock`, `Plus`, `ChevronLeft/Right/Down`, `LogOut`, `Upload`. Esos quedan.

```sh
# verificá que no quedan referencias antes de borrar
grep -r "ChefHat" src/
# si no aparece nada, listo
```

---

## 8. QA checklist (manual)

1. **Build local** (`npm run build` + `npm run preview`):
   - [ ] Favicon en la pestaña del browser (16/32) — debería verse marrón redondeado con plato cream.
   - [ ] LoginScreen — el círculo `--primary-soft` muestra el plato con vapor adentro.
   - [ ] Sin warnings de `<link rel>` rota en consola.

2. **Mobile (iPhone Safari)**:
   - [ ] Add to Home Screen — el icono que aparece es el plato sobre marrón redondeado.
   - [ ] Tap en el icono → splash screen (cream + plate + "Comida Familiar / Cocina familiar Cofano") aparece ~1.5s antes de la app.
   - [ ] App corre en standalone (sin barra del browser) → `display: standalone` del manifest.

3. **Mobile (Android Chrome)**:
   - [ ] Install app prompt → muestra icon-512 marrón.
   - [ ] Icono en el launcher Android es el maskable (full-bleed marrón con plato adentro, recortado a la forma del launcher — círculo, squircle, etc).
   - [ ] Theme color de la status bar es marrón cálido cuando la PWA está abierta.

4. **Accesibilidad**:
   - [ ] El `<PlatoMark>` del LoginScreen es `aria-hidden` (es decorativo — el `<h1>` ya dice "Comida Familiar"). Si usás el mark sin texto al lado, pasale `aria-label="Comida Familiar"`.

---

## 9. Si querés iterar el mark más adelante

El "source of truth" del shape vive en `src/brand/PlatoMark.tsx` (paths SVG). Si rediseñás:

1. Edita los paths ahí.
2. Regenerá los PNG: el design system tiene un script (`run_script` en este Omelette) que dibuja los íconos por canvas. Para regenerar sin Omelette, podés usar `puppeteer` o `sharp` para tomar el SVG y rasterizarlo en los 8 tamaños + 11 splashes.
3. Reemplazá los archivos en `public/icons/`. Si cambia el contorno principal, también actualizá `favicon.svg`.

Los splash screens se pueden regenerar a partir del SVG centrado en cada canvas — el script de Omelette en `assets/pwa/README.md` muestra el approach.

---

## 10. Archivos de referencia en este sistema

| Archivo | Para qué |
|---|---|
| `assets/favicon.svg` | Source del favicon SVG (copiar a `public/favicon.svg`). |
| `assets/app-mark.svg` | Mark hero (96×96, cream circle + brown plato con vapor). Útil como referencia visual o si querés `<img src="">`-lo. |
| `assets/chef-hat.svg` | Variante simple (24×24, currentColor). |
| `assets/pwa/*.png` | Los 8 íconos PWA + 11 splash. |
| `assets/pwa/manifest.json` | Manifest listo. |
| `preview/brand-mark.html` | Lockup canónico (mark + wordmark + paleta). Útil para presentaciones o exports. |
| `preview/logomark-03-variations.html` | Histórico de las 6 variantes A-F. F fue la elegida. |
| `ui_kits/mobile-app/Icon.jsx` | El mismo mark inline JSX (keys `'chef-hat'`, `'plato'`, `'plato-vapor'`). Sirve de referencia para los paths exactos. |
