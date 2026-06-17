# Implementar el Design System Comida Familiar v1.0

> Prompt para Claude Code. Pegalo entero al iniciar la sesión, dentro del repo `Comidas-Familiares`. Asume que el zip del design system ya fue extraído en `./design-system/` adentro del repo.

---

## Contexto

Sos un ingeniero senior implementando el **handoff del Design System Comida Familiar v1.0** (logomark + PWA + dark mode + componentes nuevos + screens de menú) en el codebase de producción.

- **Codebase:** `jpcofano/Comidas-Familiares` — React 19 + Vite 8 + TypeScript + Firebase + React Router. Estás parado en su raíz.
- **Design system extraído en:** `./design-system/` (adentro del repo, junto a `src/`). Antes de hacer nada, confirmá que el path existe con `ls ./design-system` y que ves `IMPLEMENTATION.md` en la raíz.
- **Documento maestro:** `./design-system/IMPLEMENTATION.md`. Es el índice y la fuente de verdad de todo este trabajo. Leelo entero antes de tocar nada.
- **Specs por feature:**
  - `./design-system/design_handoff_mobile_app_v2/README.md` — Home v2 + componentes nuevos.
  - `./design-system/design_handoff_mobile_app_v2/LOGOMARK.md` — brand mark + favicon + PWA + reemplazo de ChefHat.
- **Referencia visual viva:** `./design-system/ui_kits/mobile-app/*.jsx` — JSX de cada pantalla. **No copiar verbatim** (son standalone, sin TS, sin Router, sin hooks de Firebase). Usalos como espec visual y patrón de estructura; portá a TSX con los hooks reales.
- **Specimens HTML:** `./design-system/preview/*.html` — útil si dudás de cómo se ve algo. Abrilos con el browser de archivo si necesitás claridad.

---

## Tu misión

Mergeable en 1–2 PRs: dejar el repo con el logomark `PlatoMark` integrado en todos lados, los assets de PWA cargados, los componentes nuevos creados (`WeekStrip`, `MemberAvatar`/`AvatarStack`, `PlanCard`, `CompraProgress`), la Home v2 rediseñada usándolos, y los screens de menú (`DetalleMenu`, `SeleccionarComponenteMenu`) puestos al nivel de fidelidad del kit. Sin regresiones funcionales.

---

## Reglas de oro (no negociables)

1. **Adaptá, no copies.** Los `.jsx` del kit son referencia. La implementación va en TSX con tipos, usando los hooks reales (`useAuth`, `useCollection`, etc.), React Router (`useNavigate`, `<Link>`), tokens existentes en `src/styles/tokens.css`, e iconos de `lucide-react` para todo lo que no sea el brand mark.
2. **No rompas lo que funciona.** Cada cambio tiene que pasar `npm run build` sin warnings nuevos y `npm run preview` sin errores en consola. Hacé regresión manual de las screens que no estés tocando.
3. **Commits atómicos, en español sentence-case.** Un commit por fase (o por componente si la fase es grande). Mensaje: `feat: ...`, `chore: ...`, `refactor: ...`. Ejemplos: `feat: agregar PlatoMark y reemplazar ChefHat en LoginScreen`, `feat: rediseñar Home con WeekStrip y PlanCard`.
4. **Antes de borrar o sobreescribir cualquier archivo del codebase, mostrá un diff y pedí confirmación.** Especialmente: `public/favicon.svg`, `index.html`, `src/routes/Home.tsx`, `src/styles/tokens.css`.
5. **No inventes tokens.** Si necesitás un color o un radio que no existe en `tokens.css`, parate y avisame — probablemente ya hay uno. La única paleta nueva legítima es la de avatares de miembros (`MemberAvatar`), y está escrita literal en el spec.
6. **Voz argentina, sentence case en todos los strings UI.** "Cocinar", "Ver receta", "Sumar extra" — no "Cocinar Plato" ni "VER RECETA". Verbo primero en CTAs. Cero emoji decorativos.
7. **Si algo no está claro o el codebase difiere del spec, preguntá antes de improvisar.** Mejor pausar 2 minutos que mergear una variante.

---

## Plan de trabajo (8 fases)

### Fase 0 — Descubrimiento (5–10 min, sin commits)

1. Leé en este orden, sin escribir código todavía:
   - `./design-system/IMPLEMENTATION.md` (entero).
   - `./design-system/design_handoff_mobile_app_v2/LOGOMARK.md` (entero).
   - `./design-system/design_handoff_mobile_app_v2/README.md` (entero).
