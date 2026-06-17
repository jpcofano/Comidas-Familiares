# PROMPT E3.4.14 — Seed recetario "tanda 4 · Italiana" (10 recetas + 5 ingredientes)

Primera tanda del plan "completar cada cocina a ~10 clásicos". Diez clásicos italianos reconocibles, adaptados (porciones 4, conseguibles acá, low-carb donde el plato lo permite). **No fuerzo todo a sin lácteos:** los que el clásico exige van con lácteo y marcados `sinLacteos: false`. No repiten lo ya cargado (ossobuco, cazadora, pesto).

Mismo flujo y forma de modelo que E3.4.9/E3.4.12. **Solo-alta e idempotente.**

## Archivos (ponelos en `scripts/seed-data/`)
- `recetas_tanda4.json` — 10 recetas (forma actual del modelo).
- `ingredientes_nuevos_tanda4.json` — 5 ingredientes nuevos.

## Contenido
- **Sin lácteos (4):** Vitello tonnato (Entrada, Vacuna), Frittata de zucchini (Principal, Vegetal — queso opcional), Caponata siciliana (Guarnición, Vegetal), Involtini de carne al sugo (Principal, Vacuna — queso opcional).
- **Con lácteos (6):** Saltimbocca alla romana (Principal, Vacuna), Pollo a la parmesana sin pan (Principal, Aves), Melanzane alla parmigiana (Principal, Vegetal), Insalata caprese (Entrada, Vegetal), Scaloppine al limone (Principal, Aves), Pollo al marsala (Principal, Aves).
- **Desglose:** `tipoItem` Receta principal ×7, Entrada ×2, Guarnición ×1. Proteína Vegetal ×4, Vacuna ×3, Aves ×3. Estilo Italiana ×10. Todas `hidratos: false`, `paraJuanPablo: true`.
- **Ingredientes nuevos (5):** Peceto (`Carne` → `Carniceria`), Jamón crudo (`Carne` → `Fiambreria`), Mozzarella (`Lacteo` → `Lacteos y frescos`), Salvia (`Hierba y especia` → `Verduleria`), Vino marsala (`Despensa varios` → `Despensa / otros`).

## Diagnóstico antes del `procedé` (D1–D4)
- **D1 — Forma del modelo.** Verificá `recetas_tanda4.json` contra `src/types/models.ts` (misma forma que tandas previas). Reportá cualquier discrepancia antes de tocar.
- **D2 — Enums.** Confirmá válidos: `tipoItem` ∈ {Receta principal, Entrada, Guarnición}; `proteinaPrincipal` ∈ {Vegetal, Vacuna, Aves}; `costoEstimado` ∈ {Bajo, Medio, Medio/Alto}; `dificultad` ∈ {Baja, Media}. No introduce valores de enum nuevos.
- **D3 — Ingredientes nuevos vs catálogo vivo.** De los 5 nuevos, reportá cuáles ya existen (el script los saltea). Ojo dos cosas:
  - **`mozzarella`** y **`jamon crudo`** — si el seed de góndolas (E3.4.11) ya los creó, van a existir; confirmá canónico y `seccionGondola` (`Lacteos y frescos` / `Fiambreria`) y, si difieren, decime y los alineo.
  - Verificá que `seccionGondola` `Fiambreria` y `Lacteos y frescos` estén en `ORDEN_GONDOLA`; si alguna no figura, reportá (la receta funciona igual, pero quiero el orden bien).
- **D4 — Referencias sin resolver.** Confirmá **0 referencias de receta sin resolver** (96 refs: 91 a catálogo vivo + 5 a nuevos). Nota: `Sal en escamas` se resuelve al canónico `sal gruesa` (mismo ingrediente, distinto `textoOriginal`); si tu catálogo tuviera una entrada propia de "sal en escamas", avisá y reapunto.

> **GATE:** con D1–D4 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.14_*_<ts>.json`.

## Ejecución
Cloná `seedRecetarioTanda3.ts` a **`scripts/seedRecetarioTanda4.ts`** cambiando solo los dos paths de input a `*_tanda4.json`. Todo lo demás igual (admin SDK, idempotencia por canónico / `nombreCanonico`, resolución `canon → idIngrediente` en runtime, `REC-XXXX`/`ING-XXXX`, timestamps). Ninguna receta usa `alternativas`.

## Validación (F4)
1. Consola: `F2: 5 creados …` (o menos si D3 encontró existentes) y `F3: 10 creadas …`.
2. En `/biblioteca`: aparecen las 10 y filtran por estilo **Italiana**, por `tipoItem` **Receta principal** (7) y por proteína **Vegetal** (4). El filtro **sin lácteos** debe mostrar exactamente 4 (vitello, frittata, caponata, involtini).
3. Abrí 3: **Pollo al marsala** (única con `vino marsala`), **Insalata caprese** (`sinLacteos: false`, mozzarella), **Vitello tonnato** (mayonesa base + atún, `sinLacteos: true`).
4. Lista de compras con **Saltimbocca** → que **jamón crudo** caiga en **Fiambreria** y **salvia** en **Verduleria**; con **Caprese** → **mozzarella** en **Lacteos y frescos**.
5. Re-corré el script: saltea todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Discrepancia con `models.ts` → reportar antes de tocar.
- Commit: `feat: E3.4.14 seed recetario tanda 4 italiana (10 recetas + 5 ingredientes)`.

---

### Próximas tandas (mismo molde, una cocina por vez)
China · Francesa · India · Mexicana · Japonesa · Española (redondeo) · Estadounidense · Tailandesa/Coreana/Peruana/Árabe (completar a 10) · Alemana. Decime la que sigue y la genero igual.
