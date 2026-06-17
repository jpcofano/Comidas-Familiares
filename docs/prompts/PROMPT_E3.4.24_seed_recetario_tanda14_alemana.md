# PROMPT E3.4.24 — Seed recetario "tanda 14 · Alemana" (10 recetas + 3 ingredientes)

Novena cocina del plan "10 por cocina" — la segunda "de cero". **10 clásicos alemanes / centroeuropeos** adaptados a low-carb (sin cerveza ni harina para espesar; espesado por reducción; eritritol en vez de azúcar; rebozados de almendra).

Mismo flujo y forma de modelo. **Solo-alta e idempotente.**

## Archivos (ponelos en `scripts/seed-data/`)
- `recetas_tanda14.json` — 10 recetas.
- `ingredientes_nuevos_tanda14.json` — 3 ingredientes nuevos.

## Contenido
Bondiola braseada estilo alemán (Cerdo), Bratwurst con chucrut (Cerdo), Rouladen de carne (Vacuna), Sauerbraten low-carb (Vacuna), Jägerschnitzel low-carb (Cerdo), Königsberger Klopse (Vacuna), Frikadellen (Vacuna), Gurkensalat (Guarnición, Vegetal), Repollo colorado agridulce (Guarnición, Vegetal), Currywurst low-carb (Cerdo).
- **Desglose:** `tipoItem` Receta principal ×8, Guarnición ×2. Proteína Cerdo ×4, Vacuna ×4, Vegetal ×2. Todas `hidratos: false`, `paraJuanPablo: true`.
- **Con lácteos (2):** Jägerschnitzel (crema en la salsa de hongos), Königsberger Klopse (crema en la salsa de alcaparras). Las otras 8 son `sinLacteos: true`.
- **Ingredientes nuevos (3):** Chucrut (`Verdura` → `Almacen / secos`), Pepino en vinagre / pickles (`Verdura` → `Almacen / secos`), Salchicha tipo bratwurst (`Carne` → `Carniceria`).
- **Reúso:** `repollo colorado` y `roast beef` (catálogo base), `churrasquitos de cerdo`, `bifecitos de cuadril`, `panceta`, `bondiola de cerdo entera`, `pepino`, `manzana roja`, `clavo de olor`.

## Diagnóstico antes del `procedé` (D1–D3)
- **D1 — Forma del modelo.** Verificá `recetas_tanda14.json` contra `src/types/models.ts`. Reportá discrepancias antes de tocar.
- **D2 — Enums.** Confirmá válidos: `tipoItem` ∈ {Receta principal, Guarnición}; `proteinaPrincipal` ∈ {Cerdo, Vacuna, Vegetal}; `costoEstimado` ∈ {Bajo, Medio}; `dificultad` ∈ {Baja, Media, Media-alta} (Rouladen es Media-alta).
- **D3 — Ingredientes nuevos.** Reportá cuáles de los 3 ya existen (el script los saltea):
  - **`salchicha`** — si tu catálogo ya tiene un embutido equivalente (p. ej. quisieras mapearla a `chorizo`), decímelo; la definí aparte como bratwurst (`Carne` → `Carniceria`) para no pisar el chorizo.
  - **`chucrut`** y **`pepino en vinagre`** — conservas; los puse en `Almacen / secos`. Si preferís `Verduleria` o `Despensa / otros`, avisá. No bloqueante.
  - Confirmá además que **`repollo colorado`** ya exista en catálogo (lo trato como existente, no como nuevo).

> **GATE:** con D1–D3 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.24_*_<ts>.json`.

## Ejecución
Cloná `seedRecetarioTanda13.ts` a **`scripts/seedRecetarioTanda14.ts`** cambiando los dos paths de input a `*_tanda14.json`. Todo igual. Sin `alternativas`.

## Validación (F4)
1. Consola: `F2: 3 creados …` (o menos si D3 encontró existentes) y `F3: 10 creadas …`.
2. En `/biblioteca`: filtran por estilo **Alemana**; `tipoItem` **Receta principal** (8); proteína **Cerdo** (4) y **Vacuna** (4). El filtro **sin lácteos** muestra 8.
3. Abrí 3: **Sauerbraten low-carb** (marinada en vinagre, salsa por reducción), **Königsberger Klopse** (`sinLacteos: false`, alcaparras + crema), **Repollo colorado agridulce** (`tipoItem: Guarnición`, eritritol).
4. Lista de compras con **Bratwurst con chucrut** → **salchicha** en **Carniceria** y **chucrut** en **Almacen / secos**; con **Rouladen** → **pepino en vinagre**.
5. Re-corré el script: saltea todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Commit: `feat: E3.4.24 seed recetario tanda 14 alemana (10 recetas + 3 ingredientes)`.

---

### Plan "10 por cocina" — estado
Completas: Italiana, China, Francesa, India, Japonesa, Mexicana, Española, **Estadounidense, Alemana**. Quedan por **completar** (tienen 1–2 c/u): Tailandesa, Coreana, Peruana, Árabe / Medio Oriente. Decime con cuál sigo.
