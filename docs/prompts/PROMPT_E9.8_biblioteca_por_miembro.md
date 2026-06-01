# PROMPT E9.8 — Biblioteca personal por miembro (visibilidad curada por el owner)

> **App:** Comida Familiar — proyecto Firebase `comida-familiar`.
> **MAPEO vigente:** confirmar número exacto al abrir.
> **Fuente de verdad del modelo:** `src/types/models.ts`.
> **Branch sugerido:** `feat/e9.8-biblioteca-por-miembro`.

## Qué resuelve y qué NO

El owner (JP) cura **qué recetas del catálogo ve cada miembro al navegar su biblioteca**.
Es **curación de vista (UX), no seguridad.**

**Distinción crítica — NO romper esto:**
- **Biblioteca personal** = qué recetas *se muestran* a un miembro cuando navega el catálogo.
  Filtro de presentación, opt-in (ve solo lo habilitado).
- **Lectura de receta asignada** = un miembro DEBE poder leer cualquier receta cuando tiene
  un Plan asignado para cocinarla, **esté o no en su biblioteca personal.** Esto YA funciona
  (las Security Rules permiten `read` de `recetas` a cualquier `isFamilyMember()`).
  **NO se toca. NO se endurece. La visibilidad NO pasa a las Rules.**

Si la visibilidad fuera "dura" (en Rules), bloquearía leer una receta asignada para cocinar
que no esté en la biblioteca del miembro → rompería el flujo de cocción. Por eso es blanda.

## Decisiones tomadas

- **Opt-in:** por defecto un miembro NO ve ninguna receta en su biblioteca. Solo ve las que
  el owner habilitó. Arrancar **todo vacío** (sin botón "habilitar todo").
- **Owner sin restricción:** JP (el `owner` de `/config/familia`) ve SIEMPRE todas las recetas.
  No aparece en el doc de visibilidad.
- **Solo el owner cura.** Los demás miembros no pueden editar visibilidad.
- **Dos vías de curación:** pantalla dedicada + toggle en el detalle de receta.

## ⛔ Diagnóstico previo obligatorio

Antes de implementar, Code pega evidencia de:
1. La firma actual de `getRecetas()` en `src/data/recetas.ts` (confirmar que trae todas sin filtro).
2. Cómo `Biblioteca.tsx` (`TabRecetas`) carga y muestra recetas hoy (línea ~152 `getRecetas()`).
3. Cómo se resuelve el owner y el memberId del usuario actual: `AuthProvider.tsx`,
   `resolveMemberId.ts`, y el campo `owner` en `/config/familia` (Console).
4. Confirmar que NO existe hoy ningún campo de visibilidad en `recetas` ni doc `config/visibilidad`.

Detenerse y esperar OK de JP.

## Modelo de datos

Doc único nuevo: **`config/visibilidad`**

```ts
// En models.ts
export interface VisibilidadBiblioteca {
  // opt-in: solo los idRecetas listados son visibles para ese miembro al navegar.
  // El owner (juanpablo) NO aparece acá — ve todo siempre.
  maria: string[];
  sofia: string[];
  federico: string[];
}
```

Razones de modelarlo así (no como campo en cada receta):
- Curación centralizada en un doc (el owner edita en un lugar).
- Las recetas no se ensucian con metadata de permisos.
- Una receta nueva nace invisible para todos (coherente con opt-in) sin tocar la receta.

## Capa de datos (`src/data/visibilidad.ts`, nuevo)

```ts
export async function getVisibilidad(): Promise<VisibilidadBiblioteca>
export function subscribeVisibilidad(cb): Unsubscribe   // realtime, patrón existente
// Setea la lista completa de un miembro (idempotente)
export async function setVisibilidadMiembro(miembro: MiembroId, idRecetas: string[]): Promise<Result<void, AppError>>
// Toggle de una receta para un miembro (add/remove)
export async function toggleVisibilidadReceta(miembro: MiembroId, idReceta: string, visible: boolean): Promise<Result<...>>
```

