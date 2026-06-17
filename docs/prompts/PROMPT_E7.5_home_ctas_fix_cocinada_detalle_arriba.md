# PROMPT E7.5 — Home con CTAs siempre presentes + fix marcar cocinada + detalle receta sin foto y acciones arriba

> Pegar este prompt completo en Claude Code abierto en el repo `Comidas-Familiares`. Cuatro bloques independientes pero relacionados. Hacerlos en orden.

---

## Contexto del stack

App en raíz del repo: **React 19 + Vite + TypeScript + Firestore + react-router-dom v7**.
El submodule `Migracion/` es código muerto, no tocar.

Archivos que toca este prompt (verificá antes de empezar):

- `src/routes/Home.tsx` — pantalla principal JP.
- `src/routes/DetalleReceta.tsx` — detalle de receta.
- `src/components/receta/RecetaHero.tsx` — placeholder de foto (se borra entero).
- `src/components/receta/AccionesPlan.tsx` — bloque colapsable de acciones JP (se reposiciona).
- `src/data/planes.ts` — función `marcarCocinada`.
- `src/lib/fechas.ts` — helpers de fecha (puede que tengas que exponer `formatLocal` o agregar `fechaHoy`).
- `src/lib/home.ts` — `separarPlanes` (no se modifica, solo de referencia).
- `src/types/models.ts` — `EstadoPlan`, `Plan` (no modificar).

---

## Bloque 1 — Home: CTAs siempre presentes

**Hoy:** cuando no hay nada, aparece un empty state con un botón "Ver recetas". Cuando hay Especial, aparece "+ Sumar extra". Hay un "+ Sumar en proceso" pero solo se ve si hay Especial. No hay forma directa desde el home de elegir el Especial.

**Cambio requerido:** los CTAs viven dentro de cada carril (Especial / Extras / En proceso) y aparecen según esta tabla:

| Sección     | Cuándo aparece el CTA                          | Texto del CTA              |
|-------------|------------------------------------------------|----------------------------|
| Especial    | Siempre que no haya Especial elegido           | `+ Elegir como Especial`   |
| Extras      | Solo si hay Especial (como hoy)                | `+ Sumar extra`            |
| En proceso  | Siempre (no depende de que haya Especial)      | `+ Sumar en proceso`       |

Los tres CTAs navegan a `/biblioteca` (mismo destino que el actual `+ Sumar extra`).

### 1.1 Borrar el bloque "Sin planes"

En `src/routes/Home.tsx`, eliminar completo el bloque que arranca con `{!hasPlanes && (...)}` (es un `<div>` con el texto "Todavía no hay comidas elegidas para esta semana." y el `<Link to="/biblioteca">Ver recetas</Link>`). Ese empty state se reemplaza por los CTAs por carril.

La variable `hasPlanes` se sigue usando más abajo para mostrar/ocultar `<CompraProgress>` — dejarla.

### 1.2 Sección Especial — agregar CTA cuando no hay Especial

Hoy el bloque está envuelto en `{especial && (...)}`. Hay que mostrar la sección siempre, y dentro:

- Si `especial` está seteado → `<PlanCard featured>` (como hoy) + bloque de Extras (como hoy).
- Si `especial` es `null` → un CTA "+ Elegir como Especial" centrado o en su lugar natural.

Estructura sugerida:

```tsx
<section style={{ marginBottom: "var(--space-2)" }}>
  {especial ? (
    <>
      <PlanCard plan={especial} featured isJP ... />
      <div style={{
        marginLeft: "var(--space-5)",
        paddingLeft: "var(--space-4)",
        borderLeft: "3px solid var(--line)",
      }}>
        {extras.length > 0 && (
          <>
            <SectionLabel>Extras</SectionLabel>
            {extras.map((p) => <PlanCard key={p.idPlan} plan={p} ... />)}
          </>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => navigate("/biblioteca")}
          style={{
            fontSize: "var(--fs-sm)",
            marginTop: extras.length > 0 ? "var(--space-1)" : "var(--space-2)",
            marginBottom: "var(--space-2)",
          }}
        >
          + Sumar extra
        </button>
      </div>
    </>
  ) : (
    <>
      <SectionLabel>Especial</SectionLabel>
      <button
        className="btn btn-ghost"
        onClick={() => navigate("/biblioteca")}
        style={{ fontSize: "var(--fs-sm)" }}
      >
        + Elegir como Especial
      </button>
    </>
  )}
</section>
```

Usar el componente `SectionLabel` que ya existe en el archivo. **Nota:** los Extras solo tienen sentido si hay Especial; por eso el CTA "+ Sumar extra" solo se muestra dentro del branch `especial ? ...`.

### 1.3 Sección En proceso — siempre visible

Hoy la condición es `{(enProceso.length > 0 || especial !== null) && (...)}`. Cambiarla a **siempre verdadera** (es decir, sacar la condición — la sección se renderea siempre). El CTA `+ Sumar en proceso` queda al pie como hoy.

### 1.4 Verificar imports

