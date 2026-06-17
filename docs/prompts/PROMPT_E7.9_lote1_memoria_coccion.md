# PROMPT E7.9 — Lote 1: memoria de cocción + notas de receta + pantalla siempre encendida

> **Fuente de verdad del modelo:** `MAPEO_FIRESTORE.md` (v1.8.2, en project knowledge).
> **App en producción:** `https://comida-familiar.web.app`. **Proyecto Firebase:** `comida-familiar`.
> **Owner y único tester:** JP (`jpcofano@gmail.com`). JP no programa.
> Guardar como `docs/prompts/PROMPT_E7.9_lote1_memoria_coccion.md`, commitear, pasar a Claude Code.

---

## Objetivo de producto

Cerrar el **loop de aprendizaje** de la app. Hoy la familia anota `queCambiaria` / `queSalioBien` al evaluar, pero ese feedback muere en el historial: nadie lo ve la próxima vez que cocina. Este lote hace que esos datos *vuelvan* en el momento justo: al cocinar.

Tres features que comparten la pantalla de cocinar/detalle y que cuestan **$0** (usan datos que ya se guardan o APIs del navegador):

1. **Memoria de cocción** — al abrir una receta para cocinarla, mostrar arriba lo que se aprendió la última vez (`queCambiaria`, `queSalioBien`, último puntaje).
2. **Notas persistentes de la receta** — un campo libre, editable, atado a la receta (no a una cocción puntual): "en nuestro horno son 180° no 200°".
3. **Wake Lock** — la pantalla no se apaga mientras se cocina.

---

## Datos: qué ya existe y qué hay que crear

Confirmado contra el MAPEO v1.8.2:

- El doc `/historial/{idHist}` (§2.x) **ya tiene** `idReceta`, `queCambiaria`, `queSalioBien`, `promedio`, `resultado`, `fechaRealizadaTimestamp`. **Feature 1 NO necesita escribir nada nuevo** — solo leer el historial más reciente de esa receta.
- El doc `/recetas/{idReceta}` (§2.2) tiene `ultimaEvaluacion` y `ultimoPuntaje`. **Feature 1 puede usar `ultimoPuntaje` directo** sin ir al historial para el puntaje; el historial se usa para los textos `queCambiaria`/`queSalioBien`.
- **Feature 2 necesita UN campo nuevo** en `/recetas/{idReceta}`: `notasCocina: string` (texto libre, editable por cualquier miembro). NO confundir con el campo `notas` existente (ese es la descripción de la receta, viene del importador). El nuevo es `notasCocina` — conocimiento operativo de la familia.
- **Feature 3 no toca datos.**

---

## Diagnóstico requerido ANTES de codear

No escribas código hasta confirmar estos puntos leyendo el repo real. Reportámelos y esperá mi "procedé".

- **D1.** En `src/data/historial.ts`: ¿hay alguna función que traiga el historial filtrado por `idReceta` (algo tipo `getHistorialPorReceta`), o solo existe `getHistorialReciente` global? Pegá las firmas existentes. (El §2 del MAPEO menciona que el índice `fechaRealizada desc` resuelve `where('idReceta','==',X)` — confirmá si esa query ya está implementada o hay que crearla.)
- **D2.** En `src/data/recetas.ts`: ¿cómo se llama la función que trae una receta por id y cuál el patrón de write (¿`Result<void, AppError>`?)? Pegá un import de ejemplo del SDK (`doc`, `updateDoc`, `serverTimestamp`) y la firma de una write existente.
- **D3.** En `src/routes/`: ¿cuál es exactamente la pantalla de "cocinar" donde caería la memoria de cocción? ¿`Cocinar.tsx`? ¿Recibe `idReceta` por `useParams`? Pegá el bloque donde carga la receta. ¿Y cuál es la de detalle (`DetalleReceta.tsx`) donde caerían las notas?
- **D4.** Clases del design system reales para: una card sin sombra, un textarea/input editable, botones primario y secundario. NO inventar clases. Pegá ejemplos en uso.
- **D5.** ¿Existe algún hook o helper de "guardar con feedback" (toast de éxito/error) que se use en otras pantallas de edición? Si hay un patrón de `showToast`, pegalo para reusarlo.

---

## Tareas

Un commit por tarea. Prefijo: `Stage 7.9:`. Push solo al final, tras todos los criterios de aceptación.

### Tarea 1 — Feature 3: Wake Lock (la más barata primero)

Crear `src/lib/useWakeLock.ts`:

```typescript
import { useEffect, useRef } from "react";

// Mantiene la pantalla encendida mientras el componente está montado.
// Silenciosamente no-op si el navegador no soporta la API (iOS < 16.4, etc).
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    async function request() {
      try {
        if ("wakeLock" in navigator) {
          // @ts-expect-error — wakeLock no está en todos los lib.dom.d.ts
          const sentinel = await navigator.wakeLock.request("screen");
          if (cancelled) { sentinel.release(); return; }
          sentinelRef.current = sentinel;
        }
      } catch {
        // Permiso denegado o no soportado — no romper la cocina.
      }
    }

    // Re-adquirir si la pestaña vuelve a foco (el lock se suelta al minimizar).
    function onVisibility() {
      if (document.visibilityState === "visible" && active) request();
    }

    request();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [active]);
}
```

