# PROMPT_E2.2 — Data layer + hooks + realtime + offline + voto transaccional

> Cuarto prompt de Etapa 2 (E2.1 ya cerrado). Construye la capa de acceso a Firestore con 6 módulos (uno por colección lógica), tres hooks genéricos de React para evitar repetir `useEffect` con cleanups en cada componente, suscripciones realtime para planes y compras, offline persistence multi-tab del SDK, y la transacción atómica del voto + cierre automático.
>
> Al cerrar este prompt, el data layer está completo y testeado. Los componentes de Etapas 3+ van a consumir estos módulos y estos hooks — NO van a llamar al SDK de Firebase directamente.
>
> Tareas a ejecutar por Claude Code en el repo `Comidas-Familiares`.

---

## Contexto

- **E2.1 cerrado**: `src/types/models.ts` con todos los shapes del MAPEO §2 (Receta, Menu con `componentes[]`, Plan con `votos: {}` map, ListaCompras, ItemCompra, Historial, etc.). `src/lib/canonical.ts` y `src/lib/parsers.ts` con helpers y tests Vitest verdes (56/56).
- **Auth funcionando**: `useAuth` hook expone `state.user.memberId` cuando el usuario está autenticado.
- **Routing funcionando**: AppShell + 10 rutas placeholder.
- **Hoy**: ningún componente lee/escribe Firestore. La etapa siguiente (E2.3 Security Rules) bloqueará al cliente excepto en lo permitido — por eso este data layer **tiene que tener todas las reads y writes encapsuladas** ahora, así E2.3 valida que la app sigue funcionando.
- **Fuente de verdad**: `docs/MAPEO_FIRESTORE.md` v1.3, especialmente:
  - §2 (shape de cada colección)
  - §3.7 (atomicidad del voto)
  - §3.8 (campos derivados del menú)
  - §5.2 (queries por pantalla + nota realtime vs snapshot)
  - §6.8 (realtime en planes y compras)
  - §7.2 (este prompt — la spec)

## Decisiones zanjadas (no re-discutir)

1. **Un módulo por colección lógica**:
   - `src/data/recetas.ts`
   - `src/data/menus.ts`
   - `src/data/planes.ts`
   - `src/data/compras.ts`
   - `src/data/historial.ts`
   - `src/data/diccionarios.ts`
2. **Hooks genéricos** en `src/data/hooks.ts`:
   - `useDoc<T>(path)` — lectura snapshot única de un doc.
   - `useCollection<T>(path, constraints?)` — lectura snapshot única de una colección.
   - `useCollectionRealtime<T>(path, constraints?)` — suscripción `onSnapshot` con cleanup automático.
3. **Realtime** en `planes` (semana activa) y `compras/{idLista}/items`. El resto va con snapshot único.
4. **Offline persistence multi-tab** del SDK. **Usar la API moderna** `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`. La JP puede tener la app abierta en celu + iPad simultáneamente, así que multi-tab es indispensable. NO usar `enableIndexedDbPersistence` (legacy) ni `enableMultiTabIndexedDbPersistence` (legacy multi-tab) — están deprecadas.
5. **Manejo de errores**:
   - Reads tiran excepciones (`throw new Error(...)`). El componente las captura con error boundary o try/catch en el hook.
   - Writes devuelven `Result<T, AppError>` (alias de `{ ok: true, value: T } | { ok: false, error: AppError }`). Esto permite mostrar feedback claro al usuario (toast/alert).
   - `AppError` es un type con `code: string` y `message: string` — para que la UI pueda decidir el mensaje según el código.
6. **runTransaction del voto + cierre** se entrega en este prompt como `voteAndCloseIfComplete(idPlan, miembroId, puntaje, comentario): Promise<Result<VoteOutcome, AppError>>` en `planes.ts`. Implementa el flujo de §3.7 paso a paso, incluyendo el caso "tipoSeleccion === menu" donde NO se actualizan contadores de receta (se actualizan los del menú si decidimos hacerlo — ver decisión 9).
7. **`deriveMenuMetadata(idMenu)`** se entrega en `menus.ts` aplicando las reglas exactas de §3.8.
8. **Sin estado global** (Zustand, Redux, Jotai). Los hooks de React + el cache del SDK alcanzan.
9. **Contadores en `recetas`** se actualizan en el voto solo si `tipoSeleccion === "receta"`. Si es un menú: por ahora **NO** actualizamos contadores en el menú ni en sus componentes (el MAPEO no lo especifica). Documentar como TODO en el código y avisarlo al cerrar el prompt.
10. **Funciones puras + hooks**: cada módulo de datos exporta funciones puras (`getRecetas()`, `getReceta(id)`, etc.) Y los hooks consumen esas funciones. Esto permite usar el data layer fuera de React si hace falta (scripts de seeding, tests).
11. **Tests**: Vitest sigue siendo el runner. Mockear Firestore con `@firebase/rules-unit-testing` no es para este prompt (eso es E2.3 con emulador). Acá solo testeamos lógica pura (deriveMenuMetadata, cálculos de promedio/resultado, transformaciones de input → Firestore doc).
12. **Política de commits**: igual que E1.1/E1.2/E1.2.5/E2.1 — un commit por tarea numerada, prefijo `Stage 2.2:`, en inglés, modo imperativo, push al final.

