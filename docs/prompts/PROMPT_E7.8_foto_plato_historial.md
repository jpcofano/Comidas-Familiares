# PROMPT E7.8 — Foto del plato en el detalle del historial

> **Fuente de verdad del modelo:** `MAPEO_FIRESTORE.md` (en project knowledge).
> **App en producción:** `https://comida-familiar.web.app`. **Proyecto Firebase:** `comida-familiar`.
> **Owner y único tester:** JP (`jpcofano@gmail.com`).
> **Rol del asistente:** JP no programa. Este prompt se guarda como `docs/prompts/PROMPT_E7.8_foto_plato_historial.md`, se commitea y se pasa a Claude Code.

---

## Objetivo de producto

Después de que una comida queda evaluada (entrada en `/historial`), cualquier miembro de la familia puede **subir una foto del plato terminado** desde la pantalla de **detalle del historial**. La foto queda guardada y se ve al volver a abrir ese detalle. No se saca al cocinar ni al votar: es una acción posterior, opcional, sobre una entrada de historial que ya existe.

Costo objetivo: **$0, plan Spark, sin tarjeta, sin Cloud Storage.** La foto se comprime en el cliente y se guarda como base64 en Firestore.

---

## Decisión arquitectónica (NO negociable)

La foto **NO** va en el doc `/historial/{idHist}`. La lista del historial (`getHistorialReciente`) baja las 30 entradas más recientes de una sola query; si cada doc llevara una foto base64, abrir el historial descargaría decenas de MB. 

La foto vive en un **sub-doc dedicado**: `/historial/{idHist}/media/foto`. La lista nunca lo lee. Solo `HistorialDetalle` hace un `getDoc` extra para traerla cuando se abre el detalle.

**Shape del nuevo sub-doc** `/historial/{idHist}/media/foto`:

```typescript
{
  dataUrl: string,          // "data:image/jpeg;base64,..." — la foto comprimida
  contentType: "image/jpeg",
  byMemberId: string,       // memberId de quien la subió (resolveMemberId)
  updatedAt: Timestamp      // serverTimestamp()
}
```

El id del doc es literalmente la string `"foto"` (una sola foto por entrada de historial; subir otra la reemplaza).

---

## Diagnóstico requerido ANTES de codear

No escribas ni una línea hasta confirmar estos 5 puntos leyendo el repo real. Reportámelos y esperá mi "procedé".

- **D1.** En `src/data/historial.ts`: ¿cómo se llaman exactamente las funciones existentes (`getHistorialReciente`, `getHistorialPorId`) y de dónde se importan el tipo `Result<T, AppError>` y el constructor de `AppError`? Pegá las primeras ~20 líneas del archivo (imports + firma de una función write existente como referencia del patrón).
- **D2.** En `src/routes/HistorialDetalle.tsx`: ¿cómo obtiene hoy el doc de historial (hook `useDoc`, llamada directa a `getHistorialPorId`, otro)? ¿Cuál es el `idHist` disponible en la ruta (de `useParams`)? Pegá el bloque donde se carga el dato.
- **D3.** Clases del design system realmente en uso para botones y para una "card" contenedora. Confirmá si existen `btn-primary` y `btn-secondary` (o cómo se llaman) y la clase de card sin sombra. NO inventes clases nuevas — reusá las que ya hay.
- **D4.** En `firestore.rules`: pegá el bloque `match /historial/{idHist} { ... }` actual y confirmá el nombre del helper de autorización (`isFamilyMember()`) y de la función que resuelve el memberId del usuario logueado (`resolveMemberId()` o como se llame).
- **D5.** ¿Cómo se importan hoy `serverTimestamp`, `doc`, `getDoc`, `setDoc`, `deleteDoc` del SDK en la capa `src/data/`? Pegá un import de ejemplo de un módulo de data existente para replicar el estilo.

---

## Tareas

Un commit por tarea. Prefijo de mensaje: `Stage 7.8:`. Push solo al final, tras pasar TODOS los criterios de aceptación.

### Tarea 1 — Utilidad de compresión en cliente

Crear `src/lib/comprimirImagen.ts`. Función pura (sin Firestore), testeable:

```typescript
export async function comprimirImagen(file: File): Promise<string>
```

Comportamiento exacto:

1. Decodificar el archivo **respetando la orientación EXIF**. Usar `createImageBitmap(file, { imageOrientation: 'from-image' })`. (Esto evita que las fotos de celu salgan rotadas.)
2. Redimensionar al **lado largo = 1440px**, manteniendo aspect ratio. **Nunca agrandar**: si el lado largo original es ≤ 1440px, conservar el tamaño original.
3. Dibujar en un `<canvas>` y exportar con `canvas.toDataURL('image/jpeg', calidad)`.
4. **Presupuesto de tamaño (clave):** el `dataUrl` resultante debe quedar **≤ 900.000 caracteres** (margen seguro bajo el límite de 1 MiB de Firestore, contando el overhead del sub-doc). Lógica:
   - Calidad inicial: `0.82`.
   - Si `dataUrl.length > 900000`, reintentar bajando calidad en pasos: `0.82 → 0.78 → 0.74 → 0.70 → 0.66 → 0.62`.
   - Si en `0.62` todavía supera el presupuesto, **redimensionar a lado largo = 1080px** y repetir el barrido de calidad desde `0.82`.
   - Si aun así no entra (caso patológico), tirar un error claro: `"La imagen es demasiado grande incluso comprimida"`.
