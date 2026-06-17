# PROMPT_E7.9 — Compras filtrada por miembro + redundancia Pendientes

> Sub-etapa de cierre de dos bugs reportados sobre v1.8.2 en la vista de miembro
> (María, Sofía, Federico — no JP). Fase 1 (diagnóstico D1–D6) ya entregada por Code.
> Este documento es la Fase 2 (fix) con decisiones tomadas por JP. Aplicar tal cual,
> commitear con los cambios al MAPEO en el mismo commit.
>
> **Bump de versión:** 1.8.2 → 1.8.3

---

## 1. Diagnóstico final (resumen)

### 1.1 Bug 1 — "los miembros ven todas las compras"

No es un bug del filtro ni del default. Lo que parece "ven todas" es la consecuencia
natural de tres cosas que están bien:

1. El filtro `itemsVisibles` en `src/routes/Compras.tsx` está correcto y se renderiza
   (Code confirmó en D1 que el JSX usa `itemsVisibles`, no `items`).
2. El default de `asignaciones` en `src/data/planes.ts` es `["juanpablo"]` — verificado
   en producción por JP. **El MAPEO §1.2.quaterdecies #3 está desactualizado** y declara
   `[...MIEMBRO_IDS]`. Se corrige en este commit.
3. Cada `ItemCompra` **agrega aportes de varios planes** para un mismo ingrediente
   (§2.5 — "Cómo funciona la sumabilidad"). Como las recetas comparten una base común
   (cebolla, aceite, sal, ajo, tomate), la mayoría de los ítems tienen aportes de
   muchos planes a la vez. Si un miembro tiene un solo plan asignado, `misPlanIds`
   contiene ese plan; por `some`, todos los ítems donde su plan aporta aparecen — y
   eso es prácticamente toda la base. El filtro excluye correctamente los ítems con
   ingredientes *exclusivos* de planes ajenos.

Validación: "miembro sin nada asignado → lista vacía" ya confirmado por JP. Ese
síntoma demuestra que el filtro corre y lee el dato real.

### 1.2 Decisión 1 (cantidades) — tomada por JP

**Mostrar `cantidadTotal` del ítem sin recalcular a la porción del miembro.** La
familia compra junta; el total es la cantidad real a comprar y recalcular a la
porción individual sería confuso. Trade-off consciente: el miembro ve los ingredientes
base con cantidades familiares, no individuales.

**Implicancia:** el código actual de `Compras.tsx` ya cumple la decisión. NO se modifica.

### 1.3 Bug 2 — Pendientes redundante con sección en MemberDashboard

Confirmado en D5: la sección "Pendientes de evaluar" de `MemberDashboard.tsx` y la
pantalla `/pendientes` muestran funcionalmente lo mismo. Además, `Pendientes.tsx` usa
`subscribeToPlanesActivosMiembro` (filtra por `asignaciones array-contains memberId`),
lo que puede **perder planes que el miembro debe votar pero no cocina** —
incompatible con E4.2.1, donde votan siempre los 4 miembros.

### 1.4 Decisión 2 — tomada por JP

**Eliminar la sección "Pendientes de evaluar" de `MemberDashboard.tsx`** y conservar
la pestaña dedicada `/pendientes`. La home de miembro queda con: saludo+semana,
"Mi semana", "Mi historial".

---

## 2. Alcance del fix

### 2.1 Cambios de código

**`src/routes/Compras.tsx`** — NO se toca. Filtro y cantidad total ya son correctos
para la Decisión 1.

**`src/routes/MemberDashboard.tsx`** — eliminar la sección "Pendientes de evaluar"
(el `<section>` con su card, lista de planes y botones "Evaluar"). Eliminar también
state/effects/subscriptions que ya no tengan consumidor tras quitar esa sección
(no asumir; verificar). La home queda con saludo+semana, "Mi semana", "Mi historial".

**`src/routes/Pendientes.tsx`** — reemplazar:

```
subscribeToPlanesActivosMiembro(semana, memberId, setPlanes)
```

por:

```
subscribeToPlanesActivos(semana, setPlanes)
```

Mantener el filtro client `p.estado === "Cocinada" && !p.votos?.[memberId]`. Razón:
post-E4.2.1, el voto es independiente de `asignaciones`, así que un miembro debe
poder ver y votar planes que no cocina.

**`src/data/planes.ts`** — si `subscribeToPlanesActivosMiembro` queda sin
consumidores tras los cambios anteriores, evaluar eliminarla. Verificar uso con un
grep antes de borrar; no asumir.

**BottomNav** — sin cambios. La pestaña "Pendientes" se mantiene.

### 2.2 Patches obligatorios al MAPEO_FIRESTORE (mismo commit)

**Patch A — corregir §1.2.quaterdecies #3.** El texto actual declara el default como
`[...MIEMBRO_IDS]`. Reemplazar el ítem #3 entero por:

> 3. **`asignaciones` default = `["juanpablo"]`**: todas las funciones de creación de
>    planes (`elegirComoEspecial`, `sumarComoExtra`, `sumarComoEnProceso`,
>    `elegirMenuComoEspecial`, `sumarMenuComoEnProceso`) pasan
>    `asignaciones: ["juanpablo"]`. JP reasigna explícitamente cuando otro miembro
>    cocina. Nota histórica: una versión intermedia del default fue `[...MIEMBRO_IDS]`
>    (con backfill via `scripts/backfill-asignaciones.ts`), pero se revirtió a
>    `["juanpablo"]` para que el filtro de Compras por miembro tenga sentido — un
>    miembro solo debe ver compras de los planes que efectivamente cocina. La
>    reversión no se documentó en su momento; queda corregida en E7.9.