---

## Tareas

### Tarea 1 — Definir `Result<T, AppError>` en `src/lib/result.ts`

Crear el helper con factory functions para escribir `ok(value)` y `err(code, message)`.

```typescript
/**
 * Result type for operations that can fail.
 * Reads typically throw; writes return Result.
 */

export type AppError = {
  code: string;       // stable identifier, e.g. "plan-already-evaluated"
  message: string;    // human-readable, in Spanish (UI shows this)
  cause?: unknown;    // optional underlying error (Firebase error, etc.)
};

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err(code: string, message: string, cause?: unknown): Result<never, AppError> {
  return { ok: false, error: { code, message, cause } };
}

/**
 * Unwrap a Result. Throws if it's an error.
 * Useful in tests and in cases where caller knows the operation should succeed.
 */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`Result.unwrap failed: ${result.error.code} - ${result.error.message}`);
  }
  return result.value;
}
```

Agregar test mínimo en `src/lib/result.test.ts`:
- `ok(42)` devuelve `{ ok: true, value: 42 }`.
- `err("test-code", "test msg")` devuelve `{ ok: false, error: { code: "test-code", message: "test msg" } }`.
- `unwrap(ok(42))` devuelve `42`.
- `unwrap(err(...))` lanza Error.

**Commit**: `Stage 2.2: add Result type for write operations`

---

### Tarea 2 — Modernizar `src/firebase.ts` con offline persistence multi-tab

**IMPORTANTE**: la versión actual de `src/firebase.ts` usa `getFirestore(app)`. Hay que reemplazarla por `initializeFirestore` con cache persistente multi-tab.

Reescribir completamente `src/firebase.ts`:

```typescript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBjs-atkLON7zhMS363sEhP-AmI6dwm1-I",
  authDomain: "comida-familiar.firebaseapp.com",
  projectId: "comida-familiar",
  storageBucket: "comida-familiar.firebasestorage.app",
  messagingSenderId: "133743597694",
  appId: "1:133743597694:web:8a39542b85a18bfb1de02f",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Firestore initialized with multi-tab persistent local cache.
 * Why: JP may have the app open on phone + iPad at the same time.
 *      The multi-tab manager coordinates IndexedDB access across tabs/windows
 *      so writes from one tab become visible in others without conflicts.
 *
 * Uses the modern (post-9.0) API. Do NOT use the legacy enableIndexedDbPersistence
 * or enableMultiTabIndexedDbPersistence — those are deprecated.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
```

**Comprobar antes**: que toda referencia a `db` en el código existente (en `src/auth/`) sigue funcionando — la API es la misma (`db` es un `Firestore`).

**Cuidado**: en algunos entornos (Safari ITP, modo incógnito) IndexedDB puede no estar disponible o estar limitado. La SDK loguea un warning pero la app sigue funcionando en modo memoria. NO hay que catchear nada explícitamente, pero documentarlo en un comentario.

**Test rápido para validar**:
1. Levantar la app, loguearse.
2. Abrir DevTools → Application → IndexedDB. Debería existir una base `firestore/{projectId}/{databaseId}/main` con tablas.
3. Cerrar DevTools, refrescar — la app sigue funcionando.

**Commit**: `Stage 2.2: enable multi-tab offline persistence with modern API`

---

### Tarea 3 — Crear `src/data/_helpers.ts`

Helpers internos del data layer (privados al folder).

```typescript
import { DocumentData, QueryDocumentSnapshot, Timestamp } from "firebase/firestore";

/**
 * Generic Firestore document converter that types the data.
 * Use: collection(db, "recetas").withConverter(converter<Receta>())
 */
export function converter<T>() {
  return {
    toFirestore(data: T): DocumentData {
      return data as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      return snapshot.data() as T;
    },
  };
}

/**
 * Returns a Firestore Timestamp for "now" — wraps Timestamp.now()
 * for easier mocking in tests.
 */
export function nowTimestamp(): Timestamp {
  return Timestamp.now();
}

/**
 * Map FirebaseError codes to user-friendly Spanish messages.
 * Returns null if the error is not a known Firebase error.
 */
export function firebaseErrorMessage(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  const code = (err as { code?: string }).code;
  if (!code) return null;

  switch (code) {
    case "permission-denied":
      return "No tenés permiso para hacer esta acción.";
    case "unavailable":
      return "No se pudo conectar con el servidor. Probá de nuevo en unos segundos.";
    case "not-found":
      return "No se encontró el documento solicitado.";
    case "already-exists":
      return "Ya existe un documento con esa identificación.";
    case "failed-precondition":
      return "La operación falló por una validación previa.";
    case "aborted":
      return "La operación fue cancelada por un conflicto. Probá de nuevo.";
    case "deadline-exceeded":
      return "La operación tardó demasiado. Probá de nuevo.";
    default:
      return `Error de Firebase (${code}).`;
  }
}
```

