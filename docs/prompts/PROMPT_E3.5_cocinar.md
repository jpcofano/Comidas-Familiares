# PROMPT_E3.5 — Pantalla de cocinar

## Contexto

Esta etapa implementa el flujo de "cocinar" — paso a paso guiado, con timers manuales, soporte para planes-receta y planes-menú. Cierra el loop entre "Compra lista" y "Cocinada".

**Pre-requisito ya cumplido:** E3.4.3 cerrada con verificación en Firebase Console. Catálogo `/ingredientes` con 194 docs, recetas con `idIngrediente`, `dificultad`/`costoEstimado` como strings, pasos con `detalle`/`nroPaso`/`puntoClave`/`errorComun` poblados.

**Decisiones tomadas con JP en chat** (no abrir a debate, ya están decididas):

1. Activación: desde detalle de receta (modo libre, no persiste) Y desde plan en "Compra lista" (vinculada, persiste).
2. Modo guiado paso por paso + toggle a vista scroll completo. Misma fuente de verdad para ambas vistas.
3. `datosCocinero` (ocasion/costoRealAprox/dificultadReal/etc) NO se carga en cocinar; va a E3.6 (votar).
4. Plan de menú: pantalla intermedia para elegir componente; estado intermedio `"Cocinando"` mientras quedan obligatorios pendientes.
5. Estado de pasos tachados y timers: localStorage, no Firestore.
6. Las dos vistas (guiada/scroll) leen y escriben el mismo `pasosTachados`.
7. Plan-menú: nuevo estado `"Cocinando"` + nuevo campo `Plan.componentesCocinados: string[]`.
8. Modo libre desde detalle de receta: no registra nada en Firestore.
9. Pasos tachados: SOLO localStorage, no cross-device.
10. Marcar como cocinada al llegar al último paso: automático.
11. "Cocinar" como primary, "Marcar Cocinada" como secondary (botón gris, al lado, más chico, sin pantalla intermedia — atajo para cuando JP ya cocinó sin usar la app).
12. "Siguiente" en modo guiado = tachar el paso actual + avanzar.

## Cambios al modelo

### `src/types/models.ts`

```typescript
// Agregar "Cocinando" al union de EstadoPlan
export type EstadoPlan =
  | "Elegida"
  | "Compra pendiente"
  | "Compra lista"
  | "Cocinando"          // NUEVO
  | "Cocinada"
  | "Evaluada";

// Agregar a Plan
export interface Plan {
  // ... resto igual
  estado: EstadoPlan;
  componentesCocinados?: string[];  // NUEVO. Opcional. Array de idReceta. Solo aplica a planes tipo menú.
}
```

### Reglas de transición de estado

**Planes tipo receta** (`tipoSeleccion === "receta"`):
- "Compra lista" → cocinado → "Cocinada" (sin pasar por "Cocinando").

**Planes tipo menú** (`tipoSeleccion === "menu"`):
- "Compra lista" → primer componente cocinado → "Cocinando".
- "Cocinando" → todos los componentes **obligatorios** cocinados → "Cocinada".
- Componentes opcionales no obligan a cerrar el plan.

### Edge case explícito

Si un menú no tiene **ningún** componente obligatorio (todos opcionales), el cálculo "todos los obligatorios cocinados" devuelve `true` vacuamente desde el primer componente cocinado. Documentalo en comentario en el código.

## Componentes a crear

### `src/hooks/useCocinarState.ts` — NUEVO

Encapsula localStorage. API:

```typescript
interface CocinarState {
  pasosTachados: number[];        // array de nroPaso
  modoVista: "guiada" | "scroll";
  pasoActual: number;             // nroPaso del paso activo en modo guiada (1-indexed)
  timersActivos: Record<number, { startMs: number; durMs: number }>;
}

function useCocinarState(sessionKey: string): {
  state: CocinarState;
  toggleTachado: (nroPaso: number) => void;
  setModoVista: (modo: "guiada" | "scroll") => void;
  setPasoActual: (nroPaso: number) => void;
  iniciarTimer: (nroPaso: number, durMs: number) => void;
  cancelarTimer: (nroPaso: number) => void;
  clearAll: () => void;            // borra la entrada de localStorage al finalizar
};
```

**Key de localStorage:** `cocinar:${sessionKey}` donde `sessionKey` puede ser:
- `libre:${idReceta}` para modo libre.
- `plan:${idPlan}:${idReceta}` para modo vinculado a plan-receta o componente de menú.

