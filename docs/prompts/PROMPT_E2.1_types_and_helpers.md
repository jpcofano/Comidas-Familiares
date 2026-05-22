# PROMPT E2.1 — Types TypeScript + Helpers de canonicalización y parsers

## Contexto

Etapa 1 cerrada y deployada (`https://comida-familiar.web.app`). Arrancamos **Etapa 2 — Modelo de datos en Firestore**.

E2.1 es la base de toda la etapa. No toca Firestore ni runtime visible — solo agrega:

1. **Types TypeScript** que reflejan todas las shapes documentadas en `docs/MAPEO_FIRESTORE.md §2` (Receta, Menu Modelo M, Plan con votos como map, Historial, ListaCompras + ItemCompra, DiccionariosConfig).
2. **Helpers de canonicalización** (`normalizeText`, `canonicalizarIngrediente`) para sumabilidad de compras (§6.1) y anti-duplicado del importador (§3.5).
3. **Parsers permisivos** (`parseNumber`, `parseTime`, `parseDificultad`, `parseCosto`, `parseSiNo`) para convertir los strings legacy de los seeds ("1,2 a 1,5", "10 a 15 min", "Medio") a los campos numéricos derivados (`xxxMin`/`xxxMax`/`xxxOrden`) que necesita E2.4.
4. **Tests unitarios con Vitest** para los helpers y parsers — criterios de aceptación verificables, no decorativos.

Sin estos types, los módulos de data layer (E2.2) navegan a ciegas y los componentes de React (E3+) terminan con `any` o castings frágiles. Sin parsers, el seeding de E2.4 no puede convertir los strings reales de los seeds a números ordenables.

## Decisiones zanjadas

- **camelCase español** para todos los campos (continuidad con `CS_HEADER_KEYS`).
- **IDs human-readable como `string`** (`REC-XXXX`, `MENU-XXXX`, `PLAN-...`, `LST-SEM-...`).
- **Modelo M**: `Receta` autocontenida con `ingredientes[]` + `pasos[]` embebidos. `Menu` liviano con `componentes[]` que referencian `idReceta`. **Sin** `tipoItem: "Componente"` ni `elegibleSemana`.
- **Voto y comentarios como map**: `votos: Record<MiembroId, number | null>`, `comentariosPlan: Record<MiembroId, string>`.
- **Asignaciones como array**: `asignaciones: MiembroId[]`.
- **Union types literales** (no `enum` de TS) — mejor tree-shaking, más livianos en runtime, y los valores quedan exportados también como arrays `as const` para uso en validaciones y dropdowns.
- **MiembroId** es `"juanpablo" | "maria" | "sofia" | "federico"`.
- **Parsers permisivos**: aceptan formato variado, devuelven `null` ante input inválido (nunca tiran). Para campos numéricos con rangos, devuelven `RangoNumerico { value, min?, max?, raw }` donde `raw` siempre se preserva para auditoría.
- **Tests con Vitest**: ya incluido en el ecosistema Vite, sin Jest/Babel config.
- **Estos archivos no se usan todavía en runtime** — son la base sobre la que se construye E2.2.

## Prerequisitos

- E1.2.5 cerrado y deployado.
- `docs/MAPEO_FIRESTORE.md` v1.2 en el repo (es la fuente de verdad de los shapes).
- Working tree limpio (`git status` sin cambios sin commitear).

## Tareas

### Tarea 1 — Instalar Vitest

Instalar como devDependencies:

```bash
npm install -D vitest @vitest/ui
```

Agregar a `package.json` en la sección `scripts`:

```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:run": "vitest run"
```

**Commit:** `Stage 2.1: add vitest`

### Tarea 2 — Configurar Vitest

Agregar configuración mínima al `vite.config.ts` existente (o crear `vitest.config.ts` separado si lo preferís).

Configuración requerida:
- `globals: true` (para usar `describe`, `it`, `expect` sin importar)
- `environment: 'node'` (los helpers no tocan DOM; las screens sí, pero acá no testeamos screens)
- include: `['src/**/*.test.{ts,tsx}']`

Verificar que `npx vitest run --reporter=basic` arranca sin error (con 0 tests todavía).

**Commit:** `Stage 2.1: configure vitest`

### Tarea 3 — Constantes y union types base

Crear `src/types/models.ts` con la primera sección: union types literales + arrays `as const` para uso runtime.

Tipos a definir:

```typescript
// Miembros
export const MIEMBRO_IDS = ["juanpablo", "maria", "sofia", "federico"] as const;
export type MiembroId = typeof MIEMBRO_IDS[number];

export type Rol = "padre" | "madre" | "hija" | "hijo" | "invitado";

// Plan
export const ESTADOS_PLAN_ACTIVOS = ["Elegida", "Compra pendiente", "Compra lista", "Cocinada"] as const;
export const ESTADOS_PLAN_FINALES = ["Evaluada"] as const;
export const ESTADOS_PLAN = [...ESTADOS_PLAN_ACTIVOS, ...ESTADOS_PLAN_FINALES] as const;
export type EstadoPlan = typeof ESTADOS_PLAN[number];

export const TIPOS_PLAN = ["Especial", "Especial extra", "En proceso"] as const;
export type TipoPlan = typeof TIPOS_PLAN[number];

export type TipoSeleccion = "receta" | "menu";

// Receta — enums de dominio
export const TIPOS_ITEM = [
  "Receta principal", "Entrada", "Guarnición", "Postre",
  "Panificado", "Snack", "Desayuno", "Conserva", "Hidrato opcional"
] as const;
export type TipoItem = typeof TIPOS_ITEM[number];

export const PROTEINAS = [
  "Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado",
  "Mariscos", "Huevos", "Legumbres", "Mixta", "Vegetariana"
] as const;
export type Proteina = typeof PROTEINAS[number];

export const ESCENARIOS = ["Noche de a dos", "Cocina rápida", "Cena Especial", "Celebración"] as const;
export type Escenario = typeof ESCENARIOS[number];

export const CLIMAS_PLATO = ["Liviano", "Medio", "Potente"] as const;
export type ClimaPlato = typeof CLIMAS_PLATO[number];

export const PENSADA_PARA = ["Especial", "Semana", "Cualquiera"] as const;
export type PensadaPara = typeof PENSADA_PARA[number];

export const DIFICULTADES = ["Baja", "Media", "Media-alta", "Alta"] as const;
export type Dificultad = typeof DIFICULTADES[number];

export const COSTOS = ["Bajo", "Medio", "Medio/Alto", "Alto"] as const;
export type Costo = typeof COSTOS[number];

export const APTO_NOCHE_DE_A_DOS = ["Sí", "No", "Adaptable"] as const;
export type AptoNocheDeADos = typeof APTO_NOCHE_DE_A_DOS[number];

export const OCASIONES = ["Cena familiar", "Con invitados", "Cumpleaños", "Celebración", "Otra"] as const;
export type Ocasion = typeof OCASIONES[number];

export const RESULTADOS = ["Excelente", "Muy bueno", "Bueno", "Regular", "Malísimo"] as const;
export type Resultado = typeof RESULTADOS[number];

// Tipo de componente dentro de un menú
export const TIPOS_COMPONENTE = ["Entrada", "Principal", "Acompañamiento", "Postre"] as const;
export type TipoComponente = typeof TIPOS_COMPONENTE[number];

// Estado de menú (catálogo)
export const ESTADOS_MENU = ["Para probar", "Probado", "Archivado"] as const;
export type EstadoMenu = typeof ESTADOS_MENU[number];

// Helper genérico para campos numéricos con rango
export interface RangoNumerico {
  value: number;        // valor representativo (= min si es rango, o el número fijo)
  min?: number;         // presente solo si es rango
  max?: number;         // presente solo si es rango
  raw: string;          // string original para auditoría / display
}
```

**Importante:** todos los arrays se exportan con `as const` para que TypeScript infiera el tipo literal exacto, no `string[]`. Eso es lo que permite que `MiembroId = typeof MIEMBRO_IDS[number]` resuelva al union literal.

**Commit:** `Stage 2.1: add base types and union literals`

### Tarea 4 — Type Ingrediente

Agregar al mismo `src/types/models.ts`:

```typescript
export interface Ingrediente {
  // Identidad dentro de la receta
  nroOrden: number;            // orden de display, único dentro de la receta

  // Display
  ingrediente: string;          // nombre tal como se ve en la UI ("Cebolla blanca")
  ingredienteCanonico: string;  // normalizado para sumabilidad y anti-dup ("cebolla")

  // Cantidad
  cantidad: number | null;      // numérico parseado (puede ser null si solo viene texto tipo "a gusto")
  cantidadMin?: number;         // si era rango (ej. "1 a 2")
  cantidadMax?: number;
  cantidadLabel: string;        // string original ("1,5", "1 a 2", "a gusto") — display

  // Unidad
  unidad: string;               // "g", "ml", "unidad", "cda", etc — canonicalizada para sumar
  unidadOriginal?: string;      // si la importación traía otra ("cdas") guardamos el original

  // Clasificación
  categoria: string;            // "Verdura", "Carne", "Almacén", "Lácteo"...
  seccion?: string;             // sección dentro de la receta ("Principal", "Base de sabor"...)

  // Flags
  opcional: boolean;            // "Sí" / "No" del sheet → boolean
  paraJuanPablo?: boolean;      // override por ingrediente (raro pero existe)

  // Texto libre
  notas?: string;
}
```

