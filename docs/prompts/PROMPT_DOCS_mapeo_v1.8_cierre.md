# PROMPT DOCS — MAPEO v1.8.0 cierre de la app

> **Tipo:** documentación pura. **Solo toca `docs/MAPEO_FIRESTORE.md`. Cero código, cero datos.**
> **MAPEO vigente:** v1.7.3.
> **Bump a:** v1.8.0 — cierre formal del scope para uso familiar.

## Por qué este prompt

La app está en producción y completa para el uso real de la familia: planificación semanal, lista de compras con sumabilidad, cocinar paso a paso con timers, evaluación con cierre transaccional, historial, importador de recetas y menús, PWA instalable con splash iOS, asignaciones por miembro, voto distribuido con cierre automático. El rediseño v2 (Compras / Cocinar / Detalle receta / Home tweaks) y el contador de pasos también están aplicados.

Lo que faltaba en el MAPEO era declarar explícitamente este cierre: marcar como **postergado sin urgencia** lo que no es necesario para el uso real (push notifications + dashboard avanzado), confirmar el cierre del Apps Script viejo, y dejar el resto del Apéndice §9 como _futuro opcional_ sin compromiso de fecha.

Este bump a v1.8.0 marca el cierre del scope que arrancó en E0. La app deja de estar "en migración" y pasa a estar "en uso, con mejoras puntuales según necesidad".

## Decisiones de JP que este prompt registra

1. **App cerrada para uso familiar** con el scope actual. No hay features grandes pendientes.
2. **Push notifications (E6.2)** — postergadas, no son necesarias ahora. Cuando se retomen, partir de la información correcta de `PROMPT_DOCS_mapeo_e62_en_espera.md` (FCM es gratis; lo que requiere Blaze son las Cloud Functions del Camino A).
3. **Dashboard de historial avanzado (D.3 / §9.1)** — postergado, no es necesario ahora. La pantalla de historial actual (E3.7) cubre lo que la familia usa.
4. **Apps Script viejo (§9.12)** — cerrado. JP ya retiró el acceso de escritura en su lado; el spreadsheet quedó como respaldo histórico.
5. **Apéndice §9 restante** (§9.2 multi-semana, §9.5 sugerencias inteligentes, §9.7 costos reales, §9.8 noche de a dos, §9.10 backup/export, §9.11 invitados con scope limitado) — _futuro opcional sin compromiso de fecha_.

## Cambios al documento

### C1 — Header

Subir versión a **v1.8.0**, actualizar fecha. Cambiar la nota a:

> **Versión**: 1.8.0 (CIERRE — app completa para uso familiar; queda E7.7 distribución/onboarding pendiente; push, dashboard avanzado y opcionales postergados sin urgencia)
> **Fecha**: 2026-05-27

### C2 — §1.1 Resumen ejecutivo: ajustar la oración inicial

La línea introductoria del documento dice _"Fuente de verdad para todo el trabajo de Etapas 2–7"_. Cambiar a algo como:

> Fuente de verdad para el modelo de datos, arquitectura y decisiones de producto de la app. Ciclo funcional cerrado en v1.8.0 (Etapas 0–7 salvo E7.7 distribución/onboarding, pendiente). Mejoras puntuales se registran como sub-etapas (`E7.x`) o entradas en `§10`.

### C3 — Nueva entrada §1.2.cierre

Insertar al inicio de §1.2 (antes de la primera sub-entrada `1.2.bis` actual o como entrada más reciente, según convención del documento — JP decidió usar nombres descriptivos para evitar pelearse con numerales latinos):

