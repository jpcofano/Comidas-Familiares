# PROMPT E3.2 — Biblioteca: listado de recetas y menús

> Etapa 3.2 del plan de migración (ver `MAPEO_FIRESTORE.md` §2.2, §2.3, §5.1, §5.2,
> §6.5, §6.7, §7.3).
> Pegar este archivo completo a Claude Code en la terminal del repo.

---

## 1. Contexto

Migración de **Comida Familiar** de Apps Script + Google Sheets a Firebase + React +
Vite. Fuente de verdad del modelo: `MAPEO_FIRESTORE.md`.

Estado del repo al arrancar este prompt:

- Etapa 2 cerrada completa (types, data layer, rules, seeds, índices, importador de
  menús). En producción: 78 recetas, 5 menús.
- E3.1 cerrada: Home modo JP — tarjetas de Especial/extras/en proceso, acciones,
  lectura en tiempo real vía `subscribeToPlanesActivos`. Hay un script
  `scripts/seed-planes-prueba.ts` con planes de prueba.
- E3.1.1 cerrada (fix de la Home): contraste de títulos corregido con el token
  `var(--text-strong)` (#0e0a07), extras anidados bajo el Especial, y **botón "Ver
  receta" en las tarjetas que navega a `/recetas/:idSeleccion`**. Para planes con
  `tipoSeleccion === "menu"` quedó un `// TODO E3.3` — por ahora navega a la misma
  ruta de receta.

Esta etapa construye la **Biblioteca**: la pantalla de listado con dos tabs,
**Recetas** y **Menús**, con filtros y búsqueda. Es la pantalla desde la que (en
E3.3) se entra al detalle y se eligen comidas. Hoy la ruta de listado es un
placeholder dejado en E1.2.

---

## 2. Decisiones zanjadas (no re-litigar)

1. **Una pantalla, dos tabs — ambos en este prompt.** La Biblioteca tiene los tabs
   **Recetas** y **Menús**, los dos funcionales en esta etapa (decisión del
   usuario). El `MAPEO §6.7` describe esta pantalla como "Biblioteca con tabs
   `Recetas | Menús` que comparten la query base". Ruta: usá la que el routing de
   E1.2 ya definió para el listado (el `MAPEO §5.1` la nombra `/recetas`; §5.2
   menciona `/biblioteca` con `?tab=menus`). Seguí la convención que YA exista en el
   routing — no inventes una ruta nueva. El tab activo puede reflejarse en query
   param (`?tab=menus`) para que sea linkeable.

2. **Filtros y búsqueda: en cliente.** Decisión del usuario, y coincide con
   `MAPEO §5.2`: se traen TODAS las recetas (`getDocs(collection(db,"recetas"))` vía
   el data layer) y los filtros se aplican con `.filter()` en cliente. Son 78
   recetas — traerlas todas es barato y los filtros quedan instantáneos. NO hacer
   una query a Firestore por cada cambio de filtro. Mismo criterio para menús (5).

3. **Lectura vía el data layer de E2.2.** El listado usa las funciones de
   `src/data/recetas.ts` y `src/data/menus.ts`. NO el SDK de Firestore directo. Si
   falta una función (ej. "traer todas las recetas", "traer todos los menús"),
   agregala a esos módulos con el estilo del resto del data layer.

4. **Filtros del tab Recetas (de `MAPEO §5.2`).** Cuatro filtros, todos sobre campos
   directos del doc `Receta` (shape en `MAPEO §2.2`):
   - **Tipo de ítem** → campo `tipoItem` (enum del diccionario "Tipos de ítem":
     `Receta principal`, `Entrada`, `Guarnición`, `Postre`, `Panificado`, `Snack`,
     `Desayuno`, `Conserva`, `Hidrato opcional`). Las opciones del selector salen
     del diccionario (`/config/diccionarios`, ya cargado), no hardcodeadas.
   - **Proteína** → campo `proteinaPrincipal` (enum del diccionario "Proteínas").
     Opciones desde el diccionario.
   - **Sin lácteos** → campo `sinLacteos` (boolean). Toggle.
   - **Sin hidratos** → campo `hidratos` (boolean). El filtro "sin hidratos" muestra
     las recetas con `hidratos === false`. Toggle.
   Nota: el `MAPEO §5.2` menciona "sin filtro por Componente" — ese `tipoItem` ya no
   existe en v1.2, así que no es un caso a contemplar.

5. **Búsqueda por texto (decisión del usuario).** Un campo de búsqueda que filtra por
   nombre de receta. La comparación usa `normalizeText` (helper de E2.1) sobre el
   `nombreCanonico` (o sobre `normalizeText(nombre)`), de modo que la búsqueda
   ignore tildes y mayúsculas. La búsqueda se combina con los filtros (AND): el
   resultado son las recetas que cumplen búsqueda **y** todos los filtros activos.

6. **Filtros combinables y limpiables.** Varios filtros activos a la vez se combinan
   con AND. Debe haber forma de limpiar/resetear los filtros. Mostrá la cantidad de
   resultados ("N recetas"). Si no hay resultados, estado vacío claro.

7. **Tab Menús — derivación al vuelo (Modelo M, de `MAPEO §2.3` y §3.8).** Los menús
   NO guardan tiempos ni dificultad — se derivan de sus recetas componentes. Para
   cada menú del listado, calculá los campos derivados con **`deriveMenuMetadata()`**
   de `src/data/menus.ts` (E2.2) y mostralos (tiempo, dificultad, etc.). Como
   `deriveMenuMetadata()` necesita leer las recetas componentes, puede ser async y/o
   costoso: cacheá los derivados en memoria por la sesión (`MAPEO §2.3` lo indica
   explícitamente). NO recalcular en cada render.
   - **Cuidado:** `Menu.estilo` es opcional (`estilo?: string`, cambio de E2.5) —
     puede ser `undefined`. Cualquier render de ese campo debe contemplarlo.
   - El tab Menús puede tener filtros más simples o ninguno en esta etapa (los menús
     son solo 5). Si agregás filtros al tab Menús, que sean los que tengan sentido
     sobre datos derivados; si no, un listado simple alcanza. No es obligatorio
     replicar los 4 filtros de Recetas en Menús.

8. **Navegación al detalle — consistente con E3.1.1.** Cada ítem del listado navega
   a su detalle:
   - Receta → `/recetas/:idReceta` (la misma ruta que usa "Ver receta" de la Home).
   - Menú → `/menus/:idMenu`.
   El detalle de receta (E3.3) y el de menú son etapas futuras — hoy esas rutas son
   placeholders. El listado navega igual; cuando E3.3 los construya, el enlace ya
   funciona. Esto resuelve, del lado del listado, el mismo patrón que en la Home
   quedó como `// TODO E3.3`: acá el menú SÍ navega a `/menus/:idMenu` correctamente.

9. **Reuso de componentes de E3.1.** Si la Home (E3.1) dejó componentes de tarjeta
   reutilizables, reusalos para los ítems del listado en lugar de duplicar. Si la
   tarjeta de la Home es muy específica de "plan", creá un componente de tarjeta de
   "receta" / "menú" apropiado — pero compartí estilos/tokens. No dupliques estilos.

10. **Solo modo JP.** El `MAPEO §5.1` marca el listado de recetas como JP-only
    (los miembros no ven la Biblioteca). Esta etapa es solo modo JP.

11. **Diseño.** Tokens de E1.2 (`Styles.html`: primary `#74324a`, `--text-strong`
    #0e0a07 para títulos, `--line` #d8cdbe, cards). Mobile-first. El listado se
    scrollea; los filtros deben ser cómodos en pantalla chica (ej. una fila de
    chips/toggles o un panel colapsable). Coherente con la Home ya entregada.

12. **Idioma:** inglés en infraestructura, español en dominio y textos visibles.

---

## 3. Tareas

### 3.1 Lógica de datos

- En `src/data/recetas.ts` / `menus.ts`: si faltan, agregá funciones para traer
  todas las recetas y todos los menús.
- Lógica de filtrado en cliente: una función pura que reciba la lista de recetas + el
  estado de filtros + el texto de búsqueda y devuelva la lista filtrada. Esta función
  debe ser **pura y testeable** (sin Firestore, sin React).
- Para el tab Menús: integración con `deriveMenuMetadata()` + caché en memoria por
  sesión.

### 3.2 Componente Biblioteca

- Pantalla con dos tabs: Recetas | Menús. Tab activo reflejado en query param.
- **Tab Recetas:** los 4 filtros (decisión 4) + campo de búsqueda (decisión 5) +
  listado de tarjetas de receta. Contador de resultados. Estado vacío. Botón/acción
  para limpiar filtros.
- **Tab Menús:** listado de tarjetas de menú con los campos derivados de
  `deriveMenuMetadata()`. Filtros opcionales (decisión 7).
- Estados de carga y de error.

### 3.3 Tarjetas e ítems

- Tarjeta de receta: nombre + datos clave (tipoItem, proteína, tiempo, dificultad,
  flags sin lácteos / sin hidratos). Navega a `/recetas/:idReceta`.
- Tarjeta de menú: nombre + datos derivados. Navega a `/menus/:idMenu`.
- Reuso de componentes/estilos de E3.1 (decisión 9).

### 3.4 Tests

- Tests de la **función pura de filtrado** (decisión 3.1): combinación de filtros con
  AND, búsqueda normalizada (con/sin tildes, mayúsculas), filtros booleanos, sin
  resultados, sin filtros (devuelve todo). Van junto al set existente (110 tests tras
  E3.1.1) y no deben romperlo.
- La UI y la derivación de menús pueden verificarse manualmente; documentá esa
  verificación en el reporte.

### 3.5 Build + deploy

- `npm run build` sin errores.
- Deploy a producción: `firebase deploy --only hosting`.

---

## 4. Criterios de aceptación

1. La Biblioteca existe con dos tabs funcionales (Recetas, Menús), tab activo en
   query param, en la ruta de listado del routing de E1.2.
2. Tab Recetas: 4 filtros (`tipoItem`, `proteinaPrincipal`, `sinLacteos`, `hidratos`)
   con opciones desde el diccionario donde corresponde, + búsqueda por texto
   normalizada.
3. Filtros y búsqueda se aplican en cliente, combinables con AND, con opción de
   limpiar y contador de resultados.
4. Tab Menús: listado con campos derivados vía `deriveMenuMetadata()`, cacheados en
   sesión; `Menu.estilo` opcional contemplado.
5. Lectura vía el data layer de E2.2, no SDK directo.
6. Las tarjetas navegan: receta → `/recetas/:id`, menú → `/menus/:id`.
7. La función de filtrado es pura y está testeada; tests sumados al set sin romper
   los 110 existentes.
8. `npm run build` sin errores.
9. Deploy a producción exitoso.
10. Commits con prefijo `Stage 3.2:` + push.

---

## 5. Qué NO tocar

- **El data layer de E2.2**: se *extiende* con funciones nuevas si hacen falta, pero
  NO se modifican las funciones existentes ni `result.ts` ni `firebase.ts`.
- **Los types de E2.1**: el listado los usa. Si un type pareciera insuficiente, NO
  lo modifiques por tu cuenta — reportalo y pará. (Recordatorio: en E2.5 se cambió un
  type sin avisar; no repetir eso. Si el cambio es realmente necesario, va reportado,
  no silencioso.)
- **La Home (E3.1 / E3.1.1)**: cerrada. Si se reusan sus componentes, se reusan sin
  modificarlos; si hace falta generalizar un componente, hacelo sin romper la Home y
  reportalo.
- **El detalle de receta y de menú, el modo cocinar, la evaluación**: son E3.3+. Acá
  solo se navega a esas rutas.
- **`firestore.rules`, `firestore.indexes.json`, los scripts, el importador de
  menús**: fuera de scope.
- **El modo miembro**: la Biblioteca es JP-only. No implementar vista de miembro.
- **El set de tests existente**: no se edita ni se mueve.

---

## 6. Antes de cerrar — reporte esperado

- Tabla de criterios de aceptación (1–10) con estado.
- Ruta final de la Biblioteca y cómo se maneja el tab en query param.
- Funciones nuevas agregadas al data layer (si hubo).
- Cómo se resolvió la caché de `deriveMenuMetadata()` para el tab Menús.
- Si se reusaron o generalizaron componentes de la Home — qué y cómo, confirmando
  que la Home sigue intacta.
- Cantidad de tests nuevos y total del set (debe ser > 110).
- Confirmación de que NO se modificó ningún type de E2.1 ni función existente de
  E2.2 (o, si fue inevitable, qué y por qué — reportado).
- Cualquier `// TODO` que haya quedado en código.
- Lista de commits `Stage 3.2:`.
- Recordatorio para JP: abrir `https://comida-familiar.web.app`, ir a la Biblioteca,
  probar los 4 filtros + búsqueda combinados, cambiar al tab Menús y confirmar que
  los tiempos/dificultad derivados se muestran, y tocar una tarjeta para confirmar
  que navega al detalle (aunque sea placeholder).
