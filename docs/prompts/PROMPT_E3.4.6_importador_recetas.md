# PROMPT E3.4.6 — Importador de recetas con matcher de ingredientes y loop humano

## Contexto y objetivo

El catálogo de 194 ingredientes existe en `/ingredientes` desde E3.4.3. Pero la pantalla de importar recetas (`/recetas/importar`) es un stub que dice "Esta sección llega en Etapa 2". Hay que implementarla.

El flujo completo:
1. JP pega un TXT con la receta en un formato definido.
2. El sistema parsea la receta y sus ingredientes.
3. Para cada ingrediente, busca una coincidencia en el catálogo:
   - **Exacto**: el texto normalizado coincide con `canonico` o algún `sinonimos[]` → se resuelve automáticamente.
   - **Candidatos**: hay ingredientes con similitud alta pero no exacta → JP elige de una lista.
   - **Nuevo**: sin coincidencia → JP confirma el nombre y el sistema crea el ingrediente en el catálogo.
4. JP revisa todo y confirma. El sistema guarda la receta en `/recetas` y, si JP eligió candidatos o confirmó nuevos ingredientes, actualiza el catálogo (`sinonimos[]` o nuevo doc).

---

## Diagnóstico requerido ANTES de codear

**D1.** Abrir `/recetas/REC-0001` en Firebase Console y copiar el shape de `ingredientes[0]`. Confirmar que tiene los campos: `idIngrediente`, `textoOriginal`, `seccion`, `cantidad`, `unidad`, `opcional`. Si la forma difiere de `src/types/models.ts → IngredienteEnReceta`, reportar antes de continuar.

**D2.** Abrir `/ingredientes/{cualquier-ING}` y copiar el shape completo. Confirmar presencia de `canonico` (string), `sinonimos` (array de strings), `nombrePreferido`, `categoria`, `origen`. Reportar el ID más alto en la colección (ej. `ING-0194`) para saber desde dónde empieza el auto-ID.

**D3.** En `src/data/recetas.ts`, buscar `crearReceta`. Confirmar que lee el ID con `getDoc` antes de crear para evitar duplicados. Reportar el ID más alto en `/recetas` (ej. `REC-0078`) para saber desde dónde empieza el auto-ID.

---

## Formato TXT de receta

El parser debe aceptar este formato exacto (key-value para `#RECETA`, pipe-delimited para las tablas):

```
#RECETA
nombre: Pollo al curry rojo
tipoItem: Receta principal
proteinaPrincipal: Pollo
escenarioUso: Cocina rápida
porciones: 4
dificultad: Baja
sinLacteos: No
hidratos: No
tiempoActivo: 20 min
tiempoTotal: 45 min
costoEstimado: Bajo
aptoNocheDeADos: Adaptable
paraJuanPablo: Sí
paraFamilia: Sí
climaDelPlato: Medio
pensadaPara: Semana
hidratoOpcional: Arroz basmati
notas: Ajustar picante al gusto.
fuente: ChatGPT

#INGREDIENTES
seccion | ingrediente | preparacion | cantidad | unidad | opcional | notas
Principal | Muslos de pollo | sin piel | 800 | g | No |
Principal | Leche de coco | | 400 | ml | No |
Base de sabor | Cebolla | picada | 1 | u | No |
Condimentos | Curry rojo en pasta | | 2 | cda | No | Maesri o similar

#PASOS
nroPaso | titulo | detalle | tiempoEstimadoLabel | puntoClave | errorComun | notas
1 | Saltear aromáticos | Dorar la cebolla en aceite a fuego medio hasta transparente, agregar el curry. | 5 min | La pasta de curry debe fraguar en el aceite antes de agregar el pollo. | No saltear el curry suficiente y que quede crudo. |
2 | Sellar el pollo | Agregar los muslos y sellar 3 min por lado. | 6 min | Secar el pollo antes para que se selle, no hierva. | |
3 | Cocción con coco | Agregar la leche de coco, tapar y cocinar 25 min a fuego suave. | 25 min | | | Si la salsa queda muy líquida, destapé los últimos 5 min.
```

**Reglas del parser:**
- Líneas que empiezan con `#` son marcadores de bloque.
- Campos faltantes en `#RECETA` usan los defaults del §3.5 del MAPEO: `tipoItem → "Receta principal"`, `aptoNocheDeADos → "No"`, `sinLacteos → true`, `hidratos → false`, `paraJuanPablo → true`, `paraFamilia → true`, `fuente → "ChatGPT"`.
- En `#INGREDIENTES`, la primera fila (header) se descarta. Las columnas `preparacion`, `opcional` y `notas` son opcionales. `cantidad` puede ser un rango "1 a 2".
- En `#PASOS`, la primera fila es header. `puntoClave`, `errorComun`, `notas` pueden estar vacíos.
- Si `porciones` es rango (ej. "4 a 6"), parsear a `porcionesMin=4`, `porcionesMax=6`; si es número fijo, `porcionesMin=porcionesMax=N`.
- `pensadaPara` se auto-deriva si no viene: si `tiempoTotalMin > 90` o `dificultad` es "Alta" o "Media-alta" → "Especial"; si `tiempoTotalMin ≤ 45` y dificultad "Baja" → "Semana"; resto → "Cualquiera".

