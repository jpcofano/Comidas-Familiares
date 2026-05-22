# PROMPT E2.4 — Seeds: importación de datos a Firestore

> Etapa 2.4 del plan de migración (ver `MAPEO_FIRESTORE.md` §1.3, §1.2.bis, §7.2).
> Pegar este archivo completo a Claude Code en la terminal del repo.

---

## 1. Contexto

Migración de **Comida Familiar** de Apps Script + Google Sheets a Firebase + React +
Vite. Fuente de verdad del modelo: `MAPEO_FIRESTORE.md`.

Estado del repo al arrancar este prompt:

- E1.0–E1.2 cerradas: bootstrap config, auth + whitelist, layout + routing.
- E2.1 cerrada: types en `src/types/models.ts` + helpers de canonicalización.
- E2.2 cerrada: data layer completo, 84 tests verdes, deploy OK.
- E2.2.1 cerrada: headers COOP en `firebase.json`.
- E2.3 cerrada: `firestore.rules` + 31 tests de rules + deploy a producción.

Esta etapa carga los **datos semilla** del sistema viejo a Firestore: 78 recetas con
sus ~1.180 ingredientes y ~800 pasos, 5 menús con sus ~21 componentes. Es la primera
vez que la base de producción se puebla con datos reales de dominio.

Los datos viven como **arrays de tuples** (orden posicional) en `30_Seeds.gs`, un
archivo del proyecto Apps Script ya presente en el repo. NO se ejecuta ese archivo;
se lee como fuente de datos y se traduce a objetos Firestore.

`/config/familia` y `/config/diccionarios` ya están cargados desde E1.0 — esta etapa
**no los toca**.

---

## 2. Hallazgo importante: estado real de los seeds

Antes de armar este prompt se inspeccionó `30_Seeds.gs`. Datos confirmados:

- **`CS_SEED_RECETAS_COMPLETAS`** (línea 1): 78 recetas como tuples. El orden de
  columnas está documentado en el comentario de las líneas 2–5 del archivo:
  ```
  ID, Nombre, Estilo, Dificultad, Proteína, Técnica, Sin lácteos, Hidratos,
  Hidrato opcional, Acomp padres, T.activo, T.total, Porciones, Costo, Temporada,
  Por qué es especial, Riesgos, Imagen, Notas, Escenario de uso, Clima del plato,
  Apto noche, Notas noche, Tipo ítem, Elegible semana, Fuente, Fecha imp,
  Ult evaluación, Ult puntaje, Veces, Pensada para
  ```
- **`CS_SEED_INGREDIENTES_COMPLETOS`** (línea 846): ~1.180 filas de ingredientes.
- **`CS_SEED_PASOS_COMPLETOS`** (línea 9325): ~800 filas de pasos.
- **`CS_SEED_MENUS_COMPLETOS`** (línea 14124): 5 menús como tuples.
- **`CS_SEED_MENU_ITEMS_COMPLETOS`** (línea 14237): ~21 filas de componentes de menú.
- **NO hay diccionarios en `30_Seeds.gs`** — ya están en `/config` desde E1.0.

**Crítico — sobre la "migración de componentes":** `30_Seeds.gs` se escaneó completo
y **ninguna receta tiene `tipoItem === "Componente"`**. Las 78 recetas seed ya vienen
tipadas con su tipo real (`Receta principal`, `Entrada`, `Postre`, `Guarnición`,
`Hidrato opcional`, etc.). Por lo tanto la migración de componentes que menciona
`MAPEO_FIRESTORE.md` §1.2.bis y §7.2 es, en la práctica, un **paso defensivo**: hay
que implementarlo igual por robustez (por si aparece un `"Componente"` al parsear),
pero no se espera que reasigne ninguna receta. Ver tarea 3.3.

El campo `Elegible semana` (columna 25) tampoco se persiste — `elegibleSemana` se
elimina del modelo en v1.2 (`MAPEO_FIRESTORE.md` §1.2.bis decisión 3).

