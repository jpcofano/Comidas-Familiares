# Etapa 8 — Prompts para Claude Code (ciclo de diseño post-E7.13)

Set de prompts del ciclo de diseño (UI Kit mobile). **Cada prompt:** toca código, **actualiza
`docs/MAPEO_FIRESTORE.md`** y al terminar **commitea + pushea** (local = git).

> Copiar a `docs/prompts/`. Ejecutar **uno por sesión**, en orden. Verificar el header del
> MAPEO antes de cada uno (cada prompt bumpea un patch).

---

## Numeración: UN solo eje

Cada cosa tiene **un único identificador `E8.x`** = orden de ejecución. El backlog §11 lista
cada feature por su `E8.x` (sin sub-números `8.1/8.2` paralelos). Si un prompt es un ajuste
sin feature de backlog, igual lleva su `E8.x`.

| Prompt | Qué hace | Estado |
|---|---|---|
| **E8.0** | setup: `WORKFLOW.md` + §11 Lote 8 | ✅ hecho (v1.8.8) |
| **E8.1** | pulido: Home "comidas", WeekStrip, logo, badge "por votar" | ✅ hecho (v1.8.9) |
| **E8.2** | dark mode "Cocina nocturna" + toggle header | ✅ hecho (v1.9.0) |
| **E8.3** | catálogo de ingredientes editable (crear/editar/borrar) | ✅ hecho (v1.9.1) |
| **E8.4** | chips de letra por sección + toggle rol/góndola + chips en menú | ✅ hecho (v1.9.2) |
| **E8.5** | ingrediente → recetas que lo usan (navegable) | a ejecutar |
| **E8.6** | editor de clasificación de receta (incl. `cocina`) | a ejecutar |
| **E8.7** | sustituciones / equivalencias de ingredientes | a ejecutar |
| **E8.8** | fusionar duplicados ya guardados en el catálogo | a ejecutar |

> **E8.5 además renumera §11** (Cambio 0): pasa los viejos `8.1/8.2/8.3` a IDs `E8.x` para que
> quede un solo esquema en MAPEO/local/git. Después de E8.5, §11 ya está unificado.

---

## Orden de ejecución
0. **PROMPT_E8.0_setup.md** — ✅ hecho.
1. **PROMPT_E8.1_pulido_diseño.md** — ✅ hecho.
2. **PROMPT_E8.2_dark_mode.md** — ✅ hecho.
3. **PROMPT_E8.3_catalogo_editable.md** — ✅ hecho.
4. **PROMPT_E8.4_ingredientes_rol_gondola.md** — ✅ hecho.
5. **PROMPT_E8.5_ingrediente_recetas.md** — siguiente. (Incluye renumerar §11.)
6. **PROMPT_E8.6_editor_clasificacion_receta.md** — después de E8.5.
7. **PROMPT_E8.7_equivalencias.md** — sustitutos de ingrediente (campo `equivalencias`, bidireccional).
8. **PROMPT_E8.8_fusionar_duplicados.md** — fusionar duplicados YA guardados (la detección al
   importar ya existía). Cierra el Lote 8.

---

## Auditoría E8.0–E8.4 (contra el código real, MAPEO v1.9.2)

**Veredicto: implementado completo y correcto.** Detalle:
- **E8.1** ✓ Home `"N comidas" / "Sin comidas"`; WeekStrip pinta los días con comida con
  `<Plate filled>` en `var(--primary)` (igual que hoy), fondo soft + número en negrita solo
  hoy; logo header 38/23. *(Nit cosmético: comentario viejo en WeekStrip.tsx y una rama
  `outlined` del `<Plate>` que ya no se usa — no afecta el render.)*
- **E8.2** ✓ Bloque `[data-theme="dark"]` en `tokens.css`; toggle Moon/Sun en `Header.tsx`
  con `src/lib/theme.ts`; **anti-FOUC**: script inline en `index.html` aplica el tema antes
  del bundle.
- **E8.3** ✓ `crear/actualizar/eliminarIngrediente`; bottom-sheet con "+ Nuevo", edición de
  cualquier ingrediente, **confirmación de borrado con aviso de `vecesUsado`**; rules
  `allow write: if isOwner()` cubren delete. `key` por id en el sheet.
- **E8.4** ✓ `getSeccionRecetaMeta` (Principal/Base de sabor… con letra+color); toggle
  **Por rol / Por góndola** con `localStorage` (`cf-ingredientes-vista`), góndola derivada del
  catálogo por `idIngrediente`; chips de letra por `comp.tipo` en `DetalleMenu.tsx`.

Nada bloqueante. El único pendiente sugerido es cosmético (limpiar el comentario/rama muerta
del WeekStrip) — se puede colar en el próximo prompt de pulido si querés.

---

## Notas del diagnóstico (para no implementar de más)
- Tweaks que el código ya tenía bien (no generaron prompt): saludo del dashboard de miembro
  sin avatar; sin botón "Importar menú" en el tope de Biblioteca.
- **Cocina de origen** ya venía de E7.13; E8.6 agrega solo el *editor*.
- **E8.5 usa `idIngrediente`** (no match por nombre como el prototipo).
- **E8.8: la detección al importar YA existe** (`matcherIngredientes.ts` + Paso 2 de
  `ImportarReceta.tsx`). El prompt agrega solo la **fusión de duplicados ya guardados** en el
  catálogo — no rehace el importador.
