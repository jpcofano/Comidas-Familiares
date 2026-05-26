# PROMPT E3.4.8.2 — Fix del filtro de proteínas + limpieza de datos de recetas

> **Tipo:** fix de código + corrección de datos en Firestore + auditoría (propuesta, sin write).
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Ancla:** `docs/reportes/REPORTE_E3.4.8.1_diag_filtros.md` (veredicto **B**, commit `4f7daed`). Leerlo antes de empezar.
> **MAPEO vigente:** v1.6.0.

## Contexto

El diagnóstico E3.4.8.1 cerró con veredicto **B — regresión menor**: los filtros de
Biblioteca funcionan, ninguno toca el catálogo de ingredientes, `categoriaOverride` /
`seccionDefault` están ausentes del runtime. **Sin regresión estructural.**

El único defecto: el filtro de **proteína** lee de la constante `PROTEINAS`
(`src/types/models.ts`, 10 valores), pero las 78 recetas de Firestore contienen 15
valores distintos en `proteinaPrincipal`. 16 recetas (20.5%) no son seleccionables.

### Principio de diseño aplicado

`PROTEINAS` se define **top-down** — qué es una proteína válida — **no** se reconstruye
a partir de los valores que quedaron cargados en las recetas. Los valores de Firestore
que no encajan en un listado limpio son **datos mal cargados que se corrigen**, no
entradas que se agregan al diccionario.

### Listado canónico `PROTEINAS` — 13 valores

```typescript
export const PROTEINAS = [
  // Proteína animal
  "Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado", "Mariscos", "Huevos", "Fiambre",
  // Proteína vegetal
  "Legumbres", "Semillas", "Frutos secos",
  // Meta-valores
  "Mixta", "Vegetariana",
] as const;
```

Decisiones, y por qué:

- **`Fiambre`** se agrega: es una proteína animal real que faltaba en el listado.
- **`Semillas`** y **`Frutos secos`** se agregan: son proteína vegetal, hermanas de
  `Legumbres` (que ya estaba en el listado). Dejar `Legumbres` adentro y estas afuera
  sería una inconsistencia arbitraria del diccionario.
- **`Mixta`** se mantiene (ya estaba): valor para una receta con dos o más proteínas.
- **`Vegetariana`** se mantiene (ya estaba), **pero con significado estricto**: es para
  recetas que genuinamente **no tienen una proteína que las ancle**. No es un cajón de
  sastre — una omelette vegetariana cuyo ancla real es el huevo debe ser `"Huevos"`,
  no `"Vegetariana"`.
- **`"Frutas"`** NO entra al listado: la fruta no es una proteína. Nunca estuvo en
  `PROTEINAS`; solo aparecía como dato mal cargado en 1 receta.

**El cambio de código es puramente aditivo:** `PROTEINAS` pasa de 10 a 13 valores
sumando `Fiambre`, `Semillas`, `Frutos secos`. No se elimina ningún valor de la
constante.

### Datos a corregir

| Valor cargado en Firestore | Recetas | Acción |
|---|---|---|
| Huevos y Pescado / Huevos y semillas / Pollo y Vacuna | 3 | Reasignar a `"Mixta"` (mecánico). |
| Frutas | 1 | Reasignar a `"Vegetariana"` (mecánico — fruta sin proteína ancla). |
| Vegetariana | 18 | **Auditar** — re-clasificar a la proteína real las que tengan una; las que genuinamente no tengan, quedan `"Vegetariana"`. |

## Diagnóstico requerido ANTES de codear

Reportá cada punto con evidencia **literal** (código pegado con ruta+línea, JSON crudo
de Firestore). No escribas "✅"; pegá lo que respalda cada afirmación.

### D1 — Cómo se deriva el tipo `Proteina`

