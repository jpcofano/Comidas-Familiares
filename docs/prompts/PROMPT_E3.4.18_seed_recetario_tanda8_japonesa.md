# PROMPT E3.4.18 — Seed recetario "tanda 8 · Japonesa" (10 recetas + 1 ingrediente)

Quinta tanda del plan "10 clásicos por cocina". Japonesa tenía 4 (tataki, salmón teriyaki, gyudon, katsu); esta suma **10 nuevos**. La cocina japonesa es sin lácteos: **las 10 van `sinLacteos: true`**. Low-carb: eritritol en vez de azúcar/mirin, coliflor/repollo en vez de arroz/fideos, rebozados con harina de almendra.

Mismo flujo y forma de modelo. **Solo-alta e idempotente.**

## Archivos (ponelos en `scripts/seed-data/`)
- `recetas_tanda8.json` — 10 recetas.
- `ingredientes_nuevos_tanda8.json` — 1 ingrediente nuevo.

## Contenido
Sukiyaki (Vacuna), Yakitori (Aves), Karaage de pollo (Aves), Salmón shioyaki (Pescado), Buta no shogayaki (Cerdo), Agedashi tofu (Entrada, Vegetal), Sopa de miso (Entrada, Vegetal), Pescado al miso (Pescado), Nasu dengaku (Guarnición, Vegetal), Sunomono de pepino (Guarnición, Vegetal).
- **Desglose:** `tipoItem` Receta principal ×6, Entrada ×2, Guarnición ×2. Proteína Vegetal ×4, Aves/Pescado ×2, Vacuna/Cerdo ×1. Todas `sinLacteos: true`, `hidratos: false`, `paraJuanPablo: true`.
- **Ingrediente nuevo (1):** Miso (`Condimento y aderezo` → `Almacen / secos`), usado en sopa de miso, pescado al miso y nasu dengaku.
- **Reúso:** `jerez seco` (Tanda 3) hace de sake/mirin en casi todas; `tofu firme` (Tanda 5) en sukiyaki, agedashi y sopa de miso.

## Diagnóstico antes del `procedé` (D1–D4)
- **D1 — Forma del modelo.** Verificá `recetas_tanda8.json` contra `src/types/models.ts`. Reportá discrepancias antes de tocar.
- **D2 — Enums.** Confirmá válidos: `tipoItem` ∈ {Receta principal, Entrada, Guarnición}; `proteinaPrincipal` ∈ {Vacuna, Aves, Pescado, Cerdo, Vegetal}; `costoEstimado` ∈ {Bajo, Medio, Alto}; `dificultad` ∈ {Baja, Media}. No introduce enums nuevos.
- **D3 — Ingrediente nuevo.** Reportá si **`miso`** ya existe (el script lo saltea). Lo definí `categoria: "Condimento y aderezo"`, `seccionGondola: "Almacen / secos"`. El miso se conserva refrigerado; si preferís mandarlo a `Lacteos y frescos`, decímelo y lo realineo. No bloqueante.
- **D4 — Referencias sin resolver.** Confirmá **0 referencias sin resolver** (72 refs: 71 a catálogo vivo + 1 a miso). Todo el resto referencia canónicos ya vivos (salsa de soja, jerez seco, eritritol, tofu firme, jengibre fresco, cebolla de verdeo, repollo blanco, muslos, cerdo en tiras, salmón, merluza negra, harina de almendra, vinagre de arroz, semillas de sésamo, etc.).

> **GATE:** con D1–D4 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.18_*_<ts>.json`.

## Ejecución
Cloná `seedRecetarioTanda7.ts` a **`scripts/seedRecetarioTanda8.ts`** cambiando solo los dos paths de input a `*_tanda8.json`. Todo igual (admin SDK, idempotencia por canónico / `nombreCanonico`, resolución `canon → idIngrediente` en runtime, `REC-XXXX`/`ING-XXXX`, timestamps). Sin `alternativas`. Un opcional (huevo crudo para mojar en sukiyaki) → `opcional: true`.

## Validación (F4)
1. Consola: `F2: 1 creado …` (o 0 si ya existía) y `F3: 10 creadas …`.
2. En `/biblioteca`: filtran por estilo **Japonesa**; `tipoItem` **Receta principal** (6); proteína **Vegetal** (4). El filtro **sin lácteos** muestra las 10.
3. Abrí 3: **Sopa de miso** (miso nuevo, fuera del hervor), **Karaage de pollo** (rebozado de almendra, frito), **Pescado al miso** (merluza negra + miso, marinado largo).
4. Lista de compras con **Sopa de miso** → que **miso** caiga en **Almacen / secos**.
5. Re-corré el script: saltea todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Discrepancia con `models.ts` → reportar antes de tocar.
- Commit: `feat: E3.4.18 seed recetario tanda 8 japonesa (10 recetas + 1 ingrediente)`.

---

### Próximas cocinas (mismo molde)
Mexicana · Española (redondeo) · Estadounidense · Tailandesa/Coreana/Peruana/Árabe (completar) · Alemana. Decime cuál sigue.
