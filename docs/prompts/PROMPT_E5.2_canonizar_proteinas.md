# PROMPT E5.2 — Canonizar la lista de proteínas en toda la app

> **Tipo:** fix de datos + corrección de seed + auditoría (propuesta, sin write).
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Ancla:** `REPORTE_E3.4.8.1_diag_filtros` (diagnóstico del filtro) y
> `REPORTE_E5.1-VERIF` (desajuste del seed del importador, veredicto **B**).
> **MAPEO vigente:** v1.6.6.
>
> Este prompt **reemplaza** al viejo `PROMPT_E3.4.8.2_fix_filtro_proteinas.md` (que se
> escribió antes de que existiera el importador y no contemplaba su seed). Descartá
> ese prompt: este lo absorbe y lo amplía.

## El problema, en una frase

La lista de proteínas válidas (`proteinaPrincipal`) está **desincronizada en cuatro
lugares**, y eso ya rompió cosas en dos features distintas:

| Lugar | Valores hoy | ¿Correcto? |
|---|---|---|
| `src/types/models.ts` → `PROTEINAS` | **13** valores | ✅ Es la lista buena |
| `/config/diccionarios.proteinas` (Firestore) | 10 valores | ❌ Le faltan 3 |
| El seed del importador (`scripts/seed-config-importador.ts`, prompt modelo) | 10 valores | ❌ Le faltan 3 |
| El filtro de proteína de Biblioteca | lee de `models.ts` → 13 | ✅ Pero hay datos mal cargados que lo evidencian |

Los 3 valores que faltan en las copias desactualizadas: **`Fiambre`, `Semillas`,
`Frutos secos`** — agregados a `models.ts` en E3.4.8, sin propagar.

Consecuencias ya observadas:
- **Biblioteca** (reporte E3.4.8.1): 16 de 78 recetas tienen un `proteinaPrincipal`
  fuera de la lista — no son filtrables o están mal clasificadas.
- **Importador** (reporte E5.1-VERIF): el prompt modelo le muestra al LLM solo 10
  proteínas; una receta de fiambre o de semillas se va a clasificar mal (el LLM mapea
  al valor más cercano que conoce).

**Este prompt canoniza la lista en los cuatro lugares de una sola pasada.** La fuente
de verdad es `models.ts`; los demás se alinean a ella.

## Listado canónico — 13 valores (ya vigente en `models.ts`)

```
Vacuna, Cerdo, Pollo, Cordero, Pescado, Mariscos, Huevos, Fiambre,
Legumbres, Semillas, Frutos secos, Mixta, Vegetariana
```

Notas de diseño (no re-discutir, ya decididas en sesiones previas):
- `PROTEINAS` en `models.ts` **ya tiene los 13** (lo confirmó el reporte E5.1-VERIF,
  models.ts:28-35). Este prompt **no toca `models.ts`** — ya está bien.
- `Fiambre`, `Semillas`, `Frutos secos` son proteínas reales (las dos últimas,
  hermanas de `Legumbres`).
- `Vegetariana` = recetas sin una proteína que las ancle. No es cajón de sastre: una
  omelette cuyo ancla es el huevo va a `Huevos`.
- `Mixta` = receta con dos o más proteínas.
- `"Frutas"` NO es un valor válido — la fruta no es proteína. Donde aparezca, es dato
  mal cargado.

## Datos a corregir en las recetas

Del reporte E3.4.8.1, las recetas con `proteinaPrincipal` fuera de lista:

| Valor cargado | Recetas | Acción |
|---|---|---|
| `Huevos y Pescado`, `Huevos y semillas`, `Pollo y Vacuna` | 3 | → `"Mixta"` (mecánico) |
| `Frutas` | 1 | → `"Vegetariana"` (mecánico) |
| `Vegetariana` | 18 | **Auditar** — re-clasificar las que tengan proteína real; las demás quedan |
| `Semillas`, `Frutos secos`, `Fiambre` | varias | **Ninguna** — ya son valores válidos del listado de 13 |

## Diagnóstico requerido ANTES de tocar nada

Reportá cada punto con evidencia **literal** (código/JSON pegado con ruta+línea). No
escribas "✅"; pegá lo que respalda cada afirmación.

### D1 — Estado de las 4 copias de la lista de proteínas

- `models.ts`: pegá `PROTEINAS` y el tipo `Proteina`. Confirmá que tiene los 13.
- `/config/diccionarios`: traé el doc de Firestore, pegá el array `proteinas` literal.
- `scripts/seed-config-importador.ts`: pegá la línea del prompt modelo que lista las
  proteínas (E5.1-VERIF la ubicó en :45).