**Commit:** `Stage 2.1: add Ingrediente type`

### Tarea 5 — Type Paso

```typescript
export interface Paso {
  nroPaso: number;              // 1, 2, 3... único dentro de la receta
  titulo: string;               // "Precalentar", "Sellar", "Reposar"
  detalle: string;              // descripción del paso

  // Tiempos
  tiempoEstimadoLabel: string;  // string original ("10 min", "30 a 40 min")
  tiempoEstimadoMin: number | null;     // parseado a minutos (min del rango si aplica)

  // Metadatos
  momento?: string;             // "Mise en place", "Cocción", "Servicio"
  puntoClave?: string;          // qué hay que cuidar
  errorComun?: string;          // qué evitar
  notas?: string;
}
```

**Commit:** `Stage 2.1: add Paso type`

### Tarea 6 — Type Receta

Reflejar el shape completo de `MAPEO §2.2`. Campos:

- Identidad: `idReceta`, `nombre`, `nombreCanonico`.
- Clasificación: `tipoItem: TipoItem`, `proteinaPrincipal: Proteina`, `estilo`, `tecnicaPrincipal`, `escenarioUso: Escenario`, `climaDelPlato?: ClimaPlato`, `pensadaPara: PensadaPara`.
- Restricciones: `sinLacteos: boolean`, `hidratos: boolean`, `aptoNocheDeADos: AptoNocheDeADos`, `paraJuanPablo: boolean`, `paraFamilia: boolean`. **NO incluir `elegibleSemana`**.
- Tiempos: `tiempoActivoLabel`, `tiempoActivoMin`, `tiempoTotalLabel`, `tiempoTotalMin`, `dificultad: Dificultad`, `dificultadOrden`.
- Porciones y costo: `porcionesLabel`, `porcionesMin`, `porcionesMax`, `costoEstimado: Costo`, `costoOrden`.
- Texto libre: `hidratoOpcional`, `acompPadres`, `porQueEspecial`, `riesgos`, `notas`, `notasNocheDeADos`.
- Fuente: `fuente`, `urlFuente?`, `imagenUrl?`.
- Embebidos: `ingredientes: Ingrediente[]`, `pasos: Paso[]`.
- Counters (escritura por server o transacción): `vecesCocinada: number`, `ultimaEvaluacion?: string` (ISO), `ultimoPuntaje?: number`.
- Timestamps: `fechaImportacion?: string`, `fechaCreacion?` (Firestore Timestamp serializado a `any` por ahora), `ultimaModificacion?`.

Para los `Timestamp` de Firestore: usar `import type { Timestamp } from "firebase/firestore"` y tipar como `Timestamp` directamente. Si no querés agregar el import de `firebase` en este archivo de modelos puros, definir un alias:

```typescript
// Alias: en runtime es firebase/firestore Timestamp.
// Lo importamos solo donde se necesita (data layer).
export type FirestoreTimestamp = { seconds: number; nanoseconds: number };
```

**Commit:** `Stage 2.1: add Receta type`

### Tarea 7 — Type Menu (Modelo M)

Shape liviano según `MAPEO §2.3`. Reglas claves:

- **NO** incluir `dificultad`, `tiempoActivoMin`, `tiempoTotalMin`, `sinLacteos`, `hidratos`, `porciones`, `costoOrden` — esos se derivan al vuelo (ver `MAPEO §3.8`).
- **SÍ** incluir metadata propia del menú: nombre, descripción, escenario, idealPara, adaptaciones para JP/familia, notas, riesgos, climaDelMenu (texto libre, NO union type).

```typescript
export interface ComponenteMenu {
  orden: number;
  tipo: TipoComponente;
  idReceta: string;
  obligatorio: boolean;
  notas?: string;
}

export interface Menu {
  idMenu: string;
  nombreMenu: string;
  nombreCanonico: string;

  estado: EstadoMenu;
  estilo: string;                          // texto libre
  escenarioUso: Escenario;
  climaDelMenu?: string;                   // texto libre (NO validado contra diccionario)
  idealPara?: string;
  descripcion?: string;

  // Adaptaciones (overrides sobre las recetas):
  paraJuanPablo?: string;
  paraFamilia?: string;
  riesgos?: string;
  notas?: string;
  notasOcasion?: string;
  aptoNocheDeADos?: AptoNocheDeADos;
  hidratoOpcional?: string;

  componentes: ComponenteMenu[];

  fechaCreacion?: FirestoreTimestamp;
  ultimaModificacion?: FirestoreTimestamp;
}

// Shape de los campos derivados que se calculan al vuelo (ver MAPEO §3.8)
export interface MenuDerived {
  tiempoActivoMin: number;
  tiempoTotalMin: number;
  dificultadOrden: number;
  sinLacteos: boolean;
  hidratos: boolean;
  porcionesMin: number;
  porcionesMax: number;
  costoOrden: number;
}
```

