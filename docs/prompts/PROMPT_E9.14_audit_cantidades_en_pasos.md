# PROMPT E9.14 — Auditoría de VISIBILIDAD de cantidades en pasos (READ-ONLY)

> Distinto de E9.11. Aquella chequeó si las cantidades existen. Esta chequea si,
> al cocinar, la cantidad de cada ingrediente es VISIBLE en el paso donde se usa.
> El problema puede ser de datos (el texto no repite el número) o de UI (la
> pantalla Cocinar no muestra cantidades). Hay que ubicar la capa antes de fixear.
>
> Alcance: solo lectura. Output = código + datos pegados literal. No corregir.
> Esperar procedé.

## D1 — Modelo (pegar literal)
1. La interface del paso (Paso / PasoReceta) de models.ts.
2. ¿Existe algún linkage paso↔ingrediente? (campo tipo `ingredientesUsados`,
   amounts por paso, o nada). Respondé sí/no y pegá la definición si existe.

## D2 — UI: qué muestra la pantalla Cocinar
1. Pegá el/los componentes de la pantalla Cocinar (el que renderiza los pasos).
2. Decí explícitamente: durante un paso, ¿se ven las CANTIDADES de los
   ingredientes (lista visible, chips, panel "este paso usa…"), o solo el
   texto del detalle? Si la lista de ingredientes se muestra, ¿con cantidades?

## D3 — Cobertura de datos
Para cada paso cuyo `detalle` referencia por nombre un ingrediente cuantificado
de su receta (match por nombre/canónico contra ingredientes[]):
- ¿El texto del paso incluye una cantidad numérica para ese ingrediente?
- Listá los pasos que mencionan un ingrediente pero NO repiten la cantidad.
- Agrupá por receta y dame el conteo total + una muestra literal.

## D4 — Síntesis
Separá los hallazgos en:
(a) resoluble por UI (mostrar la lista con cantidades / panel por paso en Cocinar),
(b) requiere reescritura de texto de pasos,
(c) requiere linkage estructural paso↔ingrediente.
Dame tu lectura de cuál cubre la mayor parte del problema.

## Requisitos
- Cada bloque con su código/datos pegados literal. No corregir. Esperar procedé.