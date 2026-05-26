# PROMPT_E3.4.8 — Re-seed: catálogo rediseñado (3 dimensiones)

## Contexto

El catálogo de ingredientes tenía un problema de diseño: el campo `categoria`
mezclaba tres criterios distintos (qué ES el ingrediente, qué APORTA, dónde se
COMPRA). Por eso el arroz aparecía como "Hidrato" y se agrupaba mal en la lista
de compras.

El rediseño ya está hecho. JP revisó el catálogo ingrediente por ingrediente y
generó los tres archivos de seed nuevos. Esta etapa NO diseña nada — solo carga
los seeds ya hechos y ajusta el modelo/diccionarios para que los soporten.

## Los archivos de seed (ya provistos)

En `scripts/seed-data/`:
- `catalogo_ingredientes.json` — **177 ingredientes**, renumerados ING-0001 a
  ING-0177. Cada uno con las 3 dimensiones nuevas.
- `recetas.json` — **78 recetas**, con las referencias `idIngrediente` ya
  remapeadas a los IDs nuevos.
- `menus.json` — **5 menús**, sin cambios (referencian recetas, no ingredientes).

Estos archivos son la fuente de verdad. NO modificarlos, NO regenerarlos. Cargar
exactamente lo que contienen.

## El modelo nuevo de Ingrediente

Cada ingrediente en `catalogo_ingredientes.json` tiene esta forma:

```json
{
  "idIngrediente": "ING-0001",
  "canonico": "...",
  "nombrePreferido": "...",
  "sinonimos": [],
  "categoria": "Pescado y marisco",
  "rolNutricional": ["Proteina"],
  "seccionGondola": "Pescaderia",
  "unidadesHabituales": [],
  "vecesUsado": 0,
  "ambiguo": false,
  "origen": "seed"
}
```

**Cambios respecto del modelo viejo:**
- `categoria` — ahora usa la lista NUEVA de 17 valores (abajo). Antes mezclaba criterios.
- `rolNutricional` — **campo nuevo**, array de strings (puede estar vacío).
- `seccionGondola` — **campo nuevo**, string.
- `seccionDefault` — campo VIEJO. Ya no está en los seeds nuevos. Eliminar del modelo.

## Las tres dimensiones (diccionario canónico)

### `categoria` (17 valores — qué ES el ingrediente)

```
Verdura, Fruta, Carne, Pescado y marisco, Huevo, Lacteo,
Fiambre y embutido, Cereal y derivado, Legumbre, Semilla y fruto seco,
Hierba y especia, Condimento y aderezo, Aceite y grasa, Endulzante,
Caldo y fondo, Despensa varios, Utensilio
```

### `rolNutricional` (6 valores — qué APORTA — es un set)

```
Proteina, Hidrato, Grasa, Fibra/Vegetal, Azucar/Dulce, Neutro
```

Un ingrediente puede tener varios roles, o ninguno (`[]`). `Neutro` es excluyente
(si está, va solo).

### `seccionGondola` (9 valores — DÓNDE se compra)

```
Verduleria, Carniceria, Pescaderia, Fiambreria, Lacteos y frescos,
Almacen / secos, Panaderia, Bazar / otros, Despensa / otros
```

## Cambios requeridos

### 1. Modelo — `src/types/models.ts`

Actualizar la interfaz `Ingrediente`:
- `categoria` — tipar con los 17 valores nuevos (o `string` si no se usa union estricto).
- Agregar `rolNutricional: string[]`.
- Agregar `seccionGondola: string`.
- Eliminar `seccionDefault` (campo viejo, ya no existe en los seeds).

Si hay tipos/enums de `categoria` con la lista vieja, reemplazarlos por la nueva.

### 2. `/config/diccionarios`

Actualizar el doc de diccionarios con las tres listas nuevas:
- `categoriasIngrediente` — las 17.
- `rolesNutricionales` — los 6.
- `seccionesGondola` — las 9.

Si existían listas viejas de categorías/secciones, reemplazarlas.

### 3. Script de carga / re-seed

Cargar los tres JSON de `scripts/seed-data/` a Firestore. El re-seed debe:
- **Borrar y recargar** `/ingredientes` con los 177 de `catalogo_ingredientes.json`.
- **Borrar y recargar** `/recetas` con las 78 de `recetas.json`.
- **Borrar y recargar** `/menus` con los 5 de `menus.json`.
- **Borrar** `/planes`, `/compras`, `/historial` — estas colecciones tienen data
  vieja que referencia IDs de ingrediente que ya no existen (los IDs se
  renumeraron). Decisión de JP: empezar de cero, no se conserva nada de planes/
  compras/historial.

Si ya existe un script de seed (`scripts/`), reutilizar su estructura. Si no,
crear uno. El doc ID de cada ingrediente/receta/menú es su propio `idIngrediente`
/ `idReceta` / `idMenu`.

### 4. Lista de compras — agrupar por `seccionGondola`

La lista de compras hoy agrupa los ítems por una sección derivada del modelo
viejo. Cambiarla para que **agrupe por el `seccionGondola` del ingrediente** del
catálogo nuevo.