```
### 1.2.cierre Cambios en v1.8.0 (cierre del scope)

La app entra en uso real de la familia con todo el ciclo cubierto: planificación, compras,
cocinar, voto, evaluación, historial, importador. Esta versión declara el cierre formal
del scope inicial.

1. **Etapas 0–6 cerradas.** Auth, modelo de datos, security rules, seeds, importador,
   funcionalidad core JP, modo miembro, importador desde frontend, PWA instalable + splash
   iOS.

2. **Etapa 7 cerrada en su scope necesario:**
   - E7.1 — campo `fecha` en el plan ✅
   - E7.2 — design system v1 (PlatoMark, PWA assets, componentes nuevos) ✅
   - E7.3 — contador real de pasos en Cocinar ✅
   - E7.4 — rediseño v2 (Compras, Cocinar, Detalle receta, Home tweaks) ✅
   - E7.5 — fixes de auditoría (CTAs Home + marcar cocinada con fecha futura + detalle
     receta sin foto + acciones JP arriba) ✅
   - E7.6 — pulidos del detalle de receta + acciones JP visibles (cinco cosméticos
     + sacar el acordeón de acciones, volver a botones directos con ocultar los no
     elegibles) ✅
   - E7.7 — distribución y onboarding (Open Graph para WhatsApp + botón Instalar app
     en Android desde el login) ⏳ pendiente — ver §10.5 y §10.6

3. **E6.2 push notifications — postergada sin urgencia.** No es necesaria para el uso
   actual de la familia. Cuando se retome, ver `PROMPT_DOCS_mapeo_e62_en_espera.md` para
   la decisión Camino A (Blaze + Cloud Function) vs Camino B (in-app sobre realtime).

4. **§9.1 dashboard de historial avanzado (D.3) — postergado sin urgencia.** La pantalla
   de historial actual (E3.7) cubre lo que la familia usa hoy: lista con filtros, métricas,
   detalle. El dashboard con gráficos y comparación miembro-vs-familia entra cuando
   aparezca necesidad real.

5. **Apps Script viejo — cerrado.** JP retiró el acceso de escritura. El spreadsheet
   queda como respaldo histórico read-only. La app Firebase es la única fuente de verdad
   para la familia. Ver §9.12.

6. **Apéndice §9 restante** (§9.2, §9.5, §9.7, §9.8, §9.10, §9.11) — futuro opcional sin
   compromiso de fecha. Se reactiva si aparece necesidad real.

7. **Deuda técnica §10 restante:**
   - §10.1 — filtros de Biblioteca post-E3.4.8: pendiente verificación.
   - §10.2.3 — display "a gusto" para unidad null: pospuesto por JP (no bloqueante).
   - §10.5 — Open Graph / Twitter Card para preview al compartir el link (WhatsApp,
     Telegram, iMessage). No implementado: `index.html` no tiene metas `og:*`. Cuando
     se comparte el link, no aparece logo ni descripción. Asset de preview a generar
     (1200×630) + metas a sumar. **E7.7.**
   - §10.6 — Botón "Instalar app" en `LoginScreen` para Android. Hoy el navegador
     muestra su propio prompt de instalación si quiere; no hay control en la app. Captar
     `beforeinstallprompt` y exponer un botón explícito en el login mientras el evento
     esté disponible. iOS queda fuera (Safari requiere "Agregar a pantalla de inicio"
     manual). **E7.7.**
```

(Adaptar el formato de cabecera de sub-entrada al estilo del documento — JP ya no quiere usar más numerales latinos; usar nombres descriptivos como `1.2.cierre`.)

### C4 — §7.6 Etapa 6 — reescribir la entrada de E6.2

Cambiar:

> **`PROMPT_E6.2_push_notifications.md`** ⏳ **EN ESPERA — decisión pendiente de JP**: Firebase Cloud Messaging...

Por:

> **`PROMPT_E6.2_push_notifications.md`** 🅿️ **POSTERGADO sin urgencia** (decisión JP en v1.8.0). La familia no necesita push para el uso actual. Cuando se retome, ver `PROMPT_DOCS_mapeo_e62_en_espera.md` para los dos caminos posibles (A: Cloud Function + Blaze; B: in-app sobre realtime). FCM es gratis en ambos planes; lo que define la decisión es si se aceptan los términos del plan Blaze para activar Cloud Functions.

### C5 — §7.7 Etapa 7 — reescribir la sección entera

Hoy dice:

```
### 7.7 Etapa 7 — Features nuevos (D.3 y más)

- **`PROMPT_E7.1_dashboard_historial.md`**: D.3 con filtros y gráficos.
- Otros prompts según prioridad familiar.
```