**Patch B — agregar nota al final de §2.5 (lista de compras).** Antes del separador
horizontal de cierre de la sección, agregar el sub-bloque:

> **Visión por miembro (E7.9):** un miembro no-JP en `/compras` ve solo los ítems donde
> alguno de sus planes asignados aporta (`aportes[].idPlan ∈ misPlanIds`, regla `some`).
> La cantidad mostrada es el `cantidadTotal` del ítem completo — suma de **todos** los
> aportes, incluidos los de planes ajenos. Decisión consciente: la familia compra junta
> y el total es la cantidad real a comprar; recalcular a la porción del miembro generaría
> confusión sobre cuánto comprar. Consecuencia esperada: los ingredientes base compartidos
> (cebolla, aceite, sal, ajo) aparecen para varios miembros simultáneamente, con cantidades
> familiares. Ítems con aportes exclusivamente de planes ajenos al miembro NO aparecen.

**Patch C — agregar nueva sub-cabecera §1.2.E7.9** (después de la última sub-cabecera
existente de v1.8.x):

> ### 1.2.E7.9 Cambios en v1.8.3 (E7.9 — Compras filtrada confirmada + redundancia Pendientes)
>
> Sub-etapa de cierre de dos bugs reportados sobre v1.8.2 en la vista de miembro.
>
> 1. **Bug Compras "ven todas" — causa real y decisión.** El filtro por miembro ya
>    existía y funcionaba; lo que se percibía como "ven todas" era consecuencia natural
>    de la agregación de aportes en `ItemCompra` sobre ingredientes base compartidos.
>    Decisión tomada por JP: mantener cantidad total, no recalcular porción individual.
>    `Compras.tsx` sin cambios. Documentado en §2.5.
>
> 2. **Default de `asignaciones` corregido en el doc.** §1.2.quaterdecies #3 declaraba
>    `[...MIEMBRO_IDS]`; el valor real en `src/data/planes.ts` es `["juanpablo"]`.
>    Verificado en producción por JP. Corregido en el doc, no en código.
>
> 3. **`MemberDashboard.tsx` — sección "Pendientes de evaluar" eliminada.** Redundante
>    con la pestaña `/pendientes`. La home de miembro queda con saludo+semana, "Mi semana",
>    "Mi historial".
>
> 4. **`Pendientes.tsx` — fuente de datos corregida.** Cambia
>    `subscribeToPlanesActivosMiembro` → `subscribeToPlanesActivos` + filtro client
>    `estado === "Cocinada" && !votos[memberId]`. Razón: post-E4.2.1, el voto es
>    independiente de `asignaciones`, así que la fuente filtrada por `asignaciones`
>    perdía planes que el miembro debe votar pero no cocina.
>
> 5. `subscribeToPlanesActivosMiembro` — evaluar eliminación si queda sin consumidores
>    (verificar uso antes de borrar).

**Patch D — cabecera del MAPEO.** Bump de `Versión: 1.8.2` a `Versión: 1.8.3` y
actualizar la fecha. Actualizar la descripción de la cabecera para incluir E7.9.

**Patch E — §10 deuda técnica.** Marcar la entrada que corresponda como cerrada si
aplica (este fix no cierra ninguna deuda existente listada, pero verificar §10.1
"filtros de Biblioteca" no se haya destrabado por accidente — si no, dejar como está).

---

## 3. Criterios de aceptación

1. **Compras — miembro con un plan asignado.** Logueado como María (asignada a UN
   solo plan activo en la semana actual), `/compras` muestra:
   - (a) Todos los ingredientes del plan de María, con cantidades como están.
   - (b) Los ingredientes base compartidos con otros planes, también presentes,
     a cantidad familiar (consecuencia aceptada de la Decisión 1).
   - (c) **NO aparece** ningún ítem cuyos aportes provengan exclusivamente de planes
     donde María no participa. Si (c) falla, hay un bug separado que reportar — NO
     forma parte de la Decisión 1.

2. **Compras — miembro sin planes asignados.** Logueado como un miembro sin ningún
   plan, `/compras` muestra lista vacía (con estado vacío explícito si existe;
   si no, dejar tal cual).

3. **Compras — JP.** Logueado como JP, `/compras` muestra la lista completa sin
   filtrar. Sin regresión.

4. **Home de miembro.** `MemberDashboard.tsx` muestra exactamente bajo el saludo:
   "Mi semana" y "Mi historial". NO hay sección "Pendientes de evaluar".

5. **Pestaña `/pendientes`.** Logueado como un miembro que NO cocina un plan en estado
   "Cocinada" pero tampoco lo votó, ese plan debe aparecer en `/pendientes`. Antes
   del fix lo perdía; después del fix debe verse.

6. **MAPEO actualizado en el mismo commit.** Aplicados Patches A–E. Bump a v1.8.3 en
   la cabecera. `git log -p` del commit muestra cambios de código + cambios de MAPEO
   juntos.

---

## 4. Notas operativas

- **Security Rules:** NO se tocan. Confirmado en D6 — `/compras` es read/write para
  cualquier miembro por diseño (§4.1, permisivo dentro de la familia, integridad fina
  en cliente).
- **Backfill:** NO se ejecuta nada masivo. Si existen planes activos heredados con
  `asignaciones: [...MIEMBRO_IDS]` del backfill viejo de E4.1, seguirán visibles para
  todos hasta que JP los reasigne manualmente. No es bloqueante.
- **Testing obligatorio:** probar logueado como miembro NO-JP (no solo como JP).
  Reportar cualquier ítem que aparezca para María y NO debería (criterio #1.c).
- **Si algo del diagnóstico no coincide con el código real:** detenerse y reportar
  antes de tocar nada. El MAPEO es la intención; el código es la verdad.
