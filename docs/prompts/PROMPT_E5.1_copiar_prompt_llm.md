# PROMPT E5.1 — "Copiar prompt para LLM" en el importador (Etapa 5)

> **Tipo:** feature chica sobre el importador existente + seed de un doc de config.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Ancla:** E3.4.6/7/9 (el importador ya construido). **MAPEO vigente:** v1.6.6.
> Referencia: §7.5 (Etapa 5 — Importador), §9.4 (OCR, futuro Blaze).

## Contexto y alcance real

El importador de recetas TXT **ya existe**: pantalla `/biblioteca/importar`
(`ImportarReceta.tsx`), parseo, validaciones, anti-duplicado, matcher con sugerencias.
Se construyó en la Etapa 3.

La descripción de §7.5 del MAPEO ("Etapa 5 — Importador: pantalla con textarea +
'Copiar prompt para LLM' + 'Importar'...") se escribió **antes** de que el importador
existiera y quedó desactualizada: casi todo lo que pide ya está hecho. **La única pieza
genuinamente pendiente de §7.5 es el botón "Copiar prompt para LLM".**

Idea de esa pieza: JP no tipea la receta en formato TXT a mano. Copia un **prompt
modelo**, se lo pega a un LLM externo (ChatGPT, Claude, etc.) junto con la receta en
lenguaje natural, y el LLM le devuelve el TXT con el formato exacto que el importador
parsea. JP pega ese TXT en el importador. Es el "OCR para pobres" — sin Cloud Functions
ni Vision API (eso es §9.4, futuro Blaze).

**Este prompt cierra la Etapa 5 agregando esa pieza. Es chico — no rehace el importador.**

## Decisiones de diseño zanjadas (no re-discutir)

1. **El prompt modelo vive en Firestore**, en un documento bajo `/config` (decisión de
   JP). JP puede editarlo sin tocar código.
2. **El doc se siembra (seed) con el prompt modelo correcto**, no se crea vacío. La
   primera versión la provee este prompt (ver C1). JP edita desde ahí si quiere.
3. **Riesgo conocido y su mitigación.** El prompt modelo está acoplado al formato TXT
   que el parser del importador espera: si JP lo edita y rompe ese acople, el LLM
   devolverá un TXT que el parser no entiende. Mitigación: la pantalla muestra una
   nota breve advirtiéndolo (C3). No se implementa validación del prompt — solo el
   aviso.
4. **Solo JP usa el importador** (ya es así: la pantalla redirige a `/biblioteca` si el
   usuario no es `juanpablo`). No se cambia ese guard.
5. **El formato TXT no se toca.** El prompt modelo se redacta para producir
   exactamente el formato que el parser actual ya entiende. Este prompt no cambia el
   parser.

## Diagnóstico requerido ANTES de codear

Reportá cada punto con evidencia **literal** (código pegado con ruta+línea, JSON crudo
de Firestore). No escribas "✅"; pegá lo que respalda cada afirmación.

### D1 — ¿Existe ya el botón "Copiar prompt para LLM"?

Abrí `src/routes/ImportarReceta.tsx` completo. Reportá: ¿hay ya un botón "Copiar prompt
para LLM" o similar, total o parcialmente implementado? ¿Hay algún texto de prompt
modelo hardcodeado en alguna parte del código? Si existe algo, pegalo — el trabajo
puede ser "completar/migrar" en vez de "crear de cero".

### D2 — El formato TXT que el parser espera

Localizá el parser del importador (la función que toma el TXT pegado y lo convierte en
receta — puede estar en `ImportarReceta.tsx` o en un `src/lib/`). Pegá la parte que
define **qué estructura espera el TXT**: los marcadores/encabezados (algo tipo
`#RECETA`, `#INGREDIENTES`, `#PASOS`, o lo que use), separadores, campos. El prompt
modelo de C1 tiene que pedirle al LLM exactamente este formato — necesito verlo literal
para redactarlo bien. Pegá también, si existe, un ejemplo de TXT válido (de un test,
un comentario, o la doc del importador).

### D3 — Cómo se leen los docs de `/config` hoy

¿Hay ya un patrón para leer documentos de `/config` (ej. `getDiccionarios` lee
`/config/diccionarios`)? Pegá esa función como molde. ¿Cómo se llama la capa de datos
de config — `src/data/diccionarios.ts`, `src/data/config.ts`? El lector del nuevo doc
debe seguir el mismo patrón.

### D4 — Inventario de `/config` en Firestore

Traé de Firestore la lista de documentos que hoy existen bajo `/config` (al menos
`diccionarios`, `familia`; puede haber más). Pegala. Sirve para elegir un nombre de doc
nuevo que no colisione (sugerencia: `/config/importador` o `/config/promptLLM` —
decidí y documentá).

### D5 — Security Rules de `/config`

Pegá la regla de `/config/{doc}` de `firestore.rules`. Confirmá que JP puede leer el
doc nuevo (y, si la pantalla de C3 va a permitir editarlo, escribir). Reportá lo que
haya.

## Cambios de código y datos

### C1 — Seed del doc de prompt modelo en Firestore

Crear el documento de config (nombre según D4, ej. `/config/importador`) con un campo
que contenga el **prompt modelo** — el texto que JP copiará para pegarle a un LLM.

El prompt modelo debe, como mínimo:
- Instruir al LLM a convertir una receta en lenguaje natural al formato TXT **exacto**
  que el parser de D2 espera (marcadores, separadores, campos — copiar la estructura
  real de D2, no inventar).
- Incluir un ejemplo corto de entrada (receta en prosa) → salida (TXT formateado).
- Aclararle al LLM que devuelva **solo** el TXT, sin explicaciones ni texto extra.

> El borrador del prompt modelo lo redacta Code a partir del formato real de D2. En el
> reporte, Code debe pegar el texto completo del prompt modelo que sembró, para que JP
> lo revise y ajuste si quiere.

Hacer el seed con un script idempotente en `scripts/` (estilo de los seeds existentes)
o por consola. Va en commit `Data:` separado.

### C2 — Lector del doc en la capa de datos

En la capa de config (según D3), agregar una función para leer el doc de C1 — mismo
patrón que `getDiccionarios`. Devuelve el prompt modelo (string). Si el doc no existe
o el campo está vacío, devolver un fallback razonable (string vacío o un mensaje), sin
romper la pantalla.

### C3 — Botón "Copiar prompt para LLM" en el importador

En `ImportarReceta.tsx`, agregar (o completar, según D1) el botón "Copiar prompt para
LLM":
- Al cargarse la pantalla, leer el prompt modelo vía C2.
- El botón copia ese texto al portapapeles (`navigator.clipboard.writeText`). Feedback
  visual breve al copiar ("Copiado ✓" por un par de segundos).
- Ubicarlo cerca del textarea de pegado del TXT, con un texto que explique el flujo en
  una línea ("Copiá este prompt, pegáselo a tu IA con la receta, y traé el resultado
  acá").
- **Nota de advertencia** (mitigación de la decisión 3): un texto chico, discreto,
  indicando que el prompt está acoplado al formato que el importador entiende y que
  editarlo mal puede hacer fallar las importaciones. No hace falta más que el aviso.

Diseño sobrio, consistente con la pantalla actual del importador. No rehacer la
pantalla — es un agregado.

### C4 — (Opcional, decidí y documentá) edición del prompt desde la app

§7.5 y la decisión de JP apuntan a que JP pueda editar el prompt sin tocar código. Si
es de bajo costo, agregá un modo de edición simple en la misma pantalla (un textarea
editable + guardar, visible solo para JP) que escriba el doc de C1. Si lo ves fuera del
alcance de un prompt chico, **no lo hagas** y dejalo anotado como deuda — JP puede
editar el doc desde la consola de Firebase mientras tanto. Reportá qué decidiste y por
qué.

### C5 — MAPEO

Actualizar §7.5 de `MAPEO_FIRESTORE.md`: reflejar que el importador ya estaba
construido (E3.4.6/7/9) y que la Etapa 5 se cierra con E5.1 = el botón "Copiar prompt
para LLM" + el doc de config. Documentar el doc nuevo de `/config` en la sección de
modelo de datos que corresponda. Header a **v1.6.7**.

## Fuera de scope (no hacer)

- **No** tocar el parser del importador ni el formato TXT.
- **No** tocar el matcher, las validaciones ni el anti-duplicado.
- **No** implementar OCR / foto / Vision API (es §9.4, futuro).
- **No** cambiar el guard "solo JP" del importador.
- **No** tocar la serie de proteínas ni nada de la Etapa 4.

## Criterios de aceptación — verificación literal obligatoria

1. **Compila y linta.** Salida literal de `npm run build` y `npm run lint` — sin
   errores nuevos respecto a la línea base (20 pre-existentes).
2. **Doc sembrado.** Pegá el JSON crudo del doc de `/config` leído **de Firestore**
   después del seed, mostrando el prompt modelo completo.
3. **Lector.** Pegá la función de C2.
4. **Botón funcionando** — JP verifica en https://comida-familiar.web.app:
   - Entrar como JP a `/biblioteca/importar` → el botón "Copiar prompt para LLM"
     aparece. Tocarlo → el prompt modelo queda en el portapapeles (JP lo pega en
     cualquier lado y confirma que es el texto del doc).
   - El feedback "Copiado ✓" aparece.
   - La nota de advertencia sobre el formato es visible.
5. **Flujo de punta a punta** — JP hace una prueba real: copia el prompt, se lo pega a
   un LLM con una receta en prosa, trae el TXT resultante, lo pega en el importador y
   confirma que **el importador lo parsea sin error**. Este es el criterio que valida
   que el prompt modelo y el parser están alineados. JP reporta el resultado.
6. **MAPEO** en v1.6.7 con §7.5 actualizada.

## Cierre del reporte de Code

- Resultado de D1 (si el botón ya existía en alguna forma).
- El texto completo del prompt modelo sembrado (C1) — para revisión de JP.
- Qué se decidió en C4 (edición desde la app sí/no) y por qué.
- Nombre del doc de `/config` elegido.
- Confirmación de que no se tocó el parser ni nada fuera de scope.

## Commits

```
Stage E5.1: boton Copiar prompt para LLM en el importador
```

```
Data: seed de /config/importador con el prompt modelo
```

```
Docs: MAPEO v1.6.7 (E5.1 — cierre Etapa 5)
```

## Próximo paso (no ejecutar ahora)

Con E5.1, la Etapa 5 queda cerrada. Pendientes acumulados, para que JP decida el orden:
- **E4.4** — guard de las rutas de cocinar por `asignaciones` (prompt ya armado, sin
  correr; cierra la consistencia de la Etapa 4).
- Serie de proteínas: **E3.4.8.2** (prompt armado, sin correr) + auditoría de las 18
  recetas "Vegetariana".
- Deuda de UI del importador (§10.2 del MAPEO): contraste del botón de sugerencia,
  pluralizar unidades, "a gusto".
- Limpieza de datos: `ING-0178` (§10.3), recetas de prueba `REC-15xx` (§10.4).
- **Etapa 6** — PWA (manifest, service worker, push).
