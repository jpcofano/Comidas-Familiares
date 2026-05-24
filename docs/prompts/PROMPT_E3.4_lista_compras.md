# PROMPT E3.4 — Lista de compras

> Etapa 3.4 del plan de migración (ver `MAPEO_FIRESTORE.md` §2.5, §3.1, §5.2, §7.3).
> Pegar este archivo completo a Claude Code en la terminal del repo.

---

## 1. Contexto

Migración de **Comida Familiar** de Apps Script + Google Sheets a Firebase + React +
Vite. Fuente de verdad del modelo: `MAPEO_FIRESTORE.md`.

Estado del repo al arrancar este prompt:

- Etapa 2 cerrada completa. En producción: 78 recetas, 5 menús.
- E3.1 + E3.1.1: Home modo JP.
- E3.2: Biblioteca con tabs Recetas/Menús.
- E3.3 + E3.3.1: detalle de receta + creación de planes (`elegirComoEspecial`,
  `sumarComoExtra`, `sumarComoEnProceso` en `src/data/planes.ts`; reglas de
  elegibilidad en `src/lib/elegibilidad.ts`). 147 tests.
- E3.3 dejó **tres `// TODO E3.4`** marcando que la sincronización de la lista de
  compras al crear/descartar un plan se implementa en esta etapa.

Esta etapa construye la **lista de compras** (`/compras`) — hoy un placeholder. La
lista se arma automáticamente juntando los ingredientes de los planes activos de la
semana. Es la etapa que resuelve los tres `// TODO E3.4`.

---

## 2. Modelo de datos (de `MAPEO_FIRESTORE.md` §2.5)

La lista de compras es **un doc raíz + una subcollection de ítems**:

- **`/compras/{idLista}`**: `idLista` (formato `LST-SEM-yyyyMMdd-HHmmss`),
  `fechaGeneracion` (Timestamp), `semanaInicio` (ISO), y `resumen` denormalizado
  (`{ totalItems, totalYaTengo, totalPendientes }`).
- **`/compras/{idLista}/items/{itemId}`**: cada ítem es un ingrediente **agregado**.
  Campos: `ingrediente`, `ingredienteCanonico` (clave de agrupación),
  `cantidadTotal`, `cantidadLabel` (string display), `unidad`, `categoria`,
  `opcional` (true si TODOS los aportes son opcionales), `yaTengo` (toggle del
  usuario), `notas` (combinadas), y `aportes[]` — un array que dice qué
  planes/recetas contribuyeron a ese ítem (`{ idPlan, idReceta, nombreReceta,
  cantidad, unidad, tipoOrigen }`).

El plan (`/planes/{idPlan}`) tiene un campo `listaComprasId` que se setea cuando la
lista se sincroniza (`MAPEO §2.4`).

**La sumabilidad ya está hecha y testeada:** E2.2 implementó la lógica de agregar
ingredientes con el array `aportes[]` (el criterio 8 de E2.2). Esta etapa **usa** esa
lógica, no la reimplementa. Revisá `src/data/compras.ts`.

---

## 3. Decisiones zanjadas (no re-litigar)

1. **Sincronización automática.** La lista se arma/actualiza sola cuando se crea o se
   descarta un plan — NO hay botón "generar lista" manual. Esto resuelve los tres
   `// TODO E3.4` de E3.3. El modelo de referencia es la función
   `CS_sincronizarListaSemana_` del Apps Script (`60_Compras.gs`).

2. **Qué planes contribuyen a la lista.** SOLO los planes en estado `Elegida`,
   `Compra pendiente`, `Compra lista`. Un plan en `Cocinada` **NO** contribuye: al
   pasar a `Cocinada`, sus ítems se quitan de la lista (lo hace la sincronización).
   Esto es explícito en `60_Compras.gs` ("Cocinada queda fuera").

3. **Una lista viva por semana.** Hay una sola lista activa por semana. Si ya existe
   una lista para la semana (vinculada a algún plan activo), la sincronización
   **reconcilia** esa lista (agrega ingredientes de planes nuevos, quita los de
   planes descartados) en lugar de crear una nueva. Solo se crea una lista nueva si
   no existe ninguna. El `idLista` se vincula a todos los planes activos de la semana
   vía su campo `listaComprasId`.

4. **Planes de tipo menú.** Un plan con `tipoSeleccion === "menu"` aporta los
   ingredientes de **las recetas componentes del menú** (no del menú en sí). La
   sincronización del Apps Script resuelve los `idReceta` de los componentes del menú
   y suma sus ingredientes. Replicá esa lógica. El `aporte` de esos ítems lleva
   `tipoOrigen: "menu"`.

