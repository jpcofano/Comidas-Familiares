# PROMPT E4.3 — UI de asignaciones de plan (cierre de la Etapa 4)

> **Tipo:** feature — UI de edición + función de datos.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Ancla:** E4.1 (default de `asignaciones` + dashboard), E4.2 (voto distribuido).
> **MAPEO vigente:** v1.6.2. Referencias: §3.6 (no modificar asignaciones de plan
> `Evaluada`), §3.7 (cierre lee de `asignaciones`).

## Contexto

E4.1 estableció que todo plan nace con `asignaciones = [los 4 miembros]`. E4.2 dejó el
voto distribuido leyendo la condición de cierre de `plan.asignaciones`. Hoy todos los
planes tienen los 4, así que:

- En el dashboard de miembro (E4.1), los 3 miembros ven todos los planes.
- En el voto (E4.2), el cierre siempre espera 4 votos.

**Falta la herramienta para que JP asigne un plan a un subconjunto** — ej. una
guarnición de hidratos que comen solo los chicos, no los padres keto. E4.3 construye
esa UI. Una vez que exista, el filtro del dashboard y la condición de cierre —que ya
leen de `asignaciones`— empiezan a "morder" sin tocar más código. **E4.3 cierra la
Etapa 4.**

## Decisiones de diseño zanjadas (no re-discutir)

1. **La edición vive en el detalle del plan, no en una pantalla nueva.** Asignar es una
   acción de JP sobre un plan concreto; va donde ya están "descartar" y los extras.
   (El diagnóstico D1 confirma cuál es esa pantalla.)

2. **Solo JP edita asignaciones.** Los miembros no-JP no ven el control de edición.

3. **Un plan siempre tiene al menos un miembro asignado.** Si JP destilda a todos, se
   bloquea el guardado (no se permite `asignaciones` vacío). Esta regla viene del Apps
   Script viejo (`CS_asignarRecetaAMiembros` forzaba `['juanpablo']` ante un array
   vacío); acá la versión es: el botón "Guardar" se deshabilita si no hay nadie
   tildado, con un mensaje claro.

4. **No se editan asignaciones de un plan `Evaluada`** (§3.6). El control de edición se
   muestra solo mientras el plan esté en un estado activo (`Elegida`, `Compra
   pendiente`, `Compra lista`, `Cocinada`).

5. **Al desasignar a un miembro que ya votó, se limpia su voto.** Si JP saca a Federico
   de un plan `Cocinada` donde Federico ya había votado, su entrada en `votos` y
   `comentariosPlan` se borra al guardar. Razón: la condición de cierre de E4.2 es
   `asignaciones.every(id => votos[id] != null)`; un voto colgado de alguien que ya no
   está asignado no rompe el cierre (la condición no lo mira), pero **sí ensucia** el
   promedio del historial y la vista de progreso. Limpiarlo mantiene los datos
   coherentes. Ver C2 para el detalle transaccional.

6. **Las asignaciones NO se propagan a los extras automáticamente.** En el modelo, un
   "Especial extra" es un plan aparte con su propio `asignaciones`. E4.3 edita el plan
   que JP tenga abierto. Si JP quiere cambiar la asignación de un extra, abre el extra.
   No se hace cascada padre→extras en este prompt (se puede evaluar a futuro; anotarlo
   como posible deuda, no implementarlo).

## Diagnóstico requerido ANTES de codear

Reportá cada punto con evidencia **literal** (código pegado con ruta+línea, JSON crudo
de Firestore). No escribas "✅"; pegá lo que respalda cada afirmación.

### D1 — Dónde se ve el detalle de un plan hoy

¿Hay una pantalla de "detalle de plan" como tal, o el plan se ve dentro del Home de JP
(tarjeta de Especial / extras / En proceso)? Pegá el componente donde un plan activo se
muestra con sus acciones (descartar, sumar extra, marcar cocinada, evaluar). Esa es la
ubicación candidata para el control de asignaciones. Reportá la ruta y cómo se llega.

