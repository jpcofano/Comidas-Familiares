# PROMPT E5.3 — Pluralización de unidades + contraste del botón de sugerencia

> **Tipo:** deuda de UI — cambios de presentación, sin tocar datos.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Ancla:** §10.2 del MAPEO (Deuda de UI en el importador). **MAPEO vigente:** v1.6.7.

## Alcance

Dos arreglos de presentación de §10.2 del MAPEO. **Solo display — no se toca ningún
dato en Firestore, ni el parser del importador, ni el modelo.**

1. **Pluralización de unidades** (§10.2.2): la lista de compras muestra `"3 u"`,
   `"2 cda"` — la abreviatura canónica sin pluralizar. Hay que pluralizar al mostrar.
2. **Contraste del botón de sugerencia** (§10.2.1): los botones de sugerencia no
   seleccionados del importador muestran la categoría en `color: #888`, bajo contraste.

El tercer ítem de §10.2 — **"a gusto" para ingredientes sin unidad — queda
explícitamente FUERA de este prompt.** Es un cambio de parser/modelo, no de UI, y JP
decidió posponerlo. No abordarlo ni de paso.

## Decisiones de diseño zanjadas (no re-discutir)

1. **El dato canónico NO se toca.** En Firestore, la unidad se sigue guardando en
   abreviatura singular (`u`, `cda`, `cdita`, `g`, `ml`, `kg`...). La pluralización
   ocurre **solo en una función de presentación**, al renderizar. Esto es reversible y
   de bajo riesgo: si no gusta, se cambia la función.
2. **Las unidades quedan ABREVIADAS** — no se expanden a palabra completa. `"3 u"`,
   no `"3 unidades"`. Lo que cambia es solo el plural de la abreviatura.
3. **No todas las abreviaturas pluralizan.** Las de cocina sí; las de peso/volumen no
   (igual que en el uso real: nadie escribe "3 kgs"). Tabla en C1.

## Diagnóstico requerido ANTES de codear

Reportá cada punto con evidencia **literal** (código pegado con ruta+línea). No
escribas "✅"; pegá lo que respalda cada afirmación.

### D1 — Dónde y cómo se muestra la cantidad+unidad en la lista de compras

Localizá el componente de la lista de compras (`src/routes/Compras.tsx` y/o el item
de compra). Pegá el trozo que renderiza la cantidad y la unidad de cada ítem. Reportá:
¿qué campo se muestra — `cantidadLabel`, `cantidad` + `unidad` por separado, otro?
¿Hay ya alguna función que formatee eso, o se concatena inline?

### D2 — El catálogo de unidades canónicas

El proyecto normaliza unidades (E3.4.5, `src/lib/unidades.ts` con `normalizarUnidad()`).
Abrí ese archivo y pegá la **lista completa de unidades canónicas** que maneja — todas
las abreviaturas singulares válidas. La tabla de pluralización de C1 tiene que cubrir
exactamente ese conjunto, sin inventar unidades que no existan ni dejar afuera ninguna.

### D3 — Dónde más se muestra cantidad+unidad

Además de la lista de compras, ¿se muestra cantidad+unidad en otras pantallas? — el
detalle de receta, la pantalla de cocinar, el importador (paso de revisión). Listá
cada lugar con su ruta. El objetivo: decidir en C2 si la función de pluralización se
aplica solo a la lista de compras (lo que pide §10.2) o a todos los lugares por
consistencia.

### D4 — El botón de sugerencia del importador

En `src/routes/ImportarReceta.tsx` (paso 2, sugerencias de matcher), localizá el botón
de sugerencia no seleccionado. Pegá el código con el `color: #888` (o el valor real
que tenga). Confirmá el color exacto actual.

## Cambios de código

### C1 — Función de pluralización de unidades

Crear una función de presentación — ubicación coherente, sugerencia: en
`src/lib/unidades.ts` junto a `normalizarUnidad()`, algo como
`formatearCantidadUnidad(cantidad, unidad)` o `pluralizarUnidad(unidad, cantidad)`.

Recibe la cantidad y la unidad canónica (singular), devuelve el string a mostrar. Regla:
- Si `cantidad <= 1` (o no hay cantidad): la unidad va en singular, tal cual.
- Si `cantidad > 1`: pluralizar **solo** las unidades que lo admiten.

Tabla de pluralización — **ajustar a la lista real que devuelva D2**, esto es la guía:

| Abreviatura canónica | Plural (cantidad > 1) | ¿Pluraliza? |
|---|---|---|
| `u` (unidad) | `u` | No — la abreviatura no lleva `s` |
| `cda` (cucharada) | `cdas` | Sí |
| `cdita` (cucharadita) | `cditas` | Sí |
| `g`, `kg`, `ml`, `l` (peso/volumen) | igual | No |
| `taza` / `tza` | `tazas` / `tzas` (según cuál sea la canónica) | Sí |
| `pizca` | `pizcas` | Sí |

> Code: completá la tabla con **todas** las unidades reales de D2. Para cada una decidí
> si pluraliza siguiendo el criterio: las unidades-palabra de cocina pluralizan; las
> abreviaturas de medida científica (g, ml, kg, l) no. Si alguna unidad de D2 es
> ambigua, marcala en el reporte y proponé — no la dejes sin definir.

La función no debe romper si llega una unidad desconocida: en ese caso, devolver la
unidad tal cual (singular), sin error.

### C2 — Aplicar la función en la lista de compras

En el componente de D1, usar `formatearCantidadUnidad` para renderizar cantidad+unidad
en lugar de la concatenación / `cantidadLabel` actual.

Sobre D3: si cantidad+unidad se muestra en otros lugares con el mismo problema,
aplicá la función ahí también — es la misma pieza de presentación y la consistencia
conviene. Si algún lugar tiene un formato distinto a propósito, dejalo y documentá por
qué. Reportá en qué pantallas terminaste aplicándola.

### C3 — Contraste del botón de sugerencia

En `ImportarReceta.tsx`, cambiar el `color: #888` del botón de sugerencia no
seleccionado a un gris más oscuro. §10.2.1 sugiere `#555` o `#666`. Usar **`#555`** —
mejor contraste, sigue siendo claramente "secundario". Si el proyecto tiene una
variable CSS de color de texto secundario (`--muted`, `--text-secondary` o similar),
usar esa en lugar del hex hardcodeado y reportar cuál. No tocar el botón seleccionado.

## Fuera de scope (no hacer)

- **No** tocar datos en Firestore — la unidad canónica se guarda igual.
- **No** tocar el parser del importador ni `normalizarUnidad()` — solo se agrega una
  función nueva de display.
- **No** abordar el "a gusto" / ingredientes sin unidad (§10.2.3) — pospuesto por JP.
- **No** expandir las abreviaturas a palabra completa — quedan abreviadas (decisión 2).
- **No** tocar `ING-0178` ni las recetas `REC-15xx`.

## Criterios de aceptación — verificación literal obligatoria

1. **Compila y linta.** Salida literal de `npm run build` y `npm run lint` — sin
   errores nuevos sobre la línea base (20 pre-existentes).
2. **Función final.** Pegá `formatearCantidadUnidad` completa, con la tabla de
   pluralización cubriendo todas las unidades de D2.
3. **Verificación en la app (JP)** en https://comida-familiar.web.app — Code deja el
   checklist:
   - Abrir la lista de compras de un plan con ítems variados. Confirmar que se ven
     `"2 cdas"`, `"3 cditas"`, etc. pluralizados, y que `"1 cda"`, `"200 g"`, `"3 u"`
     quedan correctos (singular donde corresponde, sin `s` en g/u).
   - Si C2 se aplicó a otras pantallas (D3), verificarlas también.
   - Abrir el importador, paso 2 con sugerencias → confirmar que el texto de categoría
     del botón no seleccionado se lee mejor que antes.
4. **Dato intacto.** Confirmar (leyendo un ítem de compra de Firestore) que la unidad
   guardada sigue siendo la abreviatura singular canónica — la pluralización es solo
   visual.

## Cierre del reporte de Code

- La tabla de pluralización final (todas las unidades de D2, con su decisión).
- En qué pantallas se aplicó la función (C2 / D3).
- El color final del botón (hex o variable CSS).
- Confirmación de que no se tocó ningún dato ni el parser.

## Commit

```
Stage E5.3: pluralizacion de unidades en display + contraste boton sugerencia
```

Si se actualiza §10.2 del MAPEO marcando los ítems 1 y 2 como resueltos:
`Docs: MAPEO v1.6.8 (E5.3 — deuda UI importador parcial)`. El ítem 3 ("a gusto") queda
abierto en §10.2.

## Próximo paso (no ejecutar ahora)

Pendientes que siguen, para que JP elija:
- §10.2.3 — "a gusto" para ingredientes sin unidad (pospuesto; sería E5.4 si JP lo
  retoma — toca el parser del importador).
- Limpieza de datos: `ING-0178` (§10.3), recetas de prueba `REC-15xx` (§10.4).
- **Etapa 6** — PWA (manifest, service worker, push).