**Robustez:** wrap `JSON.parse` y `JSON.stringify` en try/catch. Si parsing falla, devolver el state inicial limpio.

**Cleanup de timers vencidos al montar:** al cargar el state desde localStorage, descartar entries de `timersActivos` donde `startMs + durMs < Date.now()`.

### `src/components/PasoCard.tsx` — NUEVO

Renderiza un paso individual.

```typescript
interface PasoCardProps {
  paso: Paso;                       // tipo del modelo
  tachado: boolean;
  esActual: boolean;                // solo aplica en modo guiada
  onToggleTachado?: () => void;     // solo en modo scroll
  onIniciarTimer?: (durMs: number) => void;
  timerActivo?: { startMs: number; durMs: number };
}
```

**Layout (mismo en modo guiada y scroll, solo cambian los controles):**

- **Header**: número del paso (círculo coloreado, gris si tachado), título destacado.
- **Tiempo**: si `tiempoEstimadoLabel` no vacío, mostrarlo al lado del título. Si `tiempoEstimadoMin` es número parseable, botón "Iniciar timer X min".
- **Detalle**: prosa principal (`detalle`).
- **Clave** (label "Clave:" — viene de `puntoClave`): bloque destacado en verde-claro, con icono ✓ o lámpara. Solo si no vacío.
- **Riesgo** (label "Riesgo:" — viene de `errorComun`): bloque destacado en amarillo-claro, con icono ⚠. Solo si no vacío.
- **Notas**: si no vacío, abajo del todo en gris chico.

**Mapeo nombres reales en Firestore** (NO usar nombres del diseño teórico):
- `nroPaso` (no `orden`)
- `detalle` (no `contenido`)
- `tiempoEstimadoLabel` y `tiempoEstimadoMin` (no `tiempoLabel`/`tiempoMin`)
- `puntoClave` (no `truco`) — mostrar con label "Clave"
- `errorComun` (no `riesgo`) — mostrar con label "Riesgo"
- `notas` (igual)

### `src/components/TimerBar.tsx` — NUEVO

Barra fija en la parte inferior de la pantalla, visible solo si hay al menos un timer activo.

- Muestra cuenta regresiva mm:ss para cada timer (`startMs + durMs - Date.now()`).
- Para múltiples timers, apilados verticalmente o en chips horizontales.
- Botón "Cancelar" por timer.
- Al llegar a 0:00: vibrar el dispositivo (`navigator.vibrate?.(500)`) + sonido suave + cambio visual a "TERMINADO". No cierra el timer automáticamente.

**Refresh visual:** `setInterval` a 1 segundo. Cleanup al desmontar.

### `src/screens/Cocinar.tsx` — NUEVO

Pantalla principal.

**Props/route params:** `{ sessionKey: string, modo: "libre" | "plan", idReceta: string, idPlan?: string }`.

**Lectura inicial:** carga `Receta` por `idReceta` (si no está en cache, fetchear).

**Estado UI:** delegado a `useCocinarState(sessionKey)`.

**Modo guiada — layout:**

```
┌────────────────────────────────────────┐
│ ← Volver        [Toggle ver todos]     │
├────────────────────────────────────────┤
│  {nombreReceta}                        │
│  Paso N de M                           │
│  ●●●○○○○ (barra)                       │
├────────────────────────────────────────┤
│                                        │
│  ⚠ Riesgo general:                     │  ← banner solo si receta.riesgos no vacío,
│  {receta.riesgos}                      │     visible solo en paso 1
│                                        │
│  <PasoCard paso={pasoActual} ... />    │
│                                        │
├────────────────────────────────────────┤
│  [← Paso anterior] [Siguiente →]       │
└────────────────────────────────────────┘
```

**Modo scroll — layout:**

```
┌────────────────────────────────────────┐
│ ← Volver     [Toggle ver paso a paso]  │
├────────────────────────────────────────┤
│  {nombreReceta}                        │
│  Pasos N/M completados                 │
│  [✓ Terminé de cocinar]                │  ← solo visible si N === M
├────────────────────────────────────────┤
│                                        │
│  ⚠ Riesgo general: {receta.riesgos}    │  ← banner siempre visible si no vacío
│                                        │
│  <PasoCard paso={paso[0]} tachado=t .../>
│  <PasoCard paso={paso[1]} tachado=f .../>
│  ...                                   │
│                                        │
├────────────────────────────────────────┤
│  <TimerBar timers={timersActivos} />   │
└────────────────────────────────────────┘
```

