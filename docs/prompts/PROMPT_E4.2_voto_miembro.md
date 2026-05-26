# PROMPT E4.2 — Voto individual del miembro + cierre de evaluación

> **Tipo:** feature — refactor de la evaluación a voto distribuido.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Ancla:** E3.6 (evaluación JP), E4.1 (dashboard de miembro). **MAPEO vigente:** v1.6.1.
> Referencias: §3.4 (promedio + resultado), §3.7 (atomicidad del voto), §3.1 (estados).

## Contexto

E3.6 implementó la evaluación en **modo JP único**: JP llena su voto y la función
`guardarEvaluacionJP` **cierra el plan en el mismo acto** (`estado → "Evaluada"`),
aunque los otros 3 miembros no hayan votado. Eso era correcto cuando JP era el único
usuario.

E4.1 abrió el modo miembro: el dashboard de María/Sofía/Federico muestra "Pendientes de
evaluar" con un botón "Evaluar" que navega a `/voto/:idPlan`. Pero esa ruta todavía
renderiza el formulario de E3.6. **E4.2 convierte la evaluación en voto distribuido.**

## Decisiones de diseño zanjadas (no re-discutir)

Decididas con JP en esta sesión:

1. **JP es un votante más.** Los 4 miembros (JP incluido) votan con la **misma**
   pantalla `/voto/:idPlan`. Un voto = un puntaje 1-10 + un comentario.

2. **El voto NO cierra el plan por sí solo.** El plan pasa a `"Evaluada"`
   automáticamente solo cuando **todos los miembros en `plan.asignaciones` han votado**
   (voto no nulo). Hoy `asignaciones` siempre tiene los 4 (default de E4.1), así que en
   la práctica cierra al 4º voto — **pero la condición se lee de `plan.asignaciones`,
   NO se hardcodea el número 4.** Esto deja E4.2 correcto para cuando E4.3 permita
   asignar un plan a un subconjunto.

3. **JP puede forzar el cierre.** JP —y solo JP— tiene un botón "Cerrar evaluación
   ahora" que cierra el plan con los votos que haya en ese momento. Es el escape para
   cuando un miembro nunca vota. El promedio se calcula sobre los votos presentes.

4. **`datosCocinero` sigue siendo exclusivo de JP** y es parte de su voto (igual que en
   E3.6). Los miembros no-JP no ven ni cargan esos campos.

5. **`guardarEvaluacionJP` deja de cerrar unilateralmente.** Su rol se absorbe en la
   función de voto unificada (ver C1). El voto de JP es un voto normal; el cierre es
   automático (decisión 2) o forzado (decisión 3).

6. **Calificación de componentes de menú:** la sección "Calificar componentes" de E3.6
   sigue siendo **solo de JP** y parte de su voto. Los miembros no-JP votan solo el
   puntaje global del plan. No expandir esto.

## Diagnóstico requerido ANTES de codear

Reportá cada punto con evidencia **literal** (código pegado con ruta+línea, JSON crudo
de Firestore). No escribas "✅"; pegá lo que respalda cada afirmación.

### D1 — La pantalla `/voto/:idPlan` actual

Pegá el componente que renderiza `/voto/:idPlan` (probable `src/routes/Voto.tsx`),
**completo**. Reportá: ¿qué campos muestra hoy? ¿Branchea por modo JP vs miembro o
asume JP? ¿De dónde saca el `idPlan` y el `miembroId`?

### D2 — Las funciones de evaluación en `src/data/planes.ts`

Pegá **completas**: `guardarEvaluacionJP` (la de E3.6) y, si existe,
`voteAndCloseIfComplete` (el MAPEO §7.2 dice que se planeó en E2.2 — puede existir como
stub, estar implementada, o no existir). Reportá cuál es el estado real de cada una.

### D3 — Cómo se llega a `/voto/:idPlan`

¿Desde dónde se navega a esa ruta? Reportá los call-sites: el botón "Evaluar" del
dashboard de miembro (E4.1), la acción "evaluar" del Home de JP (E3.6), cualquier otro.
Pegá qué parámetros pasa cada uno (¿solo `idPlan`? ¿también `miembroId`?).

### D4 — Shape real de un plan `Cocinada` en Firestore

Traé de Firestore un plan en estado `Cocinada` (si no hay ninguno ahora, traé uno
`Evaluada` y aclaralo) y pegá el JSON crudo, en particular los campos: `estado`,
`asignaciones`, `votos`, `comentariosPlan`, `datosCocinero`, `tipoSeleccion`,
`componentesCocinados`. Confirmá si `votos` y `comentariosPlan` son maps con los 4
miembros o se crean on-demand.

### D5 — La lógica de cierre de E3.6 (para reusar)

Dentro de `guardarEvaluacionJP`, pegá específicamente: (a) el cálculo de `promedio` y
`resultado`, (b) la escritura del doc en `/historial`, (c) el incremento de
`vecesCocinada` (plan-receta y plan-menú). E4.2 reutiliza esta lógica — no la
reinventes.