2. Inspeccioná el codebase actual:
   - `cat package.json` — confirmá React 19, Vite, TS, lucide-react, firebase.
   - `ls src/` y `tree src/ -L 2` — mapeá la estructura real (puede haber drift menor vs el spec).
   - `cat src/styles/tokens.css | head -80` — confirmá los tokens existentes.
   - `cat index.html` — mirá el `<head>` actual.
   - `grep -rn "ChefHat" src/` — listá todas las ocurrencias del icono provisorio.
   - `cat src/routes/Home.tsx` y `cat src/auth/LoginScreen.tsx` (o donde estén, según la estructura real).
   - `cat src/routes/DetalleMenu.tsx` y `cat src/routes/SeleccionarComponenteMenu.tsx` (si existen — IMPLEMENTATION.md dice que las rutas/estado existen pero la UI es genérica).
3. Reportá en una sola respuesta: estructura real, divergencias respecto del spec, riesgos que ves. Si hay algo que choca con el handoff (ej. archivos en otra ubicación), pedí confirmación antes de seguir.

### Fase 1 — Foundation: PWA assets + favicon + index.html head

> Bajo riesgo, alto impacto visual. Ideal primer commit.

1. Copiá los archivos según el **File copy map** de `IMPLEMENTATION.md` § 2:
   - `./design-system/assets/favicon.svg` → `public/favicon.svg` (sobreescribe).
   - `./design-system/assets/pwa/manifest.json` → `public/manifest.json`.
   - Las 8 PNG de `./design-system/assets/pwa/*.png` → `public/icons/`.
   - Los 11 splash de `./design-system/assets/pwa/splash/*.png` → `public/icons/splash/`.
2. Reemplazá el bloque `<head>` de `index.html` con el snippet completo de `LOGOMARK.md` § 2 (favicon + apple-touch + manifest + theme-color `#8a4a2f` + 4 metas iOS + 9 `<link rel="apple-touch-startup-image">`).
3. `npm run build` → no debe romper. `npm run preview` → abrí localhost en el browser, el favicon de la pestaña tiene que mostrar el plato marrón redondeado.
4. **Commit:** `feat: agregar assets PWA (icons, splash, manifest) y favicon de marca`.

### Fase 2 — Sync de tokens

1. Diff `./design-system/colors_and_type.css` vs `src/styles/tokens.css`. El spec dice que tienen que ser idénticos.
2. Si hay drift, sincronizá hacia `src/styles/tokens.css` (el del DS es la fuente de verdad). Si encontrás diferencias intencionales del codebase, pausá y avisame antes de tocar.
3. (Opcional, decidí vos según drift) **Commit:** `chore: sync tokens.css con design system v1.0`.

### Fase 3 — Brand mark: `PlatoMark` y reemplazo de `ChefHat`

1. Creá `src/brand/PlatoMark.tsx` con el código exacto de `LOGOMARK.md` § 4. Es TSX listo para pegar — no inventes nada.
2. `src/auth/LoginScreen.tsx`: reemplazá `<ChefHat size={36} strokeWidth={1.5} />` por `<PlatoMark size={40} variant="vapor" strokeWidth={1.6} />` (spec § 5). Ajustá el import.
3. `src/layout/Header.tsx`: agregá el chip de 28px con `<PlatoMark size={16} variant="simple" strokeWidth={1.6} />` adentro de un círculo `var(--primary-soft)`, según `LOGOMARK.md` § 6 (mostrá el JSX exacto que va a quedar y pedí ok antes de commitear).
4. `grep -rn "ChefHat" src/` → debe volver vacío. Si queda algo, reemplazalo también.
5. Si nadie más importa `ChefHat`, quitá el import; `lucide-react` se queda como dependencia (`Home`, `BookOpen`, `ShoppingBag`, `History`, `Clock`, `Plus`, `ChevronLeft/Right/Down`, `LogOut`, `Upload`).
6. **Commit:** `feat: agregar PlatoMark inline y reemplazar ChefHat en LoginScreen y Header`.

### Fase 4 — Componentes nuevos (4 archivos)

> Creá los 4 en orden de menor a mayor dependencia. Cada uno como su propio commit o uno solo, según preferencia, pero **el código tiene que estar en `src/components/` y los tipos en TypeScript**.