**Acción "Siguiente" en modo guiado:**

1. Tachar el paso actual (`toggleTachado(pasoActual.nroPaso)`).
2. Si era el último paso → llamar `finalizar()`.
3. Si no → buscar el próximo paso NO tachado por `nroPaso` ascendente y setear como actual.

**Acción "Paso anterior":**

1. Setear paso actual al inmediato anterior por `nroPaso`. NO destacha automáticamente; eso es decisión separada del usuario.

**Toggle a "ver todos" (modo scroll):**

1. Cambia `modoVista` en localStorage.
2. Renderiza todos los `PasoCard` con sus tachados respetados.
3. Toggle de vuelta: vuelve a modo guiada en el primer paso NO tachado por `nroPaso` ascendente.

**Función `finalizar()`:**

```
Si modo === "libre":
  clearAll() en localStorage
  navigate(-1) o a detalle de receta

Si modo === "plan" Y plan.tipoSeleccion === "receta":
  await marcarCocinada(idPlan)  // updateDoc estado: "Cocinada"
  clearAll()
  navigate a Home

Si modo === "plan" Y plan.tipoSeleccion === "menu":
  await marcarComponenteCocinado(idPlan, idReceta)
  // marcarComponenteCocinado computa el nuevo estado y actualiza componentesCocinados[]
  clearAll()
  navigate a SeleccionarComponenteMenu (para que JP elija el siguiente, o vea "✓ menú completo")
```

### `src/screens/SeleccionarComponenteMenu.tsx` — NUEVO

Pantalla intermedia para planes-menú.

**Layout:**

```
┌────────────────────────────────────────┐
│ ← Volver                               │
├────────────────────────────────────────┤
│  Plan: {menu.nombre}                   │
│  N/M obligatorios cocinados            │
│                                        │
│  Si N === M obligatorios:              │
│  ✓ Menú completo cocinado              │
│  [Volver al plan]                      │
├────────────────────────────────────────┤
│  Para cada componente:                 │
│  ☑ {nombreReceta} (cocinado)           │
│  ○ {nombreReceta}                      │
│    [Cocinar este →]                    │
│                                        │
│  Opcionales se muestran agrupados      │
│  al final, con botón "Cocinar" menos   │
│  prominente.                           │
└────────────────────────────────────────┘
```

**Lógica:**

- Cargar el `Menu` por `plan.idSeleccion`.
- Para cada `componente`, chequear si su `idReceta` está en `plan.componentesCocinados`.
- Click en "Cocinar este" → navega a `Cocinar.tsx` con `idPlan` + `idReceta` del componente.

## Cambios a archivos existentes

### `src/data/planes.ts`

**Modificar `getPlanesActivos` y `subscribeToPlanesActivos`:**

Agregar `"Cocinando"` al array `where("estado", "in", [...])`.

```typescript
where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista", "Cocinando", "Cocinada"])
```

**Refactorizar `marcarCocinada`:**

Reemplazar la firma actual por:

```typescript
export async function marcarCocinada(
  idPlan: string,
  opciones?: { cocinarExtras: boolean }
): Promise<Result<void, AppError>>
```

(mantener exactamente lo que ya tenía — esto sigue cerrando atómicamente para planes-receta).

**AGREGAR función nueva:**

```typescript
export async function marcarComponenteCocinado(
  idPlan: string,
  idReceta: string
): Promise<Result<{ nuevoEstado: EstadoPlan }, AppError>>
```

Lógica:
1. Lee el plan.
2. Lee el menú referenciado por `plan.idSeleccion`.
3. Calcula nuevo `componentesCocinados[]` con `idReceta` agregado (idempotente, usar `arrayUnion` o equivalente).
4. Calcula nuevo estado:
   - Si todos los componentes con `obligatorio: true` están cubiertos por `componentesCocinados` → `"Cocinada"`.
   - Si no → `"Cocinando"`.
5. `updateDoc` con ambos cambios atómicamente.
6. Devuelve el nuevo estado para que la UI pueda decidir navegación.

### `src/data/compras.ts`

**Agregar `"Cocinando"` al array `ESTADOS_CONTRIBUYENTES`** en `sincronizarListaDesdeFirestore`.

Actualmente es `["Elegida", "Compra pendiente", "Compra lista"]`. Pasa a `["Elegida", "Compra pendiente", "Compra lista", "Cocinando"]`.

**Razón:** un plan-menú con un componente cocinado y otro pendiente sigue contribuyendo ingredientes a la lista de compras de la semana hasta que se cierre completo.