Después de los cambios, `Link` de `react-router-dom` puede quedar sin uso (el único uso restante era el botón "Ver recetas" que se borra). Si `Link` queda huérfano, sacar del import line. Mantener `useNavigate`.

### 1.5 Checks

- [ ] Pantalla en blanco (sin planes): se ve `Especial / + Elegir como Especial`, no se ve Extras, se ve `En proceso / + Sumar en proceso`.
- [ ] Con Especial elegido, sin extras ni en proceso: card de Especial + `+ Sumar extra` + sección En proceso con solo el CTA `+ Sumar en proceso`.
- [ ] Con Especial + 2 extras + 1 en proceso: todo visible, los tres CTAs al pie de cada carril.
- [ ] Click en cualquiera de los tres CTAs navega a `/biblioteca`.
- [ ] Ya no existe en el código el texto literal "Todavía no hay comidas elegidas para esta semana." ni el botón "Ver recetas".

---

## Bloque 2 — Fix: marcar cocinada con fecha futura deja huérfanos

**Bug actual:** si un plan tiene `fecha: "2026-05-29"` (viernes futuro) y JP lo marca como cocinada hoy miércoles 2026-05-27:

1. El plan pasa a `estado: "Cocinada"` pero conserva `fecha: "2026-05-29"`.
2. En el `WeekStrip` del Home, el viernes sigue marcado con plato (porque `marked` lee `p.fecha ?? p.fechaPrevistaComida` sin filtrar por estado).
3. La lista de compras queda con `totalItems = 0` post-`limpiarAportesDelPlan`, pero `<CompraProgress>` se sigue renderizando con "0 pendientes" porque el plan sigue activo en la subscription (estado Cocinada está incluido en `ESTADOS_PLAN_ACTIVOS`).

**Resolución:**

### 2.1 Helper `fechaHoy()`

En `src/lib/fechas.ts`:

- Si la función `formatLocal` no está exportada (es interna, lo está en el archivo actual), exportarla.
- Agregar:

```ts
/** Devuelve la fecha de hoy en formato "YYYY-MM-DD" (local time). */
export function fechaHoy(): string {
  return formatLocal(new Date());
}
```

### 2.2 `marcarCocinada` actualiza `fecha` a hoy

En `src/data/planes.ts`, dentro de la función `marcarCocinada`, en el bloque que construye `updates`:

```ts
const updates: Record<string, unknown> = { 
  estado: "Cocinada",
  fecha: fechaHoy(),
};
if (opciones?.resetComponentes) updates.componentesCocinados = [];
```

Importar `fechaHoy` desde `../lib/fechas` al tope del archivo si no estaba.

**Por qué:** sobrescribir `plan.fecha` con hoy da un registro real de cuándo se cocinó (útil para historial) y mueve cualquier consumidor que mire `fecha` al día correcto.

### 2.3 `marked` en Home excluye planes Cocinada

En `src/routes/Home.tsx`, dentro del `useMemo` de `marked` (cerca de la línea 128), filtrar por estado:

```tsx
const marked = useMemo(() => {
  const indices = new Set<number>();
  planes.forEach((p) => {
    if (p.estado === "Cocinada") return;        // ← agregar
    const dateStr = p.fecha ?? p.fechaPrevistaComida;
    if (dateStr) {
      const idx = fechaToWeekIdx(dateStr);
      if (idx !== null) indices.add(idx);
    }
  });
  return [...indices];
}, [planes]);
```

Razonamiento: una vez cocinado, el plato deja de "pintar" el día en el strip — el strip representa lo que está por venir o en curso, no lo que ya pasó.

### 2.4 `<CompraProgress>` oculto cuando no hay items

En `src/routes/Home.tsx`, el bloque actual es:

```tsx
{hasPlanes && (
  <CompraProgress pendientes={...} yaTengo={...} onClick={...} />
)}
```

Cambiar la condición a:

```tsx
{hasPlanes && lista && lista.totalItems > 0 && (
  <CompraProgress
    pendientes={(lista.totalItems - lista.totalYaTengo)}
    yaTengo={lista.totalYaTengo}
    onClick={() => navigate("/compras")}
  />
)}
```

Razonamiento: si la lista existe pero `totalItems === 0`, ya no hay nada para comprar — esconder el progress card en vez de mostrar "0 pendientes / 0 ya tengo".

### 2.5 Checks

- [ ] Plan con `fecha: "<futuro>"` marcado cocinada → `getDoc` del plan en Firestore muestra `fecha: "<hoy>"` (no la fecha futura original).
- [ ] WeekStrip: el día futuro deja de tener plato cuando el plan se cocina; el día de hoy lo gana (si el plan tenía fecha y se cocinó hoy).
- [ ] `<CompraProgress>` desaparece cuando el último plan activo se marca cocinada (lista queda en cero).
- [ ] Si hay otros planes activos con items, el `<CompraProgress>` sigue visible con los números correctos.

---

## Bloque 3 — Detalle de receta: sacar el placeholder de foto y subir las acciones JP

