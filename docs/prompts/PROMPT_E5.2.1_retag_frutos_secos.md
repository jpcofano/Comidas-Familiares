# PROMPT E5.2.1 — Re-tag de 2 recetas a "Frutos secos" (cierre de la canonización)

> **Tipo:** corrección de datos en Firestore — `Data:` puro.
> **App:** Comida Familiar — React 19 + Vite + TypeScript + Firebase 12 (proyecto `comida-familiar`).
> **Producción:** https://comida-familiar.web.app
> **Ancla:** tabla D6 del **Reporte E5.2**, aprobada por JP. **MAPEO vigente:** v1.6.7.

## ⚠️ Pre-requisito bloqueante

**E5.2.1 NO se corre hasta que E5.2 esté efectivamente aplicado en Firestore.** El
reporte de E5.2 verificó contra el archivo `recetas.json` del repo, pero las tres
tareas de datos quedaron pendientes de ejecutar:

1. `scripts/fix-proteinas-recetas.ts` (las 4 recetas mecánicas)
2. `scripts/fix-diccionarios-proteinas.ts` (`/config/diccionarios.proteinas` a 13)
3. Borrar `/config/importador` + re-correr `scripts/seed-config-importador.ts`

Antes de empezar este prompt, el diagnóstico D0 confirma que E5.2 ya está aplicado en
Firestore (no en el JSON). Si no lo está, **parar** y aplicar E5.2 primero.

## Contexto

La auditoría D6 de E5.2 propuso re-clasificar recetas hoy marcadas
`proteinaPrincipal: "Vegetariana"` que en realidad tienen una proteína ancla. JP revisó
la tabla y aprobó **solo 2** re-clasificaciones:

| idReceta | nombreCanonico | actual | nuevo valor |
|---|---|---|---|
| REC-0204 | Manzanas al horno con nueces | Vegetariana | **Frutos secos** |
| REC-1407 | Peras asadas con nueces | Vegetariana | **Frutos secos** |

En ambas, las nueces son protagonistas y están en el título.

Las otras recetas auditadas en D6 **se quedan como están** — decisiones de JP:
- **REC-0401** "Ensalada de pepino, sésamo y soja" → queda **Vegetariana**. (D6 había
  propuesto "Semillas"; JP decidió que ni el sésamo ni la soja la anclan claramente.)
- **REC-1507** "Berenjenas crocantes" → queda **Vegetariana**. (D6 había propuesto
  "Huevos"; JP decidió que el huevo del rebozado es aglutinante, no proteína ancla.)
- El resto de las 19 "Vegetariana" → quedan, ya estaban bien.

Por lo tanto **E5.2.1 toca exactamente 2 recetas**. Nada más.

## Diagnóstico requerido ANTES de escribir

Reportá con evidencia **literal** (JSON crudo de Firestore). No escribas "✅".

### D0 — Confirmar que E5.2 ya está aplicado en Firestore

Traé de Firestore:
- 1 de las 3 recetas compuestas de E5.2-F1 → confirmar `proteinaPrincipal: "Mixta"`.
- La receta REC-1409 ("Crema helada de frutilla y coco") de E5.2-F2 → confirmar
  `proteinaPrincipal: "Vegetariana"`.
- El doc `/config/diccionarios` → confirmar que `proteinas` tiene los 13 valores.

Si **cualquiera** de los tres todavía tiene el valor viejo → E5.2 no está aplicado.
**Parar acá**, reportarlo, y no continuar hasta que JP corra los scripts de E5.2.

### D1 — Estado actual de las 2 recetas a tocar

Traé de Firestore REC-0204 y REC-1407. Pegá el JSON crudo de cada una mostrando
`idReceta`, `nombreCanonico`, `proteinaPrincipal`. Confirmá que las dos están hoy en
`"Vegetariana"` (si alguna ya no lo está, reportarlo antes de tocar nada).

## Cambio de datos

### F1 — Re-tag de REC-0204 y REC-1407

`update` de **solo** el campo `proteinaPrincipal` a `"Frutos secos"` en esas dos
recetas. No tocar ningún otro campo. Script idempotente en `scripts/` (estilo de los
fix anteriores) o consola — lo que sea más verificable.

## Fuera de scope (no hacer)

- **No** tocar ninguna otra receta — solo REC-0204 y REC-1407.
- **No** tocar REC-0401 ni REC-1507 (JP decidió que se quedan en "Vegetariana").
- **No** tocar código, `models.ts`, ni el seed del importador (E5.2 ya los dejó bien).
- **No** correr reseed completo.
- **No** tocar `ING-0178` ni las recetas `REC-15xx` de prueba.

## Criterios de aceptación — verificación literal obligatoria

1. **D0 confirmado.** Las tres lecturas de D0 muestran los valores de E5.2 ya
   aplicados. Si no → el prompt se detuvo, reportarlo.
2. **F1 aplicado.** Pegá el JSON crudo de REC-0204 y REC-1407 leído **de Firestore
   después del update**, mostrando `proteinaPrincipal: "Frutos secos"`.
3. **Cruce final.** Re-corré el conteo de valores distintos de `proteinaPrincipal`
   sobre las 78 recetas **leyendo de Firestore** (no de `recetas.json`). Esperado:
   `Frutos secos` sube en 2 (de 5 a 7), `Vegetariana` baja en 2 (de 19 a 17), 0
   inválidas, todos los valores ∈ los 13 canónicos. Pegá la tabla.
4. **Verificación en la app (JP).** Code deja el checklist: Biblioteca → filtro
   "Frutos secos" → confirmar que ahora aparecen "Manzanas al horno con nueces" y
   "Peras asadas con nueces" entre los resultados.

## Cierre del reporte de Code

- Resultado de D0 — si E5.2 estaba aplicado o si hubo que frenar.
- Confirmación de que solo se tocaron REC-0204 y REC-1407.
- Estado de la canonización de proteínas: con E5.2 + E5.2.1, el tema queda cerrado de
  punta a punta (las 4 copias alineadas, todas las recetas con valor válido).

## Commit

```
Data: re-tag REC-0204 y REC-1407 a Frutos secos (cierre auditoria proteinas)
```

Si se actualiza el MAPEO con el cierre de la auditoría, `Docs: MAPEO v1.6.8`.

## Próximo paso (no ejecutar ahora)

Con E5.2.1, la canonización de proteínas está cerrada y la Etapa 5 (importador)
completa de verdad. Pendientes que siguen, para que JP elija orden:
- Deuda de UI del importador (§10.2 del MAPEO): contraste del botón de sugerencia,
  pluralizar unidades al mostrar, "a gusto" en vez de "1".
- Limpieza de datos: `ING-0178` duplicado (§10.3), recetas de prueba `REC-15xx`
  (§10.4).
- **Etapa 6** — PWA (manifest, service worker, push notifications).
