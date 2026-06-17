# PROMPT E9.10 — Historial: tarjetas de resumen como filtros (sin fila de chips)

> **Etapa 9 — Lote 9.** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** v2.2.1 (o v2.2.2 si ya corriste E9.9). Verificá el header y reportá.
> **Al terminar: commit + push (git == local).**

## Diagnóstico (auditoría diseño ↔ repo)

En el repo, la pantalla de **Historial** (`src/routes/Historial.tsx` + componentes en
`src/components/historial/`) tiene:
- **`SummaryMetrics`** con 3 tarjetas **estáticas**: Total / **Promedio** / Top (solo muestran números).
- **`FilterChips`** como **fila aparte** (Todos / ★ Top / Para repetir / No repetir).

El diseño aprobado (prototipo del kit, `HistorialScreen.jsx`) cambió esto:
- **Las 3 tarjetas SON el filtro** (no hay fila de chips). Tocar una filtra y la deja activa.
- La tarjeta del medio es **Máximo** (la nota más alta), no Promedio.

## Cambios de código

### 1. `SummaryMetrics.tsx` — tarjetas interactivas + Máximo
- Recibir props nuevas: `activo: FiltroId` y `onSelect: (f: FiltroId) => void`.
- Cada `MetricCard` pasa a ser un `<button>` (no `<div>`), con:
  - **Estado activo**: `background: var(--primary-soft)`, `border: 2px solid var(--primary)`,
    label en `var(--primary)`. Inactivo: como hoy (`surface-strong` + `border-subtle`).
  - **Mapeo tarjeta → filtro**: `Total → "todos"`, `Máximo → "ok"` (Para repetir), `Top → "top"`.
  - **Toggle-back**: si tocás la tarjeta cuyo filtro ya está activo, vuelve a `"todos"`.
- **Métrica del medio: Promedio → Máximo.** Label "Máximo"; valor = `Math.max(...entries.map(e => e.promedio))`
  (o `"—"` si no hay entradas); mantener las `<Stars value={maximo} scale={10} />` debajo.
- Mantener Total (`entries.length`, "platos") y Top (`Excelente`+`Muy bueno`, "★ excelentes").

### 2. `Historial.tsx` — sacar la fila de chips, cablear las tarjetas
- **Eliminar** el render de `<FilterChips … />` y su `<div>` contenedor. (El componente
  `FilterChips.tsx` queda sin uso → borrarlo, o dejarlo si se prefiere, pero no renderizarlo.)
- Pasar el estado a las tarjetas: `<SummaryMetrics entries={entries} activo={filtro} onSelect={setFiltro} />`.
- El buscador y la agrupación por mes quedan igual.

### 3. Lógica de filtros (mantener la del repo — es la correcta)
Conservar el `FILTROS` actual basado en el **campo `repetir`** (la respuesta explícita de la familia):
```ts
const FILTROS = {
  todos: () => true,
  ok:    (e) => e.repetir === "Sí",     // ← "Para repetir" (tarjeta Máximo)
  top:   (e) => e.resultado === "Excelente" || e.resultado === "Muy bueno",
  // 'mal' (No repetir) queda en el map pero ya no se dispara desde la UI (ver nota).
};
```

### Nota de alcance — se pierde "No repetir"
Con las tarjetas como único filtro (Total/Máximo/Top), **deja de existir el filtro "No repetir"**
en la UI (era un chip). Es **intencional** (decisión de diseño: priorizar las 3 métricas como
filtros). Si más adelante se quiere recuperar, se suma una 4ª tarjeta o se reintroduce ese chip.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch. Reportá versión.
2. Subsección `### 1.2.E9.10 Cambios en vX.Y.Z (E9.10 — Historial: tarjetas-filtro, sin chips)`:
   tarjetas interactivas (Total→todos, Máximo→ok, Top→top, toggle-back, estado activo), métrica
   del medio Promedio→Máximo, se quitó `FilterChips` del Historial, lógica `repetir`-based
   conservada, "No repetir" deja de tener UI (intencional).
3. En §11 Lote 9, marcar **E9.10 ✅ HECHO (vX.Y.Z)**.
4. Registrar `**PROMPT_E9.10_historial_tarjetas_filtro.md** ✅ CERRADO (vX.Y.Z)`.

## Criterio de aceptación
1. En Historial no hay fila de chips; están solo las 3 tarjetas Total / **Máximo** / Top.
2. Tocar **Top** filtra a Excelente/Muy bueno y la tarjeta queda activa (borde primary);
   tocarla de nuevo vuelve a Todos. Ídem **Máximo** → Para repetir (`repetir==="Sí"`), **Total** → Todos.
3. Solo una tarjeta activa a la vez; el estado activo es claramente visible en light y dark.
4. La métrica del medio muestra la **nota máxima** con estrellas.
5. Build + typecheck + tests verdes. Pegá el diff de `SummaryMetrics.tsx` + `Historial.tsx` y la
   subsección 1.2.E9.10.

## Cierre
```
git add -A
git commit -m "E9.10: Historial — tarjetas de resumen como filtros (Total/Máximo/Top), saca fila de chips + MAPEO"
git push
```
Confirmá push OK.
