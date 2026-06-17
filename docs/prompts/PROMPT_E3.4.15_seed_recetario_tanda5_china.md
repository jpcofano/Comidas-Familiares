# PROMPT E3.4.15 — Seed recetario "tanda 5 · China" (10 recetas + 6 ingredientes)

Segunda tanda del plan "10 clásicos por cocina". China arrancaba en **cero**. Diez clásicos reconocibles, adaptados a low-carb (sin azúcar → eritritol, sin fécula → reducción/salsa, sin arroz → coliflor opcional) y con ingredientes conseguibles acá. La cocina china es naturalmente sin lácteos: **las 10 van `sinLacteos: true`**.

Mismo flujo y forma de modelo que las tandas anteriores. **Solo-alta e idempotente.**

## Archivos (ponelos en `scripts/seed-data/`)
- `recetas_tanda5.json` — 10 recetas (forma actual del modelo).
- `ingredientes_nuevos_tanda5.json` — 6 ingredientes nuevos.

## Contenido
Cerdo agridulce sin azúcar (Cerdo), Pollo kung pao (Aves), Res con brócoli (Vacuna), Mapo tofu (Vegetal — carne picada opcional), Char siu de cerdo (Cerdo), Chow mein de repollo y vegetales (Vegetal), Sopa agripicante (Entrada, Vegetal), Langostinos salteados con ajo y jengibre (Mariscos), Berenjenas estilo Sichuan (Guarnición, Vegetal), Huevos revueltos con tomate (Vegetal).
- **Desglose:** `tipoItem` Receta principal ×8, Entrada ×1, Guarnición ×1. Proteína Vegetal ×5, Cerdo ×2, Aves/Vacuna/Mariscos ×1. Todas `hidratos: false`, `sinLacteos: true`, `paraJuanPablo: true`. 7 traen `hidratoOpcional: "Arroz de coliflor"`.
- **Ingredientes nuevos (6):** Salsa de ostras, Doubanjiang, Cinco especias chinas, Pimienta de Sichuan (→ `Almacen / secos`), Tofu firme (→ `Lacteos y frescos`), Brócoli (→ `Verduleria`).
- **Reúso:** `jerez seco` (de la Tanda 3) hace de vino de cocción chino (reemplazo local del Shaoxing) en res con brócoli, char siu y langostinos.

## Diagnóstico antes del `procedé` (D1–D4)
- **D1 — Forma del modelo.** Verificá `recetas_tanda5.json` contra `src/types/models.ts`. Reportá discrepancias antes de tocar.
- **D2 — Enums.** Confirmá válidos: `tipoItem` ∈ {Receta principal, Entrada, Guarnición}; `proteinaPrincipal` ∈ {Vegetal, Cerdo, Aves, Vacuna, Mariscos}; `costoEstimado` ∈ {Bajo, Medio, Alto}; `dificultad` ∈ {Baja, Media}. `tecnicaPrincipal` usa Salteado/Horneado/Hervido (confirmá que `tecnicaPrincipal` sea texto libre o, si es enum, que esos valores existan).
- **D3 — Ingredientes nuevos vs catálogo vivo + categorías a chequear.** De los 6, reportá cuáles ya existen (el script los saltea). Tres avisos:
  - **`brocoli`** — muy probable que el seed de góndolas (E3.4.11) ya lo haya creado. Si existe, usá esa entrada (el script lo saltea); si no, lo creo con `categoria: "Verdura"`, `seccionGondola: "Verduleria"`. Confirmá que la `categoria` que use calce con la convención de las demás verduras del catálogo.
  - **`tofu firme`** — lo definí con `categoria: "Despensa varios"`, `rolNutricional: ["Proteina"]`, `seccionGondola: "Lacteos y frescos"`. Si el catálogo tiene una categoría mejor para proteína vegetal (ej. una propia de legumbres/soja), decímelo y lo realineo. **No es bloqueante** para sembrar.
  - **`salsa de ostras` / `doubanjiang` / `cinco especias chinas` / `pimienta de sichuan`** — los puse en `Condimento y aderezo` / `Hierba y especia` → `Almacen / secos`. Confirmá que esas categorías/sección sean las correctas.
- **D4 — Referencias sin resolver.** Confirmá **0 referencias de receta sin resolver** (109 refs: 103 a catálogo vivo + 6 a nuevos). El resto referencia canónicos ya vivos (salsa de soja, aceite de sésamo, vinagre de arroz, jengibre fresco, cebolla de verdeo, langostinos, repollo blanco, carne picada, bondiola de cerdo entera, jerez seco, etc.).

> **GATE:** con D1–D4 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

## Backup (post-`procedé`, pre-escritura)
Export de `recetas` e `ingredientes` a `scripts/backups/E3.4.15_*_<ts>.json`.

## Ejecución
Cloná `seedRecetarioTanda4.ts` a **`scripts/seedRecetarioTanda5.ts`** cambiando solo los dos paths de input a `*_tanda5.json`. Todo lo demás igual (admin SDK, idempotencia por canónico / `nombreCanonico`, resolución `canon → idIngrediente` en runtime, `REC-XXXX`/`ING-XXXX`, timestamps). Ninguna receta usa `alternativas`. Hay 2 ingredientes opcionales (carne picada en mapo tofu, pimienta de Sichuan en kung pao y mapo) — se siembran con `opcional: true`, igual que el resto.

## Validación (F4)
1. Consola: `F2: 6 creados …` (o menos si D3 encontró existentes) y `F3: 10 creadas …`.
2. En `/biblioteca`: aparecen las 10 y filtran por estilo **China**, por `tipoItem` **Receta principal** (8) y por proteína **Vegetal** (5). El filtro **sin lácteos** las muestra a las 10.
3. Abrí 3: **Mapo tofu** (ingrediente opcional carne picada + Sichuan; `proteinaPrincipal: Vegetal`), **Char siu de cerdo** (cinco especias + salsa de ostras + `hidratoOpcional`), **Res con brócoli** (brócoli + jerez seco como Shaoxing).
4. Lista de compras con **Res con brócoli** → que **brócoli** caiga en **Verduleria** y **salsa de ostras** en **Almacen / secos**; con **Mapo tofu** → **tofu firme** en **Lacteos y frescos**.
5. Re-corré el script: saltea todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Discrepancia con `models.ts` → reportar antes de tocar.
- Commit: `feat: E3.4.15 seed recetario tanda 5 china (10 recetas + 6 ingredientes)`.

---

### Próximas cocinas (mismo molde)
Francesa · India · Mexicana · Japonesa · Española (redondeo) · Estadounidense · Tailandesa/Coreana/Peruana/Árabe (completar) · Alemana. Decime cuál sigue.
