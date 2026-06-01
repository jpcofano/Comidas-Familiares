# Traspaso — Comida Familiar · Etapa 9 (Cocinar con lo que hay)

> Resumen para abrir una conversación nueva sin perder contexto.
> Fecha: 2026-05-31. **Actualizado: Etapa 8 cerrada en Code; E9.0 corrido; abrimos Lote 9 de diseño.**

## Fuentes de verdad (cuál manda en qué)
- **Diseño / UI**: este proyecto de diseño → `ui_kits/mobile-app/` (prototipo `index.html`).
- **Qué se hizo + modelo de datos + decisiones**: `docs/MAPEO_FIRESTORE.md` en el repo.
- **App real**: repo `Comidas-Familiares` (git).
- **Cómo trabajamos**: `docs/WORKFLOW.md` en el repo (lo creó E8.0).
- Regla: ante dudas, manda el **MAPEO**.

## Cómo trabajamos (el loop)
Diseñar acá → cerrar diseño → generar prompts `E{N}.x` (leyendo el código real, solo deltas
reales vs el kit) → Code implementa + actualiza MAPEO + commit/push → pull y verifico → repetir.
- **Numeración unificada**: un solo eje `E{N}.x` = orden de ejecución. El backlog §11 lista
  cada feature por su `E{N}.x` (sin sub-números paralelos).
- Cada prompt bumpea un patch del MAPEO y agrega su subsección `§1.2.E{N}.x`.

## Estado real (según MAPEO) — manda el MAPEO
- **MAPEO v2.0.1**: Etapas 0–8 cerradas. **E8.5–E8.8 corridos**. **E9.0** (proteínas jerárquicas
  11 hojas / 5 grupos `Pollo`→`Aves`, faceta Dieta `esVegetariano`/`esKeto`, diccionario canónico
  265), **E9.0.1** (blindar prompt generador) y **E9.1** (prompt del importador con vocabulario
  canónico) también corridos. ⚠ Antes de numerar: revisar el MAPEO — E9.0/E9.0.1/E9.1 ya tomados.
- ⚠️ **Regresión detectada (auditoría git)**: el commit `11ff3df0` reescribió el route del
  Historial como lista plana y dejó huérfanos sus componentes ricos. Fix listo:
  `PROMPT_E9.2_fix_historial.md` (correr primero).

## Etapa 9 — Lote 9 "Cocinar con lo que hay" (en curso)
Prompts en `ui_kits/mobile-app/code-prompts/` (ver `README_ETAPA_9.md`; copiar a `docs/prompts/`).

| Prompt | Qué hace | Estado |
|---|---|---|
| E9.0 / E9.0.1 / E9.1 | proteínas+dieta+diccionario / blindar prompt / importador canónico | ✅ hecho (v2.0.1) |
| **E9.2** | **fix regresión Historial** (recablear componentes huérfanos) | ⚠️ a ejecutar primero |
| E9.3 | **Qué cocino con lo que tengo** (matcher inverso, ex-7.2) | ⬜ a ejecutar |
| E9.4 | sustitución al cocinar ("o {sustituto}") | ⬜ a ejecutar |
| E9.5 | equivalencias en la lista de compras | diseñado · prompt pendiente |

Diseñado en el prototipo: `CocinarConQueTengoScreen.jsx` (E9.3) + sustitución al cocinar (E9.4:
línea "o {sustituto}" en el detalle + recap `SustitutosRecap` en el paso a paso, tweaks
`mostrarSubs`/`subsEstilo`) + entrada en Home + tweak `matchLayout`. El fix del Historial (E9.2)
no se rediseñó: los componentes ya existen en el repo, solo hay que recablear el route.

## Etapa 8 — estado (HISTÓRICO, cerrado en v1.9.6)
Prompts en `ui_kits/mobile-app/code-prompts/` (copiar a `docs/prompts/` del repo).

| Prompt | Qué hace | Estado en Code |
|---|---|---|
| E8.0 | WORKFLOW.md + backlog §11 Lote 8 | ✅ hecho (v1.8.8) |
| E8.1 | Home "comidas", WeekStrip puntos, logo header | ✅ hecho (v1.8.9) |
| E8.2 | dark mode "Cocina nocturna" + toggle header | ✅ hecho (v1.9.0) |
| E8.3 | catálogo de ingredientes editable (crear/editar/borrar) | ✅ hecho (v1.9.1) |
| E8.4 | chips de letra por sección + toggle rol/góndola | ✅ hecho (v1.9.2) |
| E8.5 | ingrediente → recetas que lo usan (+ renumera §11) | ⬜ pendiente* |
| E8.6 | editor de clasificación de receta (incl. `cocina`) | ⬜ pendiente* |
| E8.7 | sustituciones / equivalencias de ingredientes | ⬜ pendiente* |
| E8.8 | fusionar duplicados ya guardados en catálogo | ⬜ pendiente* |

\* Diseñados y con prompt listo. Si en Code ya estás en "Etapa 9.0", confirmá si E8.5–E8.8
quedaron corridos o si pasan a la 9 — el MAPEO te dice el estado real (header de versión +
registro de prompts al final).

## Diseñado en este ciclo (en el prototipo)
- Detalle de receta: ingredientes con chips de letra por rol; toggle rol/góndola.
- Home: "N comidas"; días con comida = punto relleno como hoy; logo header más grande.
- Dark mode con toggle (aprobado, se deja así).
- Dashboard miembro: saludo sin avatar redundante; badge "por votar" tappable.
- Detalle de menú con chips de letra en componentes.
- **Catálogo de ingredientes**: editable (crear/editar/borrar), ingrediente→recetas,
  sustituciones/equivalencias, fusionar duplicados.
- Cocina de origen: pill + filtro (ya venía de E7.13 en código) + **editor** de clasificación.
- OG image (preview de WhatsApp) rehecha 1200×630 — reemplazar `public/og-image.png`.

## Qué sigue
1. **Code**: correr E8.5 → E8.6 → E8.7 → E8.8 (en orden), o reubicarlos en Etapa 9 según
   dónde estés. Cada uno cierra con commit/push + MAPEO.
2. **Diseño**: el Lote 8 está completo. Para la Etapa 9 de diseño, definir tema nuevo
   (ideas abiertas: aplicar sustituciones en la lista de compras; "qué cocino con lo que
   tengo" = ítem 7.2; pantalla de Ajustes; Importar/Cocinar menú).

## Para ver el prototipo
Pedí "pasame el link del UI kit" (genero uno nuevo, vencen en ~1h). Navegación: panel de
**Tweaks** → rol + ir a pantalla; o Biblioteca → Menús / link al Catálogo al pie.