En `src/types/models.ts`, pegá: la declaración actual de `PROTEINAS`; la del tipo
`Proteina` (¿`typeof PROTEINAS[number]`? ¿union manual?); el campo `proteinaPrincipal`
del tipo `Receta` (¿`Proteina`? ¿`string`?); y cualquier otra constante que dependa de
`PROTEINAS` (ej. `DiccionariosConfig.proteinas`).

### D2 — Usos de `Proteina` y `PROTEINAS` en `src/`

Todas las referencias, con ruta+línea. Reportá explícitamente si hay algún `switch`
sobre proteína o chequeo de exhaustividad que se rompa al agregar valores. Si no hay,
decilo.

### D3 — Recetas con `proteinaPrincipal` fuera del listado original

De Firestore, traé **todas** las recetas cuyo `proteinaPrincipal` sea uno de:
`Semillas`, `Frutos secos`, `Fiambre`, `Huevos y Pescado`, `Huevos y semillas`,
`Pollo y Vacuna`, `Frutas`. Tabla literal: `idReceta` · `nombreCanonico` ·
`proteinaPrincipal` · `tipoItem`. Deben aparecer 16 recetas.

### D4 — Las 18 recetas `proteinaPrincipal: "Vegetariana"` — con ingredientes

De Firestore, traé las 18 recetas con `proteinaPrincipal: "Vegetariana"`. Para cada
una, pegá: `idReceta`, `nombreCanonico`, `tipoItem`, y la **lista de ingredientes**
(`ingredientes[].nombrePreferido` o el campo de nombre que tengan, con su `rol` /
`seccion` si está). Esto alimenta la propuesta de re-clasificación de D7.

### D5 — Estado actual de `/config/diccionarios.proteinas`

Traé el doc `/config/diccionarios` de Firestore y pegá el array `proteinas` tal cual.

## Cambios de código

### C1 — Extender `PROTEINAS` (aditivo)

En `src/types/models.ts`, `PROTEINAS` pasa a los 13 valores del listado canónico de
arriba, en ese orden. Es puramente aditivo (+`Fiambre`, +`Semillas`, +`Frutos secos`).

- Si D1 mostró que `Proteina` se deriva con `typeof PROTEINAS[number]`: no se toca nada
  más para el tipo.
- Si `Proteina` es un union manual: sincronizalo con los 13 valores.
- Si `proteinaPrincipal` en `Receta` está tipado como `string`: **dejalo como está**,
  no es parte de este fix. Anotalo como observación.

### C2 — Nada más en código

No se toca `Biblioteca.tsx` ni `filtros.ts`: el reporte E3.4.8.1 confirmó que
`filtrarRecetas` compara correctamente. El `<select>` mapea `PROTEINAS`, así que los 3
valores nuevos aparecen solos.

## Cambios de datos en Firestore — MECÁNICOS

> Commit `Data:` separado del de código. Usar script idempotente en `scripts/` o
> consola. **No** correr reseed completo: son `update` puntuales por `idReceta`,
> tocando **solo** el campo `proteinaPrincipal`.

### F1 — 3 recetas compuestas → `"Mixta"`

Las recetas con `proteinaPrincipal` ∈ {`Huevos y Pescado`, `Huevos y semillas`,
`Pollo y Vacuna`} (de D3): `update` de `proteinaPrincipal` a `"Mixta"`.

### F2 — Receta `"Frutas"` → `"Vegetariana"`

La receta con `proteinaPrincipal: "Frutas"` (de D3): `update` a `"Vegetariana"`.
Reportá su `idReceta` + `nombreCanonico` en el reporte.

### F3 — `/config/diccionarios.proteinas` → 13 valores

Reemplazar el array `proteinas` del doc `/config/diccionarios` por los 13 valores
canónicos de C1, mismo orden.

## Auditoría de las 18 recetas "Vegetariana" — PROPUESTA, SIN WRITE

> **Esta sección NO escribe nada en Firestore.** Produce una tabla que JP revisa. El
> re-tag real va en un prompt de seguimiento, una vez que JP apruebe la propuesta.

