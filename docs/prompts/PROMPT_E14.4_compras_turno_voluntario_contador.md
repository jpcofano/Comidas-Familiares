# PROMPT E14.4 — Compras: turno voluntario + contador mensual + histórico

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> **A implementar ahora.** Numerar al próximo libre si `E14.4` ya existe.
>
> **Construye sobre lo ya hecho (E14.2):** `src/data/comprasRapidas.ts` ya tiene las 3 plantillas
> maestras (`seedPlantillasMaestras`), los modos A/B/C, `generarInstanciaCompraRapida`,
> `toggleItemComprado` y `marcarCompraRapidaHecha`. **No rehacer eso: extenderlo.**
>
> Referencia visual aprobada por el usuario: el prototipo
> `Compras — turno voluntario.html` (lista compartida · "Yo me encargo" · se completa y
> desaparece · contador del mes · histórico por mes). Replicar ESE comportamiento.

---

## ⚠️ Cambio de modelo (leer primero)

Hasta ahora la compra rápida se **asignaba** a uno o varios miembros (`Plan.asignaciones`)
y aparecía solo en el dashboard de los asignados. **Esto cambia.** Nuevo modelo:

| | Antes (E14.1/E14.2) | Ahora (E14.4) |
|---|---|---|
| Al generar | se elige a quién/quiénes se asigna | **no se asigna a nadie**; nace "sin encargado" |
| Visibilidad | solo los asignados (+ JP) | **los 4 miembros** la ven en su principal |
| Tomarla | — | cualquiera toca **"Yo me encargo"** → queda a su nombre |
| Completar | marcar hecha | marcar hecha → **desaparece para todos** + suma al contador |
| Registro | — | **contador del mes** (quién se ocupó) + **histórico por mes** |

> Conserva `asignaciones` en el tipo por compatibilidad, pero la compra rápida ya **no lo usa**
> para visibilidad. La visibilidad ahora es "todos los miembros mientras la instancia esté activa".
> Generar sigue siendo potestad de **Juan o María** (sin cambios ahí).

---

## TAREA 1 — Modelo de datos (`src/types/models.ts`)

```ts
// En Plan (aplica a instancias de compra rápida):
encargado?: MiembroId | null;   // NUEVO — quién se ofreció a hacerla. null = sin encargado.

// Contador + histórico de compras (doc único, realtime):
export interface ComprasContador {
  // clave = "YYYY-MM"  →  conteo por miembro de ese mes
  meses: Record<string, Partial<Record<MiembroId, number>>>;
}
```
El **mes en curso vs histórico** sale solo de la clave `YYYY-MM`: el mes actual se calcula con
la fecha de hoy; cualquier otra clave es histórico. **No hace falta "cerrar el mes" manualmente**
(el botón "Cerrar mes" del prototipo es solo para demostrar el rollover; en producción el cambio
de mes es automático por la clave de fecha).

---

## TAREA 2 — Capa de datos

### 2a. `src/data/comprasRapidas.ts` — turno voluntario
1. **Generar ya no asigna.** Cambiar `generarInstanciaCompraRapida` para nacer sin encargado y
   sin asignaciones de visibilidad:
```ts
export async function generarInstanciaCompraRapida(
  plantilla: Receta,
  itemsSeleccionados: ItemCompraRapida[],   // ← se va el parámetro `asignados`
): Promise<Result<Plan, AppError>> {
  const semanaInicio = getSemanaActual();
  const semanaFin = getSemanaFin(semanaInicio);
  return crearPlan({
    idPlan: generarIdInstancia(),
    semanaInicio, semanaFin,
    tipoSeleccion: "compra-rapida",
    tipoPlan: "En proceso",
    idSeleccion: plantilla.idReceta,
    nombreSeleccion: plantilla.nombre,
    recetaPrincipal: plantilla.nombre,
    estado: "Compra pendiente",
    fechaPrevistaComida: null,
    cantidadPersonas: 1,
    listaComprasId: null,
    notas: "", origen: null,
    asignaciones: [],          // sin asignar — la ven los 4
    encargado: null,           // sin encargado
    itemsCompraRapida: itemsSeleccionados,
  });
}
```
2. **Tomar / liberar:**
```ts
export async function tomarCompraRapida(idPlan: string, memberId: MiembroId): Promise<Result<void, AppError>> {
  try {
    // Guardia anti–doble-claim: solo toma si sigue sin encargado.
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "planes", idPlan);
      const snap = await tx.get(ref);
      const actual = snap.data()?.encargado ?? null;
      if (actual && actual !== memberId) throw new Error("ya-tomada");
      tx.update(ref, { encargado: memberId });
    });
    return ok(undefined);
  } catch (e) {
    if ((e as Error).message === "ya-tomada")
      return err("compra-ya-tomada", "Otra persona ya se encargó de esta compra.", e);
    return err("compra-tomar-failed", firebaseErrorMessage(e) ?? "No se pudo tomar la compra.", e);
  }
}

export async function liberarCompraRapida(idPlan: string): Promise<Result<void, AppError>> {
  try {
    await updateDoc(doc(db, "planes", idPlan), { encargado: null });
    return ok(undefined);
  } catch (e) {
    return err("compra-liberar-failed", firebaseErrorMessage(e) ?? "No se pudo liberar.", e);
  }
}
```
3. **Completar = marcar hecha + sumar al contador del mes (atómico).** El +1 va a quien figure
   como `encargado` (si nadie la tomó pero igual la completan, +1 a quien la completa, que se pasa
   por parámetro):
```ts
export async function marcarCompraRapidaHecha(
  idPlan: string,
  completadaPor: MiembroId,      // ← normalmente el encargado
): Promise<Result<void, AppError>> {
  try {
    const mesKey = new Date().toISOString().slice(0, 7);   // "YYYY-MM"
    const batch = writeBatch(db);
    batch.update(doc(db, "planes", idPlan), { estado: "Compra lista" });
    batch.set(
      doc(db, "config", "comprasContador"),
      { meses: { [mesKey]: { [completadaPor]: increment(1) } } },
      { merge: true },
    );
    await batch.commit();
    return ok(undefined);
  } catch (e) {
    return err("compra-rapida-hecha-failed", firebaseErrorMessage(e) ?? "No se pudo marcar como hecha.", e);
  }
}
```
> `estado: "Compra lista"` hace que la instancia deje de ser "activa" → desaparece de las
> principales (ver Tarea 3). Queda en el historial de planes como hasta ahora.

### 2b. `src/data/comprasContador.ts` (nuevo) — contador + histórico realtime
```ts
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { ComprasContador } from "../types/models";

export function subscribeContador(cb: (c: ComprasContador) => void): () => void {
  return onSnapshot(doc(db, "config", "comprasContador"), (snap) =>
    cb((snap.data() as ComprasContador) ?? { meses: {} }),
  );
}

export const mesActualKey = () => new Date().toISOString().slice(0, 7);

// Devuelve [{ mesKey, total, porMiembro }] ordenado desc, separando actual vs histórico.
export function resumenPorMes(c: ComprasContador) {
  return Object.entries(c.meses ?? {})
    .map(([mesKey, porMiembro]) => ({
      mesKey,
      porMiembro,
      total: Object.values(porMiembro).reduce((a, n) => a + (n ?? 0), 0),
    }))
    .sort((a, b) => b.mesKey.localeCompare(a.mesKey));
}
```

---

## TAREA 3 — Visibilidad: la instancia activa la ven los 4

Donde el dashboard arma "compras pendientes" (hoy filtra por `asignaciones` que incluya al
`selfId`), cambiar a: **todos** los miembros ven la(s) instancia(s) de compra rápida activas.
```ts
const comprasActivas = planes.filter(
  (p) => p.tipoSeleccion === "compra-rapida" && p.estado !== "Compra lista",
);
// (sin filtrar por asignaciones — la compra es de la familia)
```
Esto aplica al dashboard de los 4 **y** al de JP. (Recordá el fix E14.3: que el acceso a *armar*
no quede atrapado dentro del `length > 0`.)

---

## TAREA 4 — UI

### 4a. Card de la compra activa (en la principal) — 3 estados (ver prototipo)
- **Sin encargado:** ítems + badge "Sin encargado — la ven los 4" + botón **"Yo me encargo"**
  → `tomarCompraRapida(idPlan, selfId)`.