- El filtro de Biblioteca: confirmá de dónde lee (E3.4.8.1 dijo `models.ts`); pegá el
  import.

### D2 — Recetas con `proteinaPrincipal` fuera del listado de 13

De Firestore, traé **todas** las recetas cuyo `proteinaPrincipal` NO esté entre los 13
valores canónicos. Tabla literal: `idReceta` · `nombreCanonico` · `proteinaPrincipal` ·
`tipoItem`. Esperado: las 4 mecánicas (3 compuestas + 1 "Frutas"). Si aparece alguna
otra, reportala.

### D3 — Las 18 recetas `proteinaPrincipal: "Vegetariana"` — con ingredientes

De Firestore, traé las 18 recetas con `proteinaPrincipal: "Vegetariana"`. Para cada
una: `idReceta`, `nombreCanonico`, `tipoItem`, y la lista de ingredientes
(`ingredientes[].nombrePreferido` o el campo de nombre real, con `rol`/`seccion` si
está). Alimenta la auditoría D6.

### D4 — ¿El seed del importador ya se corrió?

¿Existe el doc `/config/importador` en Firestore? Si existe, pegá su JSON crudo. Esto
define si F4 (abajo) tiene que actualizar un doc existente o si alcanza con corregir el
script para la primera corrida.

## Cambios de datos en Firestore — MECÁNICOS

> Commit `Data:` separado de cualquier cambio de código/script. `update` puntuales por
> `idReceta`, tocando **solo** `proteinaPrincipal`. Script idempotente en `scripts/` o
> consola. **No** reseed completo.

### F1 — 3 recetas compuestas → `"Mixta"`

Las recetas con `proteinaPrincipal` ∈ {`Huevos y Pescado`, `Huevos y semillas`,
`Pollo y Vacuna`} (de D2): `update` a `"Mixta"`.

### F2 — Receta `"Frutas"` → `"Vegetariana"`

La receta con `proteinaPrincipal: "Frutas"` (de D2): `update` a `"Vegetariana"`.
Reportá su `idReceta` + `nombreCanonico`.

### F3 — `/config/diccionarios.proteinas` → 13 valores

Reemplazar el array `proteinas` del doc `/config/diccionarios` por los 13 valores
canónicos, en el orden del listado de arriba.

## Cambios de código/script

### F4 — Corregir el seed del importador

En `scripts/seed-config-importador.ts`, la línea del prompt modelo que lista las
proteínas (E5.1-VERIF: línea ~45) tiene 10 valores. Reemplazarla por los 13:

```
proteinaPrincipal: [uno de exactamente: Vacuna, Cerdo, Pollo, Cordero, Pescado, Mariscos, Huevos, Fiambre, Legumbres, Semillas, Frutos secos, Mixta, Vegetariana]
```

Revisar también el **ejemplo de entrada/salida** dentro del prompt modelo: si usa una
proteína, confirmar que sea una de las 13 (E5.1-VERIF dijo que el ejemplo usa "Pollo",
que está en ambas listas — pero verificalo de nuevo tras el cambio).

**Aplicar el seed corregido a Firestore:**
- Si D4 mostró que el doc `/config/importador` **no existe** todavía: el seed se corre
  normalmente (`npx ts-node --esm scripts/seed-config-importador.ts`) — JP lo corre,
  ya que requiere `service-account.json` que no está en el repo. Code deja el comando
  y la instrucción.
- Si D4 mostró que el doc **ya existe** con la lista vieja de 10: el seed es
  idempotente y "no sobreescribe si el campo ya existe" (según el reporte E5.1) — así
  que correrlo de nuevo NO va a corregir el doc. En ese caso hay que, o bien borrar el
  doc antes de re-correr el seed, o actualizar el campo directamente. Code deja la
  instrucción exacta de qué hacer; JP la ejecuta.

Documentá en el reporte cuál de los dos casos aplica.

## Auditoría de las 18 recetas "Vegetariana" — PROPUESTA, SIN WRITE

> **Esta sección NO escribe en Firestore.** Produce una tabla que JP revisa. El re-tag
> real va en un prompt de seguimiento (E5.2.1), una vez que JP apruebe.

### D6 — Tabla de re-clasificación propuesta

Para cada una de las 18 recetas de D3, proponé un `proteinaPrincipal`:
- Si tiene un ingrediente que es su **proteína ancla** clara (huevos, legumbres,
  semillas, frutos secos, carne/pescado que se haya pasado por alto) → proponé ese
  valor de los 13.
