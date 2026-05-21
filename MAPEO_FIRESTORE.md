# MAPEO_FIRESTORE — Comida Familiar

> Documento maestro de migración de Apps Script + Google Sheets a Firebase + React + Vite.
>
> Fuente de verdad para todo el trabajo de Etapas 2–7. Cualquier discrepancia entre este documento y el código se resuelve actualizando el código o este documento (no ambos en deriva).
>
> **Versión**: 1.2 (modelo M: menús referencian recetas vivas, sin tipoItem "Componente")
> **Fecha**: 2026-05-21
> **Autor**: Juan Pablo Cofano + asistente
> **Apps Script fuente**: D.1 cerrado (ver `readme_comida_semanal_app_script.md`)

---

## 0. Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Modelo de datos](#2-modelo-de-datos)
3. [Invariantes y validaciones de negocio](#3-invariantes-y-validaciones-de-negocio)
4. [Security Rules](#4-security-rules)
5. [Mapping pantalla → queries](#5-mapping-pantalla--queries)
6. [Mejoras sobre el sistema actual](#6-mejoras-sobre-el-sistema-actual)
7. [Plan de prompts para Claude Code](#7-plan-de-prompts-para-claude-code)
8. [Claude Design: cuándo y qué pedirle](#8-claude-design-cuándo-y-qué-pedirle)
9. [Apéndice: futuro](#9-apéndice-futuro)

---

## 1. Resumen ejecutivo

### 1.1 Qué cambia respecto al sistema actual

| Aspecto | Apps Script (origen) | Firebase (destino) |
|---|---|---|
| Backend | Apps Script + Google Sheets | Firestore (NoSQL) + Auth + Rules |
| Frontend | HTML/JS vanilla servido por `doGet` | React + Vite + TypeScript + Router |
| Auth | URL param `?miembro=X` (sin login) | Firebase Auth Google Sign-in + whitelist |
| Estado server | Filas de hoja | Documentos Firestore |
| Voto multi-miembro | 4 columnas + cierre por trigger imperativo | Map embebido + `runTransaction` atómica |
| Lista de compras | Filas planas por receta | Subcollection con items sumables |
| Idempotencia | Frágil (race en triggers) | Transacciones garantizadas |
| Idioma código | Inglés en helpers, español en dominio | Inglés en infraestructura, español en dominio |

### 1.2 Qué se mantiene idéntico

- Modelo familiar (4 miembros con IDs `juanpablo`, `maria`, `sofia`, `federico`).
- Reglas de dieta (keto padres, sin lácteos, sin fritos, hidratos opcionales para chicos).
- Ciclo unidireccional de estados de plan (`Elegida → Compra pendiente → Compra lista → Cocinada → Evaluada`).
- Tres tipos de plan (`Especial`, `Especial extra`, `En proceso`) con cascada de extras.
- Escala 1-10 con 5+5 botones y umbrales de resultado (≥9 Excelente, ≥7.5 Muy bueno, ≥6 Bueno, ≥4 Regular, <4 Malísimo).
- IDs human-readable (`REC-XXXX`, `PLAN-...`, `LST-SEM-yyyyMMdd-HHmmss`, `MENU-XXXX`).
- 10 pantallas principales del front (home, recetas, detalle, importar, menus, menuDetalle, compras, cocinar, resultado, historial) + dashboard miembro + voto miembro.
- Importador TXT (todas las validaciones y reglas anti-duplicado).
- Diccionarios editables (`Tipos de ítem`, `Proteínas`, `Escenarios`, `Clima del plato`, `Pensada para`, `Tipos de plan`, `Miembros`, `Ocasiones`).

### 1.2.bis Cambios estructurales en v1.2 (modelo de menús)

Después de revisar el modelo de Apps Script, se detectó duplicación entre `/recetas` y `/menus` (campos paralelos: tiempos, dificultad, restricciones, etc.). El menú actual es un híbrido raro: tabla propia con campos de receta + un array de "componentes" que ya apuntan a recetas reales marcadas con `tipoItem: "Componente"`.

**Decisiones tomadas para v1.2:**

1. **Modelo M — menús como composiciones vivas**: `/menus/{idMenu}` se reduce a metadata + array de referencias a recetas. **Los tiempos, dificultad, restricciones se derivan al vuelo desde las recetas componentes**. Si una receta componente cambia (ej. JP le agrega 5 min al ajillo), el menú "ve" el cambio en su próxima query. Sin snapshots.

2. **`tipoItem: "Componente"` eliminado**: las recetas marcadas hoy como `Componente` se migran a su tipo real según el rol que cumplen en el menú donde participan (`Entrada`, `Receta principal`, `Postre`, etc.). Pasan a ser recetas normales, visibles en la Biblioteca, elegibles según las reglas del §3.

3. **`elegibleSemana` eliminado**: campo redundante con el modelo nuevo. Todas las recetas son potencialmente elegibles; la restricción queda solo por `tipoItem` (ver §3.3).

4. **Solo `tipoItem === "Receta principal"` puede ser Especial de la semana** (ver §3.3). El resto puede sumarse como Extra o En proceso.

5. **Importador de menús**: incluido en scope desde Etapa 2 (no Etapa 5). El TXT del menú referencia componentes por **nombre o por idReceta** — el importador resuelve. Si el componente no existe, el menú no se importa y avisa qué falta.

6. **Migración de seeds**: el script de seeding del Etapa 2 (`PROMPT_E2.4`) aplica el mapeo automático componente → tipo real basado en el rol del componente en el menú. Si alguna receta se "lee raro" como receta independiente, se ajusta manualmente más tarde (no bloqueante).


### 1.3 Volumen de seeds a migrar

| Entidad | Cantidad | Origen |
|---|---|---|
| Recetas | 78 | `CS_SEED_RECETAS_COMPLETAS` |
| Ingredientes (filas) | ~1,180 | `CS_SEED_INGREDIENTES_COMPLETOS` |
| Pasos (filas) | ~800 | `CS_SEED_PASOS_COMPLETOS` |
| Menús | 5 | `CS_SEED_MENUS_COMPLETOS` |
| Menu items (filas) | ~21 | `CS_SEED_MENU_ITEMS_COMPLETOS` |

Los seeds están como **arrays de tuples** (orden posicional). El script de seeding los convierte a objetos siguiendo el orden de `CS_HEADERS` y los sube a Firestore con el Admin SDK.

---

## 2. Modelo de datos

### 2.1 Vista general de colecciones

```
/recetas/{idReceta}                      doc (78 docs iniciales)
/menus/{idMenu}                          doc (5 docs iniciales)
/planes/{idPlan}                         doc (vacío al inicio)
/compras/{idLista}                       doc (vacío al inicio)
  /items/{itemId}                          subcollection
/historial/{idHist}                      doc (vacío al inicio)
/config/diccionarios                     doc único
/config/familia                          doc único (whitelist + miembros)
/users/{uid}                             doc (1 por miembro autenticado)
```

**Decisiones de diseño aplicadas:**

- **IDs human-readable**: mantenidos para debugging y continuidad. Firestore acepta cualquier string como doc ID.
- **camelCase español**: continuidad con `CS_HEADER_KEYS`. La UI es en castellano.
- **Ingredientes y pasos embebidos** dentro del doc de receta (1 query en lugar de 3 para mostrar detalle). Mismo criterio para `menus.items`.
- **Items de compras como subcollection**: necesitan updates atómicos por item (toggle "Ya tengo") sin pisar la lista completa.
- **Historial como colección plana**: el flujo principal es "últimas 30 globales" — un índice por `fechaRealizada desc` resuelve también el caso "historial de receta X" vía `where('idReceta', '==', X)`.
- **Diccionarios como doc único**: una sola lectura al login carga todos los enums.

---

### 2.2 `/recetas/{idReceta}` — Receta completa

**Shape:**

```typescript
{
  // Identidad
  idReceta: "REC-0001",            // string, doc ID (REC-XXXX, 4 dígitos zero-padded)
  nombre: "Bondiola braseada al Malbec",
  nombreCanonico: "bondiola braseada al malbec",   // lowercase, sin tildes, para anti-dup

  // Clasificación
  tipoItem: "Receta principal",    // enum del diccionario "Tipos de ítem"
  proteinaPrincipal: "Cerdo",      // enum del diccionario "Proteínas"
  estilo: "Argentino gourmet",     // texto libre
  tecnicaPrincipal: "Braseado",    // texto libre
  escenarioUso: "Cena Especial",   // enum del diccionario "Escenarios"
  climaDelPlato: "Potente",        // enum "Clima del plato"
  pensadaPara: "Especial",         // enum "Pensada para" — auto-derivable

  // Apto / restricciones
  sinLacteos: true,                // boolean (en sheet era "Sí"/"No")
  hidratos: false,                 // boolean — true = lleva hidratos integrados
  aptoNocheDeADos: "Adaptable",    // enum: "Sí" | "No" | "Adaptable"
  paraJuanPablo: true,             // boolean
  paraFamilia: true,               // boolean
  // NOTA v1.2: el campo `elegibleSemana` (booleano) fue eliminado.
  // Toda receta es elegible; la única restricción para Especial es
  // tipoItem === "Receta principal" (ver §3.3).

  // Tiempos y dificultad
  tiempoActivoLabel: "35 min",     // string display original
  tiempoActivoMin: 35,             // number derivado, minutos
  tiempoTotalLabel: "3 h 30 min",
  tiempoTotalMin: 210,             // number derivado, minutos
  dificultad: "Media-alta",        // enum: "Baja" | "Media" | "Media-alta" | "Alta"
  dificultadOrden: 3,              // number derivado: Baja=1, Media=2, Media-alta=3, Alta=4

  // Porciones y costo
  porcionesLabel: "4 a 6",         // string display
  porcionesMin: 4,                 // number derivado
  porcionesMax: 6,                 // number derivado (= porcionesMin si es número fijo)
  costoEstimado: "Medio",          // enum: "Bajo" | "Medio" | "Medio/Alto" | "Alto"
  costoOrden: 2,                   // number derivado: Bajo=1, Medio=2, Medio/Alto=3, Alto=4

  // Acompañamientos y notas
  hidratoOpcional: "Papas rústicas o batatas para quienes quieran",   // texto libre
  acompPadres: "Ensalada de hojas verdes con oliva extra",
  porQueEspecial: "Plato principal potente, rendidor...",
  riesgos: "No apurar la cocción. La salsa tiene que reducirse...",
  paraJuanPabloNota: "",           // texto libre con detalle
  paraFamiliaNota: "",             // texto libre con detalle
  notasNocheDeADos: "Funciona para noche de a dos si se sirve en porciones más chicas...",
  notas: "Ideal para empezar el proyecto de comidas especiales.",
  temporadaIdeal: "Otoño / invierno",   // texto libre

  // Imagen y fuente
  imagenUrl: "",                   // string (URL)
  fuente: "Semilla",               // "Semilla" | "ChatGPT" | "Manual" | otro
  urlFuente: "",                   // string (URL)

  // Metadata de creación / evaluación
  fechaImportacion: Timestamp,     // serverTimestamp() al crear
  ultimaEvaluacion: Timestamp | null,
  ultimoPuntaje: number | null,
  vecesCocinada: 0,

  // Ingredientes embebidos (array)
  ingredientes: [
    {
      ingrediente: "Bondiola de cerdo entera",
      ingredienteCanonico: "bondiola de cerdo entera",   // clave de matching para sumar en compras
      seccion: "Principal",          // enum CS_SECTION_ORDER
      cantidadLabel: "1,2 a 1,5",    // string display original
      cantidadMin: 1.2,              // number derivado
      cantidadMax: 1.5,              // number derivado
      unidad: "kg",                  // enum normalizado (ver UNIDADES_CANONICAS abajo)
      categoria: "Carne",            // texto libre
      opcional: false,               // boolean
      notas: "Mejor si tiene algo de grasa, no extremadamente magra"
    },
    // ...
  ],

  // Pasos embebidos (array, ordenado por `orden`)
  pasos: [
    {
      orden: 1,                      // number
      momento: "Mise en place",      // string (etapa de cocción)
      titulo: "Mise en place",       // string corto
      detalle: "Secar bien la bondiola con papel, salpimentar...",
      tiempoEstimadoLabel: "10 min",
      tiempoEstimadoMin: 10,         // number derivado
      puntoClave: "La carne seca se sella mejor.",
      errorComun: "Sellar carne húmeda y hervirla en vez de dorarla.",
      notas: ""
    },
    // ...
  ]
}
```

**Notas:**

- `nombreCanonico` se computa al crear/actualizar; es la clave anti-duplicado del importador.
- Los pares `xxxLabel` / `xxxMin/Max` permiten **mostrar el string original** ("1,2 a 1,5 kg") y **filtrar/ordenar/sumar** con los números.
- `cantidadMin === cantidadMax` cuando es valor fijo (no rango).
- `tiempoActivoMin === null` si el parsing falla (el campo display sigue mostrándose).
- **`ingredientes[].ingredienteCanonico`** es la innovación crítica: permite sumar "Cebolla" + "cebollas" + "Cebolla blanca" en la lista de compras si tienen la misma unidad. Reglas de canonicalización en §6.1.

---

### 2.3 `/menus/{idMenu}` — Menú como composición de recetas (Modelo M)

**Cambio en v1.2**: el menú ya NO duplica campos de receta (tiempos, dificultad, restricciones, etc.). Es un objeto liviano que **referencia recetas existentes** en `/recetas`. Los campos derivados (tiempo total, dificultad agregada, restricciones de dieta) se calculan al vuelo en el cliente leyendo las recetas componentes.

**Shape:**

```typescript
{
  idMenu: "MENU-0001",
  nombreMenu: "Español de mar",
  nombreCanonico: "espanol de mar",            // lowercase, sin tildes — clave anti-dup

  estado: "Para probar",                       // "Para probar" | "Probado" | "Archivado"
  estilo: "Español / mediterráneo",            // texto libre
  escenarioUso: "Noche de a dos",              // del diccionario "Escenarios"
  climaDelMenu: "Restaurante",                 // texto libre (NO se valida contra diccionario)
  idealPara: "Sábado especial / invitados",
  descripcion: "Menú de mar con entrada de langostinos, zarzuela como principal...",

  // Adaptaciones específicas del menú (overrides sobre las recetas):
  paraJuanPablo: "Zarzuela sola, sin arroz ni pan. Postre sin crema.",
  paraFamilia: "Arroz blanco o pan para acompañar.",
  riesgos: "Coordinar tiempos de mariscos para que no se pasen.",
  notas: "Muy especial, ideal para comida evento.",
  notasOcasion: "Menú de mar para una cena especial; mantener arroz o pan aparte.",
  aptoNocheDeADos: "Sí",                       // "Sí" | "No" | "Adaptable"
  hidratoOpcional: "Arroz blanco o pan aparte",

  // Composición — array de referencias a recetas:
  componentes: [
    {
      orden: 1,                                // number, único dentro del menú
      tipo: "Entrada",                         // "Entrada" | "Principal" | "Acompañamiento" | "Postre"
      idReceta: "REC-0101",                    // referencia a /recetas/REC-0101
      obligatorio: true,                       // boolean
      notas: "Sin manteca, solo aceite de oliva."   // override opcional para este menú
    },
    {
      orden: 2,
      tipo: "Principal",
      idReceta: "REC-0102",
      obligatorio: true,
      notas: ""
    },
    // ...
  ],

  // Metadata:
  fechaCreacion: Timestamp,
  ultimaModificacion: Timestamp
}
```

**Lo que NO está en el shape (y por qué):**

| Campo eliminado | Por qué |
|---|---|
| `dificultad`, `dificultadOrden` | Se deriva: máximo de los componentes obligatorios. |
| `tiempoActivoEstimadoMin/Label` | Se deriva: suma de tiempos activos de los componentes. |
| `tiempoTotalEstimadoMin/Label` | Se deriva: ver §3.8 (regla de cálculo). |
| `sinLacteos` | Se deriva: AND lógico de los componentes (todos sin lácteos → menú sin lácteos). |
| `hidratos` | Se deriva: OR lógico (alguno con hidratos → menú con hidratos). |
| `recetaComponente` (nombre embebido) | Se resuelve al leer la receta. |
| `paraJuanPablo: true/false` (boolean del componente) | Se deriva de la receta. El campo `paraJuanPablo: string` del menú es solo nota de adaptación. |
| `hidrato: "Sí" | "No" | "Bajo" | "Adaptado"` del componente | Se deriva de la receta. |

**Campos derivados — implementación:**

Helper en `src/data/menus.ts` (a crear en Etapa 2):

```typescript
async function deriveMenuMetadata(menu: Menu): Promise<MenuDerived> {
  const recetas = await Promise.all(
    menu.componentes
      .filter(c => c.obligatorio)
      .map(c => getDoc(doc(db, "recetas", c.idReceta)))
  );
  const datos = recetas.map(r => r.data() as Receta);

  return {
    tiempoActivoMin: datos.reduce((sum, r) => sum + (r.tiempoActivoMin ?? 0), 0),
    tiempoTotalMin: calcTiempoTotalMenu(datos),   // ver §3.8
    dificultadOrden: Math.max(...datos.map(r => r.dificultadOrden ?? 1)),
    sinLacteos: datos.every(r => r.sinLacteos),
    hidratos: datos.some(r => r.hidratos),
    porcionesMin: Math.min(...datos.map(r => r.porcionesMin ?? 1)),
    porcionesMax: Math.min(...datos.map(r => r.porcionesMax ?? 1)),
    costoOrden: Math.max(...datos.map(r => r.costoOrden ?? 1))
  };
}
```

**Cache:** los derivados se calculan al renderizar el detalle del menú. Si el menú aparece en una lista (Biblioteca), se pueden cachear en memoria por la sesión.


---

### 2.4 `/planes/{idPlan}` — Plan semanal

**Shape (18 campos top-level, votos y comentarios como maps):**

```typescript
{
  idPlan: "PLAN-20260518-1716240000000",   // PLAN-yyyyMMdd-timestamp
  semanaInicio: "2026-05-18",              // ISO date (lunes de la semana)
  semanaFin: "2026-05-24",                 // ISO date (domingo)
  tipoSeleccion: "receta",                 // "receta" | "menu"
  tipoPlan: "Especial",                    // "Especial" | "Especial extra" | "En proceso"
  idSeleccion: "REC-0001",                 // id de la receta o menú elegido
  nombreSeleccion: "Bondiola braseada al Malbec",
  recetaPrincipal: "Bondiola braseada al Malbec",   // para menús, el componente Principal

  estado: "Elegida",                       // ver §3.1 ciclo de estados
  fechaEleccion: Timestamp,                // serverTimestamp() al crear
  fechaPrevistaComida: "2026-05-22" | null,
  cantidadPersonas: 4,

  listaComprasId: "LST-SEM-20260518-180000" | null,
  notas: "",
  origen: "extra:PLAN-20260518-1716240000000" | null,   // para Especial extra: ID del padre

  asignaciones: ["juanpablo"],             // array de miembro IDs (default ["juanpablo"])

  // Votos como map (en lugar de 4 columnas):
  votos: {
    juanpablo: 8 | null,
    maria: 9 | null,
    sofia: 7 | null,
    federico: 10 | null
  },

  // Comentarios como map (en lugar de 4 columnas):
  comentariosPlan: {
    juanpablo: "" | "...",
    maria: "" | "...",
    sofia: "" | "...",
    federico: "" | "..."
  },

  // Datos exclusivos del cocinero (solo JP llena):
  datosCocinero: {
    ocasion: "Cena familiar",              // del diccionario "Ocasiones"
    repetir: "Sí",                         // "Sí" | "No" | ""
    costoReal: "",                         // texto libre
    dificultadReal: "",                    // ídem
    queSalioBien: "",
    queCambiaria: "",
    notasFamiliares: ""
  } | null
}
```

**Cuándo nace cada campo:**

| Campo | Cuándo se setea | Quién |
|---|---|---|
| `idPlan`, `semanaInicio`, `semanaFin`, `tipoSeleccion`, `tipoPlan`, `idSeleccion`, `nombreSeleccion`, `recetaPrincipal`, `fechaEleccion`, `cantidadPersonas`, `asignaciones` | Al crear (elegirRecetaSemana/elegirMenuSemana) | JP o miembro |
| `estado` | Empieza en `"Elegida"`, transiciona | Eventos del sistema |
| `listaComprasId` | Cuando se sincroniza la lista | `sincronizarListaSemana` |
| `origen` | Solo en Especial extra: `"extra:<idPadre>"` | `agregarExtraAEspecial` |
| `votos`, `comentariosPlan` | Cuando algún miembro vota | `guardarVoto` |
| `datosCocinero` | Solo JP, al evaluar | `guardarVoto` (si miembro === juanpablo) |

---

### 2.5 `/compras/{idLista}` + `/compras/{idLista}/items/{itemId}` — Lista de compras

**Doc raíz `compras/{idLista}`:**

```typescript
{
  idLista: "LST-SEM-20260518-180000",
  fechaGeneracion: Timestamp,
  semanaInicio: "2026-05-18",
  // Resumen calculado en cada update (denormalizado para mostrar contador rápido):
  resumen: {
    totalItems: 47,
    totalYaTengo: 12,
    totalPendientes: 35
  }
}
```

**Subcollection `compras/{idLista}/items/{itemId}`:**

```typescript
{
  itemId: "auto-id",                       // doc ID (auto-generado por Firestore)
  ingrediente: "Cebolla",
  ingredienteCanonico: "cebolla",          // clave de agrupación
  cantidadTotal: 3,                        // suma cuando se pueden sumar
  cantidadLabel: "3 unidades",             // string display
  unidad: "unidades",                      // enum UNIDADES_CANONICAS
  categoria: "Verdura",                    // heredada del primer ingrediente que la trajo
  opcional: false,                         // true si TODOS los aportes son opcionales

  yaTengo: false,                          // toggle del usuario

  // Trazabilidad — qué recetas/planes contribuyeron a este item:
  aportes: [
    {
      idPlan: "PLAN-20260518-...",
      idReceta: "REC-0001",
      nombreReceta: "Bondiola braseada al Malbec",
      cantidad: 2,
      unidad: "unidades",
      tipoOrigen: "receta"                 // "receta" | "menu"
    },
    {
      idPlan: "PLAN-20260518-...",
      idReceta: "REC-0201",
      nombreReceta: "Berenjenas grilladas con criolla y oliva",
      cantidad: 1,
      unidad: "unidades",
      tipoOrigen: "receta"
    }
  ],

  // Notas combinadas (las de los ingredientes que se sumaron):
  notas: "Cortadas grandes | Para la criolla"
}
```

**Cómo funciona la sumabilidad:**

1. Al sincronizar, para cada plan activo, se levantan sus ingredientes.
2. Cada ingrediente se canonicaliza: `ingredienteCanonico = normalize(ingrediente)`.
3. Si ya existe un item con misma `(ingredienteCanonico, unidad)` en la lista, **se acumula** en `cantidadTotal` y se agrega un nuevo aporte a `aportes`.
4. Si no existe o tiene unidad distinta, se crea un nuevo item.
5. `cantidadLabel` se regenera: `${cantidadTotal} ${unidad}`.

**Vista del usuario:**

- Vista resumida (default): un solo renglón "Cebolla — 3 unidades" con badge "+2 recetas".
- Vista expandida (al tap): "Cebolla — 3 unidades:" + sublistado de aportes ("• 2 para Bondiola" / "• 1 para Berenjenas").

Esto es **una mejora real sobre Apps Script** (ver §6.1).

---

### 2.6 `/historial/{idHist}` — Historial de evaluaciones

**Shape:**

```typescript
{
  idHist: "auto-id",                       // doc ID (auto-generado)
  fechaRealizada: "2026-05-22",            // ISO date
  fechaRealizadaTimestamp: Timestamp,      // serverTimestamp para indexar desc

  // Referencia:
  idPlan: "PLAN-20260518-...",
  idReceta: "REC-0001" | "",               // vacío si tipoSeleccion === "menu"
  idMenu: "" | "MENU-0001",                // vacío si tipoSeleccion === "receta"
  receta: "Bondiola braseada al Malbec",   // nombre snapshot (para historial robusto)
  tipoSeleccion: "receta",
  idSeleccion: "REC-0001",
  nombreSeleccion: "Bondiola braseada al Malbec",
  semanaInicio: "2026-05-18",

  // Ocasión:
  ocasion: "Cena familiar",

  // Votos individuales (snapshot del plan al cerrar evaluación):
  calificaciones: {
    juanpablo: 8,
    maria: 9,
    sofia: 7,
    federico: 10
  },
  comentarios: {
    juanpablo: "...",
    maria: "...",
    sofia: "...",
    federico: "..."
  },

  // Cálculos automáticos:
  promedio: 8.5,                           // (8+9+7+10)/4, redondeado a 1 decimal
  resultado: "Muy bueno",                  // derivado de promedio (ver §3.4)

  // Datos del cocinero:
  repetir: "Sí",
  costoRealAprox: "",
  dificultadReal: "",
  queSalioBien: "",
  queCambiaria: "",
  notasFamiliares: ""
}
```

**Por qué guardamos snapshots:**
- `receta` y `nombreSeleccion` se duplican porque si se borra la receta en el futuro, el historial sigue siendo legible.

---

### 2.7 `/config/diccionarios` — Doc único de valores cerrados

**Shape:**

```typescript
{
  // Enums simples (arrays de strings):
  // NOTA v1.2: "Componente" eliminado del enum. Las recetas que eran componentes
  // se migraron a su tipo real (Entrada, Receta principal, Postre, etc).
  tiposItem: ["Receta principal", "Entrada", "Guarnición", "Postre",
              "Panificado", "Snack", "Desayuno", "Conserva", "Hidrato opcional"],
  proteinas: ["Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado",
              "Mariscos", "Huevos", "Legumbres", "Mixta", "Vegetariana"],
  escenarios: ["Noche de a dos", "Cocina rápida", "Cena Especial", "Celebración"],
  climaPlato: ["Liviano", "Medio", "Potente"],
  pensadaPara: ["Especial", "Semana", "Cualquiera"],
  tiposPlan: ["Especial", "Especial extra", "En proceso"],
  ocasiones: ["Cena familiar", "Con invitados", "Cumpleaños", "Celebración", "Otra"],
  aptoNocheDeADos: ["Sí", "No", "Adaptable"],
  dificultades: ["Baja", "Media", "Media-alta", "Alta"],
  costos: ["Bajo", "Medio", "Medio/Alto", "Alto"],

  // Miembros (objetos con metadata):
  miembros: [
    { id: "juanpablo", nombre: "Juan Pablo", rol: "padre" },
    { id: "maria",     nombre: "María",      rol: "madre" },
    { id: "sofia",     nombre: "Sofía",      rol: "hija"  },
    { id: "federico",  nombre: "Federico",   rol: "hijo"  }
  ],

  // Estados de plan:
  estadosPlan: {
    activos: ["Elegida", "Compra pendiente", "Compra lista", "Cocinada"],
    finales: ["Evaluada"]
  },

  // Secciones de ingredientes (orden de display):
  seccionesIngredientes: ["Principal", "Base de sabor", "Líquido de cocción",
                          "Condimentos", "Cocción", "Guarnición baja en hidratos", "Opcional familia"],

  // Unidades canónicas (claves para sumabilidad):
  unidadesCanonicas: ["g", "kg", "ml", "l", "unidad", "unidades",
                      "cda", "cdta", "taza", "pizca", "gusto"],

  // Versión del diccionario (para invalidación de cache cliente):
  version: 1,
  ultimaActualizacion: Timestamp
}
```

**Cuándo se lee:** una sola vez al login (cacheable en memoria del cliente durante la sesión).

**Cuándo se escribe:** solo desde la consola Firebase manual, o vía un script admin. No editable desde la UI inicialmente.

---

### 2.8 `/config/familia` — Miembros, mails y aliases

**Shape:**

```typescript
{
  // Miembros de la familia con sus mails autorizados.
  // Cada miembro puede tener N mails (aliases) que mapean al mismo memberId.
  // Para agregar/quitar aliases: editar el array desde la consola Firebase.
  // No requiere redeploy.
  miembros: {
    juanpablo: {
      nombre: "Juan Pablo",
      rol: "padre",
      mails: ["jpcofano@gmail.com"]
    },
    maria: {
      nombre: "María",
      rol: "madre",
      mails: ["marialascano@gmail.com", "maria.lascano@accenture.com"]
    },
    sofia: {
      nombre: "Sofía",
      rol: "hija",
      mails: ["sofiacofano@gmail.com"]
    },
    federico: {
      nombre: "Federico",
      rol: "hijo",
      mails: ["fedecofano1@gmail.com"]
    }
  },

  // Quién es el "owner" (puede editar /config/*):
  owner: "juanpablo",

  // Configuración global:
  timezone: "America/Argentina/Buenos_Aires",
  semanaArrancaEn: "lunes"
}
```

**Resolución de identidad al login:**

1. Firebase Auth devuelve `email` del usuario logueado con Google.
2. El cliente recorre `miembros.{X}.mails` buscando un match exacto (case-insensitive).
3. Si encuentra match → resuelve `memberId = X` (la key del miembro).
4. Si no encuentra match → login rechazado.

**Cómo agregar un alias sin tocar código:**

Desde consola Firebase → Firestore → `/config/familia` → expandir `miembros.juanpablo.mails` → "Add item" → tipear el nuevo mail → Save. Al próximo login con ese mail, el sistema lo reconoce como JP.

**Cómo agregar un miembro nuevo (futuro):**

Mismo lugar, "Add field" a `miembros` con un nuevo memberId (ej: `abuela`) y su objeto `{nombre, rol, mails}`. Útil si más adelante se quiere sumar a alguien fuera del núcleo familiar.

---

### 2.9 `/users/{uid}` — Usuario autenticado

**Shape (1 doc por sesión-usuario):**

```typescript
{
  uid: "abc123...",                        // Firebase Auth UID
  email: "maria.lascano@accenture.com",    // el mail con que se logueó (puede variar)
  memberId: "maria",                       // resuelto desde whitelist (estable)
  nombre: "María",                         // snapshot al momento del primer login
  rol: "madre",
  ultimoLogin: Timestamp,
  fechaPrimerLogin: Timestamp
}
```

**Cuándo se crea:** al primer login de cada miembro. El cliente recorre `/config/familia.miembros[*].mails`, encuentra el match, y crea el doc con el `memberId` resuelto. Si el mail no está en ninguna lista, el login es rechazado (Security Rule).

**Cuándo se actualiza:** en cada login (refresca `ultimoLogin` y, si cambió el mail usado, actualiza `email`). El `memberId` y `nombre` se mantienen estables salvo que el owner los cambie.

**Múltiples mails, mismo miembro:** si María se loguea hoy con Gmail y mañana con Accenture, Firebase Auth le da **dos UIDs distintos** → se crean dos docs en `/users/{uid}` distintos, pero ambos con `memberId: "maria"`. En consecuencia, el sistema la trata como la misma persona en planes, votos, historial — porque toda la lógica de negocio usa `memberId`, no `uid`.



---

## 3. Invariantes y validaciones de negocio

### 3.1 Ciclo de estados del plan

```
[CREACIÓN]
   │
   ▼
Elegida ──────────► Compra pendiente ──► Compra lista ──► Cocinada ──► Evaluada
                    (al crear lista)     (botón manual)   (botón JP    (4to voto
                                                          o miembro)    o JP solo)
                                                                            │
[DESCARTAR] permitido solo en estados activos                                ▼
   │                                                                    [FINAL]
   ▼
[BORRADO de la fila]
```

**Invariantes:**

1. **No hay retroceso de estado.** Una vez `Cocinada`, no vuelve a `Compra lista`.
2. **`Evaluada` es terminal.** No se puede editar nada del plan en `Evaluada`.
3. **Descartar = borrar el doc.** No existe estado `Descartada`.
4. **Cascada al descartar Especial:** se borran todos sus `Especial extra` activos.
5. **`Cocinada` con extras:** al marcar Especial como `Cocinada`, modal pregunta si también marcar extras activos.
6. **Sincronización auto-avance:** al crear/sincronizar la lista, todo plan `Elegida` pasa a `Compra pendiente` (no baja estados superiores).
7. **`Cocinada` retira de la lista:** los ingredientes del plan cocinado se borran de la lista de compras.

### 3.2 Reglas anti-duplicado de planes

| Tipo | Regla |
|---|---|
| Especial | **Máximo 1 activa por semana**. Al elegir otra, se descarta la anterior (con cascada de extras). |
| Especial extra | Sin límite, pero **no se puede agregar como extra una receta que ya es la Especial** o que ya es otro extra activo del mismo padre. |
| En proceso | Sin límite, pero **no duplicar `(tipoSeleccion, idSeleccion)` en planes activos** de la misma semana. |

### 3.3 Reglas de elegibilidad

**Cambio en v1.2**: ya no existe `tipoItem === "Componente"` ni el campo `elegibleSemana`. Todas las recetas son elegibles dentro de las siguientes reglas:

- **Especial de la semana**: solo recetas con `tipoItem === "Receta principal"`. Esto evita elegir como Especial una entrada, postre o panificado.
- **Especial extra**: cualquier receta excepto la que ya es la Especial activa o ya es otro extra del mismo padre (anti-dup, §3.2).
- **En proceso**: cualquier receta.
- **Menús no tienen extras**: el menú ya define sus componentes. Si querés sumar algo, lo agregás como Especial extra al lado del menú-plan.
- **Menús como Especial/Extra/En proceso**: un plan con `tipoSeleccion: "menu"` apunta a un `idMenu`. El menú internamente referencia sus componentes (recetas en `/recetas`). El plan no replica esos componentes.

### 3.4 Umbrales de resultado textual

| Promedio | Etiqueta |
|---|---|
| ≥ 9 | Excelente |
| ≥ 7.5 | Muy bueno |
| ≥ 6 | Bueno |
| ≥ 4 | Regular |
| > 0 | Malísimo |
| 0 / vacío | (vacío) |

`promedio` se calcula como `Math.round(((v1+v2+v3+v4)/4) * 10) / 10` (1 decimal).

### 3.5 Validaciones del importador

**Campos obligatorios en `#RECETA`:**
- `nombre`, `tipoItem`, `proteinaPrincipal`, `escenarioUso`, `porciones`, `dificultad`, `sinLacteos`, `hidratos`.
- Al menos uno entre `tiempoTotal` y `tiempoEstimado`.

**Validación contra diccionarios:**
- `proteinaPrincipal` ∈ `diccionarios.proteinas`
- `tipoItem` ∈ `diccionarios.tiposItem`
- `escenarioUso` ∈ `diccionarios.escenarios`
- `climaDelPlato` ∈ `diccionarios.climaPlato` (si viene)
- `pensadaPara` ∈ `diccionarios.pensadaPara` (si viene)

**Validación de booleanos:**
- `sinLacteos`, `hidratos`: solo "Sí" o "No".
- `aptoNocheDeADos`, `paraJuanPablo`, `paraFamilia`: "Sí" | "No" | "Adaptable".

**Validación de tablas:**
- `#INGREDIENTES`: ≥ 1 ingrediente con `ingrediente` no vacío.
- `#PASOS`: ≥ 1 paso, números numéricos y sin duplicados.

**Anti-duplicado:**
- Receta: no crear si existe `idReceta` o `nombreCanonico` ya cargado.
- Ingrediente dentro de receta: no duplicar `(ingredienteCanonico, unidad, categoria)`.
- Paso: no duplicar `(idReceta, orden)`.

**Auto-derivación:**
- `idReceta === "AUTO"` o vacío → próximo `REC-XXXX` libre (max(idReceta REC-*) + 1, padded a 4 dígitos).
- `pensadaPara` vacío → calcular: si `tiempoTotalMin > 90` o `dificultad ∈ {Alta, Media-alta}` → `"Especial"`; si `tiempoTotalMin ≤ 45` y `dificultad === "Baja"` → `"Semana"`; resto → `"Cualquiera"`.

**Defaults al cargar receta:**
- `tipoItem` → `"Receta principal"`.
- `aptoNocheDeADos` → `"No"`.
- `sinLacteos` → `true`.
- `hidratos` → `false`.
- `paraJuanPablo`, `paraFamilia` → `true`.
- `fuente` → `"ChatGPT"`.
- `fechaImportacion` → hoy.

**Importador de menús (`#MENU` + `#COMPONENTES`) — nuevo en v1.2:**

Estructura del TXT:

```
#MENU
nombre: Español de mar
nombreCanonico: (auto si vacío)
descripcion: Menú de mar con entrada de langostinos...
escenarioUso: Noche de a dos
climaDelMenu: Restaurante (texto libre)
idealPara: Sábado especial / invitados
estilo: Español / mediterráneo
estado: Para probar
aptoNocheDeADos: Sí
hidratoOpcional: Arroz blanco o pan aparte
paraJuanPablo: Zarzuela sola, sin arroz ni pan
paraFamilia: Arroz blanco o pan para acompañar
riesgos: Coordinar tiempos de mariscos
notas: Muy especial
notasOcasion: Mantener arroz o pan aparte

#COMPONENTES
orden | tipo        | idReceta_o_nombre        | obligatorio | notas
1     | Entrada     | Langostinos al ajillo    | Sí          | Sin manteca
2     | Principal   | REC-0102                 | Sí          |
3     | Postre      | Crema catalana           | No          | Si hay tiempo
```

**Resolución de componentes**:
1. Si el valor empieza con `REC-` → match exacto por `idReceta`.
2. Si no → match por `nombreCanonico` contra `/recetas`. Si hay más de un match, error.
3. Si no encuentra → error: `Componente "X" no encontrado. Importar primero la receta.`
4. Si vienen ambos (`REC-0102 / Langostinos al ajillo`) en el mismo campo separados por `/`, validar que el ID y el nombre coincidan (cross-check). Si no coinciden, error.

**Validaciones obligatorias en `#MENU`:**
- `nombre`, `escenarioUso`, al menos 1 componente con `tipo === "Principal"` y `obligatorio === "Sí"`.

**Anti-duplicado de menú**: no crear si existe `idMenu` o `nombreCanonico`.

**Defaults al cargar menú:**
- `estado` → `"Para probar"`.
- `idMenu === "AUTO"` o vacío → próximo `MENU-XXXX` libre.
- `obligatorio` componente → `"Sí"`.
- Campos `aptoNocheDeADos`, restricciones, etc → vacío si no vienen.

### 3.6 Reglas que NO se enforcean en Security Rules

(quedan como lógica de cliente o transacción, ver §4):

- No eliminar receta principal de menú.
- No eliminar receta componente de menú (la receta sigue existiendo, pero hay que avisar que está siendo usada).
- No eliminar receta en plan activo de la semana actual.
- No elegir como Especial una receta con `tipoItem` distinto de `"Receta principal"` (ver §3.3).
- No votar un plan en estado distinto de `Cocinada`.
- No modificar asignaciones de plan `Evaluada`.

### 3.7 Atomicidad del voto + cierre automático

El voto + cierre se hace en **una sola transacción** del cliente Firestore. Pasos dentro de `runTransaction`:

1. `tx.get(planRef)` → leer estado actual.
2. Validar `plan.estado === "Cocinada"` (sino, abortar).
3. `tx.update(planRef, { 'votos.<miembro>': puntaje, 'comentariosPlan.<miembro>': comentario })`.
4. Releer votos actualizados (locally, post-merge).
5. Si los 4 votos están completos:
   - Calcular promedio + resultado.
   - `tx.set(historialRef, {…snapshot del plan + cálculos})`.
   - `tx.update(planRef, { estado: "Evaluada" })`.
   - `tx.update(recetaRef, { vecesCocinada: increment(1), ultimaEvaluacion: <fecha>, ultimoPuntaje: promedio })` — solo si `tipoSeleccion === "receta"`.

Si la transacción aborta (por concurrencia), Firestore reintenta automáticamente con el estado refrescado.

### 3.8 Cálculo de campos derivados del menú (Modelo M, nuevo en v1.2)

Cuando se muestra un menú, los campos `tiempoActivoMin`, `tiempoTotalMin`, `dificultadOrden`, `sinLacteos`, `hidratos`, `porciones`, `costoOrden` se calculan al vuelo desde las recetas componentes. Reglas:

| Campo derivado | Cálculo |
|---|---|
| `tiempoActivoMin` | Suma de `tiempoActivoMin` de todos los componentes obligatorios. |
| `tiempoTotalMin` | `max(tiempoTotalMin)` de los componentes + suma de `tiempoActivoMin` de los demás obligatorios. (Asume que las cocciones pasivas se solapan, pero las activas se hacen en secuencia.) |
| `dificultadOrden` | `max(dificultadOrden)` de los componentes obligatorios (la dificultad del más difícil define el menú). |
| `sinLacteos` | `AND` lógico: todos los componentes deben ser `sinLacteos === true`. Componentes opcionales se ignoran. |
| `hidratos` | `OR` lógico: alguno tiene `hidratos === true`. |
| `porcionesMin` | `min(porcionesMin)` de los componentes obligatorios. |
| `porcionesMax` | `min(porcionesMax)` de los componentes obligatorios. |
| `costoOrden` | `max(costoOrden)` de los componentes obligatorios. |

**Componentes opcionales** (`obligatorio: false`):
- Influyen en `hidratos` solo si están "incluidos" en una elección del usuario (futuro).
- En v1.2 simplemente se omiten para los cálculos derivados base.

**Cache**: se calculan al renderizar y se guardan en estado del cliente. Si se modifica una receta componente desde otra pestaña, el siguiente render del menú lee los datos frescos.

---

## 4. Security Rules

### 4.1 Modelo de permisos

| Recurso | Autenticado en whitelist | Otro auth | Sin auth |
|---|---|---|---|
| `/recetas/{id}` | read + write | denegado | denegado |
| `/menus/{id}` | read + write | denegado | denegado |
| `/planes/{id}` | read + write | denegado | denegado |
| `/compras/{id}` y `items/{id}` | read + write | denegado | denegado |
| `/historial/{id}` | read + write | denegado | denegado |
| `/config/diccionarios` | read | denegado | denegado |
| `/config/familia` | read | denegado | denegado |
| `/users/{uid}` | read si `uid === request.auth.uid`, write si owner o el propio uid | denegado | denegado |

**Principio:** simple y permisivo dentro de la familia. La integridad fina (no votar plan Evaluada, no eliminar receta con plan activo, etc) se enforce en el cliente vía transacciones. La whitelist en `/config/familia` es la barrera real contra externos.

### 4.2 Pseudocódigo de las rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: resuelve el memberId del caller buscando su email en los
    // arrays de mails de cada miembro. Devuelve el memberId (string) o null.
    function resolveMemberId() {
      let familia = get(/databases/$(database)/documents/config/familia).data;
      let email = request.auth.token.email;
      // Recorrer cada miembro; devolver la primera key cuyo array de mails
      // contenga el email del caller.
      return familia.miembros.keys().filter(
        memberKey => familia.miembros[memberKey].mails.hasAny([email])
      ).firstOrNull();
    }

    // Helper: ¿el caller es un miembro autorizado?
    function isFamilyMember() {
      return request.auth != null && resolveMemberId() != null;
    }

    // Helper: ¿es el owner?
    function isOwner() {
      return isFamilyMember()
        && get(/databases/$(database)/documents/config/familia).data.owner == resolveMemberId();
    }

    // /recetas, /menus, /planes, /historial: lectura/escritura para familia
    match /recetas/{idReceta} {
      allow read, write: if isFamilyMember();
    }
    match /menus/{idMenu} {
      allow read, write: if isFamilyMember();
    }
    match /planes/{idPlan} {
      allow read, write: if isFamilyMember();
    }
    match /historial/{idHist} {
      allow read, write: if isFamilyMember();
    }

    // /compras + subcollection items
    match /compras/{idLista} {
      allow read, write: if isFamilyMember();
      match /items/{itemId} {
        allow read, write: if isFamilyMember();
      }
    }

    // /config: lectura para familia, escritura solo owner
    match /config/{docId} {
      allow read: if isFamilyMember();
      allow write: if isOwner();
    }

    // /users: cada miembro ve y edita su propio doc
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid && isFamilyMember();
      allow update: if request.auth != null
                    && (request.auth.uid == uid || isOwner())
                    && isFamilyMember();
      allow delete: if isOwner();
    }
  }
}
```

### 4.3 Costo de los `get()` en Rules

Cada `get()` cuenta como 1 lectura. La whitelist se lee en cada request. **Mitigación:** Firestore cachea reads dentro de la misma evaluación de regla, pero entre requests no. En la práctica, ~400 lecturas/día × 1 extra = 800/día (sigue siendo <2% de la cuota Spark).

### 4.4 Nota sobre la sintaxis de `resolveMemberId()`

El lenguaje de Firestore Security Rules es restringido — no es JavaScript. Las construcciones `keys()`, `filter()`, `hasAny()` y `firstOrNull()` que se usan en §4.2 son válidas en versiones recientes de Rules, pero la sintaxis exacta puede requerir ajustes durante la implementación con el emulador.

**Plan B si la lógica es difícil de expresar:** denormalizar la whitelist a un map plano `mailToMember: { "jpcofano@gmail.com": "juanpablo", "marialascano@gmail.com": "maria", ... }` que se mantiene sincronizado por el cliente cada vez que se agrega un alias. Las Rules vuelven al patrón simple del esquema viejo. Trade-off: la sincronización agrega complejidad al cliente, pero las Rules quedan triviales.

**Decisión final:** lo resolvemos durante `PROMPT_E2.3_security_rules.md` con el emulador en vivo. Si la sintaxis del array funciona limpia, queda como en §4.2; si no, vamos a Plan B.

---


## 5. Mapping pantalla → queries

### 5.1 Inventario de pantallas

| Pantalla (Apps Script) | Ruta React | Modo JP | Modo miembro |
|---|---|---|---|
| `home` | `/` | ✅ | ✅ (renderDashboardMiembro) |
| `recetas` | `/recetas` | ✅ | ❌ |
| `detalle` | `/recetas/:id` | ✅ | ✅ |
| `cocinar` | `/recetas/:id/cocinar` | ✅ | ✅ |
| `importar` | `/recetas/importar` | ✅ | ❌ |
| `menus` | `/menus` | ✅ | ❌ |
| `menuDetalle` | `/menus/:id` | ✅ | ❌ |
| `menuCocinar` | `/menus/:id/cocinar` | ✅ | ❌ |
| `compras` | `/compras` | ✅ | ✅ (filtrada) |
| `voto` / `resultado` | `/voto/:idPlan` | ✅ | ✅ |
| `historial` | `/historial` | ✅ | ✅ |
| `pendientes` | `/pendientes` | ❌ | ✅ |

### 5.2 Queries por pantalla

**Home modo JP (`/`):**

```typescript
// Plan especial activo de la semana actual:
const planesActivos = await getDocs(
  query(
    collection(db, "planes"),
    where("semanaInicio", "==", semanaActualISO),
    where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista", "Cocinada"])
  )
);
// → separar en .especial, .extras (origen === "extra:" + especial.idPlan), .enProceso

// Lista de compras de la semana:
const listaSemana = planesActivos.docs
  .map(d => d.data().listaComprasId)
  .find(Boolean);
if (listaSemana) {
  const itemsSnap = await getDocs(collection(db, "compras", listaSemana, "items"));
}
```

**Home modo miembro (`/`, cuando `userMode === "miembro"`):**

```typescript
// Mis planes activos (donde miembroId está en asignaciones):
const misPlanes = await getDocs(
  query(
    collection(db, "planes"),
    where("semanaInicio", "==", semanaActualISO),
    where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista", "Cocinada"]),
    where("asignaciones", "array-contains", miembroId)
  )
);

// Pendientes de votar (planes Cocinada donde mi voto está vacío):
// Firestore NO permite "where votos.X == null", así que filtrar en cliente:
const cocinados = await getDocs(
  query(
    collection(db, "planes"),
    where("semanaInicio", "==", semanaActualISO),
    where("estado", "==", "Cocinada")
  )
);
const pendientesEvaluar = cocinados.docs.filter(d => !d.data().votos?.[miembroId]);

// Lista de compras filtrada por mis recetas:
// Levantar items y filtrar en cliente por aportes[].idPlan ∈ misPlanes.
```

**Listado de Biblioteca → tab "Recetas" (`/biblioteca`):**

```typescript
// v1.2: simple, sin filtro por "Componente" (ese tipoItem ya no existe):
const todas = await getDocs(collection(db, "recetas"));

// Filtros adicionales en cliente (tipoItem, proteína, sin lácteos, sin hidratos):
// Aplicar con .filter() sobre los resultados, o múltiples queries para casos comunes.
// Para sin hidratos: where("hidratos", "==", false)
```

**Listado de Biblioteca → tab "Menús" (`/biblioteca?tab=menus`):**

```typescript
const menus = await getDocs(collection(db, "menus"));
// Para cada menú en la lista, opcionalmente calcular derivados (tiempos, dificultad)
// con deriveMenuMetadata() — ver §2.3. Cachear en memoria por sesión.
```

**Detalle de receta (`/recetas/:id`):**

```typescript
// 1 sola query — ingredientes y pasos vienen embebidos:
const receta = (await getDoc(doc(db, "recetas", id))).data();
// receta.ingredientes y receta.pasos disponibles directo.
```

**Lista de compras (`/compras`):**

```typescript
// 1. Encontrar lista activa (vía cualquier plan activo con listaComprasId):
const planes = await getDocs(
  query(
    collection(db, "planes"),
    where("semanaInicio", "==", semanaActualISO),
    where("estado", "in", ["Compra pendiente", "Compra lista"])
  )
);
const idLista = planes.docs[0]?.data().listaComprasId;

// 2. Levantar items de esa lista:
const items = await getDocs(collection(db, "compras", idLista, "items"));

// 3. Toggle "Ya tengo" — update de UN solo item:
await updateDoc(doc(db, "compras", idLista, "items", itemId), { yaTengo: !item.yaTengo });
// → trigger un re-cómputo del resumen denormalizado en compras/{idLista}
```

**Historial (`/historial`):**

```typescript
// Globales últimas 30 (modo JP):
const ultimas30 = await getDocs(
  query(
    collection(db, "historial"),
    orderBy("fechaRealizadaTimestamp", "desc"),
    limit(30)
  )
);

// Historial de UNA receta (para ficha de detalle):
const histReceta = await getDocs(
  query(
    collection(db, "historial"),
    where("idReceta", "==", idReceta),
    orderBy("fechaRealizadaTimestamp", "desc")
  )
);
```

**Voto miembro (`/voto/:idPlan`):**

```typescript
// Cargar plan:
const plan = (await getDoc(doc(db, "planes", idPlan))).data();
// Mostrar form con valores actuales: plan.votos[miembroId], plan.comentariosPlan[miembroId]
// Si miembroId === "juanpablo": mostrar también campos de plan.datosCocinero.

// Al submit: runTransaction (ver §3.7).
```

### 5.3 Índices Firestore necesarios

Firestore exige índices compuestos explícitos para queries con múltiples `where` o `where` + `orderBy`. Lista a crear desde la consola (o `firestore.indexes.json`):

| Colección | Campos | Uso |
|---|---|---|
| `planes` | `semanaInicio` ASC + `estado` ASC | filtrar planes activos por semana |
| `planes` | `semanaInicio` ASC + `estado` ASC + `asignaciones` ARRAY | dashboard miembro |
| `planes` | `semanaInicio` ASC + `tipoPlan` ASC | (uso futuro) |
| `recetas` | `tipoItem` ASC + `proteinaPrincipal` ASC | filtros del listado |
| `historial` | `idReceta` ASC + `fechaRealizadaTimestamp` DESC | historial por receta |
| `historial` | `fechaRealizadaTimestamp` DESC | últimas 30 globales |

Se versionan en `firestore.indexes.json` y se deployan con `firebase deploy --only firestore:indexes`.

---

## 6. Mejoras sobre el sistema actual

### 6.1 Ingredientes sumables en lista de compras 🆕

**Hoy en Apps Script:** la lista muestra "Cebolla — 1 unidad (Bondiola)" y "Cebolla — 2 unidades (Berenjenas)" como dos renglones.

**En Firebase:** se suman en un solo renglón cuando `ingredienteCanonico` + `unidad` coinciden.

**Algoritmo de canonicalización:**

```typescript
function canonicalizar(ingrediente: string): string {
  return ingrediente
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // sin tildes
    .replace(/^(cebollas?|cebolla blanca|cebolla colorada)$/, "cebolla")  // sinónimos comunes
    .replace(/^(ajos?|dientes? de ajo)$/, "ajo")
    .replace(/^(zanahorias?)$/, "zanahoria")
    // ... una lista corta de sinónimos manuales
    .replace(/s$/, "")  // singular básico (último recurso)
    .trim();
}
```

**Regla de unidades:** si `unidad` difiere, NO sumamos. "1 cebolla" + "200g cebolla" → dos renglones.

**Conflicto de categoría:** si dos recetas categorizan el mismo ingrediente distinto ("Verdura" vs "Almacén"), elegimos la primera no vacía. Pendiente: panel de admin para editar.

**Trade-off:** sinónimos incompletos pueden generar duplicados ("morrón" vs "ají morrón" vs "pimiento"). Empezamos con una lista manual corta y la extendemos cuando aparezcan casos reales. Mejor que sobre-fusionar y mezclar ingredientes que no son lo mismo.

### 6.2 Atomicidad del voto 🆕

Apps Script tiene una race condition teórica: dos miembros votando en el mismo segundo pueden disparar dos cierres de evaluación (dos filas en historial, doble incremento de `vecesCocinada`).

Firebase: `runTransaction` lo elimina por construcción.

### 6.3 Comentarios por miembro en el historial 🆕

Apps Script guarda comentarios en el plan pero no los snapshotea bien al cerrar evaluación. Firebase guarda el snapshot completo en `/historial/{id}.comentarios`.

### 6.4 Offline-first 🆕

El SDK de Firestore cachea localmente. Mirar la lista de compras en el super sin señal → funciona. Toggle "Ya tengo" se guarda local y sincroniza cuando vuelve la red.

### 6.5 Filtros mejorados con campos numéricos 🆕

Apps Script no permite "recetas en menos de 30 min" porque `tiempoTotal` es string libre. Firebase con `tiempoTotalMin: number` permite:

- `where("tiempoTotalMin", "<=", 30)`
- Ordenar por dificultad (`dificultadOrden`).
- Ordenar por costo.
- "Más rápidas que..." / "Más baratas que...".

### 6.6 Whitelist robusta 🆕

Apps Script confía en el URL param `?miembro=X` (cualquiera con el link puede falsificar identidad). Firebase Auth + whitelist hace imposible entrar como otro miembro sin estar logueado con su Google.

### 6.7 Menús como composiciones vivas (Modelo M) 🆕

Apps Script duplicaba campos de receta (tiempos, dificultad, sinLacteos, etc.) en los menús, lo que generaba dos fuentes de verdad y forzaba a mantenerlas en sincronía manualmente. Firebase + Modelo M:

- El menú solo guarda metadata propia y referencias a recetas.
- Los campos derivados (tiempos, dificultad, restricciones) se calculan al vuelo desde las recetas componentes.
- Si JP modifica una receta componente (ej. le agrega 5 min al ajillo), el menú "ve" el cambio en su próxima query — sin código adicional.
- El listado "Biblioteca" pasa a tener tabs `Recetas | Menús` que comparten la query base de `/recetas`.

---

## 7. Plan de prompts para Claude Code

Cada prompt es un archivo en `docs/prompts/` listo para pegar a Claude Code en la terminal. Estructura común: contexto + decisiones zanjadas + tareas numeradas + criterios de aceptación + qué NO tocar.

### 7.1 Etapa 1 — Auth + esqueleto

- **`PROMPT_E1.0_bootstrap_config.md`**: crear los docs `/config/familia` (con los 4 miembros y sus mails reales, ver §2.8) y `/config/diccionarios` (con los enums seed, ver §2.7) usando un script one-off con Admin SDK (`scripts/bootstrap-config.ts`). Sin esto, el primer login no puede resolver `memberId`.
- **`PROMPT_E1.1_auth_provider.md`**: Firebase Auth con Google + whitelist (lee `/config/familia` y resuelve `memberId` recorriendo arrays de mails) + `useAuth` hook + `AuthProvider` context + `LoginScreen` con botón Sign-in Google + creación/actualización del doc `/users/{uid}` al login.
- **`PROMPT_E1.2_layout_routing.md`**: layout base (header, bottom-nav, main) con tokens de diseño portados de `Styles.html`. React Router con todas las rutas listadas en §5.1. Home vacío con placeholder. Detección de modo JP vs miembro según `memberId` resuelto.

### 7.2 Etapa 2 — Modelo de datos + Security Rules + Seeds

- **`PROMPT_E2.1_types_and_helpers.md`**: types TypeScript en `src/types/models.ts` con TODAS las shapes de §2 (Receta, Menu con `componentes[]`, Plan con `votos: {}` map, etc). Helpers de canonicalización (normalizeText, parseTime, parseRange).
- **`PROMPT_E2.2_data_layer.md`**: módulos `src/data/recetas.ts`, `planes.ts`, `compras.ts`, `historial.ts`, `menus.ts`, `diccionarios.ts`. Cada uno expone funciones tipadas (read/write/queries) que envuelven el SDK Firestore. **`menus.ts`** incluye `deriveMenuMetadata()` para calcular campos derivados (§2.3, §3.8).
- **`PROMPT_E2.3_security_rules.md`**: `firestore.rules` con la versión de §4.2 + tests con emulador.
- **`PROMPT_E2.4_seeds_import.md`**: `scripts/seed-firestore.ts` con Admin SDK. Tres pasos:
  1. Lee `30_Seeds.gs`, parsea las tuples, convierte a objetos con campos derivados (campos `xxxMin/Max`).
  2. **Aplica el mapeo de migración de componentes**: detecta recetas con `tipoItem === "Componente"` y, basándose en el rol del componente en los menús, las re-asigna a su tipo real (Entrada, Receta principal, Postre, etc.). Elimina el flag `elegibleSemana` si está presente.
  3. Sube todo a Firestore. Idempotente (sobreescribe).
- **`PROMPT_E2.5_menu_importer.md`**: implementa el importador de menús (`#MENU` + `#COMPONENTES`) con resolución de componentes por nombre o por `idReceta` (§3.5). Pantalla simple primero, integración al flow completo viene en E5.
- **`PROMPT_E2.6_indexes.md`**: `firestore.indexes.json` con los índices de §5.3 + deploy.

### 7.3 Etapa 3 — Funcionalidad core modo JP

- **`PROMPT_E3.1_home.md`**: Home con tarjeta de Especial + extras + En proceso + resumen de compras. Acciones (descartar, sumar extra, marcar cocinada).
- **`PROMPT_E3.2_recetas_listado.md`**: listado con filtros (tipo ítem, proteína, sin lácteos, sin hidratos).
- **`PROMPT_E3.3_detalle_receta.md`**: ficha completa con ingredientes y pasos. Botones "Elegir como Especial" / "Sumar como En proceso" / "Sumar como Extra" según contexto.
- **`PROMPT_E3.4_compras.md`**: lista de compras con vista por categoría / por receta, toggle "Ya tengo", aportes expandibles. Sincronización al cambiar planes.
- **`PROMPT_E3.5_cocinar.md`**: modo paso a paso + marcar Cocinada.
- **`PROMPT_E3.6_evaluar.md`**: formulario de evaluación con los 4 votos + datos de cocinero. Si JP llena todo, dispara el cierre directo.
- **`PROMPT_E3.7_menus.md`**: listado de menús + detalle + selección como plan.
- **`PROMPT_E3.8_historial.md`**: últimas 30 globales + historial por receta.

### 7.4 Etapa 4 — Modo miembro

- **`PROMPT_E4.1_dashboard_miembro.md`**: vista cuando el login es de un miembro no-JP. Mis planes, pendientes, compras filtradas, mi historial.
- **`PROMPT_E4.2_voto_miembro.md`**: pantalla de voto individual con `runTransaction` (ver §3.7). Cierre automático al 4to voto.
- **`PROMPT_E4.3_asignaciones.md`**: UI para reasignar planes (multi-select de miembros).

### 7.5 Etapa 5 — Importador

- **`PROMPT_E5.1_importador.md`**: pantalla con textarea + botón "Copiar prompt para LLM" + "Importar". Replica el parseo, validación y anti-dup del Apps Script. Resumen de creadas / duplicadas / fallidas. El prompt modelo vive en `/config` o se genera client-side.

### 7.6 Etapa 6 — PWA pulida

- **`PROMPT_E6.1_pwa_manifest.md`**: manifest.json + íconos + service worker con offline básico para shell + assets.
- **`PROMPT_E6.2_push_notifications.md`**: Firebase Cloud Messaging para "JP te asignó la Especial" o "Pendiente de voto" (requiere Blaze para mensajes desde el server; alternativa: cliente-a-cliente vía Firestore listener).

### 7.7 Etapa 7 — Features nuevos (D.3 y más)

- **`PROMPT_E7.1_dashboard_historial.md`**: D.3 con filtros y gráficos.
- Otros prompts según prioridad familiar.

---

## 8. Claude Design: cuándo y qué pedirle

### 8.1 Cuándo NO usarlo

**Etapas 1–4** son trabajo de **portado**, no de diseño. El design system ya está definido en `Styles.html` (tokens CSS, primary `#74324a`, cards sin sombra, bottom nav fijo, etc). Necesitamos que la UI nueva se vea **igual** a la actual, no diferente. Para eso, Claude Code reproduce HTML/CSS existente. Claude Design no suma valor.

### 8.2 Cuándo SÍ usarlo

**Etapa 6 (PWA pulida) — para branding:**
- "Diseñá un set de íconos (192px, 512px, splash screen) para una app de planificación familiar de comidas. Tonos: primary `#74324a`, surface `#f9fafb`. Estilo: cálido, no infantil, con un guiño a comida casera pero moderno. Variantes: maskable y not-maskable."
- "Diseñá una splash screen para iOS PWA, fondo `#74324a`, logo centrado, texto 'Comida Familiar'."

**Etapa 7 (D.3 dashboard historial) — para diseño desde cero:**
- "Diseñá un dashboard de historial de evaluaciones de recetas familiares. Datos: nombre de receta, promedio (1-10), cantidad de votos, fecha. Filtros: por miembro (4 personas), por proteína, por escenario, por rango de fecha. Vistas: cards de las 5 mejor calificadas + gráfico de líneas de evolución temporal + tabla expandible. Mobile first (375px). Mismo design system que adjunto en el bundle."
- "Diseñá una vista de comparación 'mis ratings vs. promedio familiar' para un miembro: cuánto se alinea cada uno con el resto, en qué tipos de comida hay desacuerdo, etc."

**Cualquier feature futuro que no exista hoy:**
- Vista de calendario multi-semana.
- Wizard de selección de menú con filtros visuales.
- Vista "Sugerencias para hoy" con cards comparativas.

### 8.3 Cómo pedirle bien

**Lo crítico de un buen prompt a Claude Design:**

1. **Adjuntar el design system**: linkear el repo o pasar `Styles.html` en el bundle. Claude Design lo lee y genera con los tokens correctos.
2. **Mobile primero**: indicar viewport (375px) y luego ajustes desktop.
3. **Datos reales o realistas**: pasar shapes de datos de §2 (recetas con nombres reales, no "Lorem ipsum").
4. **Constraint negativos**: "sin gradientes, sin glass effect, sin sombras pronunciadas, sin animaciones decorativas".
5. **Handoff explícito al final**: "Cuando esté listo, generá el handoff bundle para Claude Code apuntando al repo `Comidas-Familiares` y rama `feature/d3-dashboard`".

**El loop ideal:**

```
[VS Code]                         [Claude Design]                    [Claude Code]
   │                                   │                                    │
   │  Prompt + design system           │                                    │
   ├──────────────────────────────────►│                                    │
   │                                   │  Variantes visuales                │
   │                                   │                                    │
   │  Feedback (refinar 2-3 veces)     │                                    │
   ├──────────────────────────────────►│                                    │
   │                                   │                                    │
   │                                   │  Handoff bundle                    │
   │                                   ├───────────────────────────────────►│
   │                                   │                                    │  Genera componentes
   │                                   │                                    │  React + integra
   │  PR creada                                                              │
   │◄────────────────────────────────────────────────────────────────────────┤
   │                                                                          
   │  Review + merge
```

### 8.4 Limitaciones a tener en cuenta

- Claude Design genera bien mockups y componentes visuales aislados; **no es bueno** para diseños que requieren mucha lógica de estado custom o data viz altamente específica. Para eso conviene pasarle al Code una referencia visual + dejarlo programar.
- Si el design system tiene reglas exóticas (animaciones complejas, micro-interacciones), conviene mostrarlas explícitamente con ejemplo en el prompt.
- El handoff bundle no instala dependencias extra. Si Design propone usar una librería nueva (recharts, etc), agregalo a `package.json` antes del merge.

---

## 9. Apéndice: futuro

Cosas planteadas pero **fuera de scope** para Etapas 0-6:

### 9.1 D.3 — Dashboard de historial avanzado (Etapa 7)
Filtros, gráficos, comparaciones miembro vs. familia. Ver §8.2.

### 9.2 Multi-semana
Hoy: una sola semana activa (la actual). Futuro: planificación de la próxima semana, hover sobre las próximas 4 semanas en home.

### 9.3 Notificaciones push contextuales
Cloud Functions + FCM. Triggers: "JP te asignó la Especial", "La lista de compras se actualizó", "Pendiente de votar la cena del sábado".
Requiere Blaze.

### 9.4 Importador con foto / OCR
Subir foto del libro de cocina → Vision API → TXT estructurado → mismo flujo del importador actual. Requiere Cloud Functions + Vision API (ambas Blaze).

### 9.5 Sugerencias inteligentes
"Esta semana no comieron pollo, te recomendamos..." / "Hace 6 semanas que no hacen pescado". Requiere queries más complejas y posiblemente un endpoint con lógica server-side.

### 9.6 Diccionario de sinónimos de ingredientes extendido
Hoy: lista manual corta. Futuro: panel de admin para que JP agregue sinónimos cuando detecta duplicados. O LLM clasificando ingredientes automáticamente.

### 9.7 Costos reales tracking
Hoy: `costoReal` es texto libre del cocinero. Futuro: form con precio por ingrediente, total calculado, evolución temporal del costo de la familia.

### 9.8 Modo "noche de a dos"
Filtrar todo lo no-apto, ajustar porciones, ocultar lo de los chicos. Switch global.

### 9.9 Lista de compras compartida en tiempo real
Hoy: cada miembro ve la lista pero las marcas "Ya tengo" se sincronizan al refrescar. Futuro: listener real-time (`onSnapshot`), ver el toggle de María mientras estoy en el super.

### 9.10 Backup / export
Botón "Exportar todo a JSON" para snapshot offline. Útil si en el futuro queremos migrar de Firebase.

### 9.11 Invitados con scope limitado
Hoy: cualquier miembro en `/config/familia.miembros` tiene acceso completo (read/write a todas las recetas, planes, etc).
Futuro: agregar un campo `scope` a la metadata del miembro (ej: `scope: "guest"`) y ajustar las Security Rules para que un guest pueda leer recetas pero no votar ni elegir planes. Útil si quisieras invitar a un suegro a ver el menú del finde sin que pueda romper el sistema.

### 9.12 Cierre del Apps Script
Una vez que la familia use Firebase con confianza por 4-6 semanas, deprecamos el Apps Script. Acciones:
- Read-only en el Sheet.
- Reemplazar `Index.html` con un mensaje "Esta versión está retirada, andá a https://comida-familiar.web.app".
- Mantener el spreadsheet como respaldo histórico, sin acceso de escritura.

---

## Cierre

Este documento es la **fuente de verdad** del modelo de datos y la arquitectura de la app Firebase. Cualquier decisión que se tome en el trabajo concreto y modifique algo de acá, **debe reflejarse en este documento en el mismo commit**.

Próximo paso: cerrar Etapa 0 con commit + push y arrancar Etapa 1 desde `PROMPT_E1.0_bootstrap_config.md`.
