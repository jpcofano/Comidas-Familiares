# PROMPT_E3.4.3 — Catálogo de ingredientes + reseeding limpio

## Contexto

Esta etapa introduce `/ingredientes/{idIngrediente}` como colección de primera clase, refactoriza el modelo de recetas e items de compras para usar referencias en vez de strings sueltos, y reseede COMPLETAMENTE los datos de producción (la app no tiene uso real todavía, así que se permite wipe + reload).

**Pre-requisito ya cumplido:** E3.4.2 cerrada y verificada en Firebase Console (lista de compras genera items correctamente).

**Aclaración importante:** los datos del catálogo y las recetas reseedeadas YA están procesados y resueltos. JP y el asistente trabajaron juntos en un chat aparte aplicando dedup, definiendo defaults para ambiguos, y procesando disyunciones/conjunciones. Code NO tiene que hacer ningún dedup, ningún algoritmo de similitud, ningún reporte de sospechosos — eso ya está hecho. Code solo tiene que:

1. Refactorizar el modelo (`models.ts`, Security Rules, código que consume las recetas e items de compras).
2. Reescribir la función `sincronizarListaSemana` para usar `idIngrediente` en lugar de `canonicalizar()`.
3. Wipe de las colecciones existentes en Firestore (`/recetas`, `/menus`, `/compras`, `/planes`).
4. Load de los 3 archivos JSON adjuntos (`catalogo_ingredientes.json`, `recetas.json`, `menus.json`) a Firestore.
5. Actualizar `MAPEO_FIRESTORE.md` a v1.4.

## Archivos adjuntos al commit que JP va a pasarte

JP commiteará 3 archivos JSON pre-procesados en `scripts/seed-data/`:

- **`catalogo_ingredientes.json`** — 194 entradas. Cada una con shape:
  ```json
  {
    "idIngrediente": "ING-0001",
    "canonico": "abadejo",
    "nombrePreferido": "Abadejo",
    "sinonimos": [],
    "categoria": "Pescado",
    "seccionDefault": "Principal",
    "unidadesHabituales": [],
    "vecesUsado": 1,
    "ambiguo": false,
    "origen": "seed"
  }
  ```

- **`recetas.json`** — 78 recetas, cada una con su metadata completa, `ingredientes[]` referenciando `idIngrediente` del catálogo, y `pasos[]` ordenados. Shape de cada `ingredientes[i]`:
  ```json
  {
    "idIngrediente": "ING-0032",
    "textoOriginal": "Bondiola de cerdo entera",
    "preparacion": "asado",            // opcional
    "seccion": "Principal",
    "cantidad": "1,2 a 1,5",
    "unidad": "kg",
    "categoriaOverride": "Carne",       // opcional
    "opcional": false,
    "notas": "Mejor si tiene algo de grasa",
    "alternativas": [                   // opcional, presente si la receta dice "X o Y"
      { "idIngrediente": "ING-0175" }
    ]
  }
  ```

- **`menus.json`** — 5 menús. Sin cambios de modelo respecto a v1.3, siguen referenciando `idReceta`.

## Cambios al modelo (`src/types/models.ts`)

### Nuevo tipo `Ingrediente`

```typescript
export interface Ingrediente {
  idIngrediente: string;          // "ING-XXXX"
  canonico: string;
  nombrePreferido: string;
  sinonimos: string[];
  categoria: string;
  seccionDefault: string;
  unidadesHabituales: string[];
  vecesUsado: number;
  ambiguo: boolean;
  origen: "seed" | "import" | "manual";
  fechaCreacion?: FirestoreTimestamp;
  ultimaModificacion?: FirestoreTimestamp;
}
```

### Cambio en `Receta.ingredientes[]`

REEMPLAZAR el tipo actual de `Receta["ingredientes"][number]` por:

```typescript
export interface IngredienteEnReceta {
  idIngrediente: string;           // ref al catálogo (NUEVO, reemplaza ingrediente/ingredienteCanonico)
  textoOriginal: string;           // texto libre del seed/import (NUEVO)
  preparacion?: string;            // NUEVO, opcional (picado, molido, asado, etc.)
  seccion?: string;
  cantidad?: string | number;
  cantidadLabel?: string;          // legacy, mantener si está
  cantidadMin?: number;            // legacy, mantener si está
  cantidadMax?: number;            // legacy, mantener si está
  unidad?: string;
  categoriaOverride?: string;      // renombrado de "categoria"; default vacío → hereda del catálogo
  opcional?: boolean;
  notas?: string;
  alternativas?: Array<{ idIngrediente: string }>;  // NUEVO, opcional
}
```

**ELIMINAR:** `ingrediente: string` y `ingredienteCanonico: string` del shape.

### Cambio en `ItemCompra`

