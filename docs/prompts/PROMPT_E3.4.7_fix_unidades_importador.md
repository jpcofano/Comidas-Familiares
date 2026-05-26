# PROMPT_E3.4.7 — Fix: normalizar unidades en el importador de recetas

## Contexto

E3.4.5 introdujo `normalizarUnidad()` (`src/lib/unidades.ts`) y normalizó las 78
recetas seed + el catálogo. Pero el importador de recetas (E3.4.6) se construyó
en paralelo y **no usa `normalizarUnidad()`**: cuando JP importa una receta nueva,
la unidad que escribió en el TXT entra cruda a Firestore (`cdas`, `dientes`,
`unidades`, etc.).

Resultado: **cada receta importada reintroduce el bug de unidades** que E3.4.5
arregló. Una receta importada con "2 cdas de aceite" entra con `unidad: "cdas"`,
y al sincronizar la lista de compras se agrupa mal — el mismo bug del aceite
duplicado que disparó toda la saga de E3.4.5.

Este es un fix chico y acotado: hacer que el importador pase las unidades por
`normalizarUnidad()` antes de guardar.

## Alcance

- **Solo de acá en adelante.** Las recetas que ya se hayan importado con unidad
  cruda NO se migran (decisión de JP — si hay recetas de prueba sucias, se borran
  a mano). El fix es solo en el flujo del importador.
- No se toca la migración de E3.4.5, ni las 78 recetas seed, ni el catálogo.
- Es un fix de una sola pieza: el punto donde el importador arma la unidad del
  ingrediente.

## Pre-requisito

E3.4.5 cerrada (`normalizarUnidad()` existe en `src/lib/unidades.ts`).
E3.4.6 cerrada (importador funcionando).

## Diagnóstico requerido ANTES de codear

1. **Dónde se arma la unidad.** Abrir `src/import/parseReceta.ts` y reportar
   literal: ¿dónde se asigna el campo `unidad` de cada ingrediente parseado?
   (la interfaz `ParsedIngredienteRaw` tiene `unidad: string`). Pegar las líneas.

2. **Dónde se construye el `IngredienteEnReceta` final.** Abrir
   `src/routes/ImportarReceta.tsx` (paso 3, el guardado). Reportar dónde se
   construye el array `ingredientes: IngredienteEnReceta[]` que va a `crearReceta`.
   Confirmar si la `unidad` que se escribe viene directo del parseo crudo.

3. **Confirmar que `normalizarUnidad` está disponible.** Verificar que
   `src/lib/unidades.ts` exporta `normalizarUnidad` y se puede importar desde el
   módulo de import. Reportar la firma.

4. **Tipo de `unidad` en el modelo.** Confirmar en `src/types/models.ts` el tipo
   del campo `unidad` de `IngredienteEnReceta`: ¿es `string` o `string | null`?
   `normalizarUnidad` devuelve `string | null` (null = "a gusto"). Si el modelo
   exige `string`, reportar — hay que decidir cómo se guarda el caso "a gusto"
   (probablemente igual que en las recetas seed normalizadas: confirmar cómo
   quedó ahí tras E3.4.5).

Reportar 1-4 en una primera respuesta. JP confirma y después arrancás.

## Cambio requerido

**Un solo punto de cambio.** Donde el importador arma la `unidad` del ingrediente
que se va a guardar (según lo que revele el diagnóstico — idealmente en
`parseReceta.ts` al construir cada `ParsedIngredienteRaw`, o en `ImportarReceta.tsx`
al construir el `IngredienteEnReceta` final):

```typescript
import { normalizarUnidad } from "../lib/unidades";  // ajustar path

// donde hoy se hace algo como: unidad: campoUnidadCrudo
// pasa a:
unidad: normalizarUnidad(campoUnidadCrudo)
```

Reglas:
- La normalización se aplica a la unidad que se **guarda** en el doc de receta.
- El `textoOriginal` del ingrediente NO se toca — sigue siendo lo que escribió
  JP, crudo. (Mismo criterio que E3.4.5: `textoOriginal` es la fuente humana.)