### `src/screens/Home.tsx`

**Renderizar el botón "Cocinar" en cada card de plan según estado:**

- `estado === "Compra lista"` o `estado === "Cocinando"`:
  - Botón primary "Cocinar" (texto "Continuar cocinando" si ya está en estado "Cocinando").
  - Botón secondary "Marcar Cocinada" (chip gris al lado, más chico). Esto reemplaza el "Marcar Cocinada" actual con un atajo del flujo nuevo.
- `estado === "Cocinada"`:
  - (lo que ya tenga, igual.)
- `estado === "Compra pendiente"`:
  - "Cocinar" deshabilitado o no visible — no se cocina hasta que compre.

**Para plan-menú en `"Cocinando"`:** mostrar progreso "N/M cocinados" debajo del nombre.

**Click en "Cocinar":**

- Si `plan.tipoSeleccion === "receta"`: navegar a `Cocinar.tsx` con `sessionKey: plan:${idPlan}:${idReceta}`, `modo: "plan"`.
- Si `plan.tipoSeleccion === "menu"`: navegar a `SeleccionarComponenteMenu.tsx` con `idPlan`.

**Click en "Marcar Cocinada":**

- Llama a `marcarCocinada(idPlan)` directo, sin pantalla intermedia. Atajo.
- Para plan-menú: marca el plan entero como "Cocinada" sin importar componentes (es el caso "ya cociné todo a ojo sin usar la app"). Esto sobrescribe `componentesCocinados` con un array vacío y pone `estado: "Cocinada"` — JP entiende que está usando el atajo.

### `src/screens/DetalleReceta.tsx`

**Agregar botón "Cocinar"** en el header de acciones. Click → `Cocinar.tsx` con `sessionKey: libre:${idReceta}`, `modo: "libre"`.

**Fix paralelo (acordado con JP):** Mostrar también el campo `errorComun` ("Riesgo: ...") en cada paso, no solo `puntoClave` ("Clave: ..."). Hoy se ve solo Clave. Layout: Clave en verde-claro, Riesgo en amarillo-claro, debajo del detalle.

**Si la receta tiene `riesgos` (campo de la receta, no del paso):** mostrar arriba como warning destacado, después del header.

## Security Rules

No cambios. Los writes a `/planes/{id}` (incluyendo el nuevo campo `componentesCocinados` y el nuevo estado `"Cocinando"`) están cubiertos por las rules existentes.

## Diagnóstico requerido ANTES de empezar a codear

Igual que en E3.4.3, **NO empieces a implementar sin antes hacer estas verificaciones**:

1. **Mostrar la estructura literal** del array `pasos[]` de tres recetas distintas (REC-0001, REC-0301, REC-0801) en Firestore, copy-paste de los campos del primer paso de cada una. Confirmar que los nombres son: `nroPaso`, `titulo`, `detalle`, `tiempoEstimadoLabel`, `tiempoEstimadoMin`, `puntoClave`, `errorComun`, `notas`.

2. **Mostrar dos planes activos** de Home (cualquiera de los que JP ve hoy en producción) con sus shapes literales, incluyendo `estado` y `tipoSeleccion`. Confirmar que no hay campos viejos arrastrando del modelo pre-v1.4.

3. **Confirmar visualmente** que en Detalle de Receta los pasos hoy muestran "Clave:" pero NO "Riesgo:". Si ya muestran ambos, el fix paralelo no hace falta.

Reportá los 3 puntos en una primera respuesta antes de codear.

## Criterios de aceptación

NO basta con reportar ✅. JP va a verificar personalmente en Firebase Console + en la app. **El reporte de cierre debe incluir capturas o copy-paste del shape real** (igual que en E3.4.3, no `[object Object]` ni resúmenes interpretados).

### A — Estado del modelo

1. Abrir Firebase Console → `/planes/PLAN-ALGUNO-EN-COCINANDO` (después de testear) → confirmar que el doc tiene `estado: "Cocinando"` (string, no objeto) y `componentesCocinados: [...]` (array de strings con `idReceta`).

2. Confirmar que existe la función `marcarComponenteCocinado` en `src/data/planes.ts` y se exporta. (Code provee snippet.)

### B — Plan-receta

3. Crear un plan tipo receta (REC-0001 o similar), llevarlo a "Compra lista" (sincronizando lista). Botón "Cocinar" debe aparecer en Home.

4. Click en "Cocinar" → abre pantalla de cocinar en modo guiada, paso 1. Banner de riesgo general visible solo en paso 1.

