# PROMPT E12.2 — Cocina de origen en la card de Biblioteca (con "mundito", primero)

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> Fix de formato chico y acotado. **Numerar al próximo libre** si `E12.2` ya existe.

## Problema

El campo `receta.cocina` (cocina de origen: Argentina, Mexicana, etc.) se muestra en el
**detalle** pero **NO en la lista de Biblioteca**. En `src/routes/Biblioteca.tsx`, el
componente local `RecetaCard` (línea ~42) arma la fila de meta solo con proteína · tiempo ·
dificultad — la cocina nunca se renderiza, aunque el dato existe y el filtro "Todas las
cocinas" sí opera sobre ella.

## Cómo debe quedar (espejo del diseño aprobado en el UI kit)

En el prototipo (`ui_kits/mobile-app/BibliotecaScreen.jsx`) la cocina va **primera** en la
fila de meta, con **ícono de globo ("mundito") + texto, resaltada en color primary y peso
600** — para distinguirla del resto de la meta, que queda en muted. Markup de referencia:

```jsx
<div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
  {receta.cocina && (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontWeight: 600 }}>
      <Globe size={13} strokeWidth={2}/>{receta.cocina}
    </span>
  )}
  <span>{receta.proteinaPrincipal}</span>
  <span>{receta.tiempoTotalLabel}</span>
  <span>{dificultadLabel(receta.dificultadOrden)}</span>
</div>
```

## Tarea 1 — Implementar en `RecetaCard` (`src/routes/Biblioteca.tsx`)

- Importar el ícono globo de lucide-react: `import { Globe } from "lucide-react";`
  (el archivo ya importa `Plus, Carrot, ChevronRight, Users` de ahí — agregá `Globe` a esa línea).
- En la fila de meta de `RecetaCard`, **antes** de proteína/tiempo/dificultad, renderizar
  `receta.cocina` solo si existe, como el `<span>` con `<Globe size={13} strokeWidth={2}/>`,
  color `var(--primary)`, `fontWeight: 600`, `display: inline-flex`, `gap: 4`.
- El resto de la meta (proteína, tiempo, dificultad) queda como está, en `var(--muted)`.
- Si `receta.cocina` es vacío → no renderizar nada (no "Sin clasificar" en la lista; eso es
  acción de JP y vive en el detalle).

> Nota: hoy la card usa `className="meta"` por ítem. Podés mantener eso para proteína/tiempo/
> dificultad y agregar el span de cocina con estilo inline primary; o unificar la fila al
> patrón del kit (contenedor `color: var(--muted)` + spans). Lo importante: la cocina va
> **primera, con globo, en primary 600**.

## Tarea 2 — Unificar el label de dificultad (coherencia)

En la card, la dificultad se renderiza como `receta.dificultad` (string crudo) mientras que
la pestaña Menús usa `dificultadLabel(derived.dificultadOrden)`. Unificar la card de receta
para usar `dificultadLabel(receta.dificultadOrden)` y que se vea igual en toda la Biblioteca.

## Verificación de paridad con el UI kit (importante)

Comparar `RecetaCard` del repo contra `RecetaCard` de `ui_kits/mobile-app/BibliotecaScreen.jsx`
y confirmar que estas mejoras del kit están en el código real. Reportar cuáles faltaban:
- [ ] Cocina con globo, primera, en primary 600 ← (esta es la del fix)
- [ ] Badge de `tipoItem` arriba a la derecha (cápsula gris)
- [ ] Badges "Sin lácteos" / "Sin hidratos" abajo con colores ok/info
- [ ] Hover de borde en la card
Si alguno de los otros falta, dejalo anotado (no hace falta implementarlo en este lote salvo
que sea trivial), para decidir después.

## Criterios de aceptación

- En la lista, las recetas con cocina muestran "🌐 Argentina" (globo + texto) primero y
  resaltado; las sin cocina no muestran hueco.
- El detalle sigue igual (no tocar).
- Dificultad consistente entre pestaña Recetas y Menús.
- `npm run build` sin errores. Tests verdes.

## Qué NO tocar

- NO `DetalleReceta.tsx` (ya muestra la cocina).
- NO `src/lib/filtros.ts` (ya filtra por `cocina`).
- NO `RecetaCardV2.tsx` (ese es de la lista de compras).

## Cierre

- Commit: `E12.2: cocina de origen con globo (primera) en card de Biblioteca + unificar dificultad`.
- `npm run build && firebase deploy --only hosting`. `git push`.
