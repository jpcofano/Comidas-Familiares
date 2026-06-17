# PROMPT E14.6 — Fiambrería como sección propia + revisión de catálogo + un solo generador

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> **A implementar ahora.** Numerar al próximo libre si `E14.6` ya existe.
>
> **Contexto (auditoría 9-jun-2026):** los datos están bien — Firestore distingue 9 secciones de
> góndola y `"Fiambreria"` es una de ellas — pero la capa de display la **fusiona a propósito**
> dentro de Carnicería en dos lugares. Resultado: todo fiambre se ve con chip "C" rojo y cae bajo
> el grupo "Carnicería" en la lista de compras, aunque la familia compra en un comercio aparte
> (la compra rápida ya tiene "Fiambre" como destino propio). Este prompt la promueve a sección
> de display propia, sin migrar datos.

---

## TAREA 1 — Promover Fiambrería en la capa de display

### 1a. `src/lib/gondolas.ts`
Hoy (~línea 23): `'Fiambreria': 'Carnicería' // agrupado con Carnicería`, y el display son 5 grupos.
Pasar a **6 grupos**:

```ts
export const ORDEN_GONDOLA_DISPLAY = [
  'Verdulería', 'Carnicería', 'Fiambrería', 'Lácteos', 'Almacén', 'Panadería',
] as const;

export const SECCIONES: Record<Seccion, { color: string; letra: string }> = {
  'Verdulería': { color: 'oklch(0.62 0.07 130)', letra: 'V' },
  'Carnicería': { color: 'oklch(0.55 0.10 25)',  letra: 'C' },
  'Fiambrería': { color: 'oklch(0.58 0.09 350)', letra: 'F' },  // rosado fiambre, distinto del rojo carne
  'Lácteos':    { color: 'oklch(0.78 0.04 90)',  letra: 'L' },
  'Almacén':    { color: 'oklch(0.62 0.08 60)',  letra: 'A' },
  'Panadería':  { color: 'oklch(0.65 0.07 50)',  letra: 'P' },
};

const GONDOLA_MAP: Record<string, Seccion> = {
  'Verduleria':        'Verdulería',
  'Carniceria':        'Carnicería',
  'Pescaderia':        'Carnicería',   // pescado sigue con carnes (casi sin uso)
  'Fiambreria':        'Fiambrería',   // ← YA NO se fusiona
  'Lacteos y frescos': 'Lácteos',
  'Almacen / secos':   'Almacén',
  'Panaderia':         'Panadería',
  'Bazar / otros':     'Almacén',
  'Despensa / otros':  'Almacén',
};
```
Ajustar el tipo `Seccion` (suma `'Fiambrería'`) y verificar todo consumidor de
`ORDEN_GONDOLA_DISPLAY` / `SECCIONES` (lista de compras agrupada, GondolaCardV2, etc.) — debe
renderizar el grupo nuevo sin hardcodeos de "5 grupos".

### 1b. `src/lib/catalogo.ts` (~línea 68, `SECCIONES_META`)
El chip del valor raw `'Fiambreria'` hoy usa el color/letra de Carnicería. Cambiar:
```ts
  'Fiambreria': { color: 'oklch(0.58 0.09 350)', letra: 'F' },   // antes: rojo carnicería + 'C'
```
(Si existe también la clave display `'Fiambrería'`, mismo valor.) Esto corrige el chip en:
catálogo de ingredientes, armado de compra rápida, editor de plantillas y "Qué cocino".

### 1c. Verificación visual
Los 6 chips deben distinguirse entre sí (V verde, C rojo, **F rosado**, L crema, A ocre, P tostado)
y contra el fondo cálido de la app. No tocar tokens globales.

---

## TAREA 2 — Pasada de revisión del catálogo (datos)

Con el display corregido, revisar los ingredientes mal seccionados. **Criterio: góndola = dónde lo
compra la familia**, no taxonomía del alimento (para eso ya existe `categoria`, que no se toca).

1. Listar (log o salida en consola del seed/script) los ingredientes actuales con
   `seccionGondola === "Carniceria"` y `"Lacteos y frescos"` cuyos nombres matcheen fiambres:
   `/jam[oó]n|salame|mortadela|bondiola|panceta|queso|muzzarella|lomito|salchich[oó]n|leberwurst/i`.
2. Proponer el cambio a `"Fiambreria"` para los que correspondan (jamón cocido/crudo, salame,
   mortadela, panceta, lomito, quesos de fiambrería: cremoso, muzzarella, rallado, en barra).
   **Pegar la lista propuesta ANTES de aplicar** para que el usuario confirme caso por caso
   (ej.: ¿la muzzarella la compran en fiambrería o en el súper/lácteos?).
3. Aplicar los confirmados vía la función existente de actualización del catálogo (la que usa el
   catálogo editable; no escribir a mano contra Firestore).
4. La plantilla maestra "Fiambre" de la compra rápida hereda la sección del catálogo — verificar
   que sus ítems queden con chip F después de la corrección.

---

## TAREA 3 — Un solo generador (cierre de B1 de la auditoría)

En la pestaña de plantillas de Biblioteca quedaron botones **"Generar (todos los ítems)"**
(`Biblioteca.tsx` ~437 y ~450; `CompraRapidaEditor.tsx` ~187-211) que crean la lista semanal
salteando los modos A/B/C — contradice el "un solo camino" de E14.5.

**Quitarlos.** El caso "generar con todo" ya está cubierto por el **modo B (Destildar)** en
`/compras/armar`, que arranca con todos los ítems marcados — mismo resultado, un solo flujo.
- La pestaña de Biblioteca queda solo para **crear/editar plantillas** (nombre, ítems, habituales ★).
- En el lugar de los botones quitados, dejar un texto chico: *"Para armar la compra de la semana,
  andá a Compras → Armar la compra."* (o link directo a `/compras/armar`).

---

## Cierre
1. **MAPEO_FIRESTORE.md / docs**: anotar que el display pasa de 5 a 6 grupos (Fiambrería propia);
   los valores raw de Firestore **no cambian**. Bump de versión.
2. **Tests**: ajustar los que asuman 5 grupos o el mapeo `Fiambreria→Carnicería`
   (`gondolas.test.ts` si existe). Agregar caso: ítem con `seccionGondola:"Fiambreria"` cae en el
   grupo display "Fiambrería" con letra F.
3. `npm test` verde, `npm run build` ok. No hay cambios de reglas.
4. Pegar diff de `gondolas.ts`, `catalogo.ts`, `Biblioteca.tsx`, `CompraRapidaEditor.tsx` + la
   lista de ingredientes re-seccionados aplicada.

```
git commit -m "E14.6: Fiambrería como sección de display propia (chip F) + re-sección de fiambres en catálogo + quita generador duplicado de Biblioteca"
```

## Criterios de aceptación
1. Un ingrediente con góndola `Fiambreria` se ve con **chip F rosado** en catálogo, armado,
   plantillas y "Qué cocino", y cae bajo el grupo **"Fiambrería"** en la lista de compras.
2. Carnicería sigue existiendo con la C roja (y Pescadería sigue cayendo ahí).
3. Los fiambres/quesos confirmados por el usuario quedaron re-seccionados a `Fiambreria` en el
   catálogo; la plantilla "Fiambre" los muestra con chip F.
4. En Biblioteca ya **no** hay botón "Generar"; solo edición de plantillas + texto que apunta a
   Compras. Generar vive únicamente en `/compras/armar` (modos A/B/C).
5. Sin regresiones en la lista agregada (agrupado por góndola y progreso intactos, ahora con 6 grupos).
```
