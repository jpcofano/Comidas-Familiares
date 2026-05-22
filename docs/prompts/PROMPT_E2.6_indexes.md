# PROMPT E2.6 — Índices Firestore

> Etapa 2.6 del plan de migración (ver `MAPEO_FIRESTORE.md` §5.2, §5.3, §7.2).
> Pegar este archivo completo a Claude Code en la terminal del repo.

---

## 1. Contexto

Migración de **Comida Familiar** de Apps Script + Google Sheets a Firebase + React +
Vite. Fuente de verdad del modelo: `MAPEO_FIRESTORE.md`.

Estado del repo al arrancar este prompt:

- E1.0–E1.2 cerradas: bootstrap config, auth + whitelist, layout + routing.
- E2.1 cerrada: types + helpers.
- E2.2 cerrada: data layer completo (`src/data/*.ts`), 84 tests verdes.
- E2.2.1 cerrada: headers COOP.
- E2.3 cerrada: `firestore.rules` + 31 tests de rules + deploy.
- E2.4 cerrada: seeds cargados a producción — 78 recetas, 652 ingredientes,
  436 pasos, 5 menús, 21 componentes.

Esta etapa define y deploya los **índices compuestos** de Firestore. Firestore exige
índices explícitos para cualquier query con múltiples `where`, o `where` + `orderBy`.
El data layer de E2.2 ya tiene queries de ese tipo escritas — hoy, si se disparan
contra producción, **fallan** con `failed-precondition` porque los índices no existen.
Esta etapa cierra esa brecha **antes** de la Etapa 3, donde esas queries se usan en
pantallas reales.

Es una etapa de infraestructura: NO toca código de app, NO crea componentes. Solo
un archivo de configuración, su verificación con emulador y un deploy.

`firestore.indexes.json` **no existe todavía** en el repo — es un archivo nuevo.

---

## 2. Decisiones zanjadas (no re-litigar)

1. **Archivo `firestore.indexes.json` en la raíz del repo.** Se versiona en git y se
   deploya con `firebase deploy --only firestore:indexes`.

2. **`firebase.json` debe apuntar a él.** Hoy `firebase.json` tiene
   `"firestore": { "rules": "firestore.rules" }`. Hay que agregar la clave
   `"indexes": "firestore.indexes.json"` dentro del bloque `firestore`. NO se toca
   nada más de `firebase.json` (ni hosting, ni los headers COOP de E2.2.1, ni el
   bloque `emulators` de E2.3).

3. **Índices a declarar — los de `MAPEO_FIRESTORE.md` §5.3:**

   | Colección | Campos | Uso |
   |---|---|---|
   | `planes` | `semanaInicio` ASC, `estado` ASC | planes activos por semana |
   | `planes` | `semanaInicio` ASC, `estado` ASC, `asignaciones` ARRAY_CONTAINS | dashboard miembro |
   | `planes` | `semanaInicio` ASC, `tipoPlan` ASC | uso futuro |
   | `recetas` | `tipoItem` ASC, `proteinaPrincipal` ASC | filtros del listado |
   | `historial` | `idReceta` ASC, `fechaRealizadaTimestamp` DESC | historial por receta |
   | `historial` | `fechaRealizadaTimestamp` DESC | últimas 30 globales |

   Nota: la última fila (`historial` por un solo campo `DESC`) puede que Firestore la
   resuelva con un índice de campo único automático y no necesite declaración
   explícita en `firestore.indexes.json`. Verificalo (ver tarea 3.3) — si Firestore
   no lo exige, no lo declares; si lo exige, declaralo.

4. **Punto a verificar — `in` + `array-contains` juntos.** La query del dashboard de
   miembro (`MAPEO §5.2`, "Home modo miembro") combina
   `where("estado", "in", [...])` **con** `where("asignaciones", "array-contains", ...)`
   más `where("semanaInicio", "==", ...)`. Firestore tiene restricciones sobre
   combinar un operador `in` y un `array-contains` en la misma query. **No asumas que
   el índice de la fila 2 de la tabla alcanza tal cual.** Verificá con el emulador
   (tarea 3.3) si esa query concreta funciona con el índice declarado. Si Firestore
   la rechaza por la combinación de operadores —no por falta de índice—, entonces el
   problema no se arregla con un índice: hay que **dividir la query** (ejecutarla con
   `array-contains` + igualdad y filtrar `estado` en el cliente, o viceversa). En ese
   caso: NO modifiques el data layer de E2.2 por tu cuenta — **documentá el hallazgo
   en el reporte** y dejá un `// TODO E3` indicando que la query del dashboard de
   miembro hay que ajustarla cuando se implemente esa pantalla en la Etapa 3.

5. **Nombres de campo exactos.** Usá los nombres de campo tal como los define
   `src/types/models.ts` (E2.1). El `MAPEO §5.3` dice `proteinaPrincipal` y
   `fechaRealizadaTimestamp` — confirmá contra los types reales antes de escribir el
   índice. Si hay discrepancia entre el `MAPEO` y el type, **el type manda** (es el
   código que corre); reportá la discrepancia.

