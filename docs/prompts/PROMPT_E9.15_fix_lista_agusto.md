# PROMPT E9.15 — Fix regresión "a gusto" en la lista de compras

> Numeración **tentativa** (E9.x). Renumerar según convención del repo antes de commitear.
> Anclaje: diagnóstico **E9.15 ya corrido** (D1 = SÍ, datos íntegros; D4 = bug en `compras.ts:109`).
> **Alcance: SOLO el bug de la lista de compras.** Los macros vacíos quedan **FUERA** — son Stage 11 con datos nunca sembrados (`macros.json` no existe), track aparte.

## Diagnóstico cerrado (recap con evidencia literal del reporte E9.15)
- **D1:** las cantidades están íntegras en Firestore — `cantidad`/`unidad` pobladas, almacenadas como **string** ("2", "200", "400", "1,2"). 310/310 recetas con cantidad. No es regresión de datos.
- **D4:** `compras.ts:109` →
  `const cantidadNum = typeof ing.cantidad === "number" ? ing.cantidad : 0;`
  Como toda cantidad es string, `typeof "2" === "number"` es `false` → `cantidadNum = 0` siempre → `cantidadTotal` suma 0 → `cantidadLabel = "a gusto"` (`compras.ts:160-162`).
- **El parseo correcto ya existe** en `macros.ts:75-87` (commit `6bc3f48`), que lee `ing.cantidad` vía `parseNumber()`. **Nunca se replicó a `compras.ts` → divergencia.** Esa divergencia es la causa raíz: se elimina, no se parchea una línea suelta.

## Decisión de diseño (prevención, no parche)
Extraer un **helper compartido** y que `macros.ts` y `compras.ts` lo usen los dos. Así el mismo campo no vuelve a leerse de dos formas distintas.

```ts
// cantidadNumerica(ing): lógica idéntica a la que hoy vive inline en macros.ts:75-87
// (parseNumber → midpoint si hay min/max → value; fallback a cantidadMin/cantidadMax)
cantidadNumerica(ing: IngredienteEnReceta): number | null
```
- Devuelve `null` cuando no hay cantidad parseable (ej. sal "a gusto" real).
- **macros.ts:** `null` → saltea el ingrediente del cómputo (comportamiento actual, sin cambios funcionales).
- **compras.ts:** `null` → trata como 0 → label "a gusto" (correcto **solo** para ingredientes sin cantidad).

**Efecto colateral esperado:** tras el fix, los únicos ítems "a gusto" serán los genuinamente sin cantidad (sal/pimienta — los 6+79 del traspaso). El "a gusto" masivo desaparece. El tratamiento de esos staples reales (idea "despensa") queda para otro prompt.

## F1 — Diagnóstico de confirmación (read-only, gate)
1. Pegar literal el cuerpo de `agruparPorIdIngrediente()` en `compras.ts` (rango real), confirmando la línea del `typeof ... "number"` y el fallback `"a gusto"`.
2. Pegar literal el bloque de parseo de cantidad de `macros.ts:75-87` y la ubicación/firma de `parseNumber`.
3. Confirmar dónde viven los tests puros de `compras` (agregación con `aportes[]`) y los de `macros`.
4. Confirmar la ubicación propuesta para el helper (ej. `src/lib/cantidades.ts`, o junto a `parseNumber`).

**Reportar literal y esperar `procedé`. No editar nada hasta el procedé.**

## F2 — Implementación (tras procedé)
1. Crear el helper `cantidadNumerica(ing): number | null` con la lógica de `macros.ts:75-87`.
2. **macros.ts:** reemplazar el bloque inline por una llamada al helper, manteniendo `null → skip`. Correr los tests de macros: **deben seguir todos verdes** (la lógica es la misma). Si rompe alguno → **frenar y reportar** (significa que la lógica no era idéntica; no forzar).
3. **compras.ts:** reemplazar
   `typeof ing.cantidad === "number" ? ing.cantidad : 0`
   por `cantidadNumerica(ing) ?? 0`.
4. **Test de regresión (obligatorio):** agregar a la suite pura de `compras`:
   - cantidad como string ("2", "400", "1,2") → `cantidadTotal` suma correcto, `cantidadLabel` ≠ "a gusto";
   - rango ("1,2 a 1,5") → suma midpoint, label correcto;
   - cantidad ausente → `cantidadLabel` = "a gusto" (sigue valiendo para staples reales).

## F3 — Build, deploy y verificación con evidencia literal
1. `npm run build` sin errores → pegar el tail.
2. Suite completa verde → pegar conteo de tests antes/después.
3. `firebase deploy --only hosting`.
4. Verificación en la app (`?v=N` incremental + incógnito): abrir `/compras` con "Pollo a la cazadora" en la semana y **pegar los labels reales** de los ítems. Esperado: "1,2 kg" (pata muslo), "200 g" (champignón), "400 g" (tomate triturado), "150 ml" (vino), etc.; "a gusto" SOLO donde no hay cantidad.

## Commits (separados, prefijo de etapa)
- `refactor: E9.15 extraer cantidadNumerica compartido (macros + compras)`
- `fix: E9.15 lista de compras leía cantidad como number, los datos son string`
- `test: E9.15 regresión de cantidad string en agregación de compras`

## Restricciones
- **Cero escrituras a Firestore.** Es fix de código puro; los datos ya están bien (D1).
- **No tocar** el track de macros-data (`seed-macros.ts` / `macros.json`) — es otro prompt.
- No marcar nada ✅ sin pegar output literal (build, tests, y los labels reales de la app).
