# PROMPT_E3.4.5 — Normalización de unidades (fix de agrupado de compras)

## Contexto

JP detectó un bug en la lista de compras: el mismo ingrediente aparece **dos veces**
como ítems separados. Captura real — bajo la sección "MATERIA GRASA":

```
Aceite de oliva   2 cda
Aceite de oliva   2 cdas
```

Deberían ser **un solo ítem** con dos aportes (uno de cada receta). No lo son
porque la lista de compras agrupa ítems por la clave `(idIngrediente, unidad)`,
y la unidad llegó como `"cda"` en un aporte y `"cdas"` en el otro. Strings
distintos → claves distintas → dos ítems en vez de uno.

### La causa raíz está en TRES capas

Un diagnóstico sobre los seeds reales (78 recetas, catálogo de 194 ingredientes,
`/config/diccionarios`) mostró que esto NO es solo el aceite:

**Capa 1 — el diccionario canónico está mal definido.**
`/config/diccionarios.unidadesCanonicas` hoy contiene:
```
["g", "kg", "ml", "l", "unidad", "unidades", "cda", "cdta", "taza", "pizca", "gusto"]
```
Tiene `"unidad"` Y `"unidades"` como dos entradas distintas — la inconsistencia
plural/singular está en la *definición* misma. Además usa `"cdta"`, pero las
recetas reales usan `"cdita"` (88 ocurrencias). El enum nunca fue coherente.

**Capa 2 — las 78 recetas tienen unidades sin normalizar.**
Inventario real de `recetas[].ingredientes[].unidad` (78 recetas):

| unidad cruda | ocurrencias | | unidad cruda | ocurrencias |
|---|---|---|---|---|
| `cdas` | 103 | | `taza` / `tazas` | 12 / 9 |
| `g` | 99 | | `diente` / `dientes` | 6 / 11 |
| `unidad` / `unidades` | 91 / 68 | | `punado` | 6 |
| `null` | 90 | | `kg` | 5 |
| `cdita` / `cditas` | 88 / 2 | | `ramita` / `ramas` | 4 / 1 |
| `cda` | 38 | | `grande` / `grandes` | 3 / 1 |
| `ml` | 25 | | varios sueltos | 1 c/u |
| `pizca` | 17 | | | |

Sueltos (1 ocurrencia cada uno): `hojas`, `rama o cdita`, `bifes`, `atado`,
`cdita/diente`, `latas`, `lata`, `cup`, `cantidad necesaria`, `fetas`.

**Capa 3 — el catálogo `/ingredientes` replicó la basura.**
13 ingredientes tienen `unidadesHabituales` con variantes plural/singular
conviviendo: ING-0003, ING-0004, ING-0012, ING-0020, ING-0021, ING-0073,
ING-0098, ING-0109, ING-0113, ING-0136, ING-0145, ING-0169, ING-0184.
Ejemplo: ING-0098 (Limon) → `["unidad","cdas","unidades","cdita","cda"]`.

## Pre-requisito

E3.4.4 cerrada (auto-estado de planes + limpieza al cocinar, MAPEO v1.5.1).

## Decisiones de diseño (tomadas en chat con JP — no abrir a debate)

| # | Decisión | Resumen |
|---|---|---|
| 1 | Forma canónica | **Singular, minúscula, sin acento.** Ej. `cda`, `cdita`, `diente`, `taza`, `unidad`, `g`, `kg`, `ml`, `pizca`. |
| 2 | Una sola fuente de verdad | Toda la normalización vive en una función `normalizarUnidad(raw)`. No se repite lógica en ningún lado. |
| 3 | "A gusto" → `null` | Las unidades-basura (`cantidad necesaria`, `rama o cdita`, `cdita/diente`) y los condimentos sin medida se normalizan a `null`. La UI las muestra como "a gusto". |
| 4 | Unidades raras pero válidas se conservan | `bife`, `feta`, `hoja`, `atado`, `ramita` son unidades reales distintas — se conservan, solo se pasan a singular. NO se colapsan entre sí. |
| 5 | Migración de recetas + catálogo | La migración normaliza `recetas[].ingredientes[].unidad` (78 recetas) y `unidadesHabituales[]` del catálogo (194 ingredientes). |
| 6 | Lista de compras se regenera, no se migra | La lista de compras actual NO se migra ítem por ítem. Se borra y se re-sincroniza con la sync ya corregida. Decisión por seguridad — JP es único tester. Reversible. |
| 7 | Dry-run obligatorio | La migración corre primero en modo dry-run y reporta el diff completo. JP lo aprueba ANTES de cualquier escritura a Firestore. |

