# PROMPT E10.3 — Importador Paso 2 a tokens (arreglar dark mode)

> **Etapa 10.** Toca código + `docs/MAPEO_FIRESTORE.md`. Cambio de estilos, sin lógica.
> **MAPEO vigente esperado:** ≥ v2.3.0. Verificá el header y reportá.
> **Al terminar: commit + push (git == local).**

## Por qué

`src/routes/ImportarReceta.tsx` quedó con **colores hardcodeados** (de antes del dark mode E8.2),
así que el importador **no respeta el tema oscuro**: badges, el Paso 2 (revisar matching) y los
bloques de resultado usan hex fijos claros. El resto de la app ya está en tokens; el prototipo del
kit (`ImportarRecetaScreen.jsx`) ya muestra el Paso 2 íntegro en tokens — esto lo lleva al repo.

## Inventario de hardcodeos a reemplazar (no exhaustivo — buscar todos los `#hex` y `rgb()` del archivo)

**Badges (líneas ~84-86 y la de "alternativa"):**
```
badge("#1b5e20", "#e8f5e9")  // exacto   → texto var(--ok-text),   fondo var(--ok-bg)
badge("#6d4c00", "#fff8e1")  // sugerencia→ texto var(--warn-text), fondo var(--warn-bg)
badge("#424242", "#eeeeee")  // nuevo    → texto var(--muted-strong), fondo var(--surface-alt)
badge("#5c35a0", "#ede7f6")  // alternativa → usar var(--accent-text)/var(--accent-bg) si existen;
                              // si no, var(--accent) sobre var(--accent-soft)
```

**Paso 1 / textarea / errores:** `border: "1px solid #ddd"` → `var(--border)`;
caja de error `#fdecea` + `borderLeft #c62828` → `var(--err-bg)` + `var(--err-line)`/`var(--err-text)`;
texto `#c62828` → `var(--err-text)`.

**Paso 2 — `FilaIngrediente` (líneas ~700-810):**
- contenedor `border "1px solid #e0e0e0"`, `background "#fafafa"` → `var(--border)` / `var(--surface)`.
- opción sugerencia seleccionable: `border #1976d2 / #ccc`, `background #e3f2fd / #fff`
  → `var(--primary)` / `var(--border)`, `var(--primary-soft)` / `var(--surface-strong)`.
- "crear nuevo": `border #424242 / dashed #aaa`, `background #f5f5f5` → `var(--muted-strong)` /
  `var(--line)` (dashed), `var(--surface-alt)`.
- inputs/selects `border "1px solid #ccc"` → `var(--border)`, `background var(--surface-strong)`,
  `color var(--text)`.
- `borderLeft "2px solid #ccc"` del bloque alternativa → `var(--border)`.
- warning inline `#fff8e1 / #f9a825` → `var(--warn-bg)` / `var(--warn-line)` / `var(--warn-text)`.

**Paso 3 — bloques de resultado:** `#e8f5e9/#2e7d32` → ok-*, `#fff8e1/#f9a825` → warn-*,
`#fdecea/#c62828` → err-*. Texto `#666/#888` → `var(--muted)`.

> Regla: **ningún `#hex` ni `rgb()` literal** debe quedar en estilos del archivo (salvo `#fff` de
> texto sobre color sólido, que ya se usa como `fg`). Si falta un token para algo, usar el más
> cercano del set existente (no inventar tokens nuevos). Mantener el `badge()` helper, solo cambiar
> sus argumentos a `var(--…)`.

## No tocar
- La **lógica** (parser, `matchIngrediente`, guardado, navegación de pasos): sin cambios.
- La estructura/JSX: solo valores de color. (Si querés, podés alinear el look del Paso 2 al
  prototipo, pero el objetivo mínimo es tokens + dark mode correcto.)

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch. Reportá versión.
2. Subsección `### 1.2.E10.3 Cambios en vX.Y.Z (E10.3 — importador Paso 2 a tokens)`: se migraron
   los colores hardcodeados de `ImportarReceta.tsx` (badges, Paso 2, bloques de resultado) a
   tokens; el importador ahora respeta dark mode.
3. En §11 Lote 10, marcar **E10.3 ✅ HECHO (vX.Y.Z)**.
4. Registrar `**PROMPT_E10.3_importador_tokens.md** ✅ CERRADO (vX.Y.Z)`.

## Criterio de aceptación
1. En **dark mode**, el importador completo (Pasos 1-3) se ve correcto: sin cajas blancas ni
   texto gris claro ilegible; badges y selects con contraste correcto.
2. En light mode no hay regresión visual respecto de hoy.
3. No queda ningún `#hex`/`rgb()` literal en estilos del archivo (salvo `#fff` de texto sobre sólido).
4. Build + typecheck + tests verdes.
5. Pegá el diff de `ImportarReceta.tsx` y la subsección 1.2.E10.3.

## Cierre
```
git add -A
git commit -m "E10.3: importador Paso 2 (y badges/resultado) a tokens — respeta dark mode + MAPEO"
git push
```
Confirmá push OK.