5. Recorrer los 7 pasos pulsando "Siguiente". Al pulsar "Siguiente" en el último paso → plan en Firebase Console tiene `estado: "Cocinada"`. localStorage de la sesión está vacío.

6. Toggle a "ver todos" en el paso 3 → confirmar que pasos 1 y 2 aparecen tachados visualmente, paso 3 destacado como actual. Tachar manualmente paso 5 desde scroll. Toggle de vuelta a guiada → debe abrir en paso 4 (siguiente no tachado).

### C — Plan-menú

7. Crear un plan tipo menú (MENU-0001 "Español de mar", 3 componentes — 2 obligatorios, 1 opcional). Llevarlo a "Compra lista".

8. Click en "Cocinar" → abre `SeleccionarComponenteMenu`. Lista los 3 componentes con sus estados.

9. Cocinar componente 1 (Langostinos al ajillo, obligatorio). Volver. Confirmar:
   - En Firebase Console: `plan.estado === "Cocinando"`, `plan.componentesCocinados === ["REC-0101"]`.
   - En la pantalla intermedia: componente 1 tachado, componente 2 disponible.
   - En Home: el plan muestra "1/2 cocinados".

10. Cocinar componente 2 (Zarzuela, obligatorio). Confirmar:
    - `plan.estado === "Cocinada"`.
    - `plan.componentesCocinados === ["REC-0101", "REC-0102"]`.
    - Pantalla intermedia muestra "✓ Menú completo cocinado".
    - Componente opcional ("Arroz aparte") sigue sin tachar — eso está bien.

### D — Lista de compras durante "Cocinando"

11. Con un plan-menú en estado "Cocinando", abrir la lista de compras de la semana. **Los items del plan deben seguir ahí** (el estado intermedio sigue contribuyendo). Si la lista pierde los items, está mal y hay que arreglar el filtro de planes contribuyentes.

### E — Modo libre

12. Desde detalle de receta cualquiera, botón "Cocinar". Pasar por todos los pasos. Al llegar al final: NO debe crearse ningún doc en `/planes`. Verificar en Firebase Console que la collection no tiene un plan nuevo.

### F — Marcar Cocinada (atajo secundario)

13. Crear un plan-receta, llevarlo a "Compra lista". Click en "Marcar Cocinada" (secondary, gris, al lado de "Cocinar"). Confirmar:
    - `plan.estado === "Cocinada"` directo.
    - localStorage no se afecta (no había sesión).

14. Mismo flujo para plan-menú. Confirmar que `plan.estado === "Cocinada"` y `componentesCocinados === []` (vacío, porque es atajo).

### G — Timer manual

15. Iniciar timer en un paso con `tiempoEstimadoMin: 10`. Cerrar la pestaña del navegador antes de 10 min. Reabrir la app. Volver a la pantalla de cocinar de esa receta (mismo `sessionKey`). El timer debe seguir corriendo desde el `Date.now()` original guardado en localStorage.

### H — Detalle de receta (fix paralelo)

16. Abrir DetalleReceta de REC-0001. Confirmar que cada paso muestra Clave (verde) Y Riesgo (amarillo), si el campo `errorComun` no está vacío. Hoy solo se ve Clave.

17. Si la receta tiene `riesgos` (campo a nivel receta, no paso), debe verse arriba de los pasos como warning destacado.

## Patrón a respetar (lección de E3.4)

Para campos opcionales en escrituras a Firestore, usar **spread condicional**:

```typescript
const update = {
  estado: nuevoEstado,
  ...(componentesNuevos.length > 0 ? { componentesCocinados: componentesNuevos } : {}),
};
```

NO usar `?? null`. Los campos vacíos NO existen en el doc, no se setean a null.

## Lo que NO está en esta etapa

- **`datosCocinero`**: va a E3.6 (votar).
- **Sync de progreso cross-device**: no soportado. localStorage es single-device.
- **Sugerencias de orden de cocinado** para plan-menú: el usuario elige libremente.
- **Edición de pasos en runtime**: no.

## Convención de commits

- Código: `Stage 3.5: cocinar screen + planes-menu state`
- Doc: `Docs: MAPEO v1.5 (cocinar)`

## MAPEO_FIRESTORE.md — actualizaciones

Bump a v1.5. Agregar §1.2.quinquies con changelog. Actualizar §2.4 (Plan) con el nuevo estado y campo. Documentar regla del array `ESTADOS_CONTRIBUYENTES` en §3.1.6.
