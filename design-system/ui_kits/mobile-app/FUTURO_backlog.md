# Futuro / Backlog — Comida Familiar (post Etapa 8)

> Todo lo que pensamos para más adelante, en un solo lugar. Cuando algo entre en un ciclo,
> se mueve a un prompt `E{N}.x` y se registra en `MAPEO §11`.
> El §11 del MAPEO sigue siendo la fuente de verdad; esto es la cantera de ideas.

## A. Estado en Code (v2.0.1)
- **Etapa 8 completa** — E8.5–E8.8 corridos. Ya **no** hay nada "diseñado pendiente de correr" de la 8.
- **E9.0 / E9.0.1 / E9.1 corridos** — proteínas jerárquicas + faceta Dieta
  (`esVegetariano`/`esKeto`) + diccionario canónico (265), blindar prompt generador, y prompt del
  importador con vocabulario canónico.
- ⚠️ **Regresión del Historial** (commit `11ff3df0`): route pisado por una lista plana,
  componentes ricos huérfanos. Fix = **E9.2** (correr primero).

## A·bis. Lote 9 — "Cocinar con lo que hay" (en curso)
- **E9.2 — fix regresión Historial** (recablear `SummaryMetrics`/`FilterChips`/`MonthGroup`/`HistorialCard`) — **prompt listo**.
- **E9.3 — Qué cocino con lo que tengo** (matcher inverso, ex-7.2) — diseñado, **prompt listo**.
- **E9.4 — Sustitución al cocinar** ("o {sustituto}" en detalle/paso a paso) — diseñado, **prompt listo**.
- **E9.5 — Equivalencias en la lista de compras** — diseñado, prompt pendiente.

## B. Próximas features (sin prompt todavía — candidatas a Etapa 9+)

### Cocina con lo que hay
- **"Qué cocino con lo que tengo"** — **ya en curso como E9.3** (ver A·bis). El matcher inverso
  completo; E8.5 fue la versión liviana.
- **Aplicar equivalencias en la lista de compras** — si falta manteca y hay aceite (marcado
  como sustituto en E8.7), sugerirlo al armar la compra.
- **Sustitución al cocinar** — mostrar "o {sustituto}" junto al ingrediente en el detalle de
  receta / paso a paso (usa las equivalencias de E8.7).

### Edición y catálogo
- **Editor completo de receta** (no solo clasificación): ingredientes, pasos, nombre. E8.6
  hizo solo el bloque de clasificación; esto sería el paso grande.
- **Historial de cambios del catálogo** — auditoría: quién completó/editó/fusionó qué
  ingrediente (es data compartida entre la familia).
- **Recalcular `vecesUsado`** de forma exacta (recontando referencias) tras fusiones/borrados.
- **Mejor detección de duplicados** — sumar fuzzy/sinónimos al detector del catálogo (E8.8
  arrancó con igualdad + prefijo).

### Menús
- **Importar menú** — UI dedicada paso a paso (análoga a Importar receta; el parser
  `parseMenu.ts` ya existe).
- **Cocinar menú** — paso a paso multi-receta (hoy "Cocinar" es de una sola receta).

### App / sistema
- **Pantalla de Ajustes** — mudar ahí el toggle de dark mode + gestión de miembros +
  notificaciones (hoy el toggle vive en el header).
- **Pulir Paso 2 del importador** — pasa a tokens de diseño (hoy usa colores hardcodeados
  `#424242/#f5f5f5/#aaa`) para que respete dark mode y la marca.

## C. Deuda chica / nits (colar en cualquier pulido)
- `WeekStrip.tsx`: limpiar comentario viejo y la rama `outlined` del `<Plate>` que ya no se usa.
- OG image: si se quiere, variante con fondo crema (hoy es terracota).

## D. Postergado sin urgencia (lo charlado, baja prioridad)
- Notificaciones / avisos como pantalla propia.
- Perfil de miembro (avatar, sus notas, su historial) como vista dedicada.

---

### Cómo priorizar
Cuando abras un ciclo nuevo: elegí 1 feature grande (B) + opcionalmente juntá nits (C) en un
prompt de pulido. Todo lo que entre se numera `E{N}.x` y se registra en `MAPEO §11`.