**Commit**: `Stage 2.2: add data layer internal helpers`

---

### Tarea 4 — `src/data/diccionarios.ts`

El más simple: lee `/config/diccionarios` (un solo doc).

```typescript
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Diccionarios } from "../types/models";

/**
 * Reads the global dictionary document.
 * Cached at module level for the session — diccionarios rarely change.
 */
let cachedDiccionarios: Diccionarios | null = null;

export async function getDiccionarios(): Promise<Diccionarios> {
  if (cachedDiccionarios) return cachedDiccionarios;

  const ref = doc(db, "config", "diccionarios");
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("No se encontró /config/diccionarios. Ejecutar el script de bootstrap.");
  }

  cachedDiccionarios = snap.data() as Diccionarios;
  return cachedDiccionarios;
}

/**
 * Forces a re-read from Firestore, bypassing the cache.
 * Useful after editing diccionarios from the console.
 */
export async function refreshDiccionarios(): Promise<Diccionarios> {
  cachedDiccionarios = null;
  return getDiccionarios();
}
```

**Commit**: `Stage 2.2: add diccionarios data module`

---

### Tarea 5 — `src/data/recetas.ts`

CRUD + queries. Sin realtime (las recetas no se editan en simultáneo).

Funciones a exportar:

- `getRecetas(): Promise<Receta[]>` — todas, ordenadas por nombre.
- `getReceta(idReceta: string): Promise<Receta | null>` — una.
- `getRecetasByIds(ids: string[]): Promise<Receta[]>` — para resolver componentes de menú. Usa `Promise.all` con `getDoc`. Si se necesita batch (>10 ids), considerar `documentId() in` query — pero para v1 alcanza con N getDocs paralelos.
- `crearReceta(receta: Omit<Receta, "fechaImportacion" | "vecesCocinada">): Promise<Result<Receta, AppError>>` — usa el `idReceta` del input. Si ya existe, devuelve `err("recipe-already-exists", ...)`.
- `actualizarReceta(idReceta: string, updates: Partial<Receta>): Promise<Result<void, AppError>>`.
- `eliminarReceta(idReceta: string): Promise<Result<void, AppError>>` — el control "no eliminar si está en plan activo o en menú" lo hace el caller (no es Security Rule).

**Importante**:
- Usar `nombreCanonico` derivado al crear/actualizar (importar `canonicalizarIngrediente` del módulo correcto si aplica, o el helper general).
- Al crear, agregar `fechaImportacion: serverTimestamp()` y `vecesCocinada: 0`.
- Capturar errores de Firebase y mapearlos con `firebaseErrorMessage`.

Test mínimo en `src/data/recetas.test.ts`: cubrir el helper que computa `nombreCanonico` de input string. (NO testear las queries en sí — eso es E2.3 con emulador.)

**Commit**: `Stage 2.2: add recetas data module with CRUD`

---

### Tarea 6 — `src/data/menus.ts` con `deriveMenuMetadata`

Funciones a exportar:

- `getMenus(): Promise<Menu[]>` — todos.
- `getMenu(idMenu: string): Promise<Menu | null>`.
- `crearMenu(menu: Menu): Promise<Result<Menu, AppError>>` — usa `idMenu` del input. Anti-dup por `nombreCanonico`.
- `actualizarMenu(idMenu: string, updates: Partial<Menu>): Promise<Result<void, AppError>>`.
- `eliminarMenu(idMenu: string): Promise<Result<void, AppError>>`.

**Función clave** — `deriveMenuMetadata(menu: Menu): Promise<MenuDerived>`:

```typescript
import { getRecetasByIds } from "./recetas";
import type { Menu, MenuDerived, Receta } from "../types/models";

export async function deriveMenuMetadata(menu: Menu): Promise<MenuDerived> {
  const obligatorios = menu.componentes.filter(c => c.obligatorio);
  const ids = obligatorios.map(c => c.idReceta);
  const recetas = await getRecetasByIds(ids);

  return {
    tiempoActivoMin: sumarTiempoActivo(recetas),
    tiempoTotalMin: calcularTiempoTotal(recetas),
    dificultadOrden: maxOrDefault(recetas.map(r => r.dificultadOrden), 1),
    sinLacteos: recetas.every(r => r.sinLacteos),
    hidratos: recetas.some(r => r.hidratos),
    porcionesMin: minOrDefault(recetas.map(r => r.porcionesMin), 1),
    porcionesMax: minOrDefault(recetas.map(r => r.porcionesMax), 1),  // sí, MIN — el menú escala al componente que menos rinde
    costoOrden: maxOrDefault(recetas.map(r => r.costoOrden), 1),
  };
}

function sumarTiempoActivo(recetas: Receta[]): number {
  return recetas.reduce((sum, r) => sum + (r.tiempoActivoMin ?? 0), 0);
}

function calcularTiempoTotal(recetas: Receta[]): number {
  if (recetas.length === 0) return 0;
  // §3.8: max(tiempoTotalMin) de los componentes + suma de tiempoActivoMin de los demás.
  // Asume cocciones pasivas solapadas, activas en secuencia.
  const maxTotal = Math.max(...recetas.map(r => r.tiempoTotalMin ?? 0));
  const idxMaxTotal = recetas.findIndex(r => (r.tiempoTotalMin ?? 0) === maxTotal);
  const activosDelResto = recetas
    .filter((_, i) => i !== idxMaxTotal)
    .reduce((sum, r) => sum + (r.tiempoActivoMin ?? 0), 0);
  return maxTotal + activosDelResto;
}

function maxOrDefault(nums: number[], def: number): number {
  return nums.length === 0 ? def : Math.max(...nums);
}

function minOrDefault(nums: number[], def: number): number {
  return nums.length === 0 ? def : Math.min(...nums);
}
```

