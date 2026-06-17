# PROMPT_E7.13 — Dimensión `cocina` en recetas (enum opcional + diccionario + importador + filtro)

> Etapa: **E7.13** · Versión MAPEO: **v1.8.7** · Rama sugerida: `feat/e7.13-cocina`
> Prefijo de commits: `feat: E7.13 ...`

## Contexto

Se agrega una **nueva dimensión de clasificación** a las recetas: **`cocina`** (tipo de cocina / origen: Italiana, China, Argentina, etc.). Calca el patrón de `climaDelPlato` / `pensadaPara`: **enum opcional** validado contra `/config/diccionarios`. No todas las recetas la tienen.

⚠️ **Lección E5.2 (no repetir):** `proteinaPrincipal` se había desincronizado en 4 lugares. `cocina` debe quedar consistente en **los 4 puntos** desde el inicio:
1. Tipo en `src/types/models.ts` (**fuente de verdad**).
2. `/config/diccionarios.cocinas` (Firestore).
3. Prompt modelo del importador en `/config/importador.promptLLM` (vía `scripts/seed-config-importador.ts`).
4. Validación del parser del importador.

## Diagnóstico previo (ANTES de codear; reportar y esperar *procedé*)

- **D1 — Modelo.** Ubicá el tipo `Receta` en `src/types/models.ts` y dónde se definen los enums (¿unions de strings? ¿constantes?). Reportá cómo agregar `cocina` opcional sin romper consumidores.
- **D2 — Diccionarios.** Confirmá el shape de `/config/diccionarios` y el patrón de los scripts que lo siembran/parchean (ej. `scripts/fix-diccionarios-proteinas.ts`). Decidí si el agregado de `cocinas` va por script nuevo idempotente o por extensión del seed existente.
- **D3 — Importador.** Localizá el parser (`parseRecetaTxt`, según E7.11 en `src/import/parseReceta.ts` — **verificar ubicación real**) y dónde valida campos contra diccionarios. Localizá el prompt modelo en `scripts/seed-config-importador.ts`.
- **D4 — Filtros de Biblioteca (cierra §10.1).** Relevá cómo `src/routes/Biblioteca.tsx` arma los filtros: ¿lee enums hardcodeados, desde `models.ts`, o desde `/config/diccionarios`? Reportá el estado actual de los filtros (§10.1 sospecha que algunos quedaron rotos tras E3.4.8). Este relevamiento es la base para sumar el filtro `cocina` y para cerrar §10.1.
- **D5 — Display.** Ubicá en `DetalleReceta` (`/recetas/:id`) dónde se muestran `climaDelPlato` / `pensadaPara` para sumar `cocina` con el mismo tratamiento.
- **D6 — Reportá discrepancias** con lo que asume este prompt antes de tocar.

## Decisiones zanjadas (no reabrir salvo que el diagnóstico lo contradiga)

1. **Nombre: `cocina`** (no "origen"). Enum cerrado para filtrar; no se pisa con `estilo` (texto libre) ni `tecnicaPrincipal` (texto libre).
2. **Opcional.** `cocina?: string`. Ausente → **clave omitida** del doc (no `""` ni `null`). En UI, fila omitida si falta.
3. **Diccionario `cocinas` — 15 valores iniciales** (editable por JP desde Firebase Console):
   ```
   ["Argentina", "Italiana", "Española", "Francesa", "Mediterránea",
    "China", "Japonesa", "Coreana", "Tailandesa", "India", "Mexicana",
    "Peruana", "Árabe / Medio Oriente", "Estadounidense", "Otra"]
   ```
   `"Otra"` como catch-all al final.
4. **Importador.** El `#RECETA` acepta `cocina:` opcional. Si viene y no está en `diccionarios.cocinas` → el bloque va a `fallidas` con el motivo (consistente con E7.11). Sin default. El prompt modelo del LLM lista `cocina` como opcional con los valores válidos.
5. **Recetas existentes (78) NO se migran automáticamente.** No hay editor de recetas en la app. Se completan desde Firebase Console o futuro editor; los imports nuevos la traen. **No** intentar inferir la cocina.
6. **Filtro en Biblioteca — lee `models.ts`, NO Firestore.** D4 confirmó que `tipoItem`/`proteina` leen de `models.ts` (`TIPOS_ITEM`, `PROTEINAS`), sincronizados y funcionando (§10.1 cierra por verificación). Por consistencia y para no reabrir la divergencia de E5.2, la faceta `cocina` **lee `COCINAS` de `models.ts`** — sin `getDiccionarios()`, sin fetch async. La copia en `diccionarios.cocinas` existe **solo** para la validación runtime del importador. Recetas sin `cocina` no matchean ningún valor del filtro de cocina.

