# PROMPT E8.8 — Detección de duplicados al importar (y al crear desde el catálogo)

> **Etapa 8 — ciclo de diseño post-E7.13.** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** la versión que dejó E8.7. Verificá y reportá.
> **Al terminar: commit + push** — ver "Cierre".

## Por qué

Hoy, si JP importa "ajo" y ya existe "Ajo" en el catálogo, el matcher devuelve `exacto` y
todo va bien. El problema real ocurre en dos casos:

1. **Importer, paso 2 — override a "nuevo":** el matcher sugiere un candidato, pero JP borra
   la sugerencia y escribe un nombre nuevo (o lo deja como venía del TXT). Si el canonico
   del nombre nuevo coincide con un ingrediente existente, se crea un duplicado ambiguo.

2. **Catálogo editor, "+ Nuevo":** JP tipea un nombre que ya existe con igual canonico.
   Hoy `crearIngrediente` lo crea sin aviso → dos docs para el mismo ingrediente.

En ambos casos la consecuencia es el mismo ingrediente dos veces en el catálogo, uno de ellos
`ambiguo: true`, con IDs distintos. El fix es detectarlo **antes de crear** y ofrecer usar
el existente.

## Lo que ya existe (usar)

- `getCatalogo(): Promise<Map<string, Ingrediente>>` — catálogo cacheado.
- `normalizeText(str)` — canonicaliza para comparar.
- `buildNuevoIngredienteDoc` / `crearIngrediente` — flujo de creación actual.
- `agregarSinonimo(id, sinonimo)` — para vincular el texto del import al existente.
- El paso 2 del importer (`src/routes/ImportarReceta.tsx`): filas con `decision.tipo === "nuevo"`.
- El sheet "+ Nuevo" del catálogo (`src/routes/CatalogoIngredientes.tsx`): función `handleGuardar`.

## Cambios de código

### 1. Helper de detección  (`src/lib/detectarDuplicado.ts`, nuevo)

```ts
export function detectarDuplicado(
  nombre: string,
  catalogo: Map<string, Ingrediente>
): Ingrediente | null
```

- Calcula `canon = normalizeText(nombre)`.
- Recorre el catálogo: si algún ingrediente tiene `canonico === canon`
  **o** `sinonimos.includes(canon)`, lo devuelve.
- Devuelve `null` si no hay colisión.
- Función pura, sin side-effects → testeable.

### 2. Catálogo editor — advertencia al crear  (`src/routes/CatalogoIngredientes.tsx`)

En `handleGuardar` del sheet, **antes** de llamar `crearIngrediente`:
- Llamar `detectarDuplicado(trimmed, new Map(catalogo.map(i => [i.idIngrediente, i])))`.
- Si hay colisión y `!confirmDuplicado`:
  - No crear. Mostrar inline en el sheet: "Ya existe **{nombrePreferido}** con este nombre.
    ¿Usar ese ingrediente en su lugar?" + botón "Usar existente" (cierra el sheet sin crear,
    opcionalmente emite un callback con el ID existente) + botón "Crear de todas formas"
    (setea `confirmDuplicado = true` y reintenta).
- Si `confirmDuplicado === true`: crear igual (el usuario lo confirmó).

Estado nuevo en el sheet: `const [confirmDuplicado, setConfirmDuplicado] = useState(false)`.
Resetear al cambiar de ingrediente (ya está cubierto por el `key` del sheet).

### 3. Importer, paso 2 — badge de colisión  (`src/routes/ImportarReceta.tsx`)

Para cada fila con `decision.tipo === "nuevo"`:
- Calcular `detectarDuplicado(decision.nombre, catalogo)` — el catálogo ya está cargado
  en el estado del paso 2.
- Si hay colisión, mostrar junto a esa fila un badge warn:
  "⚠ Posible duplicado de **{nombrePreferido}**"  + botón "Usar ese" que cambia la decision
  a `{ tipo: "sugerencia", idIngrediente: existente.idIngrediente, nombrePreferido: ... }`.
- Si JP hace clic en "Usar ese", el comportamiento es idéntico a elegir una sugerencia del
  matcher (el sinónimo se agrega en el paso 3 via `agregarSinonimo`).
- Si JP ignora el badge y guarda igual, se crea el duplicado (es su decisión consciente).

### 4. Test  (`src/lib/detectarDuplicado.test.ts`, nuevo)

```ts
describe("detectarDuplicado", () => {
  it("devuelve el ingrediente cuando el canonico coincide");
  it("devuelve el ingrediente cuando el texto está en sinonimos");
  it("devuelve null cuando no hay colisión");
  it("es case-insensitive y diacritic-insensitive (normalización)");
});
```

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch. Reportá versión.
2. Subsección `### 1.2.E8.8 Cambios en vX.Y.Z (E8.8 — detección de duplicados)`:
   explicar los dos puntos de detección, el helper puro y la decisión de "crear de todas
   formas" como escape consciente.
3. En §11, marcar **E8.8 como ✅ HECHO (vX.Y.Z)**.
4. Registrar `**PROMPT_E8.8_deteccion_duplicados.md** ✅ CERRADO (vX.Y.Z)`.

## Criterio de aceptación
1. Crear en el catálogo un ingrediente con el mismo nombre que uno existente → aviso inline,
   no se crea duplicado por defecto.
2. "Crear de todas formas" → se crea igual (escape consciente).
3. En el importer, una fila "nuevo" cuyo canonico colisiona muestra el badge + "Usar ese".
4. Clic en "Usar ese" cambia la decision a sugerencia.
5. `detectarDuplicado` pasa sus tests.
6. Build + typecheck + tests verdes.

## Fuera de scope
- Fusionar dos ingredientes ya existentes (merge de docs Firestore con reasignación de IDs
  en recetas) — es un mini-proyecto destructivo; requiere prompt propio.
- Detección de similitud difusa (Levenshtein, etc.) — para texto libre sería ruidoso;
  solo canonico exacto y sinonimos.

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E8.8: detección de duplicados al crear ingrediente (catálogo + importer) + MAPEO"
git push
```
Confirmá push OK.
