# PROMPT DOCS — MAPEO v1.8.1: cerrar E7.7

> **Tipo:** documentación pura. **Solo toca `docs/MAPEO_FIRESTORE.md`. Cero código.**
> **MAPEO vigente:** v1.8.0 (con E7.7 marcado ⏳ pendiente).
> **Bump a:** v1.8.1 — E7.7 ejecutado y deployado; cierra el último pendiente del ciclo.

## Por qué

E7.7 (distribución/onboarding) ya está implementado y commiteado:
- Parte A — Open Graph + Twitter Card: commit `23e7ef3`. `public/og-image.png` (1200×630, 41 KB, fondo `#fdfaf6`, `icon-512.png` centrado-izquierda + texto) y las metas `og:*` / `twitter:*` con URLs absolutas a `https://comida-familiar.web.app/` en `index.html`.
- Parte B — Botón Instalar (Android): commit `26f49c8`. Hook `src/lib/useInstallPrompt.ts` (captura `beforeinstallprompt`, detecta standalone, expone `canInstall`/`promptInstall`) + botón `btn-secondary` "Instalar app" en `src/auth/LoginScreen.tsx`, visible solo cuando `canInstall`.

Con esto el ciclo funcional queda completo. El MAPEO todavía dice que E7.7 está ⏳ pendiente — hay que cerrarlo.

## Cambios al documento

### C1 — Header

```
> **Versión**: 1.8.1 (CIERRE COMPLETO — E7.7 distribución/onboarding ejecutado; ciclo funcional terminado; push, dashboard avanzado y opcionales postergados sin urgencia)
> **Fecha**: 2026-05-28
```

### C2 — §1.1 Resumen ejecutivo

La oración inicial dice "Ciclo funcional cerrado en v1.8.0 (Etapas 0–7 salvo E7.7 distribución/onboarding, pendiente)". Cambiar a:

> Fuente de verdad para el modelo de datos, arquitectura y decisiones de producto de la app. Ciclo funcional completo en v1.8.1 (Etapas 0–7 cerradas). Mejoras puntuales se registran como sub-etapas (`E7.x`) o entradas en `§10`.

### C3 — §1.2: nueva entrada §1.2.e77

Agregar (siguiendo la convención de orden que ya tenga §1.2 — donde va §1.2.cierre, antes o después según corresponda):

```
### 1.2.e77 Cambios en v1.8.1 (E7.7 cerrado)

E7.7 distribución/onboarding ejecutado y deployado. Cierra el último pendiente del ciclo.

1. **Open Graph + Twitter Card** (commit `23e7ef3`). Al compartir el link de la app por
   WhatsApp / Telegram / iMessage, el preview muestra logo + nombre + descripción.
   `public/og-image.png` (1200×630). Metas con URLs absolutas a producción en `index.html`.

2. **Botón "Instalar app" (Android)** (commit `26f49c8`). `useInstallPrompt` captura
   `beforeinstallprompt`; `LoginScreen` muestra un botón secundario "Instalar app" solo
   cuando la PWA es instalable y no corre ya en standalone. iOS sigue con "Agregar a
   pantalla de inicio" manual (Safari no dispara el evento), ya cubierto por el splash
   de E6.1.1.

3. **§10.5 y §10.6 cerradas.**

Con E7.7 cerrado, el ciclo funcional de la app está completo. Lo que sigue es opcional
(Apéndice §9) o postergado sin urgencia (push E6.2, dashboard D.3).
```

En §1.2.cierre, donde lista E7.7 como ⏳ pendiente, cambiar esa línea a:

```
   - E7.7 — distribución y onboarding (Open Graph para WhatsApp + botón Instalar app
     en Android desde el login) ✅
```

### C4 — §7.7: cerrar la entrada de E7.7

Cambiar la entrada que hoy dice `**`PROMPT_E7.7_distribucion_onboarding.md`** ⏳ **PENDIENTE**: ...` por:

```
- **`PROMPT_E7.7_distribucion_onboarding.md`** ✅ **CERRADO** (commits `23e7ef3` + `26f49c8`):
  Open Graph + Twitter Card en `index.html` con `public/og-image.png` (1200×630) para que
  el preview al compartir el link por WhatsApp / Telegram / iMessage muestre logo y
  descripción. Botón "Instalar app" en `LoginScreen` para Android (hook `useInstallPrompt`
  captura `beforeinstallprompt`, se muestra solo cuando es instalable). iOS sigue con su
  flujo manual.
```

### C5 — §10.5 y §10.6: marcarlas cerradas

En la §10, cambiar los encabezados:

```
### ~~10.5 Open Graph / Twitter Card para compartir el link~~ ✅ CERRADO (v1.8.1 — E7.7, commit `23e7ef3`)

### ~~10.6 Botón "Instalar app" en Android desde el login~~ ✅ CERRADO (v1.8.1 — E7.7, commit `26f49c8`)
```

(Mantener el cuerpo de cada una, solo tachar el título y agregar el sello de cierre, igual que se hizo con §10.3/§10.4 en v1.7.3.)

### C6 — Sección Cierre final

La nota de estado dice "Queda pendiente E7.7 (distribución/onboarding...)". Cambiar a:

```
**Estado en v1.8.1:** ciclo funcional completo. Todas las Etapas 0–7 cerradas. Las próximas
modificaciones serán mejoras puntuales según necesidad real, no etapas planificadas. Lo
postergado (push E6.2, dashboard D.3, opcionales §9.*) se reactiva caso por caso cuando
aparezca demanda concreta. Deuda técnica viva: §10.1 (verificar filtros Biblioteca) y
§10.2.3 ("a gusto" para unidad null) — ninguna bloquea el uso.
```

## Criterio de aceptación

Reportá:
1. Versión del header — `1.8.1`.
2. Pegá §1.2.e77 completa + la línea de E7.7 en §1.2.cierre ya en ✅.
3. Pegá la entrada de E7.7 en §7.7 ya cerrada.
4. Confirmá que §10.5 y §10.6 quedaron tachadas + selladas.
5. Pegá la sección Cierre final.

## Fuera de scope

- No tocar código ni configuración.
- No cerrar §10.1 ni §10.2.3 (siguen vivas).
- No tocar las decisiones de producto postergadas.

## Commit

```
Docs: MAPEO v1.8.1 — E7.7 cerrado, ciclo funcional completo
```
