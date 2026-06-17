# PROMPT E9.5 — Pulido Biblioteca: acceso a Catálogo antes de la primera receta

> **Etapa 9 — Lote 9.** Toca código + `docs/MAPEO_FIRESTORE.md`. Cambio chico de UI.
> **MAPEO vigente esperado:** el que haya cuando lo corras (≥ v2.0.2). Verificá el header y reportá.
> **Al terminar: commit + push.**
>
> Numeración: E9.0/E9.0.1/E9.1 (importador), E9.2 (fix Historial), E9.3 (matcher), E9.4
> (sustitución) ya asignados. Esto es **E9.5**.

## Por qué

En `src/routes/Biblioteca.tsx`, el acceso al catálogo de ingredientes está hoy como una
**tab-action chica** en la fila de tabs:
```tsx
<Link to="/biblioteca/catalogo" className="tab-action">
  <span>Ingredientes</span>
</Link>
```
Queda poco visible y mezclado con los tabs. Debe ser un **botón claro "Catálogo de
ingredientes" ubicado ANTES de la primera receta** (arriba del listado), como en el prototipo
del kit (`BibliotecaScreen.jsx`).

## Cambio de código (solo `src/routes/Biblioteca.tsx`)

1. **Quitar** el `<Link className="tab-action">Ingredientes</Link>` de la fila de tabs. Dejar en
   esa fila solo Recetas / Menús + la acción **Importar** (que sí pertenece a los tabs).
2. **Agregar** un botón/Link **"Catálogo de ingredientes"** ubicado **antes de la primera
   receta** — arriba del `<div className="card">` que contiene el listado (o como primer hijo de
   ese card, antes del listado). Recomendado: fila full-width, ícono a la izquierda (carrot/zanahoria,
   coherente con el resto), label "Catálogo de ingredientes", chevron a la derecha. Usar tokens
   (`--surface-strong`, `--border`, `--primary`), no colores hardcodeados.
3. **JP-only** (la ruta ya está protegida por `isJP`; el botón vive dentro de `BibliotecaRoute`
   que ya hace `if (!isJP) <Navigate/>`, así que no hace falta gate extra).
4. Navega a `/biblioteca/catalogo` (igual destino que hoy).
5. Visible en ambos tabs (Recetas y Menús) o al menos en Recetas — definí y dejá consistente;
   sugerido: visible siempre, arriba del card de contenido.

> Referencia de diseño: en `BibliotecaScreen.jsx` el botón quedó como fila full-width entre los
> tabs y el card de contenido (antes de la primera receta), con `Icon name="carrot"` + label +
> chevron.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch. Reportá versión.
2. Subsección `### 1.2.E9.5 Cambios en vX.Y.Z (E9.5 — acceso a Catálogo antes de la primera
   receta)`: se movió el acceso de tab-action a botón sobre el listado.
3. Registrar `**PROMPT_E9.5_pulido_biblioteca_catalogo.md** ✅ CERRADO (vX.Y.Z)` en §11 Lote 9.

## Criterio de aceptación
1. En Biblioteca, el botón "Catálogo de ingredientes" aparece **arriba, antes de la primera
   receta**, y abre `/biblioteca/catalogo`.
2. Ya no hay tab-action "Ingredientes" en la fila de tabs.
3. Funciona en light y dark (tokens). Build + typecheck + tests verdes.

## Fuera de scope
- Los filtros de Biblioteca (proteína por `GRUPOS_PROTEINA`, Vegetariana/Keto) **ya están bien**
  en el repo — no tocar. (El prototipo se actualizó para reflejarlos; era el kit el que estaba
  atrasado, no el código.)

## Cierre
```
git add -A
git commit -m "E9.5: Biblioteca — acceso a Catálogo de ingredientes como botón antes de la primera receta (saca tab-action) + MAPEO"
git push
```
Confirmá push OK.
