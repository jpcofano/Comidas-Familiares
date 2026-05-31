# PROMPT E9.3 — Qué cocino con lo que tengo (matcher inverso, ex-7.2)

> **Etapa 9 — Lote 9 "Cocinar con lo que hay".** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** v2.0.2 (lo dejó E9.2 — fix Historial). Verificá el header y reportá.
> **Correr después de E9.2.** Al terminar: commit + push — ver "Cierre".
>
> Numeración: E9.0 / E9.0.1 / E9.1 (proteínas, diccionario, prompt importador) y E9.2 (fix
> Historial) ya están tomados. Este feature es **E9.3** (cierra el ítem histórico 7.2).

## Por qué

La familia ya cargó conocimiento estructurado en el catálogo (roles, góndola, **equivalencias**
de E8.7) y en las recetas (`idIngrediente`, `opcional`, `alternativas`, y desde E9.0
`esVegetariano`/`esKeto`). Falta la capa que lo use para **decidir qué cocinar con lo que hay en
casa**: el usuario marca su despensa y la app ordena las recetas por cercanía.

## Lo que ya existe (usar, no rehacer)
- `getRecetas()` cacheado (`cachedRecetas`, patrón ya usado en E8.5) y `getIngredientes()`.
- `Receta.ingredientes: IngredienteEnReceta[]` con `idIngrediente`, `opcional?`,
  `alternativas?: Array<{ idIngrediente }>`.
- `Ingrediente.equivalencias?: string[]` (idIngrediente[], **simétrico** por E8.7).
- `Receta.esVegetariano?` / `esKeto?` (E9.0) y `filtrarRecetas` / `FiltrosReceta` (`filtros.ts`).
- Tokens semánticos (light/dark) y el patrón de chip letra+color del catálogo.
- **NO existe** un matcher inverso: ni `elegibilidad.ts` (es elegibilidad de planes) ni
  `matcherIngredientes.ts` (es el matcher de import texto→catálogo) hacen esto.

## Cambios de código

### 1. Helper puro y testeable — `src/lib/cocinables.ts`
Sin side-effects (igual que `detectarDuplicado.ts` / `elegibilidad.ts`), para tests unitarios.

```ts
export type EstadoReq =
  | { id: string; estado: "tengo" }
  | { id: string; estado: "sustituye"; conId: string }   // equivalencia o alternativa en despensa
  | { id: string; estado: "falta" };

export type Bucket = "ahora" | "cambio" | "falta1" | "faltaN";

export interface RecetaCocinable {
  receta: Receta;
  requeridos: EstadoReq[];   // solo ingredientes NO opcionales
  faltan: string[];          // ids que faltan y no tienen sustituto en despensa
  sustituciones: { faltaId: string; conId: string }[];
  cobertura: number;         // (tengo + sustituye) / requeridos.length, 0..1
  cocinable: boolean;        // faltan.length === 0
  conCambio: boolean;        // cocinable && sustituciones.length > 0
  bucket: Bucket;
}

export function evaluarCocinables(
  recetas: Receta[],
  despensa: Set<string>,              // idIngrediente que el usuario tiene
  catalogoById: Map<string, Ingrediente>,
): RecetaCocinable[];
```

Reglas (zanjadas en diseño):
- **Requeridos = ingredientes NO `opcional`.** Los opcionales no bloquean ni cuentan en cobertura.
- Para cada requerido ausente de la despensa, es `sustituye` si **(a)** algún id de
  `catalogo[req].equivalencias` está en la despensa, **o (b)** algún `alternativas[].idIngrediente`
  del ítem de receta está en la despensa. Si no, es `falta`.
- Bucket: `ahora` (faltan 0 y sin sustituciones) · `cambio` (faltan 0 con ≥1 sustitución) ·
  `falta1` (faltan 1) · `faltaN` (faltan ≥2).
- Orden sugerido: `ahora` → `cambio` → `falta1` → `faltaN`; dentro de cada uno por `cobertura`
  desc y nombre.

