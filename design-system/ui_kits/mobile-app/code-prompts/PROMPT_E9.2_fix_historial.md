# PROMPT E9.2 — Fix regresión: restaurar el Historial avanzado

> **Fix de regresión.** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **Correr PRIMERO del resto del Lote 9** (restaura funcionalidad rota, antes del matcher E9.3).
> **MAPEO vigente esperado:** v2.0.1 (lo dejó E9.1 — importador con vocabulario canónico).
> Verificá el header y reportá. **Al terminar: commit + push.**
>
> Numeración: E9.0, E9.0.1 y E9.1 ya están tomados (proteínas/dieta/diccionario y prompt del
> importador). Este fix es **E9.2**.

## Diagnóstico (auditoría de git desde el diseño)

La pantalla de **Historial** se rompió: hoy `src/routes/Historial.tsx` renderiza una **lista
plana** (con un `ResultadoBadge` local, buscador y `<div className="card">` por entrada) y **no
usa** ninguno de los componentes ricos que existen en el repo:

- `src/components/historial/SummaryMetrics.tsx` — 3 cards Total / Promedio / Top.
- `src/components/historial/FilterChips.tsx` — chips Todos / ★ Top / Para repetir / No repetir
  (`FiltroId = "todos" | "top" | "ok" | "mal"`).
- `src/components/historial/MonthGroup.tsx` — agrupación por mes con header sticky.
- `src/components/historial/HistorialCard.tsx` — card con bloque de fecha + estrellas + badge +
  nota `queSalioBien`.
- `src/components/historial/Stars.tsx`, `EmptyState.tsx`, `tones.ts`.
- Helpers `formatFechaCorta` / `formatMesAnio` en `src/lib/fechaHistorial.ts`.

Esos componentes están **huérfanos** (solo se referencian entre sí: `MonthGroup`→`HistorialCard`).
El route quedó simplificado y perdió: métricas resumen, filtros, agrupación por mes, cards con
fecha/estrellas y estados vacíos contextuales.

**Cuándo pasó:** el route fue reescrito en el commit
`11ff3df0 "feat: skeleton loaders en todas las rutas + Historial con tarjetas clickeables"`
(rama `feat/e9-proteinas-y-diccionario`, justo después de E9.0). Ese commit mezcló dos cosas
(skeletons globales + reescritura del Historial) y dejó la versión avanzada sin cablear.

**Confirmá el punto exacto con git antes de tocar** (vos tenés git; el diseño audita desde un
snapshot):
```
git log --oneline -- src/routes/Historial.tsx
git log --oneline -- src/components/historial/
git show 11ff3df0 -- src/routes/Historial.tsx
```
Si la versión avanzada existió antes en `Historial.tsx`, tomala de referencia con
`git show <commit-previo>:src/routes/Historial.tsx`. Si nunca estuvo cableada (los componentes
entraron sin uso), igual cableala como abajo.

## Fix — reescribir `src/routes/Historial.tsx` usando los componentes existentes

**No recrear componentes**: importá los que ya están. La estructura objetivo:

1. **Carga**: `getHistorialReciente()` (Result) en `useEffect`. Mientras carga, mantené el
   skeleton (`SkeletonList` — esa parte del commit estaba bien). Error → card con mensaje.
2. **`<SummaryMetrics entries={entries} />`** arriba (sobre el total cargado, no el filtrado).
3. **Buscador** (mantener el input actual) + **`<FilterChips activo={filtro} onChange={setFiltro} />`**.
4. **Filtrado** sobre `entries`:
   - búsqueda: `normalizeText(nombreSeleccion | receta).includes(normalizeText(q))`.
   - filtro chip:
     - `todos` → todas;
     - `top` → `resultado === "Excelente" || resultado === "Muy bueno"`;
     - `ok` → `repetir === "Sí"`;
     - `mal` → `repetir === "No"`.
     (`repetir` puede faltar en entradas viejas → simplemente no matchea ok/mal.)
5. **Agrupar por mes**: clave `YYYY-MM` tomada de `fechaRealizada` (ISO `YYYY-MM-DD`), preservando
   el orden desc que ya trae la query. Render un **`<MonthGroup mesKey entries onClickEntry />`**
   por grupo. `onClickEntry={(e) => navigate(\`/historial/${e.idHist}\`)}`.
6. **Estados vacíos** con `<EmptyState context=... />`:
   - sin entradas → `"sin-entries"`;
   - hay entradas pero la búsqueda no matchea → `"sin-matches-busqueda"`;
   - hay entradas pero el filtro no matchea → `"sin-matches-filtro"`.
7. **Eliminar** el `ResultadoBadge` local del route (la card lo dibuja sola con `tones.ts`). Si
   no queda otro uso, no dejar el componente muerto en el archivo.

## Verificación de alcance (que no haya más daño del mismo commit)
`11ff3df0` decía "skeletons en todas las rutas". Confirmá que **solo** el Historial perdió
lógica: abrí Home, Biblioteca, Compras, Cocinar, Catálogo y verificá que renderizan su contenido
real (no quedaron simplificadas). Reportá si alguna otra ruta quedó tocada.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch: v2.0.1 → **v2.0.2**. Reportá versión.
2. Subsección `### 1.2.E9.2 Cambios en v2.0.2 (E9.2 — fix regresión Historial)`: qué se había
   roto (route plano, componentes huérfanos), el commit causante `11ff3df0`, y el re-cableo
   (SummaryMetrics + FilterChips + MonthGroup + HistorialCard + EmptyState).
3. **§11**: asegurá que exista el **Lote 9** (si no está, crealo) y registrá ahí **E9.2 ✅ HECHO
   (v2.0.2)**, junto con E9.0 / E9.0.1 / E9.1 ya hechos. Nota breve de "regresión detectada y
   cerrada".
4. Registrar `**PROMPT_E9.2_fix_historial.md** ✅ CERRADO (v2.0.2)`.

## Criterio de aceptación
1. El Historial muestra: métricas resumen arriba, chips de filtro, y entradas **agrupadas por
   mes** con header sticky, cada una como `HistorialCard` (fecha + estrellas + badge + nota),
   tappable a su detalle.
2. Buscar y cada chip filtran bien; los estados vacíos usan el contexto correcto.
3. No quedan componentes de `src/components/historial/` sin usar.
4. Ninguna otra ruta quedó simplificada por `11ff3df0`.
5. Build + typecheck + tests verdes.
6. Pegá el nuevo `Historial.tsx` (o el diff) y la subsección 1.2.E9.2.

## Fuera de scope
- Filtros por miembro/proteína/fecha y gráfico de evolución (dashboard D.3 completo, §19.1 —
  sigue postergado). Acá solo restauramos lo que ya existía y se rompió.

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E9.2: fix regresión Historial — recablear SummaryMetrics/FilterChips/MonthGroup/HistorialCard (rotos en 11ff3df0) + MAPEO v2.0.2"
git push
```
Confirmá push OK.
