# PROMPT E14.5 — Consolidar Compras: turno voluntario + histórico + UN solo camino

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> **A implementar ahora.** Numerar al próximo libre si `E14.5` ya existe.
>
> **Por qué este prompt:** auditoría del 7-jun-2026. En el repo quedaron aplicados E14.1, E14.2 y
> E14.3, pero **`PROMPT_E14.4_compras_turno_voluntario_contador.md` nunca se ejecutó**. Resultado:
> (a) **no hay histórico ni contador** de quién se ocupa de las compras, y (b) **dos caminos/dos
> nociones de "encargado" solapadas** confunden el flujo. Este prompt hace las dos cosas de una
> sola pasada: **implementa E14.4** y **limpia la redundancia**.
>
> **Referencia:** `docs/prompts/PROMPT_E14.4_compras_turno_voluntario_contador.md` tiene el detalle
> de modelo de datos y funciones (turno voluntario, contador, histórico). Seguilo como fuente para
> la PARTE A. Esta E14.5 lo engloba y agrega la PARTE B (limpieza) y la PARTE C (histórico UI).

---

## Estado actual verificado (punto de partida)

- `src/data/comprasRapidas.ts`: `generarInstanciaCompraRapida(plantilla, **asignados**, items)` —
  modelo **viejo de asignar**. `marcarCompraRapidaHecha(idPlan)` **solo cambia estado, no cuenta**.
- `src/data/compras.ts`: `asignarEncargadoCompras()` + `encargadoCompras` en `compras/{idLista}` —
  **encargado sobre la lista agregada** (E14.1). Es la noción "vieja" que vamos a retirar.
- `Plan` **no** tiene campo `encargado`. **No existe** `config/comprasContador` ni `comprasContador.ts`.
- 4 entradas a `/compras/armar`: `Biblioteca.tsx:403`, `Compras.tsx:209`, `Home.tsx:351`,
  `MemberDashboard.tsx:353`.

---

## PARTE A — Turno voluntario + contador (ejecutar E14.4)

Aplicar íntegro `PROMPT_E14.4_compras_turno_voluntario_contador.md`. Resumen de lo que debe quedar:

1. **Modelo** (`src/types/models.ts`):
   - `Plan.encargado?: MiembroId | null` (null = sin encargado).
   - `interface ComprasContador { meses: Record<string, Partial<Record<MiembroId, number>>> }`
     (clave `"YYYY-MM"`).
2. **`generarInstanciaCompraRapida(plantilla, itemsSeleccionados)`** — se va el parámetro
   `asignados`. La instancia **nace sin encargado** (`encargado: null`, `asignaciones: []`).
3. **`tomarCompraRapida(idPlan, memberId)`** con `runTransaction` (guardia anti-doble-claim) y
   **`liberarCompraRapida(idPlan)`**.
4. **`marcarCompraRapidaHecha(idPlan, completadaPor)`** — batch atómico: `estado:"Compra lista"`
   **+** `config/comprasContador` `meses[mesActual][completadaPor] += 1` (con `increment(1)`).
5. **`src/data/comprasContador.ts`** (nuevo): `subscribeContador`, `mesActualKey`, `resumenPorMes`.
6. **Visibilidad**: la instancia activa de compra rápida la ven **los 4** (no filtrar por
   `asignaciones`).
7. **Reglas**: `match /config/comprasContador { allow read, write: if isFamilyMember(); }` + deploy.

---

## PARTE B — UN solo camino (limpieza de redundancia)

> Objetivo: que "armar la compra" tenga **un único punto de armado** y **una sola** noción de
> encargado (la nueva, por turno voluntario). El usuario describió el flujo así: *se genera una
> lista (la arman Juan o María), le aparece a los cuatro, alguien toca "Yo me encargo", la hace y
> desaparece, y queda el contador por mes.*

### B1. Retirar el "encargado" viejo de la lista agregada
En `src/routes/Compras.tsx` y `src/data/compras.ts`:
- **Quitar** el selector de `encargadoCompras` (el bloque "Encargado de compras — selector JP" y el
  "estado y acción (no-JP)" con `handleAsignarEncargado`) y el banner asociado.
- **Quitar** `asignarEncargadoCompras()` de `compras.ts` y el campo `encargadoCompras` de
  `ListaCompras` (dejar el campo como deprecado/ignorado si hay datos viejos, pero sin UI).
- La página `/compras` queda como **vista de la lista agregada** (ítems por góndola + progreso),
  sin encargado. El "encargado" ahora vive solo en la **compra rápida** (turno voluntario).

> Nota: si la "lista agregada de recetas" y la "compra rápida" deben unificarse del todo es una
> decisión de producto más grande — **no** la tomamos acá. Acá solo sacamos el encargado duplicado.
> La compra rápida es el objeto que tiene turno voluntario + contador.

### B2. Un único acceso a "Armar la compra"
Dejar **un solo** punto de armado primario y quitar los duplicados:
- **MANTENER** el botón "Armar la compra" en **`/compras`** (`Compras.tsx`) — es el lugar natural,
  está en el menú inferior de los 4 y lo ve JP y María (`puedeGestionarCompras`).
