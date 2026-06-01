# PROMPT E11.1 — Macros por porción: tipos + conversión + lógica pura (sin UI, sin writes)

## Objetivo

Primera de tres etapas de la feature **Macros por porción**. Acá NO se toca UI ni se
escribe a Firestore. Se construye la base: extender el tipo `Ingrediente`, una tabla pura
de conversión unidad→gramos, y un helper puro `macrosDeReceta()` con tests. Las macros
todavía no existen en los datos (eso es E11.2); el helper debe degradar con elegancia
(reportar cobertura) cuando faltan.

**Por qué esta feature:** la app es para una familia keto/low-carb y hoy no hay ningún dato
cuantitativo de hidratos. El campo `esKeto` existente es solo `!hidratos` (booleano crudo).
Esto agrega hidratos netos / proteínas / grasas / kcal **por porción**, estimados.

## Contexto del proyecto (no re-investigar, ya está verificado)

- Stack: React 19 + Vite + TS + Firebase (Auth, Firestore, Hosting — Spark, sin Cloud Functions).
- Estado: v2.2.3, ciclo funcional completo. Esto abre **Etapa 11**.
- Fuente de verdad de tipos/enums: `src/types/models.ts`.
- Catálogo de ingredientes: colección `/ingredientes/{idIngrediente}` (177 docs, ING-0001..ING-0177).
- Recetas: `/recetas/{idReceta}` con `ingredientes[]` y `pasos[]` embebidos.
- Patrón de errores del proyecto: reads tiran excepción; writes devuelven `Result<T, Error>`.
  Acá no hay reads/writes nuevos — todo es puro.
- Helpers existentes a reutilizar: `normalizeText` / `canonicalizarIngrediente` en
  `src/lib/canonical.ts`; `normalizarUnidad` en `src/lib/unidades.ts`.

## ⚠️ Diagnóstico obligatorio — hacé ESTO antes de escribir una línea de lógica

No avances a las tareas sin pegar en tu respuesta la evidencia literal de estos 4 puntos.
Si algún shape no coincide con lo que asumo abajo, frená y reportá la diferencia.

1. **Shape literal de un doc `/ingredientes`.** Leé 1 doc real (script de read o consola) y
   pegá el JSON. Confirmá que existen: `rolNutricional: string[]`, `categoria`, `canonico`,
   `nombrePreferido`, `sinonimos[]`, `unidadesHabituales[]`. Confirmá que **NO** existe ya
   ningún campo `macros` ni `gramosPorUnidad`.

2. **Shape literal de un `ingredientes[]` dentro de una receta.** Pegá un elemento real.
   Confirmá los nombres reales de: el string de matching (`ingredienteCanonico`), `cantidadMin`,
   `cantidadMax`, `unidad`, `opcional`. Confirmá si los ítems de receta guardan o no un
   `idIngrediente` directo (sospecho que NO, que solo hay `ingredienteCanonico`).

3. **Mecanismo de resolución ingrediente-de-receta → doc de catálogo.** Mostrá cómo
   `sincronizarListaDesdeFirestore` (en `src/data/compras.ts`) resuelve un ingrediente de
   receta a un `idIngrediente` del catálogo (es ahí donde `ItemCompra.idIngrediente` se
   popula). Pegá el fragmento. El helper de macros debe reutilizar EXACTAMENTE esa lógica de
   resolución, no inventar una nueva.

4. **Lista real de unidades canónicas.** Pegá la lista de `unidadesCanonicas` desde
   `/config/diccionarios` y/o el mapa de `normalizarUnidad()` en `src/lib/unidades.ts`. La
   tabla de conversión de la Tarea 2 tiene que cubrir esos valores reales, no un set inventado.

## Decisiones ya tomadas (no re-litigar)

- **Base de macros: por 100 g** del ingrediente (base estándar de etiqueta nutricional).
- **Hidratos netos = `carbohidratos - fibra`**, con piso en 0. Es el número estrella.
- **Por porción = total ÷ `receta.porcionesMin`** (fallback a 4 si falta). Las recetas del
  proyecto son siempre 4 porciones.
- **Cantidad usada por ingrediente:** `(cantidadMin + cantidadMax) / 2`; si solo hay
  `cantidadMin`, usar ese. (En la práctica `min === max` casi siempre.)
- **Se ignoran (no rompen, se cuentan como "sin datos"):** ingredientes con `opcional: true`,
  los que no resuelven a un doc de catálogo, los que el catálogo no tiene `macros`, y los que
  `aGramos()` devuelve `null` (ej. "a gusto", unidad desconocida).
- **No hay sync de diccionarios.** `macros`/`gramosPorUnidad` son números, no enums. NO tocar
  `/config/diccionarios`, NO el patrón de 4 puntos de E5.2/E9.0. Solo se agrega al tipo en
  `models.ts`.

## Tareas

