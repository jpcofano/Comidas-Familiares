# PROMPT E14.7b — Aplicar backfill de cocina (confirmado)

> Pegar a Claude Code. Continúa el backfill de `cocina` de E14.7, ya revisado por JP.
> Aplica solo lo confirmado. No reabrir el mapa.

## Aplicar

1. **Bloque 1 — confirmado:** aplicar las **118 recetas** del mapa `estilo → cocina` propuesto
   (`--apply`). Sin cambios al mapa.

2. **Bloque 2 — "Asiático" (4 recetas), resuelto por la regla "pertenencia, no aroma":**
   - `REC-0402` (Ribs laqueadas con jengibre, soja y ajo) → **`cocina: "China"`** (el laqueado /
     char siu es una preparación canónica china).
   - `REC-0401`, `REC-0403`, `REC-0404` → **dejar SIN `cocina`** (ensaladas y guarnición de arroz
     genéricas; soja/sésamo/jengibre no definen el origen — regla 3).

3. **Bloque 3 — 75 sin clasificar:** no tocar (correcto que queden sin `cocina`).

## Verificación
- Contar recetas con `cocina` poblado antes/después (esperado: +119 → 118 del bloque 1 + REC-0402).
- `REC-0401/0403/0404` siguen sin `cocina`.
- Idempotente: re-correr no cambia nada.
- En Biblioteca, filtrar por **China** ahora incluye REC-0402; filtrar por **Argentina** incluye
  los estilos descriptivos (Steakhouse, Criollo, Wok criollo).

```
git commit -m "E14.7b: aplica backfill de cocina (118 + REC-0402→China); ensaladas/arroz asiáticos quedan sin clasificar"
```
