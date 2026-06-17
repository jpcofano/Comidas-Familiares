# PROMPT — Seed recetario "Bondiola · rápidas y especiales" (10 recetas + 3 ingredientes)

Tanda temática de diez recetas de bondiola: cinco rápidas y cinco de elaboración más compleja. Todas están adaptadas a **4 porciones**, son **sin lácteos** y mantienen un perfil **low-carb**; cuando corresponde, el hidrato queda indicado únicamente como opcional.

Mismo flujo y forma de modelo que las tandas anteriores. **Solo-alta e idempotente.**

## Archivos (poner en `scripts/seed-data/`)
- `recetas_bondiola.json` — 10 recetas en la forma actual del modelo.
- `ingredientes_nuevos_bondiola.json` — 3 posibles ingredientes nuevos.

## Contenido
### Rápidas (5)
1. Bondiola a la mostaza, miel y romero.
2. Bondiola al ajillo, limón y perejil.
3. Bondiola con hongos al Malbec.
4. Bondiola oriental con soja, jengibre y sésamo.
5. Bondiola ahumada con cebolla morada.

### Especiales / complejas (5)
6. Bondiola braseada al Malbec con hongos y echalotes.
7. Bondiola laqueada con naranja, soja y jengibre.
8. Bondiola rellena de espinaca y almendras.
9. Bondiola estilo porchetta con ajo, hinojo y hierbas.
10. Bondiola al achiote y cítricos.

### Resumen funcional
- `tipoItem`: Receta principal ×10.
- `proteinaPrincipal`: Cerdo ×10.
- `sinLacteos`: true ×10.
- `hidratos`: false ×10.
- `paraJuanPablo`: true ×10.
- `porcionesMin/Max`: 4 ×10.
- Cinco recetas de `Cocina rápida`; cinco para `Cena Especial` o `Celebración`.

## Ingredientes potencialmente nuevos (3)
- `pasta de achiote` — Condimento y aderezo → Almacen / secos.
- `semillas de hinojo` — Hierba y especia → Almacen / secos.
- `hilo de cocina` — Utensilio → Bazar / otros.

Si alguno ya existe en el catálogo vivo, reutilizar el canónico existente y no crear duplicado.

## Diagnóstico antes de escribir (D1–D4)
- **D1 — Forma del modelo.** Comparar `recetas_bondiola.json` con `src/types/models.ts` y con la última tanda importada. Reportar cualquier campo o enum incompatible.
- **D2 — Enums.** Confirmar especialmente `proteinaPrincipal: Cerdo`, técnicas (`Salteado`, `Horneado`, `Braseado`), estilos y valores de dificultad. No modificar datos antes de informar discrepancias.
- **D3 — Ingredientes nuevos vs catálogo vivo.** Verificar los 3 canónicos nuevos. Confirmar también que `Almacen / secos` y `Bazar / otros` estén presentes en `ORDEN_GONDOLA`.
- **D4 — Referencias.** El archivo contiene 107 referencias de ingredientes, de las cuales 4 apuntan a los 3 canónicos propuestos como nuevos. Confirmar 0 referencias sin resolver antes de escribir.

> **GATE:** con D1–D4 correctos, mostrar el diagnóstico y esperar `procedé` antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Exportar las colecciones `recetas` e `ingredientes` a `scripts/backups/seed_bondiola_*_<ts>.json`.

## Ejecución
Clonar el script de la última tanda de recetario a `scripts/seedRecetarioBondiola.ts` y cambiar solamente los paths de entrada a:
- `scripts/seed-data/recetas_bondiola.json`
- `scripts/seed-data/ingredientes_nuevos_bondiola.json`

Mantener admin SDK, resolución `canon → idIngrediente` en runtime, IDs correlativos, timestamps, idempotencia y política de solo-alta. Ninguna receta usa `alternativas`.

## Validación final
1. Consola: creados los ingredientes que no existían y 10 recetas nuevas.
2. En `/biblioteca`: filtrar por proteína **Cerdo** y verificar las 10.
3. Filtro **sin lácteos**: deben aparecer las 10.
4. Abrir y revisar:
   - **Bondiola oriental**: soja, jengibre, sésamo y brócoli.
   - **Bondiola rellena**: espinaca, almendras e hilo de cocina.
   - **Bondiola al achiote**: pasta de achiote y tortillas solo como hidrato opcional.
5. Lista de compras:
   - `pasta de achiote` en **Almacen / secos**.
   - `semillas de hinojo` en **Almacen / secos**.
   - `hilo de cocina` en **Bazar / otros**.
6. Reejecutar el script: 0 recetas y 0 ingredientes creados.

## Reglas
- Nada de escrituras antes de `procedé`.
- Solo-alta: nunca sobrescribir ni borrar.
- Si el catálogo ya tiene un canónico equivalente, usarlo y reportar el ajuste.
- No introducir lácteos en ninguna de las diez recetas.
- No convertir los hidratos opcionales en ingredientes obligatorios.
