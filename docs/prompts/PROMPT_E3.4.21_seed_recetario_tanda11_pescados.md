# PROMPT E3.4.21 — Seed recetario "tanda 11 · Pescados y mariscos" (20 recetas + 3 ingredientes)

Tanda temática de pescados y mariscos (no es una cocina, es un rubro). **20 recetas nuevas**, variando tipo de pescado, técnica y origen, sin repetir lo que ya hay (salmón pistacho, ceviche de corvina, tataki, salmón teriyaki, pulpo a la gallega, vieiras, calamares al ajillo, aguachile, escabeche, niçoise, moules marinière, langostinos al curry/ajillo, salmón shioyaki, pescado al miso, camarones a la diabla, gambas al ajillo, merluza vizcaína). Casi todas low-carb y sin lácteos.

Mismo flujo y forma de modelo. **Solo-alta e idempotente.** Es la tanda más grande hasta ahora (20) — el `F3` debería decir 20 creadas.

## Archivos (ponelos en `scripts/seed-data/`)
- `recetas_tanda11.json` — 20 recetas.
- `ingredientes_nuevos_tanda11.json` — 3 ingredientes nuevos.

## Contenido
**Pescado (15):** Merluza a la plancha con limón y alcaparras, Salmón al horno en costra de hierbas, Trucha al horno con almendras, Atún encebollado, Abadejo en papillote con verduras, Lenguado a la meunière, Corvina al horno con tomate y aceitunas, Salmón a la mostaza y eneldo, Merluza a la crema de puerros, Filet de merluza gratinado con tomate y queso, Hamburguesas de salmón, Croquetas de atún low-carb (Entrada), Pejerrey en costra de almendra, Tiradito de salmón (Entrada), Sopa marinera de pescado.
**Mariscos (5):** Cazuela de mariscos, Calamares rellenos, Mejillones a la provenzal (Entrada), Pulpo a la parrilla con chimichurri, Vuelve a la vida (Entrada).
- **Desglose:** `tipoItem` Receta principal ×16, Entrada ×4. Proteína Pescado ×15, Mariscos ×5. Todas `hidratos: false`, `paraJuanPablo: true`.
- **Con lácteos (3):** Lenguado a la meunière (manteca), Merluza a la crema de puerros (crema), Filet de merluza gratinado (mozzarella + parmesano). Las otras 17 son `sinLacteos: true`.
- **Ingredientes nuevos (3):** Trucha, Pejerrey (`Pescado y marisco` → `Pescaderia`), Eneldo (`Hierba y especia` → `Verduleria`).
- **Reúso destacable:** `atun rojo` (Tanda 2) en atún encebollado; `pulpo` (Tanda 1) en pulpo a la parrilla; `puerro` (Tanda 6); `mozzarella` (Tanda 4); `papel manteca` (Tanda 1) en el papillote; `caldo de pescado`, `tomates cherry`, `azafran`, `atun al natural`, `ralladura de limon` ya en catálogo.

## Diagnóstico antes del `procedé` (D1–D4)
- **D1 — Forma del modelo.** Verificá `recetas_tanda11.json` contra `src/types/models.ts`. Reportá discrepancias antes de tocar.
- **D2 — Enums.** Confirmá válidos: `tipoItem` ∈ {Receta principal, Entrada}; `proteinaPrincipal` ∈ {Pescado, Mariscos}; `costoEstimado` ∈ {Bajo, Medio, Medio/Alto, Alto}; `dificultad` ∈ {Baja, Media, Media-alta}. `cocina`/`estilo` cubre 9 orígenes (Mediterránea, Española, Francesa, Italiana, Estadounidense, Otra, Argentina, Peruana, Mexicana) — todos valores ya usados.
- **D3 — Ingredientes nuevos.** Reportá cuáles de los 3 ya existen (el script los saltea):
  - **`trucha`** y **`pejerrey`** — pueden existir ya en el catálogo de pescadería; si están, usá esas entradas. Los definí `categoria: "Pescado y marisco"`, `seccionGondola: "Pescaderia"`.
  - **`eneldo`** — `categoria: "Hierba y especia"`, `seccionGondola: "Verduleria"`. Si lo querés en `Almacen / secos` (seco), avisá.
- **D4 — Referencias sin resolver.** Confirmá **0 referencias sin resolver** (173 refs: 170 a catálogo vivo + 3 a nuevos). Es la tanda con más referencias; prestá atención a que `atun rojo`, `pulpo`, `papel manteca`, `caldo de pescado` y `tomates cherry` resuelvan (todos ya vivos).

> **GATE:** con D1–D4 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.21_*_<ts>.json`.

## Ejecución
Cloná `seedRecetarioTanda10.ts` a **`scripts/seedRecetarioTanda11.ts`** cambiando los dos paths de input a `*_tanda11.json`. Todo igual (admin SDK, idempotencia, resolución `canon → idIngrediente` en runtime, `REC-XXXX`/`ING-XXXX`, timestamps). Sin `alternativas`. Un opcional (queso en pejerrey en costra) → `opcional: true`. **Verificá el conteo: son 20.**

## Validación (F4)
1. Consola: `F2: 3 creados …` (o menos si D3 encontró existentes) y **`F3: 20 creadas …`**.
2. En `/biblioteca`: filtran por `tipoItem` **Receta principal** (16) y **Entrada** (4); proteína **Pescado** (15) y **Mariscos** (5). El filtro **sin lácteos** muestra 17.
3. Abrí 3: **Pulpo a la parrilla con chimichurri** (reúsa `pulpo`; hervido + parrilla), **Lenguado a la meunière** (`sinLacteos: false`, manteca), **Tiradito de salmón** (`tipoItem: Entrada`, crudo, leche de tigre al servir).
4. Lista de compras con **Trucha al horno** → **trucha** en **Pescaderia**; con **Abadejo en papillote** → **papel manteca** en **Bazar / otros** y **eneldo** en **Verduleria**.
5. Re-corré el script: saltea todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Discrepancia con `models.ts` → reportar antes de tocar.
- Commit: `feat: E3.4.21 seed recetario tanda 11 pescados y mariscos (20 recetas + 3 ingredientes)`.
