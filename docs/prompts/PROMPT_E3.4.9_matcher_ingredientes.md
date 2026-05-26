# PROMPT_E3.4.9 — Matcher de ingredientes con sugerencias y aprendizaje (§9.6)

## Contexto

El importador de recetas resuelve cada ingrediente tipeado contra el catálogo de
177 ingredientes. Hoy el matcher hace match exacto (contra `canonico`,
`nombrePreferido`, `sinonimos`) y un fuzzy por trigramas con umbral. El problema:

El catálogo es **granular** — tiene "Arroz largo fino", "Arroz jazmín", "Arroz
cocido", pero NO "Arroz" a secas. Cuando el usuario tipea "Arroz" pelado, el match
exacto falla y el fuzzy no llega al umbral (la similitud entre "arroz" y "arroz
largo fino" es baja). Resultado: el importador dispara "+ Nuevo" y se crea un
ingrediente genérico duplicado — ya pasó: existe `ING-0178 "Arroz"` con
`ambiguo: true`, creado exactamente así.

Esta etapa cierra la deuda **§9.6 del MAPEO** — el "importador con loop humano que
aprende sinónimos".

## Qué se quiere lograr

Cuando el matcher no encuentra match exacto, en vez de saltar directo a "+ Nuevo":
1. Busca **sugerencias** — ingredientes del catálogo que probablemente sean lo
   que el usuario quiso decir.
2. Se las muestra a JP. JP elige una, o decide crear uno nuevo igual.
3. Cuando JP elige una sugerencia, el sistema **aprende**: agrega el término que
   JP tipeó como sinónimo del ingrediente elegido. La próxima importación de ese
   término lo resuelve solo.

## Decisiones de diseño (tomadas en chat con JP — no abrir a debate)

| # | Decisión | Resumen |
|---|---|---|
| 1 | Sugiere, JP decide | Ante un término sin match exacto, el matcher muestra sugerencias. JP elige una variante, o crea uno nuevo igual si insiste. El sistema NUNCA decide solo. |
| 2 | Búsqueda en dos pasadas | (1) Por palabra: el término aparece como palabra en el nombre del ingrediente. (2) Fuzzy como respaldo, para typos. |
| 3 | Orden por uso | Las sugerencias se ordenan por `vecesUsado` descendente — la variante más usada primero. |
| 4 | Top 3 + "ver más" | Se muestran las 3 primeras sugerencias. Si hay más, un control "ver más" las despliega. |
| 5 | Aprendizaje de sinónimo | Cuando JP elige una sugerencia para resolver un término X, X se agrega al array `sinonimos` del ingrediente elegido (normalizado). |

## Cómo funciona el matcher rediseñado — algoritmo

Dado un `textoTipeado` (lo que el usuario escribió para un ingrediente):

**Paso 1 — match exacto (como hoy).**
Normalizar el texto. Buscar coincidencia exacta contra `canonico`,
`nombrePreferido` y cada `sinonimos[]` (normalizados) de los 177 ingredientes.
Si hay → resultado `exacto`, resuelto, sin intervención de JP.

**Paso 2 — sugerencias por palabra.**
Si no hubo exacto: tokenizar el texto tipeado en palabras. Un ingrediente es
**sugerencia por palabra** si alguna palabra del texto tipeado aparece como
palabra en su `nombrePreferido` o `canonico` (no como substring suelto —
"arroz" matchea "Arroz largo fino" pero la idea es palabra completa, para no
traer ruido). Ejemplo: "Arroz" → sugiere "Arroz largo fino", "Arroz jazmín",
"Arroz cocido". NO sugiere "Galletas de arroz" si se exige que sea palabra
relevante — aunque "arroz" aparezca ahí. **Decisión de implementación a reportar
en el diagnóstico:** cómo distinguir "el ingrediente es una variante de lo que
pedí" vs "solo comparte una palabra". Una heurística razonable: que la palabra
tipeada sea la primera palabra del nombre del ingrediente, o que el texto
tipeado sea prefijo del nombre. Code propone y JP confirma.

**Paso 3 — fuzzy como respaldo.**
Si el paso 2 no trae suficientes sugerencias (o ninguna), correr el fuzzy por
similitud (el que ya existe — trigramas) para cubrir typos ("arros" → "arroz...").
Las sugerencias fuzzy se suman a las del paso 2, sin duplicar.

**Paso 4 — ordenar y recortar.**
Unir las sugerencias de los pasos 2 y 3. Ordenar por `vecesUsado` descendente
(la más usada primero). Devolver todas, pero la UI muestra solo las 3 primeras
+ "ver más".

**Resultado del matcher** — tres casos posibles:
- `exacto` — un ingrediente, resuelto.
- `sugerencias` — lista ordenada de candidatos (≥1). JP elige.
- `nuevo` — ni exacto ni sugerencias. Va al alta de ingrediente nuevo.

## El aprendizaje — agregar sinónimo

Cuando JP, en la pantalla del importador, elige una sugerencia (ej. elige
"Arroz largo fino" para su texto tipeado "Arroz"):
- Antes de guardar la receta, llamar a `agregarSinonimo(idIngredienteElegido,
  textoTipeado)` — la función ya existe (`src/data/ingredientes.ts`, de E3.4.6).
- El término se normaliza y se agrega al array `sinonimos` si no estaba.
- Invalidar el cache del catálogo (ya lo hace `agregarSinonimo`).
- Efecto: la próxima vez que se importe "Arroz", el Paso 1 (match exacto) lo
  encuentra como sinónimo de "Arroz largo fino" — sin volver a preguntar.

**Importante:** el aprendizaje solo ocurre cuando JP elige una **sugerencia
existente**. Si JP decide crear un ingrediente nuevo, no hay sinónimo que
aprender (el ingrediente nace nuevo). Si JP elige "ver más" y selecciona una de
las extra, también aprende — el aprendizaje es sobre la elección, no sobre el
top 3.

## Diagnóstico requerido ANTES de codear

1. **Estado actual del matcher.** Abrir `src/lib/matcherIngredientes.ts` (o donde
   viva) y reportar literal: la firma de la función, los tipos de resultado, y
   cómo hace hoy el fuzzy (umbral, trigramas). Confirmar que el resultado hoy es
   `exacto | candidatos | nuevo` o similar.

2. **La pantalla del importador.** Abrir `src/routes/ImportarReceta.tsx`, paso 2
   (resolución de ingredientes). Reportar cómo muestra hoy un ingrediente
   "candidato" y un "nuevo" — qué UI tiene. El rediseño cambia esta pantalla.

3. **`agregarSinonimo` y `vecesUsado`.** Confirmar que `agregarSinonimo` existe y
   su firma. Confirmar que los ingredientes del catálogo tienen `vecesUsado`
   poblado (number) — el orden de sugerencias depende de ese campo. Reportar el
   `vecesUsado` de "Arroz largo fino", "Arroz jazmín", "Arroz cocido".

4. **Heurística de "palabra relevante".** Proponer cómo distinguir una variante
   real ("Arroz largo fino" para "Arroz") de una coincidencia espuria ("Galletas
   de arroz" para "Arroz"). Reportar la propuesta para que JP la confirme ANTES
   de implementar.

Reportar 1-4 en una primera respuesta. JP confirma y después arrancás.

## Cambios al código

### `src/lib/matcherIngredientes.ts`

Reescribir el matcher según el algoritmo de arriba (pasos 1-4). El resultado
`sugerencias` reemplaza/extiende al `candidatos` actual: lista ordenada por
`vecesUsado` desc. La función sigue siendo **pura** — no hace I/O, recibe el
catálogo como parámetro.

### `src/routes/ImportarReceta.tsx`

Paso 2 (resolución de ingredientes), por cada ingrediente del TXT:
- Si el matcher devuelve `exacto` → mostrar resuelto, como hoy.
- Si devuelve `sugerencias` → mostrar las **3 primeras** como opciones
  seleccionables (nombre del ingrediente + su categoría, para desambiguar). Un
  control "ver más" despliega el resto. Más una opción explícita "Crear nuevo
  ingrediente" (decisión 1: JP siempre puede crear uno igual).
- Si devuelve `nuevo` → flujo de alta de ingrediente nuevo, como hoy.

Al confirmar la importación: por cada ingrediente donde JP eligió una sugerencia,
llamar `agregarSinonimo(idElegido, textoTipeado)` antes/junto con el guardado de
la receta.

## Criterios de aceptación con verificación literal

NO basta con reportar ✅. JP verifica en app + Firebase Console.

### A — Sugerencias para término genérico

1. Importar una receta con un ingrediente tipeado "Arroz" (genérico). En el paso
   2, confirmar que NO dispara directo "+ Nuevo": muestra sugerencias.
2. Confirmar que las sugerencias son las variantes de arroz del catálogo
   (largo fino, jazmín, cocido) y NO trae "Galletas de arroz" ni "Vinagre de
   arroz". Pegar las sugerencias que aparecen.
3. Confirmar el orden: la variante con mayor `vecesUsado` primero.

### B — Top 3 + ver más

4. Importar un ingrediente que dispare más de 3 sugerencias (ej. "Aceite" o
   "Queso"). Confirmar que se ven 3 + control "ver más". Tocar "ver más" muestra
   el resto. Reportar qué se ve.

### C — Aprendizaje del sinónimo

5. En la importación del paso 1, elegir "Arroz largo fino" como resolución de
   "Arroz". Completar la importación.
6. Abrir `/ingredientes/{id de Arroz largo fino}` en Firebase Console. Confirmar
   que `sinonimos` ahora contiene "arroz" (normalizado). Pegar el array literal.
7. **Importar otra receta** que vuelva a tipear "Arroz". Confirmar que esta vez
   el matcher lo resuelve como `exacto` (vía el sinónimo aprendido) — NO vuelve a
   mostrar sugerencias. Este es el test del "loop que aprende".

### D — Fuzzy respaldo (typos)

8. Importar un ingrediente con un typo (ej. "Aror" o "arros"). Confirmar que el
   fuzzy lo cubre y sugiere las variantes de arroz igual. Reportar.

### E — JP crea nuevo igual

9. Importar un ingrediente genérico, ver las sugerencias, pero elegir "Crear
   nuevo ingrediente". Confirmar que se permite (decisión 1) y que el ingrediente
   nuevo se crea con el modelo correcto (3 dimensiones, sin `seccionDefault`).

### F — Match exacto sin cambios

10. Importar un ingrediente con nombre exacto del catálogo (ej. "Aceite de
    oliva"). Confirmar que resuelve directo como `exacto`, sin pasar por
    sugerencias. Sin regresión.

## Edge cases a documentar en código

1. **Sin sugerencias ni exacto**: si un término no matchea nada (ni palabra ni
   fuzzy), el resultado es `nuevo` — flujo de alta. Comportamiento esperado.

2. **`vecesUsado` empatado o en 0**: si dos sugerencias tienen el mismo
   `vecesUsado`, desempatar alfabético. Si todas están en 0 (catálogo nuevo),
   el orden es alfabético de facto.

3. **JP elige una sugerencia que YA tenía el término como sinónimo**: idempotente
   — `agregarSinonimo` no duplica. Sin problema.

4. **ING-0178 "Arroz" ya existe**: hoy el catálogo tiene un `ING-0178 "Arroz"`
   genérico (creado por el bug que esta etapa resuelve). NO lo borra este prompt
   — JP decide aparte si lo elimina o lo deja. Mencionarlo: una vez que el
   aprendizaje funcione, ese genérico queda como residuo a limpiar manualmente.

## Patrón a respetar

Igual que las etapas anteriores: spread condicional para campos opcionales en
escrituras a Firestore, sin `undefined` ni `?? null`.

## Cambios al MAPEO_FIRESTORE.md

Bump del MAPEO (correlativo a la última versión — v1.5.8 fue el re-seed, este
sería el siguiente).

- Documentar el matcher rediseñado: algoritmo de 4 pasos, resultado
  `exacto | sugerencias | nuevo`.
- Documentar el aprendizaje de sinónimos (loop humano de §9.6).
- Marcar la deuda **§9.6 como resuelta**.
- Changelog de la versión.

## Convención de commits

- Código: `Stage 3.4.9: ingredient matcher with suggestions + synonym learning`
- Doc: `Docs: MAPEO (matcher 9.6 resolved)`
