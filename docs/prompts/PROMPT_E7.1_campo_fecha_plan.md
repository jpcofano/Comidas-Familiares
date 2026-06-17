# PROMPT E7.1 — Campo `fecha` en el plan (modelo + asignación, sin UI)

> **Tipo:** cambio de modelo de datos + función de escritura + migración.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **MAPEO vigente:** confirmar versión en el header al abrir (rondaba v1.6.9 / v1.7.0).

## Contexto

Se viene un rediseño de la pantalla Home (handoff de diseño v2, prompt aparte más
adelante). Ese rediseño asume que cada plan tiene un **día asignado**: el `WeekStrip`
marca los días con comida, el `PlanCard` puede mostrar "Especial · Martes". Pero hoy el
plan **no tiene** un campo de día — solo `semanaInicio` (qué semana).

**E7.1 construye solo la mitad de datos de esa feature:** el campo `fecha` en el plan,
la función para asignarlo/cambiarlo, y la migración. **La UI para elegir el día NO se
hace acá** — esa parte (un selector de día, el WeekStrip) entra junto con el rediseño
de Home, porque están entrelazadas con el diseño. E7.1 deja el dato listo para que,
cuando llegue el rediseño, el WeekStrip y el PlanCard lean de un campo real con datos
reales, no de un placeholder.

## Decisiones de diseño zanjadas (no re-discutir)

1. **El día es OPCIONAL.** Un plan puede no tener fecha asignada. Los planes que ya
   existen quedan sin fecha y eso es válido — la Home futura los mostrará como "sin
   día". No hay migración de datos: los viejos simplemente no tienen el campo.
2. **Día exacto, sin momento.** El dato es un día calendario (ej. martes 27/05), no
   "mediodía / noche". Un solo nivel.
3. **Varios planes pueden caer el mismo día.** No hay regla de unicidad — el martes
   puede tener la Especial y un extra. La función de asignación NO valida ni impide
   días repetidos.
4. **El día tiene que caer dentro de la semana del plan.** Un plan tiene `semanaInicio`;
   la `fecha` que se le asigne debe pertenecer a esa semana (los 7 días desde
   `semanaInicio`). La función valida esto y rechaza una fecha fuera de rango.

## Diagnóstico requerido ANTES de codear

Reportá cada punto con evidencia **literal** (código pegado con ruta+línea, JSON crudo
de Firestore). No escribas "✅".

### D1 — El tipo `Plan` y el campo `semanaInicio`

En `src/types/models.ts`, pegá el tipo `Plan` completo. Reportá en particular:
- ¿Cómo está tipado `semanaInicio`? ¿Es un string `"YYYY-MM-DD"`, un `Timestamp` de
  Firestore, un `Date`? El campo `fecha` nuevo debe ser **consistente** con cómo el
  proyecto ya representa fechas — no introducir un formato distinto.
- ¿Hay ya otros campos de fecha en `Plan` (`fechaEleccion`, `fechaRealizada`...)? Pegá
  cómo están tipados. La `fecha` nueva sigue ese mismo patrón.

### D2 — Helpers de fecha existentes

¿El proyecto usa `date-fns`? (el handoff de diseño lo menciona). ¿Hay un
`src/lib/fechas.ts` o similar con helpers de semana — algo que calcule "los 7 días desde
`semanaInicio`", o "a qué semana pertenece una fecha"? Pegá lo que haya. La validación
de C2 (la fecha cae dentro de la semana) debe reusar estos helpers, no reimplementar
aritmética de fechas.

### D3 — Las funciones que crean y modifican planes

Listá las funciones de `src/data/planes.ts` que crean un plan (las 5 de creación que
E4.1 tocó) y las que lo modifican. Pegá la firma de cada una. E7.1 va a agregar una
función nueva de asignación de fecha — necesito ver el estilo (cómo devuelven
`Result<T, Error>`, cómo hacen `update`, si usan transacción).

### D4 — Estado actual de los planes en Firestore

Traé 2-3 planes de Firestore y pegá su JSON crudo. Confirmá que **ninguno** tiene hoy
un campo `fecha` (o como sea que se llame). Esto valida que la migración es no-op.

## Cambios de código

### C1 — Campo `fecha` en el tipo `Plan`

En `src/types/models.ts`, agregar al tipo `Plan` un campo `fecha` **opcional**,
tipado consistentemente con `semanaInicio` y los otros campos de fecha (según D1 —
mismo formato: string ISO, o `Timestamp`, lo que el proyecto use). Opcional = el tipo
lo marca como `fecha?: ...` o `fecha: ... | null`, según la convención del proyecto
para campos opcionales (mirá cómo están otros campos opcionales de `Plan` y seguí eso).

