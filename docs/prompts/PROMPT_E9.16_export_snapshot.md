# PROMPT E9.16 — Export-snapshot read-only de `recetas` + `ingredientes`

> Numeración **tentativa** (E9.x). Renumerar según convención del repo antes de commitear.
> Anclaje: principio del traspaso — *"consolidación sana = export-snapshot de una vía, script read-only que vuelca `recetas` + `ingredientes` a JSON versionado en el repo, nunca escribe en prod"*. Cierra el agujero de las recetas sin backup committeado.
> **Doble función:** (1) backup / base de diff; (2) materia prima para generar el linkage paso↔ingrediente de la opción (c) de E9.14.

## Objetivo
Script **read-only** que exporta el estado actual de `recetas` e `ingredientes` a JSON versionado en `scripts/snapshots/`. **No escribe en Firestore. No modifica documentos. Solo `.get()` y escritura a disco local del repo.**

## F1 — Diagnóstico de confirmación (read-only, gate)
1. Confirmar el path de auth del admin SDK reutilizable de los scripts de seed existentes.
2. Contar documentos: `recetas` (esperado ~310, incluye los 2 sintéticos de `comprasRapidas` sin `porcionesMin`) e `ingredientes` (esperado ~353). Pegar los conteos literales.
3. Confirmar que toda la estructura relevante de una receta vive **dentro del doc** (arrays `pasos[]` e `ingredientes[]` embebidos, no subcolecciones). Si hubiera subcolecciones, listarlas — el snapshot debe incluirlas o declararlas excluidas explícitamente.
4. Confirmar que `scripts/snapshots/` no existe aún o está vacío (no pisar nada).

**Reportar literal y esperar `procedé`. No crear archivos hasta el procedé.**

## F2 — Implementación (tras procedé)
1. Crear `scripts/snapshots/exportSnapshot.ts` (o el formato de los scripts existentes). Comportamiento:
   - Lee **todos** los docs de `recetas` e `ingredientes`, tal cual (verbatim, sin transformar).
   - Ordena por id ascendente antes de serializar → **diffs limpios y deterministas** entre snapshots.
   - JSON pretty (indent 2), un archivo por colección.
2. Salida en carpeta fechada: `scripts/snapshots/<YYYY-MM-DD>/recetas.json` y `ingredientes.json`.
3. Generar `scripts/snapshots/<YYYY-MM-DD>/manifest.json` con: timestamp ISO, hash del commit de código vigente, conteo de docs por colección, y conteo de los sintéticos excluibles (recetas sin `porcionesMin`) para que los conteos "reales" sean reproducibles.
4. **Garantías de read-only:** el script solo usa `.get()`. Sin `.set/.update/.delete/.add`. Idealmente un assert/guard que falle si se intenta cualquier escritura a Firestore.

## F3 — Correr, commitear, evidencia literal
1. Correr el script. Pegar el `manifest.json` resultante (conteos + timestamp + commit hash).
2. Verificar que los JSON quedaron en la carpeta fechada y son parseables. Pegar `wc -l` o tamaño de cada archivo.
3. Commitear el snapshot + el script.

## Commits (separados, prefijo de etapa)
- `chore: E9.16 script export-snapshot read-only (recetas + ingredientes)`
- `data: E9.16 snapshot <YYYY-MM-DD> (NNN recetas, MMM ingredientes)`

## Restricciones
- **Cero escrituras a Firestore.** Si el guard de read-only no puede garantizarse, frenar y reportar antes de correr.
- No tocar el campo `origen` ni ninguna mutación de docs — eso es un prompt aparte (write). Este es solo el dump.
- No marcar ✅ sin pegar `manifest.json` literal y el tamaño de los archivos.

## Nota de continuidad (no es parte de este prompt)
Con `recetas.json` de este snapshot, el siguiente paso es que yo genere `pasos_ingredientes.json` (linkage paso↔ingrediente, validado a 0 IDs fuera del `ingredientes[]` de cada receta) para la Fase 2 de E9.14. La Fase 1 (UI: panel/accordion de cantidades con fallback a la lista completa) es código puro e independiente del snapshot — puede ir en paralelo si querés visibilidad de cantidades ya.
