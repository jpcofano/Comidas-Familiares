# PROMPT E9.15 — Diagnóstico: regresión de cantidades (lista "a gusto" + macros vacíos) — read-only

> Numeración **tentativa** (E9.x). Renumerar según convención del repo antes de commitear.
> Anclaje: reportado por JP el 18/06/2026 con captura de `/compras`. **Dos síntomas con una sola causa raíz sospechada.**

## Contexto / síntomas
1. **Lista de compras**: en "Pollo a la cazadora" (4 porc, 12 ingredientes) **todos** los ítems salen con sufijo `- a gusto` — incluido "Pata muslo de pollo", "Cebolla", "Tomate triturado". No es el caso conocido de sal/pimienta: son ingredientes que en la semilla tenían cantidades concretas (ej. pollo 800 g).
2. **Macros**: "Sin datos de macros para esta receta todavía." en (aparentemente) todas las recetas. Los macros **se computan a partir de los ingredientes** (cantidad × nutrición del catálogo) — feature ya construido y que funcionaba.

**Hipótesis**: ambos dependen de la `cantidad`/`unidad` de cada `IngredienteEnReceta`. Si ese campo dejó de leerse (código) o se perdió (datos), la lista cae al fallback "a gusto" y los macros no se pueden calcular. **Es una regresión, no un feature inexistente.**

## Objetivo
Diagnóstico **read-only**. Determinar si la causa es **código** (read path roto / campo renombrado) o **datos** (cantidades borradas por una migración). **No escribir, no migrar, no revertir nada.** Reportar evidencia literal y esperar `procedé`.

## Fase de diagnóstico

### D1 — PRUEBA DECISIVA: dato crudo en Firestore (código vs datos)
- Localizar el doc de "Pollo a la cazadora" en `recetas` (por `nombre` exacto; si no resuelve, prefix-range `>= "Pollo a la cazadora"` / `< "Pollo a la cazadorb"`).
- Pegar **literal** el array `ingredientes[]` (o el nombre real del campo) para **al menos 3** ingredientes (pollo, cebolla, tomate triturado), mostrando **todas las claves** de cada ref tal como están en Firestore.
- Responder explícito: ¿existen `cantidad` y `unidad` (o como se llamen) **con valores no vacíos** en cada ref? **SÍ / NO.**

### D2 — Alcance en el universo
- Sobre las 308 recetas reales (excluir los 2 ítems sintéticos de `comprasRapidas` sin `porcionesMin`): contar cuántas tienen **al menos un** ingrediente con cantidad numérica `> 0`.
- Reportar el conteo. (≈308 → datos OK, regresión de código. ≈0 o bajo → regresión de datos.)

### D3 — Read path de MACROS
- Localizar la función/util que computa macros (grepear `macro`, `kcal`, `calorias`, `nutricion`, `proteinas`, `carbohidratos`, `hidratos`, `grasas`).
- Reportar: **qué campo de la ref** lee como cantidad, y **qué campo del ingrediente de catálogo** lee como nutrición (ej. `kcal100`, `proteinas100`...). Pegar la firma de la función y el bloque de lectura.
- Contar cuántos de los **354 ingredientes** del catálogo tienen esos campos nutricionales poblados. Pegar el shape de **1** ingrediente del catálogo con sus campos de nutrición.

### D4 — Read path de la LISTA (`src/data/compras.ts` y la pantalla `/compras`)
- Localizar dónde se arma el label del ítem y de dónde saca `cantidad`/`unidad`.
- Localizar el string literal `a gusto`: ¿es un **fallback** cuando la cantidad viene vacía/0? Pegar el fragmento exacto.

### D5 — Sospechosos de regresión (git)
- `git log` (últimas ~3 semanas) de: el archivo de modelos (`models.ts`), `compras.ts`, y el util de macros.
- Reportar cualquier commit que **renombre** el campo de cantidad/unidad o cambie el shape de `IngredienteEnReceta`, y cualquier migración/re-map que haya reescrito `recetas/*/ingredientes` (candidatos: cadena E9.x de desync, re-seed del catálogo).

## Salida esperada (mapa de decisión)
- **D1 = SÍ (cantidad presente en datos)** → regresión de **código**. Próximo paso: fix del read path (campo renombrado / util roto). No toca producción.
- **D1 = NO (cantidad ausente en datos)** → regresión de **datos**. Próximo paso: identificar la migración culpable (D5) y plan de restauración desde `textoOriginal` o desde el seed JSON / export-snapshot. Toca producción → gate estricto.

## Restricciones
- **Read-only.** Cero escrituras a Firestore. Cero cambios de código. Cero revert.
- No marcar nada ✅ sin pegar el output literal (regla del proyecto: Code sobre-reporta éxito).

**No avanzar a fix. Esperar `procedé` de JP tras revisar la evidencia, ya con el camino (código o datos) definido.**
