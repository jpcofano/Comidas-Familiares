# PROMPT E8.0 — Setup de Etapa 8: WORKFLOW.md + registrar backlog §11

> **Etapa 8 — primer prompt (setup).** Toca `docs/WORKFLOW.md` (nuevo) y
> `docs/MAPEO_FIRESTORE.md`. **Cero código de app.**
> **MAPEO vigente esperado:** v1.8.7 (o v1.8.8 si ya se aplicó algún docs previo). Verificá el
> header y reportá la versión real.
> **Al terminar: commit + push** — ver "Cierre".

## Por qué

Antes de implementar la Etapa 8, dejamos por escrito **cómo trabajamos** (diseño ⇄ código ⇄
MAPEO) y registramos el **backlog** de lo que se diseñó pero todavía no se implementa. Así el
proceso queda en el repo y el roadmap §11 no se pierde.

## Cambio 1 — crear `docs/WORKFLOW.md`

Crear el archivo con este contenido:

```markdown
# WORKFLOW — Cómo trabajamos Comida Familiar

## Fuentes de verdad
- **Diseño**: el UI Kit / prototipo (proyecto de diseño). Define cómo se ve y se comporta.
- **MAPEO** (`docs/MAPEO_FIRESTORE.md`): qué se hizo, modelo de datos y decisiones.
- **Código** (este repo): la app real.
> Si hay duda, manda el MAPEO. Si diseño y MAPEO chocan, se resuelve antes de codear.

## El ciclo
1. Diseñar en el prototipo.
2. Cerrar diseño (aprobación de JP).
3. Generar prompts `PROMPT_E{N}.x` (uno "pulido" para micro-cambios + uno por feature),
   leyendo el código real y llevando solo los **deltas reales vs el kit**.
4. Code ejecuta un prompt por sesión: implementa, **actualiza el MAPEO**, build/tests,
   **commit + push** (local = git).
5. JP pullea; el diseño verifica contra el prototipo.
6. Próximo ciclo con el MAPEO al día.

## Convenciones
- Una **Etapa** por ciclo de diseño (Etapa 8 = este ciclo). Sub-prompts `E8.1, E8.2…`.
- Cada prompt **bumpea un patch** del MAPEO y agrega su subsección `§1.2.E{N}.x`.
- El **backlog** vive en `MAPEO §11` (no en docs sueltos).
- **Diccionarios/enums**: patrón de 4 puntos sincronizados (`models.ts` → `/config/diccionarios`
  → prompt LLM del importador → parser).

## Definición de "terminado" por prompt
- Build + typecheck + tests verdes.
- MAPEO actualizado (subsección + versión + registro en la lista de prompts).
- `git commit && git push` (working copy local idéntico al remoto).
- Si el prompt cierra un ítem de §11, marcarlo ✅ ahí.

## Anti-drift (kit vs código real)
El prototipo recrea pantallas reales: algunos "cambios" del kit ya están bien en el código.
Antes de cada prompt se compara kit vs real y se documenta explícitamente "qué NO necesita
prompt".
```

## Cambio 2 — registrar el backlog en `MAPEO §11` (Lote 8)

En §11, después del Lote 7 y antes de "Postergado sin urgencia", insertar el **Lote 8**.
**Nota de numeración:** los ítems del backlog se llaman `8.1, 8.2…` (estilo §11). NO
confundir con los **prompts** de implementación `E8.x` (Etapa 8). Mapeo abajo.

```
### Lote 8 — Edición en la app y catálogo (del ciclo de diseño post-E7.13)

Cierra el gap de §1.2.E7.13 pto 6 ("no hay edición de recetas en la app; `cocina` se completa
desde la consola"). Donde solapa con 7.2, esa sigue siendo el feature completo.

- **8.1 Editor de ingredientes completo** (editar cualquiera / alta / baja en `/biblioteca/
  catalogo`, no solo ambiguos). → **se implementa en el prompt E8.3.**
- **8.2 Editor de receta en la app** — al menos la clasificación (`cocina` y bloque
  Clasificación) para migrar las 78 recetas viejas sin la consola de Firebase. Backlog.
- **8.3 Ingrediente → recetas que lo usan.** Hacer navegable "usado en N recetas": del
  ingrediente, listar/abrir las recetas que lo referencian. Versión liviana y directa de 7.2
  (NO el matcher inverso completo). Backlog.
- **8.4 Sustituciones / equivalencias** de ingredientes (manteca ↔ aceite), sobre `sinonimos`
  / `alternativas` + matcher E3.4.9. Backlog.
- **8.5 Detección de duplicados al importar** (entra "ajo", ya existe "Ajo" → sugerir fusión
  en vez de crear ambiguo). Backlog.

Mapa backlog → prompts de implementación de Etapa 8 (crosswalk; ver README_ETAPA_8):
- E8.0 setup · E8.1 pulido · E8.2 dark mode · E8.4 chips/toggle de secciones (ajustes, sin ítem).
- E8.3 = ítem 8.1 · E8.5 = ítem 8.3 · E8.6 = ítem 8.2.
- Ítems 8.4 y 8.5: sin prompt aún (se diseñan; luego E8.7 / E8.8).
```

## Cambios en el MAPEO (header + registro)
1. Bump patch del header (solo-docs). Reportá versión antes/después.
2. Registrar en la lista de prompts: `**PROMPT_E8.0_setup.md** ✅ CERRADO (vX.Y.Z)` — setup de
   Etapa 8 (WORKFLOW.md + backlog §11 Lote 8).

## Criterio de aceptación
1. `docs/WORKFLOW.md` creado con el contenido de arriba.
2. §11 Lote 8 insertado entre el Lote 7 y "Postergado sin urgencia", con el mapa backlog→prompts.
3. Header del MAPEO bumpeado; reportá versión.
4. NO se tocó código de app ni otras secciones del MAPEO.

## Fuera de scope
- Implementar features (eso es E8.1–E8.4).
- Reordenar o renumerar los Lotes 1–7 de §11.

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E8.0: WORKFLOW.md + backlog §11 Lote 8 (setup Etapa 8)"
git push
```
Confirmá el push OK.
