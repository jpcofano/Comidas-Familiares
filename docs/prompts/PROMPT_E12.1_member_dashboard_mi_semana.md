# PROMPT E12.1 — Rediseño "Mi semana" (Member Dashboard) + tira de semana con visibilidad por rol

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> Rediseño de la home del miembro (`src/routes/MemberDashboard.tsx`). La actual son tres
> cards planas idénticas (Mi semana / Pendientes / Historial) sin jerarquía ni foco. Hay un
> prototipo aprobado en el design system (canvas "Mi semana — exploración", frame
> "★ Mi semana — propuesta"). Mantener tokens, componentes y patrones existentes.
>
> **Numeración:** si `E12.1` ya existe, renumerar al próximo libre (no pisar nada).

## Modelo de visibilidad por rol (REGLA CENTRAL — respetar en todo)

- **Juan Pablo (dueño):** ve todo. Su home es `src/routes/Home.tsx` (ya existe) → **NO se toca**.
- **Miembros (María, Sofía, Federico):** en `MemberDashboard` ven **solo los planes donde
  están en `plan.asignaciones`** (los que ellos cocinan), con nombre y detalle. De los planes
  de los demás, **solo pueden saber que existe una comida ese día** — nunca el nombre, el tipo
  ni quién cocina.

## Datos disponibles (ya en el repo)

- `subscribeToPlanesActivos(semana, cb)` (`src/data/planes`) → todos los `Plan[]` activos de la semana.
- `Plan`: `{ idPlan, estado, asignaciones: MiembroId[], votos, nombreSeleccion, tipoPlan,
  tipoSeleccion, idSeleccion, fecha?: "YYYY-MM-DD", fechaPrevistaComida: string|null, ... }`.
- `getSemanaActual()`, `getSemanaRango(semana)`, `fechaToWeekIdx(dateStr)` (`src/lib/fechas`).
- `src/components/WeekStrip.tsx` (la de Home: `semanaInicio` + `marked: number[]`).
- `EstadoBadge`, `SkeletonList`, y el componente/colores de avatar de miembro
  (tokens `--member-juanpablo|maria|sofia|federico`). **Reusar la fuente de color de miembro
  existente** (no hardcodear hex nuevos).

## Tarea 1 — Derivar los datos del miembro (con la regla de visibilidad)

En `MemberDashboard`, a partir de `planes` y `memberId`:

```ts
// Lo que YO cocino (nombres visibles):
const misPlanes = planes.filter(p => p.asignaciones.includes(memberId));

// Existencia de comida por día (SIN nombres) — para la tira.
// Marca CUALQUIER día con un plan activo no cocinado, sea de quien sea.
const diasConComida = new Set<number>();      // índices 0-6 (lun=0)
planes.forEach(p => {
  if (p.estado === "Cocinada") return;
  const idx = fechaToWeekIdx(p.fecha ?? p.fechaPrevistaComida ?? "");
  if (idx !== null) diasConComida.add(idx);
});

// Mis días de cocina (índices) — subconjunto coloreado con mi color:
const misDias = new Set<number>();
misPlanes.forEach(p => { const i = fechaToWeekIdx(p.fecha ?? p.fechaPrevistaComida ?? ""); if (i!==null) misDias.add(i); });

// Plato de HOY que cocino yo (para el hero); si no hay, el próximo mío de la semana:
const hoyIdx = /* índice de hoy */;
const platoHoy = misPlanes.find(p => fechaToWeekIdx(...) === hoyIdx) ?? misPlanes[0] ?? null;

// Pendientes de votar (igual que hoy): estado "Cocinada" && !votos[memberId]
```

> **Importante:** `diasConComida` solo usa fecha + existencia. Nunca pasar `nombreSeleccion`
> ni datos de planes ajenos a la UI de la tira.

## Tarea 2 — Tira de semana del miembro

Extender `WeekStrip` (o un wrapper `WeekStripMiembro`) para soportar dos niveles de marca:
- **`misDias`** → punto **lleno** con el **color del miembro** (no `--primary`); hoy resaltado
  con pastilla de fondo en el color del miembro + número en blanco.
- **`diasConComida` que NO son míos** → punto **neutro chico** (`background: var(--line)`),
  sin nombre.
