# PROMPT E4.1 — Dashboard de miembro + asignaciones por defecto (apertura Etapa 4)

> **Tipo:** feature nueva — pantalla + routing + navegación + default de datos + backfill.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **MAPEO vigente:** v1.6.0. Referencias clave: §2.8 (`/config/familia`), §3.1 (estados de
> plan), §5.1 (inventario de pantallas), §5.2 (queries modo miembro), §5.3 (índices).

## Contexto

La Etapa 3 cerró el ciclo completo del plan en **modo JP**. La Etapa 1 construyó
`useAuth` + `AuthProvider` + resolución de `memberId` desde `/config/familia` + la
detección de modo JP vs miembro. Pero el **dashboard de miembro nunca se construyó**:
cuando un miembro no-JP (María, Sofía, Federico) inicia sesión, hoy cae en el Home de
JP o en un placeholder.

**E4.1 construye la pantalla de inicio del miembro y su navegación**, y además
establece el campo `asignaciones` del plan como dato real (ver decisión de diseño).

### Qué entra en E4.1 (este prompt)

- **Default de `asignaciones`** en la creación de planes + **backfill** de los planes
  existentes (ver decisión de diseño).
- Dashboard de miembro en `/` cuando el modo es "miembro": 4 secciones de **solo
  lectura** — mis planes de la semana, pendientes de evaluar, mis compras, mi historial.
- Pantalla `/pendientes` (solo miembro).
- Bottom-nav correcto para modo miembro.
- Guards de ruta: un miembro no puede entrar a pantallas solo-JP por URL.

### Qué NO entra en E4.1 (prompts posteriores)

- **E4.2** — pantalla de voto individual del miembro + `runTransaction` con cierre
  automático. En E4.1 el botón "Evaluar" de cada pendiente **solo navega** a
  `/voto/:idPlan`; lo que esa ruta renderiza hoy (formulario JP de E3.6) queda como
  está. No tocar `/voto` en este prompt.
- **E4.3** — UI para que JP **edite** las asignaciones (destildar miembros del default
  lleno). E4.1 solo establece el default y backfillea; no construye pantalla de edición.

## Novedad operativa: testing real con 4 logins

JP ahora tiene acceso a los mails de los 4 miembros y puede iniciar sesión como cada
uno. **Los criterios de aceptación de E4.1 exigen verificación real entrando como
María, Sofía y Federico** — no proyección desde el código. Los mails de cada miembro
están en `/config/familia.miembros` (§2.8).

## Decisión de diseño zanjada — `asignaciones` siempre poblado, default = los 4

El modelo del Plan tiene el campo `asignaciones` (array de `memberId`). La realidad del
dominio: la comida especial la come **toda la familia**; un subconjunto es la
excepción. Por lo tanto:

> **Todo plan nace con `asignaciones = [los 4 miembros]`. El campo está siempre
> poblado.** Asignar a un subconjunto será posible recién con la UI de E4.3
> (destildar miembros). Hasta entonces, todo plan es de los 4.

Consecuencias, todas buscadas:

- El dashboard usa la regla simple `plan.asignaciones.includes(miembroId)` — sin caso
  especial de "campo vacío".
- La query de §5.2 del MAPEO ("Home modo miembro", `array-contains`) funciona tal como
  está escrita, y el índice de §5.3 (`planes: semanaInicio + estado + asignaciones`)
  es el que corresponde.
- No quedan dos significados conviviendo en el campo ("sin asignar" vs "para todos").

Esto **no adelanta E4.3**: E4.3 sigue siendo la UI de edición. E4.1 solo establece el
default y backfillea los planes que hoy no tengan el campo.

## Diagnóstico requerido ANTES de codear

Reportá cada punto con evidencia **literal** (código pegado con ruta+línea, JSON crudo
de Firestore). No escribas "✅"; pegá lo que respalda cada afirmación.

### D1 — Cómo se decide el modo y cómo branchea `/`

- ¿Dónde y cómo se calcula el modo JP vs miembro? Pegá el código. ¿Es
  `memberId === "juanpablo" ? "jp" : "miembro"` o algo distinto?
- El componente montado en `/`: ¿branchea hoy por modo? Pegá ese código. ¿Qué ve hoy
  un miembro no-JP al entrar a `/`?

### D2 — Sitios de creación de planes + constante de miembros

- Listá **todas** las funciones del data layer que crean documentos en `/planes`
  (elegir especial, sumar extra, sumar en proceso, elegir menú como plan, etc.). Para
  cada una, pegá la parte donde arma el objeto del plan y reportá si hoy setea
  `asignaciones` o no.
- ¿Existe en `src/types/models.ts` (o donde sea) una constante con los IDs de los 4
  miembros (algo tipo `MIEMBROS` / `MIEMBROS_IDS`)? Pegala. Si no existe, reportá cómo
  se obtiene hoy la lista de miembros (¿de `/config/familia`?).

