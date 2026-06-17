# PROMPT E14.8 — Dieta "Sin gluten / TACC" + (opcional) técnica como enum filtrable

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> **A implementar ahora.** Numerar al próximo libre si `E14.8` ya existe.
>
> **Contexto (investigación 13-jun-2026):** el modelo cubre todos los ejes de Schema.org Recipe y
> agrega varios propios. Dos brechas: (A) falta la dieta **Sin gluten / TACC** —que el estándar
> trae como `suitableForDiet` y es la alergia/intolerancia más relevante en Argentina, y María ya
> la tenía como preferencia; (B, opcional) `tecnicaPrincipal` es texto libre y **no filtra** —mismo
> caso que tenía `cocina` antes del backfill (decenas de variantes: "Salteado", "Sartén",
> "Sellado", "Guiso / reducción", "Horno eléctrico", "Estofado"…).
>
> Mismo método que E14.7: para los backfills, **proponer → JP confirma → aplicar** (`--apply`).

---

## PARTE A — Dieta "Sin gluten / TACC"  (recomendado)

### A1. Modelo (`src/types/models.ts`)
Espejo de `sinLacteos`:
```ts
// en Receta:
sinGluten: boolean;   // true = apta sin TACC (no lleva trigo/avena/cebada/centeno ni derivados)
```
Retrocompat: tratar ausente como `false` (desconocido) en lecturas viejas, hasta backfillear.

### A2. Filtro (`src/lib/filtros.ts` + `FiltrosReceta`)
Agregar `sinGluten: boolean` a `FiltrosReceta` y `FILTROS_INICIALES` (default `false`), y la línea:
```ts
if (filtros.sinGluten && !r.sinGluten) return false;
```
Sumarlo a `hayFiltrosActivos`. En `Biblioteca.tsx`, agregar el toggle **"Sin TACC"** junto a
"Sin lácteos" (mismo patrón de chip/toggle).

### A3. Prompt generador (`/config/importador.promptLLM` + `scripts/seed-config-importador.ts`)
Agregar la línea de salida, al lado de `sinLacteos`:
```
sinGluten: [Sí o No — Sí si NO lleva harina de trigo, pan, pan rallado, pasta, sémola, cuscús,
            cebada, centeno ni avena no certificada (ni rebozados/empanados con esos). Las
            harinas de almendra/coco/garbanzo y el rebozado con harina de almendra SÍ son sin gluten.]
```
Actualizar el ejemplo del prompt para incluir `sinGluten:`. Reflejar en el seed y correr con
`--force`. `src/import/parseReceta.ts`: parsear `sinGluten` (Sí/No → bool), default `false` si falta.

### A4. Backfill (`scripts/backfill-singluten.ts`, propuesta → `--apply`)
Derivar de los ingredientes de cada receta. Lista TACC (match por `canonico`/nombre, normalizado):
```ts
const TACC = [
  "harina de trigo", "harina 0000", "harina leudante", "pan", "pan rallado", "pan lactal",
  "pan de molde", "fideos", "pasta", "ñoquis", "tapas de empanada", "tapas de tarta",
  "masa", "sémola", "cuscús", "cebada", "centeno", "avena", "salsa de soja", // ¡la soja común lleva trigo!
  "cerveza", "galletitas", "bizcochuelo", "rebozador", "pan de pancho", "pan de hamburguesa",
  "prepizza", "tortilla de trigo", "vermicelli de trigo", "wonton", "panko",
];
// avena: marcar como "a revisar" (puede ser certificada sin TACC).
// salsa de soja: marcar como "a revisar" (hay tamari sin gluten).
```
Lógica: para cada receta, si **ningún** ingrediente (no opcional) matchea TACC → proponer
`sinGluten: true`; si matchea alguno → `false`. Los que dependan de "avena" o "salsa de soja" van
a un bloque **"a revisar"** (puede ser la versión sin TACC). Imprimir 3 bloques (true / false /
a revisar) y aplicar solo tras confirmación.

> Nota fina argentina: la **salsa de soja** común lleva trigo; el **tamari** no. Por eso esas
> recetas se revisan en vez de marcarse automáticamente.

---

## PARTE B — `tecnicaPrincipal` como enum filtrable  (opcional)

> Hacer **solo si** quieren filtrar por técnica ("¿qué hago rápido en sartén?", "algo al horno").
> Si no, saltear toda la Parte B; `tecnicaPrincipal` queda como dato libre y está bien.

### B1. Modelo — nuevo enum + campo normalizado
Mantener `tecnicaPrincipal: string` (libre, como subtítulo) y agregar el enum filtrable:
```ts
export const TECNICAS = [
  "Horno", "Parrilla / Plancha", "Salteado / Sartén", "Frito", "Hervido",
  "Guiso / Braseado", "Crudo / Sin cocción", "Licuado / Procesado", "Otra",
] as const;
export type Tecnica = typeof TECNICAS[number];
// en Receta:
tecnica?: Tecnica;   // técnica canónica filtrable (derivada de tecnicaPrincipal)
```