## Tabla de normalización canónica

Esta es la tabla que `normalizarUnidad` debe implementar. **Code debe pegar esta
tabla tal cual como mapa en el código** y no inventar mapeos extra.

| Entrada(s) cruda(s) | Salida canónica |
|---|---|
| `cda`, `cdas` | `cda` |
| `cdita`, `cditas`, `cdta` | `cdita` |
| `unidad`, `unidades`, `u` | `unidad` |
| `taza`, `tazas`, `cup` | `taza` |
| `diente`, `dientes` | `diente` |
| `rama`, `ramas` | `rama` |
| `ramita`, `ramitas` | `ramita` |
| `grande`, `grandes` | `grande` |
| `lata`, `latas` | `lata` |
| `bife`, `bifes` | `bife` |
| `feta`, `fetas` | `feta` |
| `hoja`, `hojas` | `hoja` |
| `g`, `kg`, `ml`, `l`, `pizca`, `punado`, `atado` | igual (ya canónicas) |
| `null`, `""`, `cantidad necesaria`, `rama o cdita`, `cdita/diente` | `null` |
| cualquier otra cosa no listada | `null` + `console.warn` |

Notas:
- La función debe ser **case-insensitive y trim-safe**: `"  Cdas "` → `cda`.
- `punado` se deja tal cual (sin ñ) por coherencia con la data existente. NO
  introducir `puñado`: sería un cambio no pedido.
- El caso "cualquier otra cosa" debe loguear `console.warn("[unidad] no reconocida:", raw)`
  para que aparezcan en consola unidades nuevas que no contemplamos.

## Cambios al modelo / config

### `/config/diccionarios` — campo `unidadesCanonicas`

Reemplazar el array actual por la lista canónica correcta (sin plurales, sin `cdta`):

```
["g", "kg", "ml", "l", "unidad", "cda", "cdita", "taza", "pizca",
 "punado", "diente", "rama", "ramita", "grande", "lata", "bife", "feta",
 "hoja", "atado"]
```

Esto se actualiza vía consola Firebase o script admin (igual que el resto de
`/config/diccionarios`). Anotar en el reporte el valor final escrito.

## Cambios al código

### Nueva función `normalizarUnidad`

Crear en el módulo de helpers que corresponda según la convención del repo
(diagnóstico 1 abajo pide reportar dónde viven los helpers). Firma:

```typescript
/**
 * Normaliza una unidad cruda a su forma canónica (singular, minúscula).
 * Devuelve null para unidades "a gusto", vacías o no reconocidas.
 */
export function normalizarUnidad(raw: string | null | undefined): string | null
```

Implementa la tabla de normalización canónica de arriba. Es una función pura,
sin side effects salvo el `console.warn` del caso no reconocido.

### Clave de agrupado en la sync de compras (`src/data/compras.ts`)

En `sincronizarListaDesdeFirestore` (o donde se construya la clave de agrupado
de ítems): la clave hoy es `(idIngrediente, unidad)` con la unidad cruda.
Cambiarla para que use `normalizarUnidad(unidad)`:

```typescript
const unidadCanonica = normalizarUnidad(ing.unidad);
const claveAgrupado = `${ing.idIngrediente}__${unidadCanonica ?? "agusto"}`;
```

Con esto, `"cda"` y `"cdas"` colapsan a la misma clave → un solo ítem con dos
aportes. El campo `unidad` que se guarda en el ítem de compras también debe ser
la unidad canónica, no la cruda.

