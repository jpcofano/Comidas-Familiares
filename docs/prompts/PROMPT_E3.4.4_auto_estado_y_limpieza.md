# PROMPT E3.4.4 — Auto-avance de estado de plan y limpieza de compras al cocinar

## Contexto y objetivo

Hay dos gaps que bloquean el flujo principal de la app:

1. **El botón "Cocinar" nunca aparece en Home**: ningún plan llega a "Compra lista" porque la transición automática "Compra pendiente" → "Compra lista" no existe. Hay que agregarla: cuando JP tilda el último ítem pendiente de un plan en la lista de compras, el plan debe avanzar solo. Y si destilda, debe retrotraerse.

2. **Al marcar un plan como "Cocinada" sus aportes quedan en la lista**: la limpieza no está implementada. Hay que borrar los aportes del plan cocinado de cada ítem de compras, y eliminar los ítems que queden sin aportes.

Hay también un fix de display: el botón "Cocinar" debe aparecer desde "Compra pendiente" (no sólo desde "Compra lista"). El estado es informativo, no un gate de acceso.

---

## Diagnóstico requerido ANTES de codear

Abrir Firebase Console → proyecto `comida-familiar` y confirmar los tres puntos:

**D1.** Abrir `/compras/{LST-SEM-...}/items/{cualquier-itemId}`. Copiar y pegar el shape completo del documento. Confirmar que existe el campo `aportes` como array, y que cada elemento tiene al menos los campos: `idPlan`, `idReceta`, `nombreReceta`, `tipoAporte`, `cantidad`, `unidad`. Si falta algún campo, reportar antes de continuar.

**D2.** Abrir `/planes/{PLAN-...}` (el plan activo de esta semana). Copiar y pegar el valor del campo `listaComprasId`. Si es `null`, hay que correr primero una sincronización desde la app (ir a `/compras`) antes de continuar.

**D3.** En `src/data/compras.ts`, buscar la función `toggleItemYaTengo` (líneas ~321–339). Leerla y confirmar que actualmente NO hace ninguna operación sobre el estado de ningún plan.

---

## Cambios requeridos

### Cambio 1 — `src/routes/Home.tsx`: botón "Cocinar" desde "Compra pendiente"

**Línea 84**, reemplazar:
```ts
// ANTES
const canCocinar = ["Compra lista", "Cocinando"].includes(plan.estado);

// DESPUÉS
const canCocinar = ["Compra pendiente", "Compra lista", "Cocinando"].includes(plan.estado);
```

El texto del botón cuando el plan está en "Compra pendiente" debe ser simplemente `"Cocinar"` (no "Continuar cocinando"). El condicional del label en línea 133 ya cubre esto correctamente (`plan.estado === "Cocinando"` para "Continuar cocinando").

---

### Cambio 2 — `src/data/compras.ts`: auto-transición al tildar ítems

Extender `toggleItemYaTengo` para que, después de actualizar el ítem, evalúe si algún plan debe cambiar de estado.

**Lógica interna nueva** (toda dentro de `toggleItemYaTengo`):

1. Leer todos los ítems actuales de la lista ANTES del batch (con `getItemsLista(idLista)`).
2. Construir el estado "virtual post-update": mismos ítems pero el ítem con `itemId` tiene `yaTengo = nuevoYaTengo`.
3. Leer el doc raíz de la lista para obtener `semanaInicio`.
4. Leer los planes activos de esa semana (con `getDocs` filtrando `semanaInicio` y `estado in ["Compra pendiente", "Compra lista"]`).
5. Para cada plan de esa lista, determinar si debe cambiar de estado:
   - Un ítem "pertenece" a un plan si `item.aportes.some(a => a.idPlan === plan.idPlan)`.
   - Contar cuántos ítems pertenecen al plan (`n`) y cuántos de ellos tienen `yaTengo === true` en el estado virtual (`k`).
   - Si `n === 0`: no tocar (un plan sin ítems no avanza).
   - Si `n > 0 && n === k` y el plan está en `"Compra pendiente"` → cambiar a `"Compra lista"`.
   - Si `n > 0 && k < n` y el plan está en `"Compra lista"` → retrotraer a `"Compra pendiente"`.
   - Cualquier otro caso: no tocar.