**Tipo `MenuDerived`** se exporta desde `src/types/models.ts` si no existe ya:

```typescript
export interface MenuDerived {
  tiempoActivoMin: number;
  tiempoTotalMin: number;
  dificultadOrden: number;
  sinLacteos: boolean;
  hidratos: boolean;
  porcionesMin: number;
  porcionesMax: number;
  costoOrden: number;
}
```

**Test** en `src/data/menus.test.ts` — el cálculo es pura matemática, perfecto para Vitest. Casos:

- 0 componentes → defaults seguros.
- 1 componente con `tiempoActivoMin: 30, tiempoTotalMin: 60` → tiempoTotal = 60, tiempoActivo = 30.
- 2 componentes (A: activo 20, total 30; B: activo 15, total 90) → tiempoTotal = 90 + 20 = 110 (B es el de mayor total, sumo el activo de A).
- 3 componentes mixed `sinLacteos`: [true, true, false] → false.
- 2 componentes `hidratos`: [false, true] → true.
- dificultadOrden = max.
- porcionesMin = min, porcionesMax = min (no max).
- costoOrden = max.

**Commit**: `Stage 2.2: add menus data module with deriveMenuMetadata`

---

### Tarea 7 — `src/data/planes.ts` (la más compleja)

Funciones a exportar:

**Reads:**
- `getPlanesActivos(semanaInicio: string): Promise<Plan[]>` — snapshot único, para tests.
- `getPlan(idPlan: string): Promise<Plan | null>`.

**Realtime:**
- `subscribeToPlanesActivos(semanaInicio: string, callback: (planes: Plan[]) => void): () => void` — devuelve un unsubscribe.

**Writes:**
- `crearPlan(plan: Omit<Plan, "fechaEleccion" | "votos" | "comentariosPlan" | "datosCocinero">): Promise<Result<Plan, AppError>>`.
- `actualizarPlan(idPlan: string, updates: Partial<Plan>): Promise<Result<void, AppError>>`.
- `descartarPlan(idPlan: string): Promise<Result<{ cascadeBorrados: string[] }, AppError>>` — si es Especial, borra extras activos en cascada. Devuelve los IDs borrados.
- `marcarCocinada(idPlan: string, opciones?: { cocinarExtras: boolean }): Promise<Result<void, AppError>>` — implementa el flag de §1.2 (mantener comportamiento Apps Script). Si `cocinarExtras: true` y el plan es Especial, también marca sus extras como Cocinada.

**Voto + cierre transaccional (la joya de la corona):**

