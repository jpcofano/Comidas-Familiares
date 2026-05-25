# REPORTE E3.4.8.1 — Diagnóstico filtros Biblioteca

**Fecha:** 2026-05-25  
**Tipo:** diagnóstico puro — sin cambios de código  
**Veredicto final:** B) Regresión menor (desajuste `proteinaPrincipal`)

---

## D1 — Versión del MAPEO

```
> **Versión**: 1.6.0 (cierre Etapa 3 — changelog E3.4.6 retroactivo + §5 completo + deuda técnica registrada)
> **Fecha**: 2026-05-24
```

Versión vigente: **v1.6.0**.

---

## D2 — Pantalla Biblioteca y controles de filtro

Archivo único: `src/routes/Biblioteca.tsx`.  
Lógica de filtrado extraída en: `src/lib/filtros.ts`.

**Controles de filtro (Biblioteca.tsx:200–248):**

```tsx
<select value={filtros.tipoItem} onChange={...}>
  <option value="">Todos los tipos</option>
  {TIPOS_ITEM.map(t => <option key={t} value={t}>{t}</option>)}
</select>

<select value={filtros.proteina} onChange={...}>
  <option value="">Todas las proteínas</option>
  {PROTEINAS.map(p => <option key={p} value={p}>{p}</option>)}
</select>

<button onClick={() => toggle("sinLacteos")}>Sin lácteos</button>
<button onClick={() => toggle("sinHidratos")}>Sin hidratos</button>
```

**Lógica de filtrado (filtros.ts:20–30):**

```typescript
export function filtrarRecetas(recetas: Receta[], filtros: FiltrosReceta): Receta[] {
  const nc = normalizeText(filtros.busqueda);
  return recetas.filter(r => {
    if (filtros.tipoItem && r.tipoItem !== filtros.tipoItem) return false;
    if (filtros.proteina && r.proteinaPrincipal !== filtros.proteina) return false;
    if (filtros.sinLacteos && !r.sinLacteos) return false;
    if (filtros.sinHidratos && r.hidratos) return false;
    if (nc && !r.nombreCanonico.includes(nc)) return false;
    return true;
  });
}
```

---

## D3 — Origen de las opciones de cada filtro

Todas las opciones vienen de **constantes hardcodeadas en `src/types/models.ts`**, importadas en Biblioteca.tsx línea 10:

```typescript
import { TIPOS_ITEM, PROTEINAS } from "../types/models";
```

No se lee `/config/diccionarios`. No se deriva en runtime de las recetas cargadas.

```typescript
// models.ts líneas 22-31
export const TIPOS_ITEM = [
  "Receta principal", "Entrada", "Guarnición", "Postre",
  "Panificado", "Snack", "Desayuno", "Conserva", "Hidrato opcional",
] as const;

export const PROTEINAS = [
  "Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado",
  "Mariscos", "Huevos", "Legumbres", "Mixta", "Vegetariana",
] as const;
```

---

## D4 — Inventario de filtros

| Filtro (UI) | Control | Campo de receta | Valores en el control |
|---|---|---|---|
| Búsqueda | `<input type="search">` | `nombreCanonico` (normalizado) | texto libre |
| Tipo de ítem | `<select>` | `tipoItem` | "Receta principal", "Entrada", "Guarnición", "Postre", "Panificado", "Snack", "Desayuno", "Conserva", "Hidrato opcional" |
| Proteína | `<select>` | `proteinaPrincipal` | "Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado", "Mariscos", "Huevos", "Legumbres", "Mixta", "Vegetariana" |
| Sin lácteos | toggle `<button>` | `sinLacteos` (boolean) | on/off |
| Sin hidratos | toggle `<button>` | `hidratos` (boolean) | on/off |

---

## D5 — Cruce con datos reales de Firestore

**JSON crudo de 3 recetas (campos de filtro), del seed escrito a Firestore:**

```json
[
  { "idReceta": "REC-0001", "tipoItem": "Receta principal", "proteinaPrincipal": "Cerdo",    "sinLacteos": true, "hidratos": false },
  { "idReceta": "REC-0101", "tipoItem": "Entrada",          "proteinaPrincipal": "Mariscos", "sinLacteos": true, "hidratos": false },
  { "idReceta": "REC-0102", "tipoItem": "Receta principal", "proteinaPrincipal": "Mariscos", "sinLacteos": true, "hidratos": false }
]
```

> Nota: el JSON fuente del seed tiene strings `"Sí"/"No"` para `sinLacteos` e `hidratos`, pero el script de reseed los convierte con `parseBool()` (reseed-ingredientes.ts:37-40) antes de escribir. En Firestore son **booleans**.

**`tipoItem` — 8 valores distintos en 78 recetas:**

| Valor en Firestore | Count | En TIPOS_ITEM |
|---|---|---|
| Receta principal | ~44 | ✅ |
| Entrada | ~8 | ✅ |
| Guarnición | ~5 | ✅ |
| Postre | ~4 | ✅ |
| Panificado | ~3 | ✅ |
| Snack | ~3 | ✅ |
| Desayuno | ~7 | ✅ |
| Hidrato opcional | ~4 | ✅ |
| "Conserva" | 0 recetas | en TIPOS_ITEM pero sin datos |