### D6 — Security Rules y validación de estado

- Pegá la regla de `/planes/{id}` de `firestore.rules`. Confirmá que un miembro
  autenticado puede escribir su voto (§4.2 dice write permisivo para family members).
- Confirmá que `guardarEvaluacionJP` valida `plan.estado === "Cocinada"` dentro de la
  transacción y aborta si no. Esa validación se conserva en E4.2.

## Cambios de código

### C1 — Función de voto unificada `voteAndCloseIfComplete`

En `src/data/planes.ts`, una sola función para el voto de **cualquier** miembro:

```
voteAndCloseIfComplete(idPlan, miembroId, puntaje, comentario, datosCocinero?, puntajesComponentes?)
```

Dentro de **una** `runTransaction` (§3.7):

1. `tx.get(planRef)`. Validar `plan.estado === "Cocinada"` → si no, abortar con mensaje
   claro ("Este plan ya fue evaluado" / "El plan no está en estado Cocinada").
2. Validar que `miembroId` esté en `plan.asignaciones` → si no, abortar ("No estás
   asignado a este plan"). (Hoy siempre lo está; la validación protege para E4.3.)
3. Escribir `votos.<miembroId> = puntaje` y `comentariosPlan.<miembroId> = comentario`.
4. Si `miembroId === "juanpablo"` y vino `datosCocinero`: escribir `datosCocinero`.
   Si vino `puntajesComponentes` (solo JP, plan-menú): manejarlo como en E3.6.
5. Calcular `votantesCompletos` = ¿todos los `memberId` de `plan.asignaciones` tienen
   voto no nulo en el `votos` ya actualizado?
6. **Si `votantesCompletos`:** ejecutar el cierre (helper C3) dentro de la misma tx.
   **Si no:** la tx solo registra el voto; el plan sigue `Cocinada`.

`datosCocinero` se persiste en el plan en cuanto JP vota, aunque el plan todavía no
cierre — así no se pierde si JP vota primero y el cierre llega después.

`guardarEvaluacionJP` se elimina o se reduce a un wrapper que delega en
`voteAndCloseIfComplete`. Documentá cuál de las dos opciones tomaste y por qué.

### C2 — Función de cierre forzado `forzarCierreEvaluacion`

En `planes.ts`, `forzarCierreEvaluacion(idPlan)` — pensada para ser llamada **solo por
JP** (la UI restringe el acceso; ver C4). Dentro de una `runTransaction`:

1. `tx.get(planRef)`. Validar `plan.estado === "Cocinada"`.
2. Ejecutar el cierre (helper C3) con los votos **presentes** en ese momento, sin
   exigir completitud.

### C3 — Helper de cierre compartido

Extraé la lógica de cierre en un helper interno reutilizado por C1 y C2. Recibe el
`plan` ya leído en la tx y el objeto `votos` final. Hace, dentro de la misma tx:

- Calcular `promedio` **sobre los votos no nulos** (§3.4) y `resultado` (tabla §3.4).
  Esto vale tanto para el cierre completo (4 votos) como para el forzado (menos votos).
- `tx.set` del doc en `/historial` con el snapshot completo + `calificaciones`,
  `comentarios`, `promedio`, `resultado` — misma forma que D5.
- `tx.update(planRef, { estado: "Evaluada" })`.
- Incremento de `vecesCocinada` (plan-receta y plan-menú) — misma lógica que D5.

Reusá lo de E3.6 (D5); no reimplementes el cálculo ni la forma del doc de historial.

### C4 — Reescritura de `Voto.tsx`

La pantalla `/voto/:idPlan` detecta al usuario logueado (`useAuth`) y se adapta:

- **Identifica al votante** = el `miembroId` del usuario logueado. No se vota "por
  otro": cada uno vota lo suyo. (Si el Home de JP pasaba un `miembroId` por param —
  ver D3 — eso se simplifica: el votante es siempre el usuario logueado.)
- **Muestra el voto del usuario:** selector de puntaje 1-10 (reusar los 5+5 botones de
  E3.6) + comentario. Si el usuario **ya votó** y el plan sigue `Cocinada`, precargar
  su voto y permitir **editarlo**.
- **Solo si el usuario es JP:** además, los campos de `datosCocinero` y, para
  plan-menú, la sección colapsable "Calificar componentes" (igual que E3.6).
- **Solo si el usuario es JP:** botón **"Cerrar evaluación ahora"** (llama a C2),
  visible mientras el plan esté `Cocinada`. Con confirmación inline que aclare cuántos
  votos hay y cuántos faltan ("Vas a cerrar con 2 de 4 votos. ¿Confirmás?"). Si JP no
  votó aún, el texto le sugiere votar primero (su voto trae `datosCocinero`), pero no
  lo obliga.