Referencias visuales: `./design-system/ui_kits/mobile-app/{WeekStrip,MemberAvatar,HomeScreen}.jsx`. Specs detalladas: `design_handoff_mobile_app_v2/README.md`.

1. **`src/components/WeekStrip.tsx`**
   - Props: `days?`, `today: number` (0–6), `marked: number[]`.
   - Si `days` no se pasa, calculalo con `date-fns` (ya está en el codebase — confirmalo en `package.json`).
   - Visual: grid `repeat(7, 1fr)` gap 4px, letra + número + dot. Día actual con `--primary-soft` + número 700. Días marcados con dot.
2. **`src/components/MemberAvatar.tsx`** + **`<AvatarStack>`** en el mismo archivo.
   - Paleta literal del spec (juanpablo `#8a4a2f` JP / maria `#74324a` M / sofia `#3c4a6e` S / federico `#2e5d2e` F).
   - `<MemberAvatar>` props: `name`, `size?` (22 default), `withName?`.
   - `<AvatarStack>` props: `names`, `size?`, `max?` (4 default). Superposición `margin-left: -6px`, borde `2px solid var(--surface-strong)`, overflow `+N`.
3. **`src/components/PlanCard.tsx`** — REEMPLAZA lo que sea que esté renderizando los planes en `Home.tsx` hoy.
   - Tipo `PlanCardProps` literal del spec (README v2 línea ~125).
   - Variantes `featured` (border 2px primary, título 18px, overline uppercase) vs normal (border 1px, título 15px).
   - Footer en franja `--surface-alt` con `<Button primary>` "Cocinar" + `<Button secondary>` "Ver receta" + `···` cuadrado.
   - Lógica de visibilidad del botón "Cocinar" según `estado` (ver spec).
4. **`src/components/CompraProgress.tsx`**
   - Props: `pendientes`, `yaTengo`, `onClick?`.
   - Card con título + "Ver todo →" + barra 6px con fill `--ok-text` + meta line.
   - `transition: width 240ms ease` en el fill.

**Commits sugeridos:** uno por componente, o `feat: agregar WeekStrip, MemberAvatar, PlanCard y CompraProgress`.

### Fase 5 — Home v2: rediseño completo

1. Releer la sección "Home" en `design_handoff_mobile_app_v2/README.md` y el JSX en `ui_kits/mobile-app/HomeScreen.jsx`.
2. Reescribir `src/routes/Home.tsx` siguiendo el layout ASCII del spec:
   - Header sticky (ya existe, queda).
   - "Esta semana" + meta "SEMANA NN" + `<WeekStrip>`.
   - `<PlanCard featured>` con la Especial.
   - "EXTRAS" + 0..n `<PlanCard>` + `<Button ghost>` "+ Sumar extra".
   - "EN PROCESO" + 0..n `<PlanCard estado="Cocinando">` (ocultar sección si no hay).
   - `<CompraProgress>` linkeando a `/compras`.
   - BottomNav (ya existe).
3. Mantené la lógica de fetch / hooks de Firebase que ya tiene `Home.tsx`. Lo que cambia es el render.
4. Estados de carga / vacío según spec (sección "Estados de carga / error / vacío").
5. Probá en localhost: que cargue para JP y para un miembro distinto (si la lógica de roles aplica).
6. **Commit:** `feat: rediseñar Home v2 con layout semanal + PlanCard + progreso de compras`.

### Fase 6 — Screens de menú (DetalleMenu + SeleccionarComponenteMenu)

> IMPLEMENTATION.md las marca con ⭐: las rutas y el estado existen, pero la UI es genérica. Subirlas al nivel del kit.

1. Spec: `./design-system/ui_kits/mobile-app/DetalleMenuScreen.jsx` y `SeleccionarComponenteMenuScreen.jsx`.
2. Actualizá `src/routes/DetalleMenu.tsx` y `src/routes/SeleccionarComponenteMenu.tsx` para que matcheen el visual del kit, conservando la lógica existente.
3. Validá manualmente: Biblioteca → tab Menús → tap en un menú → DetalleMenu renderiza igual al kit. Plan de tipo menú en Home → tap "Cocinar" → SeleccionarComponenteMenu se abre.
4. **Commit:** `feat: pulir DetalleMenu y SeleccionarComponenteMenu al nivel del kit v1.0`.

### Fase 7 — QA pass completo

Recorrer la checklist de `IMPLEMENTATION.md` § 6, marcando cada ítem. En particular:

**Build & install**
- [ ] `npm run build` sin warnings nuevos.
- [ ] `npm run preview` sin errores en consola.
- [ ] Favicon = plato marrón redondeado en la pestaña.

**Mobile · iOS Safari** (test real o simulador)
- [ ] Add to Home Screen → icono plato.
- [ ] Tap el icono instalado → splash cream + plate + wordmark ~1.5s.
- [ ] App en standalone (sin chrome del browser).
- [ ] Status bar respeta `theme-color`.

**Mobile · Android Chrome**
- [ ] Install prompt muestra el icono marrón.
- [ ] Launcher icon es el maskable (full-bleed, recorta a la forma).
- [ ] Theme color `#8a4a2f` en la status bar.

**Funcional**
- [ ] LoginScreen muestra el plato con vapor en el círculo soft.
- [ ] Header chip muestra el plato simple.
- [ ] DetalleMenu renderiza desde Biblioteca → Menús.
- [ ] SeleccionarComponenteMenu se abre desde el botón Cocinar de un plan tipo menú.
- [ ] Cocinar arranca en modo **guiada** con dots + Anterior/Siguiente; "Ver todos" alterna a scroll; "Paso a paso" vuelve.
- [ ] Resto de pantallas (Biblioteca, Compras, Historial, DetalleReceta, Voto, Importar) renderizan sin regresiones.

**Accesibilidad**
- [ ] `<PlatoMark>` con `aria-hidden` cuando hay wordmark al lado; con `aria-label="Comida Familiar"` cuando va solo.
- [ ] Focus ring visible en interactivos (usa `--shadow-focus`).
- [ ] Contraste botón sobre marrón AA (~7.78:1, ya bien); muted sobre cream AA Large.

Si algo falla, abrí un fix-up commit. No mergees hasta que la checklist esté limpia.

### Fase 8 — Optionals (decidí conmigo antes de empezar)

Estos son agregados que el design system tiene listos pero no son blockers. Para cada uno, **avisame antes de meterlo** así decidimos si va en este PR o en uno separado:

- **Dark mode** ("Cocina apagada"): `colors_and_type-dark.css` → `src/styles/tokens-dark.css`, activación por `prefers-color-scheme`. Spec en `preview/dark-mode.html`. Decisión pendiente: ¿solo system preference o toggle manual en el menú de usuario?
- **Skeleton loaders**: 4 componentes (`SkeletonRow`, `SkeletonHeader`, `SkeletonPlanCard`, `SkeletonList`) reemplazando los "Cargando…" actuales. Patrón en `preview/skeleton-loaders.html`. Animación: `pulse-bg 1.6s ease-in-out infinite` entre `--surface-alt` y `--border`.
- **Auditoría de tono**: pasar los copys actuales por los patterns de `preview/voice-do-dont.html`. Algunos botones del v1 drift a Title Case — corregir a sentence case + verbo primero.
- **Cleanup**: el alias `'chef-hat'` en `Icon.jsx` del kit es deprecado. El codebase no usa icon map interno, así que no hay nada que tocar — solo dejalo documentado.

---

## Cómo trabajar conmigo durante la sesión

- **Después de cada fase, reportá:** archivos tocados, líneas agregadas/quitadas, output de `npm run build`, y una nota de cualquier decisión que tomaste sin preguntar.
- **Si encontrás un mismatch entre el spec y el codebase real** (ej. el archivo está en otro path, una prop tiene otro nombre, el hook se llama distinto), parate y mostrame el conflicto. Yo te confirmo cómo seguir.
- **Si la build rompe, no avances a la fase siguiente.** Arreglá primero. Si no encontrás la causa en 10 minutos, mostrame el error y los últimos cambios.
- **No abras un PR todavía.** Quedate en una branch (`feat/design-system-v1`). Cuando terminemos QA te pido push y title del PR.

---

## Entrega final

Cuando todas las fases 0–7 estén verdes:

1. Resumen ejecutivo: lista de commits, lista de archivos nuevos / modificados / borrados, screenshots si podés generarlos (sino, descripción de qué se ve distinto en Home / LoginScreen / Header).
2. Notas de migración: si algo del comportamiento cambió (ej. la Home ya no muestra X que antes mostraba), documentalo.
3. Pendings: cualquier "optional" que no entró + riesgos conocidos.
4. Comando sugerido de PR title + descripción.

Arrancá por la **Fase 0**. Cuando termines de leer e inspeccionar, reportame antes de tocar ningún archivo.
