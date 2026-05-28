# PROMPT_E7.10 — Reversión Bug 2 de E7.9 + badge de agregación en Compras

> Dos acciones en un commit:
> 1. **Revertir la parte de Bug 2 de E7.9** porque se aplicó en la dirección equivocada
>    (Code interpretó "Opción B = sacar la sección de la home y dejar la pestaña";
>    la decisión real de JP era la inversa: **sacar la pestaña y dejar todo en la
>    home**).
> 2. **Agregar el badge "+N recetas"** en los ítems de la lista de compras que agregan
>    aportes de más de una receta. SIN vista expandida con desglose por receta — solo
>    el badge.
>
> **Bump de versión:** 1.8.3 → 1.8.4

---

## 1. Contexto

### 1.1 Por qué se revierte E7.9 #3 y #4

En E7.9 la Decisión 2 de JP fue "sacar Pendientes, dejar todo en la principal". Se
implementó al revés: se sacó la sección de la home (`MemberDashboard.tsx`) y se mantuvo
la pestaña `/pendientes`. Resultado: la home de miembro quedó sin la card de pendientes
y la pestaña sobrevivió — exactamente lo opuesto a lo pedido. E7.10 lo da vuelta.

### 1.2 Por qué se suma ahora el badge

JP pidió un indicador visual para los ítems cuya cantidad es la suma de varios planes
(ej. "Cebolla 3u" cuando 1u es de su plan y 2u son de planes ajenos). Sin ese indicador,
la cantidad inflada de la Decisión 1 (E7.9 — mostrar total, no recalcular porción) queda
sin explicación visible.

El comportamiento ya está documentado en `§2.5` del MAPEO:

> Vista resumida (default): un solo renglón "Cebolla — 3 unidades" con badge "+2 recetas".
> Vista expandida (al tap): "Cebolla — 3 unidades:" + sublistado de aportes
> ("• 2 para Bondiola" / "• 1 para Berenjenas").

JP decide implementar **solo la vista resumida con el badge**. La vista expandida con
sublistado por receta queda **explícitamente fuera de scope** (decisión consciente — no
es deuda, es decisión: el detalle por receta sería ruido para la familia).

---

## 2. Alcance del fix

### 2.1 Reversión Bug 2 (acción 1)

**`src/routes/MemberDashboard.tsx`** — restaurar la sección "Pendientes de evaluar" que
E7.9 eliminó. Estructura final de la home de miembro:

1. Saludo + semana
2. Mi semana
3. **Pendientes de evaluar** ← restaurar
4. Mi historial

La sección usa la misma fuente que ya tiene la home: `subscribeToPlanesActivos(semana,
setPlanes)` con filtro client `p.estado === "Cocinada" && !p.votos?.[memberId]`. NO
restaurar `subscribeToPlanesActivosMiembro` — el filtro por `asignaciones` es incorrecto
para Pendientes post-E4.2.1 (voto independiente de cocinero). Si querés recuperar el JSX
exacto, ver el diff de E7.9 (commit `6c67288`) y aplicarlo invertido para esa sección.

**BottomNav de miembro** — eliminar la pestaña "Pendientes". El bottom nav de miembro
queda con 3 tabs:

`Mi semana (/) | Compras (/compras) | Historial (/historial)`

(JP no se toca — sigue con Inicio/Biblioteca/Compras/Historial.)

**`src/routes/Pendientes.tsx`** — eliminar el archivo.

**Router** — quitar la ruta `/pendientes`. Como hardening contra bookmarks viejos,
agregar un `<Navigate to="/" replace />` para `/pendientes` (un redirect liviano de una
línea; no es una pantalla, es un fallback).

### 2.2 Badge de agregación (acción 2)

**Lógica de datos.** Para cada `ItemCompra` calcular el número de recetas únicas que
aportan al ítem:

```ts
const recetasUnicas = new Set(item.aportes.map(a => a.idReceta)).size;
const esAgregado = recetasUnicas > 1;
```