---

## 3. Decisiones zanjadas (no re-litigar)

1. **Script con Admin SDK.** Se crea `scripts/seed-firestore.ts` que corre con
   `firebase-admin` (mismo patrón que `scripts/bootstrap-config.ts`: lee el
   `service-account.json` gitignored, falla con instrucciones claras si no lo
   encuentra). Se agrega un script a `package.json`, ej. `npm run seed:firestore`.

2. **Idempotente.** El script se puede correr N veces. Cada documento se escribe con
   `set()` sobre su ID determinístico (`REC-XXXX`, `MENU-XXXX`, etc.) → sobreescribe,
   no duplica. Correrlo dos veces deja la base en el mismo estado.

3. **Modelo M para menús** (`MAPEO_FIRESTORE.md` §1.2.bis, §2.3). El menú NO duplica
   campos de receta (tiempos, dificultad, sinLacteos). El doc `/menus/{id}` guarda
   solo metadata propia + el array `componentes[]` de referencias a recetas. Las
   tuples de `CS_SEED_MENUS_COMPLETOS` traen campos de tiempo/dificultad heredados
   del modelo viejo: **esos campos derivados NO se persisten** en el doc del menú
   (se calculan al vuelo con `deriveMenuMetadata()` de E2.2). Solo se persiste lo
   que es metadata propia del menú según el shape de §2.3.

4. **Tipos destino — usar el shape de E2.1.** Los objetos que el script sube a
   Firestore deben respetar exactamente los types de `src/types/models.ts` (E2.1).
   Si una tuple aporta un campo que el type no tiene → no se persiste. Si el type
   exige un campo que la tuple no aporta → se aplica el default de
   `MAPEO_FIRESTORE.md` §3.5 ("Defaults al cargar receta" / "Defaults al cargar
   menú"). Reusá los helpers de canonicalización de E2.1 (`parseTime`, `parseRange`,
   `normalizeText`) y de E2.2 — NO reimplementes parsing.

5. **Campos derivados numéricos.** Los campos `xxxMin`/`xxxMax` (`tiempoActivoMin`,
   `tiempoTotalMin`, `porcionesMin`, `porcionesMax`, `dificultadOrden`, `costoOrden`)
   se derivan de los campos string de la tuple usando los helpers de E2.1/E2.2. Esto
   es lo que habilita los filtros numéricos (`MAPEO_FIRESTORE.md` §6.5).

6. **Migración de componentes — inferencia por rol en menús.** Decisión del usuario:
   si apareciera una receta con `tipoItem === "Componente"`, su tipo real se infiere
   del rol que cumple en los menús donde participa (columna `tipo` de
   `CS_SEED_MENU_ITEMS_COMPLETOS`). Detalle completo en tarea 3.3. Dado el hallazgo
   del §2, se espera que este paso reporte 0 reasignaciones — pero se implementa
   igual.

7. **`elegibleSemana` no se persiste** (decisión 3 de §1.2.bis). Si la tuple lo trae
   (columna 25), se ignora.

8. **Orden de carga.** Recetas primero (con sus ingredientes y pasos), menús después.
   Razón: los componentes de menú referencian recetas por `idReceta`; si una receta
   referenciada no existe, hay que detectarlo (ver tarea 3.5), y para eso las recetas
   ya tienen que estar parseadas.

9. **Ingredientes y pasos: dónde van.** Seguí el shape de `src/types/models.ts` de
   E2.1. Si el type de `Receta` tiene `ingredientes[]` y `pasos[]` embebidos, van
   embebidos en el doc de la receta. Si E2.1 los modeló como subcollections, van como
   subcollections. NO inventes una estructura nueva — respetá lo que ya definió E2.1.

---

## 4. Tareas

### 4.1 Crear `scripts/seed-firestore.ts`