**Commit:** `Stage 2.1: add Menu type with componentes`

### Tarea 8 — Type Plan

Shape según `MAPEO §2.4`. Recordar:

- 18 campos top-level + 2 maps (votos, comentariosPlan) + 1 objeto (datosCocinero).
- `votos` y `comentariosPlan` como `Record<MiembroId, ...>` — **TS exige las 4 keys**. Para representar "voto vacío", usar `number | null` y `string` ("" = vacío). No usar partial maps; partial es ruidoso en consumo.

```typescript
export interface DatosCocinero {
  repetir: "" | "Sí" | "No";
  costoRealAprox: string;       // texto libre
  dificultadReal: "" | Dificultad;
  queSalioBien: string;
  queCambiaria: string;
  notasFamiliares: string;
}

export interface Plan {
  idPlan: string;                          // PLAN-yyyyMMdd-timestamp

  // Semana
  semanaInicio: string;                    // ISO date (lunes)
  semanaFin: string;                       // ISO date (domingo)

  // Selección
  tipoSeleccion: TipoSeleccion;
  tipoPlan: TipoPlan;
  idSeleccion: string;                     // id de receta o menú
  nombreSeleccion: string;
  recetaPrincipal: string;                 // para menús: nombre del componente Principal

  // Estado
  estado: EstadoPlan;
  fechaEleccion: FirestoreTimestamp;
  fechaPrevistaComida: string | null;      // ISO date
  cantidadPersonas: number;

  // Vinculación
  listaComprasId: string | null;
  notas: string;
  origen: string | null;                   // "extra:PLAN-..." para Especial extra

  // Multi-miembro
  asignaciones: MiembroId[];               // default ["juanpablo"]
  votos: Record<MiembroId, number | null>;
  comentariosPlan: Record<MiembroId, string>;

  // Cocinero
  datosCocinero: DatosCocinero;
}
```

**Commit:** `Stage 2.1: add Plan type with votos map`

### Tarea 9 — Type Historial

Snapshot completo según `MAPEO §2.6`. Importante: las calificaciones se snapshean como `Record<MiembroId, number>` (sin null — al cerrar evaluación tienen que estar los 4).

```typescript
export interface Historial {
  idHist: string;                          // doc ID (auto-generado)

  // Fechas
  fechaRealizada: string;                  // ISO date
  fechaRealizadaTimestamp: FirestoreTimestamp;

  // Referencias snapshot
  idPlan: string;
  idReceta: string;                        // "" si tipoSeleccion === "menu"
  idMenu: string;                          // "" si tipoSeleccion === "receta"
  receta: string;                          // nombre snapshot
  tipoSeleccion: TipoSeleccion;
  idSeleccion: string;
  nombreSeleccion: string;
  semanaInicio: string;

  // Ocasión
  ocasion: Ocasion | "";

  // Votos (snapshot al cerrar):
  calificaciones: Record<MiembroId, number>;
  comentarios: Record<MiembroId, string>;

  // Cálculos
  promedio: number;
  resultado: Resultado | "";

  // Datos del cocinero (snapshot)
  repetir: "" | "Sí" | "No";
  costoRealAprox: string;
  dificultadReal: "" | Dificultad;
  queSalioBien: string;
  queCambiaria: string;
  notasFamiliares: string;
}
```

**Commit:** `Stage 2.1: add Historial type`

### Tarea 10 — Type Compras (lista + items)

```typescript
export interface Aporte {
  idPlan: string;
  idReceta: string;
  nombreReceta: string;
  cantidad: number;
  cantidadLabel: string;       // "1,5"
}

export interface ItemCompra {
  id: string;                           // doc ID en subcollection
  ingredienteCanonico: string;          // clave de sumabilidad
  ingredienteLabel: string;             // nombre display ("Cebolla blanca" — el más rico de los aportes)
  cantidadTotal: number;
  cantidadLabel: string;                // regenerada: "3 unidades"
  unidad: string;                       // canonicalizada
  categoria: string;
  yaTengo: boolean;
  aportes: Aporte[];                    // de qué recetas viene este ítem
  notas?: string;
}

export interface ListaCompras {
  idLista: string;                      // LST-SEM-yyyyMMdd-HHmmss
  semanaInicio: string;                 // ISO date (lunes)
  fechaGeneracion: FirestoreTimestamp;
  // items vive como subcollection /compras/{idLista}/items
  // Resumen denormalizado (opcional, para no levantar la subcollection completa):
  totalItems?: number;
  totalYaTengo?: number;
}
```

