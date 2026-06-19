# PROMPT E9.13 — Fix desync de REC-1511 (Cochinita pibil argentina)

> Contexto: REC-1511 tiene 15 `idIngrediente` apuntando al bloque ING-0186–0202,
> que E9.0 pisó con cortes argentinos. `textoOriginal` intacto en las 15 →
> recuperable re-resolviendo contra el catálogo actual (no restaurando IDs viejos).
>
> Regla dura de catálogo: alta INSERT-ONLY. Las entradas nuevas toman IDs por
> encima del máximo actual; NUNCA reusar ni sobreescribir un ID existente.
>
> Gate: nada se escribe hasta el `procedé` de JP sobre D0.

## D0 — Confirmaciones previas (read-only, esperar procedé)
1. ¿REC-1511 es keeper? Lleva costillitas de cerdo, tortillas de maíz y porotos
   negros — no es low-carb. Si JP la reformula o la saca, FRENÁ ACÁ. Confirmá
   explícitamente que se queda.
2. Re-verificá que estos destinos siguen resolviendo a lo esperado (pegá canonico
   actual): ING-0268 (pasta de achiote), ING-0307 (lima), ING-0283 (papel manteca),
   ING-0269 (papel aluminio), ING-0282 (hilo de cocina), ING-0270 (papel de cocina),
   ING-0234 (pomelo), ING-0263 (poroto negro).
3. Aprobá la taxonomía de las 6 entradas nuevas (abajo; valores válidos del enum).
   Confirmá que ninguna ya existe bajo otra grafía.

## Tabla de resolución (15 refs)
| textoOriginal            | acción                                   | destino            |
|--------------------------|------------------------------------------|--------------------|
| Pasta de achiote         | re-point                                 | ING-0268           |
| Lima                     | re-point                                 | ING-0307           |
| Papel manteca            | re-point                                 | ING-0283           |
| Papel aluminio           | re-point                                 | ING-0269           |
| Hilo de cocina           | re-point                                 | ING-0282           |
| Papel de cocina          | re-point                                 | ING-0270           |
| Jugo de lima             | re-point + preparacion="jugo"            | ING-0307 (lima)    |
| Jugo de pomelo blanco    | re-point + preparacion="jugo, blanco"    | ING-0234 (pomelo)  |
| Porotos negros cocidos   | re-point + preparacion="cocidos/en lata" | ING-0263 (p.negro) |
| Manteca de cerdo         | alta nueva                               | nuevo ID           |
| Costillitas de cerdo     | alta nueva                               | nuevo ID           |
| Vinagre blanco           | alta nueva                               | nuevo ID           |
| Ají putaparió            | alta nueva                               | nuevo ID           |
| Guantes de látex         | alta nueva                               | nuevo ID           |
| Bolsa hermética grande   | alta nueva                               | nuevo ID           |

### Taxonomía propuesta (JP veta)
| canonico               | categoria              | rolNutricional | seccionGondola         |
|------------------------|------------------------|----------------|------------------------|
| manteca de cerdo       | Despensa varios        | Grasa          | Carniceria             |
| costillitas de cerdo   | Carne                  | Proteina       | Carniceria             |
| vinagre blanco         | Condimento y aderezo   | Neutro         | Almacen / secos        |
| ají putaparió          | Hierba y especia (*)   | Neutro         | Almacen / secos (*)    |
| guantes de látex       | Utensilio              | —              | Bazar / otros          |
| bolsa hermética grande | Utensilio              | —              | Bazar / otros          |
(*) ají putaparió: confirmar si va como especia seca (Almacen) o ají fresco (Verduleria).

## Fase 1 — Alta de ingredientes (tras procedé)
- Insertá las 6 nuevas con IDs por encima del máximo actual (insert-only).
  Pegá literal los IDs asignados.
- Commit: `Data: E9.13 f1 alta ingredientes faltantes (Cochinita)`

## Fase 2 — Re-map de REC-1511 (tras Fase 1)
- Actualizá los 15 idIngrediente según la tabla (con los 3 preparacion).
- Pegá literal antes/después de las 15 refs.
- Re-corré auditDesyncIdIngrediente.ts → REC-1511 debe dar 0 mismatches.
- Commit: `Data: E9.13 f2 re-map REC-1511`

## Requisitos
- Insert-only en catálogo: jamás reusar/sobreescribir IDs.
- Output literal (IDs asignados, before/after, re-corrida del audit). Sin ✅ sin evidencia.
- Gate en D0 antes de cualquier escritura.