6. Construir un único `writeBatch` que incluya:
   - `batch.update(itemRef, { yaTengo: nuevoYaTengo })`
   - `batch.update(listaRef, { totalYaTengo: increment(delta), totalPendientes: increment(-delta) })`
   - Un `batch.update(planRef, { estado: nuevoEstado })` por cada plan que deba cambiar.
7. `await batch.commit()`.

La firma de `toggleItemYaTengo` NO cambia (mismos parámetros y tipo de retorno).

---

### Cambio 3 — `src/data/compras.ts`: nueva función `limpiarAportesDelPlan`

Agregar al final del archivo (exportada):

```ts
export async function limpiarAportesDelPlan(
  idLista: string,
  idPlan: string,
  soloIdReceta?: string
): Promise<Result<void, AppError>>
```

**Lógica**:

1. Leer todos los ítems de la lista con `getItemsLista(idLista)`.
2. Para cada ítem, filtrar `aportes` removiendo los que cumplan:
   - `aporte.idPlan === idPlan`
   - Y si `soloIdReceta` está definido, también `aporte.idReceta === soloIdReceta`.
   - (Sin `soloIdReceta`: se remueven TODOS los aportes del plan. Con `soloIdReceta`: sólo los de esa receta.)
3. Para ítems donde `aportes` queda vacío → `batch.delete(itemRef)`.
4. Para ítems donde quedan aportes → recalcular y `batch.update(itemRef, ...)`:
   - `aportes`: el array filtrado.
   - `cantidadTotal`: suma de `aporte.cantidad` de los aportes restantes.
   - `cantidadLabel`: `cantidadTotal > 0 ? \`${cantidadTotal} ${item.unidad}\`.trim() : "a gusto"`.
5. Recalcular totales del doc raíz sobre el conjunto resultante:
   - `totalItems`: cantidad de ítems que NO se borran.
   - `totalYaTengo`: cuántos de esos tienen `yaTengo === true`.
   - `totalPendientes`: `totalItems - totalYaTengo`.
   - `batch.update(listaRef, { totalItems, totalYaTengo, totalPendientes })`.
6. `await batch.commit()`.
7. Si no hay lista o no hay nada que limpiar, retornar `ok(undefined)` sin hacer nada.

---

### Cambio 4 — `src/data/planes.ts`: `marcarCocinada` llama a `limpiarAportesDelPlan`

La función `marcarCocinada` (línea 133) actualmente no lee el plan al inicio si `opciones?.cocinarExtras` es falso. Reorganizar para **leer siempre el plan al inicio**:

```ts
export async function marcarCocinada(
  idPlan: string,
  opciones?: { cocinarExtras?: boolean; resetComponentes?: boolean }
): Promise<Result<void, AppError>> {
  try {
    const ref = doc(db, "planes", idPlan);
    // Leer siempre el plan (necesario para listaComprasId)
    const snap = await getDoc(ref);
    if (!snap.exists()) return err("plan-not-found", "El plan no existe.");
    const plan = snap.data() as Plan;

    const updates: Record<string, unknown> = { estado: "Cocinada" };
    if (opciones?.resetComponentes) updates.componentesCocinados = [];
    await updateDoc(ref, updates);

    // Limpieza de compras
    if (plan.listaComprasId) {
      const r = await limpiarAportesDelPlan(plan.listaComprasId, idPlan);
      if (!r.ok) console.error("[limpieza] marcarCocinada:", r.error);
    }

    // Extras (lógica existente, ya tenés el plan leído)
    if (opciones?.cocinarExtras && plan.tipoPlan === "Especial") {
      const extrasSnap = await getDocs(
        query(
          collection(db, "planes"),
          where("origen", "==", `extra:${idPlan}`),
          where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista"])
        )
      );
      await Promise.all(extrasSnap.docs.map((d) => updateDoc(d.ref, { estado: "Cocinada" })));
    }

    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo marcar el plan como Cocinada.";
    return err("plan-marcar-cocinada-failed", msg, e);
  }
}
```