### B2. Mapa de normalización (texto libre → enum) — base, JP confirma ambiguos
```ts
const TEXTO_A_TECNICA: Record<string, Tecnica> = {
  "horno": "Horno", "horneado": "Horno", "horno eléctrico": "Horno", "horno lento": "Horno",
  "doble horneado": "Horno", "horno / reducción": "Horno", "horno + laqueado": "Horno",
  "asado": "Parrilla / Plancha", "grillado": "Parrilla / Plancha", "plancha": "Parrilla / Plancha",
  "salteado": "Salteado / Sartén", "sartén": "Salteado / Sartén", "sellado": "Salteado / Sartén",
  "sellado + reducción": "Salteado / Sartén", "sartén / salsa": "Salteado / Sartén",
  "frito": "Frito",
  "hervido": "Hervido", "hervido / servicio": "Hervido",
  "braseado": "Guiso / Braseado", "guiso": "Guiso / Braseado", "guisado": "Guiso / Braseado",
  "estofado": "Guiso / Braseado", "guiso / cocción lenta": "Guiso / Braseado",
  "guiso / reducción": "Guiso / Braseado",
  "crudo": "Crudo / Sin cocción", "ensalada": "Crudo / Sin cocción", "sin cocción": "Crudo / Sin cocción",
  "marinado en frío": "Crudo / Sin cocción", "macerado": "Crudo / Sin cocción",
  "escabechado": "Crudo / Sin cocción", "emulsión": "Crudo / Sin cocción", "frío": "Crudo / Sin cocción",
  "licuado": "Licuado / Procesado", "exprimido": "Licuado / Procesado", "procesado": "Licuado / Procesado",
  "batido": "Licuado / Procesado", "mezclado": "Licuado / Procesado",
  "armado": "Otra", "emplatado": "Otra", "reposo": "Otra", "hidratado": "Otra",
  "gelificado": "Otra", "arrollado": "Otra", "picado": "Otra",
};
// Compuestos ("Hervido + horno", "Horno / sartén"): tomar la PRIMERA técnica del texto.
```

### B3. Backfill, filtro, prompt
- `scripts/backfill-tecnica.ts` (propuesta → `--apply`): recorre recetas, normaliza
  `tecnicaPrincipal` con el mapa, setea `tecnica`. Lo no contemplado → bloque "a revisar".
- Filtro: agregar `tecnica: string` a `FiltrosReceta` + línea `if (filtros.tecnica && r.tecnica !== filtros.tecnica) return false;`
  y un desplegable "Todas las técnicas" en Biblioteca (de `TECNICAS`).
- Prompt generador: agregar `tecnica: [uno de exactamente: Horno, Parrilla / Plancha, Salteado /
  Sartén, Frito, Hervido, Guiso / Braseado, Crudo / Sin cocción, Licuado / Procesado, Otra]`
  (y dejar `tecnicaPrincipal` como subtítulo libre opcional).

---

## Cierre
1. **MAPEO_FIRESTORE.md**: `Receta.sinGluten` (+ filtro), y si se hace B: `TECNICAS`/`Receta.tecnica`;
   líneas nuevas del prompt generador. Bump de versión.
2. **Tests**: filtro `sinGluten` (una con TACC no pasa, una sin TACC sí); si B: normalización de
   técnica (3-4 casos: "Sartén"→Salteado/Sartén, "Estofado"→Guiso/Braseado, compuesto toma primera).
3. Backfills en **modo propuesta** primero; pegar tablas; aplicar tras confirmación de JP.
4. `firebase deploy` no cambia reglas. `npm test` verde, `npm run build` ok.
5. Pegar diff de `models.ts`, `filtros.ts`, `filtros.test.ts`, `Biblioteca.tsx`,
   `seed-config-importador.ts`, `parseReceta.ts`, scripts de backfill.

```
git commit -m "E14.8: dieta sin gluten/TACC (campo + filtro + prompt + backfill) [+ técnica enum filtrable opcional]"
```

## Criterios de aceptación
1. Una receta sin TACC se marca `sinGluten` y aparece al filtrar **"Sin TACC"** en Biblioteca; una
   con harina/pan/pasta no aparece.
2. El backfill propuso bien (avena y salsa de soja quedaron "a revisar", no autoasignadas).
3. Una receta nueva generada con el prompt trae `sinGluten:` correcto.
4. (Si B) Filtrar por técnica (ej. "Salteado / Sartén") devuelve las recetas correctas; el campo
   libre `tecnicaPrincipal` se conserva como subtítulo.
```