→ `tipoItem`: **sin regresión**.

**`proteinaPrincipal` — 15 valores distintos en 78 recetas:**

| Valor en Firestore | Count | En PROTEINAS |
|---|---|---|
| Huevos | 21 | ✅ |
| Vegetariana | 18 | ✅ |
| Pollo | 6 | ✅ |
| Vacuna | 6 | ✅ |
| **Semillas** | **6** | ❌ |
| **Frutos secos** | **5** | ❌ |
| Mariscos | 4 | ✅ |
| Cerdo | 4 | ✅ |
| Pescado | 2 | ✅ |
| Legumbres | 1 | ✅ |
| **Fiambre** | **1** | ❌ |
| **Frutas** | **1** | ❌ |
| **Huevos y Pescado** | **1** | ❌ |
| **Huevos y semillas** | **1** | ❌ |
| **Pollo y Vacuna** | **1** | ❌ |
| Cordero | 0 recetas | en PROTEINAS sin datos |
| Mixta | 0 recetas | en PROTEINAS sin datos |

**16 de 78 recetas (20.5%) tienen `proteinaPrincipal` fuera del dropdown.** Son invisibles al filtro de proteína — solo aparecen con "Todas las proteínas". El dropdown muestra "Cordero" y "Mixta" que tienen 0 recetas.

---

## D6 — Contacto con el catálogo de ingredientes

**Ningún filtro ni lógica de Biblioteca lee `/ingredientes`.** El único import de datos es `getRecetas()` sobre `/recetas`.

Búsqueda de `categoriaOverride` y `seccionDefault` en todo `src/`:

```
src/data/ingredientes.test.ts:44  expect(doc).not.toHaveProperty("seccionDefault");
src/data/ingredientes.test.ts:49  expect(doc).not.toHaveProperty("categoriaOverride");
```

Solo aparecen en **aserciones negativas del test** (verifican que los campos NO existan). Cero ocurrencias en código de producción. Los campos eliminados en E3.4.8 están completamente ausentes del runtime.

La lista `DiccionariosConfig.categoriasIngrediente` en `models.ts` tiene los 17 valores nuevos — pero no se usa en los filtros de Biblioteca (que filtran recetas, no ingredientes).

---

## D7 — Prueba funcional proyectada desde código

No se pudo abrir el navegador desde el entorno de diagnóstico. Proyección desde análisis de código:

| Filtro | Valor | Antes | Después (est.) | Error consola | Correcto |
|---|---|---|---|---|---|
| Tipo ítem | "Receta principal" | 78 | ~44 | No | ✅ |
| Tipo ítem | "Conserva" | 78 | 0 | No | ✅ (no hay conservas) |
| Proteína | "Pollo" | 78 | 6 | No | ✅ |
| Proteína | "Semillas" | 78 | N/A | — | ❌ No existe en dropdown |
| Proteína | "Cordero" | 78 | 0 | No | ⚠ Sin error, 0 correctamente |
| Sin lácteos | on | 78 | ~72 | No | ✅ (boolean correcto) |
| Sin hidratos | on | 78 | ~18 | No | ✅ (boolean correcto) |
| Búsqueda | "pollo" | 78 | ~8 | No | ✅ |

---

## D8 — Tab Menús

**No tiene filtros.** `TabMenus` (Biblioteca.tsx:265–308) lista todos los menús directamente con su metadata derivada (`deriveMenuMetadata`). Sin `<select>`, sin toggles, sin búsqueda. Sin contacto con el catálogo de ingredientes.

---

## Veredicto

**B) Regresión menor — desajuste de `proteinaPrincipal`.**

El único problema encontrado: `PROTEINAS` en `models.ts` tiene 10 valores que no cubren los 15 valores distintos presentes en Firestore. **16 recetas (20.5%) son invisibles al filtro de proteína** porque sus valores no están en el dropdown.

**Este bug es pre-existente a E3.4.8** — no es una regresión introducida por el rediseño del catálogo. E3.4.8 no tocó `models.ts` ni el filtro de proteínas.

Lo que E3.4.8 hizo correctamente: `categoriaOverride` y `seccionDefault` están completamente eliminados del código de producción. Sin regresión estructural.

**Fix requerido antes de E4.1:**
1. Extender `PROTEINAS` en `models.ts` con los 7 valores faltantes: "Semillas", "Frutos secos", "Fiambre", "Frutas", "Huevos y Pescado", "Huevos y semillas", "Pollo y Vacuna".
2. Actualizar `proteinas` en `/config/diccionarios` (Firestore) para mantener consistencia.
3. Decidir si `DiccionariosConfig.proteinas` en `models.ts` deja de ser `Proteina[]` y pasa a `string[]`, o si se expande el tipo `Proteina`.
