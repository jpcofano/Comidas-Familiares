# PROMPT E3.6 — Sección "Jugos naturales" (nuevo tipoItem + 12 jugos)

Esto tiene **dos partes**: un cambio chico de código (sumar el `tipoItem` y la sección/filtro en
Biblioteca) y un **seed** de 12 jugos. Mismo patrón admin SDK, SOLO-ALTA e idempotente. **No hay
ingredientes nuevos** (los 12 resuelven contra el catálogo actual).

## Archivo
- `scripts/seed-data/recetas_jugos.json` — 12 jugos, forma del modelo ya validada (E3.4.9): booleans,
  `*Min`/`*Orden`, `porQueEspecial`, `notasNocheDeADos`, `paraJuanPablo`/`paraFamilia`, pasos
  `nroPaso`/`detalle`/`tiempoEstimadoLabel`/`tiempoEstimadoMin`/`puntoClave`/`errorComun`.
  - 6 **low-carb** (`hidratos:false`, `paraJuanPablo:true`): verdes, limonada de jengibre, pomelo-romero, tomate-apio.
  - 6 **de fruta** (`hidratos:true`, `paraJuanPablo:false`): naranja, manzana-zanahoria, frutilla-banana, sandía, ananá, limonada clásica.
  - El **endulzante va como ingrediente `opcional`** en todos (eritritol en los low-carb, azúcar mascabo en los de fruta).
  - Todos `tipoItem: "Jugo natural"` y `proteinaPrincipal: "Vegetal"` (ver D2).

## F1 — Diagnóstico (gate). Reportá y esperá `procedé`.
- **D1 — `tipoItem`.** Abrí el enum `TIPO_ITEM` en `src/types/models.ts`. **No existe "Jugo natural"** → hay que sumarlo (valor + label es). Confirmá además que la Biblioteca arme las secciones/filtros a partir de `tipoItem`, así con el valor nuevo + su chip aparece la sección. Decime dónde lo ponés en el orden de los chips (sugiero al final, después de Conserva/Guarnición).
- **D2 — `proteinaPrincipal` de una bebida.** Un jugo no tiene proteína; puse **`"Vegetal"`** en el JSON como el valor menos forzado del enum actual. Decidí: lo dejamos en `Vegetal`, **o** sumás un valor tipo `"Bebida"`/`"Ninguna"` a `PROTEINAS` — si lo sumás, hacé un find/replace `"proteinaPrincipal": "Vegetal"` → el nuevo valor en `recetas_jugos.json` (o avisame y lo regenero).
- **D3 — Resolución.** Confirmá **0 ingredientes nuevos** y **0 referencias sin resolver**. Nota: el "Tomate" del jugo savory resuelve a `tomate fresco` (ING-0159), que arrastra la rareza de estar categorizado como `Lacteo` — no afecta al jugo, pero es la misma rareza que veníamos flageando.
- **D4 — Orden.** `dificultadOrden`/`costoOrden` con la convención ya confirmada en E3.4.9 (acá: dificultad Baja=1; costos Bajo=1 / Medio=2).

> **GATE:** `procedé` antes de escribir. Backup de `recetas` igual que E3.4.9.

## F2 — Código
1. Sumar `"Jugo natural"` al enum `TIPO_ITEM` (+ label en español).
2. En Biblioteca, que el chip/sección de "Jugos naturales" aparezca (usa el mismo mecanismo por `tipoItem`); ubicalo al final del orden.
3. (Opcional, según D2) sumar el valor de proteína para bebidas.
4. (Opcional, lindo de tener) un badge visual "low-carb" en las tarjetas donde `hidratos === false` — ya queda implícito, pero si es barato, ayuda a "marcar" los low-carb como pediste.

## F3 — Seed
Reusá el script admin SDK de E3.4.9 con **dos cambios**: `NUEVOS_ING = []` (no hay ingredientes nuevos)
y leer `recetas_jugos.json`. El resto (resolución `canon → id`, idempotencia por `nombreCanonico`,
`REC-XXXX`, `vecesCocinada:0`, `fechaImportacion`) queda igual.

## F4 — Validación
1. En Biblioteca aparece la sección **Jugos naturales** con 12 ítems.
2. Filtrá y confirmá que los 6 verdes salen como **low-carb** (`hidratos:false` / `paraJuanPablo:true`) y los 6 de fruta como `hidratos:true`.
3. Abrí un jugo y verificá que el **endulzante figure como opcional**.
4. Re-correr el seed → 0 creados.

Commit: `feat: E3.6 sección Jugos naturales (tipoItem + 12 jugos)`.