5. Devolver el `dataUrl` final (string que arranca con `data:image/jpeg;base64,`).

Notas:
- Liberar el `ImageBitmap` con `.close()` al terminar.
- No usar librerías externas (no agregar dependencias a `package.json`).

**Tests Vitest** (`src/lib/comprimirImagen.test.ts`): al menos validar que (a) una imagen chica no se agranda y (b) la función devuelve un string que empieza con `data:image/jpeg;base64,`. (Mockear canvas/createImageBitmap según haga falta en jsdom; si el entorno de test no soporta canvas real, dejar un test mínimo de la firma + un `console.warn` documentado, no romper la suite.)

**Commit:** `Stage 7.8: add comprimirImagen util (client-side resize + quality budget)`

---

### Tarea 2 — Capa de datos: foto del historial

En `src/data/historial.ts`, agregar tres funciones que operan sobre la subcollection `media`, doc id `"foto"`. Respetar el patrón existente del módulo: **reads tiran excepción** (capturadas por error boundary), **writes devuelven `Result<void, AppError>`**.

```typescript
// READ — devuelve la dataUrl o null si no hay foto. Tira en error de red real.
export async function getFotoHistorial(idHist: string): Promise<string | null>

// WRITE — guarda/reemplaza la foto. byMemberId = resolveMemberId del usuario actual.
export async function setFotoHistorial(
  idHist: string,
  dataUrl: string,
  byMemberId: string
): Promise<Result<void, AppError>>

// WRITE — borra la foto.
export async function deleteFotoHistorial(idHist: string): Promise<Result<void, AppError>>
```

Detalles:
- Ref: `doc(db, "historial", idHist, "media", "foto")`.
- `getFotoHistorial`: `getDoc` → si no existe, `return null`; si existe, `return snap.data().dataUrl ?? null`.
- `setFotoHistorial`: `setDoc(ref, { dataUrl, contentType: "image/jpeg", byMemberId, updatedAt: serverTimestamp() })`. Envolver en try/catch y devolver `Result` (ok / err con `AppError`).
- `deleteFotoHistorial`: `deleteDoc(ref)`, mismo wrapper `Result`.
- No tocar `getHistorialReciente` ni `getHistorialPorId` — la lista sigue sin saber de la foto.

**Commit:** `Stage 7.8: data layer for historial plate photo (media subdoc)`

---

### Tarea 3 — Security Rules de la subcollection

En `firestore.rules`, dentro del match de historial, agregar el match de la subcollection `media` con la misma regla que el padre:

```
match /historial/{idHist} {
  allow read, write: if isFamilyMember();
  match /media/{mediaId} {
    allow read, write: if isFamilyMember();
  }
}
```

(Usar el nombre real del helper confirmado en D4.) Desplegar reglas con el flujo habitual del repo (no a mano desde consola).

**Commit:** `Stage 7.8: firestore rules for historial media subcollection`

---

### Tarea 4 — UI en el detalle del historial

En `src/routes/HistorialDetalle.tsx`, agregar una sección **"Foto del plato"** (ubicarla después del bloque de promedio/resultado, antes o después de los datos del cocinero — donde quede natural con el layout actual).

Estados y comportamiento:

1. **Carga:** al montar (o junto a la carga del doc de historial), llamar `getFotoHistorial(idHist)`. Mientras carga, mostrar un placeholder discreto ("Cargando foto…" o skeleton). Esta llamada es **independiente** del fetch del doc principal — un fallo al traer la foto no debe romper el detalle.
2. **Si hay foto:** renderizar `<img>` a ancho completo dentro de la card del design system (esquinas redondeadas, sin sombra, igual que el resto). Debajo, dos botones: **"Cambiar foto"** y **"Quitar foto"**.
3. **Si no hay foto:** un solo botón **"Agregar foto del plato"**.
4. **Captura:** input oculto `<input type="file" accept="image/*" capture="environment" />`. El `capture="environment"` hace que en el celular abra la cámara trasera directo; en desktop cae a selector de archivo normal. Los botones disparan el `click()` del input.
5. **Al elegir archivo:**
   - Mostrar estado "Procesando foto…" (deshabilitar botones).
   - `dataUrl = await comprimirImagen(file)`.
   - `byMemberId` = memberId del usuario actual (de donde la app ya lo resuelve, confirmado en D1/D4).
   - `await setFotoHistorial(idHist, dataUrl, byMemberId)`.
   - Si `ok`: refrescar la foto en pantalla (volver a `getFotoHistorial` o setear el estado local con la `dataUrl` recién subida).
   - Si `err`: mostrar mensaje de error claro y dejar el botón reusable. No silenciar el error.