Agregar el import de `limpiarAportesDelPlan` desde `"./compras"` al inicio de `planes.ts`.

---

### Cambio 5 — `src/data/planes.ts`: `marcarComponenteCocinado` llama a `limpiarAportesDelPlan`

En `marcarComponenteCocinado` (línea 167), después del `updateDoc` exitoso que actualiza el plan:

```ts
// después de: await updateDoc(planRef, { estado: nuevoEstado, componentesCocinados: nuevosCocinados });

if (plan.listaComprasId) {
  const r = await limpiarAportesDelPlan(plan.listaComprasId, idPlan, idReceta);
  if (!r.ok) console.error("[limpieza] marcarComponenteCocinado:", r.error);
}
```

El plan ya está leído al inicio de la función (`planSnap.data() as Plan`), así que `plan.listaComprasId` está disponible sin lectura adicional.

---

## Criterios de aceptación

Ejecutar cada paso y reportar el resultado literal. No "✅ verificado" — copiar el valor real de Firestore o describir exactamente lo que se ve en la app.

**A — Auto-avance a "Compra lista":**
Tener un plan en "Compra pendiente" con lista generada. Ir a `/compras`. Tildar TODOS los ítems uno a uno. Después del último tilde: abrir Firestore → `/planes/{idPlan}` y pegar el valor del campo `estado`.
**Resultado esperado:** `"Compra lista"`.

**B — Botón "Cocinar" en Home:**
Sin recargar la app después del punto A, ir a `/`. Reportar si aparece el botón "Cocinar" en el plan.
**Resultado esperado:** el botón aparece.

**C — Retrotraer a "Compra pendiente":**
Destildar cualquier ítem. Ir a Firestore → `/planes/{idPlan}` y pegar el valor de `estado`.
**Resultado esperado:** `"Compra pendiente"`.

**D — Re-avance:**
Volver a tildar el ítem destildado en C. Pegar el valor de `estado` del plan en Firestore.
**Resultado esperado:** `"Compra lista"`.

**E — Limpieza al marcar Cocinada (plan de receta):**
Desde Home, hacer clic en "Marcar Cocinada" sobre un plan. Ir a Firestore:
- E1: Pegar el valor de `estado` del plan. **Esperado: `"Cocinada"`.**
- E2: Abrir la subcolección `/compras/{idLista}/items`. Listar todos los documentos. Para cada uno, verificar si tiene algún elemento en `aportes[]` con `idPlan === {idPlan cocinado}`. **Esperado: ninguno debe tener aportes de ese plan.** Pegar cuántos documentos quedan en total y confirmar que ninguno tiene aportes del plan cocinado.

**F — Botón "Cocinar" en "Compra pendiente":**
Crear o tener un plan en estado "Compra pendiente" (sin haber tildado todos los ítems). Ir a Home. Reportar si aparece el botón "Cocinar".
**Resultado esperado:** el botón aparece (el estado "Compra pendiente" no bloquea cocinar).

**G — Limpieza al marcar componente de menú cocinado (si hay plan-menú activo):**
Usar la pantalla de selección de componente para marcar un componente individual como cocinado. Ir a Firestore:
- G1: Pegar `componentesCocinados` del plan.
- G2: Revisar en `/compras/{idLista}/items` si los ítems cuyos aportes sólo venían de esa receta (`idReceta`) fueron eliminados. Pegar la lista de aportes de un ítem que antes tenía aportes mixtos y confirmar que los aportes de esa receta ya no están.

Si algún criterio falla: reportar el valor observado en Firestore / en la UI y el valor esperado, para poder diagnosticar antes de intentar otro fix.