- Días sin plan → vacío.
- Leyenda debajo (separada por `border-top var(--border-subtle)`): "● Cocinás vos · • Hay comida".
  (Literal "Hay comida" — **no** usar la palabra "sorpresa" en ningún lado.)

No romper el uso actual de `WeekStrip` en Home (mantener su firma `marked`/`semanaInicio`;
agregar props opcionales nuevas con default que no altere el render de JP).

## Tarea 3 — Layout nuevo de `MemberDashboard`

Orden vertical (gap `--space-4`), todo con tokens:

1. **Saludo:** `h2 "Hola, {nombre}"` + `Semana del {getSemanaRango(semana)}`.
2. **Card tira de semana** (`surface-strong`, border, radius `--radius-lg`) con la tira de Tarea 2.
3. **Hero "Hoy cocinás vos"** (solo si `platoHoy`): card con barra lateral izq de 5px en el
   color del miembro, eyebrow "Hoy cocinás vos · {díaSemana}", `EstadoBadge`, nombre grande
   (`h2`), `tipo · tiempo`, avatares de co-cocineros (si `asignaciones.length > 1`) + botón
   primario grande ("Continuar cocción" si Cocinando / "Empezar" si Compra lista/pendiente),
   linkeando a la ruta de cocinar actual (`/planes/:id/cocinar/:sel` o `/componentes`).
   - Si el miembro no tiene plato hoy pero sí más adelante → eyebrow "Tu próximo plato · {día}".
   - Si no cocina nada esta semana → ocultar el hero (la sección 5 muestra el empty).
4. **Banner "por votar"** (si hay pendientes): franja `--warn-*`, "Un plato espera tu nota" →
   "Evaluar →" al primero.
5. **"Lo que cocinás esta semana"** (SectionCard): SOLO `misPlanes` (excluyendo el del hero),
   filas compactas con chip de día (`DÍA` + número), nombre, `tipo · tiempo`, `EstadoBadge`.
   Pie en `--muted` itálico: "Los demás días ya hay una comida programada."
   - Empty (no cocina nada): "No tenés platos asignados esta semana."
6. **"Mi historial"** (igual que hoy): primeras ~4 filas con mi nota + "Ver todo →".

Estados: **loading** (skeleton del saludo + 2 cards), **error** (card `--err-*` con
"No se pudo cargar tu semana" + Reintentar), **empty** por sección (ya descritos).

## Tarea 4 — Endurecer la visibilidad (seguridad, no solo UI)

El filtrado por `asignaciones` en el cliente evita mostrar nombres ajenos, pero
`subscribeToPlanesActivos` hoy trae **todos** los planes al cliente → un miembro podría leer
`nombreSeleccion` de planes ajenos desde la consola. Para que la sorpresa sea real:

- **Mínimo (este lote):** dejar el filtrado por rol centralizado en un helper
  (`planesVisiblesPara(planes, memberId, esJP)`) y documentar el gap.
- **Recomendado (anotar como follow-up o hacerlo si es acotado):** reforzar con **Firestore
  rules** para que un miembro no-JP no pueda leer el campo de nombre de planes donde no está
  asignado (o servir una proyección redactada). Dejar `// TODO E12.x: hardening server-side`
  donde corresponda y anotarlo en `docs/MAPEO_FIRESTORE.md`.

## Criterios de aceptación (evidencia)

- Login como **miembro** (María): ve hero de su plato de hoy, tira con sus días en su color +
  días neutros donde hay comida ajena (sin nombre), y "Lo que cocinás esta semana" solo con
  sus platos. En ningún punto de la UI aparece el nombre de un plato que no cocina.
- Login como **JP**: su Home sigue **idéntica** (sin cambios).
- Miembro sin platos asignados: sin hero, empty correcto, la tira igual muestra días neutros.
- `npm run build` y `npm run test` sin errores.

## Qué NO tocar

- NO `src/routes/Home.tsx` (vista JP) ni la firma actual de `WeekStrip` usada ahí.
- NO la lógica de macros (E11.3.x) ni el catálogo.
- NO inventar colores: usar tokens `--member-*` y los componentes/escala existentes.

## Cierre

- Commit: `E12.1: rediseño Mi semana (member dashboard) — hero de hoy + tira de semana con visibilidad por rol`.
- Actualizá `docs/MAPEO_FIRESTORE.md` (nueva entrada E12.1 + el TODO de hardening).
- `npm run build && firebase deploy --only hosting`. `git push`.
