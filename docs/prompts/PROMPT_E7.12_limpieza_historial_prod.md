# PROMPT_E7.12 — Limpieza de historial de prueba + seed entrada legacy (pre-producción)

## Contexto

Vamos a poner la app en producción (`comida-familiar.web.app`). El `/historial`
actual está poblado **solo con datos de prueba** escritos durante E3.6/E3.7 y
sesiones posteriores de testing. Antes de abrir a la familia hay que:

1. Borrar las entradas de prueba de `/historial`.
2. Cargar **una** entrada real que viene del sistema anterior (una cena ya
   cocinada y evaluada el 15/05/2026), para que el historial arranque con un
   registro legítimo.

Esto es una tarea de datos/ops, no de UI. No se toca ninguna pantalla.

> **IMPORTANTE — gate de confirmación.** Este prompt borra datos. Code hace
> **primero** el diagnóstico (F1) y **espera el "procedé" de JP** antes de
> ejecutar F2 (borrado) y F3 (seed). No borrar nada en la misma pasada del
> diagnóstico.

## Alcance

- **Entra:** diagnóstico de `/historial`, backup, borrado de entradas de prueba,
  inserción de 1 doc real en `/historial`, y (si corresponde) actualización de
  stats de la receta `REC-0505`.
- **No entra:** cambios de UI, cambios al data layer (`historial.ts` es
  read-only y se queda como está), reglas de Firestore, ni limpieza de otras
  colecciones (`planes`, `compras`). Si Code detecta residuo en esas colecciones,
  lo **reporta** pero no lo toca acá.

## Pre-requisito

- E7.11 (fix importador) en el estado en que esté; no depende de esto.
- Acceso de escritura admin a Firestore (ver D1).

## Shape de referencia — doc de `/historial/{idHist}`

Fuente de verdad verificada contra docs reales de E3.6 (el MAPEO §2.6 tiene
discrepancias menores; **programar contra este shape**, no contra el MAPEO):

```
idHist: "HIST-<fecha>-<random>"          // string, doc ID; formato de proximoIdHistorial()
fechaRealizada: "2026-05-15"             // string ISO date
fechaRealizadaTimestamp: Timestamp       // ← la lista ordena por este campo, desc
idPlan: string                           // "" si es legacy sin plan
idReceta: "REC-0505" | ""                // "" si tipoSeleccion === "menu"
idMenu: "" | "MENU-xxxx"                 // "" si tipoSeleccion === "receta"
idSeleccion: string
tipoSeleccion: "receta" | "menu"
receta: string                           // nombre snapshot
nombreSeleccion: string                  // nombre snapshot
semanaInicio: "2026-05-11"               // lunes de la semana (ISO date)
ocasion: Ocasion | ""
calificaciones: { juanpablo, maria, sofia, federico }   // number | null por miembro
comentarios:    { juanpablo, maria, sofia, federico }   // string por miembro
promedio: number                         // sobre votos NO nulos, redondeado a 1 decimal
resultado: "Excelente" | "Muy bueno" | "Bueno" | "Regular" | "Malísimo" | ""
repetir: "" | "Sí" | "No"
costoRealAprox: string
dificultadReal: "" | Dificultad
queSalioBien: string
queCambiaria: string
notasFamiliares: string
```

Umbrales de `resultado` (MAPEO §3.4): `≥9` Excelente · `≥7.5` Muy bueno ·
`≥6` Bueno · `≥4` Regular · `<4` Malísimo.

---

## F1 — Diagnóstico requerido ANTES de tocar nada

Code reporta lo siguiente y **espera confirmación**. No ejecuta F2/F3 hasta el
"procedé".

- **D1 — Camino de escritura admin.** ¿Cómo autentican los scripts de seed/reseed
  existentes (los que hicieron el reseed de E3.4.x)? ¿Usan `firebase-admin` +
  service account? ¿Dónde está el entrypoint y el `.json`/credencial (sin
  pegarla acá)? Esta tarea debe correr por el **mismo camino** (admin SDK bypassea
  las reglas de Firestore — es lo correcto para una maintenance task). Si no hay
  infra admin, reportar y proponer alternativa antes de seguir.

