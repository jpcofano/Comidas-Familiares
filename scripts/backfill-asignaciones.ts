/**
 * E4.1 — Backfill de asignaciones en planes activos.
 * Planes en estados activos sin asignaciones (o con subconjunto) reciben los 4 miembros.
 * No toca planes en estado "Evaluada" (terminal).
 * Idempotente.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");
if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error("ERROR: No se encontró scripts/service-account.json");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TODOS_LOS_MIEMBROS = ["juanpablo", "maria", "sofia", "federico"];
const ESTADOS_ACTIVOS = ["Elegida", "Compra pendiente", "Compra lista", "Cocinando", "Cocinada"];

async function main() {
  const projectId = (serviceAccount as { project_id: string }).project_id;
  console.log(`Conectado a: ${projectId}`);

  const snap = await db.collection("planes")
    .where("estado", "in", ESTADOS_ACTIVOS)
    .get();

  console.log(`Planes activos encontrados: ${snap.size}`);

  let backfilled = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const asignaciones: string[] = data.asignaciones ?? [];
    const yaTieneTodos = TODOS_LOS_MIEMBROS.every((id) => asignaciones.includes(id));

    if (yaTieneTodos) {
      console.log(`  SKIP  ${docSnap.id} — ya tiene los 4 miembros`);
      skipped++;
      continue;
    }

    await docSnap.ref.update({
      asignaciones: TODOS_LOS_MIEMBROS,
      ultimaModificacion: FieldValue.serverTimestamp(),
    });
    console.log(`  UPDATE ${docSnap.id} — asignaciones: [${(data.asignaciones ?? []).join(", ") || "AUSENTE"}] → [${TODOS_LOS_MIEMBROS.join(", ")}]`);
    backfilled++;
  }

  console.log(`\nResumen: ${backfilled} actualizados, ${skipped} sin cambios.`);

  // Verificación post-backfill
  console.log("\n=== VERIFICACIÓN POST-BACKFILL ===");
  const verSnap = await db.collection("planes")
    .where("estado", "in", ESTADOS_ACTIVOS)
    .get();
  verSnap.forEach((d) => {
    const { idPlan, estado, asignaciones } = d.data();
    console.log(JSON.stringify({ idPlan, estado, asignaciones }));
  });

  process.exit(0);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });
