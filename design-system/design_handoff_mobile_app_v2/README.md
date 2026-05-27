# Handoff — Comida Familiar · Mobile App v2

> Paquete de implementación para incorporar el rediseño v2 de la home screen + componentes nuevos al codebase real `Comidas-Familiares` (React 19 + Vite 8 + Firebase).

## ⚠️ Sobre los archivos de este bundle

Los archivos en `design/` son **referencias de diseño**, no código de producción. Son prototipos HTML/JSX standalone que muestran el aspecto y comportamiento deseados.

**La tarea es recrear estos diseños dentro del codebase existente `Comidas-Familiares` usando sus patrones establecidos:** React 19, TypeScript, React Router (`useNavigate`, `<Link>`), tokens CSS en `src/styles/tokens.css`, hooks de Firebase (`useAuth`, `useCollection`, etc.), e iconos de `lucide-react`. No copiar los `.jsx` standalone tal cual — adaptar.

## Fidelidad

**Alta fidelidad** (hi-fi). Colores, tipografía, spacing, radios, sombras y estados son los definitivos. Implementar pixel-perfect.

Los siguientes valores **ya están** en `src/styles/tokens.css` del codebase y no hace falta cambiarlos:

- Paleta "Cocina cálida" (`--bg`, `--surface`, `--primary`, etc.)
- Escala de spacing 4px (`--space-1` a `--space-12`)
- Tipografía Inter con stylistic sets `cv02`/`cv03`/`cv04`/`cv11`

El único token nuevo es la paleta de avatares de miembros (definida en el JSX, abajo).

---

## Pantallas y vistas

### Home (`src/routes/Home.tsx`) — **rediseño completo**

**Propósito:** Vista principal de JP. Resume *esta semana*: la Especial + extras, lo que está cocinándose ahora, y el progreso de la lista de compras.

**Layout** (mobile-first, single column, `max-width: 720px` en desktop):

```
┌─────────────────────────────────────────┐
│ Header (sticky, ya existe)              │
├─────────────────────────────────────────┤
│  Esta semana       SEMANA 22            │  ← title + meta overline
│  ┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐                  │  ← WeekStrip (component nuevo)
│  │L││M││M││J││V││S││D│                   │
│  └─┘└─┘└─┘└─┘└─┘└─┘└─┘                  │
│  26 27 28 29 30 31  1                   │
│   ·  ·     ·                            │  ← dots = días con comida
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │ ESPECIAL · MARTES A LA NOCHE     │   │  ← PlanCard featured
│  │ Bondiola braseada al Malbec      │   │
│  │ Cerdo · 3 h · Media-alta         │   │
│  │ ── ── ──                         │   │
│  │ 👤👤 Juan Pablo, María           │   │
│  │ ┌────────┐┌────────┐┌──┐         │   │
│  │ │Cocinar ││Ver rec.││···│         │   │  ← action footer en franja crema
│  │ └────────┘└────────┘└──┘         │   │
│  └──────────────────────────────────┘   │
│                                          │
│  EXTRAS                                  │
│  ┌──────────────────────────────────┐   │
│  │ Langostinos al ajillo            │   │  ← PlanCard normal
│  │ ...                              │   │
│  └──────────────────────────────────┘   │
│                                          │
│  + Sumar extra                          │  ← Button ghost
├─────────────────────────────────────────┤
│  EN PROCESO                              │
│  ┌──────────────────────────────────┐   │
│  │ Berenjenas grilladas...          │   │
│  └──────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │ Lista de compras       Ver todo →│   │  ← CompraProgress
│  │ ████████░░░░░░░░░░░░ 61%         │   │
│  │ 7 pendientes · 11 ya tengo · 61% │   │
│  └──────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ BottomNav (fixed, ya existe)            │
└─────────────────────────────────────────┘
```

### Componentes a crear

#### `src/components/WeekStrip.tsx` — **NUEVO**

Tira de 7 días arriba de Home.

**Props:**
- `days?: { letter: string; label: string; n: number }[]` — opcional, si no se pasa usa la semana actual calculada con `date-fns`
- `today: number` — índice (0-6) del día actual
- `marked: number[]` — índices de días que tienen una comida planeada