---

## Cambios requeridos

### 1. `src/lib/matcherIngredientes.ts` — matcher puro (nuevo archivo)

```ts
export type ResultadoMatch =
  | { tipo: "exacto"; ingrediente: Ingrediente }
  | { tipo: "candidatos"; candidatos: Ingrediente[] }   // máximo 4, ordenados por similitud desc
  | { tipo: "nuevo" };

export function matchIngrediente(
  textoRaw: string,
  catalogo: Map<string, Ingrediente>
): ResultadoMatch
```

**Lógica:**
1. Normalizar el texto con `normalizeText` (ya existe en `src/lib/canonical.ts`).
2. Para cada ingrediente del catálogo: comprobar si el texto normalizado coincide exactamente con `ingredient.canonico` o con cualquier item de `ingredient.sinonimos` (también normalizados). Si hay match exacto → `{ tipo: "exacto", ingrediente }`.
3. Si no hay exacto: calcular similitud de trigramas entre el texto y el `canonico` de cada ingrediente del catálogo. Similitud de trigramas = `|interseccion(trigramas(a), trigramas(b))| / |union(...)|}`. Umbral para candidato: similitud ≥ 0.4. Devolver los 4 con mayor similitud, sólo si alguno supera el umbral. Si ninguno → `{ tipo: "nuevo" }`.

La función de trigramas genera todos los substrings de longitud 3 del input. El matcher es PURO — no hace I/O.

---

### 2. `src/import/parseReceta.ts` — parser puro (nuevo archivo)

Tipos a exportar:

```ts
export interface ParsedIngredienteRaw {
  seccion: string;
  textoOriginal: string;   // el campo "ingrediente" tal cual, con preparacion si viene
  preparacion?: string;
  cantidadLabel: string;
  cantidadMin: number | null;
  cantidadMax: number | null;
  unidad: string;
  opcional: boolean;
  notas: string;
}

export interface ParsedPasoRaw {
  nroPaso: number;
  titulo: string;
  detalle: string;
  tiempoEstimadoLabel: string;
  tiempoEstimadoMin: number | null;
  puntoClave: string;
  errorComun: string;
  notas: string;
}

export interface ParsedReceta {
  nombre: string;
  nombreCanonico: string;
  tipoItem: TipoItem;
  proteinaPrincipal: Proteina;
  escenarioUso: Escenario;
  climaDelPlato?: ClimaPlato;
  pensadaPara: PensadaPara;
  sinLacteos: boolean;
  hidratos: boolean;
  aptoNocheDeADos: AptoNocheDeADos;
  paraJuanPablo: boolean;
  paraFamilia: boolean;
  tiempoActivoLabel: string;
  tiempoActivoMin: number | null;
  tiempoTotalLabel: string;
  tiempoTotalMin: number | null;
  dificultad: Dificultad;
  dificultadOrden: number;
  porcionesLabel: string;
  porcionesMin: number | null;
  porcionesMax: number | null;
  costoEstimado: Costo;
  costoOrden: number;
  hidratoOpcional?: string;
  notas?: string;
  fuente: string;
  ingredientesRaw: ParsedIngredienteRaw[];
  pasos: ParsedPasoRaw[];
}

export type ParseRecetaResult =
  | { ok: true; receta: ParsedReceta }
  | { ok: false; errors: string[] };

export function parseRecetaTxt(txt: string): ParseRecetaResult
```

Usar `normalizeText` de `src/lib/canonical.ts` y los parsers de `src/lib/parsers.ts` (`parseTime`, `parseDificultad`, `parseCosto`, `parseSiNo`, `parseNumber`). Las validaciones de §3.5 aplican.

---

### 3. `src/data/ingredientes.ts` — nuevas funciones exportadas

```ts
// Retorna el próximo ID libre: ING-XXXX donde XXXX = max actual + 1, padded a 4 dígitos.
export async function proximoIdIngrediente(): Promise<string>

// Crea un nuevo ingrediente en el catálogo. Invalida el cache local.
export async function crearIngrediente(
  ing: Omit<Ingrediente, "fechaCreacion" | "ultimaModificacion" | "vecesUsado">
): Promise<Result<Ingrediente, AppError>>

// Agrega un sinónimo al array sinonimos[] si no existe ya. Invalida el cache local.
export async function agregarSinonimo(
  idIngrediente: string,
  sinonimo: string
): Promise<Result<void, AppError>>
```

---

