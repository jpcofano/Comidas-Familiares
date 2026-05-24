# PROMPT_E3.6 — Evaluación de plan cocinado (flujo JP)

## Contexto

Cierra el ciclo de vida del plan: un plan en estado `"Cocinada"` se evalúa y pasa
a `"Evaluada"` (estado terminal). E3.4.4 ya dejó la transición a "Cocinada"
funcionando y la limpieza de aportes; E3.5.1 dejó la finalización explícita de la
pantalla de cocinar. Falta la pantalla de evaluación: la última del ciclo.

## Alcance — leer con atención

Esta etapa implementa el **flujo de evaluación de JP**, NO el voto multi-miembro
completo.

El MAPEO (§3.7, línea 1235) tiene reservado `PROMPT_E4.2_voto_miembro.md` para el
voto de los 4 miembros con cierre atómico al 4º voto. Ese trabajo es de Etapa 4 y
**no entra acá**. Decisión tomada con JP: respetar el plan original del MAPEO.

Lo que SÍ hace E3.6:
- Pantalla de evaluación donde JP carga su voto (puntaje + comentario) y los
  `datosCocinero`.
- El plan pasa a `"Evaluada"` cuando JP cierra la evaluación (no espera 4 votos).
- Se crea el doc en `/historial`.
- Se resuelve el TODO de `vecesCocinada` (incremento en receta y, para plan-menú,
  en el menú + recetas componentes).

Lo que NO hace E3.6 (queda para E4.1 / E4.2):
- Pantalla de voto para miembros que no son JP.
- Dashboard de miembro.
- Cierre automático al 4º voto.

**Punto clave de diseño — no retrabajo:** aunque vote solo JP, la escritura usa
**exactamente la estructura del MAPEO §2.4** (`votos` y `comentariosPlan` como
maps de 4 miembros, no campos sueltos) y la **mecánica de transacción del §3.7**.
La única diferencia con E4.2 será la *condición de cierre* (JP cierra vs. 4 votos
cierran). El shape de datos nace en su forma final: E4.2 monta el motor encima
sin migrar nada.

## Pre-requisito

E3.4.4, E3.4.5 y E3.5.1 cerradas. El diagnóstico previo (abajo) confirma de paso
que esas tres están bien antes de construir sobre ellas.

## Decisiones de diseño (tomadas en chat con JP — no abrir a debate)

| # | Decisión | Resumen |
|---|---|---|
| 1 | Vota JP en E3.6 | Multi-miembro queda en E4.2. El shape de datos es multi-miembro igual. |
| 2 | Cierre por JP | El plan pasa a "Evaluada" cuando JP confirma la evaluación. No espera 4 votos. |
| 3 | Qué se evalúa | Puntaje 1-10 (5+5 botones) + comentario libre + `datosCocinero` (solo JP). |
| 4 | Plan-menú | Una nota al menú entero (obligatoria). Notar componentes individuales es OPCIONAL. |
| 5 | Voto firme | Una vez que JP confirma la evaluación y el plan pasa a "Evaluada", no se edita (estado terminal, §3.7 línea 685). |
| 6 | TODO vecesCocinada | Al cerrar: incrementar `vecesCocinada` en la receta (plan-receta) o en el menú + cada receta componente cocinada (plan-menú). |

## Modelo de datos — usar los campos REALES del MAPEO

NO inventar nombres. Los shapes ya están definidos:

### Plan (`/planes/{idPlan}`) — campos que toca E3.6 (MAPEO §2.4)

```
votos: { juanpablo: number|null, maria: null, sofia: null, federico: null }
comentariosPlan: { juanpablo: string, maria: "", sofia: "", federico: "" }
datosCocinero: {
  ocasion: string,        // del diccionario "Ocasiones"
  repetir: "Sí"|"No"|"",
  costoReal: string,      // texto libre
  dificultadReal: string,
  queSalioBien: string,
  queCambiaria: string,
  notasFamiliares: string
} | null
estado: "Cocinada" → "Evaluada"
```

