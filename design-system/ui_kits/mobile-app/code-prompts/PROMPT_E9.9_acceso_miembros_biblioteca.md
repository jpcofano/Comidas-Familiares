# PROMPT E9.9 — Acceso de miembros a su biblioteca + UX de asignación con chips

> **Etapa 9 — cierra el hueco de E9.8.** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** v2.2.1 (lo dejó E9.7). Verificá el header y reportá.
> **Al terminar: commit + push (git == local).**

## Diagnóstico (auditoría)

E9.8/E9.8.1 construyó toda la curación de visibilidad por miembro (doc `config/visibilidad`,
`getRecetasParaMiembro`, filtro en `TabRecetas`, pantalla `/biblioteca/visibilidad`, toggle en
detalle) — **y funciona**. Pero quedó un hueco que la hace invisible en la práctica:

1. **Los miembros no tienen entrada a `/biblioteca` en el nav.** En `src/layout/BottomNav.tsx`,
   `memberItems` = Mi semana / Compras / Historial. Sin Biblioteca. Un miembro **no puede llegar**
   a las recetas que JP le curó (salvo tipear la URL). Por eso "no cambió nada en la vista del miembro".
2. **La UX de curación de JP** es una grilla de checkboxes (`VisibilidadBiblioteca.tsx`):
   funcional pero poco clara como acción de "asignar".

## Cambios de código

### 1. `src/layout/BottomNav.tsx` — Biblioteca para miembros
Agregar la entrada a `memberItems` (queda en 4 tabs, igual que el owner):
```ts
const memberItems = [
  { to: "/",           label: "Mi semana",  Icon: Home },
  { to: "/biblioteca", label: "Mis recetas", Icon: BookOpen },   // ← nuevo
  { to: "/compras",    label: "Compras",    Icon: ShoppingBag },
  { to: "/historial",  label: "Historial",  Icon: History },
];
```
(Label "Mis recetas" para el miembro — es su set curado. El owner mantiene "Biblioteca".)

### 2. `src/routes/Biblioteca.tsx` — modo miembro (lectura, ya casi cubierto)
El guard nivel-tab de E9.8 ya deja entrar a no-owner y `TabRecetas` ya carga
`getRecetasParaMiembro`. Pulir la **vista del miembro** para que sea claramente "Mis recetas":
- Título "Mis recetas" + bajada "Las recetas que JP eligió para vos. Elegí una para ver el paso a paso."
- **Ocultar para no-owner** (ya debería estar, confirmar): botón Catálogo, botón Visibilidad,
  Importar, tab Menús, y los filtros de administración. Dejar **solo buscador + lista de cards**
  (tap → `/receta/:id`, lectura).
- **Estado vacío** ya existe ("Pedile a JP que te habilite algunas") — confirmar que se vea y
  mencionar "Asignar recetas" como la acción de JP.

### 2.bis. Gate del botón "Empezar a cocinar" en el detalle (`DetalleReceta.tsx`)
El botón/sticky **"Empezar a cocinar" NO debe aparecer cuando el miembro está explorando** una
receta de "Mis recetas". Cocinar se inicia desde un **plan asignado** (Mi semana), no desde el
catálogo. Regla a aplicar en el detalle:
- Mostrar el botón solo si existe un **plan asignado a ese usuario** para esa receta en estado
  cocinable (`Compra pendiente` / `Compra lista` / `Cocinando`). Reusar la misma lógica de
  asignaciones + estado que ya usa `MemberDashboard` (`asignaciones.includes(memberId)` +
  `E4.4` guard de cocinar).
- El owner (JP) mantiene su comportamiento actual (acciones de plan + entrada a cocinar).
- Esto es coherente con el guard de cocción existente (E4.4): la receta se lee siempre, pero
  cocinar requiere un plan asignado.

### 3. `src/routes/VisibilidadBiblioteca.tsx` — UX de "asignar" con chips
Reemplazar la grilla de checkboxes por **chips de miembro por receta** (más legible como acción):
- Cada fila de receta: nombre + `proteinaPrincipal · tipoItem`, y debajo **3 chips** (María /
  Sofía / Federico) con avatar de inicial + color de miembro. Chip **relleno** = visible para ese
  miembro; **outline** = oculto. Tap = `toggleVisibilidadReceta`.
- Mantener los **contadores por miembro** arriba (cuántas recetas tiene cada uno) y el buscador.
- Renombrar el header a **"Asignar recetas"** (más claro que "Visibilidad de biblioteca") y la
  bajada: "Elegí qué recetas ve cada miembro en su biblioteca. Pueden cocinar cualquier receta
  que les asignes en un plan, esté o no acá." Mantener la ruta `/biblioteca/visibilidad`.
- Paleta de miembros (la del handoff): María `#74324a`, Sofía `#3c4a6e`, Federico `#2e5d2e`.
- El botón de entrada en Biblioteca (owner) pasa a label **"Asignar recetas a la familia"**
  (ícono `Users`).

### 4. Nada de seguridad / modelo nuevo
No se toca `config/visibilidad`, ni Rules, ni `getRecetasParaMiembro`. Es navegación + UX.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch: v2.2.1 → **v2.2.2**. Reportá versión.
2. Subsección `### 1.2.E9.9 Cambios en v2.2.2 (E9.9 — acceso de miembros a su biblioteca + UX de
   asignación)`: Biblioteca en `memberItems` (label "Mis recetas"), vista de miembro lectura,
   curación con chips de miembro, header "Asignar recetas". Notar que cierra el hueco de E9.8
   (la curación era inalcanzable para el miembro).
3. En §11, marcar **E9.9 ✅ HECHO (v2.2.2)**.
4. Registrar `**PROMPT_E9.9_acceso_miembros_biblioteca.md** ✅ CERRADO (v2.2.2)`.

## Criterio de aceptación
1. Logueado como María, el nav inferior muestra **Mis recetas**; al abrirla ve solo las recetas
   que JP le habilitó (las mismas del doc `config/visibilidad`), en modo lectura, y puede abrir el
   detalle. Federico (0 habilitadas) ve el estado vacío.
2. **Abriendo una receta desde "Mis recetas" (sin plan asignado cocinable), el miembro NO ve
   "Empezar a cocinar".** Si esa receta sí tiene un plan asignado y cocinable, el botón aparece.
   JP siempre lo ve.
2. Como owner, "Asignar recetas" muestra cada receta con 3 chips de miembro; togglear un chip
   actualiza la biblioteca de ese miembro en realtime y el contador.
3. No-owner no ve Catálogo / Importar / Asignar / Menús.
4. Sigue valiendo: un miembro puede cocinar una receta asignada por plan aunque no esté en su
   biblioteca (no se rompió la lectura por plan).
5. Light y dark. Build + typecheck + tests verdes.
6. Pegá el diff de `BottomNav.tsx`, `VisibilidadBiblioteca.tsx`, `Biblioteca.tsx`,
   `DetalleReceta.tsx` (gate de cocinar) y la subsección 1.2.E9.9.

## Fuera de scope
- Que lo curado aparezca en el `MemberDashboard` (home del miembro): por decisión, **solo** en la
  tab Mis recetas. No tocar el home.
- "Ver como miembro" para el owner: JP verifica entrando con el mail del miembro.

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E9.9: acceso de miembros a su biblioteca (tab Mis recetas) + UX de asignación con chips de miembro + MAPEO v2.2.2"
git push
```
Confirmá push OK.
