# PROMPT E3.4.28 — Seed recetario "tanda 18 · Árabe / Medio Oriente (completar)" (8 recetas + 1 ingrediente)

Completa la cocina **Árabe / Medio Oriente** (tenía solo Hummus). **8 recetas nuevas**, low-carb (tabule de coliflor, fattoush y shawarma sin pan).

## Archivos (en `scripts/seed-data/`)
- `recetas_tanda18.json` — 8 recetas.
- `ingredientes_nuevos_tanda18.json` — 1 ingrediente nuevo.

## Contenido
Shawarma de pollo en plato (Aves), Kafta de carne especiada (Vacuna), Baba ganoush (Conserva, Vegetal), Tabule de coliflor (Guarnición, Vegetal), Fattoush sin pan (Entrada, Vegetal), Cordero al horno con especias (Cordero), Pollo al zaatar y limón (Aves), Berenjenas con yogur y ajo (Guarnición, Vegetal).
- **Desglose:** `tipoItem` Receta principal ×4, Conserva ×1, Guarnición ×2, Entrada ×1. Proteína Vegetal ×4, Aves ×2, Vacuna ×1, Cordero ×1. Todas `hidratos: false`, `paraJuanPablo: true`.
- **Con lácteos (1):** Berenjenas con yogur y ajo (yogur griego). Las otras 7 `sinLacteos: true`.
- **Ingrediente nuevo (1):** Zaatar (`Hierba y especia` → `Almacen / secos`).
- **Reúso:** `tahini`, `berenjenas`, `cordero`, `yogur griego`, `rabanito`, `menta`.

## Diagnóstico antes del `procedé` (D1–D3)
- **D1 — Forma del modelo** contra `src/types/models.ts`.
- **D2 — Enums.** `tipoItem` ∈ {Receta principal, Conserva, Guarnición, Entrada}; `proteinaPrincipal` ∈ {Aves, Vacuna, Vegetal, Cordero}; `costoEstimado` ∈ {Bajo, Alto}; `dificultad` ∈ {Baja, Media}. `cocina` = "Árabe / Medio Oriente" (texto exacto con la barra).
- **D3 — Referencias sin resolver.** Confirmá **0** (71 refs, 70 a catálogo vivo + 1 a zaatar). Verificá que `cordero`, `tahini` y `yogur griego` existan.

> **GATE:** D1–D3 ok → reporte y **esperá `procedé`**.

## Backup → Ejecución
Export a `scripts/backups/E3.4.28_*_<ts>.json`. Cloná `seedRecetarioTanda17.ts` a **`seedRecetarioTanda18.ts`** (paths `*_tanda18.json`). Sin `alternativas`.

## Validación (F4)
1. `F2: 1 creado` (o 0) y `F3: 8 creadas`.
2. `/biblioteca`: estilo **Árabe / Medio Oriente** (quedan 9 con el hummus previo); **sin lácteos** muestra 7.
3. Abrí: **Baba ganoush** (`tipoItem: Conserva`, `tahini`), **Cordero al horno con especias** (`Cordero`), **Pollo al zaatar y limón** (`zaatar`).
4. Re-corré: 0 creados.

## Reglas
- Nada antes del `procedé`; solo-alta. Commit: `feat: E3.4.28 seed recetario tanda 18 arabe medio oriente (8 recetas + 1 ingrediente)`.

---

### Plan "10 por cocina" — CERRADO
Completas: Italiana, China, Francesa, India, Japonesa, Mexicana, Española, Estadounidense, Alemana, **Tailandesa, Coreana, Peruana, Árabe / Medio Oriente**. Quedan pendientes de SEMBRAR todas las tandas generadas (3–18) y correr la auditoría (E3.4.13).