5. **Sincronización vía el data layer.** Toda la lógica de sincronización vive en
   `src/data/compras.ts` (y se invoca desde las funciones de `planes.ts` que crean y
   descartan planes). NO en componentes. Si E2.2 ya dejó parte de esto en
   `compras.ts`, revisalo y completá; si las funciones de creación/descarte de plan
   de E3.3 necesitan llamar a la sincronización, ahí se conectan los tres
   `// TODO E3.4`.

6. **La pantalla `/compras` lee en tiempo real.** La pantalla se suscribe a los ítems
   de la lista de la semana con `onSnapshot` (el data layer de E2.2 ya tiene
   `subscribeToItemsLista` — usalo). Así, al togglear "ya tengo" o al sincronizarse
   la lista, la pantalla se actualiza sola.

7. **Dos vistas de la misma lista — toggle (de `Scripts.html`, `state.modoCompras`).**
   La pantalla tiene un toggle con dos modos de agrupación, sobre los **mismos**
   ítems:
   - **Por categoría**: ítems agrupados por `categoria` (Verdura, Carne, Almacén,
     etc.). Es la vista para comprar — recorrer el súper por sectores. Default.
   - **Por receta de origen**: ítems agrupados por la receta que los aportó (usando
     `aportes[].nombreReceta`). Un mismo ingrediente que viene de 2 recetas aparece
     en los 2 grupos. Es la vista de trazabilidad.
   El toggle no hace queries nuevas — reagrupa en cliente el mismo array de ítems.

8. **Toggle "ya tengo" por ítem.** Cada ítem tiene un control para marcarlo como "ya
   lo tengo en casa". Al togglear: `updateDoc` del ítem (`yaTengo: !yaTengo`) vía el
   data layer, y **recalcular el `resumen` denormalizado** del doc raíz
   (`totalItems`, `totalYaTengo`, `totalPendientes`). Mantené esos dos updates
   consistentes.

9. **Filtro de visualización (de `Scripts.html`).** Además del toggle de agrupación,
   la pantalla tiene un filtro Pendientes / Todo / Ya tengo para mostrar solo los
   ítems en ese estado. Es filtrado en cliente.

10. **Estado vacío.** Si no hay planes activos que contribuyan, no hay lista — mostrar
    un estado vacío claro ("Todavía no hay ingredientes para esta semana", con acceso
    a la Biblioteca para elegir comidas). La Home ya muestra "Sin lista de compras
    todavía" en ese caso — coherencia.

11. **Componentes sin ingredientes.** Si un menú tiene una receta componente que no
    tiene ingredientes cargados, el Apps Script lo reporta como `missingItems`.
    Replicalo: mostrá un aviso discreto ("Componentes sin ingredientes: X") sin
    romper la lista.

12. **Modo miembro — fuera de scope detallado.** `MAPEO §5.2` define una vista de
    compras filtrada para miembros (solo los ítems de sus recetas asignadas). Esta
    etapa implementa la pantalla **modo JP** (lista completa). Si el layout detecta
    miembro, dejá la vista de miembro como está (placeholder) — no la implementes
    acá.

