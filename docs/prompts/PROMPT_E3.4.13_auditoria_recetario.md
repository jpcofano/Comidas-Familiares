# PROMPT E3.4.13 — Auditoría del recetario en producción (read-only)

Objetivo: saber **cuántas recetas/ingredientes hay subidos** y verificar que **estén todas las que fuimos cargando** por tanda. Es una auditoría de **solo lectura**: no escribe, no borra, no corrige nada. Si algo falta o está mal, lo **reportás** y decidimos después.

## Qué tiene que hacer
Crear `scripts/auditRecetario.ts` (admin SDK, igual harness que `seed-firestore.ts`), correrlo y pegarme la salida. El script:

1. **Conteos globales:** total de docs en `recetas` y en `ingredientes`.
2. **Desglose de recetas:** por `tipoItem`, por `proteinaPrincipal` y por `estilo` (cuenta por valor).
3. **Presencia por tanda:** contra el manifiesto de abajo, normalizando cada nombre con `normalizeText` (el mismo de `src/lib/canonical`) y buscando por `nombreCanonico`. Reportar por tanda: `N/total presentes` y **listar las que falten**.
4. **Integridad:**
   - **Duplicados:** `nombreCanonico` que aparezca en más de un doc.
   - **Refs huérfanas:** ingredientes de receta cuyo `idIngrediente` no exista en la colección `ingredientes`.
   - **Campos faltantes:** recetas sin `dificultadOrden`, `costoOrden`, `porcionesMin` o con `proteinaPrincipal`/`tipoItem` fuera de los enums de `models.ts`.
5. **Ingredientes nuevos por tanda:** verificar que los canónicos nuevos de cada tanda estén en el catálogo (lista abajo). Reportar faltantes.

## Manifiesto esperado (lo que generamos en estas sesiones)

```ts
const MANIFEST: Record<string, string[]> = {
  "Tanda 1 (E3.4.9)": [
    "Carré de cordero en costra de hierbas y almendra","Cordero estilo Rogan Josh",
    "Costillitas de cordero al romero y ajo","Salmón en costra de pistacho con beurre blanc",
    "Ceviche de corvina","Curry verde tailandés de pescado","Pulpo a la gallega sobre coliflor",
    "Vieiras selladas sobre puré de coliflor","Cochinita pibil","Lomo de cerdo a la pimienta verde",
    "Ossobuco a la gremolata","Bulgogi de res","Carpaccio de lomo","Pollo tikka masala",
    "Pollo a la cazadora","Hummus casero","Pesto de albahaca casero","Puré de coliflor cremoso",
  ],
  "Tanda 2 (E3.4.10)": [
    "Tataki de atún con costra de sésamo","Salmón teriyaki sin azúcar",
    "Gyudon de res sobre arroz de coliflor","Pollo katsu en costra de almendra",
    "Larb de res tailandés","Tom kha gai","Aguachile de langostinos","Tinga de pollo",
    "Dak galbi de pollo picante","Anticuchos de res al ají panca",
    "Calamares a la plancha con ajillo","Souvlaki de cerdo",
  ],
  "Jugos (E3.6)": [
    "Jugo verde de pepino, apio y limón","Limonada de jengibre","Jugo de pepino y menta",
    "Jugo verde de espinaca y pepino","Agua saborizada de pomelo y romero",
    "Jugo de tomate, apio y limón","Jugo de naranja exprimido","Jugo de manzana y zanahoria",
    "Licuado de frutilla y banana","Jugo de sandía y menta","Jugo de ananá y jengibre","Limonada clásica",
  ],
  "Tanda 3 (E3.4.12)": [
    "Mayonesa casera","Chimichurri","Salsa criolla","Vinagreta clásica","Alioli","Salsa golf",
    "Mollejas al verdeo","Lengua a la vinagreta","Riñones al jerez","Matambre arrollado",
    "Áspic de pollo","Escabeche de pescado","Mousse de chocolate amargo 85%",
  ],
};

// Canónicos de ingredientes nuevos introducidos por tanda (deben existir en el catálogo)
const ING_NUEVOS: Record<string, string[]> = {
  "Tanda 1": ["albahaca","alcaparras","carre de cordero","conac","cordero en cubos","corvina",
    "costillas de cordero","crema de leche","film","garam masala","gochujang","hielo",
    "hilo de cocina","lomo","manteca","osobuco","papel aluminio","papel manteca","pasta de achiote",
    "pasta de curry verde","pimienta verde en grano","pistachos","pulpo","salmon","salsa de pescado",
    "solomillo de cerdo","vieiras"],
  "Tanda 2": ["aji panca","atun rojo","chipotle","lemongrass"],
  "Tanda 3": ["mollejas","lengua","rinones","matambre","gelatina sin sabor","jerez seco","cafe"],
};
```

> Nota: el **recetario base (pre-tandas)** eran ~78 recetas. Total esperado tras las 4 tandas ≈ **78 + 18 + 12 + 12 + 13 = 133** recetas (si Tanda 3 ya se sembró; si todavía no, 120). El conteo global del paso 1 sirve para chequear ese número grueso. No tengo el listado de nombres de las 78 base, así que el manifiesto solo audita lo que agregamos nosotros.

## Salida esperada (formato)
```
=== CONTEO GLOBAL ===
recetas: N | ingredientes: M
=== DESGLOSE ===
tipoItem: {...}   proteinaPrincipal: {...}   estilo: {...}
=== PRESENCIA POR TANDA ===
Tanda 1 (E3.4.9): 18/18 ✓
Tanda 2 (E3.4.10): 12/12 ✓
Jugos (E3.6): 12/12 ✓
Tanda 3 (E3.4.12): 13/13 ✓   (o "0/13 — no sembrada aún")
FALTANTES: [lista o "ninguna"]
=== INTEGRIDAD ===
duplicados nombreCanonico: [...]
refs huérfanas: [...]
campos faltantes / enums inválidos: [...]
=== INGREDIENTES NUEVOS ===
Tanda 1: 27/27 ✓ | Tanda 2: 4/4 ✓ | Tanda 3: 7/7 ✓  (faltantes: ...)
```

## Reglas
- **Read-only.** Ninguna escritura, update ni delete. Si querés, abrí la conexión sin credenciales de escritura.
- No "arreglar" sobre la marcha: solo reportar. Las correcciones van en un prompt aparte.
- Si `normalizeText` no resuelve en el runner, copiá la función inline (es pura).
- No hace falta `procedé` porque no toca datos; corré directo y pegame la salida.
- Commit (solo el script): `chore: E3.4.13 script de auditoría de recetario (read-only)`.
