# Etapa 9 — Prompts para Claude Code (ciclo "Cocinar con lo que hay")

Set de prompts del ciclo de diseño post-E9.1. **Cada prompt:** toca código, **actualiza
`docs/MAPEO_FIRESTORE.md`** y al terminar **commitea + pushea** (local = git).

> Copiar a `docs/prompts/`. Ejecutar **uno por sesión**, en orden. Verificar el header del
> MAPEO antes de cada uno (cada prompt bumpea versión).

---

## Estado de entrada (MAPEO v2.0.1)
- Etapas 0–8 cerradas. **E9.0** (proteínas jerárquicas + faceta Dieta + diccionario canónico),
  **E9.0.1** (blindar prompt generador con vocabulario canónico) y **E9.1** (prompt del
  importador con vocabulario canónico) ya corridos. Versión **v2.0.1**.
- ⚠️ **Regresión detectada (auditoría git)**: el commit `11ff3df0` reescribió el route del
  Historial como lista plana y dejó huérfanos sus componentes ricos
  (`SummaryMetrics`/`FilterChips`/`MonthGroup`/`HistorialCard`). Se arregla en **E9.2**.

## Lote 9 — eje único `E9.x` (= orden de ejecución)

| Prompt | Qué hace | Estado |
|---|---|---|
| E9.0 | proteínas jerárquicas + faceta Dieta + diccionario canónico | ✅ hecho (v2.0.0) |
| E9.0.1 | blindar prompt generador (vocabulario canónico) | ✅ hecho (v2.0.1) |
| E9.1 | prompt del importador con vocabulario canónico | ✅ hecho (v2.0.1) |
| **E9.2** | **fix regresión Historial** (recablear componentes huérfanos) | ⬜ a ejecutar **primero** |
| **E9.3** | **Qué cocino con lo que tengo** (matcher inverso, ex-7.2) | ⬜ a ejecutar |
| **E9.4** | sustitución al cocinar ("o {sustituto}" en detalle/paso a paso) | ⬜ a ejecutar |
| **E9.5** | pulido Biblioteca: acceso a Catálogo antes de la primera receta | ⬜ a ejecutar |
| **E9.6** | rediseño detalle Historial (estrellas doradas + notas con peso) | ⬜ a ejecutar |
| **E9.7** | equivalencias aplicadas en la lista de compras (cierra la tríada) | ✅ v2.2.1 |
| **E9.8** | biblioteca personal por miembro (visibilidad curada) | ✅ v2.2.0 |
| **E9.9** | acceso de miembros a su biblioteca + UX de asignación con chips | ⬜ a ejecutar |
| **E9.10** | Historial: tarjetas de resumen como filtros (sin fila de chips) | ⬜ a ejecutar |

## Orden de ejecución
1. **PROMPT_E9.2_fix_historial.md** — ⚠️ **primero**: fix de regresión. Recablea, no recrea.
2. **PROMPT_E9.3_que_cocino_con_lo_que_tengo.md** — matcher inverso (cierra el ítem 7.2).
3. **PROMPT_E9.4_sustitucion_al_cocinar.md** — "o {sustituto}" en detalle + recap en paso a paso.
4. **PROMPT_E9.5_pulido_biblioteca_catalogo.md** — acceso a Catálogo antes de la primera receta (cambio chico, corré cuando quieras).
5. **PROMPT_E9.6_rediseno_detalle_historial.md** — estrellas doradas + notas con peso en el detalle (token `--estrella`).
6. **PROMPT_E9.7_equivalencias_compras.md** — pill "o {sustituto}" en la lista de compras (cierra el Lote 9).

---

## Diseñado en el prototipo (`ui_kits/mobile-app/`)
- **`CocinarConQueTengoScreen.jsx`** (E9.3) — despensa editable + buscador, faceta Dieta
  (Todas/Vegetariana/Keto), resultados por cercanía (4 buckets) y variante ranking con % de
  match. Sustituciones surfaced con las equivalencias del catálogo.
- **Sustitución al cocinar (E9.4)** — línea "o {sustituto}" en `IngredientesPorGondola`
  (`RecetaDetalleParts.jsx`) + recap colapsable `SustitutosRecap` en `CocinarScreen.jsx`.
  Tweaks: `mostrarSubs` (on/off) y `subsEstilo` (inline / chip). Dos fuentes: `alternativas` de
  receta y `equivalencias` de catálogo.
- **Entrada en Home** + ruta `que-cocino` + salto en el panel de Tweaks. Tweak `matchLayout`.
- El **fix del Historial (E9.2)** no se rediseñó en el kit: los componentes ya existen en el
  repo (`src/components/historial/*`), solo hay que recablear el route.

## Nota de fidelidad (delta prototipo → código real)
- **Biblioteca**: el prototipo quedó atrasado vs el repo — ya se allineó (E9.0): filtro de
  proteína por `GRUPOS_PROTEINA` (optgroups Aves/Vacuna…), toggles **Vegetariana/Keto**, tipos por
  `TIPOS_ITEM`, y datos de muestra con `Pollo→Aves` / `Vegetariana→Vegetal`. El acceso al Catálogo
  se movió a un botón **antes de la primera receta** (E9.5 lo lleva al código).
- El prototipo matchea por **id de muestra** (`receta.usa[]`); el código usa
  `receta.ingredientes[].idIngrediente` (la verdad).
- El prototipo ignora básicos por tener datos limpios; **el código debe manejar
  sal/pimienta/aceite/agua/"c/n"** o el matcher es ruido (ver E9.3 §2).
- Sustitución en código = `equivalencias` (catálogo, E8.7) **o** `alternativas` (receta).

## Lección de proceso (para WORKFLOW)
La regresión del Historial vino de un commit no planificado (`11ff3df0`) que **mezcló** un
refactor transversal ("skeletons en todas las rutas") con una reescritura de pantalla. Regla:
no mezclar cambios transversales con reescrituras de pantalla en el mismo commit, y cada cambio
de pantalla pasa por su prompt `E{N}.x`.
