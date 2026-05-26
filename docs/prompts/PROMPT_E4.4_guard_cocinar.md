# PROMPT E4.4 — Cerrar las rutas de cocinar a los miembros no asignados

> **Tipo:** fix de consistencia — guards de ruta.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Ancla:** E4.1 (guards de ruta + dashboard), E4.3 (cocineros), y el fix reciente que
> dejó `asignaciones` default = `["juanpablo"]`. **MAPEO vigente:** v1.6.5.

## Por qué este prompt

El campo `plan.asignaciones` ahora define quiénes cocinan un plato, y el default de un
plan nuevo es `["juanpablo"]` (solo JP, hasta que él sume a alguien). El dashboard de
miembro (E4.1) y la lista de compras ya filtran por `asignaciones` — un miembro no
asignado no ve el plan en "Mi semana" ni sus ítems de compra.

**Pero las rutas de cocinar quedaron abiertas.** El reporte de la sesión anterior lo
dice literal: las rutas de cocinar no tienen guard `JPOnly` ni ningún otro — están
accesibles para cualquier miembro autenticado. Eso era inofensivo cuando todos los
planes tenían los 4 asignados, pero ahora no: un miembro **no asignado** a un plan
puede igual entrar a cocinarlo escribiendo la URL, o marcarlo "Cocinada".

Inconsistencia a cerrar: si `asignaciones` filtra el dashboard y las compras, también
tiene que controlar el acceso a la acción de cocinar. La puerta (el botón "Cocinar") ya
se muestra solo a los asignados; falta cerrar la puerta con llave (el guard de ruta).

## Decisiones de diseño zanjadas (no re-discutir)

1. **Cocinar un plan = solo los miembros en `plan.asignaciones`, más JP siempre.** JP
   tiene acceso a todo (es el dueño); el resto, solo a los planes que cocinan.
2. **El control es por plan, no por rol.** No es "JP sí, miembros no" — es "¿el usuario
   logueado está en `plan.asignaciones` (o es JP)?". Un miembro asignado cocina; el
   mismo miembro, en un plan donde no está asignado, no.
3. **Aplica a todas las pantallas del acto de cocinar:** la(s) ruta(s) de cocinar una
   receta, la de componentes de un menú, y la acción "marcar Cocinada". El diagnóstico
   D1 enumera cuáles son exactamente.
4. **El voto NO se toca.** `/voto/:idPlan` sigue abierto a los 4 miembros — votar es de
   todos, cocinar es de los asignados (esto ya quedó así en E4.2.1). Este prompt no
   roza el voto.

## Diagnóstico requerido ANTES de codear

Reportá cada punto con evidencia **literal** (código pegado con ruta+línea). No
escribas "✅"; pegá lo que respalda cada afirmación.

### D1 — Inventario de rutas y acciones del acto de cocinar

Pegá de `App.tsx` (o el archivo de rutas) **todas** las rutas relacionadas con
cocinar. Por lo que se vio en la sesión anterior, al menos:
`/planes/:idPlan/cocinar/:idReceta` y `/planes/:idPlan/componentes`. Confirmá la lista
completa y exacta. Para cada una, reportá: ¿tiene hoy algún guard? ¿cuál?

Además, localizá la acción **"marcar Cocinada"** (el botón del Home de JP y/o de donde
esté) y la función de datos que dispara. Pegá esa función.

### D2 — El guard `JPOnly` existente

E4.1 creó un wrapper `JPOnly` para las rutas solo-JP. Pegá su código completo, con la
ruta. Sirve de molde, pero **no alcanza tal cual**: `JPOnly` filtra por "el usuario es
JP"; acá hace falta filtrar por "el usuario es JP **o** está en `plan.asignaciones`",
lo cual depende del plan concreto (hay que leer el plan).

### D3 — Cómo cargan el plan las pantallas de cocinar

Abrí `Cocinar.tsx` y el componente de `/planes/:idPlan/componentes`. ¿Cómo obtienen el
plan a partir del `:idPlan` de la URL? ¿`getPlan`? ¿un hook realtime? Pegá ese trozo.
El guard va a necesitar el `asignaciones` del plan — conviene ver si reusar la carga
que la pantalla ya hace o si el guard carga el plan por su cuenta.

### D4 — El usuario logueado

¿Cómo se obtiene el `memberId` del usuario logueado y cómo se sabe si es JP? Pegá el
patrón (`useAuth`, el cálculo de `isJP`). Ya se usa en `Voto.tsx` y `MemberDashboard`;
solo confirmá la forma.

## Cambios de código

### C1 — Guard de acceso a un plan para cocinar

Crear un mecanismo que, para las rutas de cocinar, verifique: **el usuario logueado es
JP, o su `memberId` está en `plan.asignaciones`**. Si no cumple → redirigir a `/` (o
mostrar un mensaje breve "No estás asignado a este plan" y un botón a `/`; elegí lo más
consistente con cómo `JPOnly` maneja el rechazo, y documentá qué hiciste).

