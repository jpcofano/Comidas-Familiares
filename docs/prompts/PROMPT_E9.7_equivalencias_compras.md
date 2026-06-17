# PROMPT E9.7 — Equivalencias en la lista de compras ("o {sustituto}")

> **Etapa 9 — Lote 9 (cierra el lote).** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** el que haya cuando lo corras (≥ v2.0.2). Verificá el header y reportá.
> **Al terminar: commit + push.**
>
> Numeración: E9.0/E9.0.1/E9.1, E9.2 (fix Historial), E9.3 (matcher), E9.4 (sustitución al
> cocinar), E9.5 (Biblioteca), E9.6 (detalle Historial) ya asignados. Esto es **E9.7**.

## Por qué

Cierra la tríada de "Cocinar con lo que hay": E9.3 (qué cocino) y E9.4 (sustituir al cocinar) ya
usan las `equivalencias` del catálogo (E8.7). Falta el tercer punto del backlog: **al armar la
compra, sugerir el sustituto** — si tenés que comprar Manteca y el catálogo dice que el aceite la
reemplaza, mostrarlo para que, si ya tenés aceite en casa, no la compres.

## Lo que ya existe (usar)
- `ItemCompra` (`types/models.ts`) con **`idIngrediente`** → resolvé equivalencias con
  `catalogo[item.idIngrediente].equivalencias` (idIngrediente[] → `nombrePreferido`).
- El catálogo ya se carga cacheado en varias rutas (`getIngredientes`, patrón E8.5).
- `Compras.tsx` (vista por receta y lista por góndola) + el chip de ítem tap-eable (marca
  `yaTengo`). Helper de toggle ya existe.
- Mismo patrón visual que E9.4: tono `--accent`, ícono swap.

## Cambios de código (`src/routes/Compras.tsx` + capa de datos mínima)

### 1. Resolver sustitutos por ítem
- Cargar el catálogo (mapa `Map<idIngrediente, Ingrediente>`) junto con la lista de compras.
- Para cada `ItemCompra`, derivar `sustitutos: string[]` = `catalogo[item.idIngrediente]?.equivalencias`
  resueltos a `nombrePreferido`. (Puede ser helper puro `sustitutosDeItemCompra(item, catalogoById)`
  en `src/lib/sustitutos.ts` — si E9.4 ya creó ese archivo, sumale esta función; reusá lógica.)

### 2. Pill de sustituto junto al ítem pendiente
- En el chip de ítem de compra, **solo si `!item.yaTengo` y hay sustitutos**, mostrar al lado una
  **pill "⇄ o {X}"** (tono `--accent` / `--accent-soft`, ícono swap, tokens — light y dark).
- **Agrupar el chip + la pill en un mismo contenedor `inline-flex`** para que no se separen en el
  wrap (la pill debe leerse pegada a su ítem).
- **Tocar la pill marca el ítem como `yaTengo`** (lo cubrís con el sustituto que ya tenés → no hace
  falta comprarlo). Misma acción que tocar el chip; la pill es el atajo + la sugerencia.
- Funciona en ambas vistas (por receta y lista completa por góndola).

### 3. Nada de cantidades/unidades
- No convertir cantidades (1 manteca ≠ 1 aceite). Solo sugerir el **nombre** del sustituto.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch. Reportá versión.
2. Subsección `### 1.2.E9.7 Cambios en vX.Y.Z (E9.7 — equivalencias en la lista de compras)`:
   resolución por `idIngrediente`, pill de sustituto en ítem pendiente, tap = marcar `yaTengo`.
3. En §11 Lote 9, marcar **E9.7 ✅ HECHO** y notar que **cierra el Lote 9 / la tríada de
   equivalencias** (E9.3 + E9.4 + E9.7).
4. Registrar `**PROMPT_E9.7_equivalencias_compras.md** ✅ CERRADO (vX.Y.Z)`.

## Criterio de aceptación
1. Un ítem a comprar cuyo ingrediente tiene equivalencia (ej. Manteca → Aceite de oliva) muestra
   la pill "⇄ o Aceite de oliva"; un ítem sin equivalencia no muestra nada.
2. Tocar la pill marca el ítem como `yaTengo` (sale de "faltan"); al estar `yaTengo`, la pill
   desaparece.
3. Anda en vista por receta y en lista completa, light y dark.
4. Helper de resolución con test (con/sin equivalencia, dedup). Build + typecheck + tests verdes.
5. Pegá el diff de `Compras.tsx` (+ helper) y la subsección 1.2.E9.7.

## Fuera de scope
- Conversión de cantidades/unidades del sustituto.
- "Despensa" persistente (eso es del matcher E9.3); acá la señal es solo la equivalencia del catálogo.

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E9.7: equivalencias en la lista de compras (pill 'o {sustituto}' por idIngrediente, tap = ya tengo) + MAPEO — cierra Lote 9"
git push
```
Confirmá push OK.