Esto está **desactualizado**: el nombre `E7.1` se reutilizó para "campo fecha en el plan" (v1.7.2), y la lista de la sección no refleja lo que efectivamente se hizo. Reemplazar por:

```
### 7.7 Etapa 7 — Features post-cierre de Etapas 1–6

Etapa 7 acumula todo lo que se hizo después del cierre funcional inicial. Cerrada en v1.8.0
en su scope necesario.

- **`PROMPT_E7.1_campo_fecha_plan.md`** ✅ **CERRADO**: campo `fecha?: string` en el plan +
  `asignarFechaPlan(idPlan, fecha)` con validación de rango contra `semanaInicio..semanaFin`.
  Sin UI — la UI llegó con E7.4. Ver §1.2.tervicies.
- **`PROMPT_E7.2_design_v1.md`** ✅ **CERRADO**: integración del Design System v1.0
  (logomark `PlatoMark`, PWA assets, componentes `WeekStrip`, `MemberAvatar`, `PlanCard`,
  `CompraProgress`, rediseño Home v2 + screens de menú).
- **`PROMPT_E7.3_contador_pasos.md`** ✅ **CERRADO**: contador real de pasos en Cocinar
  con parser de tiempos libres + `StepTimer` reusable.
- **`PROMPT_E7.4_design_v2.md`** ✅ **CERRADO**: rediseño v2 de Lista de Compras
  (variante C — recetas envueltas), Cocinar (flow guiado/scroll con cursor "acá vas",
  LiveTimer con notificaciones), Detalle de receta (hero + meta + ingredientes agrupados
  + pasos preview + acciones JP plegables), Home (SemanaBadge, WeekStrip con Plate icon).
- **`PROMPT_E7.5_home_ctas_fix_cocinada_detalle_arriba.md`** ✅ **CERRADO**: CTAs en el Home
  (Elegir como Especial siempre cuando no hay; En proceso siempre; quitado el botón
  Importar menú); `marcarCocinada` actualiza `fecha` a hoy y el WeekStrip excluye estado
  `Cocinada`; `<CompraProgress>` se oculta con `totalItems === 0`; detalle de receta sin
  placeholder de foto y con `AccionesPlan` reposicionado entre MetaCards y pills.
- **`PROMPT_E7.6_pulido_detalle_receta.md`** ✅ **CERRADO**: cinco pulidos cosméticos del
  detalle de receta (MetaCards sin borde + sub "X min activo"; borde solo entre items en
  ingredientes; tiempo del paso en línea con título; banner riesgos con borde + estructura
  ícono+texto; sticky bottom Cocinar con `position: sticky` + gradient fade) **+ cambio
  funcional en `AccionesPlan`**: sacar el acordeón, mostrar los tres botones directamente,
  ocultar los no elegibles (regla: `puede: false` → no renderizar). Conserva el flujo de
  confirmación de reemplazo cuando hay Especial elegida.
- **`PROMPT_E7.7_distribucion_onboarding.md`** ⏳ **PENDIENTE**: Open Graph + Twitter Card
  en `index.html` para que el preview al compartir el link de la app por WhatsApp /
  Telegram / iMessage muestre logo y descripción. Asset de preview (1200×630, derivado
  del PlatoMark). Botón "Instalar app" en `LoginScreen` para Android (captar
  `beforeinstallprompt`, mostrar mientras esté disponible). iOS sigue con su flujo manual
  "Agregar a pantalla de inicio".

**Postergados sin urgencia (v1.8.0):**

- **Dashboard de historial avanzado (D.3 / §9.1)** — la pantalla actual de historial
  cubre el uso real. Cuando se retome, requiere primero pasada por Claude Design (§8.2).
- **Otros features del Apéndice §9** — sin compromiso de fecha.
```

### C6 — §9.12 Cierre del Apps Script: marcarlo como hecho

Hoy dice "Una vez que la familia use Firebase con confianza por 4-6 semanas, deprecamos el Apps Script." Pasarlo a:

