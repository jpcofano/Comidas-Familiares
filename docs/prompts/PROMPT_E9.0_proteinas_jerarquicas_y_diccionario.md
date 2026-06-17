# PROMPT E9.0 — Proteínas jerárquicas + faceta Dieta + diccionario canónico de ingredientes

> **App:** Comida Familiar — proyecto Firebase `comida-familiar`.
> **MAPEO vigente:** confirmar el número exacto en el header al abrir.
> **Fuente de verdad del modelo:** `src/types/models.ts` (lección de E5.2 — `proteinaPrincipal` se había desincronizado en 4 lugares; no repetir).
> **Branch sugerido:** `feat/e9-proteinas-y-diccionario`.
> **Adjuntos de este prompt:** `diccionario_canonico.json` (265 entradas, fuente de verdad de ingredientes).

Este prompt tiene **tres bloques** que deben ir en este orden porque hay dependencia:
el diccionario de ingredientes (Bloque C) es prerequisito de la reclasificación de
proteínas (Bloque B), porque la inferencia de proteína usa la `categoria` del ingrediente.

---

## ⛔ BLOQUE 0 — DIAGNÓSTICO OBLIGATORIO (no implementar nada todavía)

Antes de tocar una sola línea, Code debe **mostrar evidencia copy-paste real** de:

1. **Forma literal de `proteinaPrincipal`** en 3 recetas de Firestore Console
   (una con `"Pollo"`, una con `"Vegetariana"`, la receta con `"Fiambre"`).
   Confirmar que el valor es **string** y no objeto `{label, orden}`.
2. **Conteo real por valor** de `proteinaPrincipal` en la colección `recetas`
   (debería dar: Huevos 22, Vegetariana 15, Frutos secos 7, Semillas 7, Vacuna 6,
   Pollo 6, Cerdo 4, Mariscos 4, Mixta 3, Pescado 2, Legumbres 1, Fiambre 1).
3. **Estado de los 4 puntos de sincronización** de proteínas: pegar el valor actual de
   (a) `PROTEINAS` en `models.ts`, (b) `/config/diccionarios.proteinas` en Console,
   (c) la línea `proteinaPrincipal:` del prompt en `/config/importador.promptLLM`,
   (d) la validación en `src/import/parseReceta.ts`.
   **Reportar si los 4 coinciden o divergen** (se sospecha drift: `bootstrap-config.ts`
   tiene 10 valores, `models.ts` tiene 13).
4. **Forma literal de un ingrediente** del catálogo (campos `categoria`,
   `rolNutricional`, `seccionGondola`) en Console.

**Code se detiene acá y espera OK de JP antes de seguir.** No implementar con el diagnóstico
en la misma corrida.

---

## BLOQUE C — Diccionario canónico de ingredientes (va primero)

### C.1 — Seedear el diccionario canónico

Usar el adjunto `diccionario_canonico.json` (265 entradas) como fuente de verdad.
Es el catálogo actual (177) con **5 correcciones de datos** + **88 comunes argentinos** nuevos.

Las 5 correcciones (datos hoy corruptos en Firestore) son:

| ID | Campo | Antes (corrupto) | Ahora (canónico) |
|---|---|---|---|
| ING-0087 Jengibre fresco | categoria / rol / góndola | Lacteo / [Proteina,Grasa] / Lacteos | Hierba y especia / [Fibra/Vegetal] / Verduleria |
| ING-0159 Tomate fresco | categoria / rol / góndola | Lacteo / [Proteina,Grasa] / Lacteos | Verdura / [Fibra/Vegetal] / Verduleria |
| ING-0146 Repollo blanco | categoria / rol / góndola | Carne / [Proteina] / Carniceria | Verdura / [Fibra/Vegetal] / Verduleria |
| ING-0113 Palta | categoria / rol | Fruta / [Grasa,Fibra/Vegetal] | Verdura / [Grasa] |
| ING-0109 Nuez moscada | categoria | Semilla y fruto seco | Hierba y especia |

**Criterios canónicos aplicados (documentar en MAPEO, vienen de investigación):**
- `categoria` por **uso culinario**, no botánico: palta y tomate son Verdura.
- **Productos compuestos por su forma final**: passata / tomate triturado quedan
  en Despensa (no Verdura); salsa de soja en Condimento (no Legumbre);
  leche de coco en Despensa (no Lácteo — no contiene lácteo).
- `rolNutricional` **independiente** de `categoria`: palta es Verdura pero rol Grasa
  (relevante para keto). Batata/choclo/zapallo son Verdura pero rol Hidrato.
- `seccionGondola` por **dónde se compra**, no por qué es.

### C.2 — Reglas de aceptación (evidencia copy-paste)

- Pegar de Console los 5 ingredientes corregidos mostrando los campos nuevos.
- Confirmar conteo total del catálogo = 265.
- Idempotencia: re-correr el seed no debe duplicar ni cambiar nada.

