# PROMPT E9.11b — Contexto para fixes de medidas (READ-ONLY)

> **Objetivo:** juntar el contexto literal de lo **accionable** del audit E9.11 (D1 real, D2 "un poco de", D4b real) para asignar medidas exactas antes de corregir. No incluye sal/pimienta (D3) ni D4a: quedan como excepción/parkeado salvo indicación de JP.
>
> **Alcance:** solo lectura. Output = registros y textos **pegados literal**. NO corregir nada. Esperar `procedé`.

---

## C1 — Registros de D1 (pegar tal cual)

Para cada uno, pegá el registro de ingrediente completo: `nombre | preparacion | cantidad | unidad | notas | textoOriginal`:
- Eritritol en **Brownie keto** y en **Limonada de jengibre**
- Azúcar mascabo en **Limonada clásica**
- Chipotle en **Tinga de pollo**
- Ají molido en **Chimichurri**
- Papel manteca en **Cochinita pibil**

## C2 — Contexto de los pasos de D2

Para **cada hit de D2** (los "un poco de", "un hilo de", "un chorrito", "a gusto"), pegá:
1. `receta | nroPaso | titulo | detalle COMPLETO` (texto íntegro del paso).
2. La **lista de ingredientes de esa receta** con `nombre | cantidad | unidad` (para ver si el ítem ya está listado con un total y el paso solo dice "un poco", o si hay que fijar una medida nueva).
3. Clasificá cada uno en: **(a) cantidad de cocción** ("un poco de caldo/manteca/agua/vino") → a corregir; **(b) terminación/chorro de cierre** ("un hilo de…", "un chorrito" final) → excepción; **(c) punto de cocción** ("huevos a gusto") → excepción.

## C3 — Verificación de D4b (solo casos reales, excluir "menta")

Para **Cochinita pibil, Flan de coco, Crema helada de frutilla, Ojo de bife, Zarzuela de mariscos**, pegá:
1. La **lista de ingredientes actual** de la receta (`nombre | idIngrediente`).
2. Las **frases exactas de los pasos** que mencionan el ingrediente "ausente".
3. Tu lectura de cuál de estos tres es: **(i)** ingrediente realmente faltante en la lista; **(ii)** mismatch de nombre (ej. "leche de coco" en paso vs "bebida de coco sin azúcar" en lista); **(iii)** componente nombrado de un ítem combinado ya listado.

---

## Requisitos

- Cada bloque con su output literal; nada de resúmenes.
- No corregir nada. Terminar y esperar `procedé`.
- Con esto armamos el prompt de fix (commits separados: D1 ingredientes / D2 pasos / D4b).