**Commit:** `Stage 2.1: add Compras types (ListaCompras and ItemCompra)`

### Tarea 11 — Types de config (`FamiliaConfig`, `DiccionariosConfig`, `UserDoc`)

`FamiliaConfig` y `UserDoc` probablemente ya existen parcialmente en `src/types/` desde E1.1. **Si existen, no duplicar — extender desde `src/types/models.ts` re-exportándolos o moverlos acá.** Decidí vos según el estado actual del repo (mostrame el diff antes de hacer cambios si hay ambigüedad).

Shape de `DiccionariosConfig` según `MAPEO §2.7`:

```typescript
export interface MiembroConfig {
  id: MiembroId;
  nombre: string;
  rol: Rol;
}

export interface FamiliaConfigMiembro {
  nombre: string;
  rol: Rol;
  mails: string[];
}

export interface FamiliaConfig {
  miembros: Record<MiembroId, FamiliaConfigMiembro>;
  owner: MiembroId;
  timezone: string;
  semanaArrancaEn: "lunes" | "domingo";
}

export interface DiccionariosConfig {
  tiposItem: TipoItem[];
  proteinas: Proteina[];
  escenarios: Escenario[];
  climaPlato: ClimaPlato[];
  pensadaPara: PensadaPara[];
  tiposPlan: TipoPlan[];
  ocasiones: Ocasion[];
  aptoNocheDeADos: AptoNocheDeADos[];
  dificultades: Dificultad[];
  costos: Costo[];
  miembros: MiembroConfig[];
  estadosPlan: {
    activos: EstadoPlan[];
    finales: EstadoPlan[];
  };
  seccionesIngredientes: string[];
  unidadesCanonicas: string[];
  version: number;
  ultimaActualizacion: FirestoreTimestamp;
}

export interface UserDoc {
  uid: string;
  email: string;
  memberId: MiembroId;
  nombre: string;
  ultimoLogin: FirestoreTimestamp;
  fechaCreacion: FirestoreTimestamp;
}
```

**Commit:** `Stage 2.1: extend config types (Familia, Diccionarios, UserDoc)`

### Tarea 12 — Helper `normalizeText`

Crear `src/lib/canonical.ts` con:

```typescript
/**
 * Normaliza un string para comparaciones case/diacritic-insensitive.
 * - lowercase
 * - NFD + remove diacritics (tildes, ñ → n)
 * - collapse whitespace
 * - trim
 */
export function normalizeText(input: unknown): string {
  if (input == null) return "";
  return String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
```

**Commit:** `Stage 2.1: add normalizeText helper`

### Tarea 13 — Helper `canonicalizarIngrediente` + tabla de sinónimos

En el mismo `src/lib/canonical.ts`:

```typescript
/**
 * Tabla de sinónimos manuales. Mapea variantes comunes a una forma canónica.
 * Empezamos con ~30 entradas; se extiende cuando aparezcan casos reales en seeds.
 * NO usar regex agresivas — es preferible que un ingrediente quede "sin sumar"
 * a que se fusionen dos ingredientes distintos por error.
 */
export const SINONIMOS_INGREDIENTES: Record<string, string> = {
  // cebolla
  "cebolla": "cebolla",
  "cebollas": "cebolla",
  "cebolla blanca": "cebolla",
  "cebolla colorada": "cebolla",
  "cebolla morada": "cebolla",

  // ajo
  "ajo": "ajo",
  "ajos": "ajo",
  "diente de ajo": "ajo",
  "dientes de ajo": "ajo",

  // zanahoria
  "zanahoria": "zanahoria",
  "zanahorias": "zanahoria",

  // tomate
  "tomate": "tomate",
  "tomates": "tomate",
  "tomate perita": "tomate",

  // morron
  "morron": "morron",
  "morrones": "morron",
  "aji morron": "morron",
  "pimiento": "morron",        // controversial — revisar caso por caso si hay seeds que lo separen
  "pimientos": "morron",

  // aceite
  "aceite de oliva": "aceite de oliva",
  "oliva extra virgen": "aceite de oliva",
  "aceite oliva": "aceite de oliva",

  // leche de coco
  "leche de coco": "leche de coco",
  "crema de coco": "leche de coco",   // duda — si los seeds las separan, revisar

  // sal / pimienta
  "sal": "sal",
  "sal fina": "sal",
  "sal gruesa": "sal gruesa",          // distintas — NO fusionar
  "pimienta": "pimienta",
  "pimienta negra": "pimienta",

  // huevos
  "huevo": "huevo",
  "huevos": "huevo",

  // hierbas comunes
  "perejil": "perejil",
  "cilantro": "cilantro",
  "albahaca": "albahaca",
  "tomillo": "tomillo",
  "romero": "romero",
};

/**
 * Canonicaliza un nombre de ingrediente para sumabilidad y anti-duplicado.
 * Aplica normalizeText + mapeo de sinónimos. NO aplica plural automático
 * para evitar falsos positivos ("brotes" vs "brote" pueden ser distintos).
 */
export function canonicalizarIngrediente(input: unknown): string {
  const normalized = normalizeText(input);
  if (!normalized) return "";
  return SINONIMOS_INGREDIENTES[normalized] ?? normalized;
}
```

