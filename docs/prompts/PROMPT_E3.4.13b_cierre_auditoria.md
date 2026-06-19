# PROMPT E3.4.13b — Cierre de auditoría (READ-ONLY)

> **Por qué:** la auditoría E3.4.13 volvió sin pegar evidencia literal y sin tocar lo central: `cocina`, conteos, conformidad de enums y el caso mozzarella. Code reportó sobre `estilo` (campo viejo) pero no sobre `cocina` (dimensión canónica de E7.13). Cerramos esos puntos antes de decidir el backfill.
>
> **Alcance:** solo lectura. Output = **queries + resultados pegados literal**. Sin ✅ pelado. No corregir nada. Esperar `procedé`.

---

## C1 — `cocina` vs `estilo` (lo central)

1. ¿Existe el campo **`cocina`** en los docs de `recetas`? Pegá el resultado de una query que cuente: docs con `cocina` **poblado** vs **vacío/ausente**.
2. Pegá la **lista completa de valores distintos de `estilo`** con su conteo (`valor → N`). Necesito el set entero para armar la tabla de mapeo `estilo → cocina`.
3. Confirmá desde `models.ts` / `MAPEO_FIRESTORE.md` cuál es el campo canónico (`cocina` o `estilo`) y si `estilo` quedó **deprecado**. Pegá el enum `cocina` (sus 15 valores) literal.

## C2 — Conteos (pegar números)

1. **Total de recetas** (excluyendo los 2 sintéticos de comprasRapidas) y **total de ingredientes**.
2. Delta contra lo esperado: **78 base + tandas 1–2 + 175 nuevas**.

## C3 — Conformidad de enum (pegar las listas, aunque vengan vacías)

1. Recetas con **`proteinaPrincipal`** fuera del enum vivo. Nombre + valor.
2. Recetas con **`tipoItem` / `costoEstimado` / `dificultad`** fuera de enum. Nombre + valor.

## C4 — Mozzarella

1. Query por `Mozzarella` **y** `Muzzarella`: cuál existe, con qué `idIngrediente`, y si hay recetas apuntando a la grafía no-canónica.

---

## Requisitos

- **Cada punto con su query y su resultado pegados.** Nada de resúmenes sin output.
- Si un campo no existe (ej. `cocina` ausente del schema), decílo explícito.
- No corregir nada. Terminar y esperar `procedé`.