### 4. `src/data/recetas.ts` — nueva función `proximoIdReceta`

```ts
// Retorna el próximo ID libre: REC-XXXX donde XXXX = max actual + 1, padded a 4 dígitos.
export async function proximoIdReceta(): Promise<string>
```

Leer todos los IDs de `/recetas` con `getDocs(collection(db, "recetas"))`, filtrar los que matcheen `/^REC-\d{4}$/`, parsear los números, retornar `REC-${String(max + 1).padStart(4, "0")}`.

---

### 5. `src/routes/ImportarReceta.tsx` — pantalla completa

La pantalla tiene **tres pasos** (sin router anidado — state local):

#### Paso 1: Pegar TXT
- Textarea grande (JP pega la receta).
- Botón "Parsear".
- Si hay errores de parse → lista de errores en rojo.
- Si OK → avanza a Paso 2.

#### Paso 2: Resolver ingredientes (el loop humano)

Para cada ingrediente parseado, mostrar una fila con:
- El `textoOriginal` + `unidad` como fue escrito.
- Badge de estado: **verde "✓ Exacto"** / **amarillo "⚠ Candidatos"** / **gris "Nuevo"**.
- Si "Candidatos": dropdown con hasta 4 opciones (nombre del ingrediente + % similitud) más la opción "Nuevo ingrediente". JP elige una.
- Si "Nuevo": campo de texto con el nombre pre-completado (editable por JP) + selector de `categoria` (las categorías del catálogo existente).
- Si "Exacto": muestra el nombre del catálogo, no editable.

El catálogo se carga una sola vez al montar el paso (`getCatalogo()`). El matching se corre client-side (puro).

Al final del listado, botón "Confirmar y guardar".

#### Paso 3: Guardando / Resultado

Proceso de guardado (en orden):
1. Para cada ingrediente con elección "Candidato": `agregarSinonimo(idIngrediente, textoOriginalNormalizado)`.
2. Para cada ingrediente "Nuevo": `crearIngrediente(...)` → obtener el `idIngrediente` asignado.
3. Construir el doc `Receta` completo con `ingredientes: IngredienteEnReceta[]` (cada uno con el `idIngrediente` resuelto) y `pasos: Paso[]`.
4. `crearReceta(receta)` → si ya existe por `idReceta` o `nombreCanonico`, mostrar error "Ya existe una receta con ese nombre."
5. Mostrar: "✅ Receta creada: [nombre] (REC-XXXX)" + botón "Ver receta" (link a `/recetas/REC-XXXX`) + botón "Importar otra".

**Invalidar el cache de catálogo** (`invalidateCatalogCache()`) antes del primer `crearIngrediente` o `agregarSinonimo`.

**No agregar** validación de duplicado de `nombreCanonico` en el cliente — `crearReceta` ya lo hace en el servidor.

---

## Criterios de aceptación

**A — Parse exitoso:**
Pegar el TXT de ejemplo de este prompt y presionar "Parsear". Reportar si avanza al Paso 2 o muestra errores. Si hay errores, pegarlos literales.

**B — Match exacto:**
"Cebolla" (ingrediente del TXT de ejemplo) debe mostrar badge verde "✓ Exacto" apuntando a un ingrediente del catálogo. Copiar el `idIngrediente` y el `nombrePreferido` que muestra.

**C — Candidatos:**
Cambiar "Cebolla" en el TXT a "Cebollita" (typo). Parsear de nuevo. Confirmar que el ingrediente muestra badge amarillo con candidatos. Pegar los candidatos listados (nombre + %) y cuál queda seleccionado por default.

**D — Nuevo ingrediente:**
Cambiar "Cebolla" a "Puerro japonés" (inventado). Parsear. El ingrediente debe mostrar badge gris "Nuevo". El campo de nombre debe decir "Puerro japonés" (o similar).

**E — Guardado completo:**
Con el TXT original (sin modificar), completar el flujo hasta "Confirmar y guardar". Luego abrir Firebase Console:
- E1: Copiar el campo `nombre` y el `idReceta` del nuevo doc en `/recetas`. **Esperado: aparece con REC-0079 o el siguiente disponible.**
- E2: Copiar `ingredientes[0]` del nuevo doc. **Esperado: tiene `idIngrediente` (no vacío), `textoOriginal`, `seccion`, `cantidad` / `cantidadMin` / `unidad`.**
- E3: Copiar `pasos[0]`. **Esperado: tiene `nroPaso: 1`, `titulo`, `detalle`, `tiempoEstimadoMin`.**

**F — Sinónimo aprendido:**
Si en el paso C eligió un candidato y confirmó, abrir en Firebase Console el ingrediente elegido y copiar el array `sinonimos`. **Esperado: el texto normalizado ("cebollita") aparece en el array.**

Si algún criterio falla, pegar el valor observado (en Firestore o en la UI) y el valor esperado.
