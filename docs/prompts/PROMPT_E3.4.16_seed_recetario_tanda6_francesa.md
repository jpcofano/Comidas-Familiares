# PROMPT E3.4.16 — Seed recetario "tanda 6 · Francesa" (10 recetas + 4 ingredientes)

Tercera tanda del plan "10 clásicos por cocina". Francesa tenía varias sueltas (carré de cordero, vieiras, salmón beurre blanc, lomo a la pimienta verde, mayonesa, áspic, mousse, vinagreta); esta tanda suma **10 clásicos grandes nuevos** que no estaban. Adaptados a low-carb (sin harina → reducción; sin papa → coliflor) y con lácteos solo donde el clásico lo pide.

Mismo flujo y forma de modelo. **Solo-alta e idempotente** (ninguna pisa lo existente; los nombres no se superponen).

## Archivos (ponelos en `scripts/seed-data/`)
- `recetas_tanda6.json` — 10 recetas.
- `ingredientes_nuevos_tanda6.json` — 4 ingredientes nuevos.

## Contenido
- **Sin lácteos (4):** Coq au vin (Aves), Boeuf bourguignon (Vacuna), Ratatouille (Guarnición, Vegetal), Salade niçoise (Pescado).
- **Con lácteos (6):** Steak au poivre (Vacuna), Quiche lorraine sin masa (Cerdo), Soupe à l'oignon gratinée (Entrada, Vegetal), Poulet rôti aux herbes (Aves), Moules marinière (Mariscos), Gratin de coliflor (Guarnición, Vegetal).
- **Desglose:** `tipoItem` Receta principal ×7, Guarnición ×2, Entrada ×1. Proteína Vegetal ×3, Aves/Vacuna ×2, Pescado/Cerdo/Mariscos ×1. Todas `hidratos: false`, `paraJuanPablo: true`. Coq au vin y bourguignon traen `hidratoOpcional: "Puré de coliflor"`.
- **Ingredientes nuevos (4):** Panceta (`Carne` → `Carniceria`), Pollo entero (`Carne` → `Carniceria`), Puerro (`Verdura` → `Verduleria`), Anchoas (`Pescado y marisco` → `Almacen / secos`, opcional en niçoise).

## Diagnóstico antes del `procedé` (D1–D4)
- **D1 — Forma del modelo.** Verificá `recetas_tanda6.json` contra `src/types/models.ts`. Reportá discrepancias antes de tocar.
- **D2 — Enums.** Confirmá válidos: `tipoItem` ∈ {Receta principal, Guarnición, Entrada}; `proteinaPrincipal` ∈ {Aves, Vacuna, Vegetal, Pescado, Cerdo, Mariscos}; `costoEstimado` ∈ {Bajo, Medio, Medio/Alto, Alto}; `dificultad` ∈ {Baja, Media}.
- **D3 — Ingredientes nuevos vs catálogo vivo.** De los 4, reportá cuáles ya existen (el script los saltea):
  - **`puerro`** — probable que el seed de góndolas (E3.4.11) ya lo haya creado; si existe, usá esa entrada y confirmá que su `categoria` calce con las demás verduras.
  - **`panceta`** y **`pollo entero`** — `categoria: "Carne"`, `seccionGondola: "Carniceria"`. Si el catálogo distingue fiambrería para la panceta, decímelo y la realineo. No bloqueante.
  - **`anchoas`** — `Pescado y marisco` → `Almacen / secos` (es de lata). Confirmá.
- **D4 — Referencias sin resolver.** Confirmá **0 referencias sin resolver** (102 refs: 98 a catálogo vivo + 4 a nuevos). Nota: en Steak au poivre el ingrediente `Coñac o vino blanco seco` se resuelve al canónico **`conac`** (igual criterio que el lomo a la pimienta verde de la Tanda 1; el `textoOriginal` queda intacto). Si tu catálogo tuviera una entrada propia de "vino blanco seco" que preferís para ese ítem, avisá.

> **GATE:** con D1–D4 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.16_*_<ts>.json`.

## Ejecución
Cloná `seedRecetarioTanda5.ts` a **`scripts/seedRecetarioTanda6.ts`** cambiando solo los dos paths de input a `*_tanda6.json`. Todo igual (admin SDK, idempotencia por canónico / `nombreCanonico`, resolución `canon → idIngrediente` en runtime, `REC-XXXX`/`ING-XXXX`, timestamps). Sin `alternativas`. Un solo ingrediente opcional (anchoas en niçoise) → `opcional: true`.

## Validación (F4)
1. Consola: `F2: 4 creados …` (o menos si D3 encontró existentes) y `F3: 10 creadas …`.
2. En `/biblioteca`: filtran por estilo **Francesa**; `tipoItem` **Receta principal** (7); proteína **Vegetal** (3). El filtro **sin lácteos** muestra exactamente 4 (coq au vin, bourguignon, ratatouille, niçoise).
3. Abrí 3: **Boeuf bourguignon** (panceta + `hidratoOpcional`), **Quiche lorraine sin masa** (panceta + puerro, `sinLacteos: false`), **Poulet rôti aux herbes** (pollo entero).
4. Lista de compras con **Coq au vin** → **panceta** en **Carniceria**; con **Quiche** → **puerro** en **Verduleria**; con **Niçoise** → **anchoas** en **Almacen / secos**.
5. Re-corré el script: saltea todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Discrepancia con `models.ts` → reportar antes de tocar.
- Commit: `feat: E3.4.16 seed recetario tanda 6 francesa (10 recetas + 4 ingredientes)`.

---

### Próximas cocinas (mismo molde)
India · Mexicana · Japonesa · Española (redondeo) · Estadounidense · Tailandesa/Coreana/Peruana/Árabe (completar) · Alemana. Decime cuál sigue.
