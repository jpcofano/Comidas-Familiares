# PROMPT E3.4.19 — Seed recetario "tanda 9 · Mexicana" (10 recetas + 1 ingrediente)

Sexta tanda del plan "10 clásicos por cocina". Mexicana tenía cochinita pibil y tinga; esta suma **10 nuevos**. Adaptados a low-carb (sin tortilla → lechuga/se omite; sin azúcar en el mole → chocolate 85%) y conseguibles acá (el chipotle de la Tanda 2 cubre el ahumado/picante).

Mismo flujo y forma de modelo. **Solo-alta e idempotente.**

## Archivos (ponelos en `scripts/seed-data/`)
- `recetas_tanda9.json` — 10 recetas.
- `ingredientes_nuevos_tanda9.json` — 1 ingrediente nuevo.

## Contenido
- **Sin lácteos (8):** Carne asada (Vacuna), Fajitas de pollo (Aves), Carnitas (Cerdo), Pollo en mole sin azúcar (Aves), Camarones a la diabla (Mariscos), Guacamole (Conserva, Vegetal), Pico de gallo (Conserva, Vegetal), Sopa azteca sin tortilla (Entrada, Vegetal — queso opcional).
- **Con lácteos (2):** Chiles rellenos de queso (Vegetal), Rajas con crema (Guarnición, Vegetal).
- **Desglose:** `tipoItem` Receta principal ×6, Conserva ×2, Guarnición ×1, Entrada ×1. Proteína Vegetal ×5, Aves ×2, Vacuna/Cerdo/Mariscos ×1. Todas `hidratos: false`, `paraJuanPablo: true`.
- **Ingrediente nuevo (1):** Morrón verde (`Verdura` → `Verduleria`).
- **Reúso:** `chipotle` (Tanda 2) en mole, camarones a la diabla y sopa azteca; `mozzarella` (Tanda 4) en chiles rellenos.

## Diagnóstico antes del `procedé` (D1–D4)
- **D1 — Forma del modelo.** Verificá `recetas_tanda9.json` contra `src/types/models.ts`. Reportá discrepancias antes de tocar.
- **D2 — Enums.** Confirmá válidos: `tipoItem` ∈ {Receta principal, Conserva, Guarnición, Entrada}; `proteinaPrincipal` ∈ {Vacuna, Aves, Cerdo, Mariscos, Vegetal}; `costoEstimado` ∈ {Bajo, Medio, Alto}; `dificultad` ∈ {Baja, Media, Media-alta} (el mole es Media-alta).
- **D3 — Ingrediente nuevo.** Reportá si **`morron verde`** ya existe (probable que el seed de góndolas E3.4.11 lo tenga; el script lo saltea). Lo definí `categoria: "Verdura"`, `seccionGondola: "Verduleria"`. Además: chiles rellenos usa el canónico **`mozzarella`** (Tanda 4) — confirmá que el canónico vivo sea ese y no "muzzarella", para no duplicar.
- **D4 — Referencias sin resolver.** Confirmá **0 referencias sin resolver** (90 refs: 89 a catálogo vivo + 1 a morrón verde). Todo lo demás referencia canónicos ya vivos (entraña, palta, chipotle, langostinos, bondiola de cerdo entera, pollo en tiras, tomate, cebolla morada, cilantro, cacao/chocolate 85%, etc.).

> **GATE:** con D1–D4 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.19_*_<ts>.json`.

## Ejecución
Cloná `seedRecetarioTanda8.ts` a **`scripts/seedRecetarioTanda9.ts`** cambiando solo los dos paths de input a `*_tanda9.json`. Todo igual. Sin `alternativas`. Opcionales: queso en sopa azteca y ají picante en guacamole/pico de gallo → `opcional: true`.

## Validación (F4)
1. Consola: `F2: 1 creado …` (o 0 si ya existía) y `F3: 10 creadas …`.
2. En `/biblioteca`: filtran por estilo **Mexicana**; `tipoItem` **Receta principal** (6); proteína **Vegetal** (5). El filtro **sin lácteos** muestra 8.
3. Abrí 3: **Pollo en mole sin azúcar** (chocolate 85% + chipotle, `dificultad: Media-alta`), **Chiles rellenos de queso** (mozzarella, `sinLacteos: false`), **Guacamole** (`tipoItem: Conserva`).
4. Lista de compras con **Fajitas de pollo** → **morrón verde** en **Verduleria**.
5. Re-corré el script: saltea todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Commit: `feat: E3.4.19 seed recetario tanda 9 mexicana (10 recetas + 1 ingrediente)`.