6. **No declarar índices de más.** Solo los 6 de la tabla. Las queries de un solo
   `where` de igualdad (ej. `collection(db,"recetas")` sin filtro, o
   `where("hidratos","==",false)`) NO necesitan índice compuesto — Firestore las
   resuelve con índices automáticos. No los agregues.

---

## 3. Tareas

### 3.1 Crear `firestore.indexes.json`

- Creá el archivo en la raíz con la estructura estándar de Firebase
  (`{ "indexes": [...], "fieldOverrides": [...] }`).
- Declará los índices compuestos de la tabla del punto 2.3.
- Cada índice: `collectionGroup`, `queryScope: "COLLECTION"`, y el array `fields`
  con `fieldPath` + `order` (`ASCENDING`/`DESCENDING`) o `arrayConfig: "CONTAINS"`
  según corresponda.

### 3.2 Actualizar `firebase.json`

- Agregá `"indexes": "firestore.indexes.json"` dentro del bloque `firestore`.
- Verificá que el resto del archivo queda intacto (rules, hosting + headers COOP,
  emulators).

### 3.3 Verificación con el emulador

- Levantá el emulador de Firestore (ya configurado en E2.3) cargando
  `firestore.indexes.json`.
- Verificá que cada una de las 6 queries de `MAPEO §5.2` que dependen de estos
  índices se ejecuta sin error `failed-precondition`. Podés hacerlo con un script de
  verificación temporal o con tests; si creás tests, que NO se mezclen con los 84 de
  E2.2 ni los 31 de E2.3.
- **Especial atención a la query del dashboard de miembro** (decisión 4): comprobá si
  la combinación `in` + `array-contains` + igualdad funciona. Reportá el resultado.
- Para la fila 6 de la tabla (`historial` un solo campo DESC): comprobá si Firestore
  exige índice explícito o lo resuelve solo, y ajustá `firestore.indexes.json` según
  el resultado (decisión 3).

### 3.4 Deploy

- Una vez verificado, deployá **solo los índices**:
  `firebase deploy --only firestore:indexes`.
- NO deployes rules, NO deployes hosting.
- Los índices de Firestore tardan en construirse (de segundos a minutos según el
  volumen). El deploy reporta éxito al *aceptar* la definición, pero la construcción
  sigue en segundo plano. En el reporte, indicá esto y recordá que JP debe verificar
  el estado "Enabled" en la consola (ver tarea 3.5).

### 3.5 Documentación

- Si el repo tiene un doc de operaciones (`README.md` o similar), agregá una nota
  breve: que `firestore.indexes.json` se deploya con
  `firebase deploy --only firestore:indexes` y que tras un deploy hay que esperar a
  que los índices pasen a "Enabled" en la consola antes de confiar en las queries.

---

## 4. Criterios de aceptación

1. `firestore.indexes.json` existe en la raíz, con los 6 índices de §5.3 (menos la
   fila 6 si Firestore no la exige — ver decisión 3).
2. `firebase.json` apunta a `firestore.indexes.json`; el resto del archivo intacto.
3. Los nombres de campo coinciden con `src/types/models.ts` (E2.1).
4. Verificación con emulador: las queries de `MAPEO §5.2` que dependen de estos
   índices corren sin `failed-precondition`.
5. El resultado del chequeo `in` + `array-contains` del dashboard de miembro está
   reportado explícitamente (funciona / hay que dividir la query).
6. `firebase deploy --only firestore:indexes` reportó éxito.
7. `npm run test` sigue 84/84 verde. `npm run build` sin errores.
8. Commits con prefijo `Stage 2.6:` + push.

---

## 5. Qué NO tocar

- **`src/data/*`, `src/firebase.ts`, types de E2.1, hooks**: esta etapa no modifica
  código de app. Si la decisión 4 revela que una query hay que dividirla, se deja un
  `// TODO E3` y se reporta — NO se reescribe el data layer ahora.
- **`firestore.rules`**: cerrado en E2.3.
- **`firebase.json` salvo la clave `indexes`**: hosting, headers COOP y emulators
  quedan exactamente como están.
- **Los seeds y `Migracion/30_Seeds.gs`**: fuera de scope.
- **Los 84 tests de E2.2 y los 31 de E2.3**: no se tocan.
- **Componentes React, routing, layout**: fuera de scope.

---

## 6. Antes de cerrar — reporte esperado

- Tabla de criterios de aceptación (1–8) con estado.
- La lista final de índices declarados (y si la fila 6 quedó dentro o fuera, con el
  motivo).
- Resultado del chequeo `in` + `array-contains` del dashboard de miembro: ¿funciona
  con el índice, o quedó un `// TODO E3` para dividir la query?
- Cualquier discrepancia encontrada entre `MAPEO §5.3` y los nombres de campo reales
  de `src/types/models.ts`.
- Lista de commits `Stage 2.6:`.
- Recordatorio para JP: abrir Firebase Console → Firestore → Indexes y confirmar que
  todos los índices figuran en estado **"Enabled"** (no "Building"). Hasta que estén
  Enabled, las queries que los usan fallan.