```typescript
import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Plan, Historial, MemberId } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";

export interface VoteOutcome {
  planActualizado: Plan;
  cerrado: boolean;          // true if this was the 4th vote and the plan is now Evaluada
  promedio?: number;         // present if cerrado === true
  resultado?: string;        // present if cerrado === true
  idHistorial?: string;      // present if cerrado === true
}

/**
 * Registers a vote for a member on a plan. If this completes the 4 votes,
 * also writes the historial entry and updates the plan + recipe counters
 * atomically (single Firestore transaction).
 *
 * §3.7 in MAPEO_FIRESTORE.md
 */
export async function voteAndCloseIfComplete(
  idPlan: string,
  miembroId: MemberId,
  puntaje: number,
  comentario: string
): Promise<Result<VoteOutcome, AppError>> {
  if (puntaje < 1 || puntaje > 10) {
    return err("invalid-score", "El puntaje debe estar entre 1 y 10.");
  }

  try {
    const result = await runTransaction(db, async (tx) => {
      const planRef = doc(db, "planes", idPlan);
      const planSnap = await tx.get(planRef);

      if (!planSnap.exists()) {
        throw new TransactionAbort("plan-not-found", "El plan no existe.");
      }

      const plan = planSnap.data() as Plan;

      if (plan.estado !== "Cocinada") {
        throw new TransactionAbort(
          "plan-not-cookable",
          `No se puede votar un plan en estado "${plan.estado}". Tiene que estar Cocinada.`
        );
      }

      // Update votes locally (we don't have post-merge read inside tx; compute from current data)
      const nuevosVotos = { ...(plan.votos ?? {}), [miembroId]: puntaje };
      const nuevosComentarios = { ...(plan.comentariosPlan ?? {}), [miembroId]: comentario };

      tx.update(planRef, {
        [`votos.${miembroId}`]: puntaje,
        [`comentariosPlan.${miembroId}`]: comentario,
      });

      // Check if all 4 votes are now in.
      const votosCompletos = (["juanpablo", "maria", "sofia", "federico"] as MemberId[])
        .every((mid) => typeof nuevosVotos[mid] === "number");

      if (!votosCompletos) {
        return {
          planActualizado: { ...plan, votos: nuevosVotos, comentariosPlan: nuevosComentarios },
          cerrado: false,
        };
      }

      // All 4 voted — close evaluation.
      const promedio = calcularPromedio(nuevosVotos);
      const resultado = calcularResultadoTextual(promedio);
      const fechaHoy = new Date().toISOString().slice(0, 10);

      // Build historial document.
      const idHistorial = await proximoIdHistorial();  // pure helper (random-ish, see below)
      const historialRef = doc(db, "historial", idHistorial);

      const historialDoc: Historial = {
        idHist: idHistorial,
        fechaRealizada: fechaHoy,
        fechaRealizadaTimestamp: Timestamp.now(),
        idPlan: plan.idPlan,
        idReceta: plan.tipoSeleccion === "receta" ? plan.idSeleccion : "",
        idMenu: plan.tipoSeleccion === "menu" ? plan.idSeleccion : "",
        receta: plan.nombreSeleccion,
        tipoSeleccion: plan.tipoSeleccion,
        idSeleccion: plan.idSeleccion,
        nombreSeleccion: plan.nombreSeleccion,
        semanaInicio: plan.semanaInicio,
        ocasion: plan.datosCocinero?.ocasion ?? "",
        calificaciones: { ...nuevosVotos } as Required<Plan["votos"]>,
        comentarios: { ...nuevosComentarios } as Required<Plan["comentariosPlan"]>,
        promedio,
        resultado,
        repetir: plan.datosCocinero?.repetir ?? "",
        costoRealAprox: plan.datosCocinero?.costoReal ?? "",
        dificultadReal: plan.datosCocinero?.dificultadReal ?? "",
        queSalioBien: plan.datosCocinero?.queSalioBien ?? "",
        queCambiaria: plan.datosCocinero?.queCambiaria ?? "",
        notasFamiliares: plan.datosCocinero?.notasFamiliares ?? "",
      };

      tx.set(historialRef, historialDoc);
      tx.update(planRef, { estado: "Evaluada" });

      // Update recipe counters — only if tipoSeleccion is "receta".
      // TODO v1.4: decide what to do for menu plans (no counter on menu nor on components currently).
      if (plan.tipoSeleccion === "receta") {
        const recetaRef = doc(db, "recetas", plan.idSeleccion);
        tx.update(recetaRef, {
          vecesCocinada: increment(1),
          ultimaEvaluacion: Timestamp.now(),
          ultimoPuntaje: promedio,
        });
      }

      return {
        planActualizado: { ...plan, votos: nuevosVotos, comentariosPlan: nuevosComentarios, estado: "Evaluada" },
        cerrado: true,
        promedio,
        resultado,
        idHistorial,
      };
    });

    return ok(result);
  } catch (e) {
    if (e instanceof TransactionAbort) {
      return err(e.code, e.message, e);
    }
    return err("vote-transaction-failed", "No se pudo registrar el voto. Probá de nuevo.", e);
  }
}

class TransactionAbort extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

function calcularPromedio(votos: Plan["votos"]): number {
  const valores = Object.values(votos).filter((v): v is number => typeof v === "number");
  if (valores.length === 0) return 0;
  const sum = valores.reduce((a, b) => a + b, 0);
  return Math.round((sum / valores.length) * 10) / 10;  // 1 decimal
}

function calcularResultadoTextual(promedio: number): string {
  if (promedio >= 9) return "Excelente";
  if (promedio >= 7.5) return "Muy bueno";
  if (promedio >= 6) return "Bueno";
  if (promedio >= 4) return "Regular";
  if (promedio > 0) return "Malísimo";
  return "";
}

async function proximoIdHistorial(): Promise<string> {
  // Random ID with timestamp prefix — globally unique, no collision risk in practice.
  // Format: HIST-yyyyMMddHHmmss-rand4
  const now = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  const fecha = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `HIST-${fecha}-${rand}`;
}
```

**Tests** (en `src/data/planes.test.ts`):
- `calcularPromedio({ juanpablo: 8, maria: 9, sofia: 7, federico: 10 })` → 8.5.
- `calcularPromedio({ juanpablo: 8 })` → 8.0.
- `calcularResultadoTextual(9.5)` → "Excelente".
- `calcularResultadoTextual(7.5)` → "Muy bueno".
- `calcularResultadoTextual(6)` → "Bueno".
- `calcularResultadoTextual(4)` → "Regular".
- `calcularResultadoTextual(3.9)` → "Malísimo".
- `calcularResultadoTextual(0)` → "".