### 2. Básicos de despensa (decisión de producto — clave)
En el repo las recetas reales tienen sal, pimienta, aceite, agua, "c/n". Si esos cuentan como
"falta", el matcher es ruido. Definir un set de **básicos** que se asumen siempre disponibles:
una lista de `canonico` básicos en `src/lib/cocinables.ts` (sal, pimienta, agua, aceite, aceite
de oliva, azúcar…), documentada en el MAPEO. Se tratan como `tengo` salvo que el usuario los
saque de la despensa. (Futuro: que el flag viva en el diccionario canónico de E9.0.)

### 3. Despensa persistente
- v1 **local por dispositivo**: `localStorage` (`cf-despensa`, array de `idIngrediente`), mismo
  patrón que `cf-ingredientes-vista` (E8.4). Default = básicos.
- Documentá como futuro la **despensa compartida** (doc en Firestore por familia) — no ahora.

### 4. Pantalla / ruta `QueCocino` (`src/routes/QueCocino.tsx`)
- **Despensa editable** arriba: buscador + chips toggle (letra+color por `seccionGondola`).
  Contador "N en casa". Colapsable.
- **Faceta Dieta** (E9.0): toggles **Todas / Vegetariana / Keto** que filtran el universo vía
  `filtrarRecetas` antes de evaluar cocinabilidad.
- **Resultados**: lista agrupada por bucket (Cocinás ahora · Con un cambio · Te falta 1 · Te
  faltan varios). Cada card: nombre + `proteinaPrincipal · tiempoTotalLabel · dificultad`, y una
  línea de estado: ✓ tenés todo · ⇄ "Usá {X} en vez de {Y}" · + "Te falta {…}". Tap →
  `/receta/:idReceta`. Estado vacío si el filtro no deja recetas.
- (El prototipo muestra además una variante "ranking" con % de match; es opcional — implementá
  la agrupada por bucket, que es la principal.)

### 5. Navegación + entrada
- Registrar la ruta en `App.tsx`.
- **Entrada destacada en Home** (`Home.tsx`): card "¿Qué cocino con lo que tengo?" con bajada
  "Recetas según tu despensa", debajo de la tira de la semana.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump **minor** (feature nueva): v2.0.2 → **v2.1.0**. Reportá versión.
2. Subsección `### 1.2.E9.3 Cambios en v2.1.0 (E9.3 — Qué cocino con lo que tengo)`: helper
   `cocinables.ts` + reglas (requeridos = no opcionales; sustitución por equivalencias **o**
   alternativas; básicos de despensa con la lista usada), persistencia local, ruta + entrada en
   Home, integración con faceta Dieta.
3. En §11 Lote 9, marcar **E9.3 ✅ HECHO (v2.1.0)**; dejar E9.4/E9.5 listadas.
4. Registrar `**PROMPT_E9.3_que_cocino_con_lo_que_tengo.md** ✅ CERRADO (v2.1.0)`.

## Criterio de aceptación
1. Con una despensa de prueba, "Cocinás ahora" lista solo recetas con todos los requeridos (no
   opcionales) cubiertos; sacar un requerido la mueve a "Te falta 1".
2. Una receta cuyo único faltante tiene equivalencia/alternativa en la despensa cae en "Con un
   cambio" y muestra "Usá {X} en vez de {Y}".
3. Los básicos (sal, etc.) no generan "falta"; sacarlos de la despensa sí.
4. El toggle Vegetariana/Keto filtra el universo correctamente.
5. La despensa persiste al recargar; la entrada desde Home abre la pantalla.
6. `evaluarCocinables` con tests unitarios (buckets, sustitución por equivalencia y por
   alternativa, opcionales ignorados, básicos). Build + typecheck + tests verdes.
7. Pegá la subsección 1.2.E9.3 y el §11 Lote 9.

## Fuera de scope (van en E9.4 / E9.5)
- "o {sustituto}" dentro del detalle de receta / paso a paso → **E9.4**.
- Aplicar equivalencias al armar la lista de compras → **E9.5**.
- Despensa compartida en Firestore; recalcular `vecesUsado`; ranking con % (opcional).

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E9.3: qué cocino con lo que tengo (matcher inverso, ex-7.2) + helper cocinables.ts + tests + MAPEO v2.1.0"
git push
```
Confirmá push OK.