En E3.6 solo JP vota: `votos.juanpablo` y `comentariosPlan.juanpablo` se llenan;
los otros 3 quedan `null` / `""`. Eso es correcto y esperado para Opción 1.

### Historial (`/historial/{idHist}`) — se crea al cerrar (MAPEO §2.6)

Shape relevante:
```
calificaciones: { juanpablo: 8, maria: null, sofia: null, federico: null }
comentarios: { juanpablo: "...", maria: "", sofia: "", federico: "" }
promedio: number      // ver nota abajo
resultado: string     // derivado de promedio, §3.4
repetir, costoRealAprox, dificultadReal, queSalioBien, queCambiaria, notasFamiliares
```

**Nota sobre `promedio` con un solo voto:** el MAPEO §3.4 define
`promedio = Math.round(((v1+v2+v3+v4)/4)*10)/10`. Con un solo votante eso daría
un promedio dividido por 4 (incorrecto). Para E3.6: **el promedio se calcula sobre
los votos NO nulos presentes**, no sobre 4 fijo. Con solo JP votando, `promedio`
= el puntaje de JP. Documentar esto: cuando E4.2 traiga los 4 votos, el cálculo
sobre "votos no nulos" sigue siendo correcto (da el promedio de 4). Es la fórmula
correcta y no hay que cambiarla después.

### Umbrales de resultado (MAPEO §3.4)

`≥9` Excelente · `≥7.5` Muy bueno · `≥6` Bueno · `≥4` Regular · `<4` Malísimo.

### Receta / Menú — TODO de `vecesCocinada`

- `recetas/{id}`: `vecesCocinada` (number), `ultimaEvaluacion` (Timestamp|null),
  `ultimoPuntaje` (number|null) — MAPEO líneas 178-180.
- Para plan-menú: incrementar `vecesCocinada` del menú Y de cada receta en
  `componentesCocinados[]` del plan (las que efectivamente se cocinaron).

## Cambios al código

### `src/data/planes.ts` — nueva función `guardarEvaluacionJP`

Implementa la evaluación dentro de un `runTransaction`, siguiendo la mecánica del
MAPEO §3.7 (misma estructura que usará E4.2):

```typescript
export async function guardarEvaluacionJP(
  idPlan: string,
  evaluacion: {
    puntaje: number;                 // 1-10
    comentario: string;
    datosCocinero: DatosCocinero;
    puntajesComponentes?: Record<string, number>;  // idReceta → puntaje, opcional (plan-menú)
  }
): Promise<Result<{ promedio: number; resultado: string }, AppError>>
```

Dentro de la transacción:
1. `tx.get(planRef)` → leer el plan.
2. Validar `plan.estado === "Cocinada"`. Si no, abortar con error claro
   ("Solo se puede evaluar un plan en estado Cocinada").
3. `tx.update(planRef, { 'votos.juanpablo': puntaje, 'comentariosPlan.juanpablo': comentario, datosCocinero })`.
4. Calcular `promedio` (sobre votos no nulos) y `resultado` (§3.4).
5. `tx.set(historialRef, {...snapshot del plan + cálculos})`. El `idHist` sigue
   la convención de IDs del MAPEO.
6. `tx.update(planRef, { estado: "Evaluada" })`.
7. Incremento de `vecesCocinada`:
   - Plan-receta (`tipoSeleccion === "receta"`):
     `tx.update(recetaRef, { vecesCocinada: increment(1), ultimaEvaluacion: serverTimestamp(), ultimoPuntaje: promedio })`.
   - Plan-menú (`tipoSeleccion === "menu"`):
     `tx.update(menuRef, { vecesCocinada: increment(1) })` y, por cada `idReceta`
     en `plan.componentesCocinados`, `tx.update(recetaRef, { vecesCocinada: increment(1) })`.
     Si hay `puntajesComponentes`, setear también `ultimoPuntaje` en esas recetas.

