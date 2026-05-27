# Comida Familiar — PWA icons

Marrón cálido `#8a4a2f` con chef-hat de Lucide en crema `#fdfaf6`. Bordes redondeados estilo iOS (22%) en los íconos "any"; full-bleed sin redondeo en los **maskable** (con safe-area del 20% para que el ícono no se corte cuando Android lo recorta).

## Archivos

| Archivo | Uso |
|---|---|
| `favicon-16.png` / `favicon-32.png` / `favicon-48.png` | Favicon clásico para `<link rel="icon">` |
| `apple-touch-icon.png` (180×180) | Pantalla inicio en iOS (Safari) |
| `icon-192.png` / `icon-512.png` | PWA install (Chrome, Edge, Samsung) — `purpose: any` |
| `icon-maskable-192.png` / `icon-maskable-512.png` | Android adaptive icons — `purpose: maskable` |
| `manifest.json` | Web app manifest listo. Asume rutas servidas desde `/icons/` |

## Cómo instalarlo en el proyecto real

1. Copiá toda la carpeta `assets/pwa/` a `Comidas-Familiares/public/icons/`.
2. Movemé `manifest.json` a `Comidas-Familiares/public/manifest.json` (o ajustá las rutas si querés otra estructura).
3. En `Comidas-Familiares/index.html`, dentro de `<head>` reemplazá el favicon actual por:

```html
<link rel="icon" type="image/png" sizes="32x32"  href="/icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16"  href="/icons/favicon-16.png">
<link rel="apple-touch-icon"      sizes="180x180" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#8a4a2f">
```

4. Bonus iOS: agregá `<meta name="apple-mobile-web-app-capable" content="yes">` y `<meta name="apple-mobile-web-app-status-bar-style" content="default">` si querés modo standalone en iPhone.

## Splash screens iOS

iOS requiere un PNG con dimensiones exactas por dispositivo. Android genera la splash automáticamente desde el manifest (con el `icon-512` + `background_color` + `theme_color`), así que sólo necesitás esto en `<head>`:

```html
<!-- iPhone 15 Pro Max / 14 Pro Max -->
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-15-pro-max.png"
      media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">

<!-- iPhone 15 Pro / 14 Pro -->
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-15-pro.png"
      media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">

<!-- iPhone 14 Plus / 13 Pro Max / 12 Pro Max -->
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-14-plus.png"
      media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">

<!-- iPhone 14 / 13 / 12 / 13 Pro / 12 Pro -->
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-14.png"
      media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">

<!-- iPhone XR / 11 -->
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-xr-11.png"
      media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)">

<!-- iPhone XS Max / 11 Pro Max -->
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-xs-max-11promax.png"
      media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">

<!-- iPhone X / XS / 11 Pro / 13 mini / 12 mini -->
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-x-xs-11pro.png"
      media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">

<!-- iPhone 8 Plus / 7 Plus / 6s Plus -->
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-8plus-7plus.png"
      media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">

<!-- iPhone 8 / 7 / 6s / SE (2da y 3ra gen) -->
<link rel="apple-touch-startup-image" href="/icons/splash/splash-iphone-8-7-se.png"
      media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)">
```

Si no querés tantos `<link>`, podés conformarte con sólo iPhone 14 (la mayoría) y dejar que el resto vea fondo blanco por unos ms. Pero pegar las 9 es la única forma de que aparezca el chef-hat en todos los iPhones desde el 7 hasta el 15 Pro Max.

Para Android no hace falta nada extra: con el `manifest.json` ya pegás. Chrome arma la splash usando `background_color: #fdfaf6` + `icon-512`.

## Reemplazo del favicon Vite

El `Comidas-Familiares/public/favicon.svg` actual (el de Vite/React, morado) puede borrarse o conservarse como respaldo. Estos archivos lo reemplazan completamente.
