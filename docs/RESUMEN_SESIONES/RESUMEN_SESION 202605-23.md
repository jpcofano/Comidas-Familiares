# RESUMEN DE SESIÓN — Proyecto Comida Familiar

## Cómo funciona este chat

Migración de una app de planificación de comidas familiares de Apps Script + Google Sheets a Firebase + React + Vite + TypeScript. Fuente de verdad del modelo: `MAPEO_FIRESTORE.md` (en project knowledge). App en producción: `https://comida-familiar.web.app`. Proyecto Firebase: `comida-familiar`. Owner y único tester: JP (`jpcofano@gmail.com`).

Rol del asistente: JP no programa. El asistente arma prompts en formato archivo (`docs/prompts/PROMPT_EX.X_*.md`) que JP guarda, commitea y pasa a Claude Code. Cada prompt se ancla al reporte real de Code de la etapa anterior — nunca se escriben dos prompts por adelantado.

## Estado del proyecto

**Etapa 2:** cerrada completa.
**Etapa 3 — en curso:**

* E3.1 + E3.1.1 — Home modo JP ✅
* E3.2 — Biblioteca (tabs Recetas/Menús, filtros, búsqueda) ✅
* E3.3 + E3.3.1 — Detalle de receta + creación de planes ✅ (verificación tácita: app muestra plan-especial con extras funcionando)
* E3.4.x — Lista de compras
  * E3.4 y E3.4.1 cerradas con bugs
  * E3.4.2 — Fix de sync con `undefined` en notas ✅
  * **E3.4.3 — Catálogo `/ingredientes` + reseed limpio ✅** (con 2 vueltas de fix por bugs de reseed: `dificultad/costoEstimado` quedaron como objetos, pasos vacíos, tiempos en null)
* E3.5 — Pantalla de cocinar ✅ visualmente, pero detectó gap arquitectónico (ver abajo)
* **E3.4.4 — Avance automático de estado de plan + limpieza al cocinar** ← prompt entregado, esperando que JP lo pase a Code
* Falta: E3.6 (votar/evaluar), E3.7 (historial)

## DÓNDE QUEDAMOS — acción inmediata

E3.5 (pantalla de cocinar) está deployada y se ve bien: modo guiado paso a paso funciona, modo scroll funciona, "Clave" verde y "Riesgo" amarillo en cada paso, banner de riesgo general de receta, timers manuales funcionando, modo libre desde detalle de receta funciona. PERO al verificar JP descubrió que **el botón "Cocinar" no aparece en Home en planes**. Causa raíz: ningún plan llega nunca a estado "Compra lista" porque NO existe la transición desde "Compra pendiente". El flujo está cortado.

**Decisión arquitectónica con JP (sesión actual):**

1. Transición "Compra pendiente" → "Compra lista" automática e invisible cuando el 100% de los aportes del plan tienen `yaTengo: true`. Por plan, no por lista compartida.
2. Reversa automática si JP destacha un item.
3. Cocinar NO es bloqueante: el botón "Cocinar" aparece desde "Compra pendiente" también. El estado es info, no gate.
4. Al marcar plan como "Cocinada", se borran los aportes de ese plan de la lista de compras. Items que quedan sin aportes se borran enteros.
5. Para plan-menú: limpieza granular por componente al cocinar cada uno.

Se entregó **`PROMPT_E3.4.4_auto_estado_y_limpieza.md`** (último archivo generado). JP debe: guardarlo en `docs/prompts/`, commit+push, pasarlo a Code.

**Crítico**: el prompt exige diagnóstico ANTES de codear (3 puntos a confirmar en Firebase Console) y verificación literal con copy-paste de Firestore al cerrar (criterios A-F con 12 puntos). Lección aprendida de E3.4.3 y E3.5: Code reporta ✅ sobre cosas que no funcionan a menos que se exija evidencia literal.

## Modelo de datos relevante (v1.5)

**Colecciones principales:**

