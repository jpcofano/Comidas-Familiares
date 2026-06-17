# PROMPT E14.7 — Filtro de cocina: backfill de datos + blindar el prompt generador

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> **A implementar ahora.** Numerar al próximo libre si `E14.7` ya existe.
>
> **Contexto (verificado 13-jun-2026):** el filtro "Todas las cocinas" en Biblioteca opera sobre
> `receta.cocina` (enum `COCINAS`, 15 valores) y el desplegable se arma de ese enum
> (`Biblioteca.tsx:268`). Pero **ninguna receta tiene `cocina` poblado** (0 matches de `"cocina":`
> en `scripts/seed-data/*.json`); todas usan `estilo` (texto libre). El fix previo
> (`filtros.ts:51`, matchear `estilo` además de `cocina`) **resolvió solo parte**: anda para las
> tandas nuevas cuyo `estilo` casualmente es un nombre de cocina exacto ("Francesa", "Japonesa"…),
> pero la biblioteca original (`recetas.json`, ~80+ recetas) tiene `estilo` descriptivo
> ("Steakhouse", "Asiático", "Marroquí", "Criollo", "Argentino gourmet", "Familiar", "Keto / pan",
> "Desayuno…", "Snack…") que **no coincide con ningún valor del desplegable** → sigue sin filtrarse.
> Y los 37 tests en verde dan falsa confianza: el test nuevo solo cubre el caso `estilo == cocina exacta`.
>
> **Causa raíz:** `estilo` (subtítulo libre) y `cocina` (enum filtrable) son campos distintos; el
> filtro se arma del enum pero los datos solo llenaron `estilo`. Hay que **poblar `cocina`** (backfill)
> y **hacer que el generador siempre lo emita** (blindar el prompt). Recién ahí el filtro corre limpio.

---

## PARTE A — Backfill de `cocina` en las recetas existentes (PROPONER → confirmar → aplicar)

Script `scripts/backfill-cocina.ts` que recorre todas las recetas de Firestore y, para las que
tengan `cocina` vacío, deriva el valor del `estilo` con el mapa de abajo. **Primero corre en modo
"propuesta"** (imprime tabla `idReceta · nombre · estilo → cocina propuesta` sin escribir); JP
revisa; recién con `--apply` escribe.

### Mapa `estilo → cocina` (los 15 valores válidos: ver `COCINAS` en models.ts)
```ts
const ESTILO_A_COCINA: Record<string, Cocina> = {
  // — exactos (ya coinciden, se normalizan igual) —
  "Argentina": "Argentina", "Italiana": "Italiana", "Francesa": "Francesa",
  "Española": "Española", "Mediterránea": "Mediterránea", "China": "China",
  "Japonesa": "Japonesa", "Coreana": "Coreana", "Tailandesa": "Tailandesa",
  "India": "India", "Mexicana": "Mexicana", "Peruana": "Peruana",
  "Árabe / Medio Oriente": "Árabe / Medio Oriente",
  // — descriptivos argentinos → Argentina —
  "Argentino gourmet": "Argentina", "Criollo": "Argentina", "Criollo / parrilla": "Argentina",
  "Steakhouse": "Argentina", "Wok criollo": "Argentina",
  // — mediterráneos / españoles —
  "Español / mediterráneo": "Mediterránea", "Mediterráneo simple": "Mediterránea",
  "Mediterráneo / marino": "Mediterránea",
  // — medio oriente —
  "Marroquí": "Árabe / Medio Oriente", "Marroquí / Medio Oriente": "Árabe / Medio Oriente",
};

// Ambiguos → NO autoasignar; listarlos aparte para que JP decida:
const REVISAR_MANUAL = ["Asiático"]; // ¿China / Japonesa / Tailandesa? depende del plato

// Todo lo demás (no es cocina): "Familiar", "Casero", "Básico", "Especiado suave",
// "Cítrico", "Frutal simple", y TODOS los "Desayuno…", "Snack…", "Keto…", "Postre…"
// → dejar `cocina` SIN setear (quedan "Sin clasificar"; se filtran por tipoItem, no por cocina).
```

### Lógica del script
1. Traer todas las recetas. Para cada una con `!cocina`:
   - normalizar `estilo` (trim); si está en `ESTILO_A_COCINA` → proponer ese valor.
   - si está en `REVISAR_MANUAL` o no matchea → no proponer (queda sin clasificar / a revisar).
2. **Modo propuesta** (default): imprimir 3 bloques — "Se asignarán" (con el mapeo), "A revisar
   manualmente" (los `Asiático` y cualquier estilo-cocina no contemplado, con nombre del plato), y
   "Sin clasificar a propósito" (conteo de desayunos/snacks/keto/postres).
3. **`--apply`**: escribir solo los del primer bloque (`updateDoc { cocina }`), en batches.
   Usar la misma capa de datos del catálogo/recetas (no escribir crudo si hay un helper).
4. Idempotente: correrlo dos veces no cambia nada la segunda.

> Resultado esperado: las ~80 recetas de la biblioteca original con estilo-cocina pasan a tener
> `cocina` y se vuelven filtrables; las que no son de una cocina (desayunos/snacks/keto/postres)
> quedan "Sin clasificar", que es correcto.

---

## PARTE B — Blindar el prompt generador (que toda receta nueva traiga `cocina`)

> **Esta es la respuesta a "¿hay que modificar el prompt de las recetas?": sí.** Si no, cada
> receta nueva vuelve a nacer sin `cocina` y el problema se reproduce.

El prompt generador vive en **`/config/importador.promptLLM`** (Firestore) y su fuente
**`scripts/seed-config-importador.ts`**. Hoy el formato pide `estilo:` (texto libre) pero no obliga
a `cocina:`. Cambios:

1. **Agregar/forzar la línea `cocina:`** en el formato de salida del prompt, con enumeración
   explícita de los 15 valores y la instrucción de elegir **uno exacto** (mismo patrón que ya se
   usa para `proteinaPrincipal:`):
   ```
   cocina: [uno de exactamente: Argentina, Italiana, Española, Francesa, Mediterránea, China,
            Japonesa, Coreana, Tailandesa, India, Mexicana, Peruana, Árabe / Medio Oriente,
            Estadounidense, Otra]
   ```
2. **Aclarar la diferencia** en el prompt: `cocina` = cocina de origen del enum (filtrable);
   `estilo` = subtítulo libre y descriptivo ("Steakhouse", "Familiar rápido"), **no** una cocina.
   Si la receta no encaja en ninguna cocina (desayuno/snack/keto/postre genérico), usar `Otra` o
   dejar `estilo` y `cocina: Otra`.
3. Actualizar el **ejemplo** del prompt para que muestre la línea `cocina:` poblada.
4. Reflejar el cambio en `scripts/seed-config-importador.ts` y correr el seed con `--force` para
   actualizar el doc en Firestore (mismo procedimiento que E9.0/E9.0.1 con `proteinaPrincipal`).

> `src/import/parseReceta.ts` ya parsea `cocina` contra `COCINAS` (línea ~150) y deja error si es
> inválido — no hay que tocar el parser; solo asegurar que el prompt **siempre** emita la línea.

---

## PARTE C — Simplificar el filtro y cerrar el test que falta

1. **Filtro** (`src/lib/filtros.ts:51`): una vez backfilleado, el match correcto es por `cocina`.
   Dejar `estilo` como fallback **no molesta** (cubre recetas viejas aún sin backfill), así que se
   puede mantener la línea actual:
   ```ts
   if (filtros.cocina && r.cocina !== filtros.cocina && r.estilo !== filtros.cocina) return false;
   ```
   (orden: enum primero, fallback estilo). Opcional: normalizar acentos/may con `normalizeText` en
   ambos lados para tolerar "mediterranea" vs "Mediterránea".
2. **Test que falta** (`src/lib/filtros.test.ts`): agregar el caso que hoy NO se cubre —
   una receta con `estilo` descriptivo y `cocina` poblado por backfill **se filtra por `cocina`**,
   y una con `estilo` descriptivo **sin** `cocina` **no** aparece bajo ninguna opción del enum
   (documenta el comportamiento esperado post-backfill):
   ```ts
   it("filtra por cocina backfilleada aunque el estilo sea descriptivo", () => {
     const r = makeReceta({ idReceta: "REC-020", estilo: "Steakhouse", cocina: "Argentina" });
     expect(filtrarRecetas([r], { ...FILTROS_INICIALES, cocina: "Argentina" })).toHaveLength(1);
   });
   it("receta con estilo descriptivo y sin cocina no matchea ninguna opción del enum", () => {
     const r = makeReceta({ idReceta: "REC-021", estilo: "Steakhouse" }); // sin cocina
     expect(filtrarRecetas([r], { ...FILTROS_INICIALES, cocina: "Argentina" })).toHaveLength(0);
   });
   ```

---

## Cierre
1. **MAPEO_FIRESTORE.md / docs**: registrar el backfill de `cocina`, el cambio del prompt
   (`/config/importador.promptLLM` ahora incluye `cocina:` con los 15 valores) y la distinción
   `estilo` (libre) vs `cocina` (enum). Bump de versión.
2. Correr el backfill en **modo propuesta**, pegar la tabla para que JP confirme, y recién aplicar.
3. `npm test` verde (incl. los tests nuevos), `npm run build` ok. Sin cambios de reglas.
4. Pegar diff de `scripts/backfill-cocina.ts` (nuevo), `scripts/seed-config-importador.ts`,
   `filtros.ts`, `filtros.test.ts` + la lista de recetas backfilleadas.

```
git commit -m "E14.7: backfill cocina desde estilo + blindar prompt generador (cocina obligatoria) + test del caso descriptivo"
```

## Criterios de aceptación
1. Tras el backfill, las recetas de la biblioteca original con estilo-cocina (Steakhouse, Criollo,
   Marroquí, Español/mediterráneo, etc.) tienen `cocina` poblado y **aparecen al filtrar** por su
   cocina en Biblioteca.
2. Desayunos/snacks/keto/postres quedan "Sin clasificar" (sin `cocina`) — correcto, se filtran por tipo.
3. Una receta nueva generada con el prompt actualizado trae `cocina:` con un valor válido del enum.
4. El test suite cubre el caso `estilo` descriptivo + `cocina` backfilleada (antes no cubierto).
5. El filtro de cocina en Biblioteca devuelve resultados consistentes para las 15 opciones que
   efectivamente existan en los datos.
```
