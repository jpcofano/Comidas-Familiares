# PROMPT E3.4.10 — Seed recetario "tanda 2" (12 recetas + 4 ingredientes)

Misma operación que E3.4.9 (seed directo, admin SDK, **idempotente y SOLO-ALTA**) y **misma forma de
modelo ya validada ahí** (booleans, `*Min`/`*Orden`, `porQueEspecial`, `notasNocheDeADos`,
`paraJuanPablo`/`paraFamilia`, pasos `nroPaso`/`detalle`/`tiempoEstimadoLabel`/`tiempoEstimadoMin`/
`puntoClave`/`errorComun`, sin `categoriaOverride`, `Aves`/`Vegetal`, costos sin `Bajo/Medio`).

## Archivos
- `scripts/seed-data/ingredientes_nuevos_tanda2.json` — 4 nuevos: **Atún rojo**, **Lemongrass**, **Chipotle**, **Ají panca**.
- `scripts/seed-data/recetas_nuevas_tanda2.json` — 12 recetas. Cobertura: **Japonesa ×4** (sale de 0), Tailandesa ×2, Mexicana ×2, Coreana ×1, Peruana ×1, Española ×1, Mediterránea ×1. Todas sin lácteos (`sinLacteos: true`).

## Script
Reusá `scripts/seedRecetarioTanda1.ts` de E3.4.9 **cambiando solo los dos `readFileSync`** para que lean
`ingredientes_nuevos_tanda2.json` y `recetas_nuevas_tanda2.json` (o duplicalo a `seedRecetarioTanda2.ts`).
Toda la lógica (admin SDK, `maxNum`, resolución `canon → id`, idempotencia por `nombreCanonico`,
`normalizeText`, `vecesCocinada:0`, `fechaImportacion`) queda igual.

## Diagnóstico (corto — el modelo ya está validado). Reportá y esperá `procedé`.
- **D1** — De los 4 nuevos, reportá cuáles ya existen en el catálogo vivo (el script los saltea) y confirmá **0 referencias de receta sin resolver**.
- **D2** — `dificultadOrden`/`costoOrden`: misma convención que confirmaste en E3.4.9. Si quedó base 0 allá, aplicá lo mismo acá.
- **D3** — Disponibilidad real: **Lemongrass (citronela), Chipotle en adobo y Ají panca** son de dietética/asiático/peruano — confirmá que los tengas mapeados a algo conseguible en Bs As o ajustamos (ej. lemongrass → más jengibre + ralladura; chipotle → pimentón ahumado + ají).

> **GATE:** `procedé` antes de escribir. Backup igual que E3.4.9.

## F2/F3/F4
Idénticas a E3.4.9: F2 ingredientes (saltear existentes), F3 recetas (resolver canon → id, `REC-XXXX`,
crear), F4 validar en `/biblioteca` que aparezcan y filtren por estilo (Japonesa, Coreana, etc.), proteína
(Aves, Pescado, Mariscos, Vacuna, Cerdo) y escenario; abrir una con muchos pasos (Tom kha / Dak galbi) y
una entrada cruda (Tataki / Aguachile). Re-correr → 0 creados.

Commit: `feat: E3.4.10 seed recetario tanda 2 (12 recetas + 4 ingredientes)`.
