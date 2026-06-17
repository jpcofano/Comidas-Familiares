# Resumen de sesión — 31/05/2026 (E9: proteínas jerárquicas + diccionario canónico)

## Contexto del proyecto

**App:** Comida Familiar Cofano — planificación semanal de comidas para 4 personas (JP, María, Sofía, Federico), dieta keto/baja en hidratos. JP es intolerante a lácteos.

**Repo:** `https://github.com/jpcofano/Comidas-Familiares` (privado)
**Local:** `C:\Users\...\OneDrive\Documentos\AppsScript\Comidas-Familiares`
**Firebase:** `comida-familiar` (live en `https://comida-familiar.web.app`) — Spark, sin Cloud Functions.
**Stack:** Vite + React 19 + TS + Firebase (Auth + Firestore + Hosting).

---

## Qué se decidió en esta sesión

El disparador fue el dropdown de "proteínas" (mezclaba criterios). Tras investigación profunda
sobre clasificación de recetas e ingredientes, se rediseñó el sistema de categorías alineándolo
a estándares (facetas independientes: una faceta = un criterio).

### Decisiones cerradas

1. **Proteína pasa de plana (13) a jerárquica (10 hojas en 5 grupos).** Filtrable por hoja
   (ej. Cerdo) y por grupo entero (ej. todas las carnes rojas).
   - Grupos: Carnes rojas (Vacuna, Cerdo, Cordero) · Aves · Pescados y mariscos (Pescado,
     Mariscos) · Huevos · Vegetales (Legumbres, Semillas, Frutos secos, Vegetal).
   - `Pollo` → `Aves`. Se eliminan de proteína: `Fiambre` (→ origen), `Mixta` (→ dominante),
     `Vegetariana` (→ faceta Dieta).
   - **Revierte decisiones de E3.4.8.2 y E5.2.1** (que habían conservado Mixta/Vegetariana).
     JP lo aprobó explícitamente al pedir alinear todo a la investigación.

2. **Faceta Dieta nueva:** `esVegetariano` y `esKeto` como booleanos filtrables (la investigación
   marca que las etiquetas dietéticas son atributos, no categorías de proteína). `sinLacteos` y
   `hidratos` ya existían y se mantienen como dimensiones de primera clase.

3. **Diccionario canónico de ingredientes (265 entradas):** los 177 actuales + 88 comunes
   argentinos. Es la fuente de verdad. Reemplaza `scripts/seed-data/catalogo_ingredientes.json`.
   - 5 correcciones de datos corruptos: Jengibre y Tomate estaban como "Lácteo", Repollo como
     "Carne", Palta como "Fruta" (→ Verdura, criterio culinario), Nuez moscada como semilla.
   - Criterios: categoría por uso culinario (no botánico); compuestos por forma final (passata =
     Despensa); rol nutricional independiente de categoría (palta = Verdura + Grasa); góndola por
     punto de compra.

4. **Prompt del generador de recetas blindado:** clasificación CERRADA (proteína, tipoItem, etc.
   solo de la lista), ingredientes ABIERTOS pero guiados (prefiere canónico; si es nuevo, lo agrega
   ya clasificado con dimensiones cerradas). Cierra el loop del matcher literal.

### Reclasificación de las 18 recetas (Vegetariana + Mixta)

- ~15 vegetarianas puras (purés, guarniciones, postres) → `proteinaPrincipal = "Vegetal"` +
  `esVegetariano = true`. NO se les inventa proteína animal.
- 3 Mixtas con proteína animal real → Code muestra ingrediente dominante y JP confirma:
  - REC-1012 Brochettes pollo y carne → Aves o Vacuna
  - REC-1503 Huevos rellenos de atún → Huevos o Pescado
  - REC-1104 Bowl de yogur → Huevos o Vegetal

---

## Entregables de la sesión

| Archivo | Destino | Estado |
|---|---|---|
| `PROMPT_E9.0_proteinas_jerarquicas_y_diccionario.md` | `docs/prompts/` | listo para ejecutar |
| `PROMPT_E9.1_blindar_prompt_generador.md` | `docs/prompts/` | listo (ejecutar DESPUÉS de E9.0) |
| `diccionario_canonico.json` (265) | renombrar → `scripts/seed-data/catalogo_ingredientes.json` | listo |
| `DICCIONARIO_CANONICO_ingredientes.md` | revisión de JP (no lo usa Code) | generado |

---

## Pendiente / por confirmar al ejecutar

- **Renombrar el JSON:** `diccionario_canonico.json` → `catalogo_ingredientes.json` (pisar el viejo
  de 177). El script de reseed lee ese nombre exacto.
- **Reseed destructivo:** `reseed-ingredientes.ts` hace wipe + recarga. Si hay ingredientes creados
  por imports recientes que no estén en las 265, se perderían. El diagnóstico de E9.0 debe
  confirmar el estado de la colección `ingredientes` antes de pisar. (JP no resolvió aún si el
  reseed debe pasar a no-destructivo/merge.)
- **Regla de `esKeto`:** propuesta = `!hidratos`. JP la valida cuando Code la proponga.
- **Tamaño del prompt del generador:** si embeber los 265 nombres lo hace muy pesado para pegar,
  alternativa = listar solo los ~80 más usados.
- **Drift a unificar:** `bootstrap-config.ts` tiene 10 proteínas vs. 13 en `models.ts`. E9.0 lo
  unifica a las 10 hojas nuevas en los 4 puntos de sincronización.

## Orden de ejecución

1. Renombrar JSON + commitear los 2 prompts a `docs/prompts/`.
2. Code ejecuta **E9.0** (diagnóstico → espera OK → bloques C, B, A → commit/push/deploy).
3. Code ejecuta **E9.1** (blindaje del prompt del generador → commit/push).