REEMPLAZAR el tipo actual por:

```typescript
export interface ItemCompra {
  id: string;
  idIngrediente: string;             // NUEVO, clave de agrupación
  nombrePreferido: string;            // snapshot del catálogo al sync
  categoria: string;                  // snapshot del catálogo al sync
  cantidadTotal: number;
  cantidadLabel: string;
  unidad: string;
  opcional: boolean;
  yaTengo: boolean;
  aportes: AporteCompra[];
  notas: string;
}

export interface AporteCompra {
  idPlan: string;
  idReceta: string;
  nombreReceta: string;
  textoOriginal: string;              // NUEVO, del item de receta
  tipoAporte: "receta" | "alternativa";  // NUEVO
  alternativaCon?: string[];          // NUEVO, nombres de los alternativos para mostrar
  cantidad: number;
  unidad: string;
}
```

**ELIMINAR:** `ingrediente: string` y `ingredienteCanonico: string` del shape.

## Cambios a `src/data/`

### Nueva sección: `src/data/ingredientes.ts`

CREAR con estas funciones:

```typescript
import { db } from "../firebase";
import type { Ingrediente } from "../types/models";

// Cache de catálogo (se invalida al editar)
let cachedCatalog: Map<string, Ingrediente> | null = null;

export async function getCatalogo(): Promise<Map<string, Ingrediente>> {
  if (cachedCatalog) return cachedCatalog;
  const snap = await getDocs(collection(db, "ingredientes"));
  cachedCatalog = new Map(snap.docs.map(d => [d.id, d.data() as Ingrediente]));
  return cachedCatalog;
}

export async function getIngrediente(id: string): Promise<Ingrediente | null> {
  const snap = await getDoc(doc(db, "ingredientes", id));
  return snap.exists() ? (snap.data() as Ingrediente) : null;
}

export function invalidateCatalogCache(): void {
  cachedCatalog = null;
}
```

### Refactor en `src/data/compras.ts`

La función `sincronizarListaSemana` (y su gemela `sincronizarListaDesdeFirestore`) debe reescribirse para usar el catálogo. Pseudocódigo:

```typescript
async function sincronizarListaSemana(semanaInicio, planes, recetas) {
  const catalogo = await getCatalogo();
  // ...
  const nuevosItems = agruparPorIdIngrediente(planesConReceta, itemsAnteriores, catalogo);
  // ... (resto igual)
}
```

`agruparPorIdIngrediente` reemplaza a `agruparPorClaveCanonica`:

```typescript
function agruparPorIdIngrediente(
  planesConReceta: Array<{ plan: Plan; receta: Receta }>,
  itemsAnteriores: ItemCompra[],
  catalogo: Map<string, Ingrediente>
): ItemCompra[] {
  // Mapa: `${idIngrediente}|${unidad}` → ItemCompra (acumulando aportes)
  const acc = new Map<string, ItemCompra>();

  for (const { plan, receta } of planesConReceta) {
    for (const ing of receta.ingredientes) {
      const clave = `${ing.idIngrediente}|${ing.unidad ?? ""}`;
      if (!acc.has(clave)) {
        const cat = catalogo.get(ing.idIngrediente);
        if (!cat) continue;  // ingrediente huérfano, skipear
        acc.set(clave, {
          id: "",  // se setea al persistir
          idIngrediente: ing.idIngrediente,
          nombrePreferido: cat.nombrePreferido,
          categoria: ing.categoriaOverride || cat.categoria,
          cantidadTotal: 0,
          cantidadLabel: "",  // se compone al final de aportes
          unidad: ing.unidad ?? "",
          opcional: true,  // se baja a false si algún aporte no es opcional
          yaTengo: false,  // se preserva si itemsAnteriores tenía yaTengo=true para este idIngrediente
          aportes: [],
          notas: "",  // se compone al final
        });
      }
      const item = acc.get(clave)!;
      const cantidadNum = typeof ing.cantidad === "number" ? ing.cantidad : 0;
      item.cantidadTotal += cantidadNum;
      item.aportes.push({
        idPlan: plan.idPlan,
        idReceta: receta.idReceta,
        nombreReceta: receta.nombre,
        textoOriginal: ing.textoOriginal,
        tipoAporte: "receta",  // o "alternativa" si ing es alternativa de otra
        cantidad: cantidadNum,
        unidad: ing.unidad ?? "",
      });
      if (!ing.opcional) item.opcional = false;
      if (ing.notas) item.notas = item.notas ? `${item.notas} | ${ing.notas}` : ing.notas;
    }
  }

  // Preservar yaTengo desde itemsAnteriores
  for (const old of itemsAnteriores) {
    for (const it of acc.values()) {
      if (it.idIngrediente === old.idIngrediente && it.unidad === old.unidad) {
        it.yaTengo = old.yaTengo;
        break;
      }
    }
  }

  // Componer cantidadLabel a partir de aportes
  for (const it of acc.values()) {
    it.cantidadLabel = it.cantidadTotal > 0 ? `${it.cantidadTotal} ${it.unidad}` : "a gusto";
  }

  return [...acc.values()];
}
```

