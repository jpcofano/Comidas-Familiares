# PROMPT E8.3 — Catálogo de ingredientes editable (cualquier ingrediente + alta + baja)

> **Etapa 8 — ciclo de diseño post-E7.13.** Toca código + `docs/MAPEO_FIRESTORE.md`
> (y posiblemente `firestore.rules`). **Roadmap §11 Lote 8.1.**
> **MAPEO vigente esperado:** la versión que dejó E8.2. Verificá y reportá.
> **Al terminar: commit + push** — ver "Cierre".

## Por qué

Hoy `/biblioteca/catalogo` (`src/routes/CatalogoIngredientes.tsx`) **solo** resuelve
ingredientes **ambiguos** (los importados con defaults). Se diseñó un catálogo **navegable y
editable**: ver todo el catálogo agrupado por góndola, **editar cualquier** ingrediente
(categoría / sección de góndola / roles nutricionales / nombre), **crear** uno nuevo y
**eliminar**. Cierra el §11 Lote 8.1 y el gap "no hay edición de catálogo fuera de ambiguos".
Solo-JP (mismo guard que ya tiene la ruta).

## Lo que ya existe (usar, no reinventar) — `src/data/ingredientes.ts`
- `getCatalogo(): Promise<Map<string, Ingrediente>>` — todo el catálogo (para la lista).
- `getIngredientesAmbiguos()` — los ambiguos (sección "Por completar").
- `actualizarIngrediente(id, patch)` — editar.
- `crearIngrediente(...)` + `buildNuevoIngredienteDoc(...)` + `proximoIdIngrediente()` — alta.
- `getSeccionMeta` / `groupByGondola` en `src/lib/catalogo.ts` — chips de letra + agrupado.
- Listas canónicas: `CATEGORIAS_INGREDIENTE`, `ROLES_NUTRICIONALES`, `ORDEN_GONDOLA`.

## Cambios de código

### 1. Nueva función de baja  (`src/data/ingredientes.ts`)
`eliminarIngrediente(id): Promise<Result<void, AppError>>` — `deleteDoc(doc(db,"ingredientes",id))`,
`invalidateCatalogCache()`, manejo de error con el patrón `Result` del repo.

### 2. Ruta del catálogo  (`src/routes/CatalogoIngredientes.tsx`)
Reescribir la ruta (mantené el guard solo-JP y el back) para que tenga:
- **Header**: título "Ingredientes", subtítulo "N en el catálogo · ordenados por góndola",
  botón **"+ Nuevo"**.
- **"Por completar"** (igual que hoy): los ambiguos con editor inline para resolverlos.
- **Buscador** por nombre + **filtro por góndola** (chips).
- **Lista agrupada por góndola** (orden `ORDEN_GONDOLA`), cada grupo con su `GondolaChip` de
  letra. Cada fila: nombre + categoría + pills de rol nutricional + afordancia de editar
  (ícono lápiz). Tap en la fila → abre el editor.
- **Editor en bottom-sheet** (modal anclado abajo, scrim) para **editar o crear**:
  - Campos: **nombre** (text), **categoría** (`CATEGORIAS_INGREDIENTE`), **sección de
    góndola** (`ORDEN_GONDOLA`), **roles nutricionales** (toggles `ROLES_NUTRICIONALES`).
  - Guardar: `actualizarIngrediente` (edición) o `crearIngrediente` (alta). Toast de éxito.
  - **Eliminar** (solo en edición): botón con confirmación inline. ⚠️ Ver punto 3.
  - **Importante (React):** dar `key` al modal por id del ingrediente (o `"nuevo"`) para que
    el form se reinicialice al cambiar de ingrediente (no arrastrar estado viejo).
  - El sheet debe quedar **dentro del frame** y anclado al fondo (`position: fixed`/portal a
    nivel app), sin animación que lo deje fuera de viewport.

### 3. Borrado seguro
Un ingrediente puede estar referenciado por recetas (`ingredientes[].idIngrediente`). Antes
de permitir eliminar:
- Mostrar `vecesUsado` ("Usado en N recetas") en el editor.
- Si `vecesUsado > 0`, **pedir confirmación reforzada** (o, si se prefiere, bloquear el
  borrado y explicar "está en uso"). Decidir y dejarlo documentado. No romper recetas
  existentes silenciosamente.

### 4. Firestore rules  (`firestore.rules`)
Confirmar que JP puede `update`, `create` **y `delete`** en `/ingredientes/{id}`. Si las
rules actuales no permiten `delete`, agregarlo (solo JP). Reportar qué se cambió.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch del header.
2. Subsección `### 1.2.E8.3 Cambios en vX.Y.Z (E8.3 — catálogo de ingredientes editable)`:
   alcance (editar cualquiera / alta / baja), `eliminarIngrediente`, borrado seguro, rules.
3. Actualizar la descripción del catálogo donde el MAPEO hoy dice "resolución de ingredientes
   ambiguos" (ej. §1.2.tertdecies / § rutas) → "ahora también edición/alta/baja de cualquier
   ingrediente".
4. En §11, marcar **8.1 como ✅ HECHO (vX.Y.Z)**.
5. Registrar `**PROMPT_E8.3_catalogo_editable.md** ✅ CERRADO (vX.Y.Z)`.

## Criterio de aceptación
1. Se puede editar cualquier ingrediente del catálogo (no solo ambiguos) y persiste.
2. Se puede crear y eliminar (con la salvaguarda de uso).
3. La sección "Por completar" sigue funcionando.
4. Build + typecheck + tests verdes; rules deployadas si cambiaron.
5. Pegá la subsección 1.2.E8.3 y el estado de §11 8.1.

## Fuera de scope
- Editor de recetas (E8.4 / Lote 8.2). Sustituciones (8.4). Duplicados al importar (8.5).

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E8.3: catálogo de ingredientes editable (editar/crear/eliminar) + rules + MAPEO"
git push
```
Si cambiaron las rules: `firebase deploy --only firestore:rules`. Confirmá push OK.
