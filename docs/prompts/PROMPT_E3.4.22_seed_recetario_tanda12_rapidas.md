# PROMPT E3.4.22 — Seed recetario "tanda 12 · Comida rápida de semana" (20 recetas + 1 ingrediente)

Tanda temática de **comida rápida para la semana** (fácil, pocos pasos, poco tiempo) de pollo, cerdo y vaca. **20 recetas nuevas**, todas `escenarioUso: Cocina rápida` + `pensadaPara: Semana`, tiempo total entre 15 y 35 min, low-carb. Sin repetir lo que ya hay.

Mismo flujo y forma de modelo. **Solo-alta e idempotente.**

## Archivos (ponelos en `scripts/seed-data/`)
- `recetas_tanda12.json` — 20 recetas.
- `ingredientes_nuevos_tanda12.json` — 1 ingrediente nuevo.

## Contenido
- **Pollo (7):** Pollo al limón y ajo, Milanesas de pollo a la almendra al horno, Pollo a la crema y champiñones, Pollo a la mostaza, Brochetas de pollo a la plancha, Pollo salteado con brócoli, Suprema caprese al horno.
- **Cerdo (6):** Medallones de cerdo al limón, Churrasquitos de cerdo a la plancha con chimichurri, Bondiola salteada con morrones, Medallones de cerdo a la crema de hongos, Cerdo salteado con repollo y jengibre, Chorizos a la pomarola.
- **Vaca (7):** Bife a la criolla rápido, Salteado de carne con morrones, Hamburguesas caseras low-carb, Picadillo de carne con verduras, Milanesas de carne a la almendra al horno, Bife a caballo, Entraña a la plancha con limón y ajo.
- **Desglose:** `tipoItem` Receta principal ×20. Proteína Aves ×7, Vacuna ×7, Cerdo ×6. Todas `hidratos: false`, `escenarioUso: "Cocina rápida"`, `pensadaPara: "Semana"`, `paraJuanPablo: true`.
- **Con lácteos (4):** Pollo a la crema y champiñones, Pollo a la mostaza, Suprema caprese al horno, Medallones de cerdo a la crema de hongos. Las otras 16 son `sinLacteos: true`.
- **Ingrediente nuevo (1):** Chorizo (`Carne` → `Carniceria`).

## Diagnóstico antes del `procedé` (D1–D4)
- **D1 — Forma del modelo.** Verificá `recetas_tanda12.json` contra `src/types/models.ts`. Reportá discrepancias antes de tocar.
- **D2 — Enums.** Confirmá válidos: `tipoItem` = Receta principal; `proteinaPrincipal` ∈ {Aves, Cerdo, Vacuna}; `costoEstimado` ∈ {Bajo, Medio, Medio/Alto}; `dificultad` ∈ {Baja, Media}.
- **D3 — Ingrediente nuevo.** Reportá si **`chorizo`** ya existe (el script lo saltea). Lo definí `categoria: "Carne"`, `seccionGondola: "Carniceria"`. Si tu catálogo lo trata como `Fiambre y embutido`, decímelo y lo realineo. No bloqueante.
- **D4 — Referencias sin resolver.** Confirmá **0 referencias sin resolver** (152 refs: 151 a catálogo vivo + 1 a chorizo). Reúsa cortes y verduras ya vivos (pechuga de pollo, solomillo de cerdo, churrasquitos de cerdo, bondiola, cerdo en tiras, bifecitos de cuadril, ojo de bife, entraña, brócoli, morrón verde, mozzarella, etc.).

> **GATE:** con D1–D4 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.22_*_<ts>.json`.

## Ejecución
Cloná `seedRecetarioTanda11.ts` a **`scripts/seedRecetarioTanda12.ts`** cambiando los dos paths de input a `*_tanda12.json`. Todo igual. Sin `alternativas`. **Verificá el conteo: son 20.**

## Validación (F4)
1. Consola: `F2: 1 creado …` (o 0 si ya existía) y **`F3: 20 creadas …`**.
2. En `/biblioteca`: las 20 deberían aparecer al filtrar `pensadaPara` **Semana** + `escenarioUso` **Cocina rápida**; proteína **Aves** (7), **Vacuna** (7), **Cerdo** (6). El filtro **sin lácteos** muestra 16.
3. Abrí 3: **Chorizos a la pomarola** (único con `chorizo`), **Bife a caballo** (huevo frito, `sinLacteos: true`), **Pollo a la crema y champiñones** (`sinLacteos: false`).
4. Lista de compras con **Chorizos a la pomarola** → **chorizo** en **Carniceria**.
5. Re-corré el script: saltea todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Discrepancia con `models.ts` → reportar antes de tocar.
- Commit: `feat: E3.4.22 seed recetario tanda 12 comida rápida de semana (20 recetas + 1 ingrediente)`.