```
### 9.12 Cierre del Apps Script ✅ HECHO (v1.8.0)

JP retiró el acceso de escritura al spreadsheet original. El Apps Script viejo queda
deprecado. El spreadsheet permanece como respaldo histórico read-only. La app Firebase
en `https://comida-familiar.web.app` es la única fuente de verdad para la familia.
```

### C7 — §9.1 D.3: confirmar el estado postergado

Hoy dice "Filtros, gráficos, comparaciones miembro vs. familia. Ver §8.2." Agregar al final:

```
**Estado en v1.8.0:** postergado sin urgencia. La pantalla de historial actual (E3.7)
cubre el uso real de la familia. Se reactiva si aparece necesidad concreta.
```

### C8 — §10 Deuda técnica: actualizar el preámbulo y agregar las entradas nuevas

El preámbulo actual dice _"deben resolverse o decidirse explícitamente antes de Etapa 4-5"_ — ya no aplica, todas las etapas están cerradas. Cambiarlo a:

```
## 10. Deuda técnica pendiente — vivos en v1.8.0

Ítems abiertos que no bloquean el uso de la app pero conviene resolver cuando aparezca
ventana. No son bugs, son cosas que se notan al usar la app un tiempo.

### 10.1 Filtros de Biblioteca — verificar post-E3.4.8

[contenido actual sin cambios]

### 10.2.3 "A gusto" en vez de cantidad sin unidad — pospuesto

[contenido actual sin cambios — los demás sub-ítems de 10.2 ya están cerrados]

### 10.5 Open Graph / Twitter Card para compartir el link — E7.7

`index.html` no tiene metas `og:*` ni `twitter:*`. Al compartir el link de la app por
WhatsApp / Telegram / iMessage, el preview sale sin logo ni descripción (solo la URL
pelada). Falta: generar un asset de preview 1200×630 (derivado del PlatoMark + nombre)
y sumar las metas Open Graph + Twitter Card apuntando a él. Resuelto en E7.7.

### 10.6 Botón "Instalar app" en Android desde el login — E7.7

No hay control de instalación en la app. El navegador puede mostrar su propio prompt,
pero JP quiere un botón explícito. Falta: captar `beforeinstallprompt` en un handler
global, guardarlo, y exponer un botón "Instalar app" en `LoginScreen` mientras el
evento esté disponible (se oculta una vez instalada o si el navegador no lo soporta).
iOS queda fuera del alcance (Safari no dispara `beforeinstallprompt`; sigue con
"Agregar a pantalla de inicio" manual, ya cubierto por el splash de E6.1.1). Resuelto
en E7.7.
```

Los §10.3 y §10.4 viejos (ING-0178 eliminado, REC-15xx verificadas — cerrados en v1.7.3)
quedan tal cual están, tachados/cerrados. **No reusar esos números** — las entradas nuevas
de E7.7 van como §10.5 y §10.6.

### C9 — Cierre del documento

Al final del documento (la sección "## Cierre" actual termina con _"Próximo paso: cerrar Etapa 0..."_, totalmente desactualizada). Reemplazar por:

```
## Cierre

Este documento es la **fuente de verdad** del modelo de datos y la arquitectura de la app
Firebase. Cualquier decisión que se tome y modifique algo de acá, **debe reflejarse en
este documento en el mismo commit**.

**Estado en v1.8.0:** ciclo funcional cerrado para uso familiar. Queda pendiente E7.7
(distribución/onboarding: Open Graph + botón Instalar Android), que no bloquea el uso pero
mejora cómo se comparte e instala la app. Lo demás postergado (push, D.3, opcionales §9.*)
se reactiva caso por caso cuando aparezca demanda concreta.
```

## Criterio de aceptación

Reportá:

1. Versión del header — `1.8.0` exacto.
2. Pegá la nueva sección §1.2.cierre completa.
3. Pegá la §7.7 final reescrita.
4. Pegá la nueva §10 completa (preámbulo + 10.1 + 10.2.3 + 10.5 + 10.6 — los §10.3/§10.4 viejos quedan tachados sin cambios).
5. Pegá la nueva sección "## Cierre" final.

## Fuera de scope

- No tocar código, datos, configuración de Firebase.
- No agregar prompts nuevos a `docs/prompts/`.
- No mover decisiones de producto que el usuario no haya confirmado en este prompt.

## Commit

```
Docs: MAPEO v1.8.0 — cierre del scope para uso familiar
```
