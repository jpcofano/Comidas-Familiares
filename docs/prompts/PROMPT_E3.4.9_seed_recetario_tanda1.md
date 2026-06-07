# PROMPT E3.4.9 — Seed recetario "tanda 1" (18 recetas + 27 ingredientes) · v2

> **v2 — corregido tras tu reporte D1–D6.** Los dos JSON se **regeneraron a la forma actual del
> modelo** y el script pasó a **admin SDK**. Abajo, las respuestas a tus 4 preguntas + lo que cambió +
> las 4 confirmaciones chicas que quedan antes del `procedé`.

## Qué cambió respecto de v1 (ya aplicado en los JSON)
- `porQueEsEspecial` → **`porQueEspecial`**; `notasNoche` → **`notasNocheDeADos`**.
- **Eliminados** `temporada` y `elegibleSemana`. En su lugar las recetas traen **`paraJuanPablo: boolean`** y **`paraFamilia: boolean`** (ambos `true`, tomados del TXT).
- `sinLacteos` y `hidratos` ahora son **boolean** en el JSON (no string).
- Agregados (required): **`dificultadOrden`**, **`costoOrden`**, **`tiempoActivoMin`**, **`tiempoTotalMin`**, **`porcionesMin`**, **`porcionesMax`** (number | null).
- Pasos con la forma real: **`nroPaso`, `detalle`, `tiempoEstimadoLabel`, `tiempoEstimadoMin`, `puntoClave`, `errorComun`** (+ `titulo`, `notas`).
- `IngredienteEnReceta` **sin `categoriaOverride`** (lo omití del modelo y del script).
- Enums: `proteinaPrincipal` ya usa **`Aves`** y **`Vegetal`** (no Pollo/Vegetariana). Ningún costo es `Bajo/Medio` (la Cazadora pasó a **`Medio`**).

## Respuestas a tus 4 preguntas
1. **Los JSON** — regenerados y adjuntos. Poné `scripts/seed-data/ingredientes_nuevos.json` y
   `scripts/seed-data/recetas_nuevas.json`. (Eran el bloqueador del D4: no existían en el repo todavía.)
2. **`elegibleSemana`** — no va. El JSON ya trae `paraJuanPablo`/`paraFamilia` (boolean). No hay que mapear nada.
3. **`categoriaOverride`** — **omitir**. No está en el modelo; el agrupado por góndola usa la `categoria`/`seccionGondola` del propio ingrediente del catálogo. El script no lo escribe.
4. **Proteínas/costos** — ya corregidos en origen: `Aves`/`Vegetal` y costos válidos. **No hay que remapear.**

---

## Confirmaciones antes del `procedé` (C1–C4)
- **C1 — `Legumbres`.** En tu D2 confirmaste Cordero/Pescado/Mariscos/Cerdo/Vacuna y los renames de Pollo/Vegetariana, pero no mencionaste **`Legumbres`** (lo usa el Hummus). Confirmá que siga válido; si en E9.0 también se renombró, decime a qué.
- **C2 — Convención de orden.** Asumí `dificultadOrden` = {Baja:1, Media:2, Media-alta:3, Alta:4} y `costoOrden` = {Bajo:1, Medio:2, Medio/Alto:3, Alto:4}. Verificá contra **una receta existente en `recetas.json`** (que ya está migrada) y, si difiere (ej. base 0), avisá y lo regenero.
- **C3 — Catálogo 265 vs 177.** El catálogo que tengo yo tenía 177 entradas; vos ves 265 en el repo. La resolución `canon → id` es **en runtime contra el catálogo vivo**, así que está cubierto, pero: en el D5 reportá **cuáles de los 27 "nuevos" ya existen** (el script los saltea) y confirmá **0 referencias de receta sin resolver**.
- **C4 — Auth/imports.** El script usa admin SDK (abajo). Confirmá el path/forma de carga del `service-account.json` igual que `seed-firestore.ts`, y que el import de `normalizeText` (`src/lib/canonical`, función pura) resuelva en tu runner; si no, copiá la función inline.

> **GATE:** con C1–C4 ok, dame el reporte y **esperá mi `procedé`** antes de escribir.

---

## Backup (post-`procedé`, pre-F2)
Export a JSON de `recetas` e `ingredientes` (`scripts/backups/E3.4.9_*_<ts>.json`). Es solo-alta e idempotente, pero respaldamos igual.

## F2 — ingredientes nuevos (idempotente: saltear canónico existente)
## F3 — recetas (idempotente por `nombreCanonico`): resolver `canon → idIngrediente`, asignar `REC-XXXX`, escribir.

