# Traspaso — Sesión de auditoría post-siembra y correcciones

Documento para arrancar una conversación nueva en otra cuenta. Resume la cadena de auditoría sobre el recetario ya sembrado, los hallazgos, los prompts generados, las decisiones pendientes y los principios nuevos.

> Numeración de prompts (E3.4.13, E9.9, E9.10…) es **tentativa**: renumerar según la convención del repo. Los archivos están como `.md` listos para `docs/prompts/`.

---

## Estado del recetario (verificado con evidencia)
- **308 recetas reales + 354 ingredientes. Delta 0** (78 base + 18 T1 + 12 T2 + 12 jugos + 13 T3 + 175 T4–18).
- **0 referencias huérfanas, 0 duplicados de receta.**
- Enums OK: `proteinaPrincipal`, `tipoItem`, `dificultad`.
- (Los 2 ítems sintéticos de `comprasRapidas` viven en `recetas` sin `porcionesMin` — esperado, deben excluirse de queries/conteos.)

## Cadena de auditoría ejecutada
1. **E3.4.13** post-siembra → volvió incompleta (reportó `estilo`, no `cocina`; sin evidencia literal).
2. **E3.4.13b** cierre → datos reales (abajo).
3. **E9.11** audit de medidas (Tier A error / Tier B excepción).
4. **E9.11b** contexto literal de lo accionable.
5. **E9.12** alcance del desync de `idIngrediente`.

## Hallazgos y estado
| Hallazgo | Estado |
|---|---|
| `cocina` vacío en **188/308** (base + tandas tempranas); `estilo` = 70 valores, mezcla geográfico + no-geográfico | Pendiente: **E9.10** backfill |
| `costoEstimado="Bajo/Medio"` (no existe en enum) en **4 recetas** | Pendiente: **E9.9** |
| Duplicado muzzarella: `ING-0251` (huérfano) vs `ING-0338` (usado, con "Muzzarella" sinónimo) | Pendiente: **E9.9** |
| **Desync de IDs en REC-1511** (Cochinita pibil argentina): 15 refs apuntaban al bloque ING-0186–0202 que **E9.0 pisó** con cortes argentinos. `textoOriginal` intacto → recuperable | **En curso: E9.13** (JP confirmó keeper) |
| Medidas vagas reales: D1 papel manteca (unidad vacía); D2 **Tinga** (falta caldo) y Pollo+brócoli (agua de vapor → excepción); D4b **Flan/Crema** ("leche de coco" en paso vs "bebida de coco" listada = productos distintos) | Pendiente: post-E9.13 |
| Sal/pimienta "a gusto": **6 sin listar + 79 con cantidad vaga (~38 recetas)** | **Excepción** (decisión global pendiente, ver abajo) |
| D4a (404) ingredientes no mencionados en pasos | **Parkeado** (ruido del heurístico) |

## Prompts generados (en `outputs`/`docs/prompts`)
- `PROMPT_E3.4.13_auditoria_postsiembra.md` ✅ corrido
- `PROMPT_E3.4.13b_cierre_auditoria.md` ✅ corrido
- `PROMPT_E9.11_audit_medidas_ingredientes.md` ✅ corrido
- `PROMPT_E9.11b_contexto_fixes.md` ✅ corrido
- `PROMPT_E9.12_desync_idingrediente.md` ✅ corrido
- `PROMPT_E9.13_fix_desync_REC1511.md` ⏳ **corriendo** (alta de 6 ingredientes insert-only + re-map de 15 refs + re-correr audit)
- `PROMPT_E9.9_limpieza_costo_muzzarella.md` ⏳ pendiente
- `PROMPT_E9.10_backfill_cocina.md` ⏳ pendiente (D-gate con tabla de mapeo)
- `PROMPT_E9.14_audit_cantidades_en_pasos.md` ⏳ pendiente (visibilidad de cantidades al cocinar — probablemente fix de UI, no de datos)
- **Export-snapshot** — aún sin escribir (ofrecido).

## Decisiones pendientes de JP
- **E9.9 costo:** "Bajo" para las 4, o "Medio" para hummus/trufas.
- **E9.9 muzzarella:** borrar el huérfano `ING-0251` (default) vs. respetar el MAPEO si declara "muzzarella" como canónico primario (repuntar las 6 y borrar `ING-0338`).
- **E9.10:** aprobar la tabla `estilo → cocina` que devuelva el D1; `null` para los no-geográficos.
- **Sal/pimienta:** aceptar "a gusto" como **excepción global** (recomendado) → ¿exigir igual que estén listadas, o aceptarlas ausentes por staples?
- **Flan/Crema helada:** corregir el texto a "bebida de coco" (acepta lo listado) vs. dar de alta "leche de coco" (mejor postre).
- **ají molido en Chimichurri** (menor) + verificar la receta "Chimichurri" real por nombre exacto (el hit fue falso, en "Entraña…").

## Principios nuevos de esta sesión (la "superadora" = prevención)
- **IDs de ingrediente inmutables.** Ninguna operación de catálogo reusa/reasigna un ID existente; si un ID debe cambiar, la **migración de las refs de las recetas va en la misma operación**. (E9.0 violó esto → causó el desync.)
- **`textoOriginal` es la red de seguridad**, no un detalle: es lo único que hizo recuperable a REC-1511. El importador debe persistirlo **siempre** en cada ref.
- **Chequeo de integridad permanente:** `auditDesyncIdIngrediente.ts` (ya existe) se corre **después de cada escritura de catálogo**. El orphan-check NO alcanza: detecta IDs inexistentes, no IDs que resuelven al ingrediente equivocado.
- **NO consolidar en un seed único.** Un re-seed que sobreescribe repite el error de E9.0 a escala y pelea con producción (votos, historial, fotos, ediciones in-app). La consolidación sana es un **export-snapshot de una vía**: script read-only que vuelca `recetas` + `ingredientes` a JSON versionado en el repo (`scripts/snapshots/`), como backup, fuente de seed futuro y base de diff. Nunca escribe en prod.
- **Identificación de origen:** formalizar campo `origen` (`seed` / `importador` / `manual`) + opcional `seedRef`. Las importadas in-app nacen sin JSON commiteado — `origen != seed` = "recetas sin backup". El importador setea `origen="importador"`.

## Orden sugerido al retomar
1. Cerrar **E9.13** verificando output literal (IDs nuevos, before/after de las 15 refs, audit re-corrido = 0 mismatches).
2. **E9.9** (rápido) y **E9.10** (con su pausa de revisión de tabla) — independientes.
3. Medidas post-E9.13: papel manteca, Tinga caldo, Flan/Crema.
4. **E9.14** visibilidad de cantidades al cocinar.
5. **Export-snapshot** + campo `origen` (cierra el agujero de las importadas para siempre).