- Si es genuinamente vegetal sin proteína ancla (ensalada, guarnición de verdura,
  postre de fruta) → proponé que **quede `"Vegetariana"`**.
- Ante la duda → `"Vegetariana"` + marca "revisar".

Tabla literal: `idReceta` · `nombreCanonico` · actual · **propuesto** · justificación
en una línea. **No** apliques ningún cambio sobre estas 18.

## Fuera de scope (no hacer)

- **No** tocar `models.ts` — `PROTEINAS` ya tiene los 13 correctos.
- **No** migrar el filtro de Biblioteca para leer de `/config/diccionarios` en vez de
  `models.ts` (refactor con su propio prompt; este solo deja el dato correcto).
- **No** cambiar el tipado de `proteinaPrincipal` en `Receta` si hoy es `string`.
- **No** correr reseed completo de recetas.
- **No** escribir los cambios de la auditoría D6.
- **No** tocar `ING-0178` ni las recetas de prueba `REC-15xx`.
- **No** tocar el parser del importador ni el formato TXT (E5.1-VERIF confirmó que
  están bien).

## Criterios de aceptación — verificación literal obligatoria

1. **F1 aplicado.** JSON crudo de las 3 recetas leído **de Firestore después del
   update**, con `proteinaPrincipal: "Mixta"`.
2. **F2 aplicado.** JSON crudo de la receta "Frutas" después del update, con
   `proteinaPrincipal: "Vegetariana"`.
3. **F3 aplicado.** Array `proteinas` del doc `/config/diccionarios` leído de Firestore
   después del update — los 13 valores.
4. **F4 — seed corregido.** Pegá la línea final del prompt modelo en
   `seed-config-importador.ts` con los 13 valores. Y, tras aplicar el seed: pegá el
   JSON crudo del doc `/config/importador` leído de Firestore, mostrando el prompt
   modelo con las 13 proteínas. (Si el seed lo corre JP, este criterio lo completa JP.)
5. **Cruce final de recetas.** Re-corré el conteo de valores distintos de
   `proteinaPrincipal` sobre las 78 recetas. Esperado: todos ∈ los 13. Las 18
   auditadas siguen en `"Vegetariana"` por ahora (válido). Pegá la tabla de conteo.
6. **Las 4 copias alineadas.** Confirmá, lado a lado, que `models.ts`,
   `/config/diccionarios.proteinas` y el prompt modelo del importador listan ahora los
   **mismos 13 valores**.
7. **Tabla D6 presente.** La propuesta de las 18 recetas está en el reporte, completa,
   sin haberse aplicado.
8. **Compila y linta** (si se tocó algún `.ts`): salida literal de `npm run build` y
   `npm run lint`, sin errores nuevos sobre la línea base (20 pre-existentes).
9. **Verificación en la app (JP).** Code deja el checklist: Biblioteca → filtro de
   proteína → confirmar que "Fiambre", "Semillas", "Frutos secos" aparecen y filtran
   bien.

## Cierre del reporte de Code

- Resultado de D4 (doc `/config/importador` existía o no) y qué se hizo en F4 en
  consecuencia.
- Identidad de la receta "Frutas".
- La tabla D6 completa.
- Confirmación de que no se tocó nada fuera de scope.

## Commits

```
Data: canonizar proteinaPrincipal de recetas (compuestas a Mixta, Frutas a Vegetariana)
```

```
Data: alinear /config/diccionarios.proteinas a los 13 valores canonicos
```

```
Stage E5.2: corregir lista de proteinas en el seed del importador
```

```
Docs: MAPEO v1.6.7 (E5.2 — canonizacion de proteinas)
```

(Code agrupa o separa según convenga, respetando la convención: `Data:` para datos,
`Stage:` para código/scripts, `Docs:` para el MAPEO. Actualizar §2.7 del MAPEO con la
lista de 13 y header a v1.6.7.)

## Próximo paso (no ejecutar ahora)

Con el reporte y la tabla D6, el asistente arma **E5.2.1** — prompt `Data:` que aplica
la re-clasificación de las 18 recetas que JP apruebe. Después de eso, la lista de
proteínas queda canónica de punta a punta y el importador (E5.1) cierra de verdad.
Pendientes que siguen: **E4.4** (guard de cocinar — prompt ya armado), deuda de UI del
importador (§10.2), limpieza de datos (`ING-0178` §10.3, `REC-15xx` §10.4), Etapa 6.
