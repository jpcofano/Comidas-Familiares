# PROMPT E3.4.25 — Seed recetario "tanda 15 · Tailandesa (completar)" (8 recetas + 1 ingrediente)

Completa la cocina **Tailandesa** (tenía solo Curry verde de pescado). **8 recetas nuevas**, low-carb (arroz de coliflor, sin azúcar→eritritol, sin papa en el massaman). Las 8 `sinLacteos: true`.

Mismo flujo y forma de modelo. **Solo-alta e idempotente.**

## Archivos (en `scripts/seed-data/`)
- `recetas_tanda15.json` — 8 recetas.
- `ingredientes_nuevos_tanda15.json` — 1 ingrediente nuevo.

## Contenido
Pollo a la albahaca picante (Pad Krapow) (Aves), Curry rojo de pollo (Aves), Massaman de res low-carb (Vacuna), Tom kha gai (Entrada, Aves), Tom yum de langostinos (Entrada, Mariscos), Ensalada tailandesa de carne / Yam Nua (Entrada, Vacuna), Larb de cerdo (Cerdo), Satay de pollo con salsa de maní (Aves).
- **Desglose:** `tipoItem` Receta principal ×5, Entrada ×3. Proteína Aves ×4, Vacuna ×2, Mariscos ×1, Cerdo ×1. Todas `sinLacteos: true`, `hidratos: false`, `paraJuanPablo: true`.
- **Ingrediente nuevo (1):** Pasta de curry rojo (`Condimento y aderezo` → `Almacen / secos`).
- **Reúso:** `salsa de pescado` y `pasta de curry verde` (Tanda 1), `pasta de mani sin azucar`, `leche de coco`, `aceite de coco`, `albahaca`, `menta`.

## Diagnóstico antes del `procedé` (D1–D3)
- **D1 — Forma del modelo** contra `src/types/models.ts`. Reportá discrepancias.
- **D2 — Enums.** `tipoItem` ∈ {Receta principal, Entrada}; `proteinaPrincipal` ∈ {Aves, Vacuna, Mariscos, Cerdo}; `costoEstimado` ∈ {Bajo, Medio, Medio/Alto}; `dificultad` ∈ {Baja, Media}.
- **D3 — Referencias sin resolver.** Confirmá **0** (77 refs, 76 a catálogo vivo + 1 a pasta de curry rojo). Verificá que `salsa de pescado` y `pasta de mani sin azucar` existan.

> **GATE:** D1–D3 ok → reporte y **esperá `procedé`**.

## Backup → Ejecución
Export a `scripts/backups/E3.4.25_*_<ts>.json`. Cloná `seedRecetarioTanda14.ts` a **`seedRecetarioTanda15.ts`** (paths `*_tanda15.json`). Sin `alternativas`.

## Validación (F4)
1. `F2: 1 creado` (o 0) y `F3: 8 creadas`.
2. `/biblioteca`: filtran por estilo **Tailandesa** (quedan 9 con el curry verde previo); **sin lácteos** muestra las 8.
3. Abrí: **Massaman de res** (`pasta de curry rojo`), **Tom yum de langostinos** (Entrada), **Satay** (`pasta de mani sin azucar`).
4. Re-corré: 0 creados.

## Reglas
- Nada antes del `procedé`; solo-alta. Commit: `feat: E3.4.25 seed recetario tanda 15 tailandesa (8 recetas + 1 ingrediente)`.
