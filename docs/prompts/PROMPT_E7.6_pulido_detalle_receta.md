# PROMPT E7.6 — Pulidos del detalle de receta + acciones JP visibles

> Pegar este prompt en Claude Code abierto en el repo `Comidas-Familiares`. Cinco pulidos cosméticos al detalle de receta + un cambio funcional en el componente de acciones JP (sacar el acordeón).

---

## Contexto

E7.4 (rediseño v2) implementó el detalle de receta nuevo con hero, MetaCards, ingredientes agrupados por góndola, pasos preview y acciones JP plegables. La implementación es fiel en macro al prototipo `/design-system/prototypes/detalle-receta/detalle-receta.jsx`, pero hay seis desvíos detectados en auditoría: cinco cosméticos (MetaCards, ingredientes, pasos, banner riesgos, sticky bottom) + uno funcional (el acordeón de acciones JP debe volver al patrón original de botones visibles directamente, sin abrir nada). Este prompt los cierra todos juntos.

**Pre-requisito:** E7.5 ya ejecutado (el detalle de receta ya tiene `AccionesPlan` arriba y no tiene `RecetaHero`). Si E7.5 no se ejecutó todavía, hacer E7.5 primero — algunos pulidos de E7.6 (sticky bottom, ubicación de AccionesPlan) asumen ese layout.

**Archivos que toca:**

- `src/components/receta/MetaCards.tsx`
- `src/components/receta/IngredientesPorGondola.tsx`
- `src/components/receta/PasosPreview.tsx`
- `src/components/receta/AccionesPlan.tsx`
- `src/components/receta/CocinarSticky.tsx`

Referencia visual: `/design-system/prototypes/detalle-receta/detalle-receta.jsx` (cualquier número de línea que cite este prompt está sobre ese archivo).

---

## Pulido 1 — MetaCards sin borde, sub "X min activo"

**Archivo:** `src/components/receta/MetaCards.tsx`

**Estado actual:**

```tsx
<div style={{
  flex: 1,
  background: "var(--surface-alt)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  border: "1px solid var(--border-subtle)",    // ← quitar
  minWidth: 0,
}}>
```

Y más abajo:

```tsx
<MetaCard
  label="Total"
  value={tiempoTotalLabel ?? "—"}
  sub={tiempoActivoLabel ? `Activo: ${tiempoActivoLabel}` : undefined}   // ← cambiar
/>
```

**Cambios:**

1. Quitar el `border: "1px solid var(--border-subtle)"` de la card (línea 17 del archivo). El prototipo no tiene borde, solo `background: var(--surface-alt)`.
2. Cambiar el formato del sub de `` `Activo: ${tiempoActivoLabel}` `` a `` `${tiempoActivoLabel} activo` `` (sin dos puntos, palabra "activo" al final como sufijo). Match con prototipo línea 173.

---

## Pulido 2 — Ingredientes: borde solo entre items, no debajo del último

**Archivo:** `src/components/receta/IngredientesPorGondola.tsx`

**Estado actual** (alrededor de línea 52-62):

```tsx
{g.items.map((ing, idx) => {
  ...
  return (
    <li
      key={idx}
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid var(--line)",   // ← cambiar
        ...
      }}
    >
```

**Cambio:**

Reemplazar `borderBottom` por `borderTop` condicional al primer item:

```tsx
style={{
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",                             // ajustar a 8 (match prototipo línea 219)
  borderTop: idx === 0 ? "none" : "1px solid var(--border-subtle)",
  ...
}}
```

**Por qué:** la versión actual deja una línea fantasma debajo del último ítem de cada góndola (sobre todo molesta cuando una góndola tiene un solo ingrediente). Con `borderTop` excepto el primero, hay línea **entre** ítems pero no al final.

Ojo con el color: el prototipo usa `var(--border-subtle)`, no `var(--line)`. Más sutil.

---

## Pulido 3 — Pasos: tiempo en la misma línea que el título

**Archivo:** `src/components/receta/PasosPreview.tsx`

**Estado actual** (alrededor de líneas 56-78): el título del paso es un `<p>`, y debajo de él hay otro `<p>` con `tiempoEstimadoLabel` en uppercase con tracking. Eso ocupa una línea entera para el tiempo.

**Cambio:** mover el tiempo a la misma fila que el título, alineado a la derecha. Match con prototipo líneas 273-282.

Reemplazar el bloque actual:

```tsx
<div style={{ flex: 1 }}>
  {paso.titulo && (
    <p style={{ fontWeight: ..., ... }}>
      {paso.titulo}
    </p>
  )}
  {paso.tiempoEstimadoLabel && (
    <p style={{
      fontSize: "var(--fs-xs)",
      color: "var(--muted)",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      margin: "0 0 4px",
    }}>
      {paso.tiempoEstimadoLabel}
    </p>
  )}
  <p style={{ fontSize: "var(--fs-sm)", color: "var(--text)", lineHeight: 1.55, margin: 0 }}>
    {paso.detalle}
  </p>
</div>
```

Por:

```tsx
<div style={{ flex: 1, minWidth: 0 }}>
  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
    {paso.titulo && (
      <p style={{
        margin: 0,
        flex: 1,
        fontSize: "var(--fs-sm)",
        fontWeight: "var(--fw-semibold)",
        color: "var(--text-strong)",
        lineHeight: 1.3,
      }}>
        {paso.titulo}
      </p>
    )}
    {paso.tiempoEstimadoLabel && (
      <span style={{
        fontSize: 11,
        color: "var(--muted)",
        fontWeight: 500,
        fontVariantNumeric: "tabular-nums",
        flexShrink: 0,
      }}>
        {paso.tiempoEstimadoLabel}
      </span>
    )}
  </div>
  <p style={{
    fontSize: "var(--fs-sm)",
    color: "var(--text)",
    lineHeight: 1.55,
    margin: 0,
  }}>
    {paso.detalle}
  </p>
</div>
```

**Notas:**

- Quitar el uppercase y el tracking del tiempo — el prototipo lo deja como texto normal pequeño y muted, no como etiqueta.
- Usar `<span>` no `<p>` para el tiempo (es metadata inline, no un párrafo).
- `flex-shrink: 0` en el tiempo para que no se comprima si el título es largo.
- `min-width: 0` en el contenedor para que el flex se comporte bien al truncar.

---

## Pulido 4 — Banner de riesgos con borde

**Archivo:** `src/components/receta/PasosPreview.tsx`

**Estado actual** (líneas 21-32):

```tsx
{riesgos && (
  <div style={{
    padding: "10px 12px",
    background: "var(--warn-bg)",
    borderRadius: "var(--radius-sm)",
    marginBottom: "var(--space-3)",
  }}>
    <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--warn-text)" }}>
      ⚠ {riesgos}
    </p>
  </div>
)}
```

**Cambios:**

1. Agregar `border: "1px solid var(--warn-line)"` al banner (el token existe en `tokens.css`).
2. Match estructura del prototipo (líneas 247-259): el ícono `⚠` separado del texto con `display: flex, gap: 8, alignItems: 'flex-start'` para que el ícono no se rompa con texto largo.

Versión final:

```tsx
{riesgos && (
  <div style={{
    padding: "10px 12px",
    background: "var(--warn-bg)",
    border: "1px solid var(--warn-line)",
    borderRadius: "var(--radius-md)",
    marginBottom: "var(--space-3)",
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
  }}>
    <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
    <p style={{
      margin: 0,
      fontSize: "var(--fs-xs)",
      color: "var(--warn-text)",
      lineHeight: 1.4,
    }}>
      {riesgos}
    </p>
  </div>
)}
```

---

## Pulido 5 — Sticky bottom Cocinar: position sticky + gradient fade

**Archivo:** `src/components/receta/CocinarSticky.tsx`

**Estado actual:** `position: fixed` con `maxWidth: 480` centrado. Funciona, pero en desktop el botón queda flotando independiente del contenedor; tampoco hay transición visual entre el contenido scrolleado y el botón (línea dura por `borderTop`).

**Cambio:** pasarlo a `position: sticky` con un gradient fade arriba en vez del border. Match prototipo líneas 363-384.

Reemplazar el componente entero por:

```tsx
// src/components/receta/CocinarSticky.tsx — botón sticky bottom "Empezar a cocinar"

interface CocinarStickyProps {
  onClick: () => void;
}

export function CocinarSticky({ onClick }: CocinarStickyProps) {
  return (
    <div style={{
      position: "sticky",
      bottom: 0,
      marginTop: "var(--space-7, 28px)",
      padding: "12px 0 calc(20px + env(safe-area-inset-bottom, 0px))",
      background: "linear-gradient(180deg, rgba(253,250,246,0) 0%, var(--bg) 35%)",
      zIndex: 10,
    }}>
      <button
        onClick={onClick}
        className="btn btn-primary"
        style={{
          width: "100%",
          boxShadow: "0 6px 18px rgba(138, 74, 47, 0.28)",
          fontSize: "var(--fs-base)",
          fontWeight: 600,
          padding: "15px 16px",
          borderRadius: "var(--radius-lg)",
        }}
      >
        Empezar a cocinar
      </button>
    </div>
  );
}
```

