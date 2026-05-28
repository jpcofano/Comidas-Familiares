# MAPEO_FIRESTORE — Comida Familiar

> Fuente de verdad para el modelo de datos, arquitectura y decisiones de producto de la app. Ciclo funcional cerrado en v1.8.0 (Etapas 0–7 salvo E7.7 distribución/onboarding, pendiente). Mejoras puntuales se registran como sub-etapas (`E7.x`) o entradas en `§10`.
>
> Cualquier discrepancia entre este documento y el código se resuelve actualizando el código o este documento (no ambos en deriva).
>
> **Versión**: 1.8.0 (CIERRE — app completa para uso familiar; queda E7.7 distribución/onboarding pendiente; push, dashboard avanzado y opcionales postergados sin urgencia)
> **Fecha**: 2026-05-28
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
10. [Deuda técnica pendiente](#10-deuda-técnica-pendiente--post-etapa-3)

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

### 1.2.cierre Cambios en v1.8.0 (cierre del scope)

La app entra en uso real de la familia con todo el ciclo cubierto: planificación, compras,
cocinar, voto, evaluación, historial, importador. Esta versión declara el cierre formal
del scope inicial.

1. **Etapas 0–6 cerradas.** Auth, modelo de datos, security rules, seeds, importador,
   funcionalidad core JP, modo miembro, importador desde frontend, PWA instalable + splash iOS.

2. **Etapa 7 cerrada en su scope necesario:**
   - E7.1 — campo `fecha` en el plan ✅
   - E7.2 — design system v1 (PlatoMark, PWA assets, componentes nuevos) ✅
   - E7.3 — contador real de pasos en Cocinar ✅
   - E7.4 — rediseño v2 (Compras, Cocinar, Detalle receta, Home tweaks) ✅
   - E7.5 — fixes de auditoría (CTAs Home + marcar cocinada con fecha futura + detalle
     receta sin foto + acciones JP arriba) ✅
   - E7.6 — pulidos del detalle de receta + acciones JP visibles (cinco cosméticos
     + sacar el acordeón de acciones, volver a botones directos con ocultar los no
     elegibles) ✅
   - E7.7 — distribución y onboarding (Open Graph para WhatsApp + botón Instalar app
     en Android desde el login) ⏳ pendiente — ver §10.5 y §10.6

3. **E6.2 push notifications — postergada sin urgencia.** No es necesaria para el uso
   actual de la familia. Cuando se retome, ver `PROMPT_DOCS_mapeo_e62_en_espera.md` para
   la decisión Camino A (Blaze + Cloud Function) vs Camino B (in-app sobre realtime).

4. **§9.1 dashboard de historial avanzado (D.3) — postergado sin urgencia.** La pantalla
   de historial actual (E3.7) cubre lo que la familia usa hoy: lista con filtros, métricas,
   detalle. El dashboard con gráficos y comparación miembro-vs-familia entra cuando
   aparezca necesidad real.

5. **Apps Script viejo — cerrado.** JP retiró el acceso de escritura. El spreadsheet
   queda como respaldo histórico read-only. La app Firebase es la única fuente de verdad
   para la familia. Ver §9.12.

6. **Apéndice §9 restante** (§9.2, §9.5, §9.7, §9.8, §9.10, §9.11) — futuro opcional sin
   compromiso de fecha. Se reactiva si aparece necesidad real.

7. **Deuda técnica §10 restante:**
   - §10.1 — filtros de Biblioteca post-E3.4.8: pendiente verificación.
   - §10.2.3 — display "a gusto" para unidad null: pospuesto por JP (no bloqueante).
   - §10.5 — Open Graph / Twitter Card para preview al compartir el link (WhatsApp,
     Telegram, iMessage). No implementado: `index.html` no tiene metas `og:*`. Cuando
     se comparte el link, no aparece logo ni descripción. Asset de preview a generar
     (1200×630) + metas a sumar. **E7.7.**
   - §10.6 — Botón "Instalar app" en `LoginScreen` para Android. Hoy el navegador
     muestra su propio prompt de instalación si quiere; no hay control en la app. Captar
     `beforeinstallprompt` y exponer un botón explícito en el login mientras el evento
     esté disponible. iOS queda fuera (Safari requiere "Agregar a pantalla de inicio"
     manual). **E7.7.**

### 1.2.bis Cambios estructurales en v1.2 (modelo de menús)

Después de revisar el modelo de Apps Script, se detectó duplicación entre `/recetas` y `/menus` (campos paralelos: tiempos, dificultad, restricciones, etc.). El menú actual es un híbrido raro: tabla propia con campos de receta + un array de "componentes" que ya apuntan a recetas reales marcadas con `tipoItem: "Componente"`.

**Decisiones tomadas para v1.2:**

1. **Modelo M — menús como composiciones vivas**: `/menus/{idMenu}` se reduce a metadata + array de referencias a recetas. **Los tiempos, dificultad, restricciones se derivan al vuelo desde las recetas componentes**. Si una receta componente cambia (ej. JP le agrega 5 min al ajillo), el menú "ve" el cambio en su próxima query. Sin snapshots.

2. **`tipoItem: "Componente"` eliminado**: las recetas marcadas hoy como `Componente` se migran a su tipo real según el rol que cumplen en el menú donde participan (`Entrada`, `Receta principal`, `Postre`, etc.). Pasan a ser recetas normales, visibles en la Biblioteca, elegibles según las reglas del §3.

3. **`elegibleSemana` eliminado**: campo redundante con el modelo nuevo. Todas las recetas son potencialmente elegibles; la restricción queda solo por `tipoItem` (ver §3.3).

4. **Solo `tipoItem === "Receta principal"` puede ser Especial de la semana** (ver §3.3). El resto puede sumarse como Extra o En proceso.

5. **Importador de menús**: incluido en scope desde Etapa 2 (no Etapa 5). El TXT del menú referencia componentes por **nombre o por idReceta** — el importador resuelve. Si el componente no existe, el menú no se importa y avisa qué falta.

6. **Migración de seeds**: el script de seeding del Etapa 2 (`PROMPT_E2.4`) aplica el mapeo automático componente → tipo real basado en el rol del componente en el menú. Si alguna receta se "lee raro" como receta independiente, se ajusta manualmente más tarde (no bloqueante).


### 1.2.quinquies Cambios en v1.5.1 (E3.4.4 — auto-transición de estado y limpieza de compras)

1. **Auto-transición "Compra pendiente" → "Compra lista"**: cuando JP tilda el último ítem pendiente del plan en la lista de compras, el plan avanza automáticamente de estado. Si JP destilda algún ítem, el plan retrocede a "Compra pendiente". La lógica vive en `toggleItemYaTengo` (`src/data/compras.ts`) y también se dispara en `sincronizarListaDesdeFirestore` al reconstruir la lista.

2. **Helper reutilizable `evaluarEstadosPlanesEnBatch`**: la evaluación de estados está extraída en una función no exportada del módulo `compras.ts`, llamada por tanto `toggleItemYaTengo` como por `sincronizarListaDesdeFirestore`. Trata "Elegida" como "Compra pendiente" para cubrir el caso en que la sync avanza el estado en el mismo batch.

3. **Botón "Cocinar" disponible desde "Compra pendiente"**: el botón ya no requiere que el plan esté en "Compra lista". Aparece desde "Compra pendiente", "Compra lista" y "Cocinando". El estado es informativo, no un gate de acceso.

4. **Limpieza al cocinar** (`limpiarAportesDelPlan` en `src/data/compras.ts`): al marcar un plan como "Cocinada" (o al cocinar un componente de un plan-menú), se remueven los aportes de ese plan de todos los ítems de la lista. Los ítems que quedan sin aportes se borran. Los que tienen aportes de otros planes se recalculan (`cantidadTotal`, `cantidadLabel`). Los contadores del doc raíz de la lista se actualizan. Todo en un batch atómico.

5. **Limpieza granular para plan-menú**: `limpiarAportesDelPlan(idLista, idPlan, soloIdReceta?)` acepta un tercer argumento opcional. Cuando se llama desde `marcarComponenteCocinado`, se pasa el `idReceta` del componente cocinado, limpiando solo sus aportes sin tocar los de componentes aún no cocinados.

### 1.2.sexies Cambios en v1.5.2 (E3.4.5 — normalización de unidades)

1. **`normalizarUnidad()` en `src/lib/unidades.ts`**: función pura que convierte cualquier unidad cruda a su forma canónica (singular, minúscula). Mappings: `"cdas"→"cda"`, `"cditas"→"cdita"`, `"dientes"→"diente"`, `"tazas"→"taza"`, etc. Devuelve `null` para medidas "a gusto" (`"cantidad necesaria"`, `""`, `null`). Emite `console.warn` para entradas no reconocidas (señal de que la tabla necesita ampliarse).

2. **Clave de agrupado normalizada en `sincronizarListaDesdeFirestore`** (`src/data/compras.ts`): antes se usaba `"${idIngrediente}|${unidad}"` con la unidad cruda de la receta. Ahora se usa `"${idIngrediente}__${normalizarUnidad(unidad) ?? 'agusto'}"`. Esto resolvía el bug de ING-0004 (Aceite de oliva) apareciendo como dos ítems separados porque sus recetas usaban `"cda"` y `"cdas"`.

3. **Comparación de `yaTengo` normalizada** (`toggleItemYaTengo`): la preservación de la marca "ya tengo" al re-sincronizar también compara las unidades en forma canónica (`normalizarUnidad(old.unidad)` vs `normalizarUnidad(it.unidad)`), evitando que una re-sync borre marcas que JP ya había hecho.

4. **Migración de datos** (`scripts/migrar-unidades.ts`, corrida el 2026-05-23):
   - 73 recetas: campo `ingredientes[].unidad` normalizado (ej. `"cdas"→"cda"`, `"dientes"→"diente"`). Solo se tocó `unidad`; `textoOriginal`, `cantidad` y todos los demás campos no se modificaron.
   - 80 ingredientes de catálogo: `unidadesHabituales` deduplicado y normalizado.
   - `/config/diccionarios.unidadesCanonicas` actualizado a la lista canónica actual (ver §2.7).
   - **0 unidades no reconocidas** después de la migración.

5. **Casos de sal/pimienta con doble unidad**: algunos ingredientes (Sal fina, Pimienta) tienen aportes con `unidad: ""` (a gusto) en algunas recetas y con `"pizca"` o `"cdita"` en otras. Esto genera **dos ítems separados en la lista de compras** — uno "a gusto" y uno con medida. Esto es **correcto y esperado**: no forzar la fusión porque son medidas genuinamente distintas.

### 1.2.sexies-bis E3.4.6 — importador de recetas TXT (sin bump de versión formal en el MAPEO)

> Nota: E3.4.6 fue implementado entre v1.5.2 (E3.4.5) y v1.5.3 (E3.5.1) sin generar su propio bump de versión en el MAPEO. Esta entrada se agrega retroactivamente en v1.6.0 como parte del cierre documental de la Etapa 3.

1. **Pantalla `/biblioteca/importar`** (`src/routes/ImportarReceta.tsx`): importador de recetas en formato TXT. Acceso exclusivo JP (redirige a `/biblioteca` si el usuario no es `juanpablo`). Flujo de 3 pasos:
   - **Paso 1 — parsear TXT**: textarea con el formato `#RECETA` / `#INGREDIENTES` / `#PASOS`. Botón "Parsear" invoca `parseRecetaTxt()` y carga el catálogo vía `getCatalogo()`.
   - **Paso 2 — resolver ingredientes**: por cada ingrediente tipeado, el matcher devuelve una decisión (`exacto` / `candidatos` / `nuevo`). JP confirma o ajusta cada fila antes de guardar.
   - **Paso 3 — guardar**: crea ingredientes nuevos con `crearIngrediente()`, llama `agregarSinonimo()` para los candidatos elegidos, crea la receta con `crearReceta()`.

2. **Matcher original** (`src/lib/matcherIngredientes.ts`): tipo de resultado `"exacto" | "candidatos" | "nuevo"`. Los candidatos usaban similitud por trigramas con umbral 0.4, top 4 ordenados por similitud. Reemplazado en E3.4.9 por el algoritmo de 4 pasos con tipo `"sugerencias"`.

3. **Funciones del catálogo** (`src/data/ingredientes.ts`): `getCatalogo()` (cache en memoria), `crearIngrediente()`, `proximoIdIngrediente()`, `agregarSinonimo()` (usa `arrayUnion`, invalida cache). Estas 4 funciones nacen en E3.4.6 y son extendidas en E3.4.8 con `buildNuevoIngredienteDoc`, `getIngredientesAmbiguos`, `actualizarIngrediente`.

### 1.2.septies Cambios en v1.5.3 (E3.5.1 — finalización explícita y pasos destildables)

1. **Botón "Finalizar" explícito**: la pantalla de cocinar (`src/routes/Cocinar.tsx`) ya no finaliza automáticamente al llegar al último paso. El botón "Finalizar cocción" / "Componente listo ✓" / "Salir" siempre está visible al pie; requiere confirmación inline antes de ejecutar.

2. **Pasos destildables en modo guiada**: en modo guiada, el `PasoCard` recibe `onToggleTachado` y permite desmarcar un paso ya tachado. Antes el toggle solo funcionaba en modo scroll.

3. **Plan-menú: paso a "Cocinada" explícito**: `marcarComponenteCocinado` ya **no** avanza el plan a `"Cocinada"` automáticamente al cocinar todos los obligatorios. Siempre setea `estado: "Cocinando"`. El paso a `"Cocinada"` requiere que JP presione el botón "Finalizar menú" en la pantalla de componentes (`src/routes/SeleccionarComponenteMenu.tsx`), que llama a `marcarCocinada`.

4. **Botón "Desmarcar" por componente**: en `SeleccionarComponenteMenu`, cada componente ya cocinado ofrece un botón "Desmarcar" que llama a `desmarcarComponenteCocinado(idPlan, idReceta)` — nueva función en `src/data/planes.ts`. Remueve el idReceta de `componentesCocinados[]`. Los aportes de compras ya limpiados no se restauran.

### 1.2.octies Cambios en v1.5.4 (E3.6 — evaluación JP, historial, vecesCocinada)

1. **Pantalla de evaluación** (`src/routes/Voto.tsx`): reemplaza el stub anterior. JP ingresa puntaje 1-10 (5+5 botones), comentario libre y los `datosCocinero`. Para plan-menú, sección colapsable "Calificar componentes (opcional)" permite asignar puntaje a cada receta en `componentesCocinados`. Confirmación inline antes de guardar.

2. **`guardarEvaluacionJP`** (`src/data/planes.ts`): transacción Firestore que:
   - Valida `plan.estado === "Cocinada"` (aborta con error claro si no).
   - Escribe `votos.juanpablo`, `comentariosPlan.juanpablo`, `datosCocinero`, `estado: "Evaluada"` en el plan.
   - Crea doc en `/historial/{HIST-YYYYMMDDHHmmss-XXXX}` con snapshot completo + `calificaciones`, `promedio`, `resultado`.
   - Incrementa `vecesCocinada` en la receta (plan-receta) o en el menú + cada receta en `componentesCocinados` (plan-menú). **TODO `vecesCocinada` plan-menú: resuelto.**

3. **Promedio sobre votos no nulos** (ver §3.4): con un solo votante (JP en E3.6), `promedio = puntaje de JP`. La fórmula no cambia cuando E4.2 traiga los 4 votos — el promedio sobre no-nulos es correcto en ambos casos.

4. **Estado terminal `"Evaluada"`** (§3.7): en E3.6, el cierre lo dispara JP al confirmar la evaluación. En E4.2 el cierre será al 4º voto. La mecánica de transacción es idéntica; solo cambia la condición de cierre. El shape de `votos` y `comentariosPlan` nace multi-miembro desde E3.6 — no hay migración en E4.2.

### 1.2.nonies Cambios en v1.5.5 (detalle de menú + acciones JP)

1. **`DetalleMenuRoute`** (`src/routes/DetalleMenu.tsx`): reemplaza el stub. Muestra metadata completa (escenario, clima, idealPara, derivados en chips), lista de componentes ordenada con link a `/recetas/:id`, notas opcionales, acciones JP.

2. **Evaluadores de menú** (`src/lib/elegibilidad.ts`): `evaluarEspecialMenu(menu, planesActivos)` y `evaluarEnProcesoMenu(menu, planesActivos)`. Los menús solo pueden ser Especial o En proceso — **no Especial extra** (son composiciones completas, no entradas/guarniciones).

3. **Acciones de plan para menú** (`src/data/planes.ts`): `elegirMenuComoEspecial` y `sumarMenuComoEnProceso`. Ambas crean planes con `tipoSeleccion: "menu"` y llaman a `sincronizarListaDesdeFirestore` post-creación. El campo `recetaPrincipal` recibe el nombre de la receta componente de tipo "Principal" (o primer obligatorio si no hay "Principal" explícito).

4. **Fix `detallePath` en Home** (`src/routes/Home.tsx`): resuelve el TODO de E3.3. Los planes con `tipoSeleccion === "menu"` ahora navegan a `/menus/:idSeleccion` en lugar de `/recetas/:idSeleccion`.

### 1.2.decies Cambios en v1.5.6 (E3.7 — pantalla de historial — cierra Etapa 3)

1. **`HistorialRoute`** (`src/routes/Historial.tsx`): lista de las 30 entradas más recientes (ordenadas por `fechaRealizadaTimestamp` desc). Buscador client-side con `normalizeText` (case-insensitive, normaliza acentos). Badge de resultado con color por etiqueta. Tapping navega a `/historial/:idHist`.

2. **`HistorialDetalleRoute`** (`src/routes/HistorialDetalle.tsx`): promedio grande + badge resultado, calificaciones de los 4 miembros (`null` se muestra "Sin voto" — correcto para E3.6 donde solo JP vota; se llenará en E4.2 sin cambios), comentarios (vacíos omitidos), datos del cocinero (campos vacíos omitidos), links a `/recetas/:id` o `/menus/:id` según `tipoSeleccion`.

3. **`src/data/historial.ts`**: `getHistorialReciente()` y `getHistorialPorId(idHist)` con wrapper `Result<T, AppError>`. La query de "últimas 30" solo usa `orderBy` + `limit` — no requiere índice compuesto adicional en Firestore.

4. **Eliminación de `voteAndCloseIfComplete`** (`src/data/planes.ts`): función creada en E2.2 como prototipo del flujo multi-miembro. Reemplazada en E3.6 por `guardarEvaluacionJP`. Eliminada en E3.7 como limpieza (código muerto — ningún componente la importaba). El flujo E4.2 usará la misma mecánica de transacción que `guardarEvaluacionJP`, no resucitará `voteAndCloseIfComplete`.

5. **Etapa 3 completa (ciclo principal)**: con E3.7 quedan implementadas las pantallas del ciclo principal: Home JP, Biblioteca (recetas + menús), Detalle receta, Detalle menú, Importar receta, Importar menú, Compras, Cocinar (guiada + scroll), Evaluar, Historial, Detalle historial. Las sub-etapas E3.4.7–E3.4.9 completaron la cadena de importación y catálogo; E3.4.8 agregó `/biblioteca/catalogo` (resolución de ingredientes ambiguos). **Cierre formal de Etapa 3: v1.6.0.**

### 1.2.undecies Cambios en v1.5.7 (E3.4.7 — normalización de unidades en el importador)

1. **`normalizarUnidad()` aplicada en el importador** (`src/routes/ImportarReceta.tsx`): el importador de recetas TXT ahora pasa todas las unidades por `normalizarUnidad()` antes de escribirlas en Firestore. Afecta dos puntos del paso 3 (guardado):
   - `IngredienteEnReceta.unidad`: si `normalizarUnidad(raw.unidad)` devuelve `null` (unidad vacía, "a gusto" o no reconocida), la clave `unidad` se **omite** del doc (spread condicional). Si devuelve string canónico, se escribe ese valor. Idéntico al criterio de las recetas seed tras E3.4.5.
   - `unidadesHabituales` del nuevo ingrediente de catálogo: también normalizado. Si devuelve `null`, se escribe array vacío.

2. **`textoOriginal` no se toca**: el campo sigue siendo la línea cruda que escribió JP. Solo el campo `unidad` (que va a Firestore) se normaliza.

3. **Unidad no reconocida → `null` + `console.warn`**: si JP escribe en el TXT una unidad que `normalizarUnidad` no reconoce, la función emite `console.warn` y devuelve `null`. La receta se importa igual, con esa unidad omitida (tratada como "a gusto"). El warn es la señal para ampliar la tabla de mappings en `src/lib/unidades.ts`.

4. **Cierre de deuda técnica**: a partir de E3.4.7 el importador no reintroduce unidades crudas en Firestore. Cualquier receta importada desde ahora agrupa correctamente con otras recetas de la misma lista de compras.

### 1.2.duodecies Cambios en v1.5.8 (E3.4.8 — catálogo rediseñado, 3 dimensiones)

1. **Modelo `Ingrediente` rediseñado** (`src/types/models.ts`):
   - `seccionDefault` eliminado — campo viejo que mezclaba la sección de receta con la sección de góndola.
   - `rolNutricional: string[]` — nuevo campo. Set de roles nutricionales del ingrediente ("Proteina", "Hidrato", "Grasa", "Fibra/Vegetal", "Azucar/Dulce", "Neutro"). Puede ser vacío (`[]`).
   - `seccionGondola: string` — nuevo campo. Sección del supermercado donde se compra el ingrediente. 9 valores canónicos (ver `src/lib/catalogo.ts`).
   - `categoriaOverride` eliminado de `IngredienteEnReceta` — la sección de góndola viene siempre del catálogo, no de la receta.

2. **Catálogo: 194 → 177 ingredientes**. Limpieza de duplicados y entradas "basura" (ingredientes nunca usados o mal cargados). Los IDs se renumeraron de ING-0001 a ING-0177. Todas las referencias en las 78 recetas se remapearon a los nuevos IDs. La renumeración es parte intencional del re-seed (`scripts/reseed-ingredientes.ts`), no una migración incremental.

3. **Tres listas canónicas** en `src/lib/catalogo.ts`:
   - `CATEGORIAS_INGREDIENTE` — 17 valores (qué ES el ingrediente): Verdura, Fruta, Carne, Pescado y marisco, Huevo, Lacteo, Fiambre y embutido, Cereal y derivado, Legumbre, Semilla y fruto seco, Hierba y especia, Condimento y aderezo, Aceite y grasa, Endulzante, Caldo y fondo, Despensa varios, Utensilio.
   - `ROLES_NUTRICIONALES` — 6 valores (qué APORTA): Proteina, Hidrato, Grasa, Fibra/Vegetal, Azucar/Dulce, Neutro. `Neutro` es excluyente.
   - `ORDEN_GONDOLA` — 9 secciones (DÓNDE se compra, en orden de recorrido del súper): Verduleria, Carniceria, Pescaderia, Fiambreria, Lacteos y frescos, Almacen / secos, Panaderia, Bazar / otros, Despensa / otros. Mismo array que ordena la lista de compras en la pantalla.

4. **Lista de compras agrupa por `seccionGondola`** (`src/data/compras.ts`, `src/routes/Compras.tsx`): `ItemCompra.categoria` renombrado a `seccionGondola`. El campo se popula desde `catalogo.seccionGondola` (no de la receta). La vista "Por categoría" renombrada a "Por góndola", ordena las secciones según `ORDEN_GONDOLA` (Verdulería primero, Despensa al final) — no alfabéticamente.

5. **Script de re-seed con validación** (`scripts/reseed-ingredientes.ts`): antes de escribir, valida que cada ingrediente tenga `categoria`, `seccionGondola` y `rolNutricional[]` con valores dentro de las listas canónicas. Valida que cada `idIngrediente` en recetas exista en el catálogo. Si hay un valor fuera de lista o referencia huérfana, aborta con error. Actualiza `/config/diccionarios` con las tres nuevas listas al final del seed.

6. **Ingredientes importados vía TXT** (`src/routes/ImportarReceta.tsx`): los nuevos ingredientes creados por el importador reciben `seccionGondola: "Despensa / otros"`, `rolNutricional: []`, `ambiguo: true` como valores por defecto. JP los completa en `/biblioteca/catalogo` (nueva pantalla `CatalogoIngredientesRoute`), que los lista y permite editar las tres dimensiones; al guardar, `ambiguo: false`.

7. **Edge case `Utensilio`**: el palito de brochette (`ING-???`) tiene `categoria: "Utensilio"` y `seccionGondola: "Bazar / otros"`. No es comestible — la lista de compras no filtra por comestibilidad, lo muestra en su sección igual que cualquier otro ítem.

### 1.2.terdecies Cambios en v1.5.9 (E3.4.9 — matcher con sugerencias y aprendizaje de sinónimos)

1. **Matcher rediseñado** (`src/lib/matcherIngredientes.ts`): algoritmo de 4 pasos. Resultado: `exacto | sugerencias | nuevo` (el anterior `"candidatos"` con similitud queda reemplazado).
   - **Paso 1 — exacto**: normalizar texto. Buscar contra `canonico` y cada `sinonimos[]`. Si hay → `exacto`, resuelto sin intervención.
   - **Paso 2 — prefijo de palabra**: tokenizar el texto en palabras. Un ingrediente es sugerencia si su `canonico` normalizado **o algún sinónimo normalizado** empieza con `"palabra "` o es igual a `"palabra"`. Distingue variantes reales ("arroz largo fino" para "arroz") de coincidencias espurias ("galletas de arroz"). El prefijo corre sobre los sinónimos también, lo que hace el matcher más robusto a medida que aprende.
   - **Paso 3 — fuzzy como respaldo**: trigramas con umbral 0.4, cubre typos ("arros" → variantes de arroz). Se suman sin duplicar con el Paso 2. Ambos pasos corren siempre.
   - **Paso 4 — ordenar**: unir Paso 2 + Paso 3, ordenar por `vecesUsado` descendente, desempate alfabético. La UI muestra top 3 + "ver más".

2. **Importador con loop humano** (`src/routes/ImportarReceta.tsx`): paso 2 rediseñado para `sugerencias`:
   - Si el matcher devuelve `exacto` → badge verde "✓ Exacto", resuelto.
   - Si devuelve `sugerencias` → botones seleccionables (top 3 visible, "ver más (N más)" despliega el resto). La opción "Crear nuevo ingrediente" siempre disponible al pie — JP puede insistir en crear uno nuevo aunque haya sugerencias.
   - Si devuelve `nuevo` → formulario de alta (nombre + categoría) como antes.

3. **Aprendizaje de sinónimos** — §9.6 cerrado: cuando JP elige una sugerencia, `agregarSinonimo(idElegido, textoTipeado)` se llama antes del guardado de la receta. El término normalizado se agrega a `sinonimos[]` del ingrediente elegido vía `arrayUnion` (idempotente). La próxima importación de ese término lo resuelve como `exacto` en el Paso 1 — sin volver a mostrar sugerencias.

4. **Edge case ING-0178 "Arroz"**: ingrediente genérico `ambiguo: true` creado antes de esta etapa. No se borra automáticamente — JP puede limpiarlo manualmente en Firebase Console o via `/biblioteca/catalogo`. Una vez aprendido "arroz" como sinónimo de "Arroz largo fino", el Paso 1 resuelve ese término directamente y el genérico queda como residuo inactivo.

### 1.2.quaterdecies Cambios en v1.6.1 (E4.1 — dashboard de miembro)

1. **`MemberDashboard`** (`src/routes/MemberDashboard.tsx`): pantalla de inicio para miembros no-JP. Secciones: saludo + semana, "Mi semana" (planes activos donde el miembro está en `asignaciones`, tiempo real), "Pendientes de evaluar" (planes `Cocinada` donde `votos[memberId]` es nulo), "Mi historial" (últimas 15 entradas de historial con mi puntaje).

2. **`subscribeToPlanesActivosMiembro`** (`src/data/planes.ts`): query realtime con triple filtro `semanaInicio == X AND estado IN activos AND asignaciones ARRAY_CONTAINS miembroId`. Requiere índice compuesto §5.3 (ya desplegado).

3. **`asignaciones` default = los 4 miembros**: todas las funciones de creación de planes (`elegirComoEspecial`, `sumarComoExtra`, `sumarComoEnProceso`, `elegirMenuComoEspecial`, `sumarMenuComoEnProceso`) pasan `asignaciones: [...MIEMBRO_IDS]`. Antes era `["juanpablo"]`. Backfill en planes activos via `scripts/backfill-asignaciones.ts`.

4. **`BottomNav` ramificado**: JP ve Inicio/Biblioteca/Compras/Historial; miembro ve Mi semana/Compras/Pendientes/Historial.

5. **Ruta `/pendientes`** (`src/routes/Pendientes.tsx`): redirige a `/` si el usuario es JP.

6. **Guarda `JPOnly`** en `src/App.tsx`: envuelve rutas exclusivas JP (`/menus/:id`). Redirige a `/` si el usuario no es `juanpablo`.

### 1.2.quindecies Cambios en v1.6.2 (E4.2 — voto distribuido)

1. **Voto distribuido**: los 4 miembros (JP incluido) votan en la misma pantalla `/voto/:idPlan`. Un voto = puntaje 1-10 + comentario. El plan cierra automáticamente cuando todos los miembros en `plan.asignaciones` tienen voto no nulo — **la condición lee de `asignaciones`, no hardcodea "4"**.

2. **`voteAndCloseIfComplete`** (`src/data/planes.ts`): función unificada para el voto de cualquier miembro. `runTransaction` única que: (a) valida `estado === "Cocinada"`, (b) valida que `miembroId ∈ plan.asignaciones`, (c) escribe el voto con dot-notation (`votos.${miembroId}`), (d) si todos los `asignaciones` ya votaron → llama al helper de cierre `_cerrarEvaluacion`. Si JP vota primero, `datosCocinero` se persiste aunque el plan todavía no cierre.

3. **`forzarCierreEvaluacion`** (`src/data/planes.ts`): cierre forzado solo para JP. `runTransaction` que llama a `_cerrarEvaluacion` con los votos presentes, sin exigir completitud.

4. **`_cerrarEvaluacion`** (helper interno de `planes.ts`): calcula `promedio` sobre votos no nulos, calcula `resultado` textual, escribe doc en `/historial`, actualiza `plan.estado = "Evaluada"`, incrementa `vecesCocinada` en recetas/menús. Compartido por `voteAndCloseIfComplete` y `forzarCierreEvaluacion`.

5. **`guardarEvaluacionJP` eliminada**: absorbida por `voteAndCloseIfComplete`. No hay wrapper de compatibilidad — ningún componente la importaba fuera de `Voto.tsx`.

6. **`Voto.tsx` reescrito** (`src/routes/Voto.tsx`): detecta el votante via `useAuth`. Precar­ga voto existente (editable mientras el plan esté `Cocinada`). Muestra `VotoProgress` (quién votó / quién falta, sin exponer puntajes ajenos). Solo JP ve `datosCocinero`, "Calificar componentes" y el botón "Cerrar evaluación ahora" (con confirmación inline que indica cuántos votos hay y cuántos faltan). Plan `Evaluada` → vista read-only con promedio, resultado y puntajes por miembro.

### 1.2.sedecies Cambios en v1.6.3–v1.6.4 (E4.3 — cocineros del plato, cierre Etapa 4)

**Semántica de `asignaciones`:** el campo significa **quiénes cocinan** el plato (1 a 4 personas). El voto lo siguen haciendo los 4 miembros siempre (E4.2); cocinar y votar son independientes.

1. **`actualizarAsignaciones(idPlan, nuevosCocineros)`** (`src/data/planes.ts`): `runTransaction` que (a) valida `estado !== "Evaluada"`, (b) valida `nuevosCocineros.length >= 1` y que cada id ∈ `MIEMBRO_IDS`, (c) escribe solo `{ asignaciones: nuevosCocineros }`. **No toca `votos` ni `comentariosPlan`** — el voto es independiente del cocinero. Devuelve `Result<void, AppError>`.

2. **Control en `PlanCard`** (`src/routes/Home.tsx`): sección "Quiénes cocinan este plato" siempre visible (lectura). Botón "Editar" solo si `isJP && plan.estado !== "Evaluada"`. Modo edición: checkboxes con los 4 miembros precargados; "Guardar" deshabilitado si ninguno tildado ("Tiene que cocinarlo al menos una persona"). Sin confirmación de votos (el voto no se toca). Se actualiza reactivamente via `onSnapshot`.

3. **Etapa 4 completa**: E4.1 (dashboard de miembro) + E4.2 (voto distribuido) + E4.3 (cocineros del plato) cubren el flujo multi-miembro de punta a punta.

### 1.2.septies Cambios en v1.6.5 (E4.2.1 — voto siempre de los 4 miembros)

**Problema corregido**: `voteAndCloseIfComplete` cerraba el plan cuando todos los miembros de `plan.asignaciones` (cocineros) habían votado, en lugar de cuando los 4 miembros siempre habían votado. Asignaciones y votantes son conceptos independientes desde E4.3.

1. **`voteAndCloseIfComplete`** (`src/data/planes.ts`): condición de cierre cambiada de `plan.asignaciones.every(...)` → `MIEMBRO_IDS.every(id => votosFinales[id] != null)`. **Siempre votan los 4**, independiente de quién cocina.

2. **Validación eliminada**: se quitó la validación `!plan.asignaciones.includes(miembroId)` que bloqueaba votar a miembros no cocineros. Cualquier miembro puede votar cualquier plan `Cocinada`.

3. **`VotoProgress`** (`src/routes/Voto.tsx`): la lista de votantes se muestra sobre `MIEMBRO_IDS` (siempre los 4), no sobre `plan.asignaciones`.

4. **`MemberDashboard`** (`src/routes/MemberDashboard.tsx`): cambiado de `subscribeToPlanesActivosMiembro` (filtra por `asignaciones array-contains`) a `subscribeToPlanesActivos` (todos los planes activos). "Mi semana" filtra client-side por `asignaciones.includes(memberId)` (quién cocina). "Pendientes de evaluar" filtra por `estado === "Cocinada" && !votos[memberId]` sobre **todos** los planes — cualquier miembro ve los planes que le falta evaluar, aunque no los cocine.

### 1.2.tervicies Cambios en v1.7.2 (E7.1 — campo fecha en el plan)

1. **Campo `fecha?: string`** agregado al tipo `Plan` (`src/types/models.ts`). Formato `"YYYY-MM-DD"`, consistente con `semanaInicio` y `semanaFin`. Opcional (`?`) — los planes existentes sin el campo son válidos ("sin día asignado").

2. **`asignarFechaPlan(idPlan, fecha)`** (`src/data/planes.ts`): función nueva. Valida que la fecha caiga dentro de `semanaInicio..getSemanaFin(semanaInicio)`. Pasar `null` borra el campo (`deleteField()`). Devuelve `Result<void, AppError>`. No toca ningún otro campo del plan. Las 5 funciones de creación no se modificaron — un plan nace sin día.

3. **UI de asignación pendiente**: el selector de día y el `WeekStrip` que lo muestran llegan con el rediseño de Home (handoff v2, prompt aparte). E7.1 solo prepara el dato.

4. **Migración**: no-op. Los planes existentes sin `fecha` son válidos; ninguna pantalla asume que el campo existe.

### 1.2.duovicies Cambios en v1.7.1 (E6.1.1 — splash iOS + E6.2 en espera)

1. **Splash screens de iOS activadas** (`index.html`): 9 etiquetas `<link rel="apple-touch-startup-image">` con `media` queries, una por resolución de iPhone. Dimensiones de cada PNG verificadas contra las especificaciones del dispositivo — todas coinciden. Cubre modelos 8/7/SE hasta 15 Pro Max y 16 estándar/Plus. **Sin cobertura**: iPhone 16 Pro (402×874 @3x) y 16 Pro Max (440×956 @3x) — caen al `background_color: #fdfaf6` del manifest.

2. **`public/splash/splash-square-{1024,2048}.png`** — huérfanos: no referenciados en manifest ni en `index.html`. Son assets que la herramienta de generación produjo de más (1024 = tamaño App Store icon; 2048 = master de alta resolución). JP decide si borrarlos.

3. **E6.2 — push notifications**: en espera de decisión de JP. Ver §7.6.

### 1.2.unvicies Cambios en v1.7.0 (E6.1 — PWA instalable)

1. **PWA instalable** — la app puede instalarse en Android (Chrome) e iOS (Safari "Agregar a pantalla de inicio") y abre en modo standalone (sin barra de URL) con el ícono marrón de marca.

2. **`public/manifest.json`** — ya estaba en el repo (generado por JP). Campo `theme_color: "#8a4a2f"`, `background_color: "#fdfaf6"`, 8 íconos en `public/icons/` (16, 32, 48, 180, 192×2, 512×2 — any + maskable). No se tocó.

3. **Service worker — `vite-plugin-pwa` v1.x** (`vite.config.ts`): generado con Workbox vía `generateSW`. `manifest: false` → usa el `public/manifest.json` existente, sin duplicarlo. `registerType: 'autoUpdate'` → el SW se actualiza en background; próxima apertura recibe la versión nueva. Precachea el shell estático (JS/CSS/HTML/íconos). `navigateFallback: 'index.html'` → la app abre offline aunque no haya red. `navigateFallbackDenylist: [/^\/__\//]` → excluye rutas de Firebase Auth redirect.

4. **La persistencia offline de Firestore sigue intacta** — el SW no intercepta peticiones a `firestore.googleapis.com` (cross-origin sin configuración explícita). El SDK sigue manejando su propio cache (enableIndexedDbPersistence, §6.4).

5. **`index.html`**: reemplazó `favicon.svg` por los links PNG (16/32/48 + apple-touch-icon), `<link rel="manifest">`, `<meta name="theme-color">`, metas iOS standalone. `public/favicon.svg` eliminado.

6. **Color de marca corregido en §8**: el color vigente es **`#8a4a2f`** (marrón cálido). El `#8a4a2f` que aparecía en §8 era el color del design system original de Apps Script — quedó desactualizado cuando JP eligió la paleta final. Corregido.

### 1.2.vicies Cambios en v1.6.8 (E5.2 — canonización de proteínas)

**Problema**: la lista `proteinaPrincipal` estaba desincronizada en cuatro lugares. `models.ts` tenía 13 valores (la fuente de verdad), pero `/config/diccionarios.proteinas`, el seed del importador y 4 recetas en Firestore usaban solo 10 (faltaban `Fiambre`, `Semillas`, `Frutos secos` — agregados en E3.4.8 sin propagar).

1. **F1+F2 — 4 recetas corregidas** (`scripts/fix-proteinas-recetas.ts`): tres recetas con proteínas compuestas (`"Pollo y Vacuna"`, `"Huevos y semillas"`, `"Huevos y Pescado"`) actualizadas a `"Mixta"`; una receta con `"Frutas"` actualizada a `"Vegetariana"`. La receta `"Frutas"` era `REC-1409` ("Crema helada de frutilla y coco sin leche").

2. **F3 — `/config/diccionarios.proteinas` → 13 valores** (`scripts/fix-diccionarios-proteinas.ts`): el array `proteinas` del doc `/config/diccionarios` reemplazado por los 13 valores canónicos en el orden de `models.ts`. Idempotente.

3. **F4 — seed del importador corregido** (`scripts/seed-config-importador.ts`, línea 45): la línea del prompt modelo que lista `proteinaPrincipal` actualizada de 10 a 13 valores. **JP debe re-correr el seed** después de borrar (o la app nunca va a recibir el prompt actualizado, porque el seed es idempotente y no sobreescribe). Ver instrucción en §7.5.

4. **`scripts/seed-data/recetas.json` actualizado** con los mismos 4 fixes para mantener el seed local en sintonía con Firestore.

5. **Lista de 13 proteínas canónicas** (fuente de verdad: `src/types/models.ts → PROTEINAS`):
   `Vacuna, Cerdo, Pollo, Cordero, Pescado, Mariscos, Huevos, Fiambre, Legumbres, Semillas, Frutos secos, Mixta, Vegetariana`.

6. **Auditoría D6 — 19 recetas `"Vegetariana"`** (propuesta sin write, ver E5.2.1): de las 19 recetas con `proteinaPrincipal: "Vegetariana"` (18 originales + REC-1409 migrada), 3 candidatas a re-clasificar: REC-0401 → `"Semillas"`, REC-0204 → `"Frutos secos"`, REC-1407 → `"Frutos secos"`, REC-1507 → `"Huevos"`. El resto queda `"Vegetariana"`. JP revisa la tabla en E5.2.1.

### 1.2.undevicies Cambios en v1.6.7 (E5.1 — botón Copiar prompt para LLM, cierre Etapa 5)

**Contexto**: el importador de recetas TXT ya existía desde E3.4.6/7/9. La única pieza pendiente de §7.5 era el botón "Copiar prompt para LLM". E5.1 la completa. **La Etapa 5 queda cerrada.**

1. **`/config/importador`** — nuevo doc Firestore: campo `promptLLM` (string) con el prompt modelo que JP copia para pegarle a un LLM externo junto con una receta en prosa. El LLM devuelve el TXT con el formato exacto que el parser del importador entiende. Sembrado con `scripts/seed-config-importador.ts` (idempotente — no sobreescribe si el campo ya existe). JP puede editar el campo desde la consola de Firebase sin tocar código.

2. **`getPromptLLM()`** (`src/data/config.ts`): lee `/config/importador.promptLLM` con cache en memoria. Mismo patrón que `getDiccionarios()`. Devuelve string vacío si el doc no existe, sin romper la pantalla.

3. **Botón "Copiar prompt para LLM"** (`src/routes/ImportarReceta.tsx`, `RenderPaso1`): visible en el paso 1 si el prompt fue cargado. Copia al portapapeles con `navigator.clipboard.writeText`. Feedback visual "Copiado ✓" por 2.5 s. Incluye nota de advertencia: el prompt está acoplado al formato del parser — editarlo mal puede hacer fallar las importaciones.

4. **C4 — edición del prompt desde la app**: no implementado. JP edita el campo `promptLLM` directamente desde la consola de Firebase. Deuda anotada en §10.

5. **Deuda `security.rules`**: el doc `/config/importador` está cubierto por la regla `match /config/{docId}` existente (read = familia; write = owner = JP). Sin cambios en las rules.

### 1.2.duodevicies Cambios en v1.6.6 (E4.4 — guard de cocinar por asignaciones)

**Problema resuelto**: las rutas de cocinar no tenían guard de acceso. Un miembro no asignado a un plan podía navegar directamente a `/planes/:idPlan/cocinar/:idReceta` o `/planes/:idPlan/componentes` y ejecutar `marcarCocinada`. Ahora el acceso está controlado por `plan.asignaciones`, consistente con el dashboard (E4.1) y la lista de compras (E4.2).

1. **Guard en `CocinarRoute`** (`src/routes/Cocinar.tsx`): en modo plan (cuando la URL tiene `idPlan`), después de cargar el plan, se verifica que el usuario sea JP **o** su `memberId` esté en `plan.asignaciones`. Si no cumple → `<Navigate to="/" replace />`. En modo libre (`/recetas/:id/cocinar`) el guard no aplica — no hay plan ni escritura en Firestore al finalizar.

2. **Guard en `SeleccionarComponenteMenuRoute`** (`src/routes/SeleccionarComponenteMenu.tsx`): mismo check después de cargar el plan. Cubre el botón "Finalizar menú" (que llama a `marcarCocinada`).

3. **Reutilización de la carga del plan**: ambas pantallas ya cargaban el plan con `getPlan(idPlan)`. El guard usa esa carga — no hay lectura extra a Firestore.

4. **"Marcar Cocinada" cubierta**: las llamadas a `marcarCocinada` en ambas pantallas quedan protegidas por el guard que precede al render. No se necesita control adicional.

5. **`/voto/:idPlan` no tocado**: la ruta de voto sigue abierta a los 4 miembros siempre (E4.2). El guard de cocinar no la roza.

6. **Deuda anotada (no implementada)**: un enforcement real de estas restricciones iría en `firestore.rules` — hoy la barrera vive solo en cliente, consistente con el resto de la app (ver §3.6).

### 1.2.ter Cambios en v1.3 (realtime + offline)

1. **Realtime nativo** en planes activos y compras vía `onSnapshot`. Cuando María tilda "Ya tengo" desde su celu, JP lo ve al toque sin refrescar. El cambio de estado de un plan (Elegida → Compra pendiente → Cocinada) se propaga en vivo. Esto reemplaza el "refresh manual" que aplicaba en v1.2.

2. **Offline persistence del SDK** habilitado en `src/firebase.ts` con `enableIndexedDbPersistence()`. La app funciona en el super sin señal: leer recetas/lista de compras, tildar items. Sincroniza al volver la red.

3. **Hooks genéricos** del data layer: `useDoc<T>(ref)`, `useCollection<T>(ref, queryConstraints?)`, `useCollectionRealtime<T>(ref, queryConstraints?)`. Cubren el 80% de los componentes; el resto consume funciones puras directas.

4. **§9.9 promovido a §6.8**: realtime ya no es "futuro", se implementa desde E2.2.

5. **Manejo de errores diferenciado**: reads tiran excepciones (capturadas por error boundary genérico); writes devuelven `Result<T, Error>` para feedback explícito al usuario.

6. **`runTransaction` del voto**: se creó en E2.2 como prototipo bajo el nombre `voteAndCloseIfComplete`. Fue reemplazado en E3.6 por `guardarEvaluacionJP` (flujo JP-first) y eliminado en E3.7 como código muerto. En E4.2 se reimplementó `voteAndCloseIfComplete` con voto distribuido completo (ver §3.7 y §1.2.quindecies). `guardarEvaluacionJP` fue eliminada.


### 1.3 Volumen de seeds a migrar

| Entidad | Cantidad | Origen |
|---|---|---|
| Recetas | 78 | `CS_SEED_RECETAS_COMPLETAS` |
| Ingredientes (filas) | 177 (renumerados ING-0001–ING-0177 en E3.4.8; eran ~194 antes de limpieza) | `scripts/seed-data/catalogo_ingredientes.json` |
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
      unidad: "kg",                  // forma canónica según normalizarUnidad() — ver §2.7 y src/lib/unidades.ts
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
- **`ingredientes[].unidad` es siempre canónica** a partir de la migración E3.4.5 (2026-05-23). El campo almacena la salida de `normalizarUnidad()` — singular, minúscula, sin plurales (`"cda"` no `"cdas"`, `"diente"` no `"dientes"`). El valor `null` se guarda omitiendo la clave (Firestore Admin rechaza `undefined`); significa "a gusto". `textoOriginal` sigue siendo el string crudo de la receta.

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

  asignaciones: ["juanpablo","maria","sofia","federico"], // default = los 4 (E4.1). Subconjunto posible en E4.3.

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
| `listaComprasId` | Cuando se sincroniza la lista | `sincronizarListaDesdeFirestore` |
| `origen` | Solo en Especial extra: `"extra:<idPadre>"` | `agregarExtraAEspecial` |
| `componentesCocinados` | Solo en plan-menú, al cocinar componentes | `marcarComponenteCocinado` |
| `votos`, `comentariosPlan` | Cuando algún miembro vota | `guardarVoto` |
| `datosCocinero` | Solo JP, al evaluar | `guardarVoto` (si miembro === juanpablo) |

**Campo adicional en plan-menú (v1.5.1):**

```typescript
componentesCocinados?: string[]   // array de idReceta ya cocinados; solo existe en plan-menú
fecha?: string                    // "YYYY-MM-DD" — día asignado al plan (E7.1); opcional
                                  // debe caer dentro de semanaInicio..semanaFin
                                  // varios planes pueden compartir día (sin unicidad)
                                  // planes viejos sin el campo son válidos ("sin día")
                                  // UI de asignación llega con el rediseño de Home
```

**`asignarFechaPlan(idPlan, fecha)` (E7.1, `src/data/planes.ts`):** actualiza solo el campo `fecha`. Valida que la fecha caiga dentro de la semana del plan. Pasar `null` borra el campo con `deleteField()`. No valida unicidad de día.

**Auto-transición de estado (v1.5.1):** la transición `Compra pendiente → Compra lista` no es manual — la dispara `toggleItemYaTengo` al tildar el último ítem de ese plan. Si JP destilda un ítem, el plan retrocede a `Compra pendiente`. La transición contraria (`Compra lista → Cocinada`) es explícita: para plan-receta, botón "Finalizar cocción" en la pantalla de cocinar; para plan-menú, botón "Finalizar menú" en `SeleccionarComponenteMenu` (v1.5.3). `marcarComponenteCocinado` avanza el plan solo a `"Cocinando"`, nunca a `"Cocinada"`.

---

### 2.5 `/compras/{idLista}` + `/compras/{idLista}/items/{itemId}` — Lista de compras

**Doc raíz `compras/{idLista}`:**

```typescript
{
  idLista: "LST-SEM-20260518-180000",
  fechaGeneracion: Timestamp,
  semanaInicio: "2026-05-18",
  // Contadores denormalizados (top-level, no anidados en "resumen"):
  totalItems: 47,
  totalYaTengo: 12,
  totalPendientes: 35
}
```

> **Nota v1.5.1:** el campo `resumen` que figuraba en versiones anteriores del MAPEO no existe en producción. Los contadores son campos top-level (`totalItems`, `totalYaTengo`, `totalPendientes`). Se actualizan en cada `toggleItemYaTengo`, cada sync, y cada `limpiarAportesDelPlan`.

**Subcollection `compras/{idLista}/items/{itemId}`:**

```typescript
{
  id: "auto-id",                           // string — se setea igual al doc ID al crear
  idIngrediente: "ING-0042",              // referencia al catálogo /ingredientes
  nombrePreferido: "Cebolla",             // snapshot del catálogo al momento de la sync
  seccionGondola: "Verduleria",           // del catálogo (seccionGondola) — 9 valores canónicos
  cantidadTotal: 3,                       // suma de aportes
  cantidadLabel: "3 u",                   // "${cantidadTotal} ${unidad}".trim() o "a gusto"
  unidad: "u",                            // unidad canónica
  opcional: false,                        // false si AL MENOS UN aporte es opcional=false

  yaTengo: false,                         // toggle del usuario

  // Trazabilidad — qué recetas/planes contribuyeron a este item:
  aportes: [
    {
      idPlan: "PLAN-20260518-...",
      idReceta: "REC-0001",              // siempre poblado (nunca vacío ni undefined)
      nombreReceta: "Bondiola braseada al Malbec",
      textoOriginal: "2 cebollas grandes",  // texto tal cual está en la receta
      tipoAporte: "receta",              // "receta" | "alternativa"
      cantidad: 2,
      unidad: "u"
    },
    {
      idPlan: "PLAN-20260518-...",
      idReceta: "REC-0201",
      nombreReceta: "Berenjenas grilladas con criolla y oliva",
      textoOriginal: "1 cebolla",
      tipoAporte: "receta",
      cantidad: 1,
      unidad: "u"
    }
  ],

  notas: "Cortadas grandes | Para la criolla"  // notas combinadas de las recetas
}
```

**Limpieza al cocinar (v1.5.1):**

`limpiarAportesDelPlan(idLista, idPlan, soloIdReceta?)` en `src/data/compras.ts`:
- Remueve los aportes donde `aporte.idPlan === idPlan` (y opcionalmente `aporte.idReceta === soloIdReceta`).
- Si el ítem queda sin aportes → se elimina.
- Si quedan aportes → se recalcula `cantidadTotal` y `cantidadLabel`.
- Los contadores del doc raíz se recalculan y actualizan.
- Todo en un batch atómico.

Se llama desde `marcarCocinada` (limpieza total del plan) y desde `marcarComponenteCocinado` (limpieza por componente de menú).

**Cómo funciona la sumabilidad:**

1. Al sincronizar, para cada plan activo, se levantan sus ingredientes.
2. Cada ingrediente se canonicaliza: `ingredienteCanonico = normalize(ingrediente)`.
3. La unidad se normaliza: `unidadCanonica = normalizarUnidad(ing.unidad)` (ver `src/lib/unidades.ts`).
4. La **clave de agrupado** es `"${idIngrediente}__${unidadCanonica ?? 'agusto'}"`. Si ya existe un item con esa clave, **se acumula** en `cantidadTotal` y se agrega un nuevo aporte a `aportes`.
5. Si no existe, se crea un nuevo item. El campo `unidad` del item almacena `unidadCanonica ?? ""`.
6. `cantidadLabel` se regenera: `${cantidadTotal} ${unidad}`.

> **Post E3.4.5:** tanto la clave de agrupado como la comparación de preservación de `yaTengo` usan `normalizarUnidad()`. Esto resuelve el bug donde `"cda"` y `"cdas"` (misma unidad, distinto string) generaban dos ítems para el mismo ingrediente.

**Vista del usuario:**

- Vista resumida (default): un solo renglón "Cebolla — 3 unidades" con badge "+2 recetas".
- Vista expandida (al tap): "Cebolla — 3 unidades:" + sublistado de aportes ("• 2 para Bondiola" / "• 1 para Berenjenas").

Esto es **una mejora real sobre Apps Script** (ver §6.1).

---

### 2.6 `/historial/{idHist}` — Historial de evaluaciones

**Shape:**

```typescript
{
  idHist: "HIST-20260524123456-3401",      // generado por proximoIdHistorial() — HIST-YYYYMMDDHHmmss-XXXX
  fechaRealizada: "2026-05-24",            // ISO date
  fechaRealizadaTimestamp: Timestamp,      // Timestamp.now() — para orderBy desc

  // Referencia:
  idPlan: "PLAN-20260524-...",
  idReceta: "REC-0001" | "",               // vacío si tipoSeleccion === "menu"
  idMenu: "" | "MENU-0001",                // vacío si tipoSeleccion === "receta"
  receta: "Bondiola braseada al Malbec",   // nombre snapshot (para historial robusto)
  tipoSeleccion: "receta",
  idSeleccion: "REC-0001",
  nombreSeleccion: "Bondiola braseada al Malbec",
  semanaInicio: "2026-05-18",

  // Ocasión:
  ocasion: "Cena familiar",

  // Votos individuales (snapshot al cerrar evaluación):
  // En E3.6 solo vota JP; los otros 3 quedan null — correcto y esperado.
  // En E4.2, todos votarán y null desaparecerá. NO tratar null como 0.
  calificaciones: {
    juanpablo: 8,
    maria: null,
    sofia: null,
    federico: null
  },
  comentarios: {
    juanpablo: "...",
    maria: "",
    sofia: "",
    federico: ""
  },

  // Cálculos automáticos:
  promedio: 8,                             // calculado sobre votos no nulos (ver §3.4); con JP solo = su puntaje
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
              "Mariscos", "Huevos", "Fiambre", "Legumbres", "Semillas",
              "Frutos secos", "Mixta", "Vegetariana"],
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

  // Catálogo de ingredientes — tres dimensiones (E3.4.8):
  categoriasIngrediente: ["Verdura", "Fruta", "Carne", "Pescado y marisco", "Huevo", "Lacteo",
                           "Fiambre y embutido", "Cereal y derivado", "Legumbre", "Semilla y fruto seco",
                           "Hierba y especia", "Condimento y aderezo", "Aceite y grasa", "Endulzante",
                           "Caldo y fondo", "Despensa varios", "Utensilio"],
  rolesNutricionales: ["Proteina", "Hidrato", "Grasa", "Fibra/Vegetal", "Azucar/Dulce", "Neutro"],
  seccionesGondola: ["Verduleria", "Carniceria", "Pescaderia", "Fiambreria", "Lacteos y frescos",
                     "Almacen / secos", "Panaderia", "Bazar / otros", "Despensa / otros"],

  // Unidades canónicas (claves para sumabilidad) — actualizado en E3.4.5 (2026-05-23):
  unidadesCanonicas: ["g", "kg", "ml", "l", "unidad", "cda", "cdita", "taza", "pizca",
                      "punado", "diente", "rama", "ramita", "grande", "lata", "bife", "feta", "hoja", "atado"],
  // Tabla completa de normalizaciones en src/lib/unidades.ts.
  // null (ausencia de la clave "unidad") = "a gusto".

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

### 2.10 `/ingredientes/{idIngrediente}` — Catálogo de ingredientes

**Shape (177 docs tras E3.4.8; IDs ING-0001 a ING-0177):**

```typescript
{
  idIngrediente: "ING-0001",           // doc ID, ING-XXXX (4 dígitos)
  canonico: "abadejo",                 // normalizeText(nombrePreferido) — clave anti-dup
  nombrePreferido: "Abadejo",          // nombre canónico de display

  sinonimos: ["bacalao fresco"],        // array de strings normalizados (puede ser vacío)

  // Tres dimensiones del catálogo rediseñado (E3.4.8):
  categoria: "Pescado y marisco",      // qué ES — 17 valores (ver CATEGORIAS_INGREDIENTE)
  rolNutricional: ["Proteina"],        // qué APORTA — set, 6 valores, puede ser []
  seccionGondola: "Pescaderia",        // DÓNDE se compra — 9 valores (ver ORDEN_GONDOLA)

  unidadesHabituales: ["g"],           // unidades típicas de este ingrediente (normalizado)
  vecesUsado: 1,                       // contador incremental al usar en receta
  ambiguo: false,                      // true = ingresado por importador, dimensiones pendientes

  origen: "seed",                      // "seed" | "import" | "manual"
  fechaCreacion?: Timestamp,
  ultimaModificacion?: Timestamp
}
```

**Campos eliminados en E3.4.8:**
- `seccionDefault` — mezclaba sección de receta con sección de góndola. Reemplazado por `seccionGondola`.
- `categoriaOverride` en `IngredienteEnReceta` — la sección de góndola viene siempre del catálogo.

**`ambiguo: true` — flujo de completado:**
Los ingredientes creados por el importador de recetas TXT reciben `ambiguo: true` con valores de fallback (`seccionGondola: "Despensa / otros"`, `rolNutricional: []`). JP los revisa en `/biblioteca/catalogo` (`CatalogoIngredientesRoute`): edita las tres dimensiones y guarda → `ambiguo: false`.

**Nota `Utensilio`:** el palito de brochette tiene `categoria: "Utensilio"`, `seccionGondola: "Bazar / otros"`. No es comestible — la lista de compras no filtra por comestibilidad y lo muestra en su sección como cualquier ítem.

---

## 3. Invariantes y validaciones de negocio

### 3.1 Ciclo de estados del plan

```
[CREACIÓN]
   │
   ▼
Elegida ──────────► Compra pendiente ◄──► Compra lista ──► Cocinada ──► Evaluada
                    (al crear lista)      (auto: todos      (botón JP    (4to voto
                                          los ítems         o miembro)    o JP solo)
                                          yaTengo=true)                       │
                                                                          [FINAL]
[DESCARTAR] permitido solo en estados activos
   │
   ▼
[BORRADO del doc]
```

**Invariantes (v1.5.1):**

1. **No hay retroceso de estado** desde `Cocinada`. Una vez `Cocinada`, no vuelve a `Compra lista`.
2. **`Evaluada` es terminal.** No se puede editar nada del plan en `Evaluada`.
3. **Descartar = borrar el doc.** No existe estado `Descartada`.
4. **Cascada al descartar Especial:** se borran todos sus `Especial extra` activos.
5. **`Cocinada` con extras:** al marcar Especial como `Cocinada`, modal pregunta si también marcar extras activos.
6. **Sincronización auto-avance:** al crear/sincronizar la lista, todo plan `Elegida` pasa a `Compra pendiente`. Si los ítems ya tenían `yaTengo: true` preservados de syncs anteriores, el plan puede avanzar directamente a `Compra lista` en el mismo batch. La sync nunca baja estados superiores.
7. **Auto-transición `Compra pendiente` ↔ `Compra lista` (v1.5.1):** al tildar el último ítem del plan (`yaTengo: true`), el plan avanza automáticamente a `Compra lista` dentro del mismo batch. Si JP destilda cualquier ítem, el plan retrocede automáticamente a `Compra pendiente`. La lógica está en `evaluarEstadosPlanesEnBatch` (no exportada), llamada desde `toggleItemYaTengo` y `sincronizarListaDesdeFirestore`.
8. **Botón "Cocinar" no bloqueante (v1.5.1):** el botón aparece desde `Compra pendiente` (no requiere `Compra lista`). El estado es informativo, no un gate de acceso al flujo de cocinar.
9. **`Cocinada` limpia la lista (v1.5.1):** al marcar un plan como `Cocinada`, `limpiarAportesDelPlan` remueve todos los aportes de ese plan de la lista de compras. Los ítems sin aportes restantes se borran. Para plan-menú: la limpieza es granular por componente — cada `marcarComponenteCocinado` limpia solo los aportes de esa receta.

### 3.2 Reglas anti-duplicado de planes

| Tipo | Regla |
|---|---|
| Especial | **Máximo 1 activa por semana**. Al elegir otra, se descarta la anterior (con cascada de extras). |
| Especial extra | Sin límite, pero **no se puede agregar como extra una receta que ya es la Especial**, que ya es otro extra activo del mismo padre, **ni una receta con `tipoItem === "Receta principal"`** (esas van como Especial). |
| En proceso | Sin límite, pero **no duplicar `(tipoSeleccion, idSeleccion)` en cualquier plan activo de la semana** — incluyendo Especial, Especial extra y otros En proceso. Una receta ya activa esta semana no puede sumarse de nuevo como En proceso. |

### 3.3 Reglas de elegibilidad

**Cambio en v1.2**: ya no existe `tipoItem === "Componente"` ni el campo `elegibleSemana`. Todas las recetas son elegibles dentro de las siguientes reglas:

- **Especial de la semana**: solo recetas con `tipoItem === "Receta principal"`. Esto evita elegir como Especial una entrada, postre o panificado.
- **Especial extra**: cualquier receta **que no sea `"Receta principal"`** (esas van como Especial), excepto además la que ya es la Especial activa o ya es otro extra del mismo padre (anti-dup, §3.2). _(Precisado en E3.3.1.)_
- **En proceso**: cualquier receta **que no esté ya activa esta semana** en otro plan (Especial, Especial extra u otro En proceso). _(Precisado en E3.3.1.)_
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

`promedio` se calcula sobre los **votos no nulos** presentes: `Math.round((suma_votos_no_nulos / cantidad_votos_no_nulos) * 10) / 10` (1 decimal). Con un solo votante (JP en E3.6) da el puntaje directo. Con los 4 votantes (E4.2) da el promedio de 4. La fórmula no cambia entre etapas.

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
- No modificar asignaciones (cocineros) de un plan `Evaluada` (validado en `actualizarAsignaciones` con `TransactionAbort`).
- Desasignar a un cocinero **no toca su voto** — el voto lo hacen los 4 miembros siempre (E4.2).

### 3.7 Atomicidad del voto + cierre

El voto + cierre se hace en **una sola transacción** del cliente Firestore (`runTransaction`). Implementado en E4.2 como `voteAndCloseIfComplete` + helper interno `_cerrarEvaluacion`.

**Funciones (`src/data/planes.ts`):**

- **`voteAndCloseIfComplete(idPlan, miembroId, puntaje, comentario, datosCocinero?, puntajesComponentes?)`**: voto de cualquier miembro (siempre los 4, independiente de asignaciones). Si al agregar el voto **todos los `MIEMBRO_IDS`** tienen voto no nulo → cierra automáticamente llamando a `_cerrarEvaluacion`. (Corrección E4.2.1: antes usaba `plan.asignaciones.every`; ahora usa `MIEMBRO_IDS.every`.)
- **`forzarCierreEvaluacion(idPlan)`**: solo para JP. Cierra con los votos presentes, sin exigir completitud.
- **`_cerrarEvaluacion(tx, planRef, plan, votos, comentarios, datosCocinero, puntajesComponentes?)`**: helper interno compartido. Calcula promedio/resultado, escribe historial, actualiza estado, incrementa `vecesCocinada`.

**Pasos dentro de `runTransaction` (`voteAndCloseIfComplete`):**

1. `tx.get(planRef)` → leer estado actual.
2. Validar `plan.estado === "Cocinada"` (si no, `throw new TransactionAbort(...)` con mensaje claro).
3. Calcular `votosFinales = { ...plan.votos, [miembroId]: puntaje }`.
4. Si `miembroId === "juanpablo"` y vino `datosCocinero`: guardarlo. Si no, conservar `plan.datosCocinero` existente.
5. `votantesCompletos = MIEMBRO_IDS.every(id => votosFinales[id] != null)` — **siempre los 4, independiente de `asignaciones`**.
6a. Si `votantesCompletos` → llamar `_cerrarEvaluacion` dentro de la misma tx → retornar `{ cerrado: true, promedio, resultado }`.
6b. Si no → `tx.update(planRef, { 'votos.${miembroId}': puntaje, 'comentariosPlan.${miembroId}': comentario, … })` → retornar `{ cerrado: false }`.

**Pasos dentro de `_cerrarEvaluacion`:**

1. Calcular `promedio` (sobre votos no nulos, ver §3.4) y `resultado` (ver tabla §3.4).
2. `tx.set(historialRef, { …snapshot del plan, calificaciones, comentarios, promedio, resultado, … })`.
3. `tx.update(planRef, { estado: "Evaluada", votos: votosFinales, comentariosPlan: comentariosFinales, … })`.
4. Incrementar `vecesCocinada`:
   - Plan-receta: `tx.update(recetaRef, { vecesCocinada: increment(1), ultimaEvaluacion: Timestamp.now(), ultimoPuntaje: promedio })`.
   - Plan-menú: `tx.update(menuRef, { vecesCocinada: increment(1) })` + por cada `idReceta` en `plan.componentesCocinados`: `tx.update(recetaRef, { vecesCocinada: increment(1), ...(puntajesComponentes[id] ? { ultimoPuntaje: puntajesComponentes[id] } : {}) })`.

El uso de `increment(1)` es seguro ante reintento de transacción — Firestore aplica el incremento una sola vez por commit.

Si la transacción aborta (por concurrencia), Firestore reintenta automáticamente con el estado refrescado.

**Nota sobre `guardarEvaluacionJP`**: existió en E3.6/E3.7. Eliminada en E4.2 — su lógica fue absorbida por `voteAndCloseIfComplete`.

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

| Pantalla (Apps Script) | Ruta React | Modo JP | Modo miembro | Estado |
|---|---|---|---|---|
| `home` | `/` | ✅ | stub | ✅ E3.1 |
| `recetas` (biblioteca) | `/biblioteca` | ✅ | ❌ | ✅ E3.2 |
| `detalle receta` | `/recetas/:id` | ✅ | ✅ | ✅ E3.3 |
| `cocinar (libre)` | `/recetas/:id/cocinar` | ✅ | ✅ | ✅ E3.5 |
| `cocinar (plan)` | `/planes/:idPlan/cocinar/:idReceta` | ✅ | ✅ solo asignados (E4.4) | ✅ E3.5 |
| `importar receta` | `/biblioteca/importar` | ✅ | ❌ | ✅ E3.4.6 |
| `menus` (biblioteca tab) | `/biblioteca?tab=menus` | ✅ | ❌ | ✅ E3.2 |
| `menuDetalle` | `/menus/:id` | ✅ | ❌ | ✅ v1.5.5 |
| `menuImportar` | `/menus/importar` | ✅ | ❌ | ✅ E2.5 |
| `componentes menú` | `/planes/:idPlan/componentes` | ✅ | ✅ solo asignados (E4.4) | ✅ E3.5 |
| `compras` | `/compras` | ✅ | ✅ | ✅ E3.4 |
| `catálogo de ingredientes` | `/biblioteca/catalogo` | ✅ | ❌ | ✅ E3.4.8 |
| `voto` / `evaluar` | `/voto/:idPlan` | ✅ | ✅ E4.2 | ✅ E3.6 |
| `historial` | `/historial` | ✅ | ✅ | ✅ E3.7 |
| `historial detalle` | `/historial/:idHist` | ✅ | ✅ | ✅ E3.7 |
| `dashboard miembro` | `/` (modo miembro) | ✅ | ✅ | ✅ E4.1 |
| `pendientes` | `/pendientes` | ✅ | ✅ | ✅ E4.1 |

### 5.2 Queries por pantalla

> **Nota v1.3 — realtime vs snapshot**: los ejemplos siguientes usan `getDocs`/`getDoc` por claridad, pero en la práctica las queries de **planes activos de la semana actual** y **items de la lista de compras activa** usan `onSnapshot` (hook `useCollectionRealtime`). El resto (recetas, menús, historial, config) usa `getDocs`/`getDoc` (hooks `useCollection`/`useDoc`).
>
> Regla simple: si el dato se edita en simultáneo por varios miembros → `onSnapshot`. Si cambia poco o solo en respuesta a acciones del usuario → snapshot único.
>
> El SDK tiene **offline persistence** activada (`enableIndexedDbPersistence`), así que los snapshots se sirven desde IndexedDB cuando no hay red. Las escrituras quedan en cola y se aplican al reconectar.

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

**Normalización de unidades (v1.5.2):** antes de comparar, la unidad cruda se normaliza con `normalizarUnidad()` (`src/lib/unidades.ts`). Así, `"cda"` y `"cdas"` son la misma clave de agrupado. Si la unidad normalizada es `null` (a gusto), la clave es `"${idIngrediente}__agusto"`. La tabla de normalizaciones vive en `src/lib/unidades.ts`; para agregar una variante nueva, extender `TABLA` ahí.

**Regla de unidades:** si `normalizarUnidad(unidad)` difiere entre aportes, NO sumamos. "1 cebolla (a gusto)" + "200g cebolla" → dos renglones.

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

### 6.8 Realtime en planes activos y compras (v1.3) 🆕

Antes: cada miembro veía la lista pero las marcas "Ya tengo" se sincronizaban solo al refrescar; los cambios de estado de un plan también requerían refresh.

Ahora: `useCollectionRealtime` (hook genérico del data layer) suscribe a `onSnapshot` de Firestore. Cuando María tilda "Ya tengo" desde su celu, JP lo ve **al toque sin refrescar**. Cuando JP marca un plan como Cocinada, María recibe la notificación visual en su Home.

**Implementación**: vive en `src/data/planes.ts` (`subscribeToPlanesActivos(semanaInicio, callback)`) y `src/data/compras.ts` (`subscribeToItemsLista(idLista, callback)`). El cleanup automático se maneja por el hook.

**Combinado con offline persistence** (`enableIndexedDbPersistence` en `src/firebase.ts`): los listeners siguen funcionando offline contra el cache local; al reconectar, Firestore sincroniza y dispara nuevos snapshots con los cambios del servidor.

**Costo en reads**: cada miembro suscrito a planes activos consume reads continuamente pero Firestore solo factura por cambios reales, no por refresh idle. Para 4 miembros y ~5 planes activos por semana, el orden es decenas de reads/día por miembro — muy por debajo de la cuota gratuita.

---

## 7. Plan de prompts para Claude Code

Cada prompt es un archivo en `docs/prompts/` listo para pegar a Claude Code en la terminal. Estructura común: contexto + decisiones zanjadas + tareas numeradas + criterios de aceptación + qué NO tocar.

### 7.1 Etapa 1 — Auth + esqueleto

- **`PROMPT_E1.0_bootstrap_config.md`**: crear los docs `/config/familia` (con los 4 miembros y sus mails reales, ver §2.8) y `/config/diccionarios` (con los enums seed, ver §2.7) usando un script one-off con Admin SDK (`scripts/bootstrap-config.ts`). Sin esto, el primer login no puede resolver `memberId`.
- **`PROMPT_E1.1_auth_provider.md`**: Firebase Auth con Google + whitelist (lee `/config/familia` y resuelve `memberId` recorriendo arrays de mails) + `useAuth` hook + `AuthProvider` context + `LoginScreen` con botón Sign-in Google + creación/actualización del doc `/users/{uid}` al login.
- **`PROMPT_E1.2_layout_routing.md`**: layout base (header, bottom-nav, main) con tokens de diseño portados de `Styles.html`. React Router con todas las rutas listadas en §5.1. Home vacío con placeholder. Detección de modo JP vs miembro según `memberId` resuelto.

### 7.2 Etapa 2 — Modelo de datos + Security Rules + Seeds

- **`PROMPT_E2.1_types_and_helpers.md`** ✅ **CERRADO**: types TypeScript en `src/types/models.ts` (Receta, Menu con `componentes[]`, Plan con `votos: {}` map, etc) + helpers `src/lib/canonical.ts` (normalizeText, canonicalizarIngrediente, SINONIMOS_INGREDIENTES) + parsers permisivos `src/lib/parsers.ts` (parseNumber, parseTime, parseDificultad, parseCosto, parseSiNo) + 56 tests Vitest verdes. 15 commits `Stage 2.1:`.
- **`PROMPT_E2.2_data_layer.md`** ⏳ próximo: módulos `src/data/recetas.ts`, `planes.ts`, `compras.ts`, `historial.ts`, `menus.ts`, `diccionarios.ts`. Cada uno expone funciones tipadas (read/write/queries) que envuelven el SDK Firestore. Además (nuevo v1.3):
  - **Hooks genéricos** `useDoc<T>`, `useCollection<T>`, `useCollectionRealtime<T>` para que los componentes no escriban `useEffect` con cleanup de suscripciones.
  - **Realtime** en `planes.ts` (`subscribeToPlanesActivos`) y `compras.ts` (`subscribeToItemsLista`) vía `onSnapshot`.
  - **Offline persistence** del SDK habilitada en `src/firebase.ts` con `enableIndexedDbPersistence()`.
  - **`menus.ts`** incluye `deriveMenuMetadata()` para calcular campos derivados (§2.3, §3.8).
  - **`planes.ts`** incluye `voteAndCloseIfComplete(idPlan, miembroId, puntaje, comentario)` con `runTransaction` que implementa el flujo de §3.7 (voto + cierre automático cuando los 4 miembros votaron).
  - **Manejo de errores**: reads tiran excepciones; writes devuelven `Result<T, Error>`.
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

### 7.4 Etapa 4 — Modo miembro ✅ COMPLETA (v1.6.5)

- **`PROMPT_E4.1_dashboard_miembro.md`** ✅ **CERRADO**: dashboard de miembro, `subscribeToPlanesActivosMiembro`, `asignaciones` default los 4, `BottomNav` ramificado. Ver §1.2.quaterdecies.
- **`PROMPT_E4.2_voto_miembro.md`** ✅ **CERRADO**: voto distribuido, cierre automático al completar `plan.asignaciones`, cierre forzado JP. `voteAndCloseIfComplete` + `forzarCierreEvaluacion` + `_cerrarEvaluacion`. `Voto.tsx` reescrito con `VotoProgress`, precarga de voto, secciones JP-only. Ver §3.7 y §1.2.quindecies.
- **`PROMPT_E4.3_cocineros.md`** ✅ **CERRADO**: `actualizarAsignaciones` (solo escribe `asignaciones`, no toca votos), sección "Quiénes cocinan este plato" en `PlanCard` (lectura siempre visible; edición JP en planes activos). Etapa 4 completa. Ver §1.2.sedecies.
- **E4.2.1 fix** ✅ **CERRADO**: corregida condición de cierre en `voteAndCloseIfComplete` (`MIEMBRO_IDS.every` en lugar de `plan.asignaciones.every`). `VotoProgress` muestra los 4 siempre. `MemberDashboard` usa `subscribeToPlanesActivos` + filtro client-side: "Mi semana" por `asignaciones`, "Pendientes" sobre todos los planes. Ver §1.2.septies.

### 7.5 Etapa 5 — Importador ✅ CERRADA (E5.1)

El importador completo fue construido en la Etapa 3 (E3.4.6/7/9). La pieza pendiente de §7.5 era el botón "Copiar prompt para LLM", implementado en E5.1.

- **`PROMPT_E3.4.6`** ✅ importador TXT completo: parseo, matcher, anti-dup, 3 pasos.
- **`PROMPT_E3.4.7`** ✅ normalización de unidades en el importador.
- **`PROMPT_E3.4.9`** ✅ matcher con sugerencias y aprendizaje de sinónimos.
- **`PROMPT_E5.1_copiar_prompt_llm.md`** ✅ **CERRADO**: botón "Copiar prompt para LLM" en paso 1 del importador. Prompt modelo en `/config/importador.promptLLM` (editable por JP desde Firebase Console). Ver §1.2.undevicies.

**Pendiente de §7.5 original**: edición del prompt desde la app (C4 no implementado en E5.1 — JP edita desde consola Firebase; ver §10).

### 7.6 Etapa 6 — PWA pulida

- **`PROMPT_E6.1_pwa_instalable.md`** ✅ **CERRADO**: manifest.json + 8 íconos PNG ya en `public/`. Service worker generado con `vite-plugin-pwa` (Workbox). App instalable, shell offline, actualizaciones automáticas. Ver §1.2.unvicies.
- **`PROMPT_E6.1.1_splash_ios.md`** ✅ **CERRADO**: 9 splash screens de iPhone activadas en `index.html`. Ver §1.2.duovicies.
- **`PROMPT_E6.2_push_notifications.md`** 🅿️ **POSTERGADO sin urgencia** (decisión JP en v1.8.0). La familia no necesita push para el uso actual. Cuando se retome, ver `PROMPT_DOCS_mapeo_e62_en_espera.md` para los dos caminos posibles (A: Cloud Function + Blaze; B: in-app sobre realtime). FCM es gratis en ambos planes; lo que define la decisión es si se aceptan los términos del plan Blaze para activar Cloud Functions.

### 7.7 Etapa 7 — Features post-cierre de Etapas 1–6

Etapa 7 acumula todo lo que se hizo después del cierre funcional inicial. Cerrada en v1.8.0
en su scope necesario.

- **`PROMPT_E7.1_campo_fecha_plan.md`** ✅ **CERRADO**: campo `fecha?: string` en el plan +
  `asignarFechaPlan(idPlan, fecha)` con validación de rango contra `semanaInicio..semanaFin`.
  Sin UI — la UI llegó con E7.4. Ver §1.2.tervicies.
- **`PROMPT_E7.2_design_v1.md`** ✅ **CERRADO**: integración del Design System v1.0
  (logomark `PlatoMark`, PWA assets, componentes `WeekStrip`, `MemberAvatar`, `PlanCard`,
  `CompraProgress`, rediseño Home v2 + screens de menú).
- **`PROMPT_E7.3_contador_pasos.md`** ✅ **CERRADO**: contador real de pasos en Cocinar
  con parser de tiempos libres + `StepTimer` reusable.
- **`PROMPT_E7.4_design_v2.md`** ✅ **CERRADO**: rediseño v2 de Lista de Compras
  (variante C — recetas envueltas), Cocinar (flow guiado/scroll con cursor "acá vas",
  LiveTimer con notificaciones), Detalle de receta (hero + meta + ingredientes agrupados
  + pasos preview + acciones JP plegables), Home (SemanaBadge, WeekStrip con Plate icon).
- **`PROMPT_E7.5_home_ctas_fix_cocinada_detalle_arriba.md`** ✅ **CERRADO**: CTAs en el Home
  (Elegir como Especial siempre cuando no hay; En proceso siempre; quitado el botón
  Importar menú); `marcarCocinada` actualiza `fecha` a hoy y el WeekStrip excluye estado
  `Cocinada`; `<CompraProgress>` se oculta con `totalItems === 0`; detalle de receta sin
  placeholder de foto y con `AccionesPlan` reposicionado entre MetaCards y pills.
- **`PROMPT_E7.6_pulido_detalle_receta.md`** ✅ **CERRADO**: cinco pulidos cosméticos del
  detalle de receta (MetaCards sin borde + sub "X min activo"; borde solo entre items en
  ingredientes; tiempo del paso en línea con título; banner riesgos con borde + estructura
  ícono+texto; sticky bottom Cocinar con `position: sticky` + gradient fade) **+ cambio
  funcional en `AccionesPlan`**: sacar el acordeón, mostrar los tres botones directamente,
  ocultar los no elegibles (regla: `puede: false` → no renderizar). Conserva el flujo de
  confirmación de reemplazo cuando hay Especial elegida.
- **`PROMPT_E7.7_distribucion_onboarding.md`** ⏳ **PENDIENTE**: Open Graph + Twitter Card
  en `index.html` para que el preview al compartir el link de la app por WhatsApp /
  Telegram / iMessage muestre logo y descripción. Asset de preview (1200×630, derivado
  del PlatoMark). Botón "Instalar app" en `LoginScreen` para Android (captar
  `beforeinstallprompt`, mostrar mientras esté disponible). iOS sigue con su flujo manual
  "Agregar a pantalla de inicio".

**Postergados sin urgencia (v1.8.0):**

- **Dashboard de historial avanzado (D.3 / §9.1)** — la pantalla actual de historial
  cubre el uso real. Cuando se retome, requiere primero pasada por Claude Design (§8.2).
- **Otros features del Apéndice §9** — sin compromiso de fecha.

---

## 8. Claude Design: cuándo y qué pedirle

### 8.1 Cuándo NO usarlo

**Etapas 1–4** son trabajo de **portado**, no de diseño. El design system ya está definido en `Styles.html` (tokens CSS, primary `#8a4a2f`, cards sin sombra, bottom nav fijo, etc). Necesitamos que la UI nueva se vea **igual** a la actual, no diferente. Para eso, Claude Code reproduce HTML/CSS existente. Claude Design no suma valor.

### 8.2 Cuándo SÍ usarlo

**Etapa 6 (PWA pulida) — para branding:**
- "Diseñá un set de íconos (192px, 512px, splash screen) para una app de planificación familiar de comidas. Tonos: primary `#8a4a2f`, surface `#f9fafb`. Estilo: cálido, no infantil, con un guiño a comida casera pero moderno. Variantes: maskable y not-maskable."
- "Diseñá una splash screen para iOS PWA, fondo `#8a4a2f`, logo centrado, texto 'Comida Familiar'."

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

**Estado en v1.8.0:** postergado sin urgencia. La pantalla de historial actual (E3.7)
cubre el uso real de la familia. Se reactiva si aparece necesidad concreta.

### 9.2 Multi-semana
Hoy: una sola semana activa (la actual). Futuro: planificación de la próxima semana, hover sobre las próximas 4 semanas en home.

### 9.3 Notificaciones push contextuales
Cloud Functions + FCM. Triggers: "JP te asignó la Especial", "La lista de compras se actualizó", "Pendiente de votar la cena del sábado".
Requiere Blaze.

### 9.4 Importador con foto / OCR
Subir foto del libro de cocina → Vision API → TXT estructurado → mismo flujo del importador actual. Requiere Cloud Functions + Vision API (ambas Blaze).

### 9.5 Sugerencias inteligentes
"Esta semana no comieron pollo, te recomendamos..." / "Hace 6 semanas que no hacen pescado". Requiere queries más complejas y posiblemente un endpoint con lógica server-side.

### 9.6 Diccionario de sinónimos de ingredientes extendido ✓ (resuelto en v1.5.9 — E3.4.9)
El matcher aprende sinónimos automáticamente cuando JP elige una sugerencia en el importador. El término tipeado se agrega a `sinonimos[]` del ingrediente elegido; la próxima importación lo resuelve como `exacto` sin intervención. Panel de admin para sinónimos manuales sigue siendo futuro opcional; el loop humano de §9.6 está implementado.

### 9.7 Costos reales tracking
Hoy: `costoReal` es texto libre del cocinero. Futuro: form con precio por ingrediente, total calculado, evolución temporal del costo de la familia.

### 9.8 Modo "noche de a dos"
Filtrar todo lo no-apto, ajustar porciones, ocultar lo de los chicos. Switch global.

### 9.9 Lista de compras compartida en tiempo real ✅ Movida a §6.8 en v1.3
~~Hoy: cada miembro ve la lista pero las marcas "Ya tengo" se sincronizan al refrescar. Futuro: listener real-time (`onSnapshot`), ver el toggle de María mientras estoy en el super.~~

**Implementado en v1.3** vía `onSnapshot` en `src/data/compras.ts` (`subscribeToItemsLista`) + hook `useCollectionRealtime` (E2.2). Ver §6.8.

### 9.10 Backup / export
Botón "Exportar todo a JSON" para snapshot offline. Útil si en el futuro queremos migrar de Firebase.

### 9.11 Invitados con scope limitado
Hoy: cualquier miembro en `/config/familia.miembros` tiene acceso completo (read/write a todas las recetas, planes, etc).
Futuro: agregar un campo `scope` a la metadata del miembro (ej: `scope: "guest"`) y ajustar las Security Rules para que un guest pueda leer recetas pero no votar ni elegir planes. Útil si quisieras invitar a un suegro a ver el menú del finde sin que pueda romper el sistema.

### 9.12 Cierre del Apps Script ✅ HECHO (v1.8.0)

JP retiró el acceso de escritura al spreadsheet original. El Apps Script viejo queda
deprecado. El spreadsheet permanece como respaldo histórico read-only. La app Firebase
en `https://comida-familiar.web.app` es la única fuente de verdad para la familia.

---

## 10. Deuda técnica pendiente — vivos en v1.8.0

Ítems abiertos que no bloquean el uso de la app pero conviene resolver cuando aparezca
ventana. No son bugs, son cosas que se notan al usar la app un tiempo.

### 10.1 Filtros de Biblioteca — posiblemente desactualizados tras E3.4.8

Los filtros del listado de recetas en `/biblioteca` probablemente leen enums hardcodeados o desde `src/types/models.ts`, en vez de leer desde `/config/diccionarios`. El rediseño de E3.4.8 cambió el shape del diccionario: eliminó `seccionesIngredientes`, agregó `categoriasIngrediente`, `rolesNutricionales`, `seccionesGondola`. Si algún filtro consumía `seccionesIngredientes` o un valor viejo, está roto silenciosamente.

**Acción pendiente:** revisar `src/routes/Biblioteca.tsx` y confirmar que los filtros de categoría y tipo siguen funcionando contra el catálogo post-E3.4.8.

### 10.2 Deuda de UI en el importador

1. ~~**Contraste botones de sugerencia (E3.4.9)**~~ ✅ **Resuelto en E5.3**: `color: #888` → `var(--muted-strong)` (`#4a3f37`).

2. ~~**Pluralización de unidades**~~ ✅ **Resuelto en E5.3**: `formatearCantidadUnidad` / `pluralizarUnidad` en `src/lib/unidades.ts`. Aplicado en Compras, DetalleReceta e ImportarReceta. El dato almacenado (unidad canónica singular) no se tocó.

3. **"A gusto" en vez de cantidad sin unidad** (§10.2.3 — pospuesto por JP): cuando `unidad` es `null`, `cantidadLabel` puede mostrar solo el número sin contexto. Alinear el display con `"a gusto"` como texto explícito en esos casos. Requiere tocar el parser del importador.

### ~~10.3 ING-0178 "Arroz" — residuo del bug pre-E3.4.9~~ ✅ CERRADO (v1.7.3)

~~El doc `ING-0178` con `nombrePreferido: "Arroz"` y `ambiguo: true` fue creado por el importador antes de que E3.4.9 resolviera el loop de sugerencias.~~

**Resuelto:** JP eliminó el documento `ING-0178` desde la consola de Firebase, habiendo verificado previamente que no tenía referencias activas. Verificación independiente realizada en v1.7.3: `ING-0178` no existe en `scripts/seed-data/catalogo_ingredientes.json` (0 resultados), y ninguna receta del seed lo referencia (0 ocurrencias del string `ING-0178` en `recetas.json`). El ítem está cerrado — no hay residuo en ninguna colección conocida.

### ~~10.4 Recetas de prueba del importador — pendiente de limpiar~~ ✅ CERRADO (v1.7.3)

~~Durante el testing de E3.4.7, E3.4.8 y E3.4.9 se crearon recetas de prueba en el rango `REC-15xx` (ej. "Pollo de prueba E3.4.7" y similares). Pendiente identificar cuáles son de prueba y eliminarlas de Firestore.~~

**Resuelto:** La suposición original era incorrecta. Verificación en v1.7.3 del rango completo `REC-15xx` (10 recetas): todas son recetas reales de tipo Snack con nombres de dominio válidos. La receta "Pollo de prueba E3.4.7" mencionada como ejemplo **no existe** en el seed ni en el catálogo. No hay nada que borrar.

Inventario completo del rango verificado:

| idReceta | nombreCanonico | tipoItem | proteinaPrincipal |
|---|---|---|---|
| REC-1501 | Chips de zucchini | Snack | Vegetariana |
| REC-1502 | Almendras especiadas | Snack | Frutos secos |
| REC-1503 | Huevos rellenos de atún | Snack | Huevos |
| REC-1504 | Bastones crocantes | Snack | Vegetariana |
| REC-1505 | Mini muffins de huevo | Snack | Huevos |
| REC-1506 | Bocaditos de pollo | Snack | Pollo |
| REC-1507 | Berenjenas crocantes | Snack | Huevos |
| REC-1508 | Rollitos de jamón | Snack | Fiambre |
| REC-1509 | Nuggets keto de pollo | Snack | Pollo |
| REC-1510 | Pepitas de semillas y chocolate | Snack | Semillas |

Ninguna tiene nombre que delate ser de testing. Ítem cerrado.

### 10.5 Open Graph / Twitter Card para compartir el link — E7.7

`index.html` no tiene metas `og:*` ni `twitter:*`. Al compartir el link de la app por
WhatsApp / Telegram / iMessage, el preview sale sin logo ni descripción (solo la URL
pelada). Falta: generar un asset de preview 1200×630 (derivado del PlatoMark + nombre)
y sumar las metas Open Graph + Twitter Card apuntando a él. Resuelto en E7.7.

### 10.6 Botón "Instalar app" en Android desde el login — E7.7

No hay control de instalación en la app. El navegador puede mostrar su propio prompt,
pero JP quiere un botón explícito. Falta: captar `beforeinstallprompt` en un handler
global, guardarlo, y exponer un botón "Instalar app" en `LoginScreen` mientras el
evento esté disponible (se oculta una vez instalada o si el navegador no lo soporta).
iOS queda fuera del alcance (Safari no dispara `beforeinstallprompt`; sigue con
"Agregar a pantalla de inicio" manual, ya cubierto por el splash de E6.1.1). Resuelto
en E7.7.

---

## Cierre

Este documento es la **fuente de verdad** del modelo de datos y la arquitectura de la app Firebase. Cualquier decisión que se tome y modifique algo de acá, **debe reflejarse en este documento en el mismo commit**.

**Estado en v1.8.0:** ciclo funcional cerrado para uso familiar. Queda pendiente E7.7
(distribución/onboarding: Open Graph + botón Instalar Android), que no bloquea el uso pero
mejora cómo se comparte e instala la app. Lo demás postergado (push, D.3, opcionales §9.*)
se reactiva caso por caso cuando aparezca demanda concreta.
