# PROMPT E11.3.2 — Fix macros: lee `ing.cantidad` (no `cantidadMin/Max`)

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> Bug post-deploy de E11.3: la tarjeta de macros muestra **"Sin datos de macros para esta
> receta todavía"** en **todas** las recetas (incluida una seed como Bondiola), aunque el
> catálogo `/ingredientes` ya tiene `macros` (verificado en la consola de Firestore) y el
> seed de E11.2 se corrió con `--force`.

## Diagnóstico (ya hecho — causa raíz confirmada)

`macrosDeReceta()` en `src/lib/macros.ts` calcula la cantidad de cada ingrediente desde
`ing.cantidadMin` / `ing.cantidadMax`:

```ts
const cantidad = ing.cantidadMin != null && ing.cantidadMax != null
  ? (ing.cantidadMin + ing.cantidadMax) / 2
  : (ing.cantidadMin ?? 0);
const gramos = aGramos(cantidad, ing.unidad ?? null, cat);
if (gramos === null || gramos === 0) { sinDatos.push(ing.textoOriginal); continue; }
```

Pero los `IngredienteEnReceta` reales **no** guardan `cantidadMin`/`cantidadMax`: guardan
el campo **`cantidad`** (string `"1,2 a 1,5"` o number `2`) + `unidad`. Ejemplo real
(seed Bondiola, `scripts/seed-data/recetas.json`):

```json
{ "idIngrediente": "ING-0031", "cantidad": "1,2 a 1,5", "unidad": "kg",        ... }
{ "idIngrediente": "ING-0043", "cantidad": 2,            "unidad": "unidades", ... }
```

Como `cantidadMin` es `undefined` → `cantidad = 0` → `aGramos(0, …) = 0` → **todos** los
ingredientes caen en `sinDatos` → `cobertura = 0` → estado vacío en toda receta. El
catálogo, el seed, el cache (probado en incógnito) y los `idIngrediente` están **todos
bien**; el helper lee el campo equivocado. Los 5 tests de E11.1 pasaban porque el fixture
usaba `cantidadMin/Max`, que el dato real no tiene.

## Tarea 1 — `src/lib/macros.ts`: parsear `ing.cantidad`

1. Reemplazá el cálculo de `cantidad` por un parseo de **`ing.cantidad`** (`string | number | undefined`):
   - `number` → usar tal cual.
   - `string` → normalizar coma decimal (`"1,2"` → `1.2`); extraer los números; si es un
     **rango** (`"1,2 a 1,5"`, `"2-3"`, `"2 a 3"`) → **promediar**; un solo número → ese valor.
   - vacío / `"c/n"` / `"a gusto"` / `"cantidad necesaria"` / no numérico → `null`
     (se cuenta como `sinDatos`, que es el comportamiento correcto).
   - Si `ing.cantidad` es `null`/`undefined` pero existen `cantidadMin`/`cantidadMax`,
     usalos como **fallback** (no romper datos que sí los tengan).
2. Si ya hay un parser de cantidades/números en `src/lib/parsers.ts`
   (`parseNumber`, `parseRango`, etc.), **reusalo** en vez de duplicar lógica.
3. Si el parseo devuelve `null` → push a `sinDatos` y `continue` (igual que hoy con gramos null).

## Tarea 2 — `src/lib/conversiones.ts`: confirmar unidades en plural

Los datos usan unidades en **plural** (`"unidades"`, `"dientes"`, `"cucharadas"`). Verificá
que `normalizarUnidad()` (usado por `aGramos`) las mapee a su forma canónica
(`unidad`, `diente`, `cda`, …). Si alguna no normaliza → `aGramos` devuelve `null` y ese
ingrediente se pierde silenciosamente. Si falta algún plural común, agregalo al normalizador
(E5.3). No cambies los factores de gramos ya existentes.

## Tarea 3 — Tests

Actualizá `src/lib/macros.test.ts` para que el fixture use el campo **`cantidad`** (como el
dato real), no `cantidadMin/Max`. Agregá casos: cantidad numérica, rango `"X a Y"` con coma
decimal, y `"a gusto"` (→ sinDatos). Que `npm run test` quede verde.

## Criterios de aceptación (capturas / evidencia)

- Abrir **Bondiola** (receta seed): la tarjeta muestra hidratos netos + secundarios con
  números reales y **cobertura > 0** (no el estado vacío).
- Una receta con ingredientes `"a gusto"` o sin macros en catálogo: cobertura **parcial**
  (pie en tono warn) o estado vacío correcto — sin números engañosos.
- `npm run build` y `npm run test` sin errores.

## Qué NO tocar

- NO el componente `MacrosCard.tsx` (la UI está bien; el bug es de cálculo).
- NO los datos del catálogo (E11.2) ni `macros.json`.
- NO los factores de gramos en `conversiones.ts` (solo agregar plurales si faltan).

## Cierre

- Commit: `Fix E11.3.2: macros lee ing.cantidad (no cantidadMin/Max) — la tarjeta estaba
  vacía en todas las recetas`.
- Actualizá `docs/MAPEO_FIRESTORE.md` (§1.2 con una entrada E11.3.2 anotando el fix).
- `npm run build && firebase deploy --only hosting`. `git push`.