### D2 — Funciones de `planes.ts` relacionadas con asignaciones

¿Existe ya alguna función que escriba `plan.asignaciones`? (E4.1 lo setea **en la
creación**; buscá si hay además una de **edición**.) Pegá lo que haya. Pegá también la
firma de `voteAndCloseIfComplete` de E4.2, para ver la forma del map `votos` /
`comentariosPlan` que C2 va a tener que limpiar.

### D3 — Constante de miembros y sus nombres visibles

Pegá `MIEMBRO_IDS` (o como se llame) de `models.ts`. ¿Hay un mapa `id → nombre visible`
("maria" → "María")? El multi-select necesita mostrar nombres, no IDs. Si no existe ese
mapa, reportá de dónde se sacan hoy los nombres (¿`/config/familia`? ¿hardcode en algún
componente?).

### D4 — Shape real de un plan en Firestore

Traé un plan activo y pegá el JSON crudo: `idPlan`, `estado`, `asignaciones`, `votos`,
`comentariosPlan`, `tipoPlan`, `origen`. Confirma el estado actual de `asignaciones`
(debería ser los 4 tras E4.1).

### D5 — Security Rules para escritura de `asignaciones`

Pegá la regla de `/planes/{id}` de `firestore.rules`. ¿Un update de `asignaciones` por
JP pasa las reglas? ¿Las reglas distinguen JP de los demás miembros, o eso se enforcea
solo en el cliente? Reportá lo que haya — si la restricción "solo JP" vive solo en
cliente, está bien para este prompt (consistente con el resto de la app), solo
documentalo.

## Cambios de código

### C1 — Función `actualizarAsignaciones` en `planes.ts`

```
actualizarAsignaciones(idPlan, nuevasAsignaciones: string[])
```

Dentro de una `runTransaction`:

