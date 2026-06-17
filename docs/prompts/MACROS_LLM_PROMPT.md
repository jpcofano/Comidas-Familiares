# Prompt LLM — Macros nutricionales por ingrediente (E11.2)

**Instrucciones de uso:**
1. Corré `npx ts-node --esm scripts/export-ingredientes-para-macros.ts` y copiá la lista generada.
2. Pegá este prompt en tu LLM de preferencia, seguido de la lista.
3. Guardá la respuesta JSON como `scripts/seed-data/macros.json`.
4. Corré `npx ts-node --esm scripts/seed-macros.ts --dry-run` para revisar.
5. Si todo ok, corré con `--force`.

---

## Prompt para el LLM

Tenés una lista de ingredientes de cocina argentina. Para CADA uno, necesito los **valores nutricionales por 100 g de producto listo para usar** (o seco, si es un ingrediente que se usa seco como harina o arroz). Usá valores típicos del mercado argentino.

**Reglas estrictas:**

1. Devolvé **ÚNICAMENTE** un array JSON válido. Sin prosa, sin explicaciones, sin markdown, sin bloques de código, sin backticks. Solo el JSON.

2. Cada elemento del array tiene exactamente estas claves:
   - `"idIngrediente"`: string exacto de la lista (ej. `"ING-0001"`) — no inventar IDs.
   - `"kcal"`: número entero, kilocalorías por 100 g.
   - `"carbohidratos"`: número con hasta 1 decimal, g de carbohidratos **totales** por 100 g.
   - `"proteinas"`: número con hasta 1 decimal, g de proteínas por 100 g.
   - `"grasas"`: número con hasta 1 decimal, g de grasas totales por 100 g.
   - `"fibra"`: número con hasta 1 decimal, g de fibra dietaria por 100 g (puede ser 0).
   - `"gramosPorUnidad"` (**SOLO** si la unidad habitual es de conteo, no de peso/volumen): gramos que pesa **1 unidad** de ese ingrediente. Ejemplo: 1 huevo ≈ 55 g, 1 diente de ajo ≈ 5 g. Si se mide en g/kg/ml/l, **omitir esta clave**.

3. Reglas de validación que el script verificará — respetarlas:
   - `carbohidratos`, `proteinas`, `grasas`, `fibra` en [0, 100].
   - `kcal` en [0, 900].
   - `fibra` ≤ `carbohidratos`.
   - Consistencia calórica: `4×carbohidratos + 4×proteinas + 9×grasas ≈ kcal` (±30%).

4. Ingredientes con categoría **Utensilio** (ej. palitos de brochette) → **omitir del array**.

5. Si no estás seguro de un valor, dá tu mejor estimación con base en productos equivalentes. NO inventes un `idIngrediente` que no esté en la lista.

6. Los datos son **estimaciones** que JP revisará antes de escribirlas. No necesitan ser perfectas, solo razonables.

**Formato exacto esperado:**
```
[{"idIngrediente":"ING-0001","kcal":105,"carbohidratos":0,"proteinas":23,"grasas":1.5,"fibra":0},
 {"idIngrediente":"ING-0002","kcal":862,"carbohidratos":0,"proteinas":0,"grasas":100,"fibra":0,"gramosPorUnidad":55},
 ...]
```

---

## Lista de ingredientes (pegar la salida de export-ingredientes-para-macros.ts acá)

<!-- Pegá aquí la lista generada por el script -->