13. **Diseño.** Tokens de E1.2 (`Styles.html`: primary `#74324a`, `--text-strong`
    #0e0a07, `--line` #d8cdbe). Mobile-first — la lista se usa caminando por el
    supermercado: ítems cómodos de tocar, el toggle "ya tengo" grande. Coherente con
    Home, Biblioteca y detalle.

14. **Idioma:** inglés en infraestructura, español en dominio y textos visibles.

---

## 4. Tareas

### 4.1 Sincronización (`src/data/compras.ts`)

- Implementá/completá la función de sincronización de la lista de la semana, según
  las decisiones 1–5. Modelo de referencia: `CS_sincronizarListaSemana_` de
  `60_Compras.gs` (juntar ingredientes de los planes que contribuyen, resolver
  componentes de menús, agregar con `aportes[]`, reconciliar lista existente o crear
  nueva, vincular `listaComprasId` a los planes).
- Reusá la lógica de sumabilidad/agregación de ingredientes que E2.2 ya dejó en
  `compras.ts` — no la reimplementes.
- La parte agregable/pura (juntar ingredientes en ítems con `aportes[]`, decidir
  `opcional`, combinar `notas`) debe ser testeable sin Firestore en lo posible.

### 4.2 Conectar la sincronización a crear/descartar plan

- Resolvé los tres `// TODO E3.4` de E3.3: las funciones de `planes.ts` que crean
  (`elegirComoEspecial`, `sumarComoExtra`, `sumarComoEnProceso`) y la que descarta
  planes deben disparar la sincronización de la lista tras la escritura del plan.
- Verificá que el descarte de un Especial (con cascada de extras) también
  resincroniza — la lista no debe quedar con ingredientes de planes ya borrados.

### 4.3 Pantalla `/compras`

- Pantalla que se suscribe en tiempo real a los ítems de la lista de la semana
  (`subscribeToItemsLista`).
- Toggle de agrupación: Por categoría / Por receta de origen (decisión 7).
- Filtro Pendientes / Todo / Ya tengo (decisión 9).
- Resumen visible (total, ya tengo, pendientes).
- Toggle "ya tengo" por ítem (decisión 8).
- Estado vacío (decisión 10) y aviso de `missingItems` (decisión 11).
- Estados de carga y error.

### 4.4 Tests

- Tests de la lógica pura que se pueda aislar: agregación de ingredientes en ítems
  con `aportes[]`, cálculo de `opcional`, reagrupación por categoría vs por receta,
  cálculo del `resumen`. Van junto al set existente (147 tras E3.3.1), sin romperlo.
- La sincronización contra Firestore y la UI pueden verificarse manualmente;
  documentá en el reporte.

### 4.5 Build + deploy

- `npm run build` sin errores.
- Deploy a producción: `firebase deploy --only hosting`.

---

## 5. Criterios de aceptación

1. La lista se sincroniza automáticamente al crear y al descartar planes (los tres
   `// TODO E3.4` resueltos).
2. Solo los planes `Elegida` / `Compra pendiente` / `Compra lista` contribuyen;
   `Cocinada` no.
3. Una sola lista viva por semana; la sincronización reconcilia la existente en lugar
   de duplicar.
4. Planes de tipo menú aportan los ingredientes de sus recetas componentes, con
   `tipoOrigen: "menu"`.
5. La pantalla `/compras` lee en tiempo real (`subscribeToItemsLista`).
6. Toggle de agrupación Por categoría / Por receta funciona sobre los mismos ítems,
   sin queries nuevas.
7. Filtro Pendientes / Todo / Ya tengo funciona.
8. Toggle "ya tengo" actualiza el ítem y recalcula el `resumen` del doc raíz.
9. Estado vacío y aviso de `missingItems` contemplados.
10. La sincronización vive en `src/data/compras.ts`, no en componentes.
11. Tests de lógica pura en verde, sumados al set sin romper los 147.
12. `npm run build` sin errores. Deploy exitoso.
13. Commits con prefijo `Stage 3.4:` + push.

---

## 6. Qué NO tocar

- **El data layer de E2.2**: se *completa* `compras.ts` y se conectan las llamadas
  desde `planes.ts`, pero NO se modifican las funciones existentes que ya funcionan
  (`subscribeToItemsLista`, la lógica de sumabilidad, `subscribeToPlanesActivos`, la
  transacción de voto) ni `result.ts` ni `firebase.ts`. Las funciones de creación de
  plan de E3.3 se *extienden* para disparar la sincronización — sin alterar su lógica
  de elegibilidad ni de escritura del plan.
- **`src/lib/elegibilidad.ts`** (E3.3.1): fuera de scope.
- **Los types de E2.1**: la lista los usa. Si un type pareciera insuficiente, NO lo
  modifiques por tu cuenta — reportalo y pará. (En E2.5 se cambió un type sin avisar;
  no repetir.)
- **La Home, la Biblioteca, el detalle de receta**: cerradas. Si se reusan
  componentes, sin romperlas.
- **`firestore.rules`, `firestore.indexes.json`, los scripts, el importador**: fuera
  de scope.
- **El modo miembro de compras**: esta etapa es modo JP.
- **El set de tests existente**: no se edita ni se mueve.

---

## 7. Antes de cerrar — reporte esperado

- Tabla de criterios de aceptación (1–13) con estado.
- Qué había ya en `src/data/compras.ts` (de E2.2) y qué se agregó/completó.
- Cómo se conectaron los tres `// TODO E3.4` — desde qué funciones se dispara la
  sincronización.
- Cómo se resolvió la reconciliación de lista existente vs creación de lista nueva.
- Resultado de la verificación funcional: crear planes y ver la lista poblarse,
  descartar un plan y ver los ítems desaparecer, togglear "ya tengo", confirmar el
  `resumen` actualizado en Firebase Console.
- Confirmación de que NO se modificó ningún type de E2.1 ni función existente de E2.2
  (o, si fue inevitable, qué y por qué — reportado, no silencioso).
- Cualquier `// TODO` que haya quedado en código.
- Lista de commits `Stage 3.4:`.
- Recordatorio para JP: desde `https://comida-familiar.web.app`, con planes activos
  creados, abrir `/compras`; probar el toggle Por categoría / Por receta; marcar
  ítems como "ya tengo" y ver el resumen cambiar; descartar un plan desde la Home y
  confirmar que sus ingredientes desaparecen de la lista.
