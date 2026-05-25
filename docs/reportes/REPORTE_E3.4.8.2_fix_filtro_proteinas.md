# REPORTE E3.4.8.2 — Fix del filtro de proteínas

**Fecha:** 2026-05-25  
**Tipo:** fix de código + corrección de datos en Firestore + auditoría (propuesta, sin write)  
**Commit código:** `Stage E3.4.8.2: agregar Fiambre/Semillas/Frutos secos a PROTEINAS`  
**Commit datos:** `Data: reasignar proteinaPrincipal (compuestas a Mixta, Frutas a Vegetariana) + diccionarios`  
**Ancla:** `REPORTE_E3.4.8.1_diag_filtros.md` (veredicto B, commit `4f7daed`)

---

## D1 — Cómo se deriva el tipo `Proteina`

```typescript
// src/types/models.ts:28-32
export const PROTEINAS = [
  "Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado",
  "Mariscos", "Huevos", "Legumbres", "Mixta", "Vegetariana",
] as const;
export type Proteina = typeof PROTEINAS[number];  // derivado, no union manual

// src/types/models.ts:125 — en Receta interface
proteinaPrincipal: Proteina;

// src/types/models.ts:337 — en DiccionariosConfig
proteinas: Proteina[];
```

`Proteina` se deriva con `typeof PROTEINAS[number]`. No hay union manual. Sincronizar es solo editar la constante.

---

## D2 — Usos de `Proteina` y `PROTEINAS` en `src/`

```
src/types/models.ts:28     export const PROTEINAS = [...]
src/types/models.ts:32     export type Proteina = typeof PROTEINAS[number]
src/types/models.ts:125    proteinaPrincipal: Proteina
src/types/models.ts:337    proteinas: Proteina[]
src/routes/Biblioteca.tsx:10   import { TIPOS_ITEM, PROTEINAS } from "../types/models";
src/routes/Biblioteca.tsx:217  {PROTEINAS.map(p => <option key={p} value={p}>{p}</option>)}
src/import/parseReceta.ts:4    import { ..., Proteina, ... }
src/import/parseReceta.ts:8    import { ..., PROTEINAS, ... }
src/import/parseReceta.ts:40   proteinaPrincipal: Proteina;
src/import/parseReceta.ts:119  const proteinaPrincipal = matchEnum(kv["proteinaPrincipal"] ?? "", PROTEINAS);
src/import/parseReceta.ts:121  errors.push(`... Valores: ${PROTEINAS.join(", ")}.`);
```

`src/lib/catalogo.ts:25` contiene `"Proteina"` como valor en `ROLES_NUTRICIONALES` — no relacionado con el tipo `Proteina`.

**No hay switch sobre `Proteina` ni chequeo de exhaustividad en ningún archivo.** Agregar valores a `PROTEINAS` es puramente aditivo: el `<select>` en Biblioteca renderiza `PROTEINAS.map(...)` directamente; `matchEnum` en parseReceta solo valida pertenencia al array.

---

## D3 — Recetas con `proteinaPrincipal` fuera del listado original (16 recetas)

| idReceta | nombre | proteinaPrincipal | tipoItem |
|---|---|---|---|
| REC-1012 | Brochettes rápidas de pollo y carne al horno fuerte | Pollo y Vacuna | Receta principal |
| REC-1104 | Bowl de yogur opcional con frutas, semillas y base sin lácteos | Huevos y semillas | Desayuno |
| REC-1109 | Avena nocturna familiar con versión sin lácteos | Semillas | Desayuno |
| REC-1110 | Chía pudding de cacao sin lácteos | Semillas | Desayuno |
| REC-1203 | Knäckebrot bajo en hidratos de lino, chía y girasol | Semillas | Panificado |
| REC-1304 | Crackers keto crocantes de semillas mixtas | Semillas | Panificado |
| REC-1305 | Galletitas saladas keto de sésamo y oliva | Semillas | Panificado |
| REC-1306 | Galletitas keto de pasta de maní y almendra | Frutos secos | Panificado |
| REC-1402 | Crumble keto de manzana, nuez y canela | Frutos secos | Postre |
| REC-1404 | Trufas de coco, cacao y maní sin cocción | Frutos secos | Postre |
| REC-1409 | Crema helada de frutilla y coco sin leche | Frutas | Postre |
| REC-1410 | Barritas de maní, coco y chocolate sin leche | Frutos secos | Postre |
| REC-1502 | Almendras especiadas al horno | Frutos secos | Snack |
| REC-1503 | Huevos rellenos de atún y oliva sin mayonesa láctea | Huevos y Pescado | Snack |
| REC-1508 | Rollitos de jamón natural, palta y pepino | Fiambre | Snack |
| REC-1510 | Pepitas de semillas y chocolate sin leche | Semillas | Snack |

