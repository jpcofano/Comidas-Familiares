# PROMPT E14.2 — Compra rápida: 3 plantillas maestras + modos A/B/C + multi-asignado

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> **A implementar ahora.** Numerar al próximo libre si `E14.2` ya existe.
>
> **Construye sobre lo que ya existe:** `src/data/comprasRapidas.ts` (plantilla = `Receta` con
> `esCompraRapida`; instancia = `Plan` con `tipoSeleccion:"compra-rapida"` e `itemsCompraRapida`),
> el agrupador por góndola de `src/lib/catalogo.ts`, las secciones de `src/lib/gondolas.ts`, y el
> Member Dashboard (E12.1). **No** rehacer esa maquinaria: extenderla.
>
> Referencia visual aprobada: el prototipo `Compra rápida — opciones de selección.html`
> (3 comercios, modos A/B/C, encargado, fase armar→comprando). Replicar ESE comportamiento.

---

## Resumen de lo que cambia respecto de E13.1

| Tema | Antes (E13.1) | Ahora (E14.2) |
|---|---|---|
| Comercios | 1 plantilla genérica por destino | **3 plantillas maestras fijas**: Verdulería · Almacén · Fiambre, cada una con TODO lo que se suele comprar ahí |
| Armar la semana | buscar en catálogo y agregar de a uno | **marcar/desmarcar** sobre la plantilla, 3 modos |
| Modos de selección | — | **A Sumar · B Destildar · C De siempre** (ver abajo). **C guarda la última selección** |
| Asignación | **un** miembro (`asignaciones:[miembroId]`) | **varios** miembros (`asignaciones: MiembroId[]`), igual que ahora se ve en la principal |
| Quién la arma | solo JP | **JP y María** (ambos con acceso total a la funcionalidad) |
| Dónde aparece | card en el dashboard del asignado | igual: card en la principal de **cada asignado y de JP** |

> Importante: este flujo **no** es el de recetas. No se cocina, no cuenta macros, no entra en la
> lista normal de recetas. Es lista de compras y punto.

---

## TAREA 1 — Seed de las 3 plantillas maestras

Crear (una sola vez, idempotente — script de seed o botón "Crear plantillas" para JP/María si no existen)
tres `Receta` con `esCompraRapida:true`:
- **Compra rápida · Verdulería**
- **Compra rápida · Almacén**
- **Compra rápida · Fiambre**

Cada una con su lista completa de ítems habituales del comercio (tomar del catálogo real;
ejemplos en el prototipo). Cada ítem de plantilla lleva un flag nuevo **`habitual`** (★) para el
modo C en su primer uso.

### Modelo — extender el ítem de plantilla y la plantilla
`src/types/models.ts`. El ingrediente de plantilla ya existe (`idIngrediente, textoOriginal,
cantidad, unidad, seccion`); agregar opcionalmente:
```ts
// dentro del shape de ingrediente de plantilla de compra rápida:
habitual?: boolean;            // ★ — marcado por defecto en modo C la primera vez

// en Receta (solo aplica si esCompraRapida):
ultimaSeleccion?: string[];    // NUEVO — idIngrediente que quedaron marcados la última vez (modo C)
modoPreferido?: "sumar" | "destildar" | "siempre"; // NUEVO — último modo usado (default "siempre")
```
Retrocompatible: campos opcionales; plantillas viejas sin ellos siguen funcionando (fallback a
`habitual`/"siempre").

---

## TAREA 2 — Pantalla "Armar la compra" con modos A/B/C

Reemplaza el editor de búsqueda por **marcar/desmarcar** sobre la plantilla del comercio elegido.
Layout = el del prototipo: tabs de comercio arriba, selector de modo, lista marcable, footer con
asignados + CTA.

### Los 3 modos (estado inicial de marcado)
- **A · Sumar** (`sumar`): arranca **todo desmarcado**. Tocás lo que necesitás.
- **B · Destildar** (`destildar`): arranca **todo marcado**. Sacás lo que no va.
- **C · De siempre** (`siempre`, **default**): arranca con la **`ultimaSeleccion`** de esa plantilla;
  si no hay (primer uso), con los ítems `habitual:true`. Los marcados van **ordenados arriba** con ★.

> Cambiar de modo re-calcula el arranque de ese comercio (igual que el prototipo). El modo elegido
> se guarda en `modoPreferido`.

### Persistencia de la selección (clave del pedido)
Al **generar la lista de la semana** (CTA), guardar en la plantilla:
```ts
ultimaSeleccion = idIngrediente de los ítems marcados;
modoPreferido   = modo actual;
```
Así la próxima vez en modo C arranca exactamente como la dejaste. (Editar cantidades en la
plantilla maestra es opcional; las cantidades por defecto viven en la plantilla, y se pueden
ajustar con el stepper `− N +` por ítem antes de generar — esos overrides van a la instancia, no
pisan la plantilla salvo que se edite explícitamente.)

### Asignación múltiple
Chips/avatars de los 4 miembros con **selección múltiple** (no única). Reusar el patrón de
`asignaciones` que ya usan los planes de comida (es `MiembroId[]`). Default sugerido: precargar con
los asignados de la última instancia de ese comercio, o vacío.

### Permisos
La pantalla de armado y **toda su funcionalidad** (crear/editar plantilla, elegir modo, marcar
ítems, asignar, generar, marcar lista) está disponible para **`juanpablo` y `maria`**. Gate:
```ts
const puedeArmarCompras = selfId === "juanpablo" || selfId === "maria";
```
Sofía y Federico **no** arman, pero si están asignados ven la instancia en su principal y pueden
tildar ítems y marcar comprado (igual que hoy con el asignado).