- **MANTENER** el atajo "+ Armar" del **dashboard** (`MemberDashboard.tsx`) — es un acceso rápido
  contextual, no una segunda pantalla; ok que conviva.
- **QUITAR** el CTA "Armar la compra (modos A / B / C)" de **Biblioteca** (`Biblioteca.tsx:403`).
  La pestaña Compras de Biblioteca queda **solo para gestionar plantillas maestras** (crear/editar
  las 3), no para generar la lista de la semana. Si querés, dejá ahí un texto chico: *"Para armar
  la compra de la semana, andá a Compras."*
- **QUITAR** o redirigir el botón "+ Armar" de **`Home.tsx:351`** si duplica (Home es de JP; si JP
  ya tiene el acceso desde `/compras`, este es redundante — evaluar y dejar uno solo).

### B3. Quitar la UI de "asignar a varios" del armado
En `src/routes/CompraRapidaArmar.tsx`: como la instancia ahora **nace sin encargado**, **quitar**
el multi-select de `asignados` (`useState<MiembroId[]>([selfId])`) y el paso de asignación.
Reemplazar por un texto: *"La verán los 4 y alguien se encarga."* La llamada pasa a
`generarInstanciaCompraRapida(plantilla, itemsSeleccionados)`.

---

## PARTE C — Histórico + contador (UI)

Pantalla "Quién se ocupó" usando `subscribeContador` + `resumenPorMes` (PARTE A). Ubicación
sugerida: **en `/compras`, debajo de la lista** (o como sección en el dashboard). Replicar el
prototipo aprobado `Compras — turno voluntario.html`:
- **"Quién se ocupó · {mes actual}"** — ranking de los 4 con barras y 🥇 al/los líderes
  (mes = `mesActualKey()`; si no hay clave, todos en 0).
- **"Histórico por mes"** — el resto de las claves `YYYY-MM` en orden descendente; cada mes con su
  total y un chip por miembro con su conteo y 🥇 al ganador.
- Visible para **los 4** (es info de la familia). El cambio de mes es **automático** por la clave de
  fecha — sin botón de "cerrar mes".

La **card de la compra activa** (en la principal de los 4) con sus 3 estados — *sin encargado /
la hago yo / la hace otro* — está descrita en E14.4 PARTE 4a. Implementarla tal cual (botón
"Yo me encargo", checklist + "Marcar compra lista", "Ya no puedo" / "La hago yo").

---

## Cierre
1. **MAPEO_FIRESTORE.md**: documentar `Plan.encargado`, `config/comprasContador`
   (`meses["YYYY-MM"][miembroId]=n`), nuevas funciones; marcar `encargadoCompras`/`asignarEncargadoCompras`
   como **retirados**; firma nueva de `generar`/`marcar...Hecha`. Bump de versión.
2. **Tests**: ajustar llamadas a `generarInstanciaCompraRapida` (sacar `asignados`) y a
   `marcarCompraRapidaHecha` (agregar `completadaPor`). Agregar: `tomarCompraRapida` setea encargado
   y rechaza doble-claim; `marcarCompraRapidaHecha` suma +1 en `config/comprasContador` (mes actual);
   `resumenPorMes` separa mes actual vs histórico.
3. `firebase deploy --only firestore:rules`. Luego `npm test` verde y `npm run build` ok.
4. Pegar diff de: `models.ts`, `comprasRapidas.ts`, `comprasContador.ts` (nuevo), `compras.ts`,
   `Compras.tsx`, `CompraRapidaArmar.tsx`, `Biblioteca.tsx`, `Home.tsx`, `MemberDashboard.tsx`,
   `firestore.rules`.

```
git commit -m "E14.5: consolida compras — turno voluntario + contador/histórico mensual y un solo camino de armado (retira encargadoCompras viejo)"
```

## Criterios de aceptación
1. **Un solo armado**: "Armar la compra" se llega desde `/compras` (+ atajo del dashboard). Ya **no**
   está el CTA en Biblioteca (esa pestaña solo gestiona plantillas).
2. **Una sola noción de encargado**: no queda el selector `encargadoCompras` en `/compras`; el
   encargado existe únicamente como **turno voluntario** sobre la compra rápida.
3. **Ciclo completo**: Juan o María generan → la ven **los 4** ("sin encargado") → cualquiera toca
   **"Yo me encargo"** → la completa → **desaparece para todos** → **+1** al contador del mes.
4. **Doble-claim** rechazado con mensaje; "Ya no puedo" libera; "La hago yo" transfiere.
5. **Histórico visible**: "Quién se ocupó · {mes}" + "Histórico por mes" con ganador por mes, en
   realtime, para los 4. Cambio de mes automático.
6. Sin regresiones: Sofía/Federico pueden encargarse y completar; generar sigue siendo de Juan/María;
   la lista agregada de `/compras` sigue mostrando ítems por góndola y progreso.
```