**Hoy:** la pantalla `/recetas/:id` arranca con un `<RecetaHero>` que muestra un placeholder con gradient marrón/naranja y el texto "Foto de la receta" cuando no hay `imagenUrl` (que es siempre, no implementamos fotos todavía). Después viene título, meta, pills, ingredientes, pasos, notas, y al fondo el bloque colapsable `<AccionesPlan>` con los tres botones (Elegir Especial / Sumar extra / Sumar en proceso).

**Cambio:**

1. Borrar el `<RecetaHero>` del DOM y el archivo entero (no se va a usar).
2. Mover `<AccionesPlan>` arriba — justo después de `<MetaCards>` y antes de las pills.

### 3.1 Borrar `RecetaHero`

- Eliminar el archivo `src/components/receta/RecetaHero.tsx`.
- En `src/routes/DetalleReceta.tsx`:
  - Sacar el `import { RecetaHero } from "../components/receta/RecetaHero";` del tope.
  - Sacar el bloque `{/* 2. Hero */}` con `<RecetaHero imagenUrl={receta.imagenUrl} nombre={receta.nombre} />` del render.

### 3.2 Reordenar el render

Después del cambio, el orden del JSX dentro de `<div style={{ paddingBottom: bottomPad }}>` debe ser:

1. Header (botón volver + chip `tipoItem`) — sin cambios.
2. Título `<h1>` + `porQueEspecial` — sin cambios.
3. `<MetaCards>` — sin cambios.
4. **`<AccionesPlan>` (movido acá, solo si `isJP`)**.
5. Pills (`<RecetaPill>`...) — sin cambios.
6. Ingredientes (card) — sin cambios.
7. Preparación (card) — sin cambios.
8. Tip del cocinero (card) — sin cambios.
9. `<CocinarSticky>` (solo si `isJP`) — sin cambios, sigue siendo sticky bottom.

Es decir, el bloque que hoy está al final:

```tsx
{/* 9. Acciones JP */}
{isJP && (
  <AccionesPlan ... />
)}
```

… se corta de ahí y se pega entre el bloque MetaCards (paso 4 del orden actual) y el bloque de Pills (paso 5 del orden actual).

### 3.3 Spacing del bloque movido

`<AccionesPlan>` ya tiene `marginBottom: "var(--space-3)"` interno. Verificar que el spacing visual quede bien arriba (entre MetaCards y Acciones) — si MetaCards termina con `marginBottom: "var(--space-4)"` y AccionesPlan trae el suyo, debería estar OK. Si queda apretado, ajustar.

### 3.4 Checks

- [ ] No existe más `src/components/receta/RecetaHero.tsx` en disco.
- [ ] `grep -rn "RecetaHero" src/` devuelve vacío.
- [ ] En `/recetas/<id>` siendo JP: ya no aparece el rectángulo marrón con "Foto de la receta". La página arranca con back+chip → título → meta → **Acciones JP plegables** → pills → ingredientes → ...
- [ ] El bloque sticky "Empezar a cocinar" sigue al fondo, sin cambios.
- [ ] Build (`npm run build`) sin errores TS y sin import huérfano.

---

## Bloque 4 — QA final

```sh
npm run build
npm run preview
```

Test manual:

1. **Home estado vacío** (borrar todos los planes activos en Firestore para esta semana, o usar una semana nueva):
   - Verificar que se ve `Especial / + Elegir como Especial`.
   - Verificar que NO se ve la sección Extras.
   - Verificar que SÍ se ve `En proceso / + Sumar en proceso`.
   - Click "+ Elegir como Especial" → debe llevar a `/biblioteca`.

2. **Home con Especial sin extras**:
   - Card de Especial + CTA `+ Sumar extra` debajo de la card.
   - Sección En proceso con su CTA al pie.

3. **Marcar cocinada con fecha futura**:
   - Asignar `fecha` futuro a un plan (`/biblioteca` → asignar día desde donde sea, o editar Firestore directamente).
   - Marcar cocinada (botón en `<PlanCard>`).
   - Refrescar el Home.
   - WeekStrip: el día futuro ya no tiene plato; el día de hoy sí lo tiene.
   - `<CompraProgress>` desaparece si era el único plan activo con items.
   - En Firestore, el doc del plan tiene `fecha: <hoy>`.

4. **Detalle de receta**:
   - Abrir cualquier receta desde `/biblioteca` o desde el home.
   - No aparece más el rectángulo "Foto de la receta".
   - El bloque colapsable "Agregar al plan de la semana" aparece arriba (debajo de las tres MetaCards Total/Porciones/Dificultad), antes de las pills.
   - Botón sticky "Empezar a cocinar" sigue abajo.

---

## NO tocar

- Schema de Firestore.
- Reglas de elegibilidad (`src/lib/elegibilidad.ts`).
- Lógica de creación de planes (`src/data/planes.ts` excepto la función `marcarCocinada`).
- `BottomNav`, `Header`, `AppShell`.
- Componentes de Cocinar, Compras, Historial (esto es Home + Detalle Receta + un fix en data layer).

## Cuando termines

`git diff --stat` + lista de archivos creados/borrados/modificados.
