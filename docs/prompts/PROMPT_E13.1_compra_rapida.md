# PROMPT E13.1 — "Compra rápida": listas de compra plantilla por comercio, asignables

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> Funcionalidad nueva. Hay mockup aprobado (design system → "Compra rápida · lista
> recurrente", 2 pantallas). **Numerar al próximo libre** si `E13.1` ya existe.

## Concepto

Una **Compra rápida** es una lista de compras **manual, por comercio** (Verdulería, Chino,
Carrefour…), independiente de las recetas de la semana. Caso real: "comprá la fruta y verdura
de siempre". Modelo mental = receta + plan, reusando la maquinaria existente:

- **Plantilla** (= como una Receta): título "Compra rápida · {destino}", lista de ítems del
  **catálogo** con cantidad + unidad. Fija, vive en Biblioteca. Es la fuente de verdad.
- **Instancia semanal** (= como un Plan): se **genera copiando** la plantilla (mismos ítems y
  cantidades), se **asigna a un miembro**, que la ve en su semana y va tildando hasta "hecha".
  **Editar la instancia NO toca la plantilla.** La próxima semana se genera de nuevo desde la
  plantilla limpia.

**Solo JP crea/edita plantillas y genera/asigna instancias.** Los miembros solo ven la
instancia que se les asignó.

## Modelo de datos (reusar lo existente)

### Plantilla — extender `Receta` (NO crear colección nueva)
Agregar a `Receta` (todos opcionales, retrocompatibles):
- `esCompraRapida?: boolean` — marca la receta como plantilla de compra.
- `destino?: string` — comercio ("Verdulería", "Chino", "Carrefour"…). Texto libre.
- Para una compra rápida: `ingredientes[]` se usa como la lista (cada uno con
  `idIngrediente`, `textoOriginal` = nombrePreferido, `cantidad`, `unidad`,
  `seccion` = `seccionGondola` del catálogo). `pasos`, macros, tiempos, dificultad → vacíos/no aplican.
- Reusar `crearReceta` / `actualizarReceta` / `proximoIdReceta` (`src/data/recetas.ts`).

### Instancia — extender `Plan` (NO colección nueva)
- `crearPlan` ya existe (`src/data/planes.ts`). La instancia es un Plan con:
  - referencia a la plantilla (idReceta/idSeleccion como ya hace un plan normal),
  - `asignaciones: [memberId]` (a quién se le encarga),
  - un **snapshot editable de ítems** en el plan, p.ej. `itemsCompraRapida?: Array<{
    idIngrediente: string; nombre: string; cantidad: string|number; unidad: string;
    seccionGondola: string; comprado: boolean }>` — copiado de la plantilla al generar, todo
    `comprado: false`. (Snapshot para que ajustar cantidades/ítems no afecte la plantilla.)
  - estado simple: reusar `"Compra pendiente"` → `"Compra lista"` (= hecha) del enum de estados,
    o agregar un set mínimo si ensucia. NO meter la máquina de cocción (no hay "Cocinando").

> Si preferís una colección `comprasRapidas` separada en vez de reusar Plan, está permitido,
> pero **justificá** por qué y asegurá que el Member Dashboard (E12.1) la muestre igual. La
> opción reuse-Plan es la preferida porque el dashboard del miembro ya lista sus planes.

## Tarea 1 — Crear/editar plantilla (pantalla, solo JP)

Pantalla "Compra rápida" (entrada desde Biblioteca o Compras). Campos:
- **Destino**: input con prefijo fijo "Compra rápida ·" (el título final es "Compra rápida · Verdulería").
- **Ítems del catálogo**: buscador sobre el catálogo (`getCatalogo()` / `buscarIngredientes`).
  Al elegir uno, se agrega como fila con:
  - **cantidad**: stepper `− N +` (default 1; permitir fracciones tipo "1/2" como texto).
  - **unidad**: selector precargado con `ingrediente.unidadesHabituales` (si hay una sola, no
    mostrar selector; default = primera). 
  - chip de góndola (letra+color) a la izquierda, derivado de `seccionGondola`.
  - botón quitar (×).
- **Atajo "+ Agregar toda la góndola {X}"**: opción para sembrar de una todos los ingredientes
  del catálogo de una `seccionGondola` (después JP saca lo que no quiere). Opcional pero recomendado.
- **Asignar a**: chips de miembro (selección única).
- CTA: **"Guardar plantilla y generar la de esta semana"** → guarda la plantilla (Receta con
  `esCompraRapida`) y crea la instancia (Plan) copiando los ítems, asignada al miembro elegido.

## Tarea 2 — Generar instancia desde plantilla

- Desde una plantilla existente (en Biblioteca, las compras rápidas se listan con su
  ícono/diferenciador), botón **"Generar la de esta semana"**: copia ítems+cantidades al
  snapshot del Plan, `comprado:false`, semana actual (`getSemanaActual`), asignado (heredado de
  la plantilla, reasignable). Arranca **igual a la plantilla** (cantidades incluidas).
- Editar la instancia (cantidades, agregar/quitar ítems, marcar comprado) **no** modifica la plantilla.

## Tarea 3 — Vista del asignado (instancia)

- En el Member Dashboard (E12.1), la compra rápida asignada aparece como **una card tipo receta**
  con su lista, **agrupada por góndola** (reusar el agrupador de `src/lib/catalogo.ts` /
  `agruparPorGondola`). Header: avatar de JP + "De JP", título "Compra rápida · {destino}",
  estado + progreso "N de M comprados".
- Tocar un ítem lo tilda (tachado). Botón **"Marcar compra como hecha"** (habilitado al
  completar, o siempre, definilo). Al marcarse, JP la ve cerrada.
- Diferenciar visualmente de los platos a cocinar (no es una comida): usar el color de góndola
  verdulería / un ícono de bolsa, no la barra de color de miembro.

## Tarea 4 — Biblioteca / Compras: listado de plantillas

- En Biblioteca (o una subsección en Compras), listar las compras rápidas existentes
  (filtrar `esCompraRapida === true`; **excluirlas de la lista normal de recetas** para no
  mezclarlas con comidas). Cada una con su destino, nº de ítems, y acciones JP:
  generar de esta semana / editar / eliminar.

## Criterios de aceptación

- JP crea "Compra rápida · Verdulería" con ítems del catálogo (cantidad+unidad), la asigna a
  Federico y genera la instancia.
- Federico (login miembro) ve la card en su semana, agrupada por góndola, tilda ítems y marca hecha.
- Editar cantidades en la instancia NO cambia la plantilla; re-generar desde la plantilla trae
  las cantidades originales.
- Las compras rápidas NO aparecen en la lista normal de recetas ni cuentan como comidas/macros.
- Un miembro no ve las compras rápidas asignadas a otro.
- `npm run build` y `npm run test` verdes.

## Qué NO tocar

- NO la lógica de macros (E11.x) — una compra rápida no calcula macros.
- NO la generación de lista de compras desde planes de receta (flujo existente intacto).

## Cierre

- Commit: `E13.1: Compra rápida — listas de compra plantilla por comercio, asignables a un miembro`.
- Actualizá `docs/MAPEO_FIRESTORE.md` (nueva sección: campos `esCompraRapida`/`destino` en
  Receta, `itemsCompraRapida` en Plan, y el flujo plantilla→instancia).
- `npm run build && firebase deploy --only hosting`. `git push`.