**CRÍTICO:** TODOS los campos del item de compra DEBEN tener valores definidos antes del `batch.set`. Si algún campo del catálogo es `undefined`, FALLA EL SEEDING — no se permite que un ingrediente del catálogo tenga campos faltantes. Usar el patrón `...(x ? { x } : {})` si hace falta omitir un campo opcional, no `x: undefined`.

**ELIMINAR:** la función `agruparPorClaveCanonica` y la dependencia de `canonicalizar()` en `lib/compras.ts`. La función `normalizeText` en `lib/canonical.ts` se mantiene solo para `nombreCanonico` de recetas/menús.

## Security Rules

AGREGAR a `firestore.rules` la colección `/ingredientes`:

```
match /ingredientes/{idIngrediente} {
  allow read: if isSignedIn();
  allow write: if isOwner();
}
```

(Usar las mismas helper functions que están definidas para `/recetas`.)

## Script de seeding

Crear `scripts/reseed-ingredientes.ts` (o equivalente del repo) que:

1. **Lee los 3 JSON** de `scripts/seed-data/`.
2. **Wipe**: borra TODAS las colecciones afectadas en Firestore:
   - `/recetas`
   - `/menus`
   - `/compras` (incluyendo subcollections `/items`)
   - `/planes`
   - `/ingredientes` (por si hay basura previa)
   - `/historial` (los datos viejos referenciaban shape antiguo)
3. **Load**: para cada JSON, hace batch writes a Firestore:
   - 194 docs en `/ingredientes`
   - 78 docs en `/recetas` con `ingredientes[]` y `pasos[]` embebidos
   - 5 docs en `/menus` con `componentes[]` embebidos
4. **Reportar al terminar**: imprime totales y verifica con `getDocs` que las cantidades coinciden.

Idempotente: correrlo dos veces produce el mismo resultado.

## Tareas concretas

1. Crear tipos en `models.ts` (Ingrediente, IngredienteEnReceta, ItemCompra, AporteCompra).
2. Crear `src/data/ingredientes.ts` con `getCatalogo`, `getIngrediente`, `invalidateCatalogCache`.
3. Refactorizar `src/data/compras.ts`: reescribir `agruparPorIdIngrediente` (reemplaza `agruparPorClaveCanonica`), refactorizar `sincronizarListaSemana` y `sincronizarListaDesdeFirestore`.
4. Eliminar `lib/compras.ts` (la función `agruparPorClaveCanonica`) y referencias a `canonicalizar()` para ingredientes (mantener `normalizeText` para nombres de receta/menú).
5. Actualizar Security Rules: agregar `/ingredientes`.
6. Crear `scripts/reseed-ingredientes.ts`. Wipe + load de los 3 JSON.
7. Refactorizar pantallas que muestren `ingrediente: string`: ahora deben leer `nombrePreferido` desde el catálogo (o desde el snapshot en items de compras). La pantalla **Detalle de receta** muestra `textoOriginal` (frase del cocinero), no `nombrePreferido`. La pantalla **Lista de compras** muestra `nombrePreferido`.
8. Adaptar pantallas que rendericen items de compras: mostrar `aportes[].textoOriginal` en la vista expandida. Si `tipoAporte === "alternativa"`, mostrar pista visual ("↳ Receta X (o alternativa)").
9. Actualizar `MAPEO_FIRESTORE.md` a v1.4: ver sección "Cambios al MAPEO" más abajo.
10. Run del seeding script, deploy de rules, deploy de la app.

## Cambios al MAPEO_FIRESTORE.md

Bump version a v1.4. Agregar changelog (§1.2.quater):

