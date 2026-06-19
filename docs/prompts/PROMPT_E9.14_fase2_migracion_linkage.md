# PROMPT E9.14 — Fase 2: migración del linkage paso↔ingrediente (escribe en prod)

> Numeración **tentativa** (E9.x). Renumerar según convención del repo.
> **Prerrequisito: Fase 1 cerrada y verificada** (campo `Paso.ingredientesUsados?: string[]` ya en el modelo, panel andando, render por-paso latente sin romper).
> **Esta es la primera operación de esta línea que ESCRIBE en Firestore.** Snapshot `2026-06-19` como red; gate estricto.

## Insumos (ya en el repo)
- `scripts/pasos_ingredientes.json` — linkage validado (991/1297 pasos, 0 huérfanos contra el snapshot).
- `scripts/build_pasos_ingredientes.py` — builder reproducible.
- `scripts/snapshots/2026-06-19/` — snapshot fuente + red de backup.

## Qué hace
Por cada `idReceta`/`nroPaso` del JSON, setear `paso.ingredientesUsados = [idIngrediente…]` en el doc de receta de Firestore. Pasos no presentes en el JSON quedan **sin** el campo (abstención → red (a)). Insert de un campo dentro de cada paso; el resto del doc intacto.

## F1 — Diagnóstico + dry-run (read-only, gate)
1. Confirmar que `Paso.ingredientesUsados?: string[]` existe en `models.ts` (lo dejó Fase 1). Si no está → **abortar**, Fase 1 no se mergeó.
2. Cargar `pasos_ingredientes.json`. Pegar sus `stats`.
3. **Re-validación contra datos VIVOS (no contra el snapshot):** para cada id en el JSON, confirmar que existe en el `ingredientes[]` **actual** de esa receta en Firestore. Esto detecta drift de datos desde el snapshot (ej. correcciones de catálogo).
   - **0 huérfanos vivos → seguir.**
   - **Cualquier huérfano → frenar y reportar la lista literal.** (Significa que una receta cambió desde el snapshot; JP/Claude regeneran el JSON contra un snapshot fresco antes de migrar. No forzar.)
4. Reportar: cuántos docs de receta se tocarían, cuántos pasos recibirían `ingredientesUsados`, y confirmar que ningún paso del JSON referencia un `nroPaso` inexistente.

**Reportar literal y esperar `procedé`. No escribir hasta el procedé.**

## F2 — Migración (tras procedé)
1. Por cada receta en el JSON: leer el doc, mapear `pasos[]` por `nroPaso`, setear `ingredientesUsados` solo en los pasos presentes en el JSON, **preservando todos los demás campos** de cada paso y del doc. Escribir el doc actualizado.
2. **Idempotente:** re-correr no debe cambiar nada (mismo input → mismo estado).
3. Escribir solo las recetas con tags; no tocar el resto.
4. NO tocar `votos`, `historial`, `media`, ni ningún otro campo de la receta.

## F3 — Verificación con evidencia literal
1. Re-correr la re-validación viva (F1.3) post-escritura: **0 huérfanos**.
2. Spot-check literal en Firestore Console de 2 recetas (ej. REC-0001 Bondiola, REC-1511 Cochinita): pegar el `ingredientesUsados` real de 2-3 pasos.
3. En la app (`?v=N` + incógnito): abrir esas recetas en Cocinar y confirmar que el render por-paso ("Este paso usa: …") **ahora aparece** con las cantidades, y que los pasos sin tag siguen cayendo a la lista completa.

## Commits (separados, prefijo de etapa)
- `data: E9.14 Fase 2 backfill paso.ingredientesUsados (NNN recetas, MMM pasos)`

## Restricciones
- Escribe en prod → **snapshot `2026-06-19` es la red**; si algo sale mal, restaurable desde ahí.
- Si la re-validación viva (F1.3) marca cualquier huérfano → **no migrar**, regenerar el JSON contra snapshot fresco.
- Read-modify-write por receta preservando todo lo demás; nada de re-seed ni sobreescritura del doc completo a ciegas.
- No marcar ✅ sin pegar la re-validación = 0 huérfanos + el spot-check literal.