Usarlo en la pantalla de cocinar (confirmada en D3). Activar el lock cuando el usuario está efectivamente cocinando (componente montado en la vista de pasos). Algo como `useWakeLock(true)` en el componente de cocción guiada.

**Notas:**
- No agregar dependencias.
- No mostrar UI ni pedir permiso explícito — la API no requiere prompt, y si falla, falla en silencio.
- iOS soporta Wake Lock desde Safari 16.4. En versiones viejas simplemente no hace nada, sin romper.

**Commit:** `Stage 7.9: useWakeLock hook + activar en pantalla de cocinar`

---

### Tarea 2 — Feature 1: Memoria de cocción

**Capa de datos.** En `src/data/historial.ts`, si NO existe ya (confirmar en D1), agregar:

```typescript
// Trae la última entrada de historial de una receta, o null si nunca se cocinó.
// READ — tira excepción en error de red (patrón del módulo).
export async function getUltimaCoccionReceta(idReceta: string): Promise<{
  promedio: number;
  resultado: string;
  queSalioBien: string;
  queCambiaria: string;
  fechaRealizada: string;
} | null>
```

- Query: `historial` where `idReceta == idReceta`, `orderBy fechaRealizadaTimestamp desc`, `limit 1`.
- Si no hay resultados → `null`.
- Si hay → devolver solo esos 5 campos (no el doc entero — la memoria solo usa eso).
- Si la query requiere un índice compuesto (`idReceta` + `fechaRealizadaTimestamp`), Firestore va a tirar un error con un link para crearlo. **Reportámelo** — lo creo yo desde la consola o lo agregás a `firestore.indexes.json` (confirmar en D1 cuál es el flujo del repo para índices).

**UI.** En la pantalla de cocinar (D3), arriba de los pasos, un bloque **"La última vez"** que solo aparece si `getUltimaCoccionReceta` devuelve algo. Contenido:

- Encabezado discreto: "La última vez (hace X / fecha)".
- Puntaje + resultado: "8 · Muy bueno".
- Si `queSalioBien` no vacío: "Salió bien: …".
- Si `queCambiaria` no vacío: "Cambiaría: …".
- Si ambos textos están vacíos pero hay puntaje, mostrar solo el puntaje/resultado.

Diseño:
- Card del design system sin sombra (D4). Tono que la distinga del resto sin gritar — algo tipo `--surface-alt` o el color de info suave que ya se use en la app.
- Esta carga es **independiente** del fetch de la receta — si falla traer la memoria, la cocina sigue funcionando. Mientras carga, no mostrar nada (o un placeholder mínimo); no bloquear los pasos.
- Es **read-only**. La memoria no se edita acá — se edita evaluando la próxima vez (`queCambiaria` se llena en `/voto`). Esto solo la muestra.

**Commit:** `Stage 7.9: memoria de coccion (getUltimaCoccionReceta + bloque "La última vez")`

---

### Tarea 3 — Feature 2: Notas persistentes de la receta

**Modelo.** Campo nuevo `notasCocina: string` en `/recetas/{idReceta}`. No requiere migración: las recetas que no lo tienen se tratan como `""`. NO tocar el campo `notas` existente.

**Capa de datos.** En `src/data/recetas.ts`:

```typescript
// WRITE — guarda las notas de cocina de la familia. Result (patrón del módulo).
export async function setNotasCocina(
  idReceta: string,
  notasCocina: string
): Promise<Result<void, AppError>>
```

- `updateDoc(doc(db, "recetas", idReceta), { notasCocina })`. Envolver en try/catch → `Result`.
- No setear `serverTimestamp` salvo que el patrón del módulo lo pida; es una nota, no necesita auditoría fina.

**UI.** En `DetalleReceta.tsx` (D3), una sección **"Notas de la familia"**:

- Si `notasCocina` está vacío: un botón discreto "+ Agregar nota" que abre un textarea.
- Si tiene contenido: mostrar el texto + un botón "Editar".
- Al editar: textarea con el contenido actual + botones "Guardar" / "Cancelar".
- Al guardar: `await setNotasCocina(idReceta, valor)` → si `ok`, mostrar el texto actualizado + toast de éxito (patrón D5); si `err`, mensaje claro y no perder lo tipeado.
- Cualquier miembro logueado puede editar (no exclusivo JP). Es conocimiento compartido de la familia.
- Placeholder del textarea sugerente: "Ej: en nuestro horno son 180° no 200°, duplicar el ajo, la salsa rinde para 2 veces…".

