# PROMPT E8.5 — Ingrediente → recetas que lo usan  (+ renumerar §11 a un solo eje)

> **Etapa 8 — ciclo de diseño post-E7.13.** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** v1.9.2 (lo dejó E8.4). Verificá el header y reportá.
> **Al terminar: commit + push** — ver "Cierre".

## Cambio 0 — unificar la numeración de §11 (docs)

Hoy §11 Lote 8 usa sub-números `8.1/8.2/8.3…` que conviven con los IDs de prompt `E8.x` y
confunden. Unificar a **un solo eje = `E8.x`**:
- Reescribir las líneas del Lote 8 para que cada feature se titule por su **`E8.x`** (no
  `8.1/8.2`). Mapeo: `8.1 → E8.3` (catálogo editable, ya hecho), `8.3 → E8.5` (este),
  `8.2 → E8.6` (editor clasificación), `8.4 → E8.7` (sustituciones), `8.5 → E8.8` (duplicados).
- Borrar el bloque "Mapa backlog → prompts / crosswalk": ya no hace falta con un solo eje.
- No tocar los Lotes 1–7 ni su numeración.
Reportá el antes/después de las líneas del Lote 8.

## Por qué

En el catálogo, el dato "usado en N recetas" (`Ingrediente.vecesUsado`) es un número muerto.
Se diseñó hacerlo **navegable**: al abrir un ingrediente, ver la lista de recetas que lo
referencian y poder abrir cada una. Versión **liviana y directa** del 7.2 (NO es el matcher
inverso "qué cocino con lo que tengo" — eso sigue siendo 7.2).

## Lo que ya existe (usar)
- `getRecetas(): Promise<Receta[]>` (`src/data/recetas.ts`).
- `Receta.ingredientes[]` con `idIngrediente` (cada ítem de la receta referencia el catálogo).
- La ruta del catálogo y su bottom-sheet de edición (de E8.3): acá se le **agrega una sección**.

## Cambios de código

### 1. Derivar recetas por ingrediente
En la ruta del catálogo (`src/routes/CatalogoIngredientes.tsx`) o un hook chico:
- Cargar `getRecetas()` una vez (junto al catálogo). Construir un índice
  `Map<idIngrediente, Receta[]>` recorriendo `receta.ingredientes[].idIngrediente`.
- **Match por `idIngrediente`, no por nombre.** (El prototipo matcheó por texto porque no
  tiene IDs; en código usar el ID, que es la verdad.)
- Si querés evitar cargar todas las recetas siempre, alternativa: query
  `where("ingredientes"... )` no es directa en Firestore con array de objetos — lo más simple
  y correcto acá es `getRecetas()` cacheado (ya hay patrón de cache en el repo). Decidir y
  documentar; para el volumen actual (~80 recetas) traer todo está bien.

### 2. Sección "En N recetas" en el sheet del ingrediente
Dentro del bottom-sheet de edición (debajo de los campos categoría/góndola/roles):
- Encabezado "En N recetas" / "No figura en ninguna receta todavía".
- Lista de recetas (nombre + `cocina · proteinaPrincipal · tiempoTotalLabel`), cada una
  navegable a `/receta/:idReceta`. Al navegar, cerrar el sheet.
- Coherencia: este conteo real puede diferir de `vecesUsado` (que se mantiene al importar).
  Si difieren, **mostrar el conteo derivado** (es la verdad presente) y — opcional — anotar
  para un futuro "recalcular vecesUsado". No bloquear.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch del header. Reportá versión.
2. Subsección `### 1.2.E8.5 Cambios en vX.Y.Z (E8.5 — ingrediente → recetas que lo usan)`:
   índice derivado por `idIngrediente`, sección en el sheet, relación con 7.2 (esto es la
   versión liviana, no el matcher inverso).
3. En §11, marcar **E8.5 como ✅ HECHO (vX.Y.Z)** (ya con la numeración unificada del Cambio 0).
4. Registrar `**PROMPT_E8.5_ingrediente_recetas.md** ✅ CERRADO (vX.Y.Z)`.

## Criterio de aceptación
1. Abrir un ingrediente usado (ej. "Cebolla") muestra "En N recetas" con la lista correcta
   por `idIngrediente`.
2. Tocar una receta navega a su detalle y cierra el sheet.
3. Un ingrediente no usado muestra el estado vacío.
4. Build + typecheck + tests verdes.
5. Pegá la subsección 1.2.E8.5, el antes/después de §11 Lote 8 (renumerado) y el estado E8.5.

## Fuera de scope
- Matcher "qué cocino con lo que tengo" (eso es 7.2, mini-proyecto).
- Recalcular `vecesUsado` masivamente (anotarlo si difiere, no implementarlo acá).

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E8.5: ingrediente → recetas que lo usan (índice por idIngrediente) + renumera §11 a eje único + MAPEO"
git push
```
Confirmá push OK.