---

## BLOQUE B — Proteínas jerárquicas + reclasificación

### B.1 — Nueva estructura de proteínas (en `models.ts`, fuente de verdad)

Reemplazar el enum `PROTEINAS` actual (13 valores planos) por **10 hojas limpias de origen**:

```ts
export const PROTEINAS = [
  "Vacuna", "Cerdo", "Cordero",        // grupo Carnes rojas
  "Aves",                               // grupo Aves (ex-"Pollo")
  "Pescado", "Mariscos",                // grupo Pescados y mariscos
  "Huevos",                             // grupo Huevos
  "Legumbres", "Semillas", "Frutos secos", // grupo Vegetales
  "Vegetal",                            // sin proteína animal (guarniciones/postres)
] as const;
export type Proteina = typeof PROTEINAS[number];

// Jerarquía de 2 niveles (grupo → hojas). Permite filtrar por grupo entero o por hoja.
export const GRUPOS_PROTEINA: Record<string, Proteina[]> = {
  "Carnes rojas":        ["Vacuna", "Cerdo", "Cordero"],
  "Aves":                ["Aves"],
  "Pescados y mariscos": ["Pescado", "Mariscos"],
  "Huevos":              ["Huevos"],
  "Vegetales":           ["Legumbres", "Semillas", "Frutos secos", "Vegetal"],
} as const;
export const GRUPOS_PROTEINA_ORDEN = [
  "Carnes rojas", "Aves", "Pescados y mariscos", "Huevos", "Vegetales",
] as const;
```

**Cambios vs. los 13 actuales:** `Pollo`→`Aves`; se elimina `Fiambre`, `Mixta`,
`Vegetariana` de proteína; se agrega `Vegetal`.

### B.2 — Migración de las 78 recetas

- **`Pollo` → `Aves`** (6 recetas): renombre directo.
- **`Fiambre` (1 receta, identificar cuál):** reasignar a su animal de origen según el
  ingrediente real (jamón→Cerdo, pastrón→Vacuna). Code muestra el ingrediente dominante
  y propone; JP confirma.
- **`Vegetariana` (15) y `Mixta` (3):** reclasificar usando **inferencia por categoría de
  ingrediente** contra el catálogo **ya corregido** (Bloque C). Regla:
  - Si la receta NO tiene ningún ingrediente con `rolNutricional` incluyendo `"Proteina"`
    de categoría animal → `proteinaPrincipal = "Vegetal"` + `esVegetariano = true`.
    (Aplica a ~15 recetas: purés, guarniciones, postres, chips.)
  - Si tiene proteína animal con categoría inequívoca (`Huevo`→Huevos,
    `Pescado y marisco`→Pescado/Mariscos, `Legumbre`→Legumbres) → esa.
  - Si la categoría es ambigua (`Carne` no distingue vaca/cerdo/cordero;
    ej. REC-1012 brochettes de pollo y carne) → **Code NO adivina**: muestra los
    ingredientes proteicos y su cantidad, propone la dominante por cantidad, y marca
    para confirmación de JP.

**Las 3 recetas que requieren decisión de JP (mostrar y esperar):**
- REC-1012 (Mixta) Brochettes de pollo y carne → Aves o Vacuna (por cantidad)
- REC-1503 (Mixta) Huevos rellenos de atún → Huevos o Pescado (por dominante)
- REC-1104 (Mixta) Bowl de yogur con frutas → Huevos (tiene huevo) o Vegetal

### B.3 — Filtro por hoja Y por grupo (en `src/lib/filtros.ts`)

`GRUPOS_PROTEINA` y las hojas no colisionan (un grupo nunca es valor de
`proteinaPrincipal`). Ajustar `filtrarRecetas`:

```ts
if (filtros.proteina) {
  const hojasDeGrupo = GRUPOS_PROTEINA[filtros.proteina];
  if (hojasDeGrupo) {                                  // seleccionó un grupo
    if (!hojasDeGrupo.includes(r.proteinaPrincipal)) return false;
  } else if (r.proteinaPrincipal !== filtros.proteina) { // seleccionó una hoja
    return false;
  }
}
```

### B.4 — Dropdown jerárquico (`<optgroup>`) en los 6 selects que usan `PROTEINAS`

En `Biblioteca.tsx` (y los otros 5: ImportarReceta, DetalleReceta, Home, DetalleMenu,
CatalogoIngredientes) reemplazar el `.map` plano por grupos con cabecera seleccionable:

```tsx
<option value="">Todas las proteínas</option>
{GRUPOS_PROTEINA_ORDEN.map(grupo => (
  <optgroup key={grupo} label={grupo}>
    <option value={grupo}>Todas: {grupo}</option>
    {GRUPOS_PROTEINA[grupo].map(p => <option key={p} value={p}>{p}</option>)}
  </optgroup>
))}
```