---

## TAREA 3 — Generar instancia multi-asignado

En `src/data/comprasRapidas.ts`, cambiar la firma de `generarInstanciaCompraRapida` para aceptar
**varios** asignados y solo los ítems marcados:
```ts
export async function generarInstanciaCompraRapida(
  plantilla: Receta,
  asignados: MiembroId[],                 // ← antes: miembroId: MiembroId
  itemsSeleccionados: ItemCompraRapida[], // ← solo los marcados, con cantidades ya resueltas
): Promise<Result<Plan, AppError>> {
  const semanaInicio = getSemanaActual();
  const semanaFin = getSemanaFin(semanaInicio);
  return crearPlan({
    idPlan: generarIdInstancia(),
    semanaInicio, semanaFin,
    tipoSeleccion: "compra-rapida",
    tipoPlan: "En proceso",
    idSeleccion: plantilla.idReceta,
    nombreSeleccion: plantilla.nombre,
    recetaPrincipal: plantilla.nombre,
    estado: "Compra pendiente",
    fechaPrevistaComida: null,
    cantidadPersonas: 1,
    listaComprasId: null,
    notas: "", origen: null,
    asignaciones: asignados,              // ← array
    itemsCompraRapida: itemsSeleccionados,
  });
}
```
Y una función nueva para persistir la selección en la plantilla:
```ts
export async function guardarSeleccionPlantilla(
  idReceta: string,
  ultimaSeleccion: string[],
  modoPreferido: "sumar" | "destildar" | "siempre",
): Promise<Result<void, AppError>> {
  try {
    await updateDoc(doc(db, "recetas", idReceta), { ultimaSeleccion, modoPreferido, ultimaModificacion: serverTimestamp() });
    invalidateRecetasCache();
    return ok(undefined);
  } catch (e) {
    return err("compra-rapida-seleccion-failed", firebaseErrorMessage(e) ?? "No se pudo guardar la selección.", e);
  }
}
```
La CTA "Generar la de esta semana" llama a **ambas**: genera la instancia con los marcados +
guarda la selección/modo en la plantilla.

---

## TAREA 4 — Vista en la pantalla principal (multi-asignado + JP)

La instancia ya aparece como card en el Member Dashboard (E12.1). Ajustes:
1. **Que aparezca para TODOS los asignados** (la query del dashboard debe incluir planes donde
   `asignaciones` contenga al `selfId`) **y para JP** (JP ve siempre; si además está asignado,
   no duplicar).
2. Card agrupada por góndola (reusar `agruparPorGondola`), header con ícono de bolsa + color de
   góndola (no la barra de miembro), título "Compra rápida · {destino}", progreso "N de M".
3. **Avatares de los asignados** en la card (puede tocar a más de uno). Tildar un ítem (`toggleItemComprado`)
   y "Marcar compra como hecha" (`marcarCompraRapidaHecha`) quedan disponibles para cualquier asignado y JP.
4. Diferenciar visualmente de los platos a cocinar (es compra, no comida) — ya estaba en E13.1, mantener.

> "Vaciar lista" del prototipo = borrar la instancia (o marcarla lista) **sin tocar la plantilla**:
> la plantilla maestra y la `ultimaSeleccion` quedan para la próxima.

---

## Reglas de Firestore
**Sin cambios.** Plantillas viven en `recetas/*` e instancias en `planes/*`, ambas ya con
`allow read, write: if isFamilyMember()`. Confirmar deploy. (Si hubiera reglas por-campo que
restrinjan escritura de planes a JP, ampliarlas para permitir que María genere/edite — pero por lo
visto el modelo es familiar abierto.)

## Cierre
1. `docs/MAPEO_FIRESTORE.md`: campos `habitual` (ítem de plantilla), `ultimaSeleccion`,
   `modoPreferido` (Receta esCompraRapida); firma nueva de `generarInstanciaCompraRapida` y
   `guardarSeleccionPlantilla`. Bump de versión.
2. Tests: ajustar los que llaman `generarInstanciaCompraRapida(plantilla, miembro)` a la firma
   `(plantilla, asignados[], items[])`. Agregar test: modo A arranca vacío, B lleno, C con
   `ultimaSeleccion` (o `habitual` en primer uso), y que generar persiste `ultimaSeleccion`.
3. `npm test` verde, `npm run build` ok.
4. Pegar diff de `models.ts`, `comprasRapidas.ts`, pantalla de armado, y la card del dashboard.

```
git commit -m "E14.2: compra rápida con 3 plantillas maestras, modos A/B/C (C persiste selección) y multi-asignado JP+María"
```

## Criterios de aceptación
1. Existen 3 plantillas maestras (Verdulería, Almacén, Fiambre) con sus ítems habituales.
2. JP **o** María entran a "Armar la compra", eligen comercio y modo (A/B/C) y la lista arranca
   como define el modo; en **C** arranca con la última selección guardada (o habituales el primer uso).
3. Pueden asignar la compra a **varias** personas; la instancia se genera solo con los ítems marcados
   y las cantidades ajustadas.
4. Al generar, la **selección y el modo quedan guardados** en la plantilla → la próxima vez en C
   arranca igual.
5. La card aparece en la pantalla principal de **cada asignado y de JP**; cualquiera de ellos puede
   tildar ítems y marcar la compra como hecha.
6. "Vaciar"/"Marcar lista" **no** borra la plantilla maestra ni la última selección.
7. Sofía/Federico no ven el armado, pero si están asignados ven y operan su instancia.
8. Las compras rápidas siguen sin aparecer en la lista de recetas ni contar como comidas.
```
