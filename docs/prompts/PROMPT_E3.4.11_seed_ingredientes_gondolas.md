# PROMPT E3.4.11 — Poblar catálogo: verdulería/frutería + fiambrería (67 ingredientes)

Seed de **catálogo** (no de recetas). admin SDK, **SOLO-ALTA e idempotente**: saltea cualquier
`canonico` que ya exista; no borra ni sobreescribe. Todos van `ambiguo: false` y `origen: "seed"`,
así entran limpios y **no aparecen en `/biblioteca/catalogo`** (la pantalla de ambiguos).

## Archivo
- `scripts/seed-data/ingredientes_verduleria_fiambreria.json` — 67 ítems:
  - **Verdulería** (`seccionGondola: "Verduleria"`): 30 verduras (`Verdura`), 19 frutas (`Fruta`), 3 hierbas frescas (`Hierba y especia`).
  - **Fiambrería** (`seccionGondola: "Fiambreria"`, `categoria: "Fiambre y embutido"`): 15 fiambres/embutidos.
  - `rolNutricional` con `Hidrato` marcado en almidonosas/dulces (remolacha, choclo, calabaza, zapallo anco, mandioca, arvejas, habas; uva, mango, higo, sandía, melón, ananá). El resto `Fibra/Vegetal`. Fiambres magros `Proteina`; grasos `Proteina/Grasa`.

## Diagnóstico (corto). Reportá y esperá `procedé`.
- **D1** — De los 67, reportá cuáles ya existen en el catálogo vivo (el script los saltea) y cuántos se crearían netos.
- **D2** — Confirmá que `categoria: "Fiambre y embutido"` y `seccionGondola: "Fiambreria"` sean los valores que ya usa `jamon cocido natural` (ING-0086), para no crear una variante de la etiqueta.
- **Nota:** los **quesos no van acá** (van a `Lacteos y frescos`); si querés sumar quesos es otra lista.

> **GATE:** `procedé` antes de escribir. Backup de `ingredientes` igual que en E3.4.9.

## Script (`scripts/seedIngredientesGondolas.ts`) — admin SDK
```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(readFileSync(resolve(__dirname, "../service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const NUEVOS = JSON.parse(readFileSync(resolve(__dirname, "seed-data", "ingredientes_verduleria_fiambreria.json"), "utf-8")) as any[];
const pad = (n: number) => String(n).padStart(4, "0");

async function main() {
  const idByCanon = new Map<string, string>();
  let max = 0;
  (await db.collection("ingredientes").get()).forEach((d) => {
    const x = d.data(); const id = x.idIngrediente ?? d.id;
    idByCanon.set(x.canonico, id);
    const m = String(id).match(/^ING-(\d{4})$/); if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  let next = max + 1;

  let creados = 0; const yaExistian: string[] = [];
  for (const def of NUEVOS) {
    if (idByCanon.has(def.canonico)) { yaExistian.push(def.canonico); continue; }
    const id = `ING-${pad(next++)}`;
    await db.collection("ingredientes").doc(id).set({
      idIngrediente: id, canonico: def.canonico, nombrePreferido: def.nombrePreferido,
      sinonimos: def.sinonimos, categoria: def.categoria, rolNutricional: def.rolNutricional,
      seccionGondola: def.seccionGondola, unidadesHabituales: def.unidadesHabituales,
      ambiguo: def.ambiguo, origen: def.origen,
      vecesUsado: 0, fechaCreacion: FieldValue.serverTimestamp(), ultimaModificacion: FieldValue.serverTimestamp(),
    });
    idByCanon.set(def.canonico, id); creados++;
    console.log(`  + ${id}  ${def.nombrePreferido}  [${def.seccionGondola}]`);
  }
  console.log(`Creados: ${creados} | ya existían: ${yaExistian.length}${yaExistian.length ? ` (${yaExistian.join(", ")})` : ""}`);
}
main().then(() => { console.log("Seed góndolas OK"); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
```

## Validación
1. Consola: `Creados: N | ya existían: M`.
2. En `/biblioteca/catalogo` o donde listes el catálogo, filtrá por góndola **Verdulería** y **Fiambrería** y confirmá que aparezcan.
3. Re-correr → 0 creados.

Commit: `feat: E3.4.11 seed catálogo verdulería/frutería + fiambrería (67 ingredientes)`.