Script con `firebase-admin` que:

- Carga credenciales como `scripts/bootstrap-config.ts` (service account gitignored).
- Lee los 5 arrays de `30_Seeds.gs`. Como `.gs` no es importable directamente,
  parseálo de la forma más robusta posible (ej. leer el archivo y evaluar los arrays
  en un sandbox controlado, o convertir a un `.ts`/`.json` intermedio en
  `scripts/`). Elegí el enfoque más simple y mantenible; documentalo con un comentario
  al principio del script.
- Mapea cada tuple de receta a un objeto `Receta` (type de E2.1), respetando el orden
  de columnas del §2 y aplicando defaults de §3.5 donde falte un valor.
- Deriva los campos numéricos `xxxMin/Max` (decisión 5).
- Asocia ingredientes y pasos a su receta por `idReceta` (la primera columna de cada
  tuple de ingrediente/paso es el `idReceta`).
- Mapea cada tuple de menú a un objeto `Menu` (type de E2.1), modelo M (decisión 3):
  solo metadata propia + `componentes[]`.
- Construye el array `componentes[]` de cada menú desde
  `CS_SEED_MENU_ITEMS_COMPLETOS`, agrupando por `idMenu` y ordenando por la columna
  `orden`.

### 4.2 Validación previa a la escritura

Antes de escribir nada a Firestore, el script valida y acumula un reporte:

- Toda receta tiene `idReceta` con formato `REC-XXXX`.
- Todo menú tiene `idMenu` con formato `MENU-XXXX`.
- Ingredientes/pasos huérfanos: un ingrediente o paso cuyo `idReceta` no corresponde
  a ninguna receta parseada → se reporta como warning, no se sube.
- Componentes de menú cuyo `idReceta` no existe en las recetas parseadas → se reporta
  (ver tarea 3.5).

### 4.3 Migración de componentes (paso defensivo)

- Detectá recetas cuyo `tipoItem === "Componente"`.
- Para cada una, mirá en `CS_SEED_MENU_ITEMS_COMPLETOS` la columna `tipo` de los
  componentes que la referencian (por `idReceta`):
  - Si todos los menús le dan el **mismo rol** → reasigná `tipoItem` a ese rol
    (mapeando el vocabulario de menú-item al de `tipoItem` del diccionario: ej.
    `Principal` → `Receta principal`, `Entrada` → `Entrada`, `Postre` → `Postre`,
    `Acompañamiento`/`Extra` → `Guarnición` o `Hidrato opcional` según corresponda —
    documentá el mapeo que uses).
  - Si los menús le dan **roles distintos**, o la receta **no aparece en ningún
    menú** → es un caso ambiguo: **NO la reasignes, NO la subas con un tipo
    adivinado**. Acumulala en la lista de ambiguos del reporte.
- Si hay casos ambiguos, el script debe **frenar antes de escribir** y pedir
  resolución manual (ver tarea 3.6). Dado el hallazgo del §2, lo esperado es 0
  componentes y por lo tanto 0 ambiguos — pero el camino tiene que existir.

### 4.4 Escritura a Firestore

- Una vez validado, escribí con `set()` por ID determinístico (idempotente).
- Recetas primero (con ingredientes y pasos según el shape de E2.1), menús después.
- Usá batches de escritura para no exceder límites (máx 500 ops por batch).
- NO toques `/config/*`, `/planes`, `/historial`, `/compras`, `/users`. Esta etapa
  solo escribe `/recetas` y `/menus` (y sus subcollections si E2.1 las definió así).

### 4.5 Modo dry-run

- El script debe aceptar un flag `--dry-run` que ejecute todo el parseo y la
  validación, imprima el reporte completo, pero **no escriba nada** a Firestore.
- Sin el flag, escribe normalmente.

### 4.6 Reporte de ejecución

Al terminar (dry-run o real), el script imprime:

- Recetas parseadas / escritas.
- Ingredientes y pasos asociados / huérfanos.
- Menús parseados / escritos, total de componentes.
- Componentes con `idReceta` inexistente.
- Recetas `Componente` detectadas, reasignadas, y ambiguas (con el detalle de cada
  ambigua).

### 4.7 Documentación

- Actualizá `README.md` con una sección "Seed de datos" análoga a la de
  "Bootstrap de configuración": qué hace `npm run seed:firestore`, que es
  idempotente, cómo correr el dry-run, y que requiere el `service-account.json`.

---

## 5. Flujo de ejecución esperado

1. Code implementa el script.
2. Code lo corre con `--dry-run` y te muestra el reporte completo **a vos (JP)**.
3. Vos revisás el reporte. Puntos a mirar: ¿78 recetas?, ¿~1.180 ingredientes sin
   huérfanos?, ¿~800 pasos?, ¿5 menús con ~21 componentes?, ¿0 componentes ambiguos?
4. Si el dry-run se ve bien → Code corre el script real y escribe a producción.
5. Si el dry-run reporta ambiguos o huérfanos inesperados → Code **frena** y te
   reporta antes de escribir. No resuelve solo.

---

## 6. Criterios de aceptación

1. `scripts/seed-firestore.ts` existe, corre con Admin SDK, falla con instrucciones
   claras si falta `service-account.json`.
2. El script es idempotente (segunda corrida = mismo estado).
3. Soporta `--dry-run`.
4. El dry-run reporta: 78 recetas, ~1.180 ingredientes (0 huérfanos esperados),
   ~800 pasos, 5 menús, ~21 componentes, 0 componentes ambiguos.
5. Los objetos escritos respetan los types de `src/types/models.ts` (E2.1).
6. Menús en modelo M: sin campos de receta duplicados, solo metadata + `componentes[]`.
7. Campos numéricos `xxxMin/Max` derivados correctamente.
8. `elegibleSemana` NO está en ningún doc escrito.
9. Tras la corrida real: `/recetas` y `/menus` poblados en producción, verificable
   en Firebase Console.
10. `npm run test` sigue 84/84 verde. `npm run build` sin errores.
11. `README.md` actualizado con la sección de seed.
12. Commits con prefijo `Stage 2.4:` + push.

---

## 7. Qué NO tocar

- **`firestore.rules`**: cerrado en E2.3. No se modifica.
- **`scripts/bootstrap-config.ts`** y `/config/*`: cerrados en E1.0. No se tocan.
- **El data layer `src/data/*`, `src/firebase.ts`, types de E2.1**: el script los
  *usa* (helpers, types) pero NO los modifica. Si un type de E2.1 parece incompleto
  para representar una tuple, NO lo extiendas por tu cuenta: reportalo y pará.
- **Componentes React, routing, layout**: fuera de scope.
- **Las colecciones `/planes`, `/historial`, `/compras`, `/users`**: esta etapa no
  las escribe.
- **`30_Seeds.gs` y los demás `.gs`**: son fuente de datos de solo lectura. No se
  editan.
- **Los 84 tests de E2.2 y los 31 de E2.3**: no se tocan.

---

## 8. Antes de cerrar — reporte esperado

- Tabla de criterios de aceptación (1–12) con estado.
- El reporte completo de la corrida real (mismos contadores que el dry-run).
- Enfoque elegido para leer `30_Seeds.gs` (parseo directo / conversión intermedia)
  y por qué.
- Mapeo usado para traducir vocabulario de menú-item a `tipoItem` (tarea 3.3).
- Confirmación de que no hubo componentes ambiguos; si los hubo, qué se hizo.
- Cualquier `// TODO` que haya quedado en código.
- Lista de commits `Stage 2.4:`.
- Recordatorio para JP: abrir Firebase Console → Firestore y confirmar a ojo que
  `/recetas` tiene 78 docs y `/menus` tiene 5.