- **D2 — Contenido actual de `/historial`.** Listar TODOS los docs con:
  `idHist`, `fechaRealizada`, `receta`/`nombreSeleccion`, `idReceta`,
  `tipoSeleccion`, `promedio`. Confirmar que **todos** son de prueba y reportar el
  total. Si hay alguno que parezca real (que no sea testing), marcarlo —
  ese **no** se borra.

- **D3 — ¿Existe `/recetas/REC-0505`?**
  - Si **existe**: reportar su `nombre`, `vecesCocinada`, `ultimaEvaluacion`,
    `ultimoPuntaje`. El doc de historial debe snapshotear el **nombre del
    catálogo** (consistencia), no el título largo de abajo.
  - Si **no existe**: reportar. Decidimos si insertamos igual con `idReceta`
    apuntando a un doc inexistente (la pantalla de detalle dejaría el link a
    receta "roto") o si primero hay que crear/mapear la receta. No insertar a
    ciegas.

- **D4 — Enums.** Pegar de `src/types/models.ts` los valores válidos de
  `Dificultad` y `Ocasion`. Necesito mapear:
  - `dificultadReal`: el dato viejo dice **"Normal"** → valor de enum más cercano
    (probablemente `"Media"`). Confirmar.
  - `ocasion`: el dato viejo dice **"Cena especial viernes"** → ver si es un valor
    válido o hay que mapearlo (p.ej. `"Cena familiar"`) o si el campo tolera string
    libre. Confirmar.

- **D5 — `proximoIdHistorial()`.** Ubicación y firma. Reusar esa función para
  generar el `idHist` del doc nuevo (formato `HIST-<fecha>-<random>`).

---

## F2 — Backup + borrado (solo tras "procedé")

1. **Backup primero.** Volcar todos los docs actuales de `/historial` a un JSON
   en el repo (p.ej. `scripts/_backups/historial_<YYYYMMDD-HHmmss>.json`) y
   confirmar la cantidad de docs exportados. Este backup **no se commitea** si
   contiene nada sensible; si es solo data de prueba, ok commitearlo o gitignorearlo
   según convenga (reportar).
2. **Borrado.** Eliminar las entradas confirmadas como prueba en D2 (preservar
   las que JP haya marcado como reales, si hubiera). Reportar cuántos docs se
   borraron y dejar `/historial` con 0 docs de prueba.

---

## F3 — Seed de la entrada legacy (solo tras F2 ok)

Insertar **un** doc en `/historial` con el `idHist` generado por
`proximoIdHistorial()` y este contenido:

```js
{
  // idHist: proximoIdHistorial()  → HIST-<fecha>-<random>
  fechaRealizada: "2026-05-15",
  fechaRealizadaTimestamp: Timestamp.fromDate(new Date("2026-05-15T12:00:00-03:00")),
  // ↑ mediodía AR para evitar corrimiento de fecha por timezone

  idPlan: "",                  // legacy, sin plan asociado
  idReceta: "REC-0505",        // ⚠️ depende de D3
  idMenu: "",
  idSeleccion: "REC-0505",
  tipoSeleccion: "receta",

  receta: "<nombre de /recetas/REC-0505 si existe; si no, el título largo de abajo>",
  nombreSeleccion: "<idem>",

  semanaInicio: "2026-05-11",  // lunes de la semana del viernes 15/05/2026

  ocasion: "Cena especial viernes",   // ⚠️ mapear según D4

  calificaciones: { juanpablo: 8, maria: 9, sofia: 8, federico: 8 },

  comentarios: {
    juanpablo: "",
    maria: "Salsa increíble, zanahorias al horno con miel y el ajo al horno rico.",
    sofia: "Las papas le parecieron picantes, la zanahoria 10/10, el choclo rico, la salsa demasiado potente.",
    federico: "Le gustó la salsa; la carne, mmm; el sabor del choclo bien pero no la textura; la papa, valoró la intención pero un bajón."
  },

  promedio: 8.3,               // (8+9+8+8)/4 = 8.25 → 8.3   (NO el "4" del Excel viejo)
  resultado: "Muy bueno",      // ≥7.5 ✓ coherente con 8.3

  repetir: "Sí",               // el "con ajustes" del dato original va en queCambiaria
  costoRealAprox: "",
  dificultadReal: "Media",     // ⚠️ "Normal" → valor de enum válido según D4

  queSalioBien: "",
  queCambiaria: "Me olvidé de sacar la sal gruesa y quedó salado. Mucho trabajo las papas para lo que son. Y el salado quizá con demasiado aceite.",

  notasFamiliares: ""          // las notas por persona ya están en `comentarios`
}
```