Para testear, exportar `calcularPromedio` y `calcularResultadoTextual` (que estaban como helpers privados) o moverlos a `src/lib/voto.ts`. **Recomendación**: moverlos a `src/lib/voto.ts` (helpers puros) y que `planes.ts` los importe. Más limpio para testing.

**Commit**: `Stage 2.2: add planes data module with vote transaction`

---

### Tarea 8 — `src/data/compras.ts` con realtime

Funciones a exportar:

**Reads:**
- `getListaActiva(semanaInicio: string): Promise<ListaCompras | null>` — busca la lista de la semana via los planes activos.
- `getItemsLista(idLista: string): Promise<ItemCompra[]>` — items de una lista.

**Realtime:**
- `subscribeToItemsLista(idLista: string, callback: (items: ItemCompra[]) => void): () => void`.

**Writes:**
- `crearLista(semanaInicio: string): Promise<Result<ListaCompras, AppError>>` — genera `idLista` con timestamp.
- `sincronizarListaSemana(semanaInicio: string, planes: Plan[], recetas: Map<string, Receta>): Promise<Result<void, AppError>>` — la función "core": agarra todos los planes activos, lee sus ingredientes (via recetas embebidas o cargadas), aplica la sumabilidad (§6.1) y reemplaza los items de la lista.
- `toggleYaTengo(idLista: string, itemId: string, yaTengo: boolean): Promise<Result<void, AppError>>` — update atómico de un solo item.
- `agregarItemManual(idLista: string, item: Omit<ItemCompra, "itemId">): Promise<Result<ItemCompra, AppError>>` — para "Pan" u otros agregados sueltos.
- `eliminarItem(idLista: string, itemId: string): Promise<Result<void, AppError>>`.

**Sumabilidad** (§6.1) en `sincronizarListaSemana`:
- Para cada plan activo, levantar sus ingredientes (de las recetas pasadas como Map).
- Por cada ingrediente, calcular `ingredienteCanonico` con `canonicalizarIngrediente` de `src/lib/canonical.ts`.
- Agrupar por clave `(ingredienteCanonico, unidad)`. Si hay match → sumar cantidad. Si no → crear nuevo item.
- Mantener `aportes[]` con `{idPlan, idReceta, nombreReceta, cantidad, unidad, tipoOrigen}` por cada contribución.
- Para `categoria`: tomar la primera no vacía entre los aportes.
- Para `opcional`: true solo si TODOS los aportes son opcionales.
- Para `notas`: concatenar con `" | "` separador.
- Para `cantidadLabel`: regenerar como `${cantidadTotal} ${unidad}`.
- Persistir el resumen denormalizado en `compras/{idLista}.resumen` (totalItems, totalYaTengo, totalPendientes).

**Importante**: la sincronización **respeta los `yaTengo` previos**. Si en la sync anterior el item "Cebolla" tenía `yaTengo: true` y la nueva sync lo mantiene como item, el flag persiste.

Esto requiere primero leer los items actuales, indexar por clave canónica, y al regenerar consultar el cache anterior.

**Test puro** (`src/data/compras.test.ts`): cubrir la función `agruparPorClaveCanonica(planesConIngredientes, ingredientesAnteriores)` — pura, no toca Firestore. Casos:

- 1 receta con "Cebolla 2 unidades" + 1 receta con "Cebollas 1 unidad" → 1 item: "Cebolla 3 unidades" con 2 aportes.
- 1 receta con "Cebolla 200g" + 1 receta con "Cebolla 1 unidad" → 2 items separados (unidades diferentes).
- 1 receta con "Cebolla 2 unidades" + ya tenía `yaTengo: true` en sync anterior → mantiene `yaTengo: true`.

Para que esto sea testeable, la función de agrupación debe ser pura y vivir en `src/lib/compras.ts` (no en `src/data/compras.ts`).

**Commit**: `Stage 2.2: add compras data module with realtime and shopping list sync`

---

### Tarea 9 — `src/data/historial.ts`

Más simple — solo reads, las writes vienen via voteAndCloseIfComplete.

Funciones a exportar:

- `getHistorialReciente(limite: number): Promise<Historial[]>` — últimas N entries ordenadas por `fechaRealizadaTimestamp` desc.
- `getHistorialDeReceta(idReceta: string): Promise<Historial[]>` — todas las entradas donde `idReceta === idReceta`.
- `getHistorialDeMenu(idMenu: string): Promise<Historial[]>`.

**Importante**: los queries usan `orderBy("fechaRealizadaTimestamp", "desc")` + `limit(N)` — esto requiere un índice (que se crea en E2.6).

**Commit**: `Stage 2.2: add historial data module with read-only queries`

---

### Tarea 10 — `src/data/hooks.ts` — los 3 hooks genéricos