- **Progreso de votos:** mostrar quién ya votó y quién falta (read-only), para
  cualquier usuario. Da contexto sin exponer los puntajes ajenos si no querés —
  decidí mostrar solo "votó / no votó" por miembro (no el número), es lo más simple.
- **Si el plan ya está `Evaluada`:** pantalla read-only con el resultado final
  (promedio, resultado textual). Sin selector, sin botón de cierre.
- Al guardar el voto (C1): si la respuesta indica que el plan cerró, mostrar
  "Evaluación cerrada"; si no, "Voto guardado". Después, volver al origen (dashboard
  de miembro para no-JP, Home para JP) — replicar el patrón de navegación que ya use
  la app.

### C5 — MAPEO

Actualizar §3.7 de `MAPEO_FIRESTORE.md`: el cierre se dispara al completar los votos de
`plan.asignaciones` (no "los 4" hardcodeado), más el cierre forzado de JP. Reflejar que
`guardarEvaluacionJP` fue absorbida por `voteAndCloseIfComplete`. Subir el header a
**v1.6.2**.

## Fuera de scope (no hacer)

- **No** construir la UI de edición de asignaciones (E4.3).
- **No** tocar el dashboard de miembro (E4.1) salvo que un call-site de "Evaluar"
  necesite ajustar los params que pasa (D3) — si es así, es un cambio mínimo.
- **No** cambiar el cálculo de `promedio`/`resultado` ni la forma del doc de historial
  de E3.6 — se reutilizan.
- **No** permitir que un miembro vote por otro, ni que un no-JP fuerce el cierre.
- **No** tocar la serie de proteínas.

## Criterios de aceptación — verificación literal obligatoria

1. **Compila y linta.** Salida literal de `npm run build` y `npm run lint`.
2. **Funciones finales.** Pegá `voteAndCloseIfComplete`, `forzarCierreEvaluacion` y el
   helper de cierre, completas. Mostrá que la condición de cierre lee de
   `plan.asignaciones` y no del literal 4.
3. **Verificación REAL del voto distribuido** en https://comida-familiar.web.app (Code
   deja el checklist, JP lo completa con los 4 logins). Sobre un plan en `Cocinada`:
   - Votar como **María** → guarda, el plan **sigue `Cocinada`**. Pegá el JSON crudo
     del plan de Firestore mostrando `votos.maria` cargado y `estado: "Cocinada"`.
   - Votar como **Sofía**, luego **Federico** → el plan sigue `Cocinada` después de
     cada uno.
   - Votar como **JP** (4º voto) → el plan pasa a **`Evaluada`** automáticamente. Pegá
     el JSON crudo del plan (`estado: "Evaluada"`) y del doc nuevo en `/historial`.
   - Confirmar que la receta del plan tiene `vecesCocinada` incrementado en 1.
4. **Voto editable.** Como María, sobre un plan aún `Cocinada`, volver a `/voto` →
   su puntaje aparece precargado y puede cambiarlo. JP reporta que funcionó.
5. **Cierre forzado.** Sobre otro plan `Cocinada` con solo 2 votos: como JP, usar
   "Cerrar evaluación ahora" → el plan pasa a `Evaluada`, el `promedio` del doc de
   historial está calculado sobre 2 votos. Pegá el JSON del historial. Como miembro
   no-JP, confirmar que **no** existe ese botón.
6. **datosCocinero restringido.** Como María/Sofía/Federico, la pantalla de voto **no**
   muestra los campos de `datosCocinero` ni "Calificar componentes". Como JP, sí.
7. **Plan ya evaluado.** Entrar a `/voto/:idPlan` de un plan `Evaluada` → pantalla
   read-only con el resultado, sin poder votar.
8. **MAPEO** en v1.6.2 con §3.7 actualizada.

## Cierre del reporte de Code

- Resultado del checklist de los 4 logins (lo completa JP).
- Qué se hizo con `guardarEvaluacionJP` (eliminada vs wrapper) y por qué.
- Confirmación de que no se tocó nada fuera de scope.
- Cualquier deuda detectada para E4.3 (ej. dónde la UI de asignaciones tendrá que
  enganchar, o si la validación "miembroId en asignaciones" de C1 ya quedó lista para
  cuando `asignaciones` tenga subconjuntos).

## Commits

```
Stage E4.2: voto distribuido + cierre automatico y forzado de evaluacion
```

```
Docs: MAPEO v1.6.2 (E4.2 — voto multi-miembro)
```

## Próximo paso (no ejecutar ahora)

Con E4.2 verificado, sigue **E4.3 — UI de asignaciones**: pantalla para que JP edite
`plan.asignaciones` (multi-select de miembros, destildar a quien no coma ese plato).
Una vez que E4.3 permita subconjuntos, la condición de cierre de E4.2 (que ya lee de
`asignaciones`) y el filtro del dashboard (E4.1) empiezan a "morder" sin tocar código.
