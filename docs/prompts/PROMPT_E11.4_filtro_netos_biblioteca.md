# PROMPT E11.4 — Filtro "hidratos netos ≤ N g" en Biblioteca

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> Difería de E11.3 (Tarea 3 opcional). Ahora que TODAS las recetas calculan macros reales
> (E11.3.x cerrado), agregar el filtro por hidratos netos. **Numerar al próximo libre** si
> `E11.4` ya existe.

## Objetivo

En Biblioteca (`src/routes/Biblioteca.tsx`, pestaña Recetas), permitir filtrar por
**hidratos netos por porción ≤ N g** — el número keto real, no el flag `esKeto`. Las recetas
**sin datos de macros** (cobertura 0) **NO matchean** el filtro (no mostrar como si fueran 0 g).

## Contexto técnico (ya en el repo)

- `macrosDeReceta(receta, catalogo)` (`src/lib/macros.ts`) devuelve
  `{ porPorcion, hidratosNetosPorPorcion, cobertura, ingredientesSinDatos, ... }`.
  `cobertura === 0` significa que no se pudo estimar nada.
- `getCatalogo(): Promise<Map<string, Ingrediente>>` (`src/data/ingredientes.ts`) — el
  catálogo que `macrosDeReceta` necesita como 2º argumento. **Biblioteca hoy NO lo carga.**
- Filtros: `src/lib/filtros.ts` (`FiltrosReceta`, `FILTROS_INICIALES`, `filtrarRecetas`,
  `hayFiltrosActivos`). `Biblioteca.tsx` arma los controles y llama `filtrarRecetas`.

## Tarea 1 — Cargar el catálogo en Biblioteca y precomputar netos

- En `Biblioteca.tsx`, cargar el catálogo una vez (`getCatalogo()`), junto con las recetas.
  Manejar loading/error igual que hoy (no romper la lista si el catálogo falla — en ese caso
  el filtro de netos queda deshabilitado, el resto funciona).
- Precomputar, con `useMemo`, un `Map<idReceta, { netos: number; cobertura: number }>`
  llamando `macrosDeReceta(r, catalogo)` para cada receta. (Memoizar por `recetas`+`catalogo`
  para no recalcular en cada tecla.)

## Tarea 2 — Extender el modelo de filtros

En `src/lib/filtros.ts`:
- Agregar a `FiltrosReceta`: `maxNetos: number | null` (gramos; `null` = sin filtro).
- En `FILTROS_INICIALES`: `maxNetos: null`.
- `filtrarRecetas` necesita los netos por receta. Como el cálculo depende del catálogo (no
  está en `Receta`), elegí UNA:
  - **(preferida)** que `filtrarRecetas` reciba un 3er arg opcional
    `macrosPorReceta?: Map<string, { netos: number; cobertura: number }>`, y cuando
    `filtros.maxNetos != null`, excluya recetas cuya entrada **no exista**, tenga
    `cobertura === 0`, o `netos > maxNetos`.
  - alternativa: pre-filtrar en el componente antes de `filtrarRecetas`. Mantené la lógica
    pura testeable.
- Sumar `maxNetos` a `hayFiltrosActivos`.

## Tarea 3 — Control en la UI (pestaña Recetas)

Junto a los toggles existentes (Sin lácteos / Sin hidratos / Vegetariana / Keto), agregar el
control de netos. Formato sugerido — **chips de umbral** (más simple que un slider y suficiente):

- Un grupo "Netos ≤" con opciones rápidas: **10 g · 20 g · 30 g** (botones estilo toggle,
  mismo patrón visual que los otros filtros; activo = `btn-primary`). Tocar el activo lo apaga.
- `maxNetos` guarda el valor elegido (o `null`).
- Que "Limpiar" lo resetee (ya lo hace si está en `FILTROS_INICIALES` y `hayFiltrosActivos`).

> Coherencia: 10 g ≈ keto estricto, 20 g ≈ keto, 30 g ≈ low-carb. Si preferís un solo
> umbral configurable, un `<input type="number">` chico también sirve — pero los chips
> evitan teclear y combinan con el resto de la barra.

## Tarea 4 — Mostrar los netos en la card (refuerzo, opcional pero recomendado)

Para que el filtro tenga sentido visual, en `RecetaCard` (Biblioteca) mostrar los netos
cuando la cobertura > 0: un chip discreto "X g netos" (reusar estilo de pill, tono neutro o
`accent`). Si no hay datos, no mostrar nada. Así el usuario ve por qué una receta matchea.
Si esto agranda mucho el diff, dejarlo como nota y hacer solo el filtro.

## Criterios de aceptación

- Activar "Netos ≤ 10 g" deja solo recetas con `hidratosNetosPorPorcion ≤ 10` y cobertura > 0;
  las sin datos desaparecen (no aparecen como 0 g).
- Combinable con los otros filtros (proteína, cocina, sin lácteos, etc.) y con la búsqueda.
- "Limpiar" resetea también el umbral de netos.
- Si el catálogo no carga, la lista sigue funcionando y el filtro de netos no rompe nada.
- `npm run build` y `npm run test` verdes (agregá un test de `filtrarRecetas` con `maxNetos`:
  receta bajo umbral matchea, sobre umbral no, sin-datos no).

## Qué NO tocar

- NO `src/lib/macros.ts` (se consume tal cual).
- NO `DetalleReceta.tsx` ni la `MacrosCard`.
- NO los datos del catálogo / `macros.json`.

## Cierre

- Commit: `E11.4: filtro hidratos netos ≤ N g en Biblioteca (recetas sin datos no matchean)`.
- Actualizá `docs/MAPEO_FIRESTORE.md` (§5 macros + cerrar E11.4 en §11).
- `npm run build && firebase deploy --only hosting`. `git push`.
