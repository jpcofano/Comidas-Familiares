# PROMPT E8.7 — Sustituciones / equivalencias de ingredientes

> **Etapa 8 — ciclo de diseño post-E7.13.** Toca código + `docs/MAPEO_FIRESTORE.md`
> (y posiblemente `firestore.rules`).
> **MAPEO vigente esperado:** la versión que dejó E8.6. Verificá el header y reportá.
> **Al terminar: commit + push** — ver "Cierre".

## Por qué

Se diseñó poder marcar que un ingrediente **se puede reemplazar por** otro (ej. manteca ↔
aceite). Es una **equivalencia general y reusable del catálogo**, distinta de las dos cosas
que YA existen y que NO hay que tocar:
- **`sinonimos`** (catálogo): otros nombres del **mismo** ingrediente ("palta" = "aguacate").
- **`grupoAlternativa`** (importador/receta): el "X *o* Y" propio de **una** receta puntual.

Esto es un **tercer concepto**: equivalencia a nivel catálogo, válida en cualquier receta.

## Modelo de datos

Agregar a `Ingrediente` (`src/types/models.ts`) un campo nuevo:
```ts
equivalencias?: string[];   // idIngrediente[] — sustitutos generales (catálogo)
```
- **Relación simétrica**: si A.equivalencias incluye B, B.equivalencias debe incluir A. La
  reciprocidad se mantiene en la capa de datos (ver abajo), no se delega a la UI.
- No confundir con `sinonimos` (string[] de nombres) ni con `alternativas`/`grupoAlternativa`
  de la receta.

## Cambios de código

### 1. Data layer  (`src/data/ingredientes.ts`)
- `setEquivalencia(idA, idB): Promise<Result<void>>` — agrega B a A y A a B (batch /
  `arrayUnion`), invalida cache.
- `quitarEquivalencia(idA, idB): Promise<Result<void>>` — saca B de A y A de B
  (`arrayRemove`).
- En **`eliminarIngrediente(id)`** (creado en E8.3): además de borrar el doc, **quitar `id` de
  las `equivalencias` de todos los que lo referencian** (consultar `where("equivalencias",
  "array-contains", id)` y limpiar en batch). Así no quedan punteros colgados.

### 2. UI en el editor del catálogo  (`src/routes/CatalogoIngredientes.tsx`)
En el bottom-sheet de edición (debajo de categoría/góndola/roles), sección **"Se puede
reemplazar por"** (con un ícono de swap):
- Lista de chips de los sustitutos actuales (nombre + `×` para quitar → `quitarEquivalencia`).
- Dropdown **"+ Agregar sustituto…"** con los demás ingredientes del catálogo (excluyendo el
  propio y los ya agregados) → `setEquivalencia`.
- Nota chica que lo distingue de sinónimos y del "X o Y" de receta.
- Solo-JP (mismo guard que el resto del editor).
- Usar tokens de color (`--accent-soft` / `--accent` para los chips, etc.), respeta dark mode.

### 3. (Opcional, si entra fácil) Mostrar equivalencias donde sea útil
- En el detalle de receta, al lado de un ingrediente, un hint "o {sustituto}" si el catálogo
  define equivalencia. **Opcional**; si agrega complejidad, dejarlo para otro prompt y
  reportarlo. No bloqueante.

### 4. Firestore rules
Confirmar que JP puede `update` el nuevo campo en `/ingredientes/{id}` (ya cubierto si las
rules permiten `write` de JP). Reportar si hubo que tocar algo.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch del header. Reportá versión.
2. Subsección `### 1.2.E8.7 Cambios en vX.Y.Z (E8.7 — equivalencias de ingredientes)`:
   documentar el campo `equivalencias`, la simetría, las funciones nuevas, la limpieza en
   `eliminarIngrediente`, y **dejar explícita la diferencia** con `sinonimos` y
   `grupoAlternativa` (para que no se confundan a futuro).
3. En la doc del modelo `Ingrediente` (donde se listan sus campos), agregar `equivalencias`.
4. En §11, marcar **E8.7 como ✅ HECHO (vX.Y.Z)**.
5. Registrar `**PROMPT_E8.7_equivalencias.md** ✅ CERRADO (vX.Y.Z)`.

## Criterio de aceptación
1. Se puede agregar/quitar un sustituto a un ingrediente y persiste.
2. Es **bidireccional**: agregar B en A hace que A aparezca en B; quitar también.
3. Borrar un ingrediente lo saca de las equivalencias de los demás (sin punteros colgados).
4. La sección usa tokens (se ve bien en light y dark).
5. Build + typecheck + tests verdes (agregá un test de simetría en `ingredientes.test.ts`).
6. Pegá la subsección 1.2.E8.7 y el estado de §11 E8.7.

## Fuera de scope
- Sugerir automáticamente equivalencias (es manual, lo decide JP).
- Aplicar la sustitución en la lista de compras (sería otro prompt).
- Tocar `sinonimos` o `grupoAlternativa`.

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E8.7: equivalencias de ingredientes (catálogo, bidireccional) + limpieza en borrado + MAPEO"
git push
```
Confirmá push OK.
