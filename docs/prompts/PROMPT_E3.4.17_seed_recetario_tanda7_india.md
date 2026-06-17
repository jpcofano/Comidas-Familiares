# PROMPT E3.4.17 — Seed recetario "tanda 7 · India" (10 recetas + 0 ingredientes)

Cuarta tanda del plan "10 clásicos por cocina". India tenía rogan josh y pollo tikka; esta suma **10 clásicos nuevos**. Lácteos solo donde el clásico lo pide (yogur/crema/manteca); los curries costeros y de vinagre van sin lácteos. Adaptados a low-carb (sin papa/arvejas, sin harinas; salsas espesadas con cebolla, tomate, almendra o coco).

Mismo flujo y forma de modelo. **Solo-alta e idempotente.**

## Archivos (en `scripts/seed-data/`)
- `recetas_tanda7.json` — 10 recetas.
- `ingredientes_nuevos_tanda7.json` — vacío (`[]`); todos los ingredientes ya existen en el catálogo.

## Contenido
- **Sin lácteos (5):** Vindaloo de cerdo (Cerdo), Keema de carne (Vacuna), Langostinos al curry de coco (Mariscos), Baingan bharta (Guarnición, Vegetal), Dal de lentejas (Guarnición, Legumbres).
- **Con lácteos (5):** Butter chicken (Aves), Pollo tandoori (Aves), Palak paneer (Vegetal), Cordero korma (Cordero), Raita de pepino (Entrada, Vegetal).
- **Desglose:** `tipoItem` Receta principal ×8, Guarnición ×1, Entrada ×1. Proteína Vegetal ×3, Aves ×2, Cerdo/Vacuna/Cordero/Mariscos/Legumbres ×1. `paraJuanPablo: true` en todas.
- **`hidratos`:** todas `false` **salvo Dal de lentejas** (`hidratos: true`, es legumbre — igual criterio que el hummus). Es intencional.
- **`hidratoOpcional: "Arroz de coliflor"`:** Butter chicken, Vindaloo, Keema, Cordero korma, Langostinos (los 5 que naturalmente van con arroz).
- **Dal:** usa `canon: "lenteja seca"` (ya existe en catálogo; `textoOriginal: "Lentejas"`).
- **Palak paneer:** usa `canon: "queso fresco"` como paneer (ya existe; `textoOriginal: "Queso fresco"`).
- **Ingredientes nuevos:** 0.

## Diagnóstico antes del `procedé` (D1–D4)
- **D1 — Forma del modelo.** Verificá `recetas_tanda7.json` contra `src/types/models.ts`.
- **D2 — Enums.** Confirmá válidos: `tipoItem` ∈ {Receta principal ×8, Guarnición ×1, Entrada ×1}; `proteinaPrincipal` ∈ {Aves, Vegetal, Cerdo, Vacuna, Cordero, Mariscos, Legumbres}; `costoEstimado` ∈ {Bajo, Medio, Medio/Alto, Alto}; `dificultad` ∈ {Baja, Media}.
- **D3 — Ingredientes nuevos vs catálogo.** Ninguno nuevo (archivo vacío). Verificá que `lenteja seca` y `queso fresco` existan en catálogo vivo.
- **D4 — Referencias sin resolver.** 37 canónicos únicos; todos deben existir en catálogo pre-seed (0 escritura nueva). Confirmá **0 referencias sin resolver**.

> **GATE:** con D1–D4 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.17_*_<ts>.json`.

## Ejecución
Cloná `seedRecetarioTanda6.ts` a **`scripts/seedRecetarioTanda7.ts`** cambiando solo los dos paths de input a `*_tanda7.json` y la etiqueta de backup a `E3.4.17`. Todo igual (admin SDK, idempotencia por canónico / `nombreCanonico`, resolución `canon → idIngrediente` en runtime, `REC-XXXX`/`ING-XXXX`, timestamps). Sin `alternativas`. Un opcional (ají picante en baingan bharta) → `opcional: true`.

## Validación (F4)
1. Consola: `F2: 0 creados` y `F3: 10 creadas …`.
2. En `/biblioteca`: filtran por estilo **India**; `tipoItem` **Receta principal** (8); proteína **Aves** (2), **Legumbres** (1). El filtro **sin lácteos** muestra 5 (vindaloo, keema, langostinos, baingan, dal).
3. Abrí 3: **Dal de lentejas** (`hidratos: true`, `proteinaPrincipal: Legumbres`, `lenteja seca`), **Butter chicken** (yogur+crema, `hidratoOpcional: "Arroz de coliflor"`), **Palak paneer** (`queso fresco`, `sinLacteos: false`).
4. Re-corré el script: saltea todo (0 creados, 10 ya existían).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Discrepancia con `models.ts` → reportar antes de tocar.
- Commit: `feat: E3.4.17 seed recetario tanda 7 india (10 recetas + 0 ingredientes)`.

---

### Próximas cocinas (mismo molde)
Mexicana · Japonesa · Española (redondeo) · Estadounidense · Tailandesa/Coreana/Peruana/Árabe (completar) · Alemana.
