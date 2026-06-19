# PROMPT E9.14 — Fase 1: visibilidad de cantidades al cocinar (UI, sin datos)

> Numeración **tentativa** (E9.x). Renumerar según convención del repo antes de commitear.
> Anclaje: auditoría **E9.14 ya corrida** (D2 = las cantidades nunca se muestran durante la cocción; D4 = la opción (a) cubre el 86% sin migrar datos). Decisión de JP: la solución de fondo es la **(c)** (linkage paso↔ingrediente), implementada en **dos fases**. **Esta es la Fase 1: solo UI, cero datos, cero migración, deployable ya.**

## Qué entrega esta fase
1. La **red de seguridad (a)**: un panel/accordion con la lista completa de ingredientes y cantidades, consultable desde **cualquier** paso, en ambos modos (guiada / scroll).
2. La **cañería de la (c)**: el campo de modelo y el render por-paso, listos para prenderse solos cuando la Fase 2 popule los tags. En esta fase ningún paso tiene tags todavía → todos ven la red (a). Ningún paso "inventa" ingredientes.

## F1 — Diagnóstico de confirmación (read-only, gate)
1. Pegar literal la interface `Paso` (`src/types/models.ts`, ~150-160) y la de `IngredienteEnReceta` (~133-147), confirmando que `cantidad`, `unidad`, `cantidadLabel`, `textoOriginal` existen.
2. Pegar la estructura de render de `PasoCard.tsx` (qué props recibe hoy; confirmar que NO tiene acceso a `receta.ingredientes[]`).
3. Pegar cómo `Cocinar.tsx` orquesta los dos modos y cómo monta `SustitutosRecap` (es el patrón a reusar para el panel nuevo).
4. Confirmar si existe ya un formateador de cantidad para display (ej. uso de `cantidadLabel`), para reusarlo y no reinventar.

**Reportar literal y esperar `procedé`. No editar hasta el procedé.**

## F2 — Implementación (tras procedé)

### 2.1 Modelo (groundwork de la (c))
- Agregar `ingredientesUsados?: string[]` (array de `idIngrediente`) a la interface `Paso`. **Opcional** → backward-compatible, sin migración. No se popula en esta fase.

### 2.2 Panel de ingredientes — red de seguridad (a)
- En `Cocinar.tsx`, agregar un panel/accordion "Ingredientes" modelado sobre `SustitutosRecap`, que liste **toda** la `receta.ingredientes[]` con su cantidad legible (`ing.cantidadLabel ?? \`${ing.cantidad} ${ing.unidad}\``) y `textoOriginal`.
- Disponible en **ambos modos** y accesible en **cualquier** paso (no solo el primero). En guiada puede ser un accordion colapsable / hoja que se abre sobre el paso actual; en scroll, visible arriba. Que el cocinero pueda contestar "¿cuánto?" en todo momento.

### 2.3 Render por-paso (la (c), latente)
- `Cocinar.tsx` construye una vez un `Map<idIngrediente, IngredienteEnReceta>` desde `receta.ingredientes[]` y lo pasa a `PasoCard` (prop nueva, ej. `ingredientesById`).
- `PasoCard`: si `paso.ingredientesUsados?.length`, renderizar una línea/chips compacta **"Este paso usa:"** resolviendo cada id contra el map → mostrar `textoOriginal` + cantidad legible.
- **Defensivo:** id que no resuelve en el map → **saltear en silencio** (no romper, no mostrar id crudo). Sin `ingredientesUsados` → no renderizar la línea (queda la red (a)).

## F3 — Build, deploy y verificación con evidencia literal
1. `npm run build` sin errores → pegar tail.
2. Suite verde → conteo antes/después (si se agregan tests de la resolución de ids).
3. `firebase deploy --only hosting`.
4. Verificación en la app (`?v=N` + incógnito): abrir una receta en Cocinar, **ambos modos**. Confirmar y describir:
   - el panel de ingredientes muestra todas las cantidades y se puede consultar en cualquier paso;
   - la línea "Este paso usa:" **no aparece** (todavía no hay tags) y **no rompe** ningún paso.

## Commits (separados, prefijo de etapa)
- `feat: E9.14 Fase 1 campo Paso.ingredientesUsados (groundwork)`
- `feat: E9.14 Fase 1 panel de ingredientes consultable en Cocinar`
- `feat: E9.14 Fase 1 render por-paso de ingredientesUsados en PasoCard`

## Restricciones
- **Cero escrituras a Firestore.** Cero migración de datos. Es UI + un campo opcional de modelo.
- No popular `ingredientesUsados` — eso es Fase 2 (depende del snapshot E9.16 y del linkage que genera JP/Claude).
- Taggeo conservador como principio: la UI nunca adivina; lo que no está taggeado cae a la lista completa.
- No marcar ✅ sin pegar build + descripción literal de lo verificado en la app.

## Nota de continuidad (no es parte de este prompt)
Fase 2: con `recetas.json` del snapshot E9.16, JP/Claude generan `pasos_ingredientes.json` (linkage validado a 0 IDs fuera del `ingredientes[]` de cada receta) y una migración gateada lo escribe en `paso.ingredientesUsados`. Esa migración **sí** escribe en prod → snapshot primero, gate estricto. Además: `auditDesyncIdIngrediente.ts` deberá cubrir también `paso.ingredientesUsados` (IDs inmutables, mismo principio que evitó el desastre de E9.0).
