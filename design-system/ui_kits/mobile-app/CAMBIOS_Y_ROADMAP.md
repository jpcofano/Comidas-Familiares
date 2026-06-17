# Comida Familiar — Mobile UI Kit · Cambios y Roadmap

> Bitácora del prototipo `ui_kits/mobile-app/`. Documenta lo construido en este
> ciclo de diseño y lo que sigue. El prototipo refleja el código real del repo
> `Comidas-Familiares` (modelos, rutas y diccionarios), reexpresado sobre los
> design tokens de `colors_and_type.css`.

---

## ✅ Hecho en este ciclo

### 1. Detalle de receta — ingredientes por rol con chips de letra
- Los ingredientes se agrupan por **rol** (Principal, Base de sabor, Líquido de
  cocción, Condimentos, Cocción, Guarnición…), no por góndola.
- Cada sección lleva un **chip cuadrado con su letra y color** (P, B, L, S, C, G, D…).
- Se corrigió el bug por el que el chip caía al punto `·`: ahora hay un mapa
  `SECCION_META` (rol → letra + color) con fallback a la inicial.
  · Archivos: `RecetaDetalleParts.jsx`, datos en `App.jsx`.

### 2. Biblioteca — sin botón "Importar menú"
- Se eliminó el botón "Importar menú" y su opción del panel de Tweaks.

### 3. Home (inicio)
- El resumen dice **"3 comidas"** (se quitó "planeadas").
- El **punto de los días con comida** ahora es idéntico al del día de hoy
  (círculo relleno en color primary), en `WeekStrip.jsx`.

### 4. Header + Dark mode
- **Logo del header más grande** (círculo 28→38px, marca 16→23px).
- **Toggle de tema** (luna/sol) en el header, junto al avatar. Persiste en
  `localStorage` y aplica `data-theme="dark"` sobre `<html>`.
- Paleta oscura **"Cocina nocturna"**: solo reescribe tokens en
  `colors_and_type.css`, así se propaga a toda la app sin tocar componentes.
  · Estado: **aprobado, se deja como está.**

### 5. Dashboard de miembro — encabezado
- Se quitó el **avatar redundante** del saludo; "Hola, {nombre}" más grande.
- El badge **"N por votar"** ahora es **tappable** (lleva a evaluar el pendiente).
  · Archivo: `MemberDashboardScreen.jsx`.

### 6. 🆕 Detalle de menú  (`DetalleMenuScreen.jsx`)
Portado de `src/routes/DetalleMenu.tsx`. Se abre desde la pestaña **Menús** de
la Biblioteca.
- Metadata: escenario de uso, estado, estilo, clima, ideal para, descripción.
- Stats derivadas: tiempo total, dificultad, costo, porciones, "sin lácteos" /
  "con hidratos".
- **Componentes** del menú: cada uno con su chip de letra por rol (P, G, D…),
  etiqueta de rol, nombre de receta y meta (proteína · tiempo · dificultad);
  linkea a la receta. Marca "Opcional" cuando corresponde.
- Notas (Para JP / Para la familia / Ocasión / Notas).
- Acciones de JP: **Elegir como Especial** / **Sumar como En proceso**.

### 7. 🆕 Catálogo de ingredientes  (`CatalogoIngredientesScreen.jsx`)
Inspirado en `src/routes/CatalogoIngredientes.tsx`, ampliado a catálogo
navegable y **totalmente editable**. Acceso desde un link en la Biblioteca (JP).
- Buscador + filtro por góndola; lista **agrupada por góndola** en orden de
  recorrido del súper, cada grupo con su chip de letra.
- Cada ingrediente muestra **categoría** (qué ES) y **rol nutricional** (qué APORTA).
- Sección **"Por completar"**: ingredientes ambiguos importados con valores por
  defecto, con editor inline para resolverlos.
- **Editar cualquier ingrediente**: tap en la fila → editor en *bottom-sheet*
  (portal al frame) precargado con nombre, categoría, góndola y roles. Permite
  **guardar**, **eliminar** y **crear nuevo** ("+ Nuevo").
- Las tres dimensiones (categorías, roles, góndolas) son espejo de
  `src/lib/catalogo.ts`.

### 8. 🆕 Cocina de origen  (campo `cocina`)
Se incorporó el nuevo diccionario `/config/diccionarios.cocinas` (15 valores) que
agregaste al git. `cocina` es un campo **opcional de Receta**.
- **Lista canónica**: Argentina, Italiana, Española, Francesa, Mediterránea,
  China, Japonesa, Coreana, Tailandesa, India, Mexicana, Peruana,
  Árabe / Medio Oriente, Estadounidense, Otra.
- **Detalle de receta**: pill con ícono *globe* (primer pill, variante accent).
- **Biblioteca**: chip de cocina (ícono globe) en cada card + filtro
  **"Todas las cocinas"** con la lista canónica.
  · Archivos: `BibliotecaScreen.jsx`, `DetalleRecetaScreen.jsx`,
    `RecetaDetalleParts.jsx` (RecetaPill con ícono), `Icon.jsx` (globe), datos en `App.jsx`.

---

---

## 🆕 Etapa 9 — "Cocinar con lo que hay"

### 9. ¿Qué cocino con lo que tengo?  (`CocinarConQueTengoScreen.jsx`)
Matcher inverso (el histórico **7.2**). La familia marca su **despensa** (editable, con buscador,
chips letra+color por góndola) y la pantalla ordena las recetas por cercanía:
- **Buckets**: Cocinás ahora · Con un cambio · Te falta 1 · Te faltan varios.
- **Sustituciones surfaced**: usa las `equivalencias` del catálogo (E8.7) — ej. *"Usá Aceite de
  oliva en vez de Manteca"* — para mover recetas a "Con un cambio".