**Visual:**
- Grid `repeat(7, 1fr)`, `gap: 4px`
- Cada día: columna con letra (10px uppercase muted) + número (15px bold) + dot (4px círculo)
- Día actual: background `var(--primary-soft)`, color `var(--primary)`, número 700
- Días con comida: dot de `var(--line)` (o `var(--primary)` si es hoy)

→ Referencia: `design/ui_kit/WeekStrip.jsx`

#### `src/components/MemberAvatar.tsx` — **NUEVO**

Círculo de iniciales por miembro de la familia. La paleta es **nueva** y derivada del visual language existente.

**Paleta** (agregar a `tokens.css` o dejarla en el TS):

| Miembro | Background | Texto | Inicial mostrada |
|---|---|---|---|
| juanpablo | `#8a4a2f` (= primary) | `#fff` | JP |
| maria | `#74324a` (= accent) | `#fff` | M |
| sofia | `#3c4a6e` (= info-text) | `#fff` | S |
| federico | `#2e5d2e` (= ok-text) | `#fff` | F |

**Props:**
- `name: string` — nombre del miembro (se normaliza para mapear)
- `size?: number` — default 22
- `withName?: boolean` — si true muestra `<avatar><name>` inline

**Subcomponente `<AvatarStack>`:**
- Props: `names: string[]`, `size?: number`, `max?: number` (default 4)
- Avatares superpuestos `margin-left: -6px` con borde `2px solid var(--surface-strong)` para sandwich limpio
- Si `names.length > max`, último círculo muestra `+N` con `background: var(--surface-alt)`, `color: var(--muted-strong)`

→ Referencia: `design/ui_kit/MemberAvatar.jsx`

#### `src/components/PlanCard.tsx` — **REEMPLAZA** lo que sea que esté rendereando los planes actualmente en `Home.tsx`

**Props:**
```ts
interface PlanCardProps {
  plan: {
    id: string;
    nombre: string;
    estado: EstadoPlan;        // ya existe en types/models.ts
    proteina?: string;
    tiempo?: string;
    dificultad?: string;
    cocineros: string[];        // nombres de miembros
    contexto?: string;          // ej "Especial · Martes a la noche"
  };
  featured?: boolean;
  onCocinar?: () => void;
  onVerReceta?: () => void;
  onMoreActions?: () => void;
}
```

**Visual cuando `featured`:**
- Border `2px solid var(--primary)`, radius 14
- Padding del body: `16px 18px 14px`
- Overline en uppercase con `letterSpacing: 0.08em`, font-weight 700, color `var(--primary)` — muestra `plan.contexto || 'Especial de la semana'`
- Título 18px, weight 600, `letter-spacing: -0.01em`
- Metadata row (proteína · tiempo · dificultad) inline con separadores `·`, font 13px muted
- Border-top subtle separa la sección de cocineros (AvatarStack + nombres en texto)
- **Footer** en franja `background: var(--surface-alt)`, `border-top: 1px solid var(--border-subtle)`, padding `10px 18px 12px`:
  - `<Button variant="primary" flex:1>` "Cocinar" (o "Continuar cocinando" si estado === 'Cocinando')
  - `<Button variant="secondary">` "Ver receta"
  - Botón `···` cuadrado para más acciones (descartar, marcar cocinada, etc)

**Visual sin `featured`:**
- Border `1px solid var(--border)`, radius 14
- Título 15px, weight 600
- Misma estructura: metadata → cocineros → footer

**Estados de botón:**
- "Cocinar" solo aparece si `estado ∈ {Compra pendiente, Compra lista, Cocinando}`
- En estado `Cocinada` / `Evaluada`: ocultar Cocinar; el footer queda solo con "Ver receta" + `···`

→ Referencia: `design/ui_kit/HomeScreen.jsx` (componente `PlanCard` interno, sacarlo a su propio archivo)

#### `src/components/CompraProgress.tsx` — **NUEVO**

Card resumen de la lista de compras con barra.

**Props:**
- `pendientes: number`
- `yaTengo: number`
- `onClick?: () => void` — navegar a `/compras`