6. **"Quitar foto":** confirmar con un modal/diálogo del design system (NO `confirm()` nativo — el repo ya tiene un patrón de modal stylado). Al confirmar: `await deleteFotoHistorial(idHist)` → limpiar el estado → volver al botón "Agregar foto del plato".

Reglas de UI:
- Reusar **exclusivamente** clases del design system confirmadas en D3. No inventar estilos nuevos.
- Cualquier miembro logueado puede agregar/cambiar/quitar la foto (no es exclusivo de JP). Se registra `byMemberId` para trazabilidad, pero no se restringe.
- La imagen base64 puede ser de ~600–900 KB: usar `loading="lazy"` en el `<img>` por las dudas, aunque al ser una sola no es crítico.

**Commit:** `Stage 7.8: plate photo section in HistorialDetalle (add/change/remove)`

---

### Tarea 5 — Actualizar MAPEO_FIRESTORE.md (mismo flujo de docs)

En `docs/MAPEO_FIRESTORE.md`:

1. **Bump de versión** a **v1.8.2** (header línea ~3 y ~7).
2. Agregar en **§2.6** una nota indicando que la foto del plato NO vive en el doc de historial sino en la subcollection `/historial/{idHist}/media/foto`, con el shape del sub-doc.
3. Agregar entrada **§10.7** con este formato (igual a §10.5/§10.6):

```
### 10.7 Foto del plato en el detalle del historial — E7.8 ✅ CERRADO (v1.8.2)

Sub-doc /historial/{idHist}/media/foto con { dataUrl (base64 JPEG), contentType,
byMemberId, updatedAt }. Foto comprimida en cliente (src/lib/comprimirImagen.ts):
lado largo 1440px, calidad 0.82 con presupuesto ≤900KB y fallback a 1080px. NO va en
el doc principal de historial para no inflar getHistorialReciente (la lista no la lee;
solo HistorialDetalle hace un getDoc extra). Capa de datos: getFotoHistorial /
setFotoHistorial / deleteFotoHistorial en src/data/historial.ts (read tira, writes
Result). UI: sección "Foto del plato" en HistorialDetalle con add/cambiar/quitar,
input capture="environment". Cualquier miembro puede subirla. Reglas: subcollection
media hereda isFamilyMember(). Plan Spark, sin Cloud Storage, $0.
```

4. Actualizar el índice de prompts (§ correspondiente, donde están listados E7.7 etc.) agregando `PROMPT_E7.8_foto_plato_historial.md ✅ CERRADO`.

**Este cambio va en el MISMO commit que la Tarea 4** (o en un commit `Stage 7.8: docs` final, a tu criterio, pero antes del push).

---

## Criterios de aceptación (verificación LITERAL)

No reportes ✅ sin hacer cada paso. Donde dice "Firebase Console", abrir la consola y leer el dato real; donde dice "app", probar en `comida-familiar.web.app` (o local).

**A — Compresión**
- A1. En la app, en un detalle de historial, subir una foto grande de celular (3–5 MB). NO debe fallar.
- A2. En Firebase Console → `historial/{ese idHist}/media/foto`: el campo `dataUrl` existe, empieza con `data:image/jpeg;base64,` y su longitud es **≤ 900.000** caracteres. Pegá la longitud real que ves (o un screenshot del doc).
- A3. Una foto vertical de celu se ve **derecha** (no rotada 90°) en el detalle. (Valida el manejo EXIF.)

**B — Persistencia y aislamiento de la lista**
- B1. Subida la foto, recargar la página (Ctrl+Shift+R) y volver a abrir ese detalle → la foto sigue ahí.
- B2. Abrir la **lista** de historial (`/historial`) con DevTools → Network. Confirmar que la respuesta de la query de la lista NO incluye las dataUrl base64 (la lista no debe pesar megas). Reportá el tamaño aproximado de la respuesta de la lista.

**C — Cambiar y quitar**
- C1. "Cambiar foto" en una entrada que ya tiene foto → subir otra → en Console el `dataUrl` cambió y `updatedAt` es más reciente. Sigue habiendo UN solo doc `media/foto`.
- C2. "Quitar foto" → confirmar en el modal stylado (NO confirm nativo) → en Console el doc `media/foto` **ya no existe** → en la app vuelve a aparecer "Agregar foto del plato".

**D — Doc de historial intacto**
- D1. En Console, el doc `/historial/{idHist}` (el padre) **no** ganó ningún campo de foto. Sigue con el shape de §2.6.

**E — Reglas**
- E1. Pegá el bloque `match /historial/{idHist}` final de `firestore.rules` con la subcollection `media`.
- E2. Confirmar deploy de reglas (output del comando de deploy).

**F — Docs**
- F1. `MAPEO_FIRESTORE.md` en v1.8.2 con §10.7 agregada y la nota en §2.6. Pegá el diff de esas secciones.

---

## Recordatorio

Lección de etapas anteriores: reportar ✅ sin evidencia literal genera bugs que aparecen después. Para CADA criterio A–F, traé el dato real (longitud, screenshot del doc, tamaño de respuesta, diff), no una afirmación.

Primero el **diagnóstico (D1–D5)** y esperás mi confirmación. Recién ahí codeás.
