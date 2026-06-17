# PROMPT E8.8 — Fusionar duplicados en el catálogo de ingredientes

> **Etapa 8 — ciclo de diseño post-E7.13.** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** la versión que dejó E8.7. Verificá el header y reportá.
> **Al terminar: commit + push** — ver "Cierre".

## Por qué (leer: parte de esto YA existe)

La **detección de duplicados AL IMPORTAR ya está implementada** y NO hay que rehacerla:
`src/lib/matcherIngredientes.ts` (exacto / prefijo de palabra / fuzzy por trigramas) +
Paso 2 de `ImportarReceta.tsx` (badges ✓Exacto / ⚠Sugerencias / +Nuevo, elegir existente,
guardar el texto como sinónimo). Eso queda como está.

Lo que **falta** es el caso que el importador no cubre: **fusionar dos ingredientes que YA
están guardados** como duplicados (ej. quedó "Ajo" y "ajo", o "Tomate" y "Tomates" de cargas
viejas). Esta herramienta vive en el **catálogo** (`/biblioteca/catalogo`), no en el importador.

## Cambios de código

### 1. Detección de pares duplicados (catálogo)
Helper (en `src/lib/` o junto a la ruta) que, sobre el catálogo completo, devuelve pares
candidatos a duplicado. Reglas mínimas:
- Normalizar nombre con `normalizeText` (ya existe en `src/lib/canonical.ts`) y además
  neutralizar plural simple (trailing "s"). Reutilizar lo que haya antes de inventar.
- Par candidato si los nombres normalizados son **iguales** o uno es **prefijo de palabra**
  del otro (≥3 chars). Opcional: sumar fuzzy por trigramas reusando `similitudTrigramas`.
- Excluir ambiguos (esos van por el flujo "Por completar").
- No marcar como duplicado un par que ya esté vinculado por sinónimo.

### 2. Operación de fusión (data layer) — `src/data/ingredientes.ts`
`fusionarIngredientes(keepId, dropId): Promise<Result<void, AppError>>` que, en **batch /
transacción**:
- **Mueve referencias en recetas**: todas las recetas con `ingredientes[].idIngrediente ===
  dropId` pasan a `keepId`. (Consultar las recetas afectadas; actualizar el/los ítems.)
  ⚠️ Si una receta ya tenía `keepId` y `dropId` (quedarían dos ítems del mismo), decidir:
  fusionar los dos ítems en uno (sumar cantidades si aplica) o dejar ambos. Documentar.
- **Sinónimos**: agregar a `keep.sinonimos` el `canonico`/`nombrePreferido` de `drop` y todos
  los `drop.sinonimos` (sin duplicar, sin el propio nombre de keep).
- **Equivalencias** (de E8.7, si ya está): reapuntar a `keepId` cualquier `equivalencias` que
  contenga `dropId`; unir `drop.equivalencias` en `keep`; nunca dejar self-ref.
- **vecesUsado**: recalcular para `keep` (idealmente recontando referencias reales tras el
  move; si es caro, sumar `keep+drop` como aproximación y anotarlo).
- **Borrar** el doc `drop`. Invalidar cache.
- Idempotente / seguro ante fallo parcial (por eso batch o transacción).

### 3. UI en el catálogo — `src/routes/CatalogoIngredientes.tsx`
- **Banner "N posibles duplicados"** (solo JP) arriba de "Por completar", con color `--info-*`.
  Cada par es una fila tappable "A ↔ B · Revisar".
- **Bottom-sheet "Fusionar duplicados"** (portal, patrón de E8.3):
  - Sección **"Conservar"** con dos opciones tipo radio (A / B), cada una con
    categoría · góndola · vecesUsado. Default: el más usado.
  - Tarjeta **"Después de fusionar"**: usos combinados, cuántas recetas se mueven, que el
    nombre eliminado queda como **sinónimo** (+ lista de sinónimos resultante).
  - Botón primario **"Fusionar en '{keep}'"** → `fusionarIngredientes` → toast → refrescar.
  - Toda con tokens (anda en dark mode).
- Tras fusionar, el par desaparece del banner y el `drop` de la lista.

### 4. Firestore rules
Confirmar que JP puede `update` recetas e `delete` ingredientes (ya cubierto si las rules de
E8.3 permiten delete de ingredientes y JP puede escribir recetas). Reportar si hubo que tocar.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch del header. Reportá versión.
2. Subsección `### 1.2.E8.8 Cambios en vX.Y.Z (E8.8 — fusionar duplicados en catálogo)`:
   aclarar que la **detección al importar ya existía** (matcher + Paso 2) y que esto agrega la
   **fusión de duplicados ya guardados**; documentar `fusionarIngredientes` y el move de
   referencias.
3. En §11, marcar **E8.8 como ✅ HECHO (vX.Y.Z)** → con esto el **Lote 8 queda cerrado**.
4. Registrar `**PROMPT_E8.8_fusionar_duplicados.md** ✅ CERRADO (vX.Y.Z)`.

## Criterio de aceptación
1. El catálogo lista pares duplicados reales (probar con un "Ajo"/"ajo" o "Tomate"/"Tomates"
   sembrado).
2. Fusionar mueve las referencias de recetas al que se conserva, suma sinónimos, borra el otro.
3. Elegir cuál conservar cambia el resultado y el label del botón.
4. Tras fusionar baja el conteo del banner; los miembros no ven el banner.
5. Build + typecheck + tests verdes (test de `fusionarIngredientes`: referencias movidas +
   sinónimos + borrado).
6. Pegá la subsección 1.2.E8.8 y el estado de §11 (Lote 8 cerrado).

## Fuera de scope
- Rehacer la detección al importar (ya existe).
- Fusión automática sin confirmación (siempre la decide JP).
- Merge de recetas o de menús (esto es solo ingredientes).

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E8.8: fusionar duplicados de ingredientes en el catálogo (move refs + sinónimos) + MAPEO (cierra Lote 8)"
git push
```
Confirmá push OK.