---

## D4 — Las 18 recetas `proteinaPrincipal: "Vegetariana"` con ingredientes

| idReceta | nombre | tipoItem | ingredientes |
|---|---|---|---|
| REC-0103 | Arroz blanco o pan aparte | Hidrato opcional | Arroz blanco largo fino, Agua, Sal, Aceite de oliva, Pan de campo o baguette |
| REC-0104 | Frutas asadas con canela o peras al vino | Postre | Peras firmes o manzanas, Vino tinto, Canela, Clavo de olor, Naranja, Azúcar mascabo o edulcorante apto, **Nueces o almendras** |
| REC-0201 | Berenjenas grilladas con criolla y oliva | Entrada | Berenjenas, Tomate, Cebolla morada, Morrón rojo, Perejil fresco, Aceite de oliva, Vinagre o limón, Sal y pimienta |
| REC-0202 | Puré de coliflor | Guarnición | Coliflor, Ajo, Aceite de oliva, Nuez moscada, Sal y pimienta, Perejil o ciboulette |
| REC-0203 | Papas rústicas aparte | Hidrato opcional | Papas, Aceite de oliva, Pimentón, Ajo en polvo, Romero, Sal y pimienta |
| REC-0204 | Manzanas al horno con nueces | Postre | Manzanas, **Nueces**, Canela, Miel/azúcar mascabo, Agua o vino blanco, Ralladura de limón o naranja |
| REC-0303 | Zanahorias, zucchini y espárragos grillados | Guarnición | Zanahorias, Zucchini, Espárragos o chauchas, Aceite de oliva, Ajo en polvo, Sal y pimienta, Limón |
| REC-0304 | Papas aplastadas | Hidrato opcional | Papas chicas, Aceite de oliva, Ajo, Romero, Sal gruesa y pimienta |
| REC-0401 | Ensalada de pepino, sésamo y soja | Entrada | Pepinos, Salsa de soja, Vinagre de arroz o limón, Aceite de sésamo, **Semillas de sésamo**, Jengibre fresco, Ají picante |
| REC-0403 | Ensalada de repollo asiática | Guarnición | Repollo blanco o colorado, Zanahoria, Cebolla de verdeo, Salsa de soja, Vinagre de arroz, Aceite de sésamo, Jengibre, **Semillas de sésamo o maní** |
| REC-0404 | Arroz jazmín aparte | Hidrato opcional | Arroz jazmín, Agua, Sal, Jengibre o cáscara de limón |
| REC-0503 | Coliflor especiada al horno | Guarnición | Coliflor, Aceite de oliva, Comino, Pimentón, Cúrcuma, Ajo en polvo, Sal y pimienta, Limón, Perejil o cilantro |
| REC-0504 | Cous cous aparte | Hidrato opcional | Cous cous, Agua o caldo caliente, Aceite de oliva, Sal, Perejil o menta, Ralladura de limón |
| REC-1406 | Mousse rápida de palta y cacao sin leche | Postre | Paltas maduras, Cacao amargo, Bebida de coco o almendra, Eritritol, Esencia de vainilla, Limón, **Almendras picadas** |
| REC-1407 | Peras asadas con canela, nueces y limón | Postre | Peras firmes, Canela, Limón, **Nueces picadas**, Aceite de coco o neutro, Eritritol, Agua |
| REC-1501 | Chips de zucchini al horno eléctrico | Snack | Zucchini, Aceite de oliva, Sal, Pimentón dulce, Ajo en polvo, Limón |
| REC-1504 | Bastones crocantes con dip de palta y limón | Snack | Pepino, Zanahoria, Apio, Palta, Limón, Aceite de oliva, Sal y pimienta |
| REC-1507 | Berenjenas crocantes al horno con pimentón | Snack | Berenjenas, Harina de almendra, **Huevo**, Aceite de oliva, Pimentón dulce, Sal y pimienta |