```typescript
import { useEffect, useState } from "react";
import {
  DocumentReference,
  Query,
  CollectionReference,
  getDoc,
  getDocs,
  onSnapshot,
  QueryConstraint,
  query,
} from "firebase/firestore";

export type LoadingState = "idle" | "loading" | "loaded" | "error";

export interface AsyncState<T> {
  data: T | null;
  status: LoadingState;
  error: Error | null;
}

/**
 * Reads a single document once. No realtime.
 * Throws are captured into state.error.
 */
export function useDoc<T>(ref: DocumentReference<T> | null): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    status: ref ? "loading" : "idle",
    error: null,
  });

  useEffect(() => {
    if (!ref) {
      setState({ data: null, status: "idle", error: null });
      return;
    }

    let active = true;
    setState({ data: null, status: "loading", error: null });

    getDoc(ref)
      .then((snap) => {
        if (!active) return;
        if (snap.exists()) {
          setState({ data: snap.data() as T, status: "loaded", error: null });
        } else {
          setState({ data: null, status: "loaded", error: null });
        }
      })
      .catch((e: Error) => {
        if (!active) return;
        setState({ data: null, status: "error", error: e });
      });

    return () => {
      active = false;
    };
  }, [ref?.path]);  // re-fetch when path changes

  return state;
}

/**
 * Reads a collection or query once. No realtime.
 */
export function useCollection<T>(
  collectionRef: CollectionReference<T> | null,
  constraints: QueryConstraint[] = []
): AsyncState<T[]> {
  const [state, setState] = useState<AsyncState<T[]>>({
    data: null,
    status: collectionRef ? "loading" : "idle",
    error: null,
  });

  // Serialize constraints to detect changes
  const constraintsKey = JSON.stringify(constraints);

  useEffect(() => {
    if (!collectionRef) {
      setState({ data: null, status: "idle", error: null });
      return;
    }

    let active = true;
    setState({ data: null, status: "loading", error: null });

    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

    getDocs(q)
      .then((snap) => {
        if (!active) return;
        const data = snap.docs.map((d) => d.data() as T);
        setState({ data, status: "loaded", error: null });
      })
      .catch((e: Error) => {
        if (!active) return;
        setState({ data: null, status: "error", error: e });
      });

    return () => {
      active = false;
    };
  }, [collectionRef?.path, constraintsKey]);

  return state;
}

/**
 * Subscribes to a collection or query in realtime via onSnapshot.
 * Automatically cleans up on unmount.
 */
export function useCollectionRealtime<T>(
  collectionRef: CollectionReference<T> | null,
  constraints: QueryConstraint[] = []
): AsyncState<T[]> {
  const [state, setState] = useState<AsyncState<T[]>>({
    data: null,
    status: collectionRef ? "loading" : "idle",
    error: null,
  });

  const constraintsKey = JSON.stringify(constraints);

  useEffect(() => {
    if (!collectionRef) {
      setState({ data: null, status: "idle", error: null });
      return;
    }

    setState({ data: null, status: "loading", error: null });

    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => d.data() as T);
        setState({ data, status: "loaded", error: null });
      },
      (e: Error) => {
        setState({ data: null, status: "error", error: e });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [collectionRef?.path, constraintsKey]);

  return state;
}
```

**Nota**: `JSON.stringify(constraints)` para tener una key estable en el `useEffect`. Los `QueryConstraint` de Firestore son objetos con métodos, así que `JSON.stringify` puede producir output raro — para el caso simple (where, orderBy, limit) funciona.

**Mejora opcional para futuro**: usar `react-firebase-hooks` que ya implementa esto y está testeado. Por ahora la implementación propia mantiene el bundle más chico y el control total.

**Commit**: `Stage 2.2: add generic data hooks (useDoc, useCollection, useCollectionRealtime)`

---

### Tarea 11 — Verificación: tests Vitest verdes

Correr la suite completa:

```bash
npm run test
```

Debe ser **todos verdes**. Los nuevos tests (Result, deriveMenuMetadata, calcularPromedio, calcularResultadoTextual, agruparPorClaveCanonica) sumados a los 56 de E2.1.

Estimado: **75-90 tests verdes** al cerrar este prompt.

**Si algún test rojo**: parar, arreglar, NO commitear con tests rojos.

---

### Tarea 12 — Verificación: TypeScript sin errores

```bash
npm run build
```

El build de Vite hace tsc + Vite compile. Cero errores de tipo. Si algo falla:
- Si el error es por un type que falta en `src/types/models.ts` (ej. `MenuDerived`), agregarlo ahí.
- Si el error es por una API que no existe en la versión instalada de Firebase, verificar la versión en `package.json` y ajustar imports.

**No deployar aún** — el deploy viene en Tarea 13.

---

### Tarea 13 — Verificación: smoke test manual

`npm run dev`. Loguearse. Por ahora la app NO usa el data layer en ninguna pantalla (las rutas son placeholders). Pero queremos validar que:

1. **No hay crashes** al levantar — el cambio a `initializeFirestore` con cache multi-tab no rompió nada.
2. **DevTools → Application → IndexedDB** muestra la base `firestore/...` creada.
3. **Console** sin warnings rojos (puede haber warnings amarillos de Firebase sobre cache, OK).

Si hay crashes → debuggear ANTES de seguir.

---

### Tarea 14 — Build + deploy + push

```bash
npm run build
firebase deploy --only hosting
git status
git log --oneline -20
git push
```

Probar en `https://comida-familiar.web.app` que el login sigue funcionando. La app se ve igual que antes (las rutas siguen siendo placeholders, el data layer todavía no se consume), pero está conectada de fondo.

**Commit**: `Stage 2.2: deploy data layer to production`

---

## Criterios de aceptación

1. ✅ `src/lib/result.ts` + tests.
2. ✅ `src/firebase.ts` modernizado con `initializeFirestore` + `persistentMultipleTabManager`.
3. ✅ `src/data/_helpers.ts` con converter, firebaseErrorMessage, nowTimestamp.
4. ✅ Los 6 módulos del data layer creados (`diccionarios.ts`, `recetas.ts`, `menus.ts`, `planes.ts`, `compras.ts`, `historial.ts`).
5. ✅ `deriveMenuMetadata` funcionando con tests.
6. ✅ `voteAndCloseIfComplete` con transacción atómica + tests de los helpers puros (`calcularPromedio`, `calcularResultadoTextual`).
7. ✅ `subscribeToPlanesActivos` y `subscribeToItemsLista` con `onSnapshot`.
8. ✅ Sumabilidad de compras con `aportes[]` testeada.
9. ✅ `src/data/hooks.ts` con los 3 hooks genéricos.
10. ✅ `npm run test` → todos verdes (~75-90 tests).
11. ✅ `npm run build` → sin errores.
12. ✅ IndexedDB creada al login.
13. ✅ Deploy a producción exitoso, login sigue funcionando.
14. ✅ Commits granulares con prefijo `Stage 2.2:` (~13-14 commits).

---

## Qué NO tocar

- **NO modificar** `src/auth/*` (E1.1 cerrado).
- **NO modificar** `src/types/models.ts` salvo para **agregar** `MenuDerived` si falta (NO renombrar ni eliminar types existentes).
- **NO consumir** los hooks ni las funciones del data layer en componentes de UI todavía. Eso es E3.
- **NO crear** Security Rules nuevas — la versión mínima de E1.1 (`/config` read-only para auth, `/users/{uid}` propio) sigue activa. Las rules completas vienen en E2.3.
- **NO seedear** datos. Eso es E2.4.
- **NO instalar** librerías de state management. Los hooks alcanzan.
- **NO escribir** un módulo `src/data/users.ts` — el upsert del user doc ya está en `src/auth/upsertUserDoc.ts` y funciona. Si lo movemos en el futuro, será su propio mini-prompt.
- **NO commitear** archivos con credenciales. Verificar siempre con `git status` antes de cada `git add`.

---

## Para JP, después de cerrar el prompt

Cuando los 14 criterios estén cumplidos:

1. **Confirmá** que en DevTools → Application → IndexedDB existe la base `firestore/...`.
2. **Probá offline**: en DevTools → Network → "Offline" toggle. Recargá la app. La pantalla post-login debería renderizar igual (sin red). Reactivá la red.
3. **Si tenés el iPad a mano**: abrí la app en el iPad y en el celu al mismo tiempo, ambos logueados como JP. Verificá que no hay errores en consola en ninguno (el multi-tab manager está coordinando IndexedDB entre ellos).
4. **Anotame el output de `npm run test`** — quiero ver el resumen de tests verdes (~75-90) y el listado de tests si alguno se cae.
5. **Anotame si hay TODOs en el código** que merezcan ser issues:
   - El TODO de "contadores de menú al votar" (decisión 9 del prompt).
   - Cualquier otro que Code haya marcado.

Si todo OK, **cerramos E2.2** y arrancamos `PROMPT_E2.3_security_rules.md` (Firestore Rules completas + tests con emulador).

---

## Nota técnica: por qué multi-tab persistence

Cuando JP tiene la app abierta en el celular y en el iPad al mismo tiempo (escenario habitual de la familia), las dos pestañas pelean por el lock de IndexedDB. Con `persistentMultipleTabManager`:

- Las dos pestañas comparten el mismo cache local.
- Las escrituras en una pestaña se propagan a la otra vía cache.
- Los listeners `onSnapshot` reaccionan a cambios entre pestañas sin ida y vuelta al servidor.
- Esto evita el error clásico "Failed to obtain exclusive access to the persistence layer" que aparece con la API legacy.

Es transparente para el desarrollador — funciona "por default" una vez que está activado. Pero **es indispensable habilitarlo ahora**, no después, porque la migración de "memoria → multi-tab persistence" requiere que los usuarios cierren todas las pestañas (Firestore no migra cache existente entre managers).