`recetasUnicas` cuenta `idReceta` distintos (no `idPlan`, porque un mismo plan puede
ejecutar la misma receta una vez, y porque la noción que importa al usuario es "esto
viene de N recetas distintas que cocina la familia"). Se calcula client-side sobre
`item.aportes` que ya tiene la trazabilidad completa (§2.5). NO requiere query nueva
ni cambios en Firestore.

**UI.** En la fila del ítem en `src/routes/Compras.tsx`, cuando `esAgregado === true`,
mostrar un badge inline al lado de la cantidad con el texto:

```
+{recetasUnicas} recetas
```

Ej.: "Cebolla — 3 u" con badge `+2 recetas` al costado. Estilo consistente con el resto
de los badges/chips que ya usa la app — no inventar un componente nuevo si ya existe
uno (por ejemplo, un `Chip` o `Badge` en `src/components/`).

**Cuándo no aparece.** Si `recetasUnicas === 1` (el ítem viene de una sola receta), no
hay badge. La fila queda como hoy.

**Aplica para JP y para miembros por igual.** Tanto el modo JP como el modo miembro
muestran cantidades agregadas y el badge explica esa agregación para ambos. No
diferenciar por `isJP`.

**Lo que NO se hace** (explícito para que Code no se exceda):

- NO se implementa vista expandida al tap, ni sublistado de aportes "• 2 para Bondiola
  / • 1 para Berenjenas". Decisión consciente.
- NO se cambia el filtro `itemsVisibles` ni la cantidad mostrada. Sigue Decisión 1 de
  E7.9 (mostrar `cantidadTotal`, no recalcular porción del miembro).
- NO se modifican las security rules.

---

## 3. Patches al MAPEO_FIRESTORE (mismo commit)

**Patch A — header.** Bump `Versión: 1.8.3` → `1.8.4`. Actualizar fecha.

**Patch B — §2.5.** Reemplazar el bloque actual de "Vista del usuario":

> **Vista del usuario:**
> - Vista resumida (default): un solo renglón "Cebolla — 3 unidades" con badge "+2 recetas".
> - Vista expandida (al tap): "Cebolla — 3 unidades:" + sublistado de aportes ("• 2 para Bondiola" / "• 1 para Berenjenas").

por:

> **Vista del usuario (E7.10):**
> - Renglón único "Cebolla — 3 unidades" con badge "+N recetas" cuando el ítem agrega
>   aportes de más de una receta (`new Set(aportes.map(a => a.idReceta)).size > 1`).
>   Si viene de una sola receta, sin badge.
> - **No hay vista expandida**: el desglose por receta ("• 2 para Bondiola" / "• 1 para
>   Berenjenas") queda fuera de scope por decisión de JP en E7.10. La trazabilidad por
>   `aportes[]` se conserva en el dato (limpieza al cocinar y otras operaciones la
>   siguen usando), pero no se expone en UI.

**Patch C — agregar §1.2.E7.10** (después de §1.2.E7.9):

> ### 1.2.E7.10 Cambios en v1.8.4 (E7.10 — reversión Bug 2 de E7.9 + badge de agregación)
>
> Dos correcciones puntuales sobre v1.8.3.
>
> 1. **Reversión de E7.9 #3 y #4.** La Decisión 2 de E7.9 era "sacar el botón Pendientes
>    del BottomNav y dejar todo en la home"; se había aplicado al revés (sacaron la
>    sección de la home, mantuvieron la pestaña). E7.10 corrige:
>    - `MemberDashboard.tsx`: restaurada la sección "Pendientes de evaluar" (fuente
>      `subscribeToPlanesActivos` + filtro client `estado === "Cocinada" && !votos[memberId]`).
>    - `BottomNav` (modo miembro): eliminada la pestaña "Pendientes". Queda con
>      Mi semana / Compras / Historial.
>    - `src/routes/Pendientes.tsx`: archivo eliminado.
>    - Router: ruta `/pendientes` reemplazada por `<Navigate to="/" replace />` para
>      bookmarks viejos.
>    - `subscribeToPlanesActivosMiembro` sigue eliminada (estaba bien sacarla en E7.9).
>
> 2. **Badge de agregación en Compras.** Cuando un `ItemCompra` agrega aportes de más
>    de una receta única, se muestra un badge inline `+N recetas` al lado de la cantidad
>    (`N = new Set(aportes.map(a => a.idReceta)).size`). Si `N === 1`, sin badge. Aplica
>    para JP y miembros por igual (la agregación existe en ambos modos). NO se
>    implementa vista expandida con desglose por receta — decisión consciente para
>    mantener la UI simple. La trazabilidad en `aportes[]` se conserva en el dato,
>    no se expone en UI.

**Patch D — §10 deuda técnica.** Sin cambios. E7.10 no abre ni cierra deuda técnica
nueva (la "vista expandida" no se cuenta como deuda; es decisión de scope).

---

## 4. Criterios de aceptación

1. **Home de miembro.** Logueado como María, la home (`/`) muestra cuatro secciones bajo
   el saludo y la semana: **"Mi semana"**, **"Pendientes de evaluar"**, **"Mi historial"**.
   La card de pendientes muestra los planes en estado "Cocinada" donde María no votó
   todavía, incluyendo planes que no cocina (consistente con E4.2.1).

2. **BottomNav de miembro.** Tiene exactamente 3 pestañas: Mi semana, Compras, Historial.
   No aparece "Pendientes" como tab.

3. **Ruta `/pendientes`.** Navegar manualmente a `/pendientes` redirige a `/`. No hay
   404 ni pantalla en blanco.

4. **Sin regresión en JP.** Home de JP intacta. BottomNav de JP intacto
   (Inicio/Biblioteca/Compras/Historial).

5. **Badge presente cuando corresponde.** Crear un escenario donde el mismo ingrediente
   esté en al menos dos recetas distintas asignadas a la semana (ej. cebolla en Bondiola
   y en Berenjenas). En `/compras`, el ítem "Cebolla" muestra el badge "+2 recetas" al
   lado de la cantidad. Probar logueado como JP y como un miembro asignado a al menos
   uno de los planes — en ambos casos el badge debe aparecer.

6. **Badge ausente cuando no corresponde.** Un ítem que viene de una sola receta NO
   tiene badge. Probar abriendo cualquier ítem único en la lista actual.

7. **No hay vista expandida.** Tap / click sobre el ítem NO despliega un sublistado por
   receta. El comportamiento al tap se mantiene como estaba antes de E7.10 (típicamente
   solo el toggle "Ya tengo" o ninguna acción extra — no agregar interacción nueva).

8. **MAPEO actualizado en el mismo commit.** Patches A–C aplicados. Bump a v1.8.4.
   `git log -p` del commit muestra cambios de código + cambios de MAPEO juntos.

---

## 5. Notas operativas

- **TypeScript + tests.** Correr `npx tsc --noEmit` y `npx vitest run` antes de
  commitear. La suite de E7.9 cerró en 178/178; E7.10 no debería tocar tests
  existentes salvo el de Pendientes.tsx si quedó. Si existe `src/routes/__tests__/Pendientes.test.tsx`
  o equivalente, eliminarlo junto con el archivo de producción.
- **Service worker.** Después del deploy, JP y la familia pueden seguir viendo la
  versión vieja por el SW de la PWA. Forzar update cerrando todas las tabs de la app
  o vía DevTools → Application → Service Workers → Unregister.
- **Sin backfill ni cambios de datos.** El badge se calcula al render — no toca
  Firestore. Los `aportes[]` ya tienen la info necesaria.
- **Validación cross-rol.** Probar logueado como JP **y** como un miembro no-JP.
  E7.9 se commiteó sin testear como miembro y por eso pasó la inversión de Bug 2.
