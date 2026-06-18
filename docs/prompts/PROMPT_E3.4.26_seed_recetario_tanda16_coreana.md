# PROMPT E3.4.26 — Seed recetario "tanda 16 · Coreana (completar)" (8 recetas + 1 ingrediente)

Completa la cocina **Coreana** (tenía solo Bulgogi de res). **8 recetas nuevas**, low-carb (arroz/fideos de coliflor y zucchini, sin azúcar→eritritol). Las 8 `sinLacteos: true`.

## Archivos (en `scripts/seed-data/`)
- `recetas_tanda16.json` — 8 recetas.
- `ingredientes_nuevos_tanda16.json` — 1 ingrediente nuevo.

## Contenido
Bibimbap de coliflor (Vacuna), Dak galbi / pollo picante (Aves), Jeyuk bokkeum / cerdo picante (Cerdo), Galbi a la parrilla (Vacuna), Japchae de zucchini (Guarnición, Vegetal), Sopa de kimchi (Cerdo), Pollo frito coreano (Aves), Huevos al vapor coreanos / Gyeran Jjim (Guarnición, Vegetal).
- **Desglose:** `tipoItem` Receta principal ×6, Guarnición ×2. Proteína Vacuna ×2, Aves ×2, Cerdo ×2, Vegetal ×2. Todas `sinLacteos: true`, `hidratos: false`, `paraJuanPablo: true`.
- **Ingrediente nuevo (1):** Kimchi (`Verdura` → `Almacen / secos`).
- **Reúso:** `gochujang` (Tanda 1), `tofu firme` (Tanda 5), `asado de tira`, `pera`, `aceite de sesamo`, `semillas de sesamo`.

## Diagnóstico antes del `procedé` (D1–D3)
- **D1 — Forma del modelo** contra `src/types/models.ts`.
- **D2 — Enums.** `tipoItem` ∈ {Receta principal, Guarnición}; `proteinaPrincipal` ∈ {Vacuna, Aves, Cerdo, Vegetal}; `costoEstimado` ∈ {Bajo, Medio}; `dificultad` ∈ {Baja, Media}.
- **D3 — Referencias sin resolver.** Confirmá **0** (72 refs, 71 a catálogo vivo + 1 a kimchi). Verificá que `gochujang`, `tofu firme`, `asado de tira` y `pera` existan.

> **GATE:** D1–D3 ok → reporte y **esperá `procedé`**.

## Backup → Ejecución
Export a `scripts/backups/E3.4.26_*_<ts>.json`. Cloná `seedRecetarioTanda15.ts` a **`seedRecetarioTanda16.ts`** (paths `*_tanda16.json`). Sin `alternativas`.

## Validación (F4)
1. `F2: 1 creado` (o 0) y `F3: 8 creadas`.
2. `/biblioteca`: estilo **Coreana** (quedan 9 con el bulgogi previo); **sin lácteos** las 8.
3. Abrí: **Sopa de kimchi** (`kimchi` + `tofu firme`), **Galbi a la parrilla** (`asado de tira` + `pera`), **Bibimbap de coliflor**.
4. Re-corré: 0 creados.

## Reglas
- Nada antes del `procedé`; solo-alta. Commit: `feat: E3.4.26 seed recetario tanda 16 coreana (8 recetas + 1 ingrediente)`.