### D3 — Estado real de `planes[].asignaciones` en Firestore

Traé de Firestore todos los planes en estados activos (`Elegida`, `Compra pendiente`,
`Compra lista`, `Cocinada`) de la semana actual, y algún plan más si hay pocos. Para
cada uno: `idPlan`, `estado`, valor literal de `asignaciones` (array poblado, array
vacío, o campo ausente). Esto define el alcance del backfill.

### D4 — Bottom-nav y guards de ruta

- Pegá el componente del bottom-nav. ¿Distingue modo JP vs miembro? ¿Qué ítems muestra
  hoy en cada modo?
- ¿Hay hoy guards que impidan a un miembro abrir por URL `/recetas` (listado),
  `/recetas/importar`, `/menus`, `/menus/:id`? Pegá el routing relevante. Si no hay,
  decilo.

### D5 — Capa de datos realtime + índice de §5.3

- En `src/data/planes.ts` y los hooks genéricos: firmas de lo que haya para leer
  planes activos en tiempo real (`subscribeToPlanesActivos`, `useCollectionRealtime`).
- ¿Está en `firestore.indexes.json` el índice compuesto
  `planes: semanaInicio ASC + estado ASC + asignaciones ARRAY` (§5.3)? Pegá la entrada
  si existe.

### D6 — Qué renderiza `/voto/:idPlan` hoy en modo miembro

Sin modificar nada: ¿qué muestra hoy `/voto/:idPlan` si entra un miembro no-JP?
Solo reportarlo.

## Cambios de código

### C1 — Default de `asignaciones` en la creación de planes

En **cada** función del data layer que crea un plan (las que D2 identificó), setear
`asignaciones` con los IDs de los 4 miembros al construir el doc. Usar la constante de
miembros si existe (D2); si no existe, crear una constante `MIEMBROS_IDS`
(`["juanpablo", "maria", "sofia", "federico"]`) en `models.ts` y usarla en todos lados.
No leer `/config/familia` en cada creación si una constante alcanza — los 4 miembros
son estables.

### C2 — Backfill de planes existentes

Backfillear los planes que D3 haya mostrado sin `asignaciones` poblado: `update` del
campo `asignaciones` al array completo de los 4. Hacerlo con un script idempotente en
`scripts/` o por consola. Alcance: planes en estados activos (`Elegida`, `Compra
pendiente`, `Compra lista`, `Cocinada`). **No** tocar planes `Evaluada` (estado
terminal, §3.1). Va en commit `Data:` separado del de código.

### C3 — Componente `MemberDashboard`

Crear el dashboard de miembro (ubicación coherente, ej. `src/routes/MemberDashboard.tsx`).
Toma `miembroId` y `nombre` de `useAuth`. Cuatro secciones, **solo lectura** en E4.1:

1. **Saludo** — "Hola, {nombre}" + la semana actual.
2. **Mis planes de la semana** — planes activos de la semana donde
   `asignaciones.includes(miembroId)`. Por cada uno: nombre de la selección, tipo de
   plan, estado. Tap → navega al detalle (replicar cómo lo hace el Home de JP para
   plan-receta y plan-menú). Usar realtime (D5). Para la query: si el índice de §5.3
   existe (D5), usar la query `array-contains` de §5.2; si no existe, cargar los planes
   activos de la semana y filtrar en cliente con la misma regla. Documentá cuál se usó.
3. **Pendientes de evaluar** — planes "míos" en estado `Cocinada` donde el miembro no
   votó (`!plan.votos?.[miembroId]`). Por cada uno: nombre + botón "Evaluar" que navega
   a `/voto/:idPlan`. (La pantalla de voto del miembro es E4.2.)
4. **Mi historial** — últimas ~15 evaluaciones de `/historial`
   (`orderBy fechaRealizadaTimestamp desc, limit 15`): nombre, fecha, resultado, y el
   puntaje propio del miembro si figura en el snapshot.

Estados vacíos explícitos y prolijos en cada sección.

### C4 — Branch en la ruta `/`

`/` renderiza `MemberDashboard` en modo miembro y el Home de JP en modo jp. Reutilizá
el mecanismo de modo de D1; no inventes uno nuevo.

### C5 — Pantalla `/pendientes` (solo miembro)

Ruta `/pendientes` con la misma sección "pendientes de evaluar" de C3.3, como pantalla
propia (es la que el bottom-nav enlaza). Si entra JP por URL, redirigir a `/`.

### C6 — Mis compras

El miembro ve la lista de compras **filtrada a sus planes**: items de la lista activa
cuyo `aportes[].idPlan` esté entre sus planes (§5.2). Según cómo esté hecho `/compras`
hoy, decidí si es una sección del dashboard o la pantalla `/compras` en modo miembro;
aplicá lo más simple y reportá la decisión. El toggle "Ya tengo" sigue funcionando
(la compra es compartida por la familia).

