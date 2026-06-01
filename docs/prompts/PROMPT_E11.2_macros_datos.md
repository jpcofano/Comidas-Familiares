# PROMPT E11.2 — Poblar macros del catálogo (workflow LLM + seed idempotente)

## Objetivo

Segunda etapa de **Macros por porción**. E11.1 dejó el tipo `Ingrediente.macros?` y el helper
`macrosDeReceta()`, pero ningún ingrediente tiene datos todavía. Acá poblamos `macros` y
`gramosPorUnidad` para los 177 ingredientes de `/ingredientes`, usando el **mismo patrón que
el importador de recetas**: un prompt para LLM que devuelve JSON, JP revisa, y un script
idempotente con Admin SDK lo escribe a Firestore validando rangos.

**No se inventan números en código.** Los valores son estimados (productos argentinos), se
revisan, y la UI (E11.3) los muestra como "estimado" con cobertura.

## Contexto (verificado en E11.1)

- Catálogo: `/ingredientes/{idIngrediente}`, 177 docs, campos `idIngrediente`, `nombrePreferido`,
  `categoria`, `rolNutricional[]`. Tras E11.1 acepta `macros?` y `gramosPorUnidad?` (números).
- Scripts del proyecto: Admin SDK, idempotentes, patrón `--dry-run` / `--force`, se corren con
  `npx ts-node --esm scripts/<nombre>.ts`. Existe precedente de "prompt LLM editable" en
  `/config/importador.promptLLM`.
- Rules de `/ingredientes`: `allow write: if isOwner()`. El seed corre con Admin SDK (bypassa
  rules). **No hace falta tocar Security Rules.**

## ⚠️ Diagnóstico obligatorio — antes de codear

Pegá la evidencia de:

1. **Conteo y muestra del catálogo.** Cuántos docs hay en `/ingredientes` y un dump de
   `idIngrediente | nombrePreferido | categoria | rolNutricional` de 5 de ellos.
2. **Confirmá que `macros` aún no existe** en ningún doc (read de muestra).
3. **Patrón de un script de seed existente.** Pegá las primeras ~30 líneas de un script de
   `scripts/` que use Admin SDK (init, cómo obtiene credenciales, cómo escribe), para que
   `seed-macros.ts` use el MISMO patrón de inicialización y no uno nuevo.

## Decisiones ya tomadas

- **Unidad de los datos:** todo por 100 g (alineado con E11.1). `gramosPorUnidad` solo para
  ingredientes cuya unidad habitual es de conteo (huevo, diente de ajo, etc.).
- **El script escribe SOLO** `macros` y `gramosPorUnidad` (merge). No pisa ningún otro campo.
- **Procedencia:** estos datos son estimación LLM revisada por JP. Se documenta como tal.

## Tareas

1. **`scripts/export-ingredientes-para-macros.ts` (nuevo).** Lee `/ingredientes` y emite a
   stdout (o a `scripts/seed-data/ingredientes-para-macros.txt`) la lista de los 177
   ingredientes como `idIngrediente — nombrePreferido (categoria)`, ordenada por `categoria`.
   Es el insumo que se le pega al LLM.

2. **Prompt para LLM — `docs/prompts/MACROS_LLM_PROMPT.md` (nuevo, documento, no código).**
   Redactá un prompt blindado que:
   - Recibe la lista del punto 1.
   - Pide, para CADA `idIngrediente`, los valores nutricionales **por 100 g** de producto
     argentino típico: `kcal`, `carbohidratos` (totales), `proteinas`, `grasas`, `fibra`, y
     `gramosPorUnidad` **solo si** la unidad habitual del ingrediente es de conteo (si no,
     omitir esa clave).
   - Exige salida en **JSON estricto**, un array, **sin prosa, sin markdown, sin backticks**:
     ```json
     [{"idIngrediente":"ING-0001","kcal":105,"carbohidratos":0,"proteinas":23,"grasas":1.5,"fibra":0}]
     ```
   - Aclara: utensilios/no comestibles (categoría `Utensilio`) → omitir del array.
   - Aclara: si no está seguro de un ingrediente, que igual dé su mejor estimación (JP la
     revisa), pero que no invente un `idIngrediente` que no esté en la lista.

3. **`scripts/seed-macros.ts` (nuevo, Admin SDK, idempotente).**
   - Lee `scripts/seed-data/macros.json` (la salida del LLM que JP pegó/guardó).
   - **Validación (antes de escribir):**
     - Cada `idIngrediente` existe en `/ingredientes` (si no → reportar y saltear esa fila).
     - Rangos por 100 g: `carbohidratos`, `proteinas`, `grasas`, `fibra` cada uno en [0, 100];
       `kcal` en [0, 900]; `fibra <= carbohidratos`. Fuera de rango → **saltear + reportar**
       (no abortar todo el lote).
     - **Chequeo de consistencia (warn, no aborta):** `4*carbohidratos + 4*proteinas + 9*grasas`
       debería estar dentro de ±30% de `kcal`. Si no, imprimir un `⚠` con el id y los números
       (señal de dato a revisar a mano).
   - Escribe SOLO `macros` (+ `gramosPorUnidad` si vino) con `set({...}, { merge: true })`.
   - `--dry-run` (default): no escribe, solo imprime el resumen. `--force`: escribe.
   - Resumen final: `N con macros / M sin / K warnings de consistencia / L saltados`.

4. **Actualizar `MAPEO_FIRESTORE.md`** (mismo commit): en §2.10 documentar `macros` y
   `gramosPorUnidad` con la nota de procedencia ("estimación LLM revisada por JP, base 100 g");
   marcar E11.2 en §11 (Lote 11).

## Criterios de aceptación (evidencia copy-paste)

- Pegá la salida de `--dry-run`: el resumen completo (N/M/K/L) y, si hubo, la lista de
  warnings de consistencia y de filas saltadas con el motivo.
- Después del `--force`: pegá el read (consola Firebase o script) de **3 docs** de
  `/ingredientes` distintos mostrando el mapa `macros` ya presente con sus 5 números.
- Confirmá que esos 3 docs conservan intactos sus campos previos (`categoria`,
  `rolNutricional`, etc.) — el merge no pisó nada.

## Qué NO tocar

- NO la lógica de E11.1 (`conversiones.ts`, `macros.ts`).
- NO UI (eso es E11.3).
- NO otros campos de `/ingredientes` fuera de `macros`/`gramosPorUnidad`.
- NO Security Rules (Admin SDK ya bypassa; las rules actuales ya permiten el campo a JP).

## Heads-up para JP (acción humana entre el punto 2 y el 3)

1. Corré `export-ingredientes-para-macros.ts` → pegá la lista en el prompt de `MACROS_LLM_PROMPT.md`
   → corré el LLM → guardá la respuesta como `scripts/seed-data/macros.json`.
2. Corré `seed-macros.ts --dry-run`, revisá los `⚠` de consistencia.
3. Revisá a ojo los ~10 ingredientes más usados (`vecesUsado` desc) antes del `--force` — son
   los que más impactan en los cálculos.

## Cierre

- Commits con prefijo `Stage 11.2:`.
- `macros.json` es dato, no código fuente — decidí con JP si va al repo o queda local
  (sugerencia: al repo bajo `scripts/seed-data/`, como los otros seeds, para reproducibilidad).