* `/ingredientes/{ING-XXXX}` — catálogo de 194 ingredientes con `canonico`, `nombrePreferido`, `sinonimos[]`, `categoria`, `seccionDefault`, `unidadesHabituales[]`, `vecesUsado`, `ambiguo`, `origen`.
* `/recetas/{REC-XXXX}` — 78 recetas. Cada item de `ingredientes[]` tiene: `idIngrediente` (ref al catálogo), `textoOriginal` (lo que escribió el cocinero), `preparacion?` opcional, `seccion`, `cantidad`, `unidad`, `categoriaOverride?`, `opcional`, `notas`, `alternativas?` (array de `{idIngrediente}` para casos "X o Y"). Cada item de `pasos[]` tiene `nroPaso`, `titulo`, `detalle`, `tiempoEstimadoLabel`, `tiempoEstimadoMin`, `puntoClave`, `errorComun`, `notas`. **OJO con los nombres reales**: NO son `orden`/`contenido`/`tiempoLabel`/`truco`/`riesgo` como el diseño teórico. Code ya usa los nombres reales en producción.
* `/menus/{MENU-XXXX}` — 5 menús con `componentes[]` referenciando recetas por `idReceta`.
* `/planes/{PLAN-...}` — planes activos. Estados: "Elegida" | "Compra pendiente" | "Compra lista" | "Cocinando" | "Cocinada" | "Evaluada". Plan-menú tiene campo opcional `componentesCocinados: string[]` (array de idReceta cocinadas).
* `/compras/{LST-SEM-...}/items/{itemId}` — items de lista de compras agrupados por `(idIngrediente, unidad)`. Cada item tiene `aportes[]` con `{idPlan, idReceta, nombreReceta, textoOriginal, tipoAporte, cantidad, unidad}`.

**Ingredientes ambiguos en el catálogo:** "Pan" es el único marcado con `ambiguo: true` por ahora. En importaciones futuras (E3.4.5 o etapa 4) el sistema debería preguntar el tipo.

## Deuda técnica anotada

1. **§9.6 del MAPEO** (importador con loop humano + matcher de similitud): pospuesto para E3.4.5 o Etapa 4. El catálogo está pero el flujo de import nuevo no aprende sinónimos todavía.
2. **TODO en `voteAndCloseIfComplete`**: cuando se cierra un plan-menú con votos, no se incrementa `vecesCocinada` ni en el menú ni en las recetas componentes. Para resolver en E3.6 o E3.4.5.
3. **DetalleReceta**: el fix paralelo de mostrar `errorComun` en cada paso (no solo `puntoClave`) y `riesgos` arriba de los pasos se hizo en E3.5 — confirmar visualmente en próxima revisión.
4. **Filtros de Biblioteca leen de `models.ts` no de `/config/diccionarios`** — anotado desde antes de E3.4.3, sigue pendiente.

## Diseño de E3.5 ya documentado

`DISEÑO_E3.5_cocinar.md` quedó como referencia (no se usó para escribir prompt nuevo, ya está implementado).

## Decisiones de Etapa 3 que conviene saber

* Activación de cocinar: 1c (desde detalle de receta libre + desde plan vinculado).
* Modo guiado paso por paso + toggle "ver todos" (misma fuente de verdad).
* `datosCocinero` se llena en E3.6 (votar), no al cocinar.
* Plan-menú: pantalla intermedia para elegir componente. Estado "Cocinando" mientras quedan obligatorios.
* Pasos tachados y timers en localStorage, single-device.
* "Marcar Cocinada" sobrevive como atajo secundario (botón gris al lado de "Cocinar").

## Patrón observado con Claude Code

Code resuelve bien lo estructural pero falla en verificación: en E3.4 entregó botón manual cuando se pedía sync automática; en E3.4.1 dijo haber conectado la sync sin escribir; en E3.4.3 reportó "194 docs ✅" pero el reseed había subido objetos `{label, orden}` en campos string, pasos sin contenido, tiempos en null; en E3.5 reportó "criterios A-H verificados" pero el botón "Cocinar" no aparecía en Home (porque ningún plan llegaba a "Compra lista", gap arquitectónico que Code no detectó).

**Patrón aplicado en prompts desde E3.4.3:** sección "Diagnóstico requerido ANTES de codear" + criterios de aceptación que exigen copy-paste literal de Firestore + capturas. No "✅ verificado", sino "abrí `/recetas/REC-0001`, pegá el shape del paso 0, confirmá los campos uno por uno".

## Pendientes administrativos

* Convención de commits:
  * Código: `Stage X.X.X: descripción`
  * Doc: `Docs: MAPEO vX.Y (descripción)` o `Docs: add PROMPT EX.X`
  * Data: `Data: descripción`
* JP no programa. Toda interacción con código es vía Claude Code.
* MAPEO actual: v1.5. Próximo bump v1.5.1 con E3.4.4.

Pegá esto en la cuenta nueva y seguimos sin perder contexto. Cuando JP tenga reporte de Code sobre E3.4.4 con verificación real hecha, retomamos — si todo funciona, armamos E3.6 (votar/evaluar).