---

## D5 — Estado actual de `/config/diccionarios.proteinas` (antes del fix)

De `scripts/bootstrap-config.ts:63-66` (fuente que seeda Firestore):

```javascript
proteinas: [
  "Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado",
  "Mariscos", "Huevos", "Legumbres", "Mixta", "Vegetariana"
],
```

10 valores — idéntico a `PROTEINAS` en `models.ts`. Sin diccionario sincronizado con los 15 valores reales de Firestore.

---

## C1 — PROTEINAS extendida (13 valores)

```typescript
// src/types/models.ts — DESPUÉS del fix
export const PROTEINAS = [
  // Proteína animal
  "Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado", "Mariscos", "Huevos", "Fiambre",
  // Proteína vegetal
  "Legumbres", "Semillas", "Frutos secos",
  // Meta-valores
  "Mixta", "Vegetariana",
] as const;
export type Proteina = typeof PROTEINAS[number];
```

Cambio puramente aditivo: +`Fiambre`, +`Semillas`, +`Frutos secos`. Ningún valor existente eliminado.

**Build:**
```
> tsc -b && vite build
✓ 1818 modules transformed.
dist/assets/index-PpExSTis.js   806.34 kB
✓ built in 3.08s
```

**Lint:** Sin errores nuevos. Los 20 warnings/errors del lint son pre-existentes (hooks.ts, migrar-unidades.ts, etc. — no relacionados con este fix).

---

## F1 — 3 recetas compuestas → "Mixta" (aplicado)

```
REC-1012 | Brochettes rápidas de pollo y carne al horno fuerte
  "Pollo y Vacuna" → "Mixta"   ✓

REC-1104 | Bowl de yogur opcional con frutas, semillas y base sin lácteos
  "Huevos y semillas" → "Mixta"   ✓

REC-1503 | Huevos rellenos de atún y oliva sin mayonesa láctea
  "Huevos y Pescado" → "Mixta"   ✓
```

**Verificación post-update (Firestore):**
```
REC-1012: proteinaPrincipal = "Mixta"
REC-1104: proteinaPrincipal = "Mixta"
REC-1503: proteinaPrincipal = "Mixta"
```

---

## F2 — Receta "Frutas" → "Vegetariana" (aplicado)

**Identidad:** `REC-1409` — "Crema helada de frutilla y coco sin leche" (Postre).

```
"Frutas" → "Vegetariana"   ✓
```

**Verificación post-update (Firestore):**
```
REC-1409: proteinaPrincipal = "Vegetariana"
```

---

## F3 — `/config/diccionarios.proteinas` → 13 valores (aplicado)

**Verificación post-update (Firestore):**
```
/config/diccionarios.proteinas (13 valores):
[
  'Vacuna', 'Cerdo', 'Pollo', 'Cordero', 'Pescado', 'Mariscos',
  'Huevos', 'Fiambre', 'Legumbres', 'Semillas', 'Frutos secos',
  'Mixta', 'Vegetariana'
]
```

---

## Cruce final — valores distintos en las 79 recetas

```
[OK  ] Huevos: 21
[OK  ] Vegetariana: 19   (18 originales + REC-1409 que era "Frutas")
[OK  ] Pollo: 7
[OK  ] Vacuna: 6
[OK  ] Semillas: 6
[OK  ] Frutos secos: 5
[OK  ] Cerdo: 4
[OK  ] Mariscos: 4
[OK  ] Mixta: 3          (eran 0 — ahora REC-1012 + REC-1104 + REC-1503)
[OK  ] Pescado: 2
[OK  ] Legumbres: 1
[OK  ] Fiambre: 1
Total recetas: 79
```

Todos los valores ∈ `PROTEINAS` (13). Ningún valor fuera del listado.

---

## D6 — Tabla de re-clasificación propuesta (18 recetas "Vegetariana") — PROPUESTA, SIN WRITE

