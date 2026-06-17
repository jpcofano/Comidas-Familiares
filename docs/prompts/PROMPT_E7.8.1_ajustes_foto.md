# PROMPT E7.8.1 — Ajustes a la foto del plato (galería universal + reubicar al final)

> **Fuente de verdad:** `MAPEO_FIRESTORE.md` (project knowledge). App: `https://comida-familiar.web.app`. Proyecto: `comida-familiar`. Owner/tester: JP.
> **Contexto:** E7.8 (foto del plato en el detalle del historial) ya está **implementado y cerrado** en v1.8.2. Esto es un ajuste puntual sobre lo existente — NO se rehace el feature, NO se toca compresión, capa de datos, sub-doc ni reglas. Solo dos cambios de UI en `src/routes/HistorialDetalle.tsx`.

---

## Diagnóstico requerido ANTES de codear

No edites nada hasta confirmar y reportarme estos 2 puntos leyendo el archivo real. Esperá mi "procedé".

- **D1.** En `src/routes/HistorialDetalle.tsx`, pegá el JSX actual del `<input type="file" ...>` de la foto (con todos sus atributos) y la línea/handler que dispara su `click()`.
- **D2.** Pegá el orden actual de las secciones que renderiza el detalle (promedio/resultado, calificaciones, comentarios, datos del cocinero, foto del plato, links a receta/menú). Necesito ver dónde está hoy la sección "Foto del plato" respecto del resto para moverla correctamente.

---

## Cambio 1 — Galería universal (sacar `capture`)

En el `<input type="file">` de la foto, **eliminar el atributo `capture="environment"`**. Debe quedar solo:

```html
<input type="file" accept="image/*" ... />
```

(conservando el resto: `ref`/`onChange`/`hidden` o como esté hoy, `accept="image/*"` se mantiene).

**Por qué:** con `capture`, Android abre la cámara directo y saltea el selector que permite elegir de galería. Sin `capture`, todas las plataformas (Android/iOS/desktop) muestran el selector nativo del sistema, donde el usuario elige **cámara o galería** indistintamente. No se agregan botones nuevos: un solo input, el sistema operativo ofrece ambas rutas.

**Sin otros cambios:** el `File` que llega al `onChange` es idéntico venga de cámara o galería; `comprimirImagen()` ya lo maneja. No tocar el flujo de subida.

---

## Cambio 2 — Mover la sección "Foto del plato" al final del detalle

Reubicar el bloque completo de la sección "Foto del plato" para que sea **la última sección** del detalle, después de todo lo demás (después de datos del cocinero y de los links a receta/menú — al fondo del scroll).

**Por qué:** la foto puede pesar varios cientos de KB; al estar al final, quien quiera verla baja, y quien solo quiere leer votos/comentarios no la tiene encima. Es mover el JSX, no reescribir la lógica: estados, handlers, carga con `getFotoHistorial`, botones add/cambiar/quitar — todo queda igual, solo cambia su posición en el árbol de render.

Mantener: la carga de la foto (`getFotoHistorial`) sigue disparándose al montar como hasta ahora; reubicar la sección no debe convertirla en lazy ni cambiar cuándo se pide. (La foto sigue bajándose al abrir el detalle, como en E7.8 — solo se muestra más abajo.)

---

## Cambio 3 — Doc

En `docs/MAPEO_FIRESTORE.md`, actualizar la entrada **§10.7** (no crear una nueva): agregar al final del párrafo una frase indicando el ajuste v1.8.2.1 (o el sub-número que uses): input sin `capture` (galería universal) y sección de foto reubicada al final del detalle. Bump menor de versión en el header si corresponde a tu convención.

---

## Criterios de aceptación (verificación literal)

- **A1.** Pegá el JSX final del `<input type="file">` mostrando que `capture` ya NO está y `accept="image/*"` sigue.
- **A2.** En la app (Android si hay a mano, si no describí el comportamiento esperado): tocar "Agregar foto" abre el selector del sistema con opción de cámara **y** galería, no la cámara directo.
- **A3.** Subir una foto **de galería** pesada (full-res o HEIC) → entra bajo el presupuesto (`dataUrl.length ≤ 900000`, pegá la longitud real) y se ve **derecha** (EXIF ok). Esto valida que el origen galería no rompe la compresión existente.
- **A4.** En el detalle de un historial con foto: la sección "Foto del plato" es **la última** del scroll, después de datos del cocinero y links. Pegá el orden final de secciones o un screenshot.
- **A5.** Regresión rápida: cambiar y quitar foto siguen funcionando igual que en E7.8 (un solo doc `media/foto`, modal stylado al quitar).
- **A6.** `MAPEO_FIRESTORE.md` §10.7 actualizada. Pegá el diff.

---

## Recordatorio

Es un ajuste chico: dos cambios de UI sobre código que ya anda. No toques `comprimirImagen.ts`, `src/data/historial.ts`, el sub-doc `media/foto` ni `firestore.rules`. Si algo de eso parece necesario, pará y avisá antes.

Primero diagnóstico (D1–D2), esperás mi OK, después editás.
