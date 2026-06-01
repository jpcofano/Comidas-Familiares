# PROMPT E11.3 — Macros por porción: UI (detalle de receta + plan-menú)

## Objetivo

Tercera y última etapa de **Macros por porción**. E11.1 dejó el helper `macrosDeReceta()` y
E11.2 pobló los datos en `/ingredientes`. Acá se muestra el resultado: una tarjeta de macros
**por porción** en el detalle de receta (con hidratos netos como número estrella), el agregado
en plan-menú, y opcionalmente un filtro por hidratos netos en la biblioteca.

## Contexto (verificado en E11.1 / E11.2)

- Helper puro: `macrosDeReceta(receta, catalogoById): MacrosReceta` en `src/lib/macros.ts`.
  Devuelve `porPorcion`, `hidratosNetosPorPorcion`, `cobertura` (0..1) y `ingredientesSinDatos[]`.
- Catálogo ya cacheado en memoria vía `getCatalogo()` (`src/data/ingredientes.ts`).
- Detalle de receta: `src/routes/DetalleReceta.tsx`.
- Pantalla de componentes de un plan-menú: `src/routes/SeleccionarComponenteMenu.tsx`
  (y/o `DetalleMenu.tsx` para el detalle del menú).
- Biblioteca + filtros: `src/routes/Biblioteca.tsx`, `src/lib/filtros.ts`
  (`FiltrosReceta`, `filtrarRecetas`).
- Hay design tokens del proyecto (CSS vars) — usalos, no inventes colores hardcodeados.

## ⚠️ Diagnóstico obligatorio — antes de codear

Pegá:

1. **Cómo `DetalleReceta.tsx` obtiene el catálogo hoy.** ¿Llama `getCatalogo()`, lo recibe por
   prop, o no lo tiene cargado? Mostrá el fragmento. La tarjeta de macros necesita el
   `Map<idIngrediente, Ingrediente>` para llamar al helper — reusá la carga existente si ya está.
2. **Estructura actual del detalle de receta:** el orden de las secciones (hero, meta, pills,
   ingredientes, pasos, acciones JP, sticky Cocinar). Necesito saber dónde insertar la tarjeta.
3. **Patrón de un filtro existente** en `filtros.ts` (`esKeto` o `proteina`): cómo se define en
   `FiltrosReceta`, cómo se aplica en `filtrarRecetas`, cómo es el control en `Biblioteca.tsx`.
   (Solo si vas a hacer la Tarea 3 opcional.)

## Decisiones ya tomadas

- **Número estrella = hidratos netos por porción.** Es lo que le importa a una familia keto.
  Va destacado (tamaño grande / token de acento), el resto (kcal, proteínas, grasas, fibra,
  hidratos totales) en secundario.
- **Siempre mostrar la cobertura.** Texto tipo "Estimado sobre N de M ingredientes". Nunca
  presentar los números como exactos: incluir la palabra "estimado".
- **Cobertura 0 → no mostrar números.** Mostrar un estado vacío discreto:
  "Sin datos de macros para esta receta todavía." (No romper, no mostrar 0 g engañoso.)
- **Reusar `macrosDeReceta()` tal cual.** No reimplementar cálculo en el componente.

## Tareas

1. **Tarjeta de macros en `DetalleReceta.tsx`.**
   - Cargá/reusá el catálogo como mapa y llamá `macrosDeReceta(receta, catalogoById)`.
   - Renderizá una tarjeta "Macros estimadas por porción":
     - Línea principal grande: **Hidratos netos: `{hidratosNetosPorPorcion.toFixed(1)} g`**.
     - Secundario: `kcal`, `Proteínas {g}`, `Grasas {g}`, `Fibra {g}`, y `Hidratos totales {g}`.
     - Pie: "Estimado sobre {M-sinDatos} de {M} ingredientes" usando `cobertura`/
       `ingredientesSinDatos`. Si `cobertura < 1`, dejarlo claro.
   - Ubicación: coherente con la estructura que viste en el diagnóstico (sugerencia: después de
     las MetaCards / antes de ingredientes). Estilo con tokens existentes.
   - Si `cobertura === 0` → estado vacío discreto, sin números.

2. **Agregado en plan-menú.** En `SeleccionarComponenteMenu.tsx` (o `DetalleMenu.tsx`, donde
   tenga más sentido visual), mostrá las macros estimadas **por porción del menú completo** =
   suma de `porPorcion` de cada receta componente (recorré `componentes[]`, resolvé cada
   `idReceta`, sumá). Aclará en el texto que es "una porción del menú completo (todos los
   componentes)". Misma regla de cobertura: si algún componente no tiene datos, reflejarlo.

3. **(OPCIONAL — solo si las Tareas 1 y 2 quedaron limpias y sobra margen.)** Filtro
   "Hidratos netos ≤ N g/porción" en `Biblioteca.tsx` + `filtros.ts`, siguiendo el patrón del
   filtro `esKeto` que viste en el diagnóstico. Recetas sin datos de macros NO matchean el
   filtro (no asumir que son bajas en hidratos). Si esta tarea agrega complejidad o riesgo,
   **dejala fuera** y anotala como pendiente de E11.4 — no es bloqueante.

## Criterios de aceptación (evidencia copy-paste / capturas)

- Captura del detalle de **una receta con buena cobertura** mostrando la tarjeta con hidratos
  netos destacados + el pie de cobertura.
- Captura de una receta de **baja o cero cobertura** mostrando el estado degradado correcto
  (sin números engañosos).
- Captura del **agregado en un plan-menú** con su nota de "porción del menú completo".
- Si hiciste la Tarea 3: captura del filtro funcionando + confirmación de que una receta sin
  macros queda excluida al activarlo.
- `npm run build` sin errores. Deploy: `npm run build && firebase deploy --only hosting`.

## Qué NO tocar

- NO `macros.ts` / `conversiones.ts` (lógica de E11.1, ya testeada).
- NO los datos del catálogo (E11.2).
- NO la faceta `esKeto` / `esVegetariano` existente — la tarjeta de macros es adicional,
  no la reemplaza.
- NO Security Rules (es solo lectura de datos que ya existen).

## Cierre

- Commits con prefijo `Stage 11.3:`.
- Actualizá `MAPEO_FIRESTORE.md` (mismo commit): en §5 (mapping pantalla→queries) agregá la
  tarjeta de macros del detalle; cerrá E11.x en §11 (Lote 11) marcando la feature completa.
  Si dejaste la Tarea 3 afuera, anotá E11.4 (filtro por hidratos netos) como pendiente.