Forma sugerida (ajustá a la arquitectura real que D1–D3 revelen): un componente wrapper
`CocineroOnly` (o un check dentro de cada pantalla de cocinar) que:
1. Toma el `:idPlan` de la URL.
2. Carga el plan (reusando la carga existente si la pantalla ya lo hace — evitá cargar
   el plan dos veces).
3. Mientras carga, muestra el estado de carga normal.
4. Si el plan no existe → el manejo de "plan no encontrado" que ya tenga la pantalla.
5. Si el usuario **no** es JP **y no** está en `plan.asignaciones` → redirige a `/`.
6. Si cumple → renderiza la pantalla de cocinar normal.

Aplicarlo a **todas** las rutas de cocinar que D1 haya enumerado.

### C2 — La acción "marcar Cocinada" respeta lo mismo

La acción de marcar un plan como `Cocinada` (D1) debe estar disponible solo para JP o
para un miembro asignado a ese plan. Si el control vive en una pantalla que solo ve JP
(ej. el Home de JP), entonces a nivel UI ya está cubierto — en ese caso solo
**confirmalo y documentalo**, no agregues nada. Si un miembro no-JP puede dispararla
(ej. desde el botón "Cocinar" del dashboard que lleva a una pantalla con ese control),
entonces el control debe ocultarse/bloquearse para quien no esté asignado.

No hace falta enforcement en Security Rules (consistente con el resto de la app, donde
la restricción vive en cliente — D5 de prompts anteriores lo confirmó). Si querés, dejá
anotado como deuda que un enforcement real iría en `firestore.rules`, pero **no lo
implementes** en este prompt.

### C3 — Verificar la ruta de componentes de menú

El botón "Cocinar" del dashboard (agregado en la sesión anterior) manda los planes-menú
a `/planes/:idPlan/componentes`. Esa ruta se dedujo del patrón, no se verificó.
Confirmá en D1 que existe y, en la verificación, que funciona entrando como un miembro
asignado. Si la ruta **no existe** o tiene otro path, reportalo — y corregí el destino
del botón en `MemberDashboard` para que apunte a la ruta real.

### C4 — MAPEO

Documentar en `MAPEO_FIRESTORE.md` que las rutas de cocinar están restringidas a JP +
miembros asignados (donde §5.1 lista las pantallas y su acceso). Header a **v1.6.6**.

## Fuera de scope (no hacer)

- **No** tocar `/voto` ni nada del voto (decisión 4).
- **No** tocar el filtro de la lista de compras ni el dashboard (ya están bien).
- **No** implementar enforcement en Security Rules.
- **No** tocar la serie de proteínas.

## Criterios de aceptación — verificación literal obligatoria

1. **Compila y linta.** Salida literal de `npm run build` y `npm run lint` — sin
   errores nuevos respecto a la línea base (20 pre-existentes).
2. **Guard final.** Pegá el código del guard/wrapper y mostrá dónde se aplica a cada
   ruta de cocinar.
3. **Verificación REAL con los 4 logins** en https://comida-familiar.web.app (Code deja
   el checklist, JP lo completa). Necesita un plan asignado a un subconjunto — ej.
   `asignaciones = ["juanpablo","maria"]`:
   - Como **María** (asignada): el botón "Cocinar" aparece en "Mi semana" y al tocarlo
     entra a la pantalla de cocinar normal.
   - Como **Sofía** (NO asignada): el plan no está en su "Mi semana" (ya verificado
     antes) **y** si pega la URL `/planes/:idPlan/cocinar/...` directo en el navegador
     → es redirigida a `/`, no entra a cocinar.
   - Como **JP**: entra a cocinar cualquier plan, asignado a quien sea.
   - Para un plan-menú asignado a un subconjunto: el miembro asignado llega a la
     pantalla de componentes y funciona; el no asignado, redirigido.
4. **"Marcar Cocinada".** JP confirma quién puede dispararla — coherente con C2.
5. **El voto sigue abierto.** Como Sofía (no asignada al plan), `/voto/:idPlan` de ese
   mismo plan **sí** es accesible y puede votar. (Confirma que el guard de cocinar no
   se desbordó al voto.)
6. **MAPEO** en v1.6.6.

## Cierre del reporte de Code

- Resultado del checklist de los 4 logins (lo completa JP).
- La lista real de rutas de cocinar (D1) y si la ruta de componentes existía como se
  asumió (C3).
- Confirmación de que el voto no se tocó.

## Commit

```
Stage E4.4: rutas de cocinar restringidas a JP + miembros asignados
```

```
Docs: MAPEO v1.6.6 (E4.4 — guard de cocinar por asignaciones)
```

## Próximo paso (no ejecutar ahora)

Con E4.4 la Etapa 4 queda consistente de punta a punta: `asignaciones` controla
dashboard, compras y acceso a cocinar; el voto es de los 4. Quedan, fuera de la Etapa 4:
la serie de proteínas (**E3.4.8.2** + auditoría de las 18 recetas), la deuda de UI
(contraste del botón del importador, pluralizar unidades, "a gusto"), la limpieza de
datos (`ING-0178`, recetas `REC-15xx`), y la **Etapa 5** (importador).