- **La estoy haciendo yo** (`encargado === selfId`): checklist con `toggleItemComprado` + progreso,
  botón **"Marcar compra lista"** → `marcarCompraRapidaHecha(idPlan, selfId)`, y enlace sutil
  **"Ya no puedo — liberar"** → `liberarCompraRapida(idPlan)`.
- **La está haciendo otro** (`encargado` = otro): badge con avatar "{Nombre} se está encargando" +
  enlace **"¿Se le complicó? La hago yo"** → `tomarCompraRapida` (handoff).
- Optimista + error visible (mismo patrón que el color del avatar): si `tomarCompraRapida` devuelve
  `compra-ya-tomada`, mostrar el mensaje y re-renderizar con el encargado real (lo trae el realtime).
- Header de la card = ícono de bolsa + color de góndola del destino + "Compra · {destino}".

### 4b. Contador del mes + histórico
Una pantalla/sección (sugerido: en **/compras**, debajo de la lista, o en el dashboard) que use
`subscribeContador` + `resumenPorMes`:
- **"Quién se ocupó · {mes actual}"** → ranking de los 4 con barras y 🥇 al/los líderes (usar el mes
  `mesActualKey()`; si no existe la clave, todos en 0).
- **"Histórico por mes"** → el resto de las claves (meses anteriores), cada una con su total y un chip
  por miembro con su conteo, 🥇 al ganador del mes. Orden descendente por fecha.
- Visible para los 4 (es info de la familia).

---

## TAREA 5 — Reglas de Firestore
Agregar excepción para el doc del contador (cualquier miembro suma su +1):
```
match /config/comprasContador {
  allow read, write: if isFamilyMember();
}
```
`planes/*` ya permite escritura de miembros (encargado/estado), sin cambios. **Deploy:**
`firebase deploy --only firestore:rules`.

---

## Qué actualizar / reconciliar en el repo
1. **Llamadas a `generarInstanciaCompraRapida`**: sacar el argumento `asignados` (firma nueva
   `(plantilla, itemsSeleccionados)`). Buscar usos en la pantalla de armado (E14.2) y ajustar:
   ya no se elige asignado al generar.
2. **Quitar la UI de "asignar a varias personas"** del flujo de armado (era de E14.1/E14.2). El
   reparto ahora es por turno voluntario, no por asignación previa. Si querés, dejá un texto
   "La verán los 4 y alguien se encarga".
3. **`marcarCompraRapidaHecha`**: pasa a requerir `completadaPor` — actualizar la llamada de la card.
4. **MAPEO_FIRESTORE.md**: documentar `Plan.encargado`, doc `config/comprasContador`
   (`meses["YYYY-MM"][miembroId] = n`), nuevas funciones (`tomar/liberar`, `subscribeContador`,
   `resumenPorMes`) y la firma nueva de `generar`/`marcar...Hecha`. Bump de versión.
5. **Tests**: ajustar los que llamaban `generarInstanciaCompraRapida(plantilla, asignados, items)`.
   Agregar: `tomarCompraRapida` setea encargado y rechaza doble-claim; `marcarCompraRapidaHecha`
   suma +1 en `config/comprasContador` bajo la clave del mes actual.

```
git commit -m "E14.4: compras por turno voluntario (encargado) + contador mensual y histórico (config/comprasContador)"
```

## Criterios de aceptación
1. Juan o María generan una compra; **aparece en la principal de los 4** como "sin encargado".
2. Cualquiera toca **"Yo me encargo"** y queda a su nombre; los otros 3 ven "X se está encargando"
   en realtime y no pueden duplicar (doble-claim rechazado con mensaje).
3. "Ya no puedo" la libera; "La hago yo" la transfiere.
4. Al **marcar lista**, la compra **desaparece para todos** y suma **+1** al `encargado` en el
   contador del **mes en curso**.
5. El **contador del mes** muestra el ranking de los 4; el **histórico por mes** lista los meses
   anteriores con su ganador. Ambos visibles para los 4, en realtime.
6. El cambio de mes es automático (clave `YYYY-MM`); no requiere acción manual.
7. Sin regresiones: generar sigue siendo de Juan/María; Sofía y Fede pueden encargarse y completar.
```
