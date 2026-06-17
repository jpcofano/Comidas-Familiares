# PROMPT E3.4.20 — Seed recetario "tanda 10 · Española" (10 recetas, 0 ingredientes nuevos)

Séptima tanda del plan "10 clásicos por cocina". Española tenía pulpo a la gallega, calamares al ajillo, alioli, riñones al jerez y escabeche de pescado; esta suma **10 clásicos nuevos** que redondean la cocina. Adaptados a low-carb (tortilla de zucchini en vez de papa; albóndigas ligadas con almendra; gazpacho sin pan). Cocina mayormente de aceite de oliva: **las 10 van `sinLacteos: true`**.

**No tiene ingredientes nuevos** — todo referencia el catálogo vivo (incluido `jamon crudo` de la Tanda 4, `jerez seco` de la Tanda 3 y `morron verde` de la Tanda 9).

Mismo flujo y forma de modelo. **Solo-alta e idempotente.**

## Archivos (ponelos en `scripts/seed-data/`)
- `recetas_tanda10.json` — 10 recetas.
- (No hay `ingredientes_nuevos_tanda10.json`: 0 nuevos. Si tu harness espera el archivo, pasá un `[]` vacío.)

## Contenido
Tortilla española de zucchini (Vegetal), Gambas al ajillo (Entrada, Mariscos), Pollo al ajillo (Aves), Pisto manchego (Guarnición, Vegetal), Albóndigas en salsa de almendras (Vacuna), Pollo al chilindrón (Aves), Merluza a la vizcaína (Pescado), Champiñones al ajillo (Guarnición, Vegetal), Pinchos morunos (Cerdo), Gazpacho (Entrada, Vegetal).
- **Desglose:** `tipoItem` Receta principal ×6, Entrada ×2, Guarnición ×2. Proteína Vegetal ×4, Aves ×2, Mariscos/Vacuna/Pescado/Cerdo ×1. Todas `sinLacteos: true`, `hidratos: false`, `paraJuanPablo: true`.

## Diagnóstico antes del `procedé` (D1–D3)
- **D1 — Forma del modelo.** Verificá `recetas_tanda10.json` contra `src/types/models.ts`. Reportá discrepancias antes de tocar.
- **D2 — Enums.** Confirmá válidos: `tipoItem` ∈ {Receta principal, Entrada, Guarnición}; `proteinaPrincipal` ∈ {Vegetal, Mariscos, Aves, Vacuna, Pescado, Cerdo}; `costoEstimado` ∈ {Bajo, Medio, Alto}; `dificultad` ∈ {Baja, Media}.
- **D3 — Referencias sin resolver.** Confirmá **0 referencias sin resolver** (85 refs, todas a catálogo vivo, 0 nuevos). Atención a tres canónicos de tandas previas que deben existir: `jamon crudo` (Tanda 4, en chilindrón), `jerez seco` (Tanda 3, en pollo al ajillo y champiñones), `morron verde` (Tanda 9, en pisto y chilindrón). Si alguno no está (porque su tanda no se sembró aún), avisá — son las únicas dependencias cruzadas.

> **GATE:** con D1–D3 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.20_*_<ts>.json`.

## Ejecución
Cloná `seedRecetarioTanda9.ts` a **`scripts/seedRecetarioTanda10.ts`** cambiando el path de recetas a `recetas_tanda10.json` y dejando la lista de ingredientes nuevos vacía (`[]`). Todo lo demás igual. Sin `alternativas`. Un opcional (peperoncino en champiñones al ajillo) → `opcional: true`.

## Validación (F4)
1. Consola: `F2: 0 creados` (no hay nuevos) y `F3: 10 creadas …`.
2. En `/biblioteca`: filtran por estilo **Española**; `tipoItem` **Receta principal** (6); proteína **Vegetal** (4). El filtro **sin lácteos** muestra las 10.
3. Abrí 3: **Tortilla española de zucchini** (sin papa), **Pollo al chilindrón** (jamón crudo + morrón verde), **Gazpacho** (`tipoItem: Entrada`, procesado, frío).
4. Re-corré el script: saltea todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Commit: `feat: E3.4.20 seed recetario tanda 10 española (10 recetas)`.

---

### Plan "10 por cocina" — estado
Hechas: Italiana, China, Francesa, India, Japonesa, **Mexicana, Española**. Faltan: **Estadounidense** y **Alemana** (de cero), más completar **Tailandesa / Coreana / Peruana / Árabe** (que hoy tienen 1–2 c/u). Decime cuál sigue.
