# PROMPT E11.3.3 — Fix `opcional` (notas en vez de boolean) + guard en macros

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> Segundo bug de macros (post E11.3.2): la tarjeta ya calcula, pero da números absurdos
> (ej. albóndigas: 70 kcal, 0.1 g proteína, "2 de 4 ingredientes"). Causa de fondo: el
> campo `opcional` de los ingredientes de receta guarda **strings (notas)**, no booleanos,
> y el helper de macros saltea cualquier `opcional` truthy.

## Diagnóstico (causa raíz confirmada)

En los docs de receta, los `ingredientes[]` tienen `opcional` con **texto** (notas mal
mapeadas en el seed), no `true/false`. Ejemplo real (receta "Albóndigas rápidas…", seed,
`fuente: ChatGPT`):

```json
{ "idIngrediente": "ING-0039", "textoOriginal": "Carne picada",     "cantidad": 800, "unidad": "g",  "opcional": "Picada especial" }
{ "idIngrediente": "ING-0085", "textoOriginal": "Huevo",            "cantidad": 1,   "unidad": "unidad", "opcional": "Ayuda a ligar" }
{ "idIngrediente": "ING-0043", "textoOriginal": "Cebolla",          "cantidad": 1,   "unidad": "unidad", "opcional": "Rallada o picada fina" }
{ "idIngrediente": "ING-0160", "textoOriginal": "Tomate triturado", "cantidad": 500, "unidad": "ml", "opcional": "Sin crema" }
{ "idIngrediente": "ING-0111", "textoOriginal": "Orégano",          "cantidad": 1,   "unidad": "cdita", "opcional": "" }
{ "idIngrediente": "ING-0003", "textoOriginal": "Aceite de oliva",  "cantidad": 2,   "unidad": "cdas", "opcional": "" }
```

`macrosDeReceta()` hace `if (ing.opcional) continue;`. Como `"Picada especial"` es un string
truthy, **se saltean la carne, el huevo, la cebolla, el ajo y el tomate**; solo entran los
que tienen `opcional: ""` (falsy): orégano y aceite. Por eso el resultado es básicamente el
aceite (70 kcal / 7.5 g grasa / ~0 proteína). El tipo declara `opcional?: boolean`, así que
el dato está sucio Y el helper confía en truthy.

> Nota: esto afecta a TODA la app, no solo a macros — en el detalle, esos ingredientes con
> nota probablemente se muestran como "(opcional)" siendo principales.

## Tarea 1 — Guard en `src/lib/macros.ts` (inmediato)

Cambiá la condición de salteo para que respete solo booleanos reales:

```ts
// antes:  if (ing.opcional) continue;
if (ing.opcional === true) continue;
```

Con esto, los ingredientes con nota-string dejan de saltearse y entran al cálculo. No toques
el resto del helper.

## Tarea 2 — Script de limpieza de datos `scripts/fix-opcional-ingredientes.ts`

Nuevo script (Admin SDK, mismo patrón que los otros `scripts/*.ts`) que normaliza el campo
`opcional` de los `ingredientes[]` de **todas** las recetas:

Para cada ingrediente de cada receta:
- Si `opcional` es **boolean** → dejar como está.
- Si `opcional` es **string**:
  - `""` o solo espacios → `opcional = false` (no tocar `notas`).
  - texto que sea una marca de opcionalidad (`"Sí"`, `"si"`, `"No"`, `"true"`, `"false"`)
    → convertir a boolean con la lógica de `parseSiNo` y limpiar.
  - cualquier otro texto (es una **nota**, ej. "Picada especial") → **moverlo a `notas`**
    (si ya hay `notas`, anteponer/concatenar con `" · "` sin perder lo existente) y setear
    `opcional = false`.
- Si `opcional` es `undefined`/`null` → dejar (queda implícitamente no-opcional).

Requisitos del script:
- `--dry-run` por defecto (imprime un resumen: recetas tocadas, ingredientes migrados,
  ejemplos antes/después); `--force` escribe.
- Escribe el doc actualizando **solo el array `ingredientes`** (reconstruido) con merge;
  no toca otros campos de la receta.
- Idempotente: correr dos veces no cambia nada la segunda vez.
- Resumen final: N recetas revisadas / M ingredientes migrados a `notas` / K convertidos a boolean.

## Tarea 3 — Tests

- En `src/lib/macros.test.ts`, agregá un caso: un ingrediente con `opcional` = string no
  vacío (nota) **debe contar** en macros (no saltearse); con `opcional: true` debe saltearse.
- Si el script tiene lógica pura extraíble (la función de normalización), testeala:
  string-nota → `{opcional:false, notas:"…"}`; `"Sí"` → `{opcional:true}`; `""` → `{opcional:false}`.

## Criterios de aceptación (capturas / evidencia)

- Correr `scripts/fix-opcional-ingredientes.ts` en `--dry-run` y pegar el resumen.
- Tras `--force` + deploy: abrir **Albóndigas rápidas de carne** → la tarjeta muestra
  proteína realista (~30–40 g/porción) y cobertura **4 de 4** (o la que corresponda según
  ingredientes con macros). El aceite ya no domina el cálculo.
- En el detalle, esos ingredientes ya **no** aparecen como "(opcional)".
- `npm run build` y `npm run test` sin errores.

## Qué NO tocar

- NO `MacrosCard.tsx` ni `conversiones.ts` ni los datos del catálogo / `macros.json`.
- NO cambies la semántica de ingredientes legítimamente opcionales (los que ya son `true`).
- El script solo normaliza `opcional`/`notas`; no toca `cantidad`, `unidad`, `idIngrediente`, etc.

## Cierre

- Commits: `Fix E11.3.3: opcional como boolean (notas → campo notas) + guard en macros`.
- Actualizá `docs/MAPEO_FIRESTORE.md` (§1.2 entrada E11.3.3: el campo `opcional` traía notas;
  script de limpieza + guard `=== true`).
- `npm run build && firebase deploy --only hosting`. Corré el script con `--force`. `git push`.