1. `tx.get(planRef)`.
2. Validar `plan.estado !== "Evaluada"` → si lo es, abortar con mensaje claro ("No se
   pueden cambiar las asignaciones de un plan ya evaluado").
3. Validar `nuevasAsignaciones.length >= 1` y que cada id esté en `MIEMBRO_IDS` →
   abortar si no.
4. **Limpiar votos de los desasignados** (decisión 5): para cada `miembroId` que estaba
   en `plan.asignaciones` y **no** está en `nuevasAsignaciones`, eliminar su entrada de
   `votos` y de `comentariosPlan`. Usar `deleteField()` del SDK, o reconstruir los maps
   sin esas claves — lo que sea más limpio; documentá cuál.
5. `tx.update(planRef, { asignaciones: nuevasAsignaciones, ...votos/comentarios
   limpiados })`.

Devolver `Result<T, Error>` como el resto de los writes del data layer.

### C2 — Control de asignaciones en el detalle del plan

En la pantalla que D1 identificó, agregar — **visible solo si el usuario es JP y el
plan está en estado activo** (no `Evaluada`):

- Una sección "Quién come este plato" (o similar) que muestra los miembros tildados.
- Un control para editar: multi-select / lista de checkboxes con los 4 miembros, por
  nombre visible (D3). Precargado con el `asignaciones` actual del plan.
- Botón "Guardar" que llama a C1. **Deshabilitado si no hay ningún miembro tildado**,
  con un texto que lo explique ("Tiene que comerlo al menos una persona").
- Si JP está por desasignar a alguien que **ya votó** (mirar `plan.votos`), mostrar una
  confirmación inline que lo advierta: "Federico ya votó este plan. Si lo sacás, su
  voto se va a borrar. ¿Confirmás?". Solo entonces llamar a C1.
- Tras guardar con éxito, refrescar la vista (si la pantalla usa realtime sobre el
  plan, se actualiza solo; si no, recargar).

Diseño: sobrio, consistente con el resto de la app. No hace falta nada elaborado — el
control es para JP, uso interno.

### C3 — MAPEO

Actualizar `MAPEO_FIRESTORE.md`: documentar `actualizarAsignaciones` y la regla de
limpieza de votos de desasignados (§3.6 / §3.7, donde encaje mejor). Agregar la sección
de changelog de E4.3. Marcar la Etapa 4 como completa en §7.4. Subir el header a
**v1.6.3**.

## Fuera de scope (no hacer)

- **No** propagar asignaciones a los extras en cascada (decisión 6).
- **No** tocar el voto (E4.2) ni el dashboard (E4.1) — ya leen de `asignaciones`,
  funcionan solos cuando el dato cambia.
- **No** crear una pantalla nueva: la edición va en el detalle del plan existente.
- **No** tocar la serie de proteínas.

## Criterios de aceptación — verificación literal obligatoria

1. **Compila y linta.** Salida literal de `npm run build` y `npm run lint`.
2. **Función final.** Pegá `actualizarAsignaciones` completa, mostrando la validación
   de estado, la de "al menos 1 miembro", y la limpieza de votos de desasignados.
3. **Verificación REAL con los 4 logins** en https://comida-familiar.web.app (Code deja
   el checklist, JP lo completa). Sobre un plan activo:
   - Como **JP**, abrir el detalle del plan → se ve el control de asignaciones con los
     4 tildados. Como **María** (o cualquier no-JP), el control **no** aparece.
   - Como JP, **destildar a Federico** y guardar → pegar el JSON crudo del plan de
     Firestore mostrando `asignaciones` sin Federico.
   - Login como **Federico** → ese plan **ya no aparece** en su dashboard ("Mi
     semana" / "Pendientes"). Login como **Sofía** → el plan **sí** sigue apareciendo.
   - Intentar destildar a los 4 → el botón "Guardar" queda deshabilitado.
4. **Limpieza de voto al desasignar.** Sobre un plan `Cocinada` donde Federico ya votó:
   como JP, desasignar a Federico → confirmar (con el aviso) → pegar el JSON del plan
   mostrando que `votos.federico` y `comentariosPlan.federico` ya **no** están.
5. **Cierre con subconjunto.** Tomar un plan `Cocinada` asignado solo a 3 miembros
   (ej. sin Federico). Votar con esos 3 (E4.2) → el plan cierra a `Evaluada` con el 3er
   voto, **sin** esperar a Federico. Pegar el JSON del plan (`Evaluada`) y del doc de
   historial (promedio sobre 3 votos). Este es el criterio que demuestra que E4.2 +
   E4.3 encajan.
6. **Plan `Evaluada` no editable.** Abrir el detalle de un plan ya `Evaluada` como JP →
   el control de asignaciones no se muestra (o se muestra deshabilitado, decidí y
   documentá cuál).
7. **MAPEO** en v1.6.3, Etapa 4 marcada completa en §7.4.

## Cierre del reporte de Code

- Resultado del checklist de los 4 logins (lo completa JP).
- Cómo se implementó la limpieza de votos (`deleteField` vs reconstrucción del map).
- Dónde quedó ubicado el control (qué pantalla, según D1).
- Confirmación de que no se tocó el voto, el dashboard ni nada fuera de scope.
- Estado de la Etapa 4: si E4.3 cierra, la Etapa 4 queda completa.

## Commits

```
Stage E4.3: UI de asignaciones de plan + limpieza de votos de desasignados
```

```
Docs: MAPEO v1.6.3 (E4.3 — asignaciones, cierre Etapa 4)
```

## Próximo paso (no ejecutar ahora)

Con E4.3 cerrado, la **Etapa 4 está completa**: voto multi-miembro funcionando de punta
a punta. Quedan pendientes, fuera de la Etapa 4:
- La serie de proteínas: **E3.4.8.2** (fix de `PROMPTAS`) + el prompt de auditoría de
  las 18 recetas "Vegetariana".
- La deuda de UI registrada en el resumen de sesión (contraste del botón de sugerencia
  del importador, pluralizar unidades, "a gusto").
- Limpieza de datos: `ING-0178` duplicado, recetas de prueba `REC-15xx`.
- **Etapa 5** — el importador (§7.5 del MAPEO).
JP decide el orden al retomar.
