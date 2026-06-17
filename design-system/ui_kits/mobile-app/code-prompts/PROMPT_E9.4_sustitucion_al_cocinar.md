# PROMPT E9.4 — Sustitución al cocinar ("o {sustituto}")

> **Etapa 9 — Lote 9 "Cocinar con lo que hay".** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** v2.1.0 (lo dejó E9.3). Verificá el header y reportá.
> **Correr después de E9.3.** Al terminar: commit + push — ver "Cierre".
>
> Numeración: E9.0/E9.0.1/E9.1 (importador), E9.2 (fix Historial) y E9.3 (matcher) tomados.
> Esta es **E9.4**.

## Por qué

E8.7 cargó las `equivalencias` del catálogo y las recetas ya traen `alternativas` (el "X o Y"
propio de la receta), pero hoy **no se ven al momento de cocinar**. Diseñado: mostrar "o
{sustituto}" junto al ingrediente en el **detalle** y tenerlos a mano en el **paso a paso**.

## Lo que ya existe (usar)
- `Ingrediente.equivalencias?: string[]` (idIngrediente[], simétrico — E8.7).
- `IngredienteEnReceta.alternativas?: Array<{ idIngrediente }>` (capa de import).
- `IngredienteEnReceta.idIngrediente` (match con el catálogo — **por ID, no por nombre**).
- El catálogo ya se carga cacheado en varias rutas (`getIngredientes`/`cachedRecetas`, patrón E8.5).
- Componente de lista de ingredientes del detalle y la pantalla `Cocinar`.

## Cambios de código

### 1. Helper de resolución (puro, testeable) — `src/lib/sustitutos.ts`
```ts
export interface Sustituto { idIngrediente: string; nombre: string; fuente: "receta" | "catalogo"; }

// Para un ítem de receta: junta alternativas (receta) + equivalencias del catálogo
// del ingrediente referenciado. Dedup por idIngrediente. Devuelve [] si no hay.
export function sustitutosDeItem(
  item: IngredienteEnReceta,
  catalogoById: Map<string, Ingrediente>,
): Sustituto[];
```
- `alternativas[]` → resolver cada `idIngrediente` a su `nombrePreferido`, `fuente: "receta"`.
- `catalogo[item.idIngrediente].equivalencias[]` → resolver a nombre, `fuente: "catalogo"`.
- **Match por idIngrediente** (en el prototipo se matcheó por nombre por falta de IDs).

### 2. Detalle de receta — línea "o {sustituto}"
En la lista de ingredientes (componente `IngredientesPorGondola` o equivalente):
- Debajo del nombre del ingrediente, si `sustitutosDeItem(...)` no está vacío, una **línea
  secundaria** con ícono swap + "o {X} o {Y}", en `--accent`. Discreta, no compite con la cantidad.
- No mezclar con `(opcional)` — son ejes distintos.

### 3. Paso a paso (`Cocinar`) — recap "Sustitutos a mano"
- Tira colapsable arriba (junto al banner de riesgos): "Sustitutos a mano (N)". Al abrir, lista
  `{ingrediente} — o {X}` de todos los ítems con sustituto. Visible en ambos modos (guiada y
  scroll). No parsear el texto libre de los pasos.

### 4. Preferencia de visibilidad (opcional pero recomendado)
- Toggle "Mostrar sustitutos" (default ON), persistido en `localStorage`
  (`cf-mostrar-sustitutos`). El prototipo además ofrece estilo inline / chip; el inline ("o X")
  es el principal — el chip es opcional.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch: v2.1.0 → **v2.1.1**. Reportá versión.
2. Subsección `### 1.2.E9.4 Cambios en v2.1.1 (E9.4 — Sustitución al cocinar)`: helper
   `sustitutos.ts`, fuentes (alternativas de receta + equivalencias de catálogo, match por ID),
   línea en el detalle, recap en el paso a paso, preferencia local.
3. En §11 Lote 9, marcar **E9.4 ✅ HECHO (v2.1.1)**.
4. Registrar `**PROMPT_E9.4_sustitucion_al_cocinar.md** ✅ CERRADO (v2.1.1)`.

## Criterio de aceptación
1. Una receta cuyo ingrediente tiene equivalencia en catálogo muestra "o {X}" en el detalle.
2. Una receta con `alternativas` propias muestra esa alternativa como sustituto (fuente receta).
3. El paso a paso muestra "Sustitutos a mano (N)" con la lista correcta; vacío → no aparece.
4. El toggle oculta/muestra y persiste.
5. `sustitutosDeItem` con tests (fuente receta, fuente catálogo, dedup, vacío). Build +
   typecheck + tests verdes.
6. Pegá la subsección 1.2.E9.4 y el §11 Lote 9 actualizado.

## Fuera de scope (E9.5)
- Aplicar equivalencias al **armar la lista de compras** (falta A → sugerir su sustituto) → E9.5.
- Sustituir cantidades/unidades automáticamente (1 manteca ≠ 1 aceite) — no ahora; solo nombre.

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E9.4: sustitución al cocinar (o {sustituto}) en detalle + recap en paso a paso + helper sustitutos.ts + tests + MAPEO v2.1.1"
git push
```
Confirmá push OK.