- Cada ítem de compra se agrupa bajo la `seccionGondola` de su `idIngrediente`.
- El orden de las secciones en la pantalla puede seguir el orden de la lista de
  9 de arriba (Verduleria primero, etc.) — un orden de recorrido de súper
  razonable.
- Si un ítem no resuelve `seccionGondola` (no debería pasar — los 177 lo tienen),
  cae en "Despensa / otros".

## Diagnóstico requerido ANTES de codear

1. **Estructura del seed actual.** Reportar si existe un script de seed en
   `scripts/` y cómo carga datos hoy. Reportar dónde y cómo se leen los JSON.

2. **Dónde agrupa la lista de compras.** Abrir `src/data/compras.ts` y reportar
   dónde se asigna la sección de cada ítem. Hoy usa el modelo viejo — reportar
   literal qué campo lee.

3. **Referencias a `seccionDefault` y a `categoria` vieja.** Buscar en el repo
   todo uso de `seccionDefault` y de los valores viejos de `categoria` (ej.
   "Hidrato", "Materia grasa"). Reportar qué archivos los usan — sobre todo los
   filtros de Biblioteca. Si algo se rompe al cambiar el modelo, reportarlo
   ANTES de codear.

Reportar 1-3 en una primera respuesta. JP confirma y después arrancás.

## Criterios de aceptación con verificación literal

NO basta con reportar ✅. JP verifica en Firebase Console + app.

### A — Catálogo cargado

1. Abrir `/ingredientes` en Firebase Console. Confirmar **177 documentos**,
   IDs ING-0001 a ING-0177. Pegar el shape de ING-0001 y ING-0177 literal.
2. Confirmar que cada uno tiene `categoria`, `rolNutricional` (array) y
   `seccionGondola`. Confirmar que NINGUNO tiene `seccionDefault`.

### B — Recetas cargadas e íntegras

3. Abrir `/recetas`. Confirmar 78 documentos.
4. Tomar 3 recetas al azar. Para cada ingrediente de esas recetas, confirmar que
   su `idIngrediente` existe en `/ingredientes`. Reportar: ¿alguna referencia
   apunta a un ID inexistente? (esperado: ninguna).

### C — Menús cargados

5. Confirmar `/menus` con 5 documentos.

### D — Colecciones viejas limpias

6. Confirmar que `/planes`, `/compras`, `/historial` están vacías (o no existen).

### E — Diccionarios

7. Abrir `/config/diccionarios`. Pegar las tres listas nuevas
   (`categoriasIngrediente`, `rolesNutricionales`, `seccionesGondola`).

### F — Lista de compras agrupa por góndola

8. Crear un plan con una receta que tenga ingredientes de varias secciones (ej.
   una con carne, verdura y algo de almacén). Sincronizar la lista de compras.
9. Confirmar en la app que los ítems se agrupan por sección de góndola:
   "Verdulería", "Carnicería", "Almacén / secos", etc. — NO por las secciones
   viejas. El arroz debe caer en "Almacén / secos", NO en "Legumbre".
10. Pegar las secciones que se ven en la lista.

### G — Sin regresión

11. Confirmar que la app no tira errores: Home, Biblioteca, Detalle de receta,
    Detalle de menú cargan. Si los filtros de Biblioteca usaban la categoría
    vieja, confirmar que siguen funcionando con la nueva (o reportar qué se rompió
    — ver diagnóstico 3).

## Edge cases a documentar en código

1. **`rolNutricional` vacío**: algunos ingredientes (utensilios, cacao) tienen
   `rolNutricional: []`. Es válido. La UI no debe romper con un array vacío.

2. **Categoría `Utensilio`**: `ING` del palito de brochette tiene
   `categoria: "Utensilio"` y `seccionGondola: "Bazar / otros"`. No es comestible.
   La lista de compras lo muestra en su sección igual. Documentar.

3. **`seccion` por-receta intacto**: `recetas[].ingredientes[].seccion` (Base,
   Cocción, Salsa...) NO se tocó — es texto libre de cocina. La lista de compras
   NO agrupa por ese campo; agrupa por `seccionGondola` del catálogo. Documentar
   la distinción.

## Cambios al MAPEO_FIRESTORE.md

Bump del MAPEO (correlativo a la última versión).

- Documentar el modelo nuevo de `Ingrediente`: `categoria` (17), `rolNutricional[]`,
  `seccionGondola`. Eliminar `seccionDefault`.
- Documentar las tres listas en la sección de `/config/diccionarios`.
- Documentar que la lista de compras agrupa por `seccionGondola`.
- Anotar que el catálogo pasó de 194 a 177 (limpieza de basura + fusión de
  duplicados) y que los IDs se renumeraron.
- Changelog de la versión.

## Convención de commits

- Código: `Stage 3.4.8: catalog redesign (3 dimensions) + re-seed`
- Data: `Data: re-seed catalog 177 ingredients + remapped recipes`
- Doc: `Docs: MAPEO (catalog redesign)`
