# Bloque para el prompt generador de recetas — linkage paso↔ingrediente

> **Cuándo aplicar:** recién **después** de E9.14 Fase 2 (cuando `Paso.ingredientesUsados` ya exista en el modelo y las 308 recetas estén backfilleadas). Antes de eso, escribiría contra un campo que no existe.
> **Objetivo:** que las recetas nuevas nazcan ya taggeadas, sin reabrir la brecha entre viejas (con linkage) y nuevas (sin).

---

## 1. En el contenido (lo que genera el LLM)
Por cada paso, además de `detalle`, emitir **`ingredientesDelPaso`**: la lista de ingredientes de **esta** receta que el paso usa, **por su nombre tal como figura en la lista de ingredientes de la receta** (no por id — los ids los asigna el builder).

- **Criterio semántico, no textual.** Si el paso dice "dorar la carne", listá la proteína aunque la palabra exacta no aparezca. El generador conoce su propia receta → taggeá con confianza (esta es la ventaja sobre el builder heurístico del backfill).
- **Abstención correcta.** Un paso que no usa ningún ingrediente puntual (ej. "hornear 4 h sin abrir", "dejar reposar 10 min", "precalentar el horno") va con **lista vacía**. No inventes un ingrediente para llenar.
- **Solo lo que está en la receta.** Nunca nombres algo que no esté en `ingredientes[]`.

## 2. En el builder (`build_seed_vN.py`)
Al asignar `idIngrediente` a cada ingrediente de la receta, resolver `ingredientesDelPaso` (nombres) → **`ingredientesUsados`** (ids), con validación dura:

- Cada nombre del paso debe resolver a **exactamente un** ingrediente de la receta → su id.
- **0 huérfanos.** Si un nombre del paso no matchea ningún ingrediente de la receta, **abortar y reportar** — no emitir un id inventado. Mismo invariante que las tandas ("0 referencias huérfanas").
- **ids inmutables.** `ingredientesUsados` referencia los mismos ids ya asignados a `ingredientes[]`. Si un id cambia, se migra en la misma operación (principio E9.0).
- El campo es **sparse**: pasos con lista vacía van **sin** `ingredientesUsados` (no `[]`) → la UI cae a la red (a).

## 3. Cantidades (recordatorio de convención, no cambia el formato)
- **Cantidades concretas siempre.** Nunca `"a gusto"` en un ingrediente que lleva cantidad real.
- `"a gusto"` se reserva **solo** para staples genuinos sin medida (sal/pimienta a gusto). Todo lo demás: número parseable como string o rango (ej. `"400"`, `"1,2"`, `"1,2 a 1,5"`).
- El lado de lectura ya parsea strings desde **E9.15** (`cantidadNumerica`). **No cambiar el formato string** — solo evitar los `"a gusto"` espurios que inflaban la lista de compras.

## 4. Chequeo final del builder (extender el que ya existe)
Antes de entregar el JSON de la tanda, además de "0 referencias de ingredientes huérfanas", agregar:
- **0 ids en `ingredientesUsados` fuera del `ingredientes[]` de su receta.**
- (Cuando exista) `auditDesyncIdIngrediente.ts` debe cubrir también `paso.ingredientesUsados`.
