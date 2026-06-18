# PROMPT E3.4.27 — Seed recetario "tanda 17 · Peruana (completar)" (8 recetas + 1 ingrediente)

Completa la cocina **Peruana** (tenía Ceviche de corvina y Tiradito de salmón). **8 recetas nuevas**, low-carb (sin papa en lomo saltado/seco/huancaína; espesados con nueces en vez de pan).

## Archivos (en `scripts/seed-data/`)
- `recetas_tanda17.json` — 8 recetas.
- `ingredientes_nuevos_tanda17.json` — 1 ingrediente nuevo.

## Contenido
Ají de gallina low-carb (Aves), Lomo saltado sin papas (Vacuna), Pollo a la brasa al horno (Aves), Anticuchos de carne (Vacuna), Seco de res (Vacuna), Choros a la chalaca (Entrada, Mariscos), Crema huancaína (Entrada, Vegetal), Pescado a lo macho (Pescado).
- **Desglose:** `tipoItem` Receta principal ×6, Entrada ×2. Proteína Vacuna ×3, Aves ×2, Mariscos ×1, Vegetal ×1, Pescado ×1. Todas `hidratos: false`, `paraJuanPablo: true`.
- **Con lácteos (2):** Ají de gallina (crema), Crema huancaína (queso fresco + crema). Las otras 6 `sinLacteos: true`.
- **Ingrediente nuevo (1):** Ají amarillo en pasta (`Hierba y especia` → `Almacen / secos`).
- **Reúso:** `pollo cocido desmenuzado`, `nueces`, `mejillones`, `calamares limpios`, `pimenton ahumado` (sustituye al ají panca).

## Diagnóstico antes del `procedé` (D1–D3)
- **D1 — Forma del modelo** contra `src/types/models.ts`.
- **D2 — Enums.** `tipoItem` ∈ {Receta principal, Entrada}; `proteinaPrincipal` ∈ {Vacuna, Aves, Mariscos, Vegetal, Pescado}; `costoEstimado` ∈ {Bajo, Medio, Medio/Alto}; `dificultad` ∈ {Baja, Media}.
- **D3 — Referencias sin resolver.** Confirmá **0** (72 refs, 71 a catálogo vivo + 1 a ají amarillo). Si tu catálogo ya tiene un `aji amarillo`, usalo y no lo dupliques.

> **GATE:** D1–D3 ok → reporte y **esperá `procedé`**.

## Backup → Ejecución
Export a `scripts/backups/E3.4.27_*_<ts>.json`. Cloná `seedRecetarioTanda16.ts` a **`seedRecetarioTanda17.ts`** (paths `*_tanda17.json`). Sin `alternativas`.

## Validación (F4)
1. `F2: 1 creado` (o 0) y `F3: 8 creadas`.
2. `/biblioteca`: estilo **Peruana** (quedan 10 con ceviche + tiradito previos); **sin lácteos** muestra 6.
3. Abrí: **Lomo saltado sin papas** (`aji amarillo`, arroz de coliflor opcional), **Ají de gallina** (`sinLacteos: false`, nueces), **Anticuchos** (Receta principal, parrilla).
4. Re-corré: 0 creados.

## Reglas
- Nada antes del `procedé`; solo-alta. Commit: `feat: E3.4.27 seed recetario tanda 17 peruana (8 recetas + 1 ingrediente)`.