**Notas:**

- `position: sticky` queda dentro del flujo del contenedor — sin más cuelga centrado de la ventana en desktop.
- El gradient hace de transición visual con el contenido scrolleado (reemplaza el `borderTop` duro de la versión anterior).
- Quitamos el `maxWidth: 480` porque ya no hace falta — el sticky respeta el ancho del padre.
- `bottomPad` en `DetalleReceta.tsx` (que estaba en 100 para compensar el `position: fixed`) **probablemente ya no haga falta** — el `position: sticky` no quita espacio del flujo. Verificar y, si está, ponerlo en 0 o eliminar el cálculo:

```tsx
// En DetalleReceta.tsx, verificar y simplificar:
// const bottomPad = isJP ? 100 : 0;     ← eliminar
// <div style={{ paddingBottom: bottomPad }}>   ← cambiar a sin paddingBottom
```

---

## Pulido 6 — AccionesPlan: sacar el acordeón, botones visibles, ocultar los no elegibles

**Archivo:** `src/components/receta/AccionesPlan.tsx`

**Estado actual:** los 3 botones (Elegir como Especial / Sumar como Especial extra / Sumar como En proceso) viven **dentro de un acordeón plegado por defecto**. El usuario tiene que tocar el header "Agregar al plan de la semana" para verlos. Cuando una acción está disabled, su razón aparece como `<p>` afuera del botón.

**Estado deseado (que era el comportamiento original antes del rediseño):**

1. **Sin acordeón.** Los botones visibles directamente, uno debajo del otro. Cero clicks previos.
2. **Si `puede: false` para una acción, el botón se oculta** (no se renderiza). No se muestra disabled con razón — directamente no aparece.
3. **Si `puede: true`, se muestra el botón habilitado.** El handler de `DetalleReceta.tsx` (ya escrito, no tocar) decide si pedir confirmación de reemplazo cuando hay una Especial existente.

### Reescritura completa del componente

Reemplazar `src/components/receta/AccionesPlan.tsx` por:

```tsx
// src/components/receta/AccionesPlan.tsx — acciones de plan para JP en detalle de receta
//
// Tres botones que arman el plan de la semana desde la receta: Especial / Extra / En proceso.
// Reglas:
//   - Si una acción no es elegible (puede: false), el botón se oculta.
//   - Si es elegible pero hay conflicto resolvable (ej. ya hay Especial),
//     el botón se muestra; el handler en la página decide si pedir confirmación.

interface Elegibilidad {
  puede: boolean;
  razon?: string;
}

interface AccionesPlanProps {
  elegEspecial: Elegibilidad;
  elegExtra: Elegibilidad;
  elegEnProceso: Elegibilidad;
  loadingAccion: "especial" | "extra" | "enproceso" | null;
  onEspecial: () => void;
  onExtra: () => void;
  onEnProceso: () => void;
}

export function AccionesPlan({
  elegEspecial, elegExtra, elegEnProceso,
  loadingAccion,
  onEspecial, onExtra, onEnProceso,
}: AccionesPlanProps) {
  // Si ninguna acción es elegible, no mostrar la sección entera.
  const algunaDisponible = elegEspecial.puede || elegExtra.puede || elegEnProceso.puede;
  if (!algunaDisponible) return null;

  return (
    <section style={{ marginBottom: "var(--space-3)" }}>
      <p style={{
        fontSize: "var(--fs-xs)",
        fontWeight: 600,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: "var(--space-2)",
      }}>
        Agregar al plan de la semana
      </p>
      {elegEspecial.puede && (
        <AccionBtn
          label="Elegir como Especial"
          loading={loadingAccion === "especial"}
          disabled={loadingAccion !== null}
          onClick={onEspecial}
        />
      )}
      {elegExtra.puede && (
        <AccionBtn
          label="Sumar como Especial extra"
          loading={loadingAccion === "extra"}
          disabled={loadingAccion !== null}
          onClick={onExtra}
        />
      )}
      {elegEnProceso.puede && (
        <AccionBtn
          label="Sumar como En proceso"
          loading={loadingAccion === "enproceso"}
          disabled={loadingAccion !== null}
          onClick={onEnProceso}
        />
      )}
    </section>
  );
}

function AccionBtn({
  label, loading, disabled, onClick,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "12px 14px",
        marginBottom: "var(--space-2)",
        borderRadius: "var(--radius-md)",
        background: "var(--primary-soft)",
        border: "1px solid transparent",
        cursor: disabled ? "default" : "pointer",
        opacity: loading ? 0.6 : 1,
        textAlign: "left",
        fontFamily: "inherit",
        fontSize: "var(--fs-sm)",
        fontWeight: "var(--fw-semibold)",
        color: "var(--primary)",
      }}
    >
      {loading ? "…" : label}
    </button>
  );
}
```