**Importante sobre los aportes:** cada `aporte` dentro de `aportes[]` conserva
su `textoOriginal` intacto (lo que escribió el cocinero — eso NO se toca, es
información). Lo que se normaliza es el campo `unidad` que se usa como clave y
para el `cantidadLabel` del ítem agrupado.

### Migración única — `recetas` + catálogo

Script admin (en `scripts/` o donde el repo tenga sus scripts de seed/migración).
Dos fases:

**Fase A — dry-run (default).** Recorre las 78 recetas y los 194 ingredientes,
calcula la unidad normalizada de cada `recetas[].ingredientes[].unidad` y de cada
entrada de `unidadesHabituales[]`, y reporta SIN ESCRIBIR:
- Por cada receta que cambia: `idReceta`, `textoOriginal` del ingrediente,
  `unidad` cruda → `unidad` normalizada.
- Por cada ingrediente del catálogo que cambia: `idIngrediente`, `unidadesHabituales`
  antes → después (deduplicado tras normalizar).
- Conteo total: cuántas recetas tocadas, cuántos ítems de ingrediente tocados,
  cuántos ingredientes del catálogo tocados.
- Lista de unidades crudas que cayeron en el caso "no reconocida" (deberían ser 0
  si la tabla está completa — si aparece alguna, JP decide antes de seguir).

**Fase B — escritura (solo con flag explícito, ej. `--apply`).** Aplica los
cambios en un batch por colección. `unidadesHabituales[]` se deduplica después
de normalizar (ej. `["cdas","cda"]` → `["cda"]`).

El script NO toca `/compras` ni `/planes`.

## Diagnóstico requerido ANTES de codear

(Patrón establecido desde E3.4.3: diagnóstico primero, JP confirma, después fix.)

1. **Convención de helpers.** Reportar dónde viven hoy las funciones helper puras
   del repo (`src/lib/`, `src/utils/`, `src/data/`...) para ubicar `normalizarUnidad`
   de forma coherente.

2. **Clave de agrupado actual.** Abrir `src/data/compras.ts` y reportar literal
   las líneas donde se construye la clave de agrupado de ítems en la sync.
   Confirmar que hoy usa la unidad cruda sin normalizar.

3. **Confirmar el bug en Firestore.** Abrir `/compras/{idLista}/items/` de la lista
   actual y reportar los dos ítems de aceite de oliva: pegar el `id`, el campo
   `unidad`, y el `idIngrediente` de cada uno. Confirmar que `idIngrediente` es el
   mismo (ING-0004) y `unidad` difiere (`cda` vs `cdas`). Si `idIngrediente` también
   difiere, el bug es otro — avisar a JP antes de seguir.

Reportar 1-3 en una primera respuesta. JP confirma y después arrancás.

## Orden de ejecución (importante)

1. Diagnóstico 1-3 → JP confirma.
2. Implementar `normalizarUnidad` + actualizar clave de agrupado en `compras.ts`.
3. Correr la migración en **dry-run** → JP revisa el diff completo y lo aprueba.
4. Solo con OK de JP: correr la migración con `--apply`.
5. Actualizar `/config/diccionarios.unidadesCanonicas`.
6. JP borra la lista de compras actual y re-sincroniza.
7. Verificación literal A-E.

NO correr la migración con `--apply` sin la aprobación del dry-run.

## Criterios de aceptación con verificación literal

NO basta con reportar ✅. JP verifica personalmente en Firebase Console + app.

### A — Función pura `normalizarUnidad`

1. Reportar la salida de la función para esta batería de entradas, una por una:
   `"cdas"` → `cda`; `"Cdas "` → `cda`; `"cdta"` → `cdita`; `"unidades"` → `unidad`;
   `"cup"` → `taza`; `"dientes"` → `diente`; `"ramas"` → `rama`; `"cantidad necesaria"` → `null`;
   `"cdita/diente"` → `null`; `null` → `null`; `"litros"` (no listada) → `null` + warn.

### B — Migración dry-run

2. Pegar el reporte completo del dry-run: conteo de recetas / ítems / ingredientes
   de catálogo afectados, y la lista de unidades "no reconocidas" (debe ser vacía).