7. **`models.ts` es la fuente de verdad, no la Console.** Para agregar/cambiar una cocina a futuro: editar `COCINAS` en `models.ts` + re-correr `add-diccionarios-cocinas.ts` (mismo flujo controlado de E5.2 con `proteinas`). **No** editar `diccionarios.cocinas` directo en la Console (divergiría del tipo `Cocina`).

## Tareas

1. **`models.ts`**: agregar `export const COCINAS = [...15...] as const;` y `export type Cocina = typeof COCINAS[number];`. En `Receta`: `cocina?: Cocina`. En la interfaz `DiccionariosConfig`: agregar el slot `cocinas: Cocina[]` (hoy no existe).
2. **Diccionario**: `scripts/add-diccionarios-cocinas.ts` nuevo, patrón `fix-diccionarios-proteinas.ts` (`ref.update({ cocinas: [...COCINAS] })`), idempotente — solo agrega si no existe o difiere. **JP lo corre** tras commit.
3. **Importador** (`src/import/parseReceta.ts`):
   - Parser acepta `cocina:` opcional; `matchEnum(kv["cocina"], COCINAS)` si viene → falla = `errors.push` → `fallidas`; ausente → `...(cocina ? { cocina } : {})`.
   - Actualizar el prompt modelo en `scripts/seed-config-importador.ts` para listar `cocina` (opcional) con los valores válidos, **y agregar un flag `--force`** que sí sobreescriba `promptLLM`. **JP debe re-correr el seed con `--force`** (sin él, el guard `if (existing.trim().length > 0) return` deja el prompt viejo sin `cocina`).
4. **DetalleReceta** (`src/routes/DetalleReceta.tsx`): agregar **pill nueva** `{receta.cocina && <RecetaPill label={receta.cocina} />}` junto a las pills existentes. No replicar display de `climaDelPlato`/`pensadaPara` (no existe).
5. **Biblioteca / filtros** (`src/lib/filtros.ts` + `src/routes/Biblioteca.tsx`): sumar faceta `cocina` cuyas **opciones salen de `COCINAS` (`models.ts`)**, no de Firestore. Recetas sin cocina quedan fuera de ese filtro. No tocar las facetas existentes (ya verificadas).

## Criterios de aceptación

- Una receta puede guardarse **con o sin** `cocina`; sin ella, la clave no existe en el doc.
- El importador acepta `cocina:` válida, rechaza una inválida (bloque a `fallidas`) y tolera su ausencia.
- El prompt modelo del importador (post re-seed) menciona `cocina` con los valores válidos.
- `cocina` aparece en `DetalleReceta` cuando existe; no aparece nada raro cuando falta.
- El filtro de cocina en Biblioteca funciona y lee del diccionario; los filtros previos siguen funcionando (§10.1 verificada).
- `cocina` consistente en los 4 puntos (models, diccionario, prompt importador, validación) — sin desync estilo E5.2.

## Qué NO tocar

- El campo `estilo` ni `tecnicaPrincipal` (siguen siendo texto libre, independientes).
- Backfill de las 78 recetas existentes (manual por JP desde consola; no automatizar).
- Lógica de elegibilidad de planes / Especial (§3.3): `cocina` es solo clasificación, no afecta reglas.
- El parser del importador más allá de sumar `cocina` (el resto es E7.11, ya cerrado).

## Instrucciones manuales para JP (post-merge)

1. Correr `scripts/add-diccionarios-cocinas.ts` (agrega `cocinas` a `/config/diccionarios`).
2. Re-correr el seed del importador **con `--force`**: `... seed-config-importador.ts --force` (sin el flag no actualiza el `promptLLM` existente → la app seguiría mandando el prompt viejo sin `cocina`).
3. (Opcional, gradual) Completar `cocina` en recetas existentes desde Firebase Console.
4. Testear: `?v=N` incremental + incógnito. Importar una receta con `cocina:` válida e inválida; ver el filtro en `/biblioteca`.
