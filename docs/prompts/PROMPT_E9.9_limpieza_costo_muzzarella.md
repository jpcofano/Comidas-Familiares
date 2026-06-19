# PROMPT E9.9 — Limpieza de datos: `costoEstimado` + dedupe muzzarella

> **Alcance:** dos fixes independientes, cada uno con su **D-gate** (diagnóstico read-only → `procedé` → write) y su **commit separado**. No ✅ sin pegar el resultado literal del write.

---

## FIX 1 — `costoEstimado` fuera de enum

Enum válido `COSTOS = ["Bajo","Medio","Medio/Alto","Alto"]`. Estas 4 recetas tienen `"Bajo/Medio"` (valor inexistente):
- Manzanas al horno con nueces
- Hummus con bastones de verdura
- Trufas de coco, cacao y maní sin cocción
- Peras asadas con canela, nueces y limón

**D1 (read-only):** confirmá que las 4 siguen con `costoEstimado="Bajo/Medio"`. Pegá `id + nombre + valor` de cada una. Si hay otras recetas con el mismo valor fuera de estas 4, listalas.

**Aplicación (tras `procedé`):** `set costoEstimado="Bajo"` en las 4 (decisión por defecto de JP; ver nota).
> Nota: si JP indicó `"Medio"` para alguna (típico: hummus / trufas), aplicá ese valor en esas y `"Bajo"` en el resto.

**Commit:** `Data: E9.9 fix costoEstimado fuera de enum (Bajo/Medio)`

---

## FIX 2 — dedupe muzzarella / mozzarella

Estado reportado: `ING-0251` (canonico `"muzzarella"`) huérfano en `recetas`; las 6 recetas usan `ING-0338` (`"mozzarella"`, con `"Muzzarella"` como sinónimo).

**D2 (read-only, CRÍTICO):** antes de borrar nada, confirmá **cero referencias a `ING-0251` en TODAS las colecciones**, no solo `recetas`: menús, listas de compra, planificaciones, historial y cualquier subcolección que referencie `idIngrediente`. Pegá el resultado **por colección**.

**Aplicación (tras `procedé`, solo si `ING-0251` tiene cero refs en todas):**
- Verificá que `ING-0338` tenga `"Muzzarella"` como sinónimo (ya reportado); si faltara, agregalo.
- Borrá `ING-0251`.

**Si aparece alguna referencia a `ING-0251`:** NO borrar. Repuntá esas refs a `ING-0338`, reportá, y recién entonces borrá.

> **Alternativa (solo si el MAPEO declara `"muzzarella"` como canónico primario):** en lugar de borrar `ING-0251`, repuntá las 6 recetas a `ING-0251`, asegurá que tenga `"Mozzarella"` como sinónimo, y borrá `ING-0338`. Confirmá contra el MAPEO antes de elegir rama.

**Commit:** `Data: E9.9 dedupe ingrediente muzzarella (huérfano)`

---

## Requisitos

- D-gate con output literal **antes** de cada write.
- Commits separados por fix.
- Sin ✅ sin pegar el resultado del write.
