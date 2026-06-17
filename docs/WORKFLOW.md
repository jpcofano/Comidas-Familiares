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
