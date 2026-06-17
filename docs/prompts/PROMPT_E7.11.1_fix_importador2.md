# PROMPT E7.11 — Fix importador: multi-receta + split de alternativas + subir archivo

Tres cambios en `/biblioteca/importar` sobre v1.8.4: dos bugs reportados y una mejora de UX. Pegué un TXT con **10 recetas** (10 bloques `#RECETA`) y la app creó **una sola receta con 112 pasos** (la concatenación de los pasos de las 10). Además, ingredientes con alternativa como `Calvados o sidra seca` se cargan como un único ingrediente con ese nombre compuesto, que el matcher nunca encuentra en el catálogo.

El prompt LLM (`/config/importador.promptLLM`) y el formato generado están **correctos** — el TXT es canónico. Los dos bugs son del parser, no del formato. No toques el prompt LLM ni el formato.

---

## Reporte previo OBLIGATORIO (no codees todavía)

Antes de tocar nada, devolveme:

1. `parseRecetaTxt` en `src/routes/ImportarReceta.tsx` (o donde viva): firma completa, tipo de retorno, y cómo detecta hoy el bloque `#RECETA`. Confirmá la hipótesis: ¿toma solo el primer `#RECETA` y absorbe el resto?
2. El tipo `IngredienteEnReceta` en `src/types/models.ts` completo. ¿Tiene algún campo para vincular un ingrediente como alternativa de otro (ej. `alternativaDe`, `grupoAlternativa`, o similar)? ¿Tiene `opcional`?
3. Cómo consume el paso 2 (resolver ingredientes) la salida del parser, y cómo el paso 3 (`crearReceta`) arma el doc de receta. Necesito saber si hay un único objeto receta o un array.
4. Si existe algún test de `parseRecetaTxt` (`*.test.ts`).
5. El `RenderPaso1` actual: cómo está hoy el textarea, en qué estado de React vive el texto pegado (`useState`), y dónde está el botón "Parsear". Necesito esto para el upload de archivo (Bug 3).

Esperá mi OK antes de codear. Devolveme archivos completos, no diffs.

---

## Bug 1 — Multi-receta

`parseRecetaTxt` debe pasar de devolver UNA receta a devolver un **array de recetas**.

### Parseo
1. Hacer `split` del TXT por cada ocurrencia de `#RECETA` al inicio de línea. Cada segmento es una receta candidata con su propio `#INGREDIENTES` y `#PASOS`.
2. Procesar cada bloque de forma independiente con la lógica de parseo actual (la de campos, ingredientes, pasos — esa parte ya funciona para un bloque).
3. Si un bloque falla validación (campos obligatorios de §3.5, valores cerrados contra diccionarios, tablas mínimas), **no abortar todo**: saltear ese bloque y seguir con los demás.

### Numeración de pasos
Hoy probablemente asume numeración global. La numeración `nroPaso` reinicia en `1` **dentro de cada receta**. Validá unicidad/numérico de `nroPaso` por receta, no en todo el TXT.

### Flujo de UI (pasos 1→2→3)
- **Paso 1 (parsear):** mostrar cuántas recetas se detectaron. Ej: "Se detectaron 10 recetas." Si alguna falló parseo, listarla con el motivo (igual que el reporte de errores que ya existe).
- **Paso 2 (resolver ingredientes):** el matcher corre sobre **el conjunto unificado de ingredientes de todas las recetas**, deduplicado por nombre canónico (no resolver "Aceite de oliva" 10 veces). Las decisiones de matcheo que tome JP se aplican a todas las recetas que usen ese ingrediente.
- **Paso 3 (guardar):** crear las N recetas **una por una** (confirmado por JP): las que se pueden crear se crean, las que fallan validación o ya existen se reportan, sin abortar el lote. NO transacción todo-o-nada. Anti-duplicado por `nombreCanonico` / `idReceta` **por receta** (una duplicada no bloquea las demás). Reusar `crearReceta` en loop.