**Visual:**
- Card: `padding: 14px 16px`, `background: var(--surface-strong)`, `border: 1px solid var(--border)`, `border-radius: 14`
- Header: "Lista de compras" (15·600) + "Ver todo →" (12·500, color primary)
- Progress bar: `height: 6px`, `border-radius: 9999px`, `background: var(--surface-alt)`; fill `background: var(--ok-text)`, `width: ${(yaTengo/total)*100}%`, `transition: width 240ms ease`
- Meta line debajo: `<strong>{pendientes}</strong> pendientes · <strong>{yaTengo}</strong> ya tengo · {pct}%`

→ Referencia: `design/ui_kit/HomeScreen.jsx` (componente `CompraProgress` interno)

#### `src/layout/Header.tsx` — **CAMBIO MENOR**

Agregar el chef-hat brand mark inline al lado del título, achicar el padding de 12px a 10px vertical, achicar el título de 17px a 16px.

```tsx
<header style={{ padding: '10px 16px', ... }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--primary-soft)', color: 'var(--primary)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <ChefHat size={16} strokeWidth={1.6} />
    </div>
    <h1 style={{ fontSize: 16, ... }}>Comida Familiar</h1>
  </div>
  ...
</header>
```

→ Referencia: `design/ui_kit/Header.jsx`

---

## Interacciones y comportamiento

- **WeekStrip:** sin interacción en v2 (solo visualización). En v3 podría ser tappable para filtrar la home por día.
- **PlanCard footer:**
  - "Cocinar" → `navigate(\`/cocinar/\${plan.recetaId}\`)`
  - "Ver receta" → `navigate(\`/receta/\${plan.recetaId}\`)`
  - "···" → abre un BottomSheet o menú con: Marcar Cocinada, Descartar (color `var(--err-text)`), Editar
- **AvatarStack:** tap → abre modal con "Quiénes cocinan este plato" + lista de miembros (existe en v1)
- **CompraProgress:** tap en cualquier parte de la card → `navigate('/compras')`
- **+ Sumar extra:** → `navigate('/biblioteca?modo=elegir-extra')` (asume que Biblioteca acepta este query param para volver con la receta elegida)

### Animaciones

- Progress bar: `transition: width 240ms ease` cuando cambia `yaTengo`
- Botones: heredan los estados del sistema (`scale(0.97)` en press, ya está en `tokens.css`)
- Nada más se anima — el sistema no usa entradas animadas

### Estados de carga / error / vacío

- **Loading:** mientras se cargan los planes, mostrar `<p className="meta">Cargando…</p>` centrado (patrón existente)
- **Sin Especial:** ocultar la sección entera, mostrar `<p>Todavía no hay comidas elegidas para esta semana.</p>` + `<Button>Ver recetas</Button>` (copy literal — ya está en v1)
- **Sin extras:** ocultar el header "EXTRAS", mostrar solo `+ Sumar extra` ghost
- **Sin en proceso:** ocultar la sección entera (no es un estado de error)
- **Sin items en compras:** mostrar la card con la barra al 100% verde, "0 pendientes · 0 ya tengo"

---

## Estado y datos

Reusar los hooks existentes del codebase. La forma de los datos asumida:

```ts
type Plan = {
  id: string;
  tipo: 'Especial' | 'Especial extra' | 'En proceso';
  estado: EstadoPlan;   // del types/models.ts existente
  recetaId: string;
  cocineros: string[];   // ids o nombres de miembros
  // nuevo en v2 — derivado de la receta linkeada:
  proteina?: string;
  tiempo?: string;
  dificultad?: string;
};

type Lista = {
  pendientes: number;
  yaTengo: number;
};
```

**Para el desarrollador:** revisar `src/data/planes.ts` y `src/data/recetas.ts` para confirmar que `proteina`, `tiempo` y `dificultad` están disponibles (deberían estar en `Receta`, y el `PlanCard` puede leerlos a través de un selector o joining). Si no están, agregar a Receta — no inventar valores.

---

## Design tokens (todos ya en `src/styles/tokens.css`)

Ver `design/colors_and_type.css` para el listado completo. Lo nuevo para v2:

- **Paleta de avatares de miembros** — agregar al final de `:root` en `tokens.css`:

```css
--member-juanpablo:  #8a4a2f;  /* = --primary */
--member-maria:      #74324a;  /* = --accent */
--member-sofia:      #3c4a6e;  /* = --info-text */
--member-federico:   #2e5d2e;  /* = --ok-text */
```

(O dejarlos como objeto en TS — la paleta es chica y poco propensa a cambiar.)

