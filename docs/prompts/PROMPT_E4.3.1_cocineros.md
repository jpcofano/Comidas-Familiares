# PROMPT E4.3 — UI de cocineros del plato (cierre de la Etapa 4)

> **Tipo:** feature — UI de edición + función de datos.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Ancla:** E4.1 (dashboard), E4.2 + **E4.2.1** (voto distribuido y su fix de cierre).
> **MAPEO vigente:** v1.6.3. **Requiere E4.2.1 ya aplicado.**

## Contexto

El campo `plan.asignaciones` significa **quiénes cocinan** el plato (1 a 4 personas).
E4.1 lo dejó con default = los 4. E4.2.1 corrigió el voto para que lo cierren los 4
miembros de la familia, **independiente de quién cocine**. Lo que falta es la
herramienta para que JP edite quién cocina cada plato.

Una vez que exista:
- "Mi semana" del dashboard (E4.1, filtra por `asignaciones`) le muestra a cada miembro
  los planes **que le toca cocinar**.
- La lista de compras (E4.4, siguiente prompt) se filtra por cocinero.
- El voto no se ve afectado: lo siguen haciendo los 4 (E4.2.1).

**E4.3 cierra la Etapa 4.**

## Decisiones de diseño zanjadas (no re-discutir)

1. **`asignaciones` = cocineros del plato.** Puede tener de 1 a 4 miembros (cocinan
   juntos, o de a 2, o uno solo). La UI lo refleja como **multi-select**.

2. **La edición vive en el detalle del plan**, donde ya están "Cocinar", "Descartar",
   "Sumar extra". (Hoy esa zona ya muestra "Quién come este plato" con un link
   "Editar" — ver la captura que aportó JP. **Ese texto está mal y se corrige en este
   prompt**, ver C2.)

3. **Solo JP edita.** Los miembros no-JP no ven el control de edición.

4. **Un plato siempre tiene al menos un cocinero.** Si JP destilda a todos, "Guardar"
   se deshabilita con un mensaje claro ("Tiene que cocinarlo al menos una persona").

5. **No se editan los cocineros de un plan `Evaluada`** (§3.6 del MAPEO).

6. **Desasignar a un cocinero NO toca su voto.** Como el voto lo hacen los 4 miembros
   siempre (E4.2.1), sacar a alguien de la lista de cocineros no tiene ninguna relación
   con su voto. La función de edición **solo** escribe `asignaciones`; no toca `votos`
   ni `comentariosPlan`. (Una versión anterior de este prompt incluía limpieza de
   votos — eso era para el modelo equivocado "asignaciones = comensales" y queda
   **descartado**.)

7. **Los cocineros NO se propagan a los extras en cascada.** Un "Especial extra" es un
   plan aparte con su propio `asignaciones`. JP edita el plan que tenga abierto. (Se
   puede evaluar a futuro; anotarlo como posible deuda, no implementarlo.)

## Diagnóstico requerido ANTES de codear

Reportá cada punto con evidencia **literal** (código pegado con ruta+línea, JSON crudo
de Firestore). No escribas "✅"; pegá lo que respalda cada afirmación.

### D1 — La sección "Quién come este plato" actual

La captura de JP muestra que el detalle del plan **ya tiene** una sección con el texto
"Quién come este plato", un link "Editar" y el nombre del/los miembro(s). Localizá ese
componente, pegá su código **completo** con la ruta. Reportá: ¿el link "Editar" ya
hace algo (abre un control) o es un placeholder? ¿De dónde saca los nombres que
muestra?

### D2 — Funciones de `planes.ts` sobre `asignaciones`

¿Existe ya una función que **edite** `asignaciones` (no la creación de E4.1)? Pegá lo
que haya. Si la sección de D1 ya tiene un "Editar" funcional, pegá la función que llama.

### D3 — Constante de miembros y nombres visibles

Pegá `MIEMBRO_IDS` de `models.ts` y el mapa `id → nombre visible` (ej. "maria" →
"María"). Si no existe el mapa, reportá de dónde salen hoy los nombres.

### D4 — Shape real de un plan en Firestore

Traé un plan activo, pegá el JSON crudo: `idPlan`, `estado`, `asignaciones`, `votos`,
`tipoPlan`, `origen`.

### D5 — Security Rules para escritura de `asignaciones`

Pegá la regla de `/planes/{id}` de `firestore.rules`. ¿Un update de `asignaciones` por
JP pasa? ¿La restricción "solo JP" vive en las reglas o solo en cliente? Reportá lo que
haya; si vive solo en cliente, está bien (consistente con la app), solo documentalo.

## Cambios de código

### C1 — Función `actualizarAsignaciones` en `planes.ts`

```
actualizarAsignaciones(idPlan, nuevosCocineros: string[])
```

Dentro de una `runTransaction`:

1. `tx.get(planRef)`.
2. Validar `plan.estado !== "Evaluada"` → abortar con mensaje claro si lo es.
3. Validar `nuevosCocineros.length >= 1` y que cada id ∈ `MIEMBRO_IDS` → abortar si no.
4. `tx.update(planRef, { asignaciones: nuevosCocineros })`.

**Eso es todo.** No tocar `votos` ni `comentariosPlan` (decisión 6). Devolver
`Result<T, Error>` como el resto de los writes.

### C2 — Corregir y completar la sección del detalle del plan

En el componente de D1:

- **Cambiar el texto** "Quién come este plato" → **"Quiénes cocinan este plato"** (o
  "Quién cocina este plato"). El texto actual es incorrecto: `asignaciones` son los
  cocineros, no los comensales.
- El link/botón **"Editar"** — visible **solo si el usuario es JP y el plan no está
  `Evaluada`** — abre un control de edición: lista de checkboxes con los 4 miembros por
  nombre visible (D3), precargada con el `asignaciones` actual.
- Botón "Guardar" que llama a C1. **Deshabilitado si no hay ningún miembro tildado**,
  con texto que lo explique ("Tiene que cocinarlo al menos una persona").
- Para un miembro no-JP: la sección puede **mostrar** quiénes cocinan (solo lectura),
  pero **sin** link "Editar".
- Para un plan `Evaluada`: mostrar quiénes cocinaron, sin "Editar".
- Tras guardar OK, refrescar (si la vista usa realtime sobre el plan, solo; si no,
  recargar).

Diseño sobrio, consistente con la app. Uso interno de JP, no hace falta nada elaborado.

### C3 — MAPEO

Documentar `actualizarAsignaciones` en `MAPEO_FIRESTORE.md`. Confirmar que §2 ya
aclara (por E4.2.1) que `asignaciones` = cocineros. Marcar la **Etapa 4 como completa**
en §7.4. Header a **v1.6.4**.

## Fuera de scope (no hacer)

- **No** limpiar votos al desasignar cocineros (decisión 6 — descartado del prompt
  viejo).
- **No** propagar cocineros a los extras en cascada (decisión 7).
- **No** tocar el voto, el cierre, ni "Pendientes" (eso fue E4.2.1).
- **No** tocar la lista de compras (eso es E4.4).
- **No** crear pantalla nueva: la edición va en el detalle del plan.
- **No** tocar la serie de proteínas.

## Criterios de aceptación — verificación literal obligatoria

1. **Compila y linta.** Salida literal de `npm run build` y `npm run lint`.
2. **Función final.** Pegá `actualizarAsignaciones` completa — mostrando la validación
   de estado, la de "al menos 1 cocinero", y que **no** toca `votos`.
3. **Texto corregido.** Pegá el JSX final de la sección: debe decir "Quiénes cocinan
   este plato" (o equivalente), no "Quién come".
4. **Verificación REAL con los 4 logins** en https://comida-familiar.web.app (Code deja
   el checklist, JP lo completa). Sobre un plan activo:
   - Como **JP**: el detalle del plan muestra la sección de cocineros con "Editar".
     Como **María** (no-JP): se ve la sección pero **sin** "Editar".
   - Como JP, editar los cocineros del plan dejando solo a **JP y María** (sacar a
     Sofía y Federico) y guardar → pegar el JSON del plan mostrando `asignaciones:
     ["juanpablo","maria"]`.
   - Login como **Sofía** → ese plan **ya no aparece** en su "Mi semana" (no lo
     cocina). Login como **María** → el plan **sí** aparece en su "Mi semana".
   - **Importante:** login como **Sofía** → el plan **sí sigue apareciendo en
     "Pendientes de evaluar"** si está `Cocinada` y Sofía no votó (los 4 votan siempre,
     E4.2.1). Esto confirma que cocinar y votar son independientes.
   - Intentar destildar a los 4 → "Guardar" deshabilitado.
5. **Plan `Evaluada` no editable.** Abrir un plan `Evaluada` como JP → la sección
   muestra quiénes cocinaron, sin "Editar".
6. **MAPEO** en v1.6.4, Etapa 4 completa en §7.4.

## Cierre del reporte de Code

- Resultado del checklist de los 4 logins (lo completa JP).
- Confirmación de que `actualizarAsignaciones` no toca `votos`.
- Confirmación de que no se tocó el voto, "Pendientes", ni nada fuera de scope.
- Estado de la Etapa 4.

## Commits

```
Stage E4.3: UI de cocineros del plato + correccion del texto del detalle
```

```
Docs: MAPEO v1.6.4 (E4.3 — cocineros, cierre Etapa 4)
```

## Próximo paso (no ejecutar ahora)

Con E4.3 cerrado, sigue **E4.4** — lista de compras filtrada por cocinero: cada miembro
ve la compra de sus planes; JP ve la lista completa con cada ítem etiquetado según
quién lo cocina.
