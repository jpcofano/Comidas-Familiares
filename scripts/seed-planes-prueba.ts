/**
 * Inserta planes de prueba para E3.1 (Home modo JP).
 *
 * Crea: 1 Especial (REC-0001) + 1 Especial extra (REC-0101) + 1 En proceso (REC-0201)
 * para la semana en curso.  Todos marcados con notas: "[PRUEBA E3.1]".
 *
 * Uso:
 *   npm run seed:planes                       # inserta con estado Elegida
 *   npm run seed:planes -- --estado "Cocinada"
 *   npm run seed:planes -- --clean            # borra los 3 planes de prueba
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// ─── Config ────────────────────────────────────────────────────────────────────

const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");
const CLEAN = process.argv.includes("--clean");

const estadoIdx = process.argv.indexOf("--estado");
const ESTADO = estadoIdx !== -1 ? process.argv[estadoIdx + 1] : "Elegida";

const ESTADOS_VALIDOS = ["Elegida", "Compra pendiente", "Compra lista", "Cocinada"];

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`ERROR: service account no encontrado en ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}

if (!CLEAN && !ESTADOS_VALIDOS.includes(ESTADO)) {
  console.error(`ERROR: estado inválido "${ESTADO}". Válidos: ${ESTADOS_VALIDOS.join(", ")}`);
  process.exit(1);
}

// ─── Init ──────────────────────────────────────────────────────────────────────

const app = initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
const db = getFirestore(app);

// ─── IDs determinísticos ───────────────────────────────────────────────────────

const ID_ESP = "PLAN-TEST-E31-ESP";
const ID_EXT = "PLAN-TEST-E31-EXT";
const ID_ENP = "PLAN-TEST-E31-ENP";

const RECETAS = {
  esp: { id: "REC-0001", nombre: "Bondiola braseada al Malbec" },
  ext: { id: "REC-0101", nombre: "Langostinos al ajillo" },
  enp: { id: "REC-0201", nombre: "Berenjenas grilladas con criolla y oliva" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getLunesLocal(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() + diff);
  return formatLocal(lunes);
}

function formatLocal(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

const semanaInicio = getLunesLocal(new Date());
const semanaFin = (() => {
  const d = new Date(semanaInicio + "T12:00:00");
  d.setDate(d.getDate() + 6);
  return formatLocal(d);
})();

const MIEMBROS = ["juanpablo", "maria", "sofia", "federico"] as const;
const votos = Object.fromEntries(MIEMBROS.map(id => [id, null]));
const comentariosPlan = Object.fromEntries(MIEMBROS.map(id => [id, ""]));

function basePlan(overrides: Record<string, unknown>) {
  return {
    semanaInicio,
    semanaFin,
    tipoSeleccion: "receta",
    estado: ESTADO,
    fechaEleccion: Timestamp.now(),
    fechaPrevistaComida: null,
    cantidadPersonas: 4,
    listaComprasId: null,
    notas: "[PRUEBA E3.1]",
    asignaciones: ["juanpablo"],
    votos,
    comentariosPlan,
    datosCocinero: null,
    ...overrides,
  };
}

// ─── Clean ────────────────────────────────────────────────────────────────────

async function clean() {
  let borrados = 0;
  for (const id of [ID_ESP, ID_EXT, ID_ENP]) {
    const ref = db.collection("planes").doc(id);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      console.log(`  ✓ Borrado: ${id}`);
      borrados++;
    } else {
      console.log(`  — No existe: ${id}`);
    }
  }
  console.log(`\n${borrados} planes de prueba eliminados.`);
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`Semana: ${semanaInicio} → ${semanaFin}`);
  console.log(`Estado: ${ESTADO}\n`);

  const planes = [
    basePlan({
      idPlan: ID_ESP,
      tipoPlan: "Especial",
      idSeleccion: RECETAS.esp.id,
      nombreSeleccion: RECETAS.esp.nombre,
      recetaPrincipal: RECETAS.esp.nombre,
      origen: null,
    }),
    basePlan({
      idPlan: ID_EXT,
      tipoPlan: "Especial extra",
      idSeleccion: RECETAS.ext.id,
      nombreSeleccion: RECETAS.ext.nombre,
      recetaPrincipal: RECETAS.ext.nombre,
      origen: `extra:${ID_ESP}`,
    }),
    basePlan({
      idPlan: ID_ENP,
      tipoPlan: "En proceso",
      idSeleccion: RECETAS.enp.id,
      nombreSeleccion: RECETAS.enp.nombre,
      recetaPrincipal: RECETAS.enp.nombre,
      origen: null,
    }),
  ];

  for (const plan of planes) {
    const { idPlan, tipoPlan, nombreSeleccion } = plan as typeof plan & { idPlan: string; tipoPlan: string; nombreSeleccion: string };
    await db.collection("planes").doc(idPlan).set(plan);
    console.log(`  ✓ ${idPlan} [${tipoPlan}] — ${nombreSeleccion}`);
  }

  console.log(`\n3 planes de prueba creados.`);
  console.log(`Para limpiarlos: npm run seed:planes -- --clean`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(CLEAN ? clean() : seed())
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