### Script (`scripts/seedRecetarioTanda1.ts`) — admin SDK
```ts
/**
 * Etapa E3.4.9 — Seed recetario tanda 1. admin SDK (igual que seed-firestore.ts).
 * Idempotente y SOLO-ALTA: no borra ni sobreescribe.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { normalizeText } from "../src/lib/canonical"; // función pura (sin firebase)

// service-account: alinear con el mecanismo de los otros scripts
const serviceAccount = JSON.parse(readFileSync(resolve(__dirname, "../service-account.json"), "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const DIR = resolve(__dirname, "seed-data");
const NUEVOS_ING = JSON.parse(readFileSync(resolve(DIR, "ingredientes_nuevos.json"), "utf-8")) as any[];
const NUEVAS_REC = JSON.parse(readFileSync(resolve(DIR, "recetas_nuevas.json"), "utf-8")) as any[];
const pad = (n: number) => String(n).padStart(4, "0");

async function maxNum(coll: string, prefix: string): Promise<number> {
  const snap = await db.collection(coll).get();
  let max = 0;
  snap.forEach((d) => { const m = d.id.match(new RegExp(`^${prefix}-(\\d{4})$`)); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  return max;
}

async function main() {
  // mapas canónico → id / categoria desde el catálogo VIVO
  const idByCanon = new Map<string, string>();
  const catByCanon = new Map<string, string>();
  (await db.collection("ingredientes").get()).forEach((d) => {
    const x = d.data(); idByCanon.set(x.canonico, x.idIngrediente ?? d.id); catByCanon.set(x.canonico, x.categoria);
  });

  // ── F2 ──────────────────────────────────────────────────────────────────
  let nextIng = (await maxNum("ingredientes", "ING")) + 1;
  let ingCre = 0; const yaExistian: string[] = [];
  for (const def of NUEVOS_ING) {
    if (idByCanon.has(def.canonico)) { yaExistian.push(def.canonico); continue; }
    const id = `ING-${pad(nextIng++)}`;
    await db.collection("ingredientes").doc(id).set({
      idIngrediente: id, canonico: def.canonico, nombrePreferido: def.nombrePreferido,
      sinonimos: def.sinonimos, categoria: def.categoria, rolNutricional: def.rolNutricional,
      seccionGondola: def.seccionGondola, unidadesHabituales: def.unidadesHabituales,
      ambiguo: def.ambiguo, origen: def.origen,
      vecesUsado: 0, fechaCreacion: FieldValue.serverTimestamp(), ultimaModificacion: FieldValue.serverTimestamp(),
    });
    idByCanon.set(def.canonico, id); catByCanon.set(def.canonico, def.categoria);
    ingCre++; console.log(`  + ${id}  ${def.nombrePreferido}`);
  }
  console.log(`F2: ${ingCre} creados, ${yaExistian.length} ya existían${yaExistian.length ? ` (${yaExistian.join(", ")})` : ""}.`);

  // ── F3 ──────────────────────────────────────────────────────────────────
  let nextRec = (await maxNum("recetas", "REC")) + 1;
  let recCre = 0, recSalt = 0;
  for (const r of NUEVAS_REC) {
    const nc = normalizeText(r.nombre);
    const dup = await db.collection("recetas").where("nombreCanonico", "==", nc).limit(1).get();
    if (!dup.empty) { recSalt++; console.log(`  = (existe) ${r.nombre}`); continue; }

    const ingredientes = r.ingredientes.map((ing: any) => {
      const idIngrediente = idByCanon.get(ing.canon);
      if (!idIngrediente) throw new Error(`Receta "${r.nombre}": canónico sin resolver "${ing.canon}"`);
      const o: any = {
        idIngrediente, textoOriginal: ing.textoOriginal, seccion: ing.seccion,
        cantidad: ing.cantidad, unidad: ing.unidad, opcional: ing.opcional, notas: ing.notas,
      };
      if (ing.alternativas?.length) o.alternativas = ing.alternativas.map((a: any) => {
        const aid = idByCanon.get(a.canon);
        if (!aid) throw new Error(`Receta "${r.nombre}": alternativa sin resolver "${a.canon}"`);
        return { idIngrediente: aid };
      });
      return o;
    });

    const id = `REC-${pad(nextRec++)}`;
    const { ingredientes: _omit, ...resto } = r; // `resto` ya viene con todos los campos del modelo
    await db.collection("recetas").doc(id).set({
      idReceta: id, nombreCanonico: nc, vecesCocinada: 0,
      fechaImportacion: FieldValue.serverTimestamp(),
      ...resto, ingredientes,
    });
    recCre++; console.log(`  + ${id}  ${r.nombre}`);
  }
  console.log(`F3: ${recCre} creadas, ${recSalt} ya existían.`);
}

main().then(() => { console.log("Seed tanda 1 OK"); process.exit(0); })
      .catch((e) => { console.error(e); process.exit(1); });
```

## F4 — Validación
1. Consola: `F2: N creados …` y `F3: 18 creadas …`.
2. En `/biblioteca`: aparecen las 18 y **filtran** por proteína (Cordero, Aves, Vegetal), por `tipoItem` (Conserva, Guarnición) y por escenario (Celebración).
3. Abrí 3 recetas (con `alternativas` → **Lomo a la pimienta verde**; con muchos pasos → **Ossobuco**; conserva → **Hummus**) y verificá `porQueEspecial`, `riesgos`, y por paso `puntoClave`/`errorComun`.
4. Lista de compras con una nueva → mirá agrupado por góndola (acordate de la rareza de `jengibre fresco`=Lacteo en el catálogo, que reporté aparte).
5. Re-corré el script: tiene que saltear todo (0 creados).

## Reglas
- Nada de escrituras antes del `procedé`. Solo-alta; nunca sobrescribir ni borrar.
- Discrepancia con `models.ts` → reportar antes de tocar.
- Commit: `feat: E3.4.9 seed recetario tanda 1 (18 recetas + 27 ingredientes)`.
