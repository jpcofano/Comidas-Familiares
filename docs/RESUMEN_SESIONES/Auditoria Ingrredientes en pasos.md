E9.14 — Auditoría de visibilidad de cantidades en pasos
D1 — Modelo
Interface Paso (src/types/models.ts:150-160):


export interface Paso {
  nroPaso: number;
  titulo: string;
  detalle: string;
  tiempoEstimadoLabel: string;
  tiempoEstimadoMin: number | null;
  momento?: string;
  puntoClave?: string;
  errorComun?: string;
  notas?: string;
}
¿Existe linkage paso↔ingrediente? No.

No hay campo ingredientesUsados, amounts, ni ninguna referencia a ingredientes en Paso. La información de cantidades vive exclusivamente en IngredienteEnReceta (src/types/models.ts:133-147):


export interface IngredienteEnReceta {
  idIngrediente: string;
  textoOriginal: string;
  preparacion?: string;
  seccion?: string;
  cantidad?: string | number;
  cantidadLabel?: string;
  cantidadMin?: number;
  cantidadMax?: number;
  unidad?: string;
  opcional?: boolean;
  notas?: string;
  alternativas?: Array<{ idIngrediente: string }>;
  habitual?: boolean;
}
Los campos cantidad y unidad existen y están poblados en la BD (ej. "1,2 a 1,5" kg, "2 cdas", "4 dientes"), pero son atributos de la lista global de la receta, sin vínculo a paso alguno.

D2 — UI: qué muestra la pantalla Cocinar
Componentes involucrados:

src/routes/Cocinar.tsx — orquesta los dos modos (guiada / scroll)
src/components/PasoCard.tsx — renderiza cada paso individual
PasoCard muestra (PasoCard.tsx:27-122):

Elemento	Se muestra
Número de paso (círculo)	✓
Título del paso	✓
tiempoEstimadoLabel	✓
StepTimer (contador)	✓
detalle (texto libre)	✓
puntoClave (banner verde)	✓ si existe
errorComun (banner amarillo)	✓ si existe
notas	✓ si existe
Lista de ingredientes con cantidades	NO
Panel "este paso usa X de Y"	NO
Durante un paso, las cantidades de ingredientes NO son visibles. Solo se ve el texto de detalle.

Existe SustitutosRecap (Cocinar.tsx:17-67) que muestra un accordion colapsable con sustitutos, pero:

Solo aparece en el primer paso (guiada) o siempre visible en modo scroll
Muestra sustitutos (ing.textoOriginal → alternativas), no cantidades
La lista completa de ingredientes de la receta no se expone en ningún punto de la cocción
D3 — Cobertura de datos
Metodología: Para cada receta, busqué pasos cuyo detalle menciona la primera palabra de al menos un textoOriginal cuantificado (cantidad != ""), y verifico si el texto del paso incluye algún dígito.

Resultado sobre 310 recetas, 1297 pasos totales:

Métrica	Valor
Pasos únicos afectados	579 / 1297 (44.6%)
Recetas con al menos 1 paso afectado	267 / 310 (86%)
Top 10 recetas por pasos afectados:


11 pasos — Arañita al malbec con hongos, Papas Anna y crema rústica de choclo
 7 pasos — Bondiola braseada al Malbec
 6 pasos — Pollo marroquí con aceitunas y limón
 6 pasos — Zarzuela de mariscos y pescado
 5 pasos — Brochettes rápidas de pollo y carne al horno fuerte
 5 pasos — Churrasquitos de cerdo con salsa rápida de naranja y jengibre
 5 pasos — Ensalada tibia de huevo duro, atún y palta
 5 pasos — Tiras de carne salteadas con morrón y cebolla
 5 pasos — Pollo rápido al limón, ajo y romero
 5 pasos — Salteado de pollo al curry suave sin crema
Muestra literal — Bondiola braseada al Malbec:


P2: "Dorar la bondiola en olla pesada con aceite de oliva, por todos sus lados."
    → aceite de oliva (2 cdas) → sin cantidad en texto

P3: "Retirar la carne. En la misma olla, dorar cebolla, zanahoria y ajo."
    → ajo (4 dientes) → sin cantidad en texto

P5: "Volver la bondiola a la olla. Agregar caldo, laurel, romero, mostaza y pimentón. Tapar y cocinar..."
    → caldo (400-500 ml), laurel (2 hojas), romero (1 ramita), mostaza (1 cda), pimentón (1 cdita) → ninguno con cantidad
El patrón es universal: los pasos son narrativos (estilo recetario impreso) y nunca repiten las cantidades que ya están en la lista de ingredientes.

D4 — Síntesis
(a) Resoluble por UI — sin tocar datos ni agregar linkage:

La lista receta.ingredientes[] ya tiene cantidad, unidad y textoOriginal. Se puede agregar en pantalla Cocinar un panel de ingredientes permanente o un accordion expandible (similar a SustitutosRecap pero con cantidades, visible durante toda la cocción). El cocinero consulta la lista cuando necesita saber "¿cuánto?". Costo: un componente UI, cero migración de datos.

(b) Requiere reescritura de texto de pasos:

579 pasos en 267 recetas. La reescritura duplicaría información (la cantidad ya está en la lista), haría los textos más largos y verbosos, y requiere regenerar/editar ~86% del recetario. Costo muy alto, beneficio marginal sobre (a).

(c) Requiere linkage estructural paso↔ingrediente:

Agregar ingredientesUsados?: string[] (idIngredientes) a la interface Paso y poblar ese campo en los datos, para que la UI muestre "este paso usa: aceite de oliva (2 cdas), ajo (4 dientes)". Es la solución más precisa pero requiere migrar los datos de todos los pasos de 310 recetas.

Mi lectura: la opción (a) cubre la mayor parte del problema. El 86% de los casos es un problema de UI pura: la información existe en los datos (cantidad y unidad están poblados en casi todos los ingredientes), pero nunca se expone durante la cocción. Un panel de ingredientes accesible en cualquier paso (tipo "hoja de referencia" lateral o accordion en la parte superior) resuelve el problema sin migración de datos ni reescritura de recetas. La opción (c) es más precisa para el futuro si se quiere "este paso en particular usa X", pero solo vale la pena si la pantalla Cocinar muestra el panel por-paso — que hoy ni existe.