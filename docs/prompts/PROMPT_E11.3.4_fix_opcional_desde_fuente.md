# PROMPT E11.3.4 — Re-derivar `opcional` desde la fuente (notas mal seedeadas como `true`)

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> Tercer y último bug de la saga macros. E11.3.3 dejó el código bien (guard `=== true` +
> script de limpieza), pero **no resuelve el síntoma** y el dry-run dio 0 cambios. Causa real
> abajo. Resultado actual: "Albóndigas rápidas de carne" muestra ~70 kcal / 0.1 g proteína /
> "2 de 4" porque la **carne no cuenta**.

## Diagnóstico (confirmado leyendo el repo)

- En `scripts/seed-data/recetas.json` el campo `opcional` está **mezclado**: las recetas
  viejas lo tienen como `false` (boolean) + `notas` aparte, pero las nuevas (p.ej. la de
  albóndigas, `fuente: ChatGPT`) lo tienen como **string de nota**:
  ```json
  { "idIngrediente": "ING-0039", "textoOriginal": "Carne picada", "opcional": "Picada especial" }
  { "idIngrediente": "ING-0085", "textoOriginal": "Huevo",        "opcional": "Ayuda a ligar" }
  { "idIngrediente": "ING-0073", "textoOriginal": "Fideos secos", "opcional": "Para chicos" }
  ```
- Al seedear a Firestore, esos strings se convirtieron en `opcional: true` (se interpretó
  "tiene texto" = "es opcional"). Por eso en producción la carne tiene `opcional: true`
  (boolean) y `macrosDeReceta()` la saltea **correctamente** (es un opcional, según el dato).
- El script de E11.3.3 solo normaliza strings y **deja los booleanos intactos** (correcto en
  general), así que un `true` mal puesto se queda → 0 cambios → "sigue igual".

> Confirmación esperada en consola: en el doc de la receta Albóndigas, la fila de la carne
> tiene `opcional: true`.

## Objetivo

Re-derivar el `opcional` correcto **desde la fuente** (`recetas.json`, que conserva el string
original) y parchear Firestore, distinguiendo **nota de preparación** (→ `false`, cuenta en
macros) de **opcionalidad real** (→ `true`, no cuenta).

## Tarea — script `scripts/fix-opcional-desde-fuente.ts`

Nuevo script Admin SDK (mismo patrón que `fix-opcional-ingredientes.ts`, lógica inline porque
ts-node --esm no importa de `src/`). Pasos:

1. Leer `scripts/seed-data/recetas.json`. Construir un índice
   `Map<idReceta, Map<idIngrediente, opcionalDeOrigen>>`.
2. Clasificar cada `opcionalDeOrigen`:
   - **boolean** → usar tal cual (no es el caso problemático).
   - **string vacío** → `opcional: false`.
   - **string "Sí/si/No/true/false/1/0"** → boolean correspondiente.
   - **string que sugiere opcionalidad real** (regex, sin acentos, case-insensitive:
     `/opcional|aparte|para (los )?chicos|solo para|quienes quieran|si quer[eé]s|a gusto del/`)
     → `opcional: true`, y el texto va a `notas`.
   - **cualquier otro string** (nota de preparación, ej. "Picada especial", "Ayuda a ligar",
     "Rallada o picada fina") → `opcional: false`, y el texto va a `notas` (concat con `" · "`
     si ya hay `notas`).
3. Recorrer las recetas de **Firestore** (`db.collection("recetas")`). Para cada doc cuyo
   `idReceta` esté en el índice, recorrer su array `ingredientes` y, **solo para los
   ingredientes cuyo `opcional` de origen era string** (los problemáticos), setear el
   `opcional` re-derivado + `notas`. Match por `idIngrediente` (si hay repetidos, además por
   `textoOriginal`). No tocar ingredientes cuyo origen ya era boolean.
4. Escribir el doc con el array `ingredientes` reconstruido (`set({ ingredientes }, { merge: true })`).
5. `--dry-run` por defecto / `--force`. Idempotente. Resumen: recetas tocadas, ingredientes
   pasados a `false` (cuentan), ingredientes confirmados `true` (opcionales reales),
   ejemplos antes/después. Listar aparte las recetas de origen que no se encontraron en Firestore.

## Criterios de aceptación (evidencia)

- Dry-run: pegar el resumen (debería tocar las recetas con `opcional` string, p.ej. albóndigas).
- Tras `--force` + reload: abrir **Albóndigas rápidas de carne** → la carne cuenta; proteína
  realista (~30–40 g/porción) y cobertura acorde (los "para chicos"/"aparte" siguen sin contar).
- En el detalle, la carne/huevo/cebolla **ya no** figuran como "(opcional)"; los hidratos
  "para chicos" sí siguen marcados opcionales.
- `npm run build` sin errores.

## Qué NO tocar

- NO `src/lib/macros.ts` (el guard `=== true` de E11.3.3 ya es correcto y suficiente una vez
  el dato esté bien).
- NO el catálogo / `macros.json`. NO otros campos de la receta que no sean `opcional`/`notas`.
- NO borrar ni reemplazar el script de E11.3.3 (quedan ambos; este ataca el caso boolean-true
  re-derivando desde la fuente).

## Cierre

- Commit: `Fix E11.3.4: re-derivar opcional desde recetas.json (notas seedeadas como true)`.
- Actualizá `docs/MAPEO_FIRESTORE.md` (§1.2 entrada E11.3.4).
- `npm run build && firebase deploy --only hosting`. Correr el script con `--force`. `git push`.