```markdown
### 1.2.quater Cambios en v1.4 (catálogo de ingredientes)

1. **`/ingredientes/{idIngrediente}` como colección de primera clase**. Cada receta carga
   referencias (`idIngrediente`) en lugar de strings sueltos. El texto original que
   escribió el cocinero se preserva en `textoOriginal`.

2. **`ingredienteCanonico` ELIMINADO** de recetas e items de compras. Reemplazado por
   `idIngrediente`.

3. **`categoria` en items de receta renombrado a `categoriaOverride`**. Si vacío,
   hereda del catálogo.

4. **NUEVOS campos en items de receta**:
   - `preparacion: string` (opcional) — acción del cocinero (picado, molido, asado).
   - `alternativas: Array<{idIngrediente}>` (opcional) — productos alternativos cuando
     la receta dice "X o Y". El principal es `idIngrediente`, el resto son alternativas.

5. **Items de compras refactorizados**:
   - `ingrediente: string` → `nombrePreferido` (snapshot del catálogo al sync).
   - `ingredienteCanonico` ELIMINADO.
   - Nueva clave de agrupación: `(idIngrediente, unidad)`.
   - Nuevo `aportes[].textoOriginal` para vista expandida.
   - Nuevo `aportes[].tipoAporte: "receta" | "alternativa"`.

6. **Canonicalización ya no es función pura sobre strings**. La función
   `canonicalizar()` en `lib/compras.ts` se eliminó. Las nuevas importaciones de recetas
   (post-Etapa 3) deben pasar por un loop humano con matcher de similitud (alcance fuera
   de esta etapa — E3.4.4 o Etapa 4).

7. **Reseeding limpio**: las colecciones `/recetas`, `/menus`, `/compras`, `/planes`,
   `/historial` se wiparon y recargaron con el modelo nuevo. La app NO tiene uso real
   todavía, así que no hay migración: solo reseed.

8. **§9.6 ("panel de admin para sinónimos") promovido**: ahora vive parcialmente
   resuelto via `/ingredientes/{id}.sinonimos[]`. El "panel" propiamente dicho es
   alcance de E3.4.4 (no en esta etapa).
```

Actualizar también:
- **§2.1** árbol: agregar `/ingredientes/{id}`.
- **§2.2** Receta: reemplazar shape de `ingredientes[]` por el de §1.2.quater.
- **§2.5** Compras: reemplazar shape de items por el nuevo.
- **§2.9 NUEVA**: shape completo de `/ingredientes/{id}` (copiar del tipo `Ingrediente`).
- **§4** Rules: agregar regla de `/ingredientes`.
- **§6.1** ingredientes sumables: reescribir. La sumabilidad ahora es por `(idIngrediente, unidad)`. La canonicalización vía función pura ya no existe.

## Criterios de aceptación con verificación en Firebase Console

NO basta con reportar ✅ — JP va a verificar personalmente en Firebase Console. Los criterios son:

1. Colección `/ingredientes` existe con **194 docs**. Verificable abriendo Firestore.
2. Cualquier doc en `/recetas/REC-XXXX` tiene `ingredientes[].idIngrediente` poblado (no string suelto). Verificable abriendo `/recetas/REC-0001` y mirando un item del array.
3. La función `sincronizarListaSemana` produce items de compra con `idIngrediente` y `nombrePreferido` (NO `ingrediente`/`ingredienteCanonico`).
4. Crear un plan que use REC-0001 (Bondiola) → la lista de compras tiene un item "Caldo de carne" (ING-0035) con alternativa "Agua" — porque así lo procesamos para esa receta.
5. Crear un segundo plan que comparta un ingrediente (ej. REC-0001 + REC-0101 que ambos usan Sal fina) → debe haber UN SOLO item "Sal fina" en `/compras/.../items/` con `aportes.length === 2`.
6. La pantalla Detalle de receta REC-0001 muestra "Bondiola de cerdo entera" (textoOriginal), no "bondiola de cerdo entera" en lowercase.
7. La pantalla Lista de compras muestra "Caldo de carne" como nombre del item (nombrePreferido), con pista visual de la alternativa "Agua".

## Patrón a respetar

Vi en el código actual de `menus.ts` un patrón que es la solución elegante al bug E3.4.2:

```ts
...(parsed.descripcion ? { descripcion: parsed.descripcion } : {}),
...(parsed.climaDelMenu ? { climaDelMenu: parsed.climaDelMenu } : {}),
```

**Spread condicional**: el campo no existe en el objeto si está vacío, en vez de existir como `undefined`. Aplicar este patrón en TODOS los lugares donde se construyan items de compra, items de receta, y docs de ingrediente. Esto evita el bug E3.4 estructuralmente. NO usar `?? null` — eso deja campos `null` arrastrando en Firestore.

## Lo que NO está en esta etapa

- E3.4.4 (importador con loop humano + matcher de similitud para imports futuros) queda para una etapa próxima. Por ahora `/ingredientes` se popula solo desde el seed; no hay UI para agregar manualmente.
- El campo `ambiguo: true` en ingredientes del catálogo (solo "Pan" hoy) no dispara nada todavía — es un flag inerte preparado para E3.4.4.
- No se implementa panel de admin para editar/mergear ingredientes del catálogo. Si hace falta corregir algo, se edita desde Firebase Console o reseedeando.

## Convención de commits

- Código: `Stage 3.4.3: catalog of ingredients + reseed`
- Doc: `Docs: MAPEO v1.4 (catalog of ingredients)`
- Seed data: `Data: catalog + recetas + menus reseed json`