> Esta tabla es propuesta únicamente. No se escribió nada en Firestore.

| idReceta | nombre | Actual | **Propuesto** | Justificación |
|---|---|---|---|---|
| REC-0103 | Arroz blanco o pan aparte | Vegetariana | **Vegetariana** | Hidrato puro; sin proteína ancla |
| REC-0104 | Frutas asadas con canela o peras al vino | Vegetariana | **Vegetariana** | Postre de frutas; "nueces o almendras" son decoración opcional, no la proteína que ancla la receta |
| REC-0201 | Berenjenas grilladas con criolla y oliva | Vegetariana | **Vegetariana** | Entrada de verduras asadas; sin proteína ancla |
| REC-0202 | Puré de coliflor | Vegetariana | **Vegetariana** | Guarnición vegetal; sin proteína ancla |
| REC-0203 | Papas rústicas aparte | Vegetariana | **Vegetariana** | Hidrato puro |
| REC-0204 | Manzanas al horno con nueces | Vegetariana | **Frutos secos** | Nueces es el componente principal del relleno, no decoración |
| REC-0303 | Zanahorias, zucchini y espárragos grillados | Vegetariana | **Vegetariana** | Guarnición vegetal pura |
| REC-0304 | Papas aplastadas | Vegetariana | **Vegetariana** | Hidrato puro |
| REC-0401 | Ensalada de pepino, sésamo y soja | Vegetariana | **Vegetariana** | Semillas de sésamo en cantidad de condimento, no proteína ancla |
| REC-0403 | Ensalada de repollo asiática | Vegetariana | **Vegetariana** | Sésamo o maní en cantidad de condimento — revisar si maní es componente principal |
| REC-0404 | Arroz jazmín aparte | Vegetariana | **Vegetariana** | Hidrato puro |
| REC-0503 | Coliflor especiada al horno | Vegetariana | **Vegetariana** | Guarnición vegetal pura |
| REC-0504 | Cous cous aparte | Vegetariana | **Vegetariana** | Hidrato puro (cous cous = sémola de trigo) |
| REC-1406 | Mousse rápida de palta y cacao sin leche | Vegetariana | **Vegetariana** | Palta es grasa; almendras picadas son decoración; sin proteína ancla clara |
| REC-1407 | Peras asadas con canela, nueces y limón | Vegetariana | **Frutos secos** | Nueces picadas es el componente principal del topping/relleno |
| REC-1501 | Chips de zucchini al horno eléctrico | Vegetariana | **Vegetariana** | Snack vegetal puro |
| REC-1504 | Bastones crocantes con dip de palta y limón | Vegetariana | **Vegetariana** | Verduras + palta (grasa); sin proteína ancla |
| REC-1507 | Berenjenas crocantes al horno con pimentón | Vegetariana | **Huevos** | Huevo es el aglutinante/rebozado principal; proteína ancla clara |

**Resumen:** 15 quedan `Vegetariana` · 2 → `Frutos secos` (REC-0204, REC-1407) · 1 → `Huevos` (REC-1507).

---

## Observaciones

**Tipado de `proteinaPrincipal`:** En `Receta` está tipado como `Proteina` (línea 125), no como `string`. Eso significa que al agregar `Fiambre`, `Semillas`, `Frutos secos` a `PROTEINAS`, el tipo ya los incluye automáticamente vía `typeof PROTEINAS[number]`. No se requirió cambio adicional en el tipo.

---

## Scope — confirmación

- No se tocó `Biblioteca.tsx` ni `filtros.ts`.
- No se corrió reseed completo; solo `update` puntual de 4 recetas.
- No se tocó `ING-0178` ni recetas `REC-15xx` salvo `REC-1503` (que era `"Huevos y Pescado"` → `"Mixta"`, corrección mecánica legítima).
- No se migró el filtro para leer de `/config/diccionarios`.
- No se aplicó ningún cambio de las 18 recetas auditadas en D6 — propuesta únicamente.

---

## Verificación pendiente (la hace JP)

Abrir Biblioteca → tab Recetas → filtro de proteína → confirmar que aparecen **"Fiambre"**, **"Semillas"** y **"Frutos secos"**, y que al seleccionarlos salen las recetas esperadas.
