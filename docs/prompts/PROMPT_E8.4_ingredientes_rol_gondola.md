# PROMPT E8.4 — Ingredientes de receta: chips de letra por sección + toggle rol/góndola

> **Etapa 8 — ciclo de diseño post-E7.13.** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** la versión que dejó E8.3. Verificá y reportá.
> **Al terminar: commit + push** — ver "Cierre".

## Por qué (con un hallazgo importante del diagnóstico)

En el detalle de receta, los ingredientes se agrupan por sección pero **les falta la letra del
chip** (Principal, Base, Salsa caen a un punto `·`). Causa raíz confirmada en el código:

- El importador (`src/import/parseReceta.ts`) lee la **primera columna** del bloque
  `#INGREDIENTES` como `seccion` y **defaultea a `"Principal"`**. Los TXT reales usan ahí
  **secciones culinarias**: `Principal`, `Base de sabor`, `Condimentos`, etc.
  (ver el placeholder de `ImportarReceta.tsx`).
- Pero `src/components/receta/IngredientesPorGondola.tsx` trata `ing.seccion` como **góndola**
  y lo pinta con `GondolaChip` → `getSeccionMeta()` **solo conoce góndolas** → cualquier
  sección culinaria cae al fallback `'Despensa / otros'` con letra `·`.

O sea: **el dato del rol culinario YA existe** en `ing.seccion`. NO hay que agregar campo ni
re-taggear recetas. Hay que (1) darle letras/colores propios a las secciones culinarias y
(2) ofrecer además una vista **por góndola** derivada del catálogo. Decisión de diseño:
**toggle "Por rol / Por góndola"** en el detalle de receta.

## Cambios de código

### 1. Meta de secciones culinarias  (`src/lib/catalogo.ts`)
Agregar un mapa **letra + color** para las secciones culinarias (las que aparecen en
`ing.seccion`), separado de `SECCIONES_META` (que es de góndola). Sugerido:

```
Principal → P    Base de sabor → B    Líquido de cocción → L    Salsa → S
Condimentos → C  Cocción → C          Guarnición → G            Opcional familia → O
```
- Exponer `getSeccionRecetaMeta(seccion): { letra, color }` con **fallback a la inicial**
  (`seccion.trim().charAt(0).toUpperCase()`) para secciones libres no listadas — el campo es
  texto libre en el importador, así que **no** se valida contra un enum cerrado (no romper
  imports). Opcional: exportar `ORDEN_SECCION_RECETA` para ordenar los grupos.
- Colores en `oklch(...)` para mantener armonía con el brand (como `SECCIONES_META`).

### 2. Componente de ingredientes con toggle  (`src/components/receta/IngredientesPorGondola.tsx`)
Renombrar a algo neutro (ej. `IngredientesReceta.tsx`) o mantener el nombre, pero:
- **Vista "Por rol" (default):** agrupar por `ing.seccion` y pintar cada header con la
  **letra correcta** vía `getSeccionRecetaMeta` (esto **arregla el bug del punto**).
- **Vista "Por góndola":** agrupar por la **góndola del catálogo**. La receta no guarda la
  góndola por ingrediente; se obtiene del catálogo: `getCatalogo()` → por
  `ing.idIngrediente` leer `seccionGondola`; agrupar con `groupByGondola` + `GondolaChip`
  (lo que el componente ya hacía, pero ahora con el dato correcto, no con `ing.seccion`).
  Ingredientes sin match en catálogo → grupo "Otros".
- **Toggle** chico arriba de la lista ("Por rol" / "Por góndola"), default "Por rol".
  Recordar la preferencia en `localStorage` (ej. `cf-ingredientes-vista`) es deseable.
- La vista por góndola necesita el catálogo (async): cargar una vez en el padre
  (`DetalleReceta`) o en el componente con un estado de carga liviano. Si el catálogo no
  cargó aún, mostrar la vista por rol (no bloquear).

### 3. Chips de letra en los componentes de menú  (`src/routes/DetalleMenu.tsx`)
Los componentes del menú ya tienen `comp.tipo` (Principal, Guarnición, Postre, …). Mostrar a
la izquierda de cada componente el **mismo chip de letra** (`getSeccionRecetaMeta(comp.tipo)`)
para consistencia visual con el detalle de receta. (Esto es lo que el prototipo mostraba.)

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch del header.
2. Subsección `### 1.2.E8.4 Cambios en vX.Y.Z (E8.4 — secciones de ingredientes + toggle)`:
   documentar el hallazgo (`ing.seccion` = sección culinaria, antes mal tratada como góndola),
   el mapa de letras nuevo, el toggle rol/góndola (góndola derivada del catálogo) y los chips
   en componentes de menú. Aclarar que **no cambia el modelo de datos**.
3. Si en §10 hay deuda anotada sobre el chip/punto de ingredientes, cerrarla acá.
4. Registrar `**PROMPT_E8.4_ingredientes_rol_gondola.md** ✅ CERRADO (vX.Y.Z)`.

## Criterio de aceptación
1. En el detalle de receta, los grupos por rol muestran **letras** (P, B, L, S, C, G), nunca `·`.
2. El toggle cambia entre "Por rol" (de `ing.seccion`) y "Por góndola" (de catálogo) y la
   preferencia persiste.
3. Los componentes del menú muestran el chip de letra por `tipo`.
4. Build + typecheck + tests verdes. (Si renombraste el componente, actualizá los imports.)
5. Pegá la subsección 1.2.E8.4.

## Fuera de scope
- No agregar un campo nuevo al modelo (el dato ya está en `ing.seccion`).
- No validar `seccion` contra un enum cerrado (rompería imports con secciones libres).
- No re-taggear recetas existentes.

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E8.4: chips de letra por sección de ingrediente + toggle rol/góndola + chips en menú + MAPEO"
git push
```
Confirmá push OK.
