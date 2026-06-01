/**
 * E11.2 — Exportar lista de ingredientes para poblar macros con LLM.
 *
 * Lee /ingredientes de Firestore y emite a stdout (o archivo) la lista ordenada
 * por categoría + nombre, lista para pegar en MACROS_LLM_PROMPT.md.
 * Omite categoría "Utensilio" (no comestibles).
 *
 * Uso:
 *   npx ts-node --esm scripts/export-ingredientes-para-macros.ts
 *   npx ts-node --esm scripts/export-ingredientes-para-macros.ts --out scripts/seed-data/ingredientes-para-macros.txt
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");
const outArg = process.argv.indexOf("--out");
const OUT_FILE = outArg !== -1 ? process.argv[outArg + 1] : null;

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`ERROR: No se encontró el service account en ${SERVICE_ACCOUNT_PATH}

Para generarlo:
  1. Firebase Console → ⚙ Project Settings → Service accounts
  2. "Generate new private key" → confirmar
  3. Renombrá el archivo a "service-account.json" y guardalo en scripts/
  4. Volvé a correr el script`);
  process.exit(1);
}

initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
const db = getFirestore();

async function main() {
  const snap = await db.collection("ingredientes").get();
  const docs = snap.docs
    .map(d => d.data() as { idIngrediente: string; nombrePreferido: string; categoria: string; unidadesHabituales?: string[] })
    .filter(d => d.categoria !== "Utensilio")
    .sort((a, b) => {
      const catCmp = a.categoria.localeCompare(b.categoria, "es");
      return catCmp !== 0 ? catCmp : a.nombrePreferido.localeCompare(b.nombrePreferido, "es");
    });

  const lines = [
    `# Ingredientes para macros — ${docs.length} docs (Firestore /ingredientes, sin Utensilio)`,
    `# Formato: idIngrediente — nombrePreferido (categoria) [unidadesHabituales]`,
    `# Generado: ${new Date().toISOString()}`,
    "",
    ...docs.map(d => {
      const unidades = d.unidadesHabituales?.length ? ` [${d.unidadesHabituales.join(", ")}]` : "";
      return `${d.idIngrediente} — ${d.nombrePreferido} (${d.categoria})${unidades}`;
    }),
  ];

  const output = lines.join("\n");

  if (OUT_FILE) {
    writeFileSync(OUT_FILE, output, "utf-8");
    console.log(`✓ Exportado ${docs.length} ingredientes → ${OUT_FILE}`);
  } else {
    console.log(output);
  }
}

main().catch(err => { console.error("Error:", err); process.exit(1); });