**Commit:** `Stage 2.1: add canonicalizarIngrediente with synonym table`

### Tarea 14 — Parsers

Crear `src/lib/parsers.ts`:

```typescript
import type { RangoNumerico, Dificultad, Costo } from "../types/models";

/**
 * Parsea un número que puede venir como:
 *   - "1.5" → 1.5
 *   - "1,5" → 1.5  (coma decimal latina)
 *   - "1 a 2" → { value: 1, min: 1, max: 2, raw: "1 a 2" }
 *   - "1-2"  → { value: 1, min: 1, max: 2, raw: "1-2" }
 *   - "1 1/2" → 1.5  (fracciones unicode opcional, no obligatorio)
 *   - "" / null / "abc" → null
 * Siempre preserva el string original en `raw`.
 */
export function parseNumber(input: unknown): RangoNumerico | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // Reemplazar coma decimal por punto si aplica (solo entre dígitos)
  const normalized = raw.replace(/(\d),(\d)/g, "$1.$2");

  // Detectar rango: "X a Y" o "X-Y" o "X/Y" (este último es ambiguo, ignorar)
  const rangoMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*(?:a|-)\s*(-?\d+(?:\.\d+)?)$/i);
  if (rangoMatch) {
    const min = Number(rangoMatch[1]);
    const max = Number(rangoMatch[2]);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { value: min, min, max, raw };
  }

  // Número simple
  const numMatch = normalized.match(/^(-?\d+(?:\.\d+)?)$/);
  if (numMatch) {
    const value = Number(numMatch[1]);
    if (!Number.isFinite(value)) return null;
    return { value, raw };
  }

  // Intento extra: número con sufijo ("3 unidades", "3kg") — solo el número
  const inicioMatch = normalized.match(/^(-?\d+(?:\.\d+)?)/);
  if (inicioMatch) {
    const value = Number(inicioMatch[1]);
    if (Number.isFinite(value)) return { value, raw };
  }

  return null;
}

/**
 * Parsea un tiempo expresado en minutos/horas a número de minutos.
 *   - "35 min" → { value: 35, raw: "35 min" }
 *   - "1 h" → { value: 60, raw: "1 h" }
 *   - "1 h 30 min" → { value: 90, raw: "1 h 30 min" }
 *   - "1,5 h" → { value: 90, raw: "1,5 h" }
 *   - "10 a 15 min" → { value: 10, min: 10, max: 15, raw: "10 a 15 min" }
 *   - "" / null / "abc" → null
 *
 * Tolerante a "hs", "hrs", "horas", "h.", "minutos", "mins", "m".
 */
export function parseTime(input: unknown): RangoNumerico | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // Normalizar coma decimal y lowercase
  const lc = raw.toLowerCase().replace(/(\d),(\d)/g, "$1.$2");

  // Rango "X a Y min" o "X-Y min"
  const rangoMatch = lc.match(/^(\d+(?:\.\d+)?)\s*(?:a|-)\s*(\d+(?:\.\d+)?)\s*(min|mins?|minutos?|m|h|hs|hrs?|horas?)?\.?$/);
  if (rangoMatch) {
    const a = Number(rangoMatch[1]);
    const b = Number(rangoMatch[2]);
    const unit = rangoMatch[3] ?? "min";
    const mult = /^h/.test(unit) ? 60 : 1;
    return { value: a * mult, min: a * mult, max: b * mult, raw };
  }

  // "X h Y min" combinado
  const hMinMatch = lc.match(/^(\d+(?:\.\d+)?)\s*(?:h|hs|hrs?|horas?)\.?\s*(\d+(?:\.\d+)?)\s*(?:min|mins?|minutos?|m)?\.?$/);
  if (hMinMatch) {
    const h = Number(hMinMatch[1]);
    const m = Number(hMinMatch[2]);
    const value = h * 60 + m;
    return { value, raw };
  }

  // Solo horas
  const hMatch = lc.match(/^(\d+(?:\.\d+)?)\s*(?:h|hs|hrs?|horas?)\.?$/);
  if (hMatch) {
    const h = Number(hMatch[1]);
    return { value: Math.round(h * 60), raw };
  }

  // Solo minutos
  const minMatch = lc.match(/^(\d+(?:\.\d+)?)\s*(?:min|mins?|minutos?|m)?\.?$/);
  if (minMatch) {
    const m = Number(minMatch[1]);
    return { value: m, raw };
  }

  return null;
}

/**
 * Dificultad → orden 1-4.
 * "Baja" → 1, "Media" → 2, "Media-alta" → 3, "Alta" → 4.
 * Case-insensitive, tolerante a tildes.
 * Devuelve { label: "", orden: 0 } si no matchea.
 */
export function parseDificultad(input: unknown): { label: Dificultad | ""; orden: number } {
  if (input == null) return { label: "", orden: 0 };
  const norm = String(input)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim();

  switch (norm) {
    case "baja": return { label: "Baja", orden: 1 };
    case "media": return { label: "Media", orden: 2 };
    case "media-alta":
    case "media alta": return { label: "Media-alta", orden: 3 };
    case "alta": return { label: "Alta", orden: 4 };
    default: return { label: "", orden: 0 };
  }
}

/**
 * Costo → orden 1-4.
 * "Bajo" → 1, "Medio" → 2, "Medio/Alto" → 3, "Alto" → 4.
 */
export function parseCosto(input: unknown): { label: Costo | ""; orden: number } {
  if (input == null) return { label: "", orden: 0 };
  const norm = String(input)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim();

  switch (norm) {
    case "bajo": return { label: "Bajo", orden: 1 };
    case "medio": return { label: "Medio", orden: 2 };
    case "medio/alto":
    case "medio-alto":
    case "medio alto": return { label: "Medio/Alto", orden: 3 };
    case "alto": return { label: "Alto", orden: 4 };
    default: return { label: "", orden: 0 };
  }
}

/**
 * "Sí" / "No" / "Adaptable" del sheet → boolean | null.
 * - "Sí", "si", "sí", "yes", "true", "1" → true
 * - "No", "no", "false", "0" → false
 * - "Adaptable", "" o cualquier otra cosa → null
 */
export function parseSiNo(input: unknown): boolean | null {
  if (input == null) return null;
  const norm = String(input)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (["si", "sí", "yes", "true", "1"].includes(norm)) return true;
  if (["no", "false", "0"].includes(norm)) return false;
  return null;
}
```