### D6 — Tabla de re-clasificación propuesta

Para cada una de las 18 recetas de D4, proponé un `proteinaPrincipal` nuevo aplicando
esta regla:

- Si la receta tiene un ingrediente que es claramente su **proteína ancla** (huevos,
  legumbres, semillas, frutos secos, o incluso carne/pescado que se haya pasado por
  alto), proponé ese valor del listado de 13.
- Si la receta es genuinamente vegetal **sin una proteína que la ancle** (ensalada,
  guarnición de verdura, postre de fruta), proponé que **quede en `"Vegetariana"`**.
- Ante la duda, proponé `"Vegetariana"` y marcala como "revisar".

Tabla literal: `idReceta` · `nombreCanonico` · `proteinaPrincipal` actual ·
**propuesto** · justificación en una línea (qué ingrediente la ancla, o por qué queda
vegetariana).

No apliques ningún cambio sobre estas 18 recetas en esta corrida.

## Fuera de scope (no hacer)

- **No** migrar los filtros para leer de `/config/diccionarios` en vez de `models.ts`
  (deuda técnica registrada, prompt aparte).
- **No** cambiar el tipado de `proteinaPrincipal` en `Receta` si hoy es `string`.
- **No** correr reseed completo.
- **No** tocar `ING-0178` ni las recetas de prueba `REC-15xx`.
- **No** escribir los cambios de la auditoría D6.

## Criterios de aceptación — verificación literal obligatoria

Cada criterio se valida pegando evidencia, no afirmando que pasó.

1. **`PROTEINAS` tiene 13 valores.** Pegá la constante final de `models.ts`.
2. **Compila y linta.** Salida literal de `npm run build` y `npm run lint`, sin
   errores nuevos.
3. **F1 aplicado.** JSON crudo de las 3 recetas leído **de Firestore después del
   update**, mostrando `proteinaPrincipal: "Mixta"`.
4. **F2 aplicado.** JSON crudo de la receta `"Frutas"` leído de Firestore después del
   update, mostrando `proteinaPrincipal: "Vegetariana"`.
5. **F3 aplicado.** Array `proteinas` del doc `/config/diccionarios` leído de Firestore
   después del update — 13 valores.
6. **Cruce final.** Re-corré el conteo de valores distintos de `proteinaPrincipal`
   sobre las 78 recetas. Resultado esperado: todos los valores ∈ `PROTEINAS` de 13.
   Las 18 recetas auditadas siguen en `"Vegetariana"` por ahora (válido, está en el
   listado). Pegá la tabla de conteo.
7. **Tabla D6 presente.** La propuesta de re-clasificación de las 18 recetas está en
   el reporte, completa, sin haberse aplicado.
8. **Verificación en la app (la hace JP).** Code deja el checklist: abrir Biblioteca →
   tab Recetas → filtro de proteína → confirmar que aparecen "Fiambre", "Semillas" y
   "Frutos secos", y que al seleccionarlos salen las recetas esperadas.

## Cierre del reporte de Code

- Identidad de la receta `"Frutas"` (F2).
- La tabla D6 completa.
- Observación sobre el tipado de `proteinaPrincipal` si era `string`.
- Confirmación de que no se tocó nada fuera de scope ni se escribió la auditoría.

## Commits

Dos commits en esta corrida:

```
Stage E3.4.8.2: agregar Fiambre/Semillas/Frutos secos a PROTEINAS
```

```
Data: reasignar proteinaPrincipal (compuestas a Mixta, Frutas a Vegetariana) + diccionarios
```

## Próximo paso (no ejecutar ahora)

Con el reporte y la tabla D6 en mano, el asistente arma un prompt de seguimiento
`Data:` que aplica la re-clasificación de las 18 recetas que JP apruebe. Después de
eso, y con la verificación de JP en la app, queda habilitado **E4.1 — dashboard de
miembro**.
