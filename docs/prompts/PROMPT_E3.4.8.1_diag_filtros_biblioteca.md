# PROMPT E3.8 — Diagnóstico de filtros de Biblioteca tras el rediseño del catálogo

> **Tipo:** diagnóstico puro. **NO se escribe ni se modifica código en esta etapa.**
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Numeración:** propuesta E3.8. Si preferís encadenarlo a la serie del catálogo, renombralo a E3.4.10 — es indistinto, ajustá el nombre del archivo y del commit.

## Contexto

La Etapa 3 está cerrada. Antes de arrancar la Etapa 4 (voto multi-miembro) hay que
descartar una regresión: el rediseño del catálogo de ingredientes en **E3.4.8**
reorganizó las dimensiones del catálogo (`categoria` pasó a 17 valores;
se agregaron `rolNutricional` y `seccionGondola`; se **eliminaron** los campos
`seccionDefault` y `categoriaOverride`).

La pantalla de **Biblioteca → tab Recetas** tiene filtros (`tipoItem`, `proteína`,
`sin lácteos`, `sin hidratos`). Esos filtros son campos **de la receta**, no del
catálogo de ingredientes — en principio E3.4.8 no debería haberlos tocado. Pero hay
una deuda conocida: **los filtros leen sus opciones de `src/types/models.ts`
(hardcodeadas), no de `/config/diccionarios`**. Si esas listas hardcodeadas quedaron
desincronizadas, o si algún filtro toca el catálogo de ingredientes de refilón,
los filtros pueden estar rotos o devolviendo resultados incompletos.

**Este prompt NO arregla nada.** Solo investiga y reporta con evidencia literal. El
reporte resultante anclará el prompt siguiente (fix puntual, o el OK para pasar a E4.1).

## Diagnóstico requerido ANTES de cualquier conclusión

Ejecutá los pasos en orden y reportá cada uno con la evidencia que se pide. No
resumas, no interpretes, no escribas "✅ verificado": pegá el contenido literal.

### D1 — Confirmar la versión real del MAPEO

Hay deriva detectada: el header de la copia disponible dice `Versión: 1.2`, pero el
trabajo posterior llegó hasta E3.6 / E3.7. Abrí `MAPEO_FIRESTORE.md` en el repo y
pegá **literal** las primeras ~10 líneas (el bloque de header con `Versión`, `Fecha`).
Indicá cuál es el número de versión vigente según el archivo committeado.

### D2 — Localizar la pantalla Biblioteca y su UI de filtros

- Encontrá el/los archivos de la ruta `/biblioteca` (probable `src/routes/Biblioteca.tsx`
  o equivalente; puede haber un subcomponente para la tab Recetas y otro para la
  tab Menús).
- Reportá la **ruta literal** de cada archivo involucrado.
- Pegá el bloque de código que **renderiza los controles de filtro** y el bloque
  que **aplica el filtrado** sobre el array de recetas (la lógica `.filter(...)` o
  las queries Firestore, según cómo esté hecho).

### D3 — Origen de las opciones de cada filtro

Para cada filtro de la tab Recetas, indicá de dónde sale la lista de opciones que
se le muestran al usuario:

- ¿Está hardcodeada en `src/types/models.ts`? Pegá **literal** los arrays/constantes
  relevantes de `models.ts`.
- ¿O se lee de `/config/diccionarios`? Si es así, indicá qué clave.
- ¿O se deriva en runtime de las recetas cargadas (ej. `[...new Set(recetas.map(...))]`)?

### D4 — Inventario de filtros: campo consultado por cada uno

Armá una tabla con una fila por filtro de la tab Recetas:

| Filtro (label en UI) | Tipo de control | Campo de la receta que consulta | Valores que ofrece el control |
|---|---|---|---|

Los valores de la última columna deben ser **literales** (copiados del código o de
`models.ts`), no parafraseados.

### D5 — Cruce con datos reales de Firestore

Traé entre 5 y 10 documentos de la colección `recetas` desde Firestore (consola o
script de lectura, lo que sea más rápido) y pegá **el JSON crudo** de al menos 3 de
ellos. Sobre el conjunto traído, reportá:

- Para cada campo que algún filtro consulta (`tipoItem`, `proteína` /
  `proteinaPrincipal`, `sinLacteos` / `lacteos`, `hidratos` — usá el nombre real del
  campo tal como aparece en los docs): la **lista de valores distintos** que
  efectivamente aparecen en las recetas.
- ¿Esos valores reales **coinciden exactamente** (mismo string, misma capitalización)
  con las opciones que el filtro ofrece según D3/D4? Marcá cualquier desajuste.

### D6 — Punto crítico E3.4.8: contacto con el catálogo de ingredientes

Verificá explícitamente, citando código:

- ¿**Algún** filtro o lógica de la pantalla Biblioteca lee campos del **catálogo de
  ingredientes** (`/ingredientes`)? En particular: `categoria`, `rolNutricional`,
  `seccionGondola`, o los campos **eliminados** `seccionDefault` / `categoriaOverride`.
- Buscá referencias a `categoriaOverride` y `seccionDefault` en **todo** `src/`
  (no solo Biblioteca). Pegá cada ocurrencia con su ruta y número de línea. Si E3.4.8
  eliminó esos campos del modelo pero quedó código que los lee, eso es código muerto
  o roto que hay que reportar.
- Confirmá si la lista de categorías hardcodeada en `models.ts` (si existe) es la
  vieja (criterio mezclado, pre-E3.4.8) o la nueva de 17 valores. Pegá la lista.

### D7 — Prueba funcional literal

Levantá la app (`npm run dev`) o usá producción. Para **cada** filtro de la tab
Recetas, uno por uno:

1. Anotá el conteo de recetas visibles **sin** filtro aplicado.
2. Aplicá el filtro con un valor concreto.
3. Anotá el conteo **con** el filtro aplicado.
4. Reportá si la consola del navegador tira algún error/warning al aplicarlo.
5. Verificá manualmente: ¿las recetas que quedan visibles realmente cumplen el
   criterio del filtro? ¿Quedó alguna afuera que debería estar?

Reportá esto como tabla: filtro · valor probado · conteo antes · conteo después ·
error en consola (sí/no + texto) · resultado correcto (sí/no + qué falló).

### D8 — Tab Menús (chequeo liviano)

¿La tab Menús de Biblioteca tiene filtros? Si **no**, decilo y terminá acá este punto.
Si **sí**, listá qué filtros son y aplicá el mismo cruce mínimo de D5 (valores
ofrecidos vs. valores reales en `/menus`).

## Formato del reporte exigido

- Un bloque por cada punto D1–D8, en orden.
- **Evidencia literal obligatoria:** código pegado con su ruta, JSON crudo de
  Firestore, conteos reales. Prohibido afirmar que algo "funciona" o "está verificado"
  sin pegar la evidencia que lo respalda.
- Al final, una sección **"Veredicto"** con una de tres conclusiones, justificada:
  - **A) Sin regresión** — los filtros funcionan, los valores coinciden, no hay
    contacto roto con el catálogo. → habilita pasar a E4.1.
  - **B) Regresión menor** — desajustes de strings / opciones desincronizadas que se
    arreglan sin tocar el modelo. → describí exactamente qué.
  - **C) Regresión estructural** — código que lee campos eliminados, filtros que
    dependen del catálogo viejo, etc. → describí el alcance.

## Qué NO hacer en esta etapa

- **No modificar ningún archivo.** Ni `models.ts`, ni la pantalla, ni nada.
- **No "arreglar" filtros** aunque encuentres el problema. El fix va en el prompt
  siguiente, anclado a este reporte.
- **No tocar Firestore** (ni re-seed, ni updates, ni borrar nada).
- **No crear ni borrar recetas de prueba.**

## Commit

Esta etapa no produce cambios de código. Si el reporte se guarda como archivo en el
repo (ej. `docs/reportes/REPORTE_E3.8_diag_filtros.md`), commitearlo como:

```
Docs: add REPORTE E3.8 (diagnóstico filtros Biblioteca)
```

## Próximo paso (no ejecutar ahora)

Con el reporte en mano, el asistente arma:
- Si veredicto **A** → prompt **E4.1** (dashboard de miembro).
- Si veredicto **B** o **C** → prompt de fix puntual de filtros, anclado literalmente
  a este reporte, y recién después E4.1.