---

## BLOQUE A — Faceta Dieta (nueva, según investigación)

La investigación es explícita: las etiquetas dietéticas deben ser **atributos booleanos
filtrables**, no ramas del árbol de categorías. `Vegetariana` era un régimen metido en
proteína por error.

### A.1 — Campos nuevos en `Receta` (`models.ts`)

```ts
sinLacteos: boolean;       // YA EXISTE — mantener (JP es intolerante)
hidratos: boolean;         // YA EXISTE — true = lleva hidratos
esVegetariano: boolean;    // NUEVO — sin proteína animal
esKeto: boolean;           // NUEVO — derivable: sinLacteos? no necesariamente; = !hidratos && bajo en carbos
```

- `esVegetariano`: setear `true` en las ~15 recetas reclasificadas a `Vegetal` y en
  cualquiera sin proteína animal.
- `esKeto`: regla = `!hidratos` (las recetas keto de la familia no llevan hidratos).
  Confirmar la regla con JP antes de backfill.

### A.2 — Filtro de dieta en Biblioteca

Agregar a `FiltrosReceta`: `esVegetariano: boolean`, `esKeto: boolean` (junto a los ya
existentes `sinLacteos`, `sinHidratos`). Checkboxes en el panel de filtros.

---

## Sincronización obligatoria (4 puntos — lección E5.2)

Cualquier cambio en proteínas debe quedar consistente en los 4:
1. `src/types/models.ts` (`PROTEINAS`, `GRUPOS_PROTEINA`, `Proteina`) — **fuente de verdad**.
2. `/config/diccionarios.proteinas` en Firestore — re-correr script de sync.
3. `/config/importador.promptLLM` — actualizar la línea `proteinaPrincipal: [...]`
   con las 10 hojas nuevas + las categorías de ingrediente habilitadas (ver abajo).
4. `src/import/parseReceta.ts` — validación del parser.

Además unificar el drift: `bootstrap-config.ts` debe quedar con los mismos valores.

### Prompt del importador — categorías habilitadas

Actualizar `/config/importador.promptLLM` para que liste **explícitamente** los valores
permitidos de cada campo, incluyendo:
- `proteinaPrincipal`: las 10 hojas nuevas (Vacuna, Cerdo, Cordero, Aves, Pescado,
  Mariscos, Huevos, Legumbres, Semillas, Frutos secos, Vegetal).
- Para ingredientes, instruir al LLM a usar las `categoria` canónicas (17 valores),
  `rolNutricional` (6) y `seccionGondola` (9 raw) del diccionario.

---

## MAPEO_FIRESTORE.md (mismo commit)

Agregar entrada **E9.0** documentando:
- Proteína pasa de plana (13) a jerárquica (10 hojas en 5 grupos), filtrable por ambos niveles.
- `Vegetariana`/`Mixta`/`Fiambre` salen de proteína (revierte decisiones E3.4.8.2 y E5.2.1
  — JP lo aprobó explícitamente al alinear todo a la investigación).
- Nueva faceta Dieta (`esVegetariano`, `esKeto`) como atributos booleanos.
- Diccionario canónico de ingredientes (265 entradas) como fuente de verdad + las 5
  correcciones de datos.
- Criterios canónicos: uso culinario, productos compuestos por forma final, rol
  independiente de categoría, góndola por punto de compra.

## Commits sugeridos

- `Stage 9.0-C: diccionario canónico ingredientes (265) + 5 fixes datos`
- `Stage 9.0-B: proteínas jerárquicas + migración 78 recetas + filtro hoja/grupo`
- `Stage 9.0-A: faceta Dieta (esVegetariano/esKeto) + filtros`
- `Stage 9.0: sync 4 puntos + prompt importador + MAPEO E9.0`

---

## Cierre de la sesión (obligatorio al terminar)

Tras aplicar los 3 bloques y verificar las reglas de aceptación:

1. **Commit** por bloque (los 4 commits `Stage 9.0-*` de arriba), incluyendo el MAPEO en el mismo commit que el código/datos que documenta.
2. **Push al remoto:** `git push origin feat/e9-proteinas-y-diccionario` — dejar el repo remoto sincronizado con el local. No dejar commits solo locales.
3. **Deploy a Firebase:**
   ```
   firebase use comida-familiar        # confirmar alias
   npm run build
   firebase deploy --only hosting
   ```
   (Los cambios de datos en Firestore ya quedaron aplicados por los scripts de seed; el deploy es solo para el código del front: filtros, optgroup, faceta dieta.)
4. **Reportar:** hash de cada commit, confirmación de push, y URL/resultado del deploy.

> Nota datos vs. código: la migración de proteínas y el reseed del catálogo escriben en Firestore (no se "deployan"). El `firebase deploy` publica solo el front. Verificar ambos: Console (datos) + app en vivo (filtros nuevos).