Si la transacción aborta por concurrencia, Firestore reintenta solo.

### `src/routes/EvaluarPlan.tsx` (o el nombre que use el repo para `/voto/:idPlan`)

Pantalla de evaluación. El MAPEO §5 mapea la ruta `/voto/:idPlan` (línea 977).
Confirmar el nombre real en el diagnóstico.

Contenido:
- **Puntaje**: selector 1-10 con 5+5 botones (el patrón del MAPEO / del Apps
  Script original — confirmar en diagnóstico si ya existe un componente de esto).
- **Comentario**: textarea libre.
- **`datosCocinero`**: campos `ocasion` (select del diccionario "Ocasiones"),
  `repetir` (Sí/No), `costoReal`, `dificultadReal`, `queSalioBien`,
  `queCambiaria`, `notasFamiliares` (textos libres).
- **Plan-menú**: además del puntaje al menú, una sección colapsable "Calificar
  componentes (opcional)" con un selector de puntaje por cada receta en
  `componentesCocinados`. Si JP no la abre, no se envían `puntajesComponentes`.
- Botón "Guardar evaluación" → llama `guardarEvaluacionJP` → al éxito, navegar a
  una vista de resultado o a Home con el plan ya en "Evaluada".
- Confirmación liviana antes de guardar ("La evaluación es definitiva, el plan
  pasará a Evaluada") — coherente con decisión 5 (voto firme).

### `src/routes/Home.tsx` (o donde corresponda)

Un plan en estado "Cocinada" debe ofrecer la acción "Evaluar" que lleva a la
pantalla de evaluación. Confirmar en diagnóstico cómo Home renderiza hoy las
acciones por estado de plan.

## Diagnóstico requerido ANTES de codear

(Patrón establecido desde E3.4.3.)

1. **Verificar que E3.4.5 y E3.5.1 quedaron bien.** (a) Abrir `/compras/{lista}/items/`
   y confirmar que Aceite de oliva (ING-0004) aparece como UN solo ítem. (b) Confirmar
   que la pantalla de cocinar tiene botón "Finalizar" explícito y pasos destildables.
   Reportar ambas. Si alguna falla, avisar a JP antes de seguir — E3.6 depende de esto.

2. **Ruta y componente de evaluación.** Reportar si existe ya `/voto/:idPlan` o
   equivalente, y qué hay en ese componente (¿stub? ¿algo de E3.5?). Reportar el
   nombre real del archivo.

3. **Selector de puntaje.** Buscar si ya existe un componente de puntaje 1-10
   (5+5 botones) en el repo, reutilizable. Si existe, reportar la ruta; si no, se
   crea nuevo.

4. **`crearReceta` / acceso a historial.** Confirmar cómo se generan los IDs de
   `/historial` (convención `LST`-style del MAPEO) y si hay ya un módulo
   `src/data/historial.ts`. Reportar.

5. **Diccionario "Ocasiones".** Confirmar que `/config/diccionarios` tiene la lista
   de ocasiones y cómo se lee desde el cliente.

Reportar 1-5 en una primera respuesta. JP confirma y después arrancás.

## Criterios de aceptación con verificación literal

NO basta con reportar ✅. JP verifica en app + Firebase Console.

### A — Evaluación de plan-receta

1. Tomar un plan-receta en "Cocinada". Entrar a evaluar, poner puntaje (ej. 8),
   comentario, llenar `datosCocinero`. Guardar.
2. Abrir Firebase Console, doc del plan: confirmar `estado: "Evaluada"`,
   `votos.juanpablo: 8`, `comentariosPlan.juanpablo` con el texto, `datosCocinero`
   poblado. Pegar el shape literal de esos campos.
3. Confirmar `votos.maria/sofia/federico` siguen en `null` (correcto para E3.6).

### B — Historial creado

4. Abrir `/historial/`: confirmar que se creó un doc nuevo. Pegar `calificaciones`,
   `promedio`, `resultado`. Con puntaje 8 → `promedio: 8`, `resultado: "Muy bueno"`.
5. Confirmar que el snapshot incluye nombre de receta y datos del cocinero.

### C — vecesCocinada (plan-receta)

6. Antes de evaluar, anotar `vecesCocinada` de la receta del plan. Después de
   evaluar, reabrir la receta: `vecesCocinada` subió en 1, `ultimaEvaluacion` y
   `ultimoPuntaje` poblados. Pegar antes/después.

### D — Evaluación de plan-menú

7. Tomar un plan-menú en "Cocinada" con varios componentes en `componentesCocinados`.
   Evaluar: poner nota al menú, NO abrir la sección de componentes. Guardar.
8. Firebase Console: el plan pasó a "Evaluada". El menú incrementó `vecesCocinada`.
   CADA receta en `componentesCocinados` incrementó su `vecesCocinada` en 1.
   Pegar el `vecesCocinada` del menú y de los componentes, antes/después.

### E — Plan-menú con componentes calificados

9. Otro plan-menú. Esta vez abrir "Calificar componentes" y poner nota a 2 de los
   componentes. Guardar. Confirmar en Firestore que esos componentes recibieron
   `ultimoPuntaje`, y el que no se calificó no. Pegar los valores.

### F — Estado terminal

10. Sobre un plan ya "Evaluada": confirmar que no se puede volver a evaluar (la
    acción "Evaluar" no aparece en Home, o la pantalla bloquea el guardado).
    Reportar qué se ve.

### G — Validación de estado

11. Intentar evaluar un plan que NO está en "Cocinada" (ej. uno en "Compra
    pendiente"). La transacción debe abortar con el error claro. Reportar el
    mensaje exacto que se ve.

## Edge cases a documentar en código

1. **Promedio con un solo voto**: el cálculo es sobre votos no nulos. Con JP solo,
   `promedio = puntaje de JP`. Cuando E4.2 traiga 4 votos, la misma fórmula da el
   promedio de 4. Documentar que la fórmula NO cambia en E4.2.

2. **Plan-menú sin componentes cocinados**: si por algún camino `componentesCocinados`
   está vacío, solo se incrementa `vecesCocinada` del menú. No romper.

3. **`datosCocinero` con campos vacíos**: JP puede dejar campos en blanco. Se
   guardan como `""`, no `undefined` (patrón de escritura del proyecto).

4. **Reintento de transacción**: si `runTransaction` reintenta por concurrencia,
   el incremento de `vecesCocinada` usa `increment(1)` — es seguro ante reintento
   (Firestore lo aplica una sola vez por commit). No duplicar.

## Patrón a respetar

Igual que E3.4.x / E3.5.1: spread condicional para campos opcionales, sin
`undefined` ni `?? null` en escrituras a Firestore.

## Cambios al MAPEO_FIRESTORE.md

Bump del MAPEO (número según orden de merge respecto de E3.5.1 — confirmar al
commitear; si E3.5.1 cerró como v1.5.3, este es v1.5.4).

- **§3.7**: aclarar que E3.6 implementa la versión "cierre por JP" de la
  transacción; el cierre al 4º voto es E4.2. Misma mecánica, distinta condición
  de cierre.
- **§3.4**: aclarar que `promedio` se calcula sobre votos no nulos (no sobre 4
  fijo) — corrige la fórmula que asumía 4 votantes siempre.
- Sección de la pantalla de evaluación / `/voto`: documentar el flujo de JP.
- Marcar como **resuelto** el TODO de `vecesCocinada` para plan-menú.
- Changelog de la versión.

## Convención de commits

- Código: `Stage 3.6: plan evaluation flow (JP)`
- Doc: `Docs: MAPEO v1.5.4 (plan evaluation)` (ajustar número según orden de merge)
