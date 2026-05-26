# PROMPT_E3.7 — Pantalla de historial

## Contexto

Última pieza de la Etapa 3. E3.6 dejó la evaluación de planes funcionando: cada
plan evaluado escribe un doc en `/historial`. Falta la pantalla que muestra ese
historial — hoy no existe.

Con E3.7 cerrada, la Etapa 3 (Home, Biblioteca, Detalle, Compras, Cocinar,
Evaluar, Historial) queda completa.

## Alcance

Pantalla de historial **básica** de Etapa 3. NO es el dashboard avanzado del
MAPEO §9.1 / Etapa 7 (filtros por miembro/proteína, gráficos, comparaciones
miembro-vs-familia). Eso es futuro lejano y NO entra acá.

Lo que E3.7 hace:
- Lista de las últimas 30 entradas de `/historial`, más recientes primero.
- Buscador por nombre (filtra la lista en cliente).
- Cada entrada: nombre, fecha, promedio, resultado.
- Tocar una entrada → pantalla de detalle completo (calificaciones, comentarios,
  datos del cocinero).
- SIN filtros (eso es Etapa 7).
- SIN foto de receta (las recetas no tienen `imagenUrl` cargada; se omite).

De prendón (limpieza, ver abajo): eliminar la función de evaluación muerta de
`planes.ts`.

## Pre-requisito

E3.6 cerrada (evaluación de planes, MAPEO v1.5.4). Los criterios D-G de E3.6
verificados.

## Decisiones de diseño (tomadas en chat con JP — no abrir a debate)

| # | Decisión | Resumen |
|---|---|---|
| 1 | Últimas 30 | Lista de las 30 entradas más recientes, ordenadas por `fechaRealizadaTimestamp` desc. |
| 2 | Buscador por nombre | Input de búsqueda que filtra la lista por `nombreSeleccion` / `receta`. Filtrado client-side sobre las 30 cargadas. |
| 3 | Detalle al tocar | Tocar una entrada abre una pantalla de detalle con todo: calificaciones de los 4, comentarios, datos del cocinero. |
| 4 | Sin filtros | Filtros por resultado/proteína/miembro/fecha NO entran. Son Etapa 7. |
| 5 | Sin foto | No mostrar imagen de receta. `imagenUrl` está vacío en las recetas. Futuro. |

## Modelo de datos — shape REAL del doc de historial

Verificado en Firebase Console sobre docs reales escritos por E3.6. El doc
`/historial/{idHist}` tiene EXACTAMENTE estos campos:

```
idHist: "HIST-20260523235117-3401"     // string, doc ID (HIST-fecha-random)
fechaRealizada: "2026-05-24"           // string ISO date
fechaRealizadaTimestamp: Timestamp     // ← ordenar la lista por este campo, desc
idPlan: "PLAN-20260524-..."
idReceta: "REC-1410" | ""              // "" si tipoSeleccion === "menu"
idMenu: "" | "MENU-0001"               // "" si tipoSeleccion === "receta"
idSeleccion: "REC-1410"
tipoSeleccion: "receta" | "menu"
receta: "Barritas de maní..."          // nombre snapshot
nombreSeleccion: "Barritas de maní..." // nombre snapshot (puede coincidir con receta)
semanaInicio: "2026-05-18"
ocasion: "Cena familiar"
calificaciones: { juanpablo: 8, maria: null, sofia: null, federico: null }
comentarios: { juanpablo: "ok", maria: "", sofia: "", federico: "" }
promedio: 8                            // number
resultado: "Muy bueno"                 // string (Excelente/Muy bueno/Bueno/Regular/Malísimo)
repetir: "Sí"
costoRealAprox: ""
dificultadReal: "Baja"
queSalioBien: ""
queCambiaria: ""
notasFamiliares: ""
```

**Importante:** programar contra ESTE shape, no contra el del MAPEO §2.6 (que
tiene pequeñas discrepancias — ej. el MAPEO dice `idHist: "auto-id"` pero el real
es `HIST-fecha-random`). El shape de arriba es la fuente de verdad.

Nota sobre datos actuales: como E3.6 evalúa solo JP, `calificaciones` tiene a JP
con valor y los otros 3 en `null`; `comentarios` igual. La pantalla de detalle
debe manejar miembros sin voto con elegancia (ver edge cases).

## Diagnóstico requerido ANTES de codear

(Patrón establecido desde E3.4.3.)