**Dónde ubicarla:** en el detalle, cerca de las notas/tip del cocinero existentes, o como sección propia debajo de los pasos. Que quede natural con el layout de E7.4. NO arriba del todo — es referencia, no lo primero que se mira.

**Commit:** `Stage 7.9: notasCocina por receta (campo + setNotasCocina + UI editable en detalle)`

---

### Tarea 4 — Actualizar MAPEO_FIRESTORE.md

En `docs/MAPEO_FIRESTORE.md`:

1. **Bump** a **v1.9.0** (header línea ~3 y ~7). Es un minor: agrega un campo al modelo (`notasCocina`) y features nuevas, no solo un fix.
2. En **§2.2** (`/recetas/{idReceta}`), agregar el campo `notasCocina: string` con una nota: "conocimiento operativo de la familia sobre la receta (ej. ajustes de horno), editable por cualquier miembro. Distinto de `notas` (descripción del importador). Las recetas viejas sin el campo se tratan como `''`."
3. Agregar entrada **§10.8**:

```
### 10.8 Lote 1 — memoria de cocción + notas de receta + wake lock — E7.9 ✅ CERRADO (v1.9.0)

Cierra el loop de aprendizaje. (1) Memoria de cocción: bloque "La última vez" en la
pantalla de cocinar, lee getUltimaCoccionReceta (historial where idReceta orderBy fecha
desc limit 1) → muestra último puntaje/resultado + queSalioBien/queCambiaria. Read-only,
$0, sin datos nuevos. (2) notasCocina: campo nuevo en /recetas, texto libre editable por
cualquier miembro (setNotasCocina), conocimiento operativo de la familia, distinto de
notas. UI en DetalleReceta. (3) useWakeLock: pantalla siempre encendida al cocinar via
Screen Wake Lock API, no-op silencioso si no soportada. Sin Cloud, plan Spark, $0.
```

4. Actualizar el índice de prompts agregando `PROMPT_E7.9_lote1_memoria_coccion.md ✅ CERRADO`.
5. Si se creó un índice compuesto para la query de memoria, anotarlo donde el MAPEO documenta los índices de Firestore.

**Commit:** `Stage 7.9: docs MAPEO v1.9.0`

---

## Criterios de aceptación (verificación literal — traé el dato real, no "✅")

**A — Wake Lock**
- A1. (Manual, celular o desktop con DevTools) Abrir una receta en modo cocinar y dejar la pantalla quieta. En desktop, DevTools → no hay forma directa de ver el lock, pero confirmar que `navigator.wakeLock.request('screen')` no tira y que el sentinel se crea (un `console.log` temporal del sentinel sirve para verificar; quitar antes del commit final).
- A2. En un navegador sin soporte (o forzando el catch): la pantalla de cocinar NO rompe, los pasos funcionan igual.

**B — Memoria de cocción**
- B1. Elegir una receta que YA tenga al menos una entrada de historial con `queCambiaria` no vacío. Abrirla en modo cocinar → aparece el bloque "La última vez" con el texto correcto. Pegá screenshot.
- B2. Una receta SIN historial → el bloque NO aparece, la pantalla funciona normal.
- B3. Confirmar que la query NO descarga el doc entero de historial innecesariamente (solo el `limit 1`). Reportá si hizo falta crear índice compuesto y pegá el link/confirmación.

**C — Notas de receta**
- C1. Receta sin `notasCocina` → botón "+ Agregar nota" → escribir → Guardar → en Firebase Console el doc `/recetas/{id}` ahora tiene `notasCocina` con el texto. Pegá el valor real del campo.
- C2. Recargar (Ctrl+Shift+R) y reabrir el detalle → la nota sigue ahí.
- C3. Editar la nota → Guardar → el campo cambió en Console. El campo `notas` (descripción original) quedó INTACTO. Confirmá ambos.
- C4. Como un miembro que NO es JP (si podés simular login), agregar/editar la nota funciona (no está restringido a JP).

**D — Modelo intacto**
- D1. El campo `notas` de las recetas no se modificó en ningún momento. El campo nuevo es `notasCocina`, separado.

**E — Docs**
- E1. MAPEO en v1.9.0 con §2.2 actualizado (campo `notasCocina`) y §10.8 agregada. Pegá el diff de esas secciones.

---

## Fuera de scope (NO hacer en este lote)

- Sugeridor semanal, perfil por miembro, calendario, etc. — son lotes futuros, ver §11 del MAPEO.
- NO permitir editar `queCambiaria`/`queSalioBien` desde la memoria de cocción — esos se llenan al evaluar, la memoria solo los muestra.
- NO agregar timestamp de auditoría a `notasCocina` salvo que el patrón del módulo lo imponga.
- NO tocar el flujo de voto/evaluación.

## Recordatorio

Diagnóstico D1–D5 primero, esperás mi "procedé", recién ahí codeás. Para cada criterio A–E, dato real (screenshot, valor del campo, diff), no afirmación.