**Commit:** `Stage 2.1: add parsers (number, time, dificultad, costo, siNo)`

### Tarea 15 — Tests unitarios

Crear dos archivos de test cubriendo happy paths y edge cases.

**`src/lib/canonical.test.ts`** (mínimo 12 tests):

- `normalizeText`:
  - "Cebolla" → "cebolla"
  - "María" → "maria"
  - "ÑOQUI" → "noqui"
  - "  con   espacios  " → "con espacios"
  - "" → ""
  - null / undefined → ""
  - 123 (number) → "123"

- `canonicalizarIngrediente`:
  - "Cebollas" → "cebolla"
  - "ajo" → "ajo"
  - "DIENTES DE AJO" → "ajo"
  - "Leche de coco" → "leche de coco"
  - "Algo no listado" → "algo no listado" (passthrough)
  - "" → ""

**`src/lib/parsers.test.ts`** (mínimo 25 tests):

- `parseNumber`:
  - "1.5" → value 1.5
  - "1,5" → value 1.5
  - "1 a 2" → { value: 1, min: 1, max: 2 }
  - "1-2" → { value: 1, min: 1, max: 2 }
  - "3" → value 3
  - "" → null
  - null → null
  - "abc" → null
  - "1,5 a 2,5" → { value: 1.5, min: 1.5, max: 2.5 }
  - "3 unidades" → value 3 (extrae el número del inicio)

- `parseTime`:
  - "35 min" → 35
  - "1 h" → 60
  - "1 h 30 min" → 90
  - "1,5 h" → 90
  - "10 a 15 min" → { value: 10, min: 10, max: 15 }
  - "2 hs" → 120
  - "30 a 40 min" → { value: 30, min: 30, max: 40 }
  - "" → null
  - "no especificado" → null

- `parseDificultad`:
  - "Baja" → { label: "Baja", orden: 1 }
  - "media" → { label: "Media", orden: 2 }
  - "Media-alta" → { label: "Media-alta", orden: 3 }
  - "media alta" (sin guion) → { label: "Media-alta", orden: 3 }
  - "ALTA" → { label: "Alta", orden: 4 }
  - "" → { label: "", orden: 0 }
  - "muy alta" → { label: "", orden: 0 }

- `parseCosto`:
  - "Bajo" → orden 1
  - "Medio" → orden 2
  - "Medio/Alto" → orden 3
  - "Alto" → orden 4

