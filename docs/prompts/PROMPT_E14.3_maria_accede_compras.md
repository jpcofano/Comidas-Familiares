# PROMPT E14.3 — Dar a María acceso a Compras (igual que ve Recetas)

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> **A implementar ahora.** Numerar al próximo libre si `E14.3` ya existe.
>
> **Contexto / diagnóstico (ya auditado):** el permiso de María **ya está concedido** —
> la ruta `/compras/armar` y el componente `CompraRapidaArmar` la dejan pasar (`puedeArmar =
> selfId === "juanpablo" || selfId === "maria"`). El problema es **de navegación**: María no
> tiene ningún punto de entrada visible. Sus 3 accesos están bloqueados o enterrados. Este
> prompt **no toca permisos de backend ni reglas de Firestore** — solo abre los accesos de UI
> para que María vea y use Compras igual que hoy ve "Mis recetas".

## Objetivo
Que María, además de ver sus recetas en Biblioteca, **vea y use Compras con funcionalidad
completa**: armar la lista de la semana (modos A/B/C), asignarla, y gestionar las plantillas
maestras. Sofía y Federico siguen como hasta ahora (ven su instancia asignada, no arman).

Definir **un único helper** y reusarlo en todos lados (no repetir el literal):
```ts
// donde tengas un lugar común de permisos (o inline por ahora):
const puedeGestionarCompras = memberId === "juanpablo" || memberId === "maria";
```

---

## FIX 1 — Destrabar el dashboard de María (catch-22)
`src/routes/MemberDashboard.tsx` (~línea 340). Hoy el link **"+ Armar"** vive **dentro** de la
card "Compras pendientes", que solo se renderiza con `misCompras…length > 0`. Resultado: el botón
para crear la primera lista solo aparece si ya existe una. Sacarlo del guard + estado vacío:

```tsx
const puedeGestionarCompras = memberId === "juanpablo" || memberId === "maria";
const comprasActivas = misCompras.filter((p) => p.estado !== "Compra lista");

{(comprasActivas.length > 0 || puedeGestionarCompras) && (
  <div className="card">
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--space-2)" }}>
      <h3 style={{ margin:0, fontSize:"var(--fs-base)", fontWeight:"var(--fw-semibold)", color:"var(--text-strong)", display:"flex", alignItems:"center", gap:"var(--space-2)" }}>
        <ShoppingBag size={16} color="var(--primary)" /> Compras pendientes
      </h3>
      {puedeGestionarCompras && (
        <Link to="/compras/armar" style={{ fontSize:11, color:"var(--primary)", textDecoration:"none", fontWeight:600 }}>+ Armar</Link>
      )}
    </div>
    {comprasActivas.length === 0 ? (
      <p className="meta" style={{ margin:0, fontSize:"var(--fs-xs)" }}>
        No hay compras pendientes. Tocá <strong>+ Armar</strong> para preparar la de esta semana.
      </p>
    ) : (
      comprasActivas.map((p) => { /* …la lista de siempre, sin cambios… */ })
    )}
  </div>
)}
```

---

## FIX 2 — Botón "Armar la compra" en la página /compras (recomendado)
`src/routes/Compras.tsx`. La página `/compras` ya está en el menú inferior de María
(`memberItems` en `BottomNav.tsx`), pero no tiene ningún acceso a armar. Es el lugar natural.
En el header de Compras, debajo del título "Lista de compras":

```tsx
const puedeGestionarCompras = memberId === "juanpablo" || memberId === "maria";

{puedeGestionarCompras && (
  <Link to="/compras/armar" style={{
    display:"inline-flex", alignItems:"center", gap:6, padding:"9px 14px",
    borderRadius:"var(--radius-md)", background:"var(--primary)", color:"#fff",
    textDecoration:"none", fontWeight:700, fontSize:"var(--fs-sm)", marginTop:8,
  }}>
    <ShoppingBag size={16} /> Armar la compra
  </Link>
)}
```

---

## FIX 3 — Pestaña "Compras" de Biblioteca visible para María
Esto es lo que hace que María **"vea Compras igual que ve Recetas"**: la pestaña vive en
Biblioteca junto a "Mis recetas". Hoy está gateada a `isJP`. Abrirla a `puedeGestionarCompras`.

`src/routes/Biblioteca.tsx`:
1. **Tabbar** — agregar el botón de pestaña "Compras" cuando `puedeGestionarCompras` (hoy ~línea
   580/588 solo para `isJP`). Para María, el tabbar pasa a tener "Mis recetas" + "Compras"
   (sin "Menús", que sigue solo-JP).
2. **Render del tab** (~línea 651-652):
```tsx
const puedeGestionarCompras = memberId === "juanpablo" || memberId === "maria";
{tab === "menus"   && isJP                   && <TabMenus />}
{tab === "compras" && puedeGestionarCompras  && <TabComprasRapidas />}
```
3. Dentro de `TabComprasRapidas` ya está el CTA "Armar la compra (modos A/B/C)" (~línea 403) y
   "Nueva plantilla" — quedan disponibles para María automáticamente al abrir el tab. Verificar
   que ninguna acción interna esté gateada por `isJP` (crear/editar/eliminar plantilla, generar
   instancia): cambiar esos `isJP` por `puedeGestionarCompras`.
4. El editor de plantillas `src/routes/CompraRapidaEditor.tsx` (~línea 38) hoy redirige si
   `memberId !== "juanpablo"`. Cambiar el guard a `puedeGestionarCompras` para que María pueda
   crear/editar plantillas:
```tsx
if (state.status !== "authenticated" ||
    !(state.user.memberId === "juanpablo" || state.user.memberId === "maria")) {
  return <Navigate to="/biblioteca" replace />;
}
```

> Si por ahora **no** querés que María edite las plantillas maestras (solo que arme la semanal),
> aplicá Fix 1 + 2 y omití Fix 3/4. Pero el pedido fue "que vea Compras como ve Recetas" → con
> Fix 3 la pestaña aparece en Biblioteca y queda simétrico con "Mis recetas".

---

## Qué NO cambia
- Permisos de backend / reglas Firestore: **sin cambios** (modelo familiar abierto; confirmar deploy).
- `CompraRapidaArmar.tsx` y la ruta `/compras/armar`: ya permiten a María, no tocar.
- Sofía y Federico: sin cambios; ven su instancia asignada y operan sobre ella, no arman ni
  gestionan plantillas.

## Cierre
1. Centralizar `puedeGestionarCompras` (helper o constante reusada) en vez del literal repetido.
2. Tests: si hay test del tabbar de Biblioteca o de guards de ruta, agregar caso `maria` →
   pestaña Compras visible y `/compras/armar` accesible; `sofia` → no.
3. `npm test` verde, `npm run build` ok.
4. Pegar diff de `MemberDashboard.tsx`, `Compras.tsx`, `Biblioteca.tsx`, `CompraRapidaEditor.tsx`.

```
git commit -m "E14.3: María accede a Compras igual que a Recetas (dashboard + /compras + tab Biblioteca + editor plantillas)"
```

## Criterios de aceptación
1. Logueada como **María**, al entrar ve en su dashboard el acceso **"+ Armar"** aunque no tenga
   ninguna compra (con estado vacío), y llega a `/compras/armar`.
2. En **/compras** (menú inferior) ve el botón **"Armar la compra"**.
3. En **Biblioteca** ve la pestaña **"Compras"** junto a "Mis recetas", con el CTA de armar y
   "Nueva plantilla"; puede crear/editar plantillas y generar la lista de la semana.
4. Puede asignar la compra a varias personas y aparece en la principal de cada asignado.
5. **Sofía/Federico** no ven ni la pestaña Compras de Biblioteca ni el botón de armar; siguen
   viendo solo su instancia asignada.
6. Sin cambios de reglas; nada se rompe para JP.
```
