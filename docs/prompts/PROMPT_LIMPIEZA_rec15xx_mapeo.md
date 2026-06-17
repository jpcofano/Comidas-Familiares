# PROMPT LIMPIEZA — Verificar recetas de prueba + corregir §10.3 / §10.4 del MAPEO

> **Tipo:** verificación de datos + corrección de documentación. Casi sin código.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **MAPEO vigente:** confirmar versión en el header al abrir.

## Contexto

El MAPEO §10 lista dos ítems de "limpieza de datos pendiente". Según JP, los dos están
en un estado distinto al que el MAPEO describe:

- **§10.3 — `ING-0178` "Arroz" genérico:** **ya fue borrado por JP** desde la consola
  de Firebase, habiendo verificado antes que ninguna receta lo usaba. Este ítem está
  cerrado — solo hay que actualizar el MAPEO.
- **§10.4 — recetas de prueba `REC-15xx`:** JP indica que las recetas de ese rango son
  recetas reales del seed, **no** recetas de prueba. Si es así, §10.4 describe una
  deuda que no existe. **Pero hay que verificarlo** antes de cerrar el ítem: en
  sesiones anteriores se mencionó una receta llamada `"Pollo de prueba E3.4.7"`, un
  nombre que sí suena a testing del importador. Puede que ya no exista, o que sí.

Este prompt **verifica** el estado real de los dos ítems y **corrige el MAPEO** en
consecuencia. No borra nada salvo que la verificación encuentre algo y JP lo apruebe.

## Diagnóstico requerido — evidencia literal obligatoria

No escribas "✅"; pegá JSON crudo de Firestore y resultados de búsqueda reales.

### D1 — Confirmar que `ING-0178` ya no existe

Intentá leer el documento `ING-0178` de la colección de ingredientes en Firestore.
Confirmá que **no existe** (fue borrado). Si por algún motivo todavía existe, reportarlo
— JP creía haberlo borrado.

### D2 — Barrido de referencias huérfanas a `ING-0178`

Aunque JP verificó antes de borrar, confirmá de forma independiente: buscá el string
`ING-0178` en **todas** las colecciones donde podría aparecer — recetas
(`ingredientes[].idIngrediente` o el campo real), planes, listas de compras
(`items[]`, `aportes[]`). Reportá literal cuántas referencias se encontraron. Lo
esperado es **cero**. Si aparece alguna, es una referencia rota — reportala con el
`idReceta` / `idLista` exacto; NO la arregles en este prompt, solo reportala (JP decide
un fix aparte).

### D3 — Inventario completo del rango `REC-15xx`

Traé de Firestore **todas** las recetas cuyo `idReceta` empiece con `REC-15`. Para cada
una, tabla literal: `idReceta` · `nombreCanonico` · `tipoItem` · `proteinaPrincipal`.

Marcá explícitamente si alguna tiene un nombre que delate ser de prueba — `"Pollo de
prueba E3.4.7"`, `"prueba"`, `"test"`, `"asdf"`, nombres sin sentido, duplicados
obvios. Si **ninguna** parece de prueba (todas son recetas reales con nombre normal),
decilo claramente.

### D4 — Referencias de las recetas REC-15xx sospechosas

Si D3 encontró alguna receta que parece de prueba: para **cada una de esas**, buscá si
está referenciada en planes (activos o no) o en entradas de `/historial`. Reportá
`idReceta` → dónde aparece (o "sin referencias"). Esto es lo que define si se puede
borrar limpio o no. Si D3 no encontró ninguna sospechosa, saltear D4 y decirlo.

## Gate de decisión

- Si D3 confirma que **todas** las `REC-15xx` son recetas reales (ninguna de prueba):
  no hay nada que borrar. Ir directo a C1 (corregir el MAPEO).
- Si D3 encontró recetas de prueba: **parar antes de borrar.** Reportar la tabla de D3
  + D4 y esperar que JP apruebe explícitamente cuáles borrar. El borrado iría en un
  prompt de seguimiento, no en este.

## Cambios

### C1 — Corregir §10.3 y §10.4 del MAPEO

En `MAPEO_FIRESTORE.md`:

- **§10.3** — marcar el ítem `ING-0178` como **resuelto**: el ingrediente fue
  eliminado por JP tras verificar que no tenía referencias (confirmado de nuevo en D2).
  Reescribir la sección para que refleje que está cerrado, no pendiente.
- **§10.4** — según el resultado de D3:
  - Si todas las `REC-15xx` son reales → reescribir §10.4 indicando que se verificó el
    rango y **no hay recetas de prueba**; el ítem queda cerrado. Aclarar que la
    suposición original (recetas de prueba pendientes de borrar) era incorrecta.
  - Si D3 encontró recetas de prueba → dejar §10.4 abierta, pero actualizarla con la
    lista concreta de recetas identificadas y su estado de referencias (D4), para que
    el prompt de borrado siguiente se ancle a datos reales.

- Subir el header del MAPEO al siguiente número de versión.

### C2 — Sin cambios de código

Este prompt no toca código de la app. Solo lee Firestore y edita el MAPEO. Si por D2
apareciera una referencia rota a `ING-0178`, **no** se arregla acá — se reporta.

## Fuera de scope (no hacer)

- **No** borrar ninguna receta en esta corrida — ni siquiera las que D3 marque como
  prueba (eso espera la aprobación de JP, gate de decisión).
- **No** arreglar referencias rotas si D2 encuentra alguna — solo reportar.
- **No** tocar código de la app.

## Criterios de aceptación — verificación literal obligatoria

1. **D1** — confirmación de que `ING-0178` no existe en Firestore (o el reporte de que
   sí, si fuera el caso).
2. **D2** — el conteo literal de referencias a `ING-0178` encontradas (esperado: 0).
3. **D3** — la tabla completa del rango `REC-15xx` con la marca de cuáles parecen de
   prueba (o la confirmación de que ninguna lo parece).
4. **MAPEO** — pegá las secciones §10.3 y §10.4 finales, y el número de versión nuevo
   del header.
5. Si hubo cualquier hallazgo inesperado (referencia rota, receta de prueba), está
   reportado y **no** se actuó sobre él sin aprobación.

## Cierre del reporte de Code

- Estado final de §10.3 (cerrado) y §10.4 (cerrado, o abierto con la lista concreta).
- Si D2 o D3 encontraron algo inesperado, destacarlo arriba del reporte.

## Commit

```
Docs: MAPEO — cerrar deuda de limpieza §10.3/§10.4 (ING-0178 + REC-15xx verificados)
```

(Si el gate de decisión deja §10.4 abierta con recetas de prueba por borrar, el commit
describe eso en vez de "cerrar".)

## Próximo paso (no ejecutar ahora)

Si D3 encontró recetas de prueba y JP aprueba borrarlas, se arma un prompt `Data:` corto
de borrado. Si no, la deuda de limpieza del MAPEO §10 queda cerrada y el foco vuelve al
rediseño de Home (cuando JP termine las pantallas en la herramienta de diseño).