- `parseSiNo`:
  - "Sí" → true
  - "no" → false
  - "Adaptable" → null
  - "" → null
  - null → null

**Commit:** `Stage 2.1: add unit tests for canonical and parsers`

### Tarea 16 — Build + tests verdes

Correr:

```bash
npm run test:run
npm run build
```

Ambos comandos deben terminar sin errores. Si el build tira errores de TypeScript no usados (porque exportamos cosas que ningún componente consume todavía), agregar tipo `tsconfig.app.json` con `"noUnusedExports": false` **NO** — los exports están OK aunque no se consuman. Si aparece `'X' is declared but never read` en un archivo de tests, revisar el test concretamente.

Si tuviste que hacer ajustes durante esta verificación, commit final: `Stage 2.1: pass build and tests`.

### Tarea 17 — Push (sin deploy)

```bash
git push
```

**NO hacer `firebase deploy`**. Esta etapa no cambia el runtime visible. El próximo deploy es al final de E2.3 (cuando se publiquen las Rules) o E2.4 (cuando se carguen los seeds).

## Criterios de aceptación

- `npm run test:run` pasa todos los tests (mínimo 37 entre los dos archivos).
- `npm run build` sin errores de TypeScript.
- `src/types/models.ts` exporta: `MiembroId`, `Rol`, `EstadoPlan`, `TipoPlan`, `TipoSeleccion`, `TipoItem`, `Proteina`, `Escenario`, `ClimaPlato`, `PensadaPara`, `Dificultad`, `Costo`, `AptoNocheDeADos`, `Ocasion`, `Resultado`, `TipoComponente`, `EstadoMenu`, `RangoNumerico`, `Ingrediente`, `Paso`, `Receta`, `Menu`, `ComponenteMenu`, `MenuDerived`, `Plan`, `DatosCocinero`, `Historial`, `Aporte`, `ItemCompra`, `ListaCompras`, `FamiliaConfig`, `DiccionariosConfig`, `UserDoc`, `MiembroConfig`, `FamiliaConfigMiembro`.
- Las constantes arrays están exportadas con `as const` y los types literales se derivan de ellas (verificable: `typeof MIEMBRO_IDS[number]` debe ser asignable a `MiembroId`).
- `src/lib/canonical.ts` exporta: `normalizeText`, `canonicalizarIngrediente`, `SINONIMOS_INGREDIENTES`.
- `src/lib/parsers.ts` exporta: `parseNumber`, `parseTime`, `parseDificultad`, `parseCosto`, `parseSiNo`.
- Los 5 parsers devuelven `null` (o `{ label: "", orden: 0 }` los dos categóricos) ante input inválido — **nunca tiran excepción**.
- Commits granulares con prefijo `Stage 2.1:` (mínimo 13 commits a lo largo del prompt).
- `git push` exitoso al final.
- **NO** hubo `firebase deploy`.

## Qué NO tocar

- **No tocar** `src/auth/`, `src/components/`, `src/screens/`, `src/AppShell.tsx` — esos usarán los nuevos types en E2.2+, pero esta etapa no los modifica.
- **No tocar** `firestore.rules` ni `firestore.indexes.json` — eso es E2.3 y E2.6.
- **No crear** módulos en `src/data/` — eso es E2.2 (data layer).
- **No importar `firebase` ni `firebase/firestore`** desde `src/lib/canonical.ts` ni `src/lib/parsers.ts` — son helpers puros, sin dependencias de runtime.
- **No deployar** — esta etapa no cambia nada visible al usuario.
- **No mover archivos existentes** de `src/types/` salvo que detectes duplicación clara (en cuyo caso, mostrame el diff antes y decidimos juntos).
- **No agregar** ESLint rules nuevas ni cambiar la config de TS — si algo no compila por reglas existentes, ajustar el código, no la config.

## Notas finales

- Los parsers son **deliberadamente permisivos** porque los seeds reales tienen mucha variación ("Medio", "1,2 a 1,5", "10 a 15 min"). Mejor que pasen todos con `null` cuando no entienden, que rechacen y bloqueen el seeding de E2.4.
- La tabla `SINONIMOS_INGREDIENTES` está pensada como **conservadora**: mejor que dos ingredientes queden separados (peor visual, pero correcto) a que se fusionen mal (resultado incorrecto en la lista de compras). Se va a extender cuando aparezcan casos reales en E2.4 al cargar los seeds.
- Si Code detecta inconsistencias entre lo que dice este prompt y `docs/MAPEO_FIRESTORE.md`, **parar y avisar** — el MAPEO es la fuente de verdad, pero si hay ambigüedad real, mejor resolverla juntos antes de hardcodearla.