1. **Confirmar el shape real.** Abrir 1 doc de `/historial` en Firebase Console y
   pegar su lista de campos. Confirmar que coincide con el shape de arriba. Si
   algún campo difiere en nombre, reportar ANTES de codear.

2. **Módulo de datos de historial.** Reportar si existe `src/data/historial.ts` y
   qué funciones expone. Si no existe, se crea. La query de "últimas 30" necesita
   `orderBy("fechaRealizadaTimestamp", "desc")` + `limit(30)` — confirmar si hace
   falta crear un índice compuesto en Firestore (si es solo orderBy sobre un
   campo, no hace falta índice; reportar).

3. **Ruta y stub de historial.** El MAPEO §5 lista la pantalla `historial`.
   Reportar si la ruta ya existe (`/historial` en el router), si hay un stub, y
   el nombre del archivo de la pantalla.

4. **Pantalla de detalle de receta.** Reportar el nombre del componente de
   detalle de receta existente (de E3.3) y su ruta — para evaluar si el detalle
   de una entrada de historial puede enlazar a él.

5. **Función de evaluación duplicada en `planes.ts`.** Confirmar: en `planes.ts`
   hay dos funciones de evaluación — `guardarEvaluacionJP` (la que usa `Voto.tsx`,
   la correcta) y otra anterior (arranca ~línea 356, hace casi lo mismo pero solo
   maneja plan-receta). Reportar literal: ¿cómo se llama la función vieja, y algún
   archivo la importa/usa? Si NADIE la usa, se elimina (ver limpieza abajo).

Reportar 1-5 en una primera respuesta. JP confirma y después arrancás.

## Cambios al código

### `src/data/historial.ts` — query de historial

Si no existe el módulo, crearlo. Funciones:

```typescript
// Las 30 entradas más recientes, ordenadas por fecha desc.
export async function getHistorialReciente(): Promise<Result<Historial[], AppError>>

// Un doc de historial por su ID (para la pantalla de detalle).
export async function getHistorialPorId(idHist: string): Promise<Result<Historial, AppError>>
```

`getHistorialReciente`: `query(collection(db,"historial"), orderBy("fechaRealizadaTimestamp","desc"), limit(30))`.

### `src/routes/Historial.tsx` — pantalla de lista

- Carga `getHistorialReciente()` al montar.
- **Buscador**: input de texto arriba. Filtra la lista cargada (client-side) por
  coincidencia en `nombreSeleccion` o `receta` (case-insensitive). No re-consulta
  Firestore — filtra las 30 ya cargadas.
- **Lista**: cada entrada muestra `nombreSeleccion`, `fechaRealizada`, `promedio`
  y `resultado`. El `resultado` puede ir con un color/badge según el valor
  (Excelente/Muy bueno/Bueno/Regular/Malísimo) — usar los tokens del design
  system existente (`Styles.html`).
- Tocar una entrada navega a la pantalla de detalle (`/historial/:idHist` o el
  patrón de routing que use el repo).
- Estados: loading (spinner), vacío ("Todavía no hay platos evaluados"), error.

### `src/routes/HistorialDetalle.tsx` — pantalla de detalle

- Carga `getHistorialPorId(idHist)`.
- Muestra: nombre, fecha, ocasión, promedio + resultado destacados.
- **Calificaciones de los 4 miembros**: mostrar cada miembro con su nota. Los
  que tienen `null` (no votaron) se muestran como "Sin voto" o similar — NO como
  0 ni vacío (ver edge case 1).
- **Comentarios**: los que tienen texto. Los `""` se omiten.
- **Datos del cocinero**: `repetir`, `costoRealAprox`, `dificultadReal`,
  `queSalioBien`, `queCambiaria`, `notasFamiliares`. Los campos vacíos se omiten
  (no mostrar labels con valor en blanco).
- Si `tipoSeleccion === "receta"` y `idReceta` no está vacío, ofrecer un link al
  detalle de la receta (la pantalla de E3.3). Para `menu`, link al detalle de
  menú si existe.
- Estados: loading, error, no-encontrado.

### `src/routes/Home.tsx` (o el nav)

Confirmar que hay forma de llegar a la pantalla de historial (link en el nav
inferior, o donde el MAPEO §5 lo ubique). Si la ruta era un stub, conectarla.

## Limpieza — eliminar la función de evaluación muerta

En `planes.ts` hay DOS funciones de evaluación: `guardarEvaluacionJP` (usada por
`Voto.tsx`, correcta) y una anterior duplicada (~línea 356, código muerto).