### C7 — Bottom-nav modo miembro

Según D4, dejar el bottom-nav de modo miembro con: **Mi semana** (`/`), **Compras**
(`/compras`), **Pendientes** (`/pendientes`), **Historial** (`/historial`). Sin
Biblioteca/Recetas, sin Menús, sin Importar. El modo JP no se toca.

### C8 — Guards de ruta para miembro

Un miembro no-JP que abra por URL una pantalla solo-JP (`/recetas` listado,
`/recetas/importar`, `/menus`, `/menus/:id`, `/menus/:id/cocinar`) → redirigir a `/`.
Las pantallas compartidas (`/recetas/:id`, `/recetas/:id/cocinar`, `/compras`,
`/historial`, `/voto/:idPlan`) siguen accesibles para miembros (§5.1).

### C9 — Actualizar el MAPEO

En `MAPEO_FIRESTORE.md`: agregar a §2 (modelo del Plan) y/o §5.2 una nota de que
`asignaciones` se puebla siempre con los 4 miembros al crear el plan (default), y que
la UI para editarlo es E4.3. Subir el header a **v1.6.1**.

## Fuera de scope (no hacer)

- **No** tocar `/voto/:idPlan` ni implementar voto/transacción (E4.2).
- **No** construir UI de edición de asignaciones (E4.3).
- **No** tocar el Home de JP ni pantallas de modo JP salvo el branch de C4.
- **No** tocar planes en estado `Evaluada` en el backfill.
- **No** tocar el fix de proteínas E3.4.8.2 (corre por su carril).

## Criterios de aceptación — verificación literal obligatoria

Cada criterio se valida con evidencia, no con afirmaciones.

1. **Compila y linta.** Salida literal de `npm run build` y `npm run lint`, sin errores
   nuevos.
2. **Default de asignaciones.** Pegá el código final de C1 en cada sitio de creación.
   Crear un plan nuevo desde la app (modo JP) y pegar el JSON crudo de ese plan leído
   **de Firestore**, mostrando `asignaciones` con los 4 IDs.
3. **Backfill aplicado.** Pegá el JSON crudo de los planes activos leídos de Firestore
   **después** del backfill — todos con `asignaciones` poblado con los 4.
4. **Verificación REAL con los 4 logins** en https://comida-familiar.web.app (Code deja
   el checklist, JP lo completa):
   - Login como **María** → `/` muestra `MemberDashboard`, saludo "Hola, María", las 4
     secciones, y sus planes (todos los activos, porque `asignaciones` = los 4).
     Repetir como **Sofía** y **Federico**.
   - Login como **JP** → `/` sigue mostrando el Home de JP intacto.
   - Como miembro, abrir por URL `/recetas`, `/menus`, `/recetas/importar` → redirige
     a `/`.
   - Bottom-nav en modo miembro: 4 ítems (Mi semana, Compras, Pendientes, Historial).
5. **Pendientes de evaluar.** Si hay algún plan `Cocinada`, aparece en la sección y en
   `/pendientes`, con botón "Evaluar" que navega a `/voto/:idPlan`. Si no hay ninguno,
   estado vacío en ambas. JP reporta cuál caso se dio.
6. **Mi historial.** Lista evaluaciones reales de `/historial` (pegá conteo y 1-2
   entradas en texto si hay datos).
7. **MAPEO actualizado.** Header en v1.6.1 + la nota de C9.

## Cierre del reporte de Code

- Resultado del checklist de los 4 logins (lo completa JP).
- Qué query se usó en C3.2 (array-contains vs filtro en cliente) y por qué.
- Decisión de C6 (sección del dashboard vs pantalla `/compras` en modo miembro).
- Confirmación de que `/voto` no se tocó, de que el modo JP quedó intacto, y de que no
  se tocaron planes `Evaluada`.
- Deuda detectada para E4.2.

## Commits

```
Stage E4.1: dashboard de miembro + default de asignaciones + routing modo miembro
```

```
Data: backfill de asignaciones en planes activos (los 4 miembros)
```

```
Docs: MAPEO v1.6.1 (E4.1 — asignaciones por defecto + dashboard miembro)
```

## Próximo paso (no ejecutar ahora)

Con E4.1 cerrado y verificado por JP con los 4 logins, sigue **E4.2 — voto individual
del miembro**: `/voto/:idPlan` en modo miembro (solo el voto del miembro logueado) +
`voteAndCloseIfComplete` con `runTransaction` y cierre automático cuando votan todos
los miembros asignados (§3.7). Como `asignaciones` siempre tiene los 4, hoy el cierre
es literalmente al 4º voto; E4.2 debería leer la condición de cierre desde
`asignaciones` (no hardcodear "4") para quedar correcto cuando E4.3 permita subconjuntos.