**Anti-dup de ingredientes DENTRO de cada receta (no olvidar):** §3.5 del MAPEO dice "no duplicar `(ingredienteCanonico, unidad, categoria)`" dentro de una receta. Hoy esto operaba con una sola receta; al pasar a loop, asegurate de que el anti-dup siga siendo **por receta**, no global entre recetas. Son dos dedups distintas y NO hay que confundirlas:
- **Dedup de matcheo (paso 2, nivel UI):** "Aceite de oliva" se resuelve UNA vez aunque aparezca en las 10 recetas; la decisión de JP se aplica a todas.
- **Anti-dup dentro de receta (§3.5):** si UNA receta lista "Sal" dos veces con misma unidad/categoría, se colapsa — pero "Sal" en la receta 1 y "Sal" en la receta 7 son legítimas y NO se colapsan entre sí.

### Reporte final
Devolver y renderizar el reporte que ya existía conceptualmente en el Apps Script:
- Creadas: `[{ idReceta, nombre }]`
- Duplicadas: `[{ nombre, razon }]`
- Fallidas: `[{ nombre (o "bloque N" si no se pudo leer el nombre), errores: [] }]`

El mensaje de error de una receta debe decir QUÉ campo/validación falló y EN QUÉ receta (por nombre o índice), no un genérico.

---

## Bug 2 — Split de ingredientes alternativos (`X o Y`)

Cuando la columna `ingrediente` contiene el patrón ` o ` (espacio-o-espacio) separando dos alternativas — ej. `Calvados o sidra seca`, `Cerveza negra stout o porter`, `Pera Williams o Anjou`, `Colador fino o paño`, `Plancha o sartén de hierro`:

### Comportamiento (decisión de JP, ya tomada — no preguntar)
1. **Dividir SIEMPRE en dos ingredientes separados**, en TODAS las secciones, incluidos utensilios/descartables. No hay excepción por sección.
2. Los dos quedan vinculados como **alternativos uno del otro** (uno OPCIONAL respecto del otro): no son dos ingredientes a comprar ambos, son "este O el otro".
3. **Automático, sin intervención de JP en el paso 2.** El split ocurre en el parseo; las dos filas ya aparecen divididas y vinculadas cuando se guarda la receta. JP no confirma el split (sí puede resolver el matcheo de cada uno por separado en paso 2 como cualquier ingrediente).

### DÓNDE ocurre el split (confirmado)
El split en dos filas pasa **en el parseo**, generando **dos entradas en `ingredientesRaw`** ya separadas. El matcher corre sobre las dos como filas independientes (cada alternativa puede ser `exacto` / `candidato` / `nuevo` por su cuenta contra el catálogo). El vínculo `alternativas` se arma recién en `handleGuardar`, cuando ya están resueltos los dos `idIngrediente`. NO armar el vínculo antes del matcheo.

### Orden (confirmado)
La "cabeza" del grupo de alternativas es **la primera alternativa que aparece en el TXT** (`Calvados`, no `sidra seca`). No reordenar alfabéticamente ni de ninguna otra forma.

### Implementación del vínculo (confirmado — el campo YA existe)
`IngredienteEnReceta` ya tiene `alternativas?: Array<{ idIngrediente: string }>` (unidireccional). Usalo así, vínculo unidireccional, NO simétrico:
- Fila A (Calvados, la cabeza): `alternativas: [{ idIngrediente: idB }]`, `opcional: true`.
- Fila B (sidra seca, la alternativa): `opcional: true`, SIN `alternativas` (no apunta de vuelta a A).

No agregar `grupoAlternativa` ni `alternativaDe` — el campo existente alcanza.

**Lista de compras (confirmado):** incluir SOLO la primera alternativa (A) en compras, con label visual "(o sidra seca)". El nombre de la alternativa se resuelve por lookup del `idIngrediente` que está en `alternativas`. NO sumar B como ítem independiente. Si esto requiere tocar `src/data/compras.ts` y se complica, marcalo como sub-tarea y avisá antes — puede salir en commit aparte.

