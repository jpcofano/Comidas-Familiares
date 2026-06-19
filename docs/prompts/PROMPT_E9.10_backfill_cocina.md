# PROMPT E9.10 — Backfill de `cocina` desde `estilo`

> **Objetivo:** poblar `cocina` en las 188 recetas que lo tienen vacío, **solo** donde `estilo` sea una cocina del enum. Dejar `cocina` en null donde `estilo` sea no-geográfico o vacío (`cocina` es opcional: `cocina?: Cocina`). `estilo` NO se modifica: queda como campo histórico.
>
> **Alcance:** primero diagnóstico read-only + propuesta de mapeo. NO escribir hasta `procedé` de JP **sobre la tabla revisada**.

---

## D1 — Insumos para el mapeo (read-only, pegar literal)

1. Los **15 valores del enum `Cocina`** de `models.ts`, literal.
2. Para las **188 recetas con `cocina` vacío**: `estilo` distinto → conteo, **restringido a ese subconjunto** (no el global de 70).
3. **Proponé una tabla de mapeo** con tres columnas: `valor estilo` | `cocina destino (valor EXACTO del enum)` | `# recetas afectadas`.
   - Mapeá a una cocina del enum **solo** los `estilo` claramente geográficos, respetando tildes y mayúsculas exactas del enum (ej. cuidado con `Arabe`/`Árabe / Medio Oriente`, `Mediterranea`/`Mediterránea`).
   - Marcá como **`→ (null, sin cocina)`** todo `estilo` no-geográfico o vacío (`Keto dulce`, `Desayuno proteico`, `Snack proteico`, `""`, etc.).

> Pegá la tabla completa y **esperá `procedé`**. JP la revisa antes de cualquier escritura.

## Aplicación (recién tras `procedé` sobre la tabla)

- Para cada receta con `cocina` vacío cuyo `estilo` tenga destino **no-null** en la tabla aprobada: `set cocina = valor exacto del enum`.
- **No tocar** recetas que ya tienen `cocina` poblado.
- **No tocar** `estilo` en ningún caso.
- Reportá al cierre: **N actualizadas**, **N dejadas en null** (listando su `estilo`), **total**.

## Requisitos

- Sin escritura antes del `procedé` sobre la tabla.
- Valores de `cocina` **exactos** al enum (case + tilde); un valor mal escrito es un enum inválido.
- Output literal del resultado del write (no ✅ pelado).
- Commit: `Data: E9.10 backfill cocina desde estilo`