- El campo `unidad` que ve JP en el paso 2 del importador (la pantalla de
  resolución de ingredientes) puede seguir mostrando lo que escribió — o mostrar
  la versión normalizada. Decisión menor: preferible mostrar la normalizada para
  que JP vea lo que realmente se va a guardar. Si es trivial, hacerlo; si
  complica, dejar el display crudo y solo normalizar al guardar.
- Coherencia con el caso "a gusto": si `normalizarUnidad` devuelve `null`,
  guardar la `unidad` igual que quedó en las recetas seed tras E3.4.5 (confirmar
  en diagnóstico punto 4 — probablemente se omite la clave o se guarda `null`).

**Único punto de cambio.** No tocar la lógica del matcher de ingredientes, ni el
parseo del resto de campos, ni el flujo de 3 pasos. Solo la unidad.

## Criterios de aceptación con verificación literal

NO basta con reportar ✅. JP verifica en app + Firebase Console.

### A — Unidad plural se normaliza

1. Importar una receta de prueba con un ingrediente que use unidad en plural —
   ej. en el TXT: `Principal | Aceite de oliva | | 2 | cdas | No |`.
2. Completar el flujo de importación hasta guardar.
3. Abrir el doc de la receta nueva en Firebase Console. Buscar ese ingrediente
   en `ingredientes[]`. Confirmar: `unidad: "cda"` (normalizado), NO `"cdas"`.
   Pegar el shape del ingrediente.
4. Confirmar que `textoOriginal` del mismo ingrediente quedó crudo (lo que
   escribió JP, sin normalizar).

### B — Varias unidades distintas

5. En la misma receta de prueba o en otra, usar ingredientes con `dientes`,
   `unidades`, `tazas`. Tras importar, confirmar en Firestore que quedaron
   `diente`, `unidad`, `taza`. Pegar los valores.

### C — Caso "a gusto"

6. Importar un ingrediente con unidad vacía o "a gusto" (ej. sal). Confirmar que
   se guarda igual que en las recetas seed normalizadas (según diagnóstico 4).

### D — La receta importada agrupa bien en compras

7. Crear un plan con la receta de prueba importada (la del paso 1, con el aceite).
   Sincronizar la lista de compras. Si hay otra receta en la lista que también
   use aceite de oliva, confirmar que **se agrupan en un solo ítem** — el bug del
   aceite duplicado NO se reproduce con recetas importadas.
8. Reportar: en `/compras/{idLista}/items/`, ¿el aceite de oliva aparece una sola
   vez? (esperado: sí).

### E — Sin regresión en el importador

9. Confirmar que el resto del flujo del importador sigue funcionando: parseo,
   matcher de ingredientes (exacto/candidatos/nuevo), creación de la receta. Una
   importación completa de punta a punta sin errores.

## Edge cases a documentar en código

1. **Unidad no reconocida**: si JP escribe en el TXT una unidad que no está en la
   tabla de `normalizarUnidad`, la función devuelve `null` + `console.warn`. Eso
   es correcto — la receta se importa con esa unidad como "a gusto" y el warn
   queda como señal de que hay que ampliar la tabla. Documentar.

2. **Unidad ya canónica**: si JP escribe "cda" (ya singular), `normalizarUnidad`
   la devuelve igual. Idempotente. Sin problema.

## Patrón a respetar

Igual que E3.4.x: spread condicional para campos opcionales, sin `undefined` ni
`?? null` en escrituras a Firestore.

## Cambios al MAPEO_FIRESTORE.md

Bump menor (v1.5.7 o el correlativo que siga a v1.5.6).

- En la sección del importador (§1.2.nonies o donde E3.4.6 quedó documentado):
  anotar que el importador normaliza unidades con `normalizarUnidad()` al guardar.
- Cerrar la deuda técnica: si en el MAPEO figura anotado "el importador entra
  unidades sin normalizar" como pendiente, marcarlo resuelto.
- Changelog de la versión.

## Convención de commits

- Código: `Stage 3.4.7: normalize units in recipe importer`
- Doc: `Docs: MAPEO v1.5.7 (importer unit normalization)`
