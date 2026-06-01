# PROMPT E8.1 — Pulido de diseño (micro-modificaciones del ciclo UI)

> **Etapa 8 — ciclo de diseño post-E7.13.** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** v1.8.8 (si ya se aplicó el §11 Lote 8) o v1.8.7. Verificá el
> header antes de tocar y reportá la versión real.
> **Al terminar: commit + push al repo** (dejar local y git iguales) — ver "Cierre".

## Por qué

Lote de micro-ajustes visuales definidos en el ciclo de diseño (UI Kit mobile). Son cambios
chicos sobre pantallas existentes; van todos juntos en un PR de "pulido". **No cambian el
modelo de datos ni la lógica.** El dark mode y las features grandes van en prompts aparte
(E8.2+).

> Nota: durante el diseño se detectaron tweaks que el código **ya tenía bien** (el saludo del
> dashboard de miembro ya no tiene avatar; no hay botón "Importar menú" en el tope de
> Biblioteca). Esos NO están acá. Este prompt solo trae deltas reales.

## Cambios de código

### 1. Home — resumen "comidas" sin "planeadas"  (`src/routes/Home.tsx`)
En el resumen del header (hoy ~líneas 208-209):
```
? "Sin comidas planeadas"
: `${planes.length} ${planes.length === 1 ? "comida planeada" : "comidas planeadas"}`
```
Cambiar a:
```
? "Sin comidas"
: `${planes.length} ${planes.length === 1 ? "comida" : "comidas"}`
```

### 2. WeekStrip — los días con comida usan el mismo punto que hoy  (`src/components/WeekStrip.tsx`)
Hoy: el día de hoy con comida se ve relleno; **otros** días con comida se ven outlined +
punto central. Decisión de diseño: **todos los días con comida se ven igual que hoy**
(círculo relleno, color primary).

- En el render del plato, cambiar `<Plate filled={isToday} size={12} />` por
  `<Plate filled={hasMeal} size={12} />`.
- El plato de un día con comida debe pintarse en **`var(--primary)`** aunque no sea hoy
  (hoy el color del plato hereda `accentColor`, que es `--muted` si no es hoy). Ajustar para
  que cuando `hasMeal` el color sea `var(--primary)`. Ej.: envolver el `<Plate>` en un
  `<span style={{ color: hasMeal ? "var(--primary)" : accentColor }}>` o pasar el color.
- El fondo `--primary-soft` y el número en negrita siguen marcando **solo** el día de hoy
  (no tocar esa parte).

### 3. Header — logo más grande  (`src/layout/Header.tsx`)
El círculo del logo y el `PlatoMark` se agrandan:
- El `<span>` contenedor: `width/height` de **28 → 38**.
- `<PlatoMark size={16} ... />` → `size={23}`.
(El resto del header no se toca acá; el toggle de tema va en E8.2.)

### 4. (Opcional) Dashboard de miembro — badge "N por votar" tappable  (`src/routes/MemberDashboard.tsx`)
En el saludo (`Hola, {nombre}` + `Semana del …`), agregar a la derecha un chip **"N por
votar"** cuando hay pendientes de evaluar (mismo cálculo que ya usa la sección "Pendientes
de evaluar"), que al tocarlo navega al primer plan pendiente (`/voto/:idPlan`). Estilo:
fondo `--warn-bg`, borde `--warn-line`, texto `--warn-text`, pill redondeado. Si no hay
pendientes, no se muestra. **Si agrega complejidad o roza el layout, dejarlo para otro PR y
reportarlo** — no es bloqueante.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)

1. Bump del header: patch +1 (ej. v1.8.8 → v1.8.9). Reportá la versión real.
2. Agregar subsección `### 1.2.E8.1 Cambios en vX.Y.Z (E8.1 — pulido de diseño)` con los 3-4
   cambios de arriba, en el mismo estilo conciso de las otras subsecciones 1.2.x.
3. En la tabla/registro de prompts del final, agregar la entrada
   `**PROMPT_E8.1_pulido_diseño.md** ✅ CERRADO (vX.Y.Z)` con una línea de resumen.

## Criterio de aceptación
1. Reportá la versión del header antes y después.
2. `npm run build` / typecheck verde; tests existentes verdes.
3. Home dice "N comidas" / "Sin comidas".
4. En el WeekStrip, días 28 y 30 (con comida) se ven con el mismo punto relleno primary que
   hoy (27).
5. El logo del header se ve notablemente más grande.
6. Pegá el diff de la subsección 1.2.E8.1 del MAPEO.

## Fuera de scope
- Dark mode (E8.2). Catálogo editable (E8.3). Ingredientes por rol (E8.4).
- No tocar lógica de datos ni queries.

## Cierre — dejar local y git iguales
Al terminar y pasar el build/tests:
```
git add -A
git commit -m "E8.1: pulido de diseño (Home comidas, WeekStrip puntos, header logo) + MAPEO"
git push
```
Confirmá que el push quedó OK para que el working copy local y el remoto queden idénticos.