1. **`src/types/models.ts` — extender `Ingrediente`.** Agregar dos campos opcionales:
   ```ts
   macros?: {
     kcal: number;            // por 100 g
     carbohidratos: number;   // g por 100 g (totales)
     proteinas: number;       // g por 100 g
     grasas: number;          // g por 100 g
     fibra: number;           // g por 100 g
   };
   gramosPorUnidad?: number;  // g equivalentes a 1 "unidad" de este ingrediente
                              // (override para unidades no másicas: huevo, diente, etc.)
   ```
   Ambos opcionales y retrocompatibles. No tocar nada más del tipo.

2. **`src/lib/conversiones.ts` (nuevo) — conversión pura unidad→gramos.**
   - `export function aGramos(cantidad: number, unidad: string | null, ing?: Ingrediente): number | null`
   - `kg` → ×1000; `g` → ×1. Estas son exactas.
   - Para unidades de conteo/volumen (las que confirmaste en el diagnóstico: ej. `unidad`,
     `diente`, `cda`, `cdita`, `taza`, `pizca`, …) usar una **tabla de factores por defecto**
     en gramos aproximados. Documentá cada factor con un comentario de dónde sale.
   - **Override por ingrediente:** si `ing?.gramosPorUnidad` está definido y la unidad es de
     conteo (`unidad` / `diente` / etc.), usar `cantidad * ing.gramosPorUnidad` en vez del
     factor por defecto.
   - `unidad === null` (a gusto) → devolver `null`.
   - Unidad no reconocida → devolver `null` + `console.warn` (mismo patrón que `normalizarUnidad`).
   - Normalizá la unidad con `normalizarUnidad()` antes de buscar en la tabla.
   - Tests en `src/lib/conversiones.test.ts`: kg, g, una de conteo con y sin override,
     "a gusto" → null, unidad basura → null + warn.

3. **`src/lib/macros.ts` (nuevo) — helper puro.**
   ```ts
   export interface MacrosReceta {
     porTotal: { kcal: number; carbohidratos: number; proteinas: number; grasas: number; fibra: number };
     porPorcion: { kcal: number; carbohidratos: number; proteinas: number; grasas: number; fibra: number };
     hidratosNetosPorPorcion: number;     // max(0, carbohidratos - fibra) por porción
     porciones: number;                    // porcionesMin usado
     cobertura: number;                    // 0..1 = ingredientesConDatos / ingredientesComputables
     ingredientesSinDatos: string[];       // nombres de los que no se pudieron computar
   }
   export function macrosDeReceta(receta: Receta, catalogoById: Map<string, Ingrediente>): MacrosReceta;
   ```
   - Recibe el catálogo ya cargado (no hace fetch — sigue siendo puro y testeable).
   - Para cada ingrediente NO opcional: resolvé a su doc de catálogo **con la misma lógica
     de `sincronizarListaDesdeFirestore`** (la que pegaste en el diagnóstico). Calculá gramos
     con `aGramos(cantidad, unidad, ing)`. Si el ingrediente resolvió, tiene `macros` y
     `aGramos` no es null → aporta `macros.X * (gramos / 100)` a cada total. Si no → se suma a
     `ingredientesSinDatos`.
   - `cobertura = ingredientesConDatos / (ingredientesConDatos + ingredientesSinDatos)`.
     Si el denominador es 0, `cobertura = 0`.
   - Tests en `src/lib/macros.test.ts` con un fixture **hecho a mano**: 1 receta con 2-3
     ingredientes con macros conocidas + 1 sin macros + 1 opcional. Verificá los totales,
     el por-porción, los hidratos netos y la cobertura con números que puedas chequear a mano.

## Criterios de aceptación (con evidencia copy-paste, no checkboxes)

- Pegá la salida de `npx vitest run src/lib/conversiones.test.ts src/lib/macros.test.ts`
  en verde.
- Pegá **un ejemplo trabajado a mano**: tomá una receta real del seed, mostrá ingrediente por
  ingrediente (gramos calculados + aporte de carbs/prot/grasa/kcal), el total, el por-porción
  y los hidratos netos. Tiene que poder verificarse con calculadora. (Si ningún ingrediente
  tiene `macros` todavía porque E11.2 no corrió, hacé el ejemplo con un catálogo mock en el
  test y aclaralo.)
- Confirmá que `tsc --noEmit` pasa y que no se importó nada nuevo en componentes de UI.

## Qué NO tocar

- NO UI. NO `src/routes/*`, NO componentes.
- NO writes a Firestore. NO scripts de seed (eso es E11.2).
- NO la lógica de `esKeto` / `esVegetariano` / faceta Dieta — queda intacta.
- NO `/config/diccionarios` ni el patrón de sync de 4 puntos.
- NO Security Rules.

## Cierre

- Commits con prefijo `Stage 11.1:`.
- Actualizá `MAPEO_FIRESTORE.md` en el MISMO commit (regla del proyecto): agregá `macros?` y
  `gramosPorUnidad?` al shape de §2.10 marcados como "(E11.1, opcional)", y una entrada nueva
  en §11 (Lote 11) describiendo E11.1.
