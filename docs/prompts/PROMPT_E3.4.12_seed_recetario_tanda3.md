# PROMPT E3.4.12 — Seed recetario "tanda 3" (13 recetas + 7 ingredientes)

Clásicos de dominio público adaptados a low-carb, **todas sin lácteos**. Fuente del "qué": *The Boston Cooking-School Cook Book* (Fannie Farmer, 1918, Project Gutenberg #65061, dominio público) para las internacionales; clásicos tradicionales argentinos/españoles (dominio público) para las criollas. La expresión (textos, pasos) es **reescritura propia** — no se copió nada.

Mismo flujo y forma de modelo que E3.4.9/E3.4.10. **Solo-alta e idempotente.**

## Archivos (ponelos en `scripts/seed-data/`)
- `recetas_tanda3.json` — 13 recetas (forma actual del modelo: `dificultadOrden`, `costoOrden`, `*Min`, `porQueEspecial`, `riesgos`, `paraJuanPablo`/`paraFamilia` boolean, pasos con `puntoClave`/`errorComun`, ingredientes por `canon`).
- `ingredientes_nuevos_tanda3.json` — 7 ingredientes nuevos.

## Contenido
- **Conservas/aderezos (7):** Mayonesa casera, Chimichurri, Salsa criolla, Vinagreta clásica, Alioli, Salsa golf, Escabeche de pescado.
- **Achuras/elegantes (5):** Mollejas al verdeo (Receta principal), Lengua a la vinagreta (Entrada), Riñones al jerez (Receta principal), Matambre arrollado (Entrada), Áspic de pollo (Entrada).
- **Postre (1):** Mousse de chocolate amargo 85% (sin lácteos, base agua/café).
- **Proteínas:** Vegetal ×7, Vacuna ×4, Aves ×1, Pescado ×1. **Estilos:** Argentina ×6, Francesa ×4, Española ×3.
- **Ingredientes nuevos (7):** Mollejas, Lengua, Riñones, Matambre (categoría `Carne` → `Carniceria`); Gelatina sin sabor, Café (`Despensa varios` → `Almacen / secos`); Jerez seco (`Despensa varios` → `Despensa / otros`).

## Diagnóstico antes del `procedé` (D1–D4)
- **D1 — Forma del modelo.** Verificá `recetas_tanda3.json` contra `src/types/models.ts`. Debería calzar 1:1 con lo de tanda 1/2 (misma forma). Si algo cambió en el modelo desde entonces, reportá antes de tocar.
- **D2 — Enums.** Confirmá que siguen válidos: `tipoItem` ∈ {Conserva, Receta principal, Entrada, Postre}; `proteinaPrincipal` ∈ {Vegetal, Vacuna, Aves, Pescado}; `costoEstimado` ∈ {Bajo, Medio, Alto}; `dificultad` ∈ {Baja, Media}. (No introduce valores nuevos de enum — todo ya existe.)
- **D3 — Ingredientes nuevos vs catálogo vivo.** De los 7 nuevos, reportá **cuáles ya existen** (el script los saltea). Ojo posibles colisiones de canónico con el catálogo (ej. si ya hubiera "cafe" o "gelatina sin sabor").
- **D4 — Referencias sin resolver.** Confirmá **0 referencias de receta sin resolver** (los 105 refs a catálogo existente + los 7 a nuevos). El resto del recetario referencia canónicos ya vivos (perejil, ajo, huevos, aceite de oliva, passata de tomate, chocolate 85%, caldo de pollo, etc.).

> **GATE:** con D1–D4 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.12_*_<ts>.json`.

## Ejecución
Reutilizá el script de E3.4.9 (`seedRecetarioTanda1.ts`) clonándolo a **`scripts/seedRecetarioTanda3.ts`** cambiando solo los dos paths de input:
```ts
const NUEVOS_ING = JSON.parse(readFileSync(resolve(DIR, "ingredientes_nuevos_tanda3.json"), "utf-8")) as any[];
const NUEVAS_REC = JSON.parse(readFileSync(resolve(DIR, "recetas_tanda3.json"), "utf-8")) as any[];
```
Todo lo demás (admin SDK, `maxNum`, F2 idempotente por canónico, F3 idempotente por `nombreCanonico`, resolución `canon → idIngrediente` en runtime, asignación `REC-XXXX`/`ING-XXXX`, `vecesCocinada:0`/`vecesUsado:0`/timestamps) queda igual. Ninguna receta usa `alternativas` en esta tanda, pero el script ya lo soporta.

## Validación (F4)
1. Consola: `F2: 7 creados …` (o menos si D3 encontró existentes) y `F3: 13 creadas …`.
2. En `/biblioteca`: aparecen las 13 y filtran por `tipoItem` **Conserva** (7) y **Postre** (1), por proteína **Vacuna** (4) y por estilo **Argentina** (6).
3. Abrí 3: **Riñones al jerez** (única con 2 ingredientes nuevos: riñones + jerez seco), **Áspic de pollo** (chequeá `tecnicaPrincipal: Gelificado` y el consumible Film), **Mousse de chocolate amargo 85%** (`tipoItem: Postre`, `sinLacteos: true`, café como ingrediente).
4. Lista de compras con **Mollejas al verdeo** → que las mollejas caigan en góndola **Carniceria**.
5. Re-corré el script: saltea todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Discrepancia con `models.ts` → reportar antes de tocar.
- Commit: `feat: E3.4.12 seed recetario tanda 3 (13 recetas + 7 ingredientes)`.