---

## Assets

`design/assets/` contiene:

- `app-mark.svg` — recreación del LoginScreen logomark
- `chef-hat.svg` — glifo de lucide
- `favicon.svg` — favicon brown-on-cream (reemplaza el Vite morado en `public/favicon.svg`)
- `pwa/` — PWA icons (8 PNG + manifest + splashes iOS). Mover a `Comidas-Familiares/public/icons/` y `Comidas-Familiares/public/manifest.json`. Ver `pwa/README.md` para el snippet de `<link>` tags.

**Assets:** seguir usando `lucide-react` (ya importado). Iconos usados en v2: `Home`, `BookOpen`, `ShoppingBag`, `History`, `Clock`, `Plus`, `ChevronLeft/Right/Down`, `LogOut`, `Upload`. `ChefHat` ya **no** se usa — fue reemplazado por el logomark custom `PlatoMark` (ver **`LOGOMARK.md`** en este mismo bundle para el handoff específico del mark + favicon + PWA + splash).

---

## Archivos de referencia

| Archivo | Qué es |
|---|---|
| `design/colors_and_type.css` | Sistema completo de tokens (ya en el codebase como `tokens.css` — usar como verificación). |
| `design/ui_kit/index.html` | Demo standalone. Abrilo en el browser para ver la v2 en acción. |
| `design/ui_kit/HomeScreen.jsx` | Layout completo de Home con `PlanCard` + `CompraProgress` como componentes internos. **Extraer ambos a archivos propios al portar a TS.** |
| `design/ui_kit/WeekStrip.jsx` | Tira de días. |
| `design/ui_kit/MemberAvatar.jsx` | `<MemberAvatar>` + `<AvatarStack>`. |
| `design/ui_kit/Header.jsx` | Header con brand mark inline. |
| `design/ui_kit/BottomNav.jsx` | Sin cambios visuales vs v1 — sólo pasamos de `<i data-lucide>` a SVG inline para evitar conflicto con React. **En el codebase usar `lucide-react` directamente.** |
| `design/ui_kit/Button.jsx` | Botón con variants primary/secondary/ghost/danger + press scale. El codebase ya tiene `utility classes` similares en `utilities.css`; verificar antes de duplicar. |
| `design/ui_kit/EstadoBadge.jsx` | Pill badges por estado de plan. Ya existe `EstadoBadge.tsx` probablemente; comparar. |
| `design/ui_kit/Icon.jsx` | **NO PORTAR.** Es un wrapper para SVGs inline que sólo existe porque el demo standalone no quería depender del CDN de lucide. En producción usar `lucide-react` directamente. |
| `design/ui_kit/BibliotecaScreen.jsx`, `ComprasScreen.jsx`, `DetalleRecetaScreen.jsx`, `CocinarScreen.jsx`, `LoginScreen.jsx` | Pantallas del demo. **En v2 no cambian** respecto a v1 — sólo Home + Header son el foco. Listadas por completitud. |

---

## Plan sugerido de implementación

1. **Componentes nuevos primero** (todos independientes, fáciles de probar en isolation):
   - `WeekStrip.tsx`
   - `MemberAvatar.tsx` + `AvatarStack`
   - `CompraProgress.tsx`
2. **PlanCard.tsx** — el más complejo. Probarlo standalone con sample data antes de meterlo en Home.
3. **Header.tsx** — cambio chico, hacerlo en paralelo.
4. **Home.tsx** — rearmar usando los 4 componentes nuevos. Borrar lo que reemplacen.
5. **QA visual** — abrir `design/ui_kit/index.html` lado a lado y comparar.

---

## Preguntas abiertas para el dev / diseñador

- La paleta de miembros (JP=marrón, M=bordó, S=azul, F=verde) la elegí derivándola de los tokens semánticos existentes. Si la familia tiene asociaciones de color propias, ajustar.
- "Especial · Martes a la noche" en el overline asume que cada plan tiene `dia` y `momento` (almuerzo/cena). Verificar en `types/models.ts` y si no, agregar o caer en `'Especial de la semana'` genérico.
- "Semana 22" en la esquina superior derecha — calcular con `date-fns#getWeek(new Date(), { weekStartsOn: 1 })`. Confirmar si querés mostrar número ISO o número del mes.
