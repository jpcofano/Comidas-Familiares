/**
 * E9.16 — Export snapshot read-only de recetas + ingredientes.
 *
 * Lee las colecciones completas desde Firestore y las vuelca a JSON versionado
 * en scripts/snapshots/<YYYY-MM-DD>/. Nunca escribe en Firestore.
 *
 * Uso:
 *   npx ts-node --esm scripts/exportSnapshot.ts
 *
 * Salida:
 *   scripts/snapshots/<YYYY-MM-DD>/recetas.json
 *   scripts/snapshots/<YYYY-MM-DD>/ingredientes.json
 *   scripts/snapshots/<YYYY-MM-DD>/manifest.json
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

// ─── Config ───────────────────────────────────────────────────────────────────

const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");

// Sintéticos de comprasRapidas — excluidos del conteo "real" de recetas.
const SINTETICOS = new Set(["REC-1535", "REC-1537"]);

// ─── Guard read-only ──────────────────────────────────────────────────────────
// Wrap que bloquea cualquier intento de escritura a Firestore dentro de este script.
// Si alguien añade un .set/.update/.delete por error, el proceso falla antes de ejecutar.

function assertReadOnly(db: Firestore): void {
  const WRITE_METHODS = ["set", "update", "delete", "add", "create"] as const;
  for (const method of WRITE_METHODS) {
    const col = db.collection("__guard__") as unknown as Record<string, unknown>;
    const doc = db.doc("__guard__/guard") as unknown as Record<string, unknown>;
    const orig = doc[method];
    if (typeof orig === "function") {
      doc[method] = () => {
        throw new Error(`[read-only guard] Intento de escritura bloqueado: Firestore.doc.${method}()`);
      };
    }
    const origCol = col[method as keyof typeof col];
    if (typeof origCol === "function") {
      (col as Record<string, unknown>)[method] = () => {
        throw new Error(`[read-only guard] Intento de escritura bloqueado: Firestore.collection.${method}()`);
      };
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function gitCommitHash(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`ERROR: No se encontró el service account en ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
  }

  initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
  const db = getFirestore();

  assertReadOnly(db);

  const date = isoDate();
  const outDir = resolve(`scripts/snapshots/${date}`);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const commitHash = gitCommitHash();
  const timestamp  = new Date().toISOString();

  console.log(`\nExport snapshot — ${timestamp}`);
  console.log(`Commit: ${commitHash}`);
  console.log(`Destino: ${outDir}\n`);

  // ─── recetas ────────────────────────────────────────────────────────────────

  console.log("Leyendo colección recetas...");
  const recSnap = await db.collection("recetas").get();

  const recMismatches: string[] = [];
  const recDocs = recSnap.docs
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      if (data["idReceta"] !== doc.id) {
        const msg = `doc.id=${doc.id} pero data.idReceta=${String(data["idReceta"])}`;
        recMismatches.push(msg);
        console.warn(`  MISMATCH receta: ${msg}`);
      }
      return data;
    });

  const recTotal   = recDocs.length;
  const recReales  = recDocs.filter((d) => !SINTETICOS.has(String(d["idReceta"]))).length;

  writeFileSync(`${outDir}/recetas.json`, JSON.stringify(recDocs, null, 2), "utf8");
  console.log(`  recetas.json — total: ${recTotal}, reales: ${recReales}, sintéticos: ${recTotal - recReales}`);
  if (recMismatches.length > 0) console.warn(`  ⚠ ${recMismatches.length} mismatch(es) en recetas`);

  // ─── ingredientes ────────────────────────────────────────────────────────────

  console.log("Leyendo colección ingredientes...");
  const ingSnap = await db.collection("ingredientes").get();

  const ingMismatches: string[] = [];
  const ingDocs = ingSnap.docs
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      if (data["idIngrediente"] !== doc.id) {
        const msg = `doc.id=${doc.id} pero data.idIngrediente=${String(data["idIngrediente"])}`;
        ingMismatches.push(msg);
        console.warn(`  MISMATCH ingrediente: ${msg}`);
      }
      return data;
    });

  const ingTotal = ingDocs.length;

  writeFileSync(`${outDir}/ingredientes.json`, JSON.stringify(ingDocs, null, 2), "utf8");
  console.log(`  ingredientes.json — total: ${ingTotal}`);
  if (ingMismatches.length > 0) console.warn(`  ⚠ ${ingMismatches.length} mismatch(es) en ingredientes`);

  // ─── manifest ────────────────────────────────────────────────────────────────

  const manifest = {
    timestamp,
    commitHash,
    colecciones: {
      recetas: {
        total:     recTotal,
        reales:    recReales,
        sinteticos: recTotal - recReales,
        sinteticosIds: [...SINTETICOS].sort(),
        mismatches: recMismatches,
      },
      ingredientes: {
        total:     ingTotal,
        mismatches: ingMismatches,
      },
    },
  };

  writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2), "utf8");

  const totalMismatches = recMismatches.length + ingMismatches.length;
  console.log(`\nmanifest.json generado.`);
  if (totalMismatches > 0) {
    console.warn(`\n⚠ ${totalMismatches} mismatch(es) en total — ver manifest.json para detalle.`);
  } else {
    console.log(`✓ Chequeo de integridad OK — todos los doc.id coinciden con id* en data.`);
  }

  console.log(`\nDone. Archivos en ${outDir}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
