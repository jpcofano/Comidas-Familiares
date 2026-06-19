# PROMPT E9.12 — Alcance del desync de `idIngrediente` (READ-ONLY)

> **Por qué:** en **Cochinita pibil**, `idIngrediente` apunta a canónicos equivocados (`ING-0192` → "paleta" en vez de pasta de achiote; `ING-0193` → "osobuco" en vez de jugo de lima). El `textoOriginal` es correcto; los IDs no. Firma de una **reasignación de IDs**, probablemente el update masivo de ingredientes (E9.0).
>
> La auditoría E3.4.13 dio "0 huérfanas" y era correcta: esos IDs **existen**, solo que resuelven a otro ingrediente. El chequeo de huérfanas nunca compara contenido. Hay que medir el alcance **antes de tocar nada**.
>
> **Alcance:** solo lectura. Output = script + conteos + muestra **pegados literal**. NO corregir. Esperar `procedé`. El fix (re-resolver `idIngrediente` desde `textoOriginal`/`canon`) sale en prompt aparte.

---

## D1 — Blast radius

Para **cada receta** y **cada ref** de `ingredientes[]`:
1. Resolvé `idIngrediente` → `canonico` actual del catálogo.
2. Compará contra el `textoOriginal` (normalizado: minúsculas, sin palabras de preparación) de la ref.
3. **Flag mismatch** cuando el `canonico` actual no se corresponde con el `textoOriginal`.

Reportá:
- **Total de refs mal apuntadas** y **# de recetas afectadas** (sobre 308).
- Por receta afectada: `textoOriginal | idIngrediente | canonico_actual_resuelto`.
- Pegá una **muestra literal** (10–15 filas) además del conteo total.

## D2 — Patrón y causa

1. ¿Las recetas afectadas comparten origen (tandas base / pre-E9.0)? Si hay fecha de creación o marcador de seed, agrupá por eso.
2. ¿El rango de `idIngrediente` mal apuntados es **contiguo** (indicio de reasignación en bloque vs. casos sueltos)?

## D3 — Recuperabilidad

1. Confirmá que **todas** las refs afectadas conservan un `textoOriginal` (o `canon`) **utilizable** para re-resolver contra el catálogo actual. Listá las que NO lo tengan (esas serían irrecuperables automáticamente).
2. ¿Existe el mapeo viejo `ID → canonico` para validar la re-resolución? Buscá: historial git del catálogo de ingredientes, y/o los JSON de seed (`recetas_tandaN.json`) que llevan `canon` por ingrediente. Reportá qué hay disponible.

---

## Requisitos

- Cada bloque con su script y su resultado pegados literal; nada de resúmenes sin output.
- No corregir nada. Terminar y esperar `procedé`.
- Con el alcance medido decidimos: fix por re-resolución masiva (`textoOriginal`/`canon` → `idIngrediente` actual, idempotente) vs. casos sueltos.
