# PROMPT E3.4.23 — Seed recetario "tanda 13 · Estadounidense" (10 recetas, 0 ingredientes nuevos)

Octava cocina del plan "10 por cocina" — la primera de las dos "de cero". **10 clásicos estadounidenses** adaptados a low-carb (BBQ con eritritol en vez de azúcar, rebozados de almendra, sin pan ni bollo). **No tiene ingredientes nuevos**: todo referencia el catálogo vivo, incluida `alita de pollo` (ya en catálogo) y `chorizo` (Tanda 12).

Mismo flujo y forma de modelo. **Solo-alta e idempotente.**

## Archivos (ponelos en `scripts/seed-data/`)
- `recetas_tanda13.json` — 10 recetas.
- (No hay `ingredientes_nuevos_tanda13.json` con contenido: 0 nuevos. Si tu harness espera el archivo, pasá `[]`.)

## Contenido
Ribs de cerdo BBQ sin azúcar (Cerdo), Alitas Buffalo (Entrada, Aves), Pulled pork (Cerdo), Meatloaf low-carb (Vacuna), Sloppy joes sin pan (Vacuna), Pollo frito sureño low-carb (Aves), Philly cheesesteak en plato (Vacuna), Cobb salad (Entrada, Aves), Jambalaya de coliflor (Mariscos), Coleslaw low-carb (Guarnición, Vegetal).
- **Desglose:** `tipoItem` Receta principal ×7, Entrada ×2, Guarnición ×1. Proteína Aves ×3, Vacuna ×3, Cerdo ×2, Mariscos ×1, Vegetal ×1. Todas `hidratos: false`, `paraJuanPablo: true`.
- **Con lácteos (4):** Alitas Buffalo (manteca), Pollo frito sureño (yogur en la marinada), Philly cheesesteak (provoleta), Cobb salad (queso). Las otras 6 son `sinLacteos: true`.

## Diagnóstico antes del `procedé` (D1–D3)
- **D1 — Forma del modelo.** Verificá `recetas_tanda13.json` contra `src/types/models.ts`. Reportá discrepancias antes de tocar.
- **D2 — Enums.** Confirmá válidos: `tipoItem` ∈ {Receta principal, Entrada, Guarnición}; `proteinaPrincipal` ∈ {Aves, Vacuna, Cerdo, Mariscos, Vegetal}; `costoEstimado` ∈ {Bajo, Medio, Medio/Alto}; `dificultad` ∈ {Baja, Media}.
- **D3 — Referencias sin resolver.** Confirmá **0 referencias sin resolver** (93 refs, todas a catálogo vivo, 0 nuevos). Dependencias a chequear que existan: `alita de pollo` (alitas Buffalo), `chorizo` (Tanda 12, jambalaya), `provoleta` (philly), `sriracha` (Buffalo), `pollo cocido desmenuzado` (cobb), `yemas de huevo` (coleslaw). Si `chorizo` no está (porque la Tanda 12 no se sembró aún), avisá — es la única dependencia cruzada nueva.

> **GATE:** con D1–D3 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.23_*_<ts>.json`.

## Ejecución
Cloná `seedRecetarioTanda12.ts` a **`scripts/seedRecetarioTanda13.ts`** cambiando el path de recetas a `recetas_tanda13.json` y dejando la lista de nuevos vacía (`[]`). Todo igual. Sin `alternativas`. Un opcional (champiñón en philly) → `opcional: true`.

## Validación (F4)
1. Consola: `F2: 0 creados` y `F3: 10 creadas …`.
2. En `/biblioteca`: filtran por estilo **Estadounidense**; `tipoItem` **Receta principal** (7); proteína **Vacuna** (3) y **Aves** (3). El filtro **sin lácteos** muestra 6.
3. Abrí 3: **Ribs de cerdo BBQ sin azúcar** (eritritol en la salsa), **Jambalaya de coliflor** (`chorizo` + langostinos + pollo, arroz de coliflor), **Coleslaw low-carb** (`tipoItem: Guarnición`).
4. Re-corré el script: saltea todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Commit: `feat: E3.4.23 seed recetario tanda 13 estadounidense (10 recetas)`.