3. Confirmar que el dry-run NO escribió nada: reabrir una receta cualquiera en
   Firebase Console y verificar que su `unidad` sigue cruda.

### C — Migración aplicada

4. Tras `--apply`: abrir 3 recetas que el dry-run marcó como afectadas y pegar el
   `unidad` de los ingredientes tocados — debe estar en forma canónica.
5. Abrir el catálogo: ING-0004 (Aceite de oliva) `unidadesHabituales` debe ser
   `["cda"]` (deduplicado). ING-0098 (Limon) debe ser `["unidad","cda","cdita"]`
   o equivalente sin duplicados. Pegar el valor literal de ambos.
6. Abrir `/config/diccionarios` y pegar el campo `unidadesCanonicas` final.

### D — Agrupado correcto en compras

7. Borrar la lista de compras actual y re-sincronizar (crear un plan o re-disparar
   la sync). Abrir `/compras/{idLista}/items/` y confirmar: existe **un solo** ítem
   de Aceite de oliva (ING-0004). Pegar su `id`, su `unidad`, y `aportes.length`.
8. Abrir ese ítem en la app, vista por receta: debe mostrar el desglose de aportes
   (ej. "2 cda para Receta X" / "2 cda para Receta Y"), no dos ítems separados.
   Confirmar que el desglose por receta se ve igual que antes del bug.

### E — Sin regresión en otras unidades

9. En la lista re-sincronizada, recorrer las secciones y confirmar que no quedó
   ningún otro ingrediente partido en dos por unidad (buscar nombres repetidos).
   Reportar: ¿hay algún ingrediente que aparezca dos veces? (esperado: no).

## Edge cases a documentar en código

1. **`unidad` null en receta**: 90 ingredientes (sal, pimienta, condimentos a gusto)
   tienen `unidad: null`. `normalizarUnidad(null)` → `null`. En el agrupado, la
   clave usa `"agusto"` como sufijo. Dos ingredientes "a gusto" del mismo
   `idIngrediente` se agrupan juntos. Correcto.

2. **Aporte con unidad ya canónica**: la función es idempotente. Correr la
   migración dos veces no cambia nada la segunda vez.

3. **Ítem de compra manual**: si JP agregó un ítem a mano con una unidad cruda,
   `normalizarUnidad` lo cubre igual porque la sync normaliza en la clave. No
   requiere tratamiento especial.

4. **Unidad nueva en import futuro**: si en una importación futura aparece una
   unidad no listada en la tabla, cae en `null` + `console.warn`. Eso es una
   señal para JP de que hay que ampliar la tabla. Documentar este comportamiento.

## Patrón a respetar

Igual que E3.4.3 / E3.4.4: spread condicional para campos opcionales, sin
`undefined` ni `?? null` en escrituras a Firestore.

## Cambios al MAPEO_FIRESTORE.md

Bump a **v1.5.2** (patch sobre v1.5.1 de E3.4.4). Cambios:

- **§6.1** (ingredientes sumables): documentar que la clave de agrupado usa
  `normalizarUnidad(unidad)`, no la unidad cruda. La regla "si unidad difiere no
  sumamos" sigue valiendo, pero ahora "difiere" se evalúa sobre la forma canónica.
- **§2.5** (Compras): documentar que el campo `unidad` del ítem es siempre canónico.
- **§2.2** (Recetas): aclarar que `ingredientes[].unidad` es canónico post-migración;
  `textoOriginal` queda crudo (es la fuente humana, no se normaliza).
- **Diccionario `unidadesCanonicas`** (sección de `/config/diccionarios`):
  reemplazar la lista vieja por la nueva. Anotar que la vieja era inconsistente.
- Agregar entrada de changelog v1.5.2 describiendo la normalización de unidades.

## Convención de commits

- Código: `Stage 3.4.5: unit normalization in shopping list grouping`
- Data/migración: `Data: normalize units in recipes + ingredient catalog`
- Doc: `Docs: MAPEO v1.5.2 (unit normalization)`