**Título largo (fallback de `receta`/`nombreSeleccion` si REC-0505 no existe):**
`Arañita sellada con reducción de Malbec y hongos portobello, papas Anna al oliva y espárragos al aceite de almendras tostadas (sin lácteos)`

**Stats de la receta (solo si D3 confirma que REC-0505 existe):** actualizar
`/recetas/REC-0505` para reflejar esta cocción real:
```
vecesCocinada: 1,                          // arranca en 1 (las cocciones de prueba ya no cuentan)
ultimaEvaluacion: <Timestamp 2026-05-15>,
ultimoPuntaje: 8.3
```
> Nota para JP: si las pruebas también inflaron `vecesCocinada`/`ultimoPuntaje`
> de **otras** recetas, eso es una limpieza aparte. Reportar si se detecta, pero
> no tocar otras recetas en este prompt.

---

## Decisiones tomadas (no abrir a debate)

| # | Decisión | Motivo |
|---|----------|--------|
| 1 | `promedio = 8.3`, no `4` | (8,9,8,8)→8,25→8,3; es lo único coherente con "Muy bueno" (≥7,5). El "4" es arrastre de la escala vieja. |
| 2 | `repetir: "Sí"` | El enum no admite "Sí con ajustes". El matiz queda en `queCambiaria`. |
| 3 | Notas familiares descompuestas por miembro en `comentarios` | Es como las muestra `HistorialDetalle`; `notasFamiliares` queda vacío para no duplicar. |
| 4 | Limpieza ligera de tildes/typos del texto de JP y de las notas | Legibilidad. Texto casi verbatim, sin reescribir. |
| 5 | `idHist` nuevo vía `proximoIdHistorial()` (no preservar ID viejo) | El sistema anterior no usaba el formato HIST-; un ID fresco mantiene consistencia. |
| 6 | `fechaRealizadaTimestamp` = 15/05/2026 (no `serverTimestamp`) | Para que ordene por su fecha real en "últimas 30". |

## Discrepancias a reportar (no resolver sin avisar)

- **D3 / receta vs guarniciones:** el título de REC-0505 menciona *papas Anna* y
  *espárragos*, pero las notas familiares hablan de *choclo*, *zanahorias* y *ajo
  al horno*. Es data del mundo real (la cena tuvo guarniciones distintas a las del
  título); no bloquea el insert, pero dejarlo anotado.
- Cualquier diferencia entre el shape real de D2 y el de referencia de arriba.
- Residuo de prueba en `planes` / `compras` (reportar, no tocar).

## Criterios de verificación

- **A.** `/historial` queda con exactamente **1 doc** (el legacy), salvo que D2
  haya marcado entradas reales a preservar.
- **B.** El doc legacy aparece en la pantalla `/historial` de la app: nombre,
  fecha 15/05/2026, promedio 8,3, badge "Muy bueno".
- **C.** Al abrir el detalle: se ven las 4 calificaciones (8/9/8/8), los 3
  comentarios de los miembros, y el `queCambiaria` de JP bajo datos del cocinero.
  Los campos vacíos se omiten (comportamiento ya existente de `HistorialDetalle`).
- **D.** El link a receta del detalle abre `REC-0505` (si existe; si no, se
  reportó en D3 y se decidió qué hacer).
- **E.** (Si aplica) `/recetas/REC-0505` muestra `vecesCocinada: 1`,
  `ultimoPuntaje: 8.3`, `ultimaEvaluacion` con fecha 15/05.
- **F.** Backup F2 existe y la cantidad de docs borrados coincide con D2.

## Commit

```
chore: E7.12 limpieza historial de prueba + seed entrada legacy REC-0505 (pre-prod)
```

## MAPEO

Si en D2 se confirma que el `idHist` real sigue el formato `HIST-<fecha>-<random>`
y el MAPEO §2.6 todavía dice `idHist: "auto-id"`, anotar el fix de documentación
(no es parte de este commit, pero queda pendiente para alinear el MAPEO).