### Por qué este diseño

- **`if (!algunaDisponible) return null;`** — si la receta no admite ninguna acción (ej. ya está activa en otro tipo, o `tipoItem` la deja sin opciones válidas), la sección entera se oculta. El espacio queda libre para que las pills y los ingredientes suban en la pantalla.
- **`disabled={loadingAccion !== null}`** durante una operación en curso, los otros botones se bloquean para evitar doble click. El que está cargando muestra "…".
- **No hay manejo de `razon` en este componente.** La razón vive ahora solo en los `showToast` que el handler dispara cuando algo falla, no en el botón. Como los botones que no se pueden no se muestran, el caso "click en disabled" no existe.
- **Conserva el patrón visual del prototipo** (color suave `--primary-soft`, label en `--primary`, padding generoso) sin la caja contenedora con borde — la lista de botones se integra al flujo de la página.

### Cambios en `DetalleReceta.tsx` (mínimos)

El handler `handleEspecial` y los demás **no se tocan** — siguen evaluando elegibilidad, mostrando toasts en caso de error, y disparando `setConfirm` cuando hay reemplazo de Especial. Solo verificar que el llamado a `<AccionesPlan>` siga pasando las mismas props que antes — las props no cambian.

---

## Checks

- [ ] **MetaCards**: las 3 cards no tienen borde. El sub de la card "Total" dice "X min activo" (no "Activo: X min").
- [ ] **Ingredientes**: el último ingrediente de cada góndola NO tiene línea debajo. Sí hay línea sutil entre items.
- [ ] **Pasos**: el tiempo del paso (cuando existe) está en la misma línea que el título, alineado a la derecha. No está en uppercase. No está en línea separada.
- [ ] **Riesgos**: el banner ⚠ tiene borde (`--warn-line`). El ícono y el texto están bien separados, no pegados.
- [ ] **Cocinar sticky**: scrolleando hacia abajo, el botón se queda pegado al pie. No hay línea dura encima — hay un gradient suave del color del fondo. En desktop, el botón respeta el ancho del contenedor (no flota centrado de la ventana).
- [ ] **AccionesPlan**: los botones disponibles se ven directamente, sin tocar nada para abrirlos. Con la app sin Especial elegida, debe verse "Elegir como Especial" y "Sumar como En proceso" (Extra no se ve hasta que haya Especial). Con una Especial ya elegida y siendo "Receta principal", se ve "Elegir como Especial" + "Sumar como Especial extra" + "Sumar como En proceso"; tocar "Elegir como Especial" abre confirmación de reemplazo. Si una receta ya está activa en otro tipo, no se ve ningún botón (sección entera oculta).
- [ ] `npm run build` sin warnings nuevos.

---

## Fuera de scope

- No tocar la **estructura macro** del detalle de receta (orden de secciones, header, etc) — eso lo cerró E7.5.
- No agregar features nuevas (filtrar ingredientes, expandir todos los pasos, etc).
- No tocar `IngredienteChip`, `GondolaChip`, `RecetaPill` — están bien.

---

## Cierre del reporte de Code

- Diff de los 5 archivos modificados.
- Screenshot del detalle de una receta cualquiera (idealmente una con `riesgos` y `tiempoEstimadoLabel` en algún paso, para validar 4 pulidos en una sola pantalla).
- Confirmación del check de scroll: pegar el botón sticky se ve con el gradient (no con border duro).

## Commit

```
Stage E7.6: pulidos cosméticos del detalle de receta
```

```
Docs: MAPEO — E7.6 pulidos detalle receta
```