Si el diagnóstico 5 confirma que NADIE importa/usa la función vieja:
- Eliminarla por completo de `planes.ts`.
- Verificar que el build pasa (`npm run build`) y que los tests no se rompen.
- Si algún test apunta a la función vieja, reportarlo antes de borrar — JP decide.

Si el diagnóstico 5 encuentra que algo SÍ la usa, NO borrar — reportar qué la usa
y esperar instrucción de JP.

## Criterios de aceptación con verificación literal

NO basta con reportar ✅. JP verifica en app + Firebase Console.

### A — Lista de historial

1. Abrir la pantalla de historial. Confirmar que se ven las entradas de
   `/historial` (hoy hay 4 docs reales). Reportar cuántas se ven y en qué orden.
2. Confirmar el orden: la entrada más reciente por `fechaRealizadaTimestamp`
   arriba. Pegar el orden de las fechas tal como se ven.

### B — Buscador

3. Escribir en el buscador parte del nombre de una receta evaluada (ej. "Barritas").
   Confirmar que la lista se filtra a las coincidencias. Borrar el texto → vuelve
   la lista completa.
4. Buscar algo que no existe → lista vacía con mensaje, sin error.

### C — Detalle

5. Tocar una entrada. Confirmar que abre el detalle y muestra: nombre, fecha,
   promedio, resultado, y las calificaciones. Pegar lo que se ve.
6. Confirmar que un miembro con `calificaciones.X === null` se muestra como "Sin
   voto" (o equivalente), NO como 0.
7. Confirmar que los datos del cocinero vacíos (`queSalioBien: ""`, etc.) NO
   aparecen como labels en blanco — se omiten.
8. Si la entrada es de una receta, confirmar que el link al detalle de receta
   funciona.

### D — Estado vacío

9. (Si es testeable) Confirmar el mensaje de estado vacío. Si no se puede vaciar
   `/historial`, reportar que el código contempla el caso y mostrar dónde.

### E — Limpieza de planes.ts

10. Confirmar que la función de evaluación vieja fue eliminada (o, si algo la
    usaba, reportar qué). Confirmar que `npm run build` pasa y que `Voto.tsx`
    sigue evaluando planes correctamente (evaluar un plan de prueba post-limpieza).

## Edge cases a documentar en código

1. **Miembros sin voto**: en E3.6 vota solo JP; los otros 3 quedan `null` en
   `calificaciones`. El detalle muestra "Sin voto" para esos. Cuando E4.2 traiga
   los 4 votos, los `null` desaparecerán solos. NO tratar `null` como 0.

2. **`promedio` con un voto**: hoy `promedio` = nota de JP. La pantalla lo muestra
   tal cual. No recalcular nada en E3.7 — el promedio ya viene calculado en el doc.

3. **Historial con menos de 30 docs**: la query con `limit(30)` devuelve lo que
   haya. Hoy hay 4. La lista muestra 4. Correcto.

4. **`idReceta` vacío en entrada de menú**: si `tipoSeleccion === "menu"`,
   `idReceta` es `""`. El link "ver receta" no debe romper — usar `idMenu` para
   menús, o no mostrar link.

5. **Búsqueda case/acentos**: el buscador debe ser case-insensitive. Acentos:
   seguir el criterio del repo (si hay `normalizeText`, usarlo).

## Patrón a respetar

Igual que E3.4.x / E3.5.1 / E3.6: spread condicional para campos opcionales en
escrituras; sin `undefined` ni `?? null`.

## Cambios al MAPEO_FIRESTORE.md

Bump del MAPEO (número correlativo — si E3.6 cerró como v1.5.4, este es v1.5.5).

- **§2.6** (Historial): corregir el shape — `idHist` es `HIST-fecha-random`
  (generado por `proximoIdHistorial`), NO `"auto-id"`. Alinear el shape
  documentado con el shape real verificado en consola.
- **§5** (mapping pantallas): documentar la pantalla de historial y su detalle.
- Marcar la pantalla `historial` como implementada.
- Anotar la eliminación de la función de evaluación duplicada en `planes.ts`.
- Changelog de la versión.
- Si con E3.7 se da por cerrada la Etapa 3, anotarlo.

## Convención de commits

- Código: `Stage 3.7: history screen + detail`
- Limpieza: puede ir en el mismo commit o en `Refactor: remove dead evaluation function`
- Doc: `Docs: MAPEO v1.5.5 (history screen)` (ajustar número según corresponda)