- **Faceta Dieta (E9.0)**: toggles Todas / Vegetariana / Keto.
- Dos variaciones via tweak `matchLayout`: **cercanía** (agrupada) y **ranking** (cards con % de match).
- **Entrada en Home** debajo de la tira de la semana + salto en el panel de Tweaks.
- Delta a Code: el prototipo matchea por `usa[]` de muestra; el código usa `idIngrediente` y debe
  manejar básicos (sal/aceite/agua). Prompt: `code-prompts/PROMPT_E9.3_que_cocino_con_lo_que_tengo.md`.

### 10. Sustitución al cocinar (E9.4)
"o {sustituto}" donde se necesita, con dos fuentes: `equivalencias` del catálogo (general) y
`alternativas` de la receta (el "X o Y" propio de esa receta).
- **Detalle de receta** (`IngredientesPorGondola`): línea secundaria "o {X}" bajo el ingrediente,
  en tono accent con ícono swap. Ej.: *Malbec → o otro vino tinto seco* (receta);
  *Aceite de oliva → o Manteca* (catálogo).
- **Paso a paso** (`CocinarScreen`): recap colapsable `SustitutosRecap` ("Sustitutos a mano (N)")
  en ambos modos (guiada / scroll).
- Tweaks: `mostrarSubs` (mostrar/ocultar) y `subsEstilo` (inline "o X" / chip).
- Prompt: `code-prompts/PROMPT_E9.4_sustitucion_al_cocinar.md` (match real por `idIngrediente`).

---

## 🆕 Etapa 11 — Macros nutricionales (E11.3 · UI)

### 11. Tarjeta de macros por porción  (`RecetaDetalleParts.jsx` → `MacrosCard`)
Diseño de la UI de macros que cierra la Etapa 11 (E11.1 lógica + E11.2 datos ya en
Code). Espejo de `macrosDeReceta()`: **hidratos netos = número estrella** (lo que
le importa a una familia keto), el resto (kcal, proteínas, grasas, fibra, hidratos
totales) en secundario.
- **Ubicación**: en el detalle de receta, después de las pills y antes de Ingredientes.
- **Cobertura siempre visible**: pie "Estimado sobre N de M ingredientes". Si es
  parcial, el pie pasa a tono `--warn` con prefijo "Parcial · estimado".
- **Cobertura 0 → estado vacío** discreto (borde punteado): *"Sin datos de macros
  para esta receta todavía."* Nunca números engañosos.
- **Agregado de menú** (`MacrosMenuCard` + helper `macrosDeMenu`): en el detalle de
  menú, suma `porPorcion` de todos los componentes → "una porción del menú completo",
  con su propia cuenta de cobertura por componentes.
- **Dos variantes via tweak `macrosLayout`**: **Estrella** (hero hidratos netos +
  grilla) y **Tabla** (fila pareja con netos resaltado).
- Datos de muestra en `App.jsx` con cobertura variada: completa (Langostinos,
  Berenjenas, Tarta), parcial (Bondiola 5/6, Pollo 2/3) y cero (Risotto → estado vacío).
- Prompt de Code: `docs/prompts/PROMPT_E11.3_macros_ui.md` (match real por
  `idIngrediente` + `macrosDeReceta()`/`conversiones.ts` ya testeados en E11.1/E11.2).

### Tokens sincronizados con la fuente de verdad (`src/styles/tokens.css`)
- `--estrella` (dorado oklch de ratings, E9.6) — antes faltaba en el CSS del kit.
- `--member-juanpablo/maria/sofia/federico` (light + dark, E8.2/E10) — ahora vienen
  del token, no hardcodeados.

---

## 🧭 Roadmap — próximas funcionalidades

Ideas que cierran huecos del flujo actual (acordadas en la conversación):

1. **Ingrediente → recetas que lo usan**  — ✅ hecho en Code (E8.5, v1.9.3).
2. **¿Qué cocino con lo que tengo?** (matcher inverso, ex-7.2) — 🔄 diseñado, prompt **E9.3** listo.
3. **Sustitución al cocinar** ("o {sustituto}" en detalle/paso a paso) — 🔄 diseñado, prompt **E9.4** listo.
4. **Equivalencias en la lista de compras** — E9.5, prompt pendiente.

> ⚠️ **Fix pendiente — E9.2 (correr primero)**: el commit `11ff3df0` rompió el route del
> Historial (lista plana + componentes ricos huérfanos). Prompt: `code-prompts/PROMPT_E9.2_fix_historial.md`.

4. **Historial de cambios del catálogo**
   Auditoría: quién completó/editó qué ingrediente (es data compartida).

5. **Detección de duplicados al importar**
   Cuando entra "ajo" y ya existe "Ajo", sugerir fusionar en vez de crear ambiguo.

### Pospuestas (a pedido del usuario, para más adelante)
- **Importar menú** (paso a paso, análogo a Importar receta).
- **Cocinar menú** (paso a paso multi-receta).
- **Ajustes** (mudar ahí el dark mode + miembros + notificaciones).

---

## 🔎 Cómo navegar el prototipo
- Panel de **Tweaks** → *Rol activo* (JP / María / Sofía / Federico) y
  *Ir a pantalla* (incluye "Detalle de menú" y "Catálogo de ingredientes").
- Naturalmente: **Biblioteca → Menús** abre el detalle de menú; el link al pie
  de la Biblioteca (JP) abre el catálogo.