Documentá en el reporte qué formato y qué forma de "opcional" se eligió y por qué.

### C2 — Función `asignarFechaPlan` en `planes.ts`

```
asignarFechaPlan(idPlan, fecha)   // fecha en el formato de C1; o null para "quitar el día"
```

- `update` del campo `fecha` del plan. Permitir también **quitar** la fecha (pasar
  `null` / `deleteField()` — lo que sea coherente con cómo C1 representó "sin fecha").
- **Validación:** la `fecha` debe caer dentro de la semana del plan (los 7 días desde
  `plan.semanaInicio`). Si no, abortar con un mensaje claro. Reusar los helpers de D2.
- No validar unicidad de día (decisión 3 — varios planes pueden compartir día).
- Devolver `Result<T, Error>` siguiendo el estilo de los otros writes de `planes.ts`.
- Tocar **solo** el campo `fecha`, ningún otro.

### C3 — Las funciones de creación NO cambian su comportamiento

Las 5 funciones que crean planes (D3) **no** reciben fecha y **no** la setean — un plan
nace sin día (decisión 1). No agregar `fecha` al objeto de creación. Si Code cree que
conviene que alguna creación acepte una fecha opcional, **no lo haga en este prompt** —
anotarlo como observación; se decide con el rediseño.

### C4 — Migración: no-op, solo confirmar

Como el campo es opcional y los planes viejos quedan válidos sin él, **no hay
migración de datos que correr**. C4 es solo: confirmar en el reporte que los planes
existentes (D4) siguen siendo válidos sin el campo `fecha`, y que ninguna lectura
existente del plan se rompe por la ausencia del campo (revisar que nada haga
`plan.fecha.algo` sin chequear antes que exista).

### C5 — MAPEO

Documentar el campo `fecha` en la sección del modelo del Plan del MAPEO: opcional, día
exacto, dentro de la semana del plan, varios planes pueden compartir día. Documentar
`asignarFechaPlan`. Anotar que la UI para asignarlo llega con el rediseño de Home.
Subir el header al siguiente número de versión.

## Fuera de scope (no hacer)

- **No** construir UI de selección de día — eso va con el rediseño de Home.
- **No** construir el `WeekStrip` ni tocar `Home.tsx`.
- **No** hacer la fecha obligatoria ni tocar las funciones de creación.
- **No** validar unicidad de día.
- **No** tocar nada del rediseño visual (handoff v2) — E7.1 es solo el dato.

## Criterios de aceptación — verificación literal obligatoria

1. **Compila y linta.** Salida literal de `npm run build` y `npm run lint` — sin
   errores nuevos sobre la línea base (20 pre-existentes).
2. **Tipo final.** Pegá el tipo `Plan` con el campo `fecha` agregado.
3. **Función final.** Pegá `asignarFechaPlan` completa, mostrando la validación de
   "dentro de la semana" y que permite quitar la fecha.
4. **Prueba real de asignación.** Como no hay UI, Code prueba la función con un script
   temporal o desde la consola: asignar una fecha válida a un plan de prueba → pegar el
   JSON crudo del plan leído **de Firestore** mostrando el campo `fecha`. Después
   quitarla (asignar null) → pegar el JSON mostrando que el campo se fue.
5. **Validación funciona.** Code prueba asignar una fecha **fuera** de la semana del
   plan → confirma que la función la rechaza con el error esperado. Pegар el resultado.
6. **Planes viejos intactos.** Confirmar (D4 + C4) que los planes sin `fecha` siguen
   válidos y que ninguna pantalla se rompe por la ausencia del campo.
7. **MAPEO** actualizado.

## Cierre del reporte de Code

- Formato elegido para `fecha` (C1) y por qué — consistente con `semanaInicio`.
- Confirmación de que las funciones de creación no se tocaron.
- Confirmación de que ninguna lectura existente del plan asume que `fecha` existe.
- Cualquier observación para el rediseño (ej. dónde la Ui de selección de día tendrá
  que enganchar).

## Commit

```
Stage E7.1: campo fecha opcional en el plan + asignarFechaPlan
```

```
Docs: MAPEO — campo fecha del plan
```

## Próximo paso (no ejecutar ahora)

E7.1 deja el dato listo. Cuando JP termine de diseñar el resto de las pantallas en la
herramienta de diseño, se arma el **prompt grande del rediseño de Home** (handoff v2),
que incluye el `WeekStrip`, el `PlanCard` nuevo, y la **UI para asignar el día** a un
plan — esa UI lee y escribe el campo `fecha` que E7.1 creó.
