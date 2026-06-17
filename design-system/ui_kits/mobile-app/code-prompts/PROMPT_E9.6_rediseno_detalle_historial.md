# PROMPT E9.6 — Rediseño del detalle de Historial (estrellas doradas + notas con peso)

> **Etapa 9 — Lote 9.** Toca código + `docs/MAPEO_FIRESTORE.md`. Cambio de UI.
> **MAPEO vigente esperado:** ≥ v2.0.2 (idealmente después de E9.2, que recablea el Historial).
> Verificá el header y reportá. **Al terminar: commit + push.**
>
> Numeración: E9.0/E9.0.1/E9.1, E9.2 (fix Historial), E9.3 (matcher), E9.4 (sustitución),
> E9.5 (Biblioteca) ya asignados. Esto es **E9.6**. (Equivalencias en compras pasa a E9.7.)

## Por qué

En `src/routes/HistorialDetalle.tsx` el detalle se lee bien pero "no cierra": las notas por
miembro son números chicos sin escala visible, y el hero muestra `9.2 / 10` en texto. Decisión
de diseño (validada en el prototipo del kit):
- **Sacar el "/ 10"** del hero (y de cualquier lado). La escala se comunica con **estrellas**, no
  con texto.
- **Subir el peso** de la nota por miembro y **anclarla** a la derecha junto a sus estrellas.
- Reservar el color de marca (`--primary`) para el promedio; las notas individuales en
  `--text-strong`.
- Estrellas en un **dorado cálido** (no el bordó `--accent` actual).

## Lo que ya existe (usar)
- Componente `Stars` en `src/components/historial/Stars.tsx` (props `value`, `max=5`, `scale`).
  Hoy pinta con `fill="var(--accent)"`. Lo usa el **listado** de Historial (`HistorialCard`).
- `HistorialDetalle.tsx` ya tiene hero (promedio + `ResultadoBadge` + fecha/ocasión), bloque
  "Calificaciones" (MemberAvatar + nombre + nota, "Sin voto" si `null`), foto y notas.

## Cambios de código

### 1. Token de color de estrella (sistémico) — `src/styles/tokens.css`
Agregar un token nuevo en `:root` y en `[data-theme="dark"]`:
```css
:root          { --estrella: oklch(0.76 0.14 78); }
[data-theme="dark"] { --estrella: oklch(0.80 0.14 80); }  /* un toque más luminoso sobre oscuro */
```
En `Stars.tsx`, cambiar `fill="var(--accent)"` → **`fill="var(--estrella)"`**. Esto recolorea las
estrellas **también en el listado** (coherencia buscada: lista y detalle con el mismo dorado).

### 2. Hero del detalle — sacar "/ 10", sumar estrellas
En `HistorialDetalle.tsx`, en el bloque del hero:
- **Eliminar** el `<span> / 10</span>` que acompaña al promedio.
- Debajo del número (entre el promedio y el `ResultadoBadge`), agregar una fila centrada:
  `<Stars value={entry.promedio} scale={10} />` (tamaño un poco mayor, ej. estrellas de ~16px;
  si hace falta, exponé un `size`/escala en `Stars` o envolvé en un wrapper que agrande).
- Formato del número consistente: `entry.promedio.toFixed(1)`.

### 3. Calificaciones por miembro — estrellas + nota con peso
En cada fila de `MIEMBRO_IDS`:
- Reemplazar el `<span>` de la nota por un **cluster a la derecha**: `Stars value={nota} scale={10}`
  + el número con **`fontSize: 18`, `fontWeight: 700`, `color: var(--text-strong)`,
  `fontVariantNumeric: "tabular-nums"`**, alineado a la derecha (sin el hueco muerto: agrupar
  estrellas + número en un mismo contenedor `inline-flex` con `gap`).
- Si `nota == null`: mantener **"Sin voto"** en `--muted`, **sin estrellas**.
- El comentario por miembro queda igual debajo.

### 4. No tocar la lógica de datos
Solo presentación. `getHistorialPorId`, foto, notas del cocinero, navegación: sin cambios.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch. Reportá versión.
2. Subsección `### 1.2.E9.6 Cambios en vX.Y.Z (E9.6 — rediseño detalle Historial)`: token
   `--estrella`, estrellas en hero + filas, notas con peso, se quitó el "/ 10". Notar que el
   recoloreo de `Stars` impacta también el listado (intencional).
3. Registrar `**PROMPT_E9.6_rediseno_detalle_historial.md** ✅ CERRADO (vX.Y.Z)` en §11 Lote 9.

## Criterio de aceptación
1. El hero muestra el promedio (en `--primary`) con una fila de **estrellas doradas** debajo, y
   **sin "/ 10"** en ningún lado.
2. Cada miembro con voto muestra **estrellas doradas + su nota en número grande y negrita**
   (`--text-strong`), anclada a la derecha; "Sin voto" se mantiene para los `null`.
3. Las estrellas del **listado** de Historial también quedan en el dorado nuevo (mismo token).
4. Light y dark se ven bien. Build + typecheck + tests verdes.
5. Pegá el diff de `HistorialDetalle.tsx`, `Stars.tsx`, `tokens.css` y la subsección 1.2.E9.6.

## Fuera de scope
- Reordenar las notas o marcar la más alta/baja (no se pidió).
- Tocar el helper de datos o la foto/notas.

## Cierre
```
git add -A
git commit -m "E9.6: rediseño detalle Historial — estrellas doradas (token --estrella) + notas con peso + saca '/ 10' + MAPEO"
git push
```
Confirmá push OK.