### Cuidado con falsos positivos
El patrón ` o ` puede aparecer dentro de un nombre legítimo que NO es alternativa. Revisá el set real (te paso ejemplos): el separador siempre divide dos sustantivos-ingrediente. Casos como "Aceite de oliva" no tienen ` o ` aislado. Andá conservador: dividir solo cuando ` o ` separa dos tokens que ambos parecen nombres de ingrediente, no preposiciones. Si dudás, dividir igual (JP prefiere over-split que under-split) — pero no rompas nombres de una sola palabra.

---

---

## Bug 3 (nueva funcionalidad) — Subir archivo `.txt` directamente

Hoy el paso 1 solo permite **pegar** el TXT en el textarea. Agregar la opción de **subir un archivo `.txt`** directamente, sin tener que abrirlo y copiar/pegar.

### Comportamiento
1. En `RenderPaso1`, agregar un `<input type="file" accept=".txt,text/plain">` (estilado como botón secundario "Subir archivo .txt", coherente con el design system — mirá cómo está el botón "Copiar prompt para LLM"). El textarea para pegar se mantiene: son dos caminos hacia el mismo estado.
2. Al elegir un archivo, leerlo en cliente con `FileReader.readAsText(file, 'utf-8')` y **volcar el contenido en el mismo estado de React** donde hoy vive el texto del textarea. Es decir: subir archivo == pegar. A partir de ahí el flujo es idéntico (botón "Parsear" → `parseRecetaTxt` → pasos 2 y 3). NO crear un segundo code path de parseo.
3. UTF-8 explícito en el `FileReader` (los TXT tienen acentos y `⚠️`). 
4. Validar que sea texto: `accept` filtra en el picker, pero igual chequear que el contenido leído no esté vacío. Si el archivo está vacío o no se pudo leer → mensaje claro, no romper.
5. Mostrar el nombre del archivo cargado (ej. "Cargado: recetas_bondiola.txt") para feedback, y que el textarea quede poblado para que JP pueda revisar/editar antes de parsear si quiere.
6. Es upload **en cliente, en memoria** — NO subir a Firebase Storage ni a ningún lado. Solo leer el texto y meterlo en el estado. Plan Spark, $0, igual que todo lo demás.

### Qué NO hacer
- No agregar drag-and-drop (scope mínimo; si querés lo vemos después).
- No aceptar `.md`, `.docx`, ni otros formatos — solo `.txt` plano.

---

## Tests

Agregá tests de `parseRecetaTxt` que cubran:
1. TXT con 1 receta → array de 1.
2. TXT con 3 recetas → array de 3, numeración de pasos independiente por receta.
3. TXT con 3 recetas donde la del medio tiene un campo obligatorio faltante → array de 2 válidas + 1 en fallidas con motivo.
4. Ingrediente `Calvados o sidra seca` → dos `IngredienteEnReceta`: la cabeza (Calvados) con `alternativas: [{idIngrediente: idSidra}]` y `opcional: true`, la alternativa (sidra) con `opcional: true` y sin `alternativas`.
5. Ingrediente de una palabra sin ` o ` → no se divide.
6. Anti-dup: una receta con "Sal" repetida (misma unidad) → colapsa a una; dos recetas distintas que ambas usan "Sal" → NO se colapsan entre sí.

---

## MAPEO

Actualizá `docs/MAPEO_FIRESTORE.md` en el MISMO commit:
- Bump de versión (v1.8.5, sub-etapa E7.11).
- Entrada en §1.2.x describiendo los tres cambios (multi-receta, split de alternativas, subir archivo .txt).
- Actualizá §3.5 (validaciones del importador) con el comportamiento multi-receta y el split de alternativas.
- Si tocaste `IngredienteEnReceta`, actualizá §2 (modelo de datos) y el shape.
- Cerrá o referenciá esto en §10 si corresponde.

## Qué NO tocar
- El prompt LLM (`/config/importador.promptLLM`) ni el formato del TXT.
- La normalización de unidades (E3.4.7) ni el matcher de ingredientes (E3.4.9) — salvo que el split de alternativas requiera que el matcher reciba dos strings en vez de uno, que es esperable.
- Schemas de planes, historial, menús.

Esperá mi OK al reporte previo antes de codear.