Y en `src/data/recetas.ts`, helper de lectura curada:

```ts
// Si memberId === owner -> todas. Si no -> filtra por visibilidad[memberId].
export async function getRecetasParaMiembro(memberId: MiembroId): Promise<Receta[]>
```

El filtrado es en el cliente sobre `getRecetas()` ya cacheado — sin query nueva a Firestore.

## UI

### 1. `Biblioteca.tsx` — `TabRecetas` filtra por miembro

- Obtener `memberId` y `owner` del AuthProvider.
- Si owner → `getRecetas()` (todas, como hoy).
- Si no → `getRecetasParaMiembro(memberId)`.
- Si la biblioteca curada está vacía: estado vacío amable
  ("Todavía no tenés recetas en tu biblioteca. Pedile a JP que te habilite algunas.").

### 2. Pantalla nueva `/biblioteca/visibilidad` (solo owner)

- Guard: si el user no es owner → redirect o mensaje "Solo el owner puede curar bibliotecas".
- Grilla: filas = recetas (con su nombre + proteína), columnas = los 3 miembros
  (maria, sofia, federico), celdas = checkbox visible/no.
- Reusar los filtros existentes de Biblioteca (proteína jerárquica, cocina, tipoItem) para
  no scrollear 78 recetas.
- Escribe `config/visibilidad` (debounce o guardar explícito; evitar 78 writes por click).
- **Sin** botón "habilitar todo" (decisión de JP: curar desde cero).

### 3. Toggle en `DetalleReceta.tsx` (solo owner)

- Bloque "Visible en biblioteca de:" con checkboxes ☐María ☐Sofía ☐Federico.
- Cada toggle llama `toggleVisibilidadReceta`. Realtime para que la pantalla de visibilidad
  refleje el cambio.
- No mostrar el bloque a miembros no-owner.

## Security Rules (`firestore.rules`)

Agregar SOLO el doc nuevo. **NO tocar la regla de `recetas`** (sigue `read,write: if isFamilyMember()`):

```
match /config/visibilidad {
  allow read: if isFamilyMember();   // todos leen su propia visibilidad
  allow write: if isOwner();         // solo el owner cura
}
```

(Esto es consistente con E2.3 pendiente; no requiere endurecer `recetas`.)

## Reglas de aceptación (evidencia copy-paste)

- Loguearse como María (cuenta de test o simulación) y mostrar biblioteca **vacía** al inicio.
- Como owner, habilitar 2 recetas para María desde la pantalla de visibilidad → pegar el doc
  `config/visibilidad` de Console mostrando `maria: ["REC-xxxx","REC-yyyy"]`.
- Como María, ver exactamente esas 2 en biblioteca.
- **Verificar que NO se rompió la cocción:** asignar a María un Plan con una receta que NO está
  en su biblioteca → confirmar que María igual puede abrir y cocinar esa receta (lectura por
  Plan, no por biblioteca). Este es el criterio que valida que la visibilidad quedó blanda.
- Como María (no owner), confirmar que `/biblioteca/visibilidad` la rechaza y que no ve el
  toggle en el detalle.

## Cierre de sesión (obligatorio)

1. Commits: `Stage 9.8: visibilidad biblioteca por miembro (modelo+data)`,
   `Stage 9.8: pantalla curación + toggle detalle`, `Stage 9.8: rules config/visibilidad + MAPEO`.
2. Push: `git push origin feat/e9.8-biblioteca-por-miembro` (remoto = local).
3. Deploy: `firebase use comida-familiar` → `npm run build` →
   `firebase deploy --only hosting`. Si se tocaron Rules: `firebase deploy --only firestore:rules`.
4. Reportar hashes, push y resultado de deploy.

## MAPEO_FIRESTORE.md (mismo commit)

Entrada **E9.8**: doc `config/visibilidad` (opt-in por miembro), owner ve todo, visibilidad
blanda (UX) deliberada para no romper lectura de recetas asignadas a cocinar. Documentar la
distinción biblioteca-personal vs. lectura-por-plan.
