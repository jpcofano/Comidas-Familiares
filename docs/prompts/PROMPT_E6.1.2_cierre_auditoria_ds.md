# PROMPT — Cierre de auditoría Design System v1.0

> **Para:** Claude Code, trabajando sobre `jpcofano/Comidas-Familiares` @ `main`.
> **Origen:** hallazgos de `AUDIT_2026-05-28.md` (Auditoría #2 vs Comida Familiar Design System v1.0).
> **Alcance:** limpieza + 1 refactor funcional. **No** toca lógica de negocio, data layer, ni rutas. **No** incluye dark mode (queda para otro PR, depende de una decisión de producto).

## Contexto

La app ya implementó casi todo el design system v1.0. Quedan 5 fixes: 1 con impacto funcional (badge de estado duplicado e inconsistente) y 4 de limpieza. Resolverlos todos en **un solo PR** titulado `chore(ds): cierre auditoría v1.0 — badge compartido + limpieza`.

---

## Tarea 1 — Unificar `EstadoBadge` (ÚNICO con impacto funcional) 🔴

**Problema:** hay dos copias divergentes del componente `EstadoBadge`:
- `src/components/PlanCard.tsx` → 6 estados (incluye `"Evaluada"`).
- `src/routes/MemberDashboard.tsx` → solo 5 estados (le falta `"Evaluada"` → un plan evaluado muestra el badge gris equivocado en la vista de miembro).

Y un tercer badge de la misma familia: `ResultadoBadge` en `src/routes/Historial.tsx`.

**Hacer:**

1. Crear `src/components/EstadoBadge.tsx`:

```tsx
import type { EstadoPlan } from "../types/models";

const ESTILOS: Record<string, { bg: string; color: string }> = {
  "Elegida":          { bg: "var(--surface-alt)", color: "var(--muted)" },
  "Compra pendiente": { bg: "var(--warn-bg)",     color: "var(--warn-text)" },
  "Compra lista":     { bg: "var(--info-bg)",     color: "var(--info-text)" },
  "Cocinando":        { bg: "var(--primary)",     color: "var(--primary-on)" },
  "Cocinada":         { bg: "var(--ok-bg)",       color: "var(--ok-text)" },
  "Evaluada":         { bg: "var(--surface-alt)", color: "var(--muted-strong)" },
};

export function EstadoBadge({ estado }: { estado: EstadoPlan | string }) {
  const s = ESTILOS[estado] ?? ESTILOS["Elegida"];
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px",
      borderRadius: "var(--radius-full)", fontSize: "var(--fs-xs)",
      fontWeight: 500, background: s.bg, color: s.color,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>{estado}</span>
  );
}
```

2. Crear `src/components/ResultadoBadge.tsx`:

```tsx
const COLORES: Record<string, { bg: string; color: string }> = {
  "Excelente": { bg: "var(--ok-bg)",   color: "var(--ok-text)" },
  "Muy bueno": { bg: "var(--ok-bg)",   color: "var(--ok-text)" },
  "Bueno":     { bg: "var(--info-bg)", color: "var(--info-text)" },
  "Regular":   { bg: "var(--warn-bg)", color: "var(--warn-text)" },
  "Malísimo":  { bg: "var(--err-bg)",  color: "var(--err-text)" },
};

export function ResultadoBadge({ resultado }: { resultado: string }) {
  const s = COLORES[resultado] ?? { bg: "var(--surface-alt)", color: "var(--muted)" };
  return (
    <span style={{
      fontSize: "var(--fs-xs)", padding: "2px 8px",
      borderRadius: "var(--radius-full)", background: s.bg, color: s.color,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>{resultado}</span>
  );
}
```

3. **Borrar** la definición local de `EstadoBadge` en `src/components/PlanCard.tsx` y reemplazarla por `import { EstadoBadge } from "./EstadoBadge";`. Eliminar el hack `fontWeight: "var(--fw-medium)" as unknown as number` (ya no aplica).

4. **Borrar** la definición local de `EstadoBadge` en `src/routes/MemberDashboard.tsx` y reemplazarla por `import { EstadoBadge } from "../components/EstadoBadge";`.

5. **Borrar** la definición local de `ResultadoBadge` en `src/routes/Historial.tsx` y reemplazarla por `import { ResultadoBadge } from "../components/ResultadoBadge";`.

6. **Buscar más copias.** Hacer un grep por `EstadoBadge`, `ResultadoBadge` y por los patrones `padding: "2px 10px"` / `borderRadius: "var(--radius-full)"` en `src/routes/` (sobre todo `Voto.tsx`, `HistorialDetalle.tsx`, `DetalleMenu.tsx`, `Compras.tsx`). Si hay badges equivalentes inline, reemplazarlos por los componentes nuevos.

**Criterio de aceptación:** una sola definición de cada badge en `src/components/`. Un plan en estado `"Evaluada"` muestra el badge correcto en TODAS las vistas (Home/JP y MemberDashboard).

---

## Tarea 2 — Borrar carpeta `public/splash/` huérfana

`public/splash/` (11 PNG, ~1 MB) está duplicada con `public/icons/splash/`. **`index.html` y `public/manifest.json` solo referencian `/icons/splash/`** — la carpeta `public/splash/` no la usa nadie.

**Hacer:**
1. Confirmar con grep que ningún archivo referencia `/splash/` sin el prefijo `/icons/` (`grep -rn "\"/splash/\|'/splash/\|(/splash/" .` en `index.html`, `public/manifest.json`, `src/`).
2. `git rm -r public/splash/`.

---

## Tarea 3 — Borrar assets de scaffold Vite

`src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg` parecen restos del template.

**Hacer:**
1. Grep: `grep -rn "hero.png\|react.svg\|vite.svg" src/ index.html`.
2. Si **no** hay imports, `git rm` los tres. Si alguno se usa, dejarlo y avisar en el PR.

---

## Tarea 4 — Actualizar comentario stale en `tokens.css`

En `src/styles/tokens.css` (arriba de todo) reemplazar:

```
/* PALETA — Estilo B · Cocina cálida (provisoria)
   A revisar en Etapa 6 con Claude Design */
```

por:

```
/* PALETA — Estilo B · Cocina cálida — FINAL
   Sourced from design-system colors_and_type.css v1.0 */
```

---

## Tarea 5 — `username`: truncar en vez de ocultar en mobile

En `src/layout/Header.css`, **borrar** el bloque:

```css
@media (max-width: 419px) { .username { display: none; } }
```

y agregar truncado a la regla `.username`:

```css
.username {
  font-weight: var(--fw-medium);
  color: var(--text);
  font-size: var(--fs-base);
  max-width: 40vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

## Tarea 6 — Verificar `public/icons.svg`

Hay un `public/icons.svg` (5 KB) que quizás no se use (el favicon real es `favicon.svg`).
**Hacer:** grep `icons.svg` en `src/` e `index.html`. Si nadie lo referencia, `git rm public/icons.svg`. Si se usa, dejarlo.

---

## Fuera de alcance (NO hacer en este PR)

- **Dark mode** (`tokens-dark.css`): depende de decisión de producto (system preference vs toggle manual). Va en otro PR.

## Checklist final del PR

- [ ] `npm run build` pasa sin errores ni warnings nuevos de TS.
- [ ] `npm run lint` limpio.
- [ ] No quedó ninguna definición local de `EstadoBadge` / `ResultadoBadge` fuera de `src/components/`.
- [ ] Badge `"Evaluada"` se ve correcto en MemberDashboard.
- [ ] `public/splash/` eliminada; `public/icons/splash/` intacta; PWA splashes siguen cargando.
- [ ] Diff no toca data layer, rules, ni rutas (solo componentes/estilos/assets).
