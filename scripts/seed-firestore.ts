/**
 * Approach: read Migracion/30_Seeds.gs, replace `const` with `var` so Node's
 * vm sandbox exposes the arrays as properties, then map tuples → Firestore docs.
 *
 * Column order is taken from CS_HEADERS in Migracion/00_Config.gs.
 * Derived fields (tiempos, dificultad, restricciones) are NOT persisted in menus
 * because they're computed at query time from recipe components (Modelo M).
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { normalizeText, canonicalizarIngrediente } from "../src/lib/canonical";
import { parseTime, parseNumber, parseDificultad, parseCosto, parseSiNo } from "../src/lib/parsers";
import type {
  Receta, Ingrediente, Paso, Menu, ComponenteMenu,
  TipoItem, Proteina, Escenario, ClimaPlato, PensadaPara,
  Dificultad, Costo, AptoNocheDeADos, EstadoMenu, TipoComponente,
} from "../src/types/models";

// ─── Config ────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");
const SEEDS_PATH = resolve("Migracion/30_Seeds.gs");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`
ERROR: No se encontró el service account en ${SERVICE_ACCOUNT_PATH}

Para generarlo:
  1. Abrí Firebase Console → https://console.firebase.google.com/project/comida-familiar
  2. Engranaje (⚙) → Project Settings → pestaña "Service accounts"
  3. Clic en "Generate new private key" → confirmar
  4. Renombrá el archivo descargado a "service-account.json"
  5. Guardalo en scripts/service-account.json dentro de este repo
  6. Volvé a correr: npm run seed:firestore
`);
  process.exit(1);
}

if (!existsSync(SEEDS_PATH)) {
  console.error(`ERROR: No se encontró el archivo de seeds en ${SEEDS_PATH}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── Parse 30_Seeds.gs ────────────────────────────────────────────────────────

const gsSource = readFileSync(SEEDS_PATH, "utf-8").replace(/\bconst\s+/g, "var ");
const sandbox: Record<string, unknown> = {};
vm.createContext(sandbox);
vm.runInContext(gsSource, sandbox);

const rawRecetas   = sandbox["CS_SEED_RECETAS_COMPLETAS"]    as unknown[][];
const rawIngr      = sandbox["CS_SEED_INGREDIENTES_COMPLETOS"] as unknown[][];
const rawPasos     = sandbox["CS_SEED_PASOS_COMPLETOS"]       as unknown[][];
const rawMenus     = sandbox["CS_SEED_MENUS_COMPLETOS"]       as unknown[][];
const rawMenuItems = sandbox["CS_SEED_MENU_ITEMS_COMPLETOS"]  as unknown[][];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function siNo(v: unknown, fallback: boolean): boolean {
  const r = parseSiNo(v);
  return r === null ? fallback : r;
}

const TIPOS_ITEM_VALIDOS = new Set<string>([
  "Receta principal", "Entrada", "Guarnición", "Postre",
  "Panificado", "Snack", "Desayuno", "Conserva", "Hidrato opcional",
]);
const PROTEINAS_VALIDAS = new Set<string>([
  "Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado",
  "Mariscos", "Huevos", "Legumbres", "Mixta", "Vegetariana",
]);
const ESCENARIOS_VALIDOS = new Set<string>(["Noche de a dos", "Cocina rápida", "Cena Especial", "Celebración"]);
const CLIMA_VALIDO = new Set<string>(["Liviano", "Medio", "Potente"]);
const PENSADA_VALIDA = new Set<string>(["Especial", "Semana", "Cualquiera"]);
const APTO_NOCHE_VALIDO = new Set<string>(["Sí", "No", "Adaptable"]);
const ESTADOS_MENU_VALIDOS = new Set<string>(["Para probar", "Probado", "Archivado"]);
const TIPOS_COMPONENTE_VALIDOS = new Set<string>(["Entrada", "Principal", "Acompañamiento", "Postre"]);

function validEscenario(v: string): Escenario {
  return ESCENARIOS_VALIDOS.has(v) ? v as Escenario : "Cena Especial";
}
function validAptoNoche(v: string): AptoNocheDeADos {
  return APTO_NOCHE_VALIDO.has(v) ? v as AptoNocheDeADos : "No";
}

// ─── Step 1: Parse recetas (first pass — detect Componentes) ─────────────────

type RecetaBase = Omit<Receta, "ingredientes" | "pasos">;

const recetaIds = new Set<string>();
const componenteIds = new Set<string>();
const parsedRecetasMap = new Map<string, RecetaBase>();
const invalidRecetaIds: string[] = [];

for (const row of rawRecetas) {
  const idReceta = str(row[0]);
  if (!/^REC-\d{4}$/.test(idReceta)) {
    invalidRecetaIds.push(idReceta || "(vacío)");
    continue;
  }

  const tipoItemRaw = str(row[23]);
  const isComponente = tipoItemRaw === "Componente";
  const tipoItem: TipoItem = TIPOS_ITEM_VALIDOS.has(tipoItemRaw)
    ? tipoItemRaw as TipoItem
    : "Receta principal";

  if (isComponente) componenteIds.add(idReceta);

  const tiempoActivo = parseTime(row[10]);
  const tiempoTotal  = parseTime(row[11]);
  const porciones    = parseNumber(row[12]);
  const dif          = parseDificultad(row[3]);
  const costo        = parseCosto(row[13]);
  const proteina     = str(row[4]);
  const climaRaw     = str(row[20]);
  const pensadaRaw   = str(row[30]);

  const base: RecetaBase = {
    idReceta,
    nombre: str(row[1]),
    nombreCanonico: normalizeText(row[1]),

    tipoItem: isComponente ? tipoItem : tipoItem,
    proteinaPrincipal: PROTEINAS_VALIDAS.has(proteina) ? proteina as Proteina : "Vegetariana",
    estilo: str(row[2]),
    tecnicaPrincipal: str(row[5]),
    escenarioUso: validEscenario(str(row[19])),
    pensadaPara: PENSADA_VALIDA.has(pensadaRaw) ? pensadaRaw as PensadaPara : "Cualquiera",

    sinLacteos: siNo(row[6], true),
    hidratos: siNo(row[7], false),
    aptoNocheDeADos: validAptoNoche(str(row[21])),
    paraJuanPablo: true,
    paraFamilia: true,

    tiempoActivoLabel: str(row[10]),
    tiempoActivoMin: tiempoActivo?.value ?? null,
    tiempoTotalLabel: str(row[11]),
    tiempoTotalMin: tiempoTotal?.value ?? null,
    dificultad: (dif.label || "Media") as Dificultad,
    dificultadOrden: dif.orden || 2,

    porcionesLabel: str(row[12]),
    porcionesMin: porciones?.min ?? porciones?.value ?? null,
    porcionesMax: porciones?.max ?? null,
    costoEstimado: (costo.label || "Medio") as Costo,
    costoOrden: costo.orden || 2,

    ...(CLIMA_VALIDO.has(climaRaw) ? { climaDelPlato: climaRaw as ClimaPlato } : {}),
    ...(str(row[8])  ? { hidratoOpcional: str(row[8]) }  : {}),
    ...(str(row[9])  ? { acompPadres: str(row[9]) }      : {}),
    ...(str(row[15]) ? { porQueEspecial: str(row[15]) }  : {}),
    ...(str(row[16]) ? { riesgos: str(row[16]) }         : {}),
    ...(str(row[17]) ? { imagenUrl: str(row[17]) }       : {}),
    ...(str(row[18]) ? { notas: str(row[18]) }           : {}),
    ...(str(row[22]) ? { notasNocheDeADos: str(row[22])}: {}),
    ...(str(row[25]) ? { fuente: str(row[25]) }          : {}),
    ...(str(row[26]) ? { fechaImportacion: str(row[26])}: {}),
    ...(str(row[27]) ? { ultimaEvaluacion: str(row[27])}: {}),
    ...(row[28] != null && row[28] !== "" ? { ultimoPuntaje: Number(row[28]) } : {}),

    vecesCocinada: Number(row[29]) || 0,
    fechaCreacion: Timestamp.now() as unknown as import("../src/types/models").FirestoreTimestamp,
  };

  recetaIds.add(idReceta);
  parsedRecetasMap.set(idReceta, base);
}

// ─── Step 2: Componente migration ─────────────────────────────────────────────

// Mapeo de rol en menú → TipoItem (ver MAPEO_FIRESTORE §1.2.bis)
const ROL_TO_TIPO_ITEM: Record<string, TipoItem> = {
  "Entrada": "Entrada",
  "Principal": "Receta principal",
  "Postre": "Postre",
  "Acompañamiento": "Guarnición",
  "Extra": "Guarnición",
};

const rolesByComponente: Record<string, Set<string>> = {};
for (const row of rawMenuItems) {
  const idReceta = str(row[4]);
  if (componenteIds.has(idReceta)) {
    if (!rolesByComponente[idReceta]) rolesByComponente[idReceta] = new Set();
    rolesByComponente[idReceta].add(str(row[3]));
  }
}

const reasignaciones: Array<{ idReceta: string; de: string; a: TipoItem }> = [];
const ambiguos: Array<{ idReceta: string; roles: string[] }> = [];

for (const idReceta of componenteIds) {
  const roles = rolesByComponente[idReceta];
  const rolesArr = roles ? [...roles] : [];

  if (rolesArr.length === 1 && ROL_TO_TIPO_ITEM[rolesArr[0]]) {
    const nuevoTipo = ROL_TO_TIPO_ITEM[rolesArr[0]];
    const rec = parsedRecetasMap.get(idReceta);
    if (rec) parsedRecetasMap.set(idReceta, { ...rec, tipoItem: nuevoTipo });
    reasignaciones.push({ idReceta, de: "Componente", a: nuevoTipo });
  } else {
    ambiguos.push({ idReceta, roles: rolesArr });
  }
}

if (ambiguos.length > 0) {
  console.error("\n⚠  COMPONENTES AMBIGUOS — el script frena antes de escribir:");
  for (const a of ambiguos) {
    const roles = a.roles.length ? a.roles.join(", ") : "(no aparece en ningún menú)";
    console.error(`   ${a.idReceta}  roles: [${roles}]`);
  }
  console.error("\nResolvé los tipos manualmente y volvé a correr el script.");
  process.exit(1);
}

// ─── Step 3: Parse ingredientes ───────────────────────────────────────────────

const ingredientesByReceta: Record<string, Ingrediente[]> = {};
const nroOrdenByReceta: Record<string, number> = {};
let orphanIngr = 0;

for (const row of rawIngr) {
  const idReceta = str(row[0]);
  if (!recetaIds.has(idReceta)) { orphanIngr++; continue; }

  nroOrdenByReceta[idReceta] = (nroOrdenByReceta[idReceta] ?? 0) + 1;
  const cant = parseNumber(row[4]);

  const ing: Ingrediente = {
    nroOrden: nroOrdenByReceta[idReceta],
    ingrediente: str(row[3]),
    ingredienteCanonico: canonicalizarIngrediente(str(row[3])),
    cantidad: cant?.value ?? null,
    cantidadLabel: str(row[4]),
    unidad: str(row[5]),
    categoria: str(row[6]),
    opcional: siNo(row[7], false),
    ...(cant?.min !== undefined ? { cantidadMin: cant.min } : {}),
    ...(cant?.max !== undefined ? { cantidadMax: cant.max } : {}),
    ...(str(row[2]) ? { seccion: str(row[2]) } : {}),
    ...(str(row[10]) ? { notas: str(row[10]) } : {}),
  };

  if (!ingredientesByReceta[idReceta]) ingredientesByReceta[idReceta] = [];
  ingredientesByReceta[idReceta].push(ing);
}

// ─── Step 4: Parse pasos ──────────────────────────────────────────────────────

const pasosByReceta: Record<string, Paso[]> = {};
let orphanPasos = 0;

for (const row of rawPasos) {
  const idReceta = str(row[0]);
  if (!recetaIds.has(idReceta)) { orphanPasos++; continue; }

  const tiempo = parseTime(row[5]);
  const paso: Paso = {
    nroPaso: Number(row[2]) || 0,
    titulo: str(row[3]),
    detalle: str(row[4]),
    tiempoEstimadoLabel: str(row[5]),
    tiempoEstimadoMin: tiempo?.value ?? null,
    ...(str(row[6]) ? { puntoClave: str(row[6]) } : {}),
    ...(str(row[7]) ? { errorComun: str(row[7]) } : {}),
    ...(str(row[8]) ? { notas: str(row[8]) } : {}),
  };

  if (!pasosByReceta[idReceta]) pasosByReceta[idReceta] = [];
  pasosByReceta[idReceta].push(paso);
}

// Sort pasos by nroPaso (should already be ordered but be defensive)
for (const id of Object.keys(pasosByReceta)) {
  pasosByReceta[id].sort((a, b) => a.nroPaso - b.nroPaso);
}

// ─── Step 5: Assemble Receta[] ────────────────────────────────────────────────

const recetasFinal: Receta[] = [];
for (const [idReceta, base] of parsedRecetasMap) {
  recetasFinal.push({
    ...base,
    ingredientes: ingredientesByReceta[idReceta] ?? [],
    pasos: pasosByReceta[idReceta] ?? [],
  });
}

// ─── Step 6: Parse menu items ─────────────────────────────────────────────────

const componentesByMenu: Record<string, ComponenteMenu[]> = {};
let componentesSinReceta = 0;
const componentesSinRecetaList: string[] = [];

for (const row of rawMenuItems) {
  const idMenu   = str(row[0]);
  const idReceta = str(row[4]);
  const tipo     = str(row[3]);

  if (!recetaIds.has(idReceta)) {
    componentesSinReceta++;
    componentesSinRecetaList.push(`${idMenu} → idReceta=${idReceta}`);
    continue;
  }
  // "Extra" del sistema viejo no tiene equivalente en TipoComponente → Acompañamiento
  const tipoMapped = tipo === "Extra" ? "Acompañamiento" : tipo;
  if (!TIPOS_COMPONENTE_VALIDOS.has(tipoMapped)) continue;

  const comp: ComponenteMenu = {
    orden: Number(row[2]) || 0,
    tipo: tipoMapped as TipoComponente,
    idReceta,
    obligatorio: siNo(row[6], true),
    ...(str(row[9]) ? { notas: str(row[9]) } : {}),
  };

  if (!componentesByMenu[idMenu]) componentesByMenu[idMenu] = [];
  componentesByMenu[idMenu].push(comp);
}

for (const idMenu of Object.keys(componentesByMenu)) {
  componentesByMenu[idMenu].sort((a, b) => a.orden - b.orden);
}

// ─── Step 7: Parse menus ──────────────────────────────────────────────────────

const menusFinal: Menu[] = [];
const invalidMenuIds: string[] = [];

for (const row of rawMenus) {
  const idMenu = str(row[0]);
  if (!/^MENU-\d{4}$/.test(idMenu)) {
    invalidMenuIds.push(idMenu || "(vacío)");
    continue;
  }

  const estadoRaw = str(row[2]);
  const menu: Menu = {
    idMenu,
    nombreMenu: str(row[1]),
    nombreCanonico: normalizeText(row[1]),
    estado: ESTADOS_MENU_VALIDOS.has(estadoRaw) ? estadoRaw as EstadoMenu : "Para probar",
    estilo: str(row[3]),
    escenarioUso: validEscenario(str(row[16])),
    componentes: componentesByMenu[idMenu] ?? [],
    fechaCreacion: Timestamp.now() as unknown as import("../src/types/models").FirestoreTimestamp,

    // Derived fields (tiempos, dificultad, sinLacteos, hidratos) — NOT persisted (Modelo M)
    // cols 4, 5, 6, 8, 9 are skipped

    ...(str(row[7])  ? { hidratoOpcional: str(row[7]) }  : {}),
    ...(str(row[10]) ? { idealPara: str(row[10]) }       : {}),
    ...(str(row[11]) ? { descripcion: str(row[11]) }     : {}),
    ...(str(row[12]) ? { paraJuanPablo: str(row[12]) }   : {}),
    ...(str(row[13]) ? { paraFamilia: str(row[13]) }     : {}),
    ...(str(row[14]) ? { riesgos: str(row[14]) }         : {}),
    ...(str(row[15]) ? { notas: str(row[15]) }           : {}),
    ...(str(row[17]) ? { climaDelMenu: str(row[17]) }    : {}),
    ...(APTO_NOCHE_VALIDO.has(str(row[18])) ? { aptoNocheDeADos: str(row[18]) as AptoNocheDeADos } : {}),
    ...(str(row[19]) ? { notasOcasion: str(row[19]) }   : {}),
  };

  menusFinal.push(menu);
}

// ─── Report ───────────────────────────────────────────────────────────────────

const totalIngr = Object.values(ingredientesByReceta).reduce((s, a) => s + a.length, 0);
const totalPasos = Object.values(pasosByReceta).reduce((s, a) => s + a.length, 0);
const totalComps = menusFinal.reduce((s, m) => s + m.componentes.length, 0);

console.log("\n═══════════════════════════════════════════════════════════════");
console.log(DRY_RUN ? "  DRY RUN — no se escribe nada a Firestore" : "  SEED REAL — escribiendo a Firestore");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`\nRecetas parseadas:       ${recetasFinal.length}   (esperadas: 78)`);
if (invalidRecetaIds.length) console.log(`  IDs inválidos:         ${invalidRecetaIds.join(", ")}`);
console.log(`\nIngredientes:            ${totalIngr}  (esperados: ~1.180)`);
if (orphanIngr) console.log(`  Huérfanos:             ${orphanIngr}`);
console.log(`\nPasos:                   ${totalPasos}  (esperados: ~800)`);
if (orphanPasos) console.log(`  Huérfanos:             ${orphanPasos}`);
console.log(`\nMenús parseados:         ${menusFinal.length}   (esperados: 5)`);
if (invalidMenuIds.length) console.log(`  IDs inválidos:         ${invalidMenuIds.join(", ")}`);
console.log(`  Total componentes:     ${totalComps}  (esperados: ~21)`);
if (componentesSinReceta) {
  console.log(`  Componentes sin rec:   ${componentesSinReceta}`);
  for (const c of componentesSinRecetaList) console.log(`    - ${c}`);
}
console.log(`\nRecetas "Componente":    ${componenteIds.size}   (esperadas: 0)`);
if (reasignaciones.length) {
  console.log(`  Reasignadas:`);
  for (const r of reasignaciones) console.log(`    ${r.idReceta}: Componente → ${r.a}`);
}

if (DRY_RUN) {
  console.log("\n✓ Dry-run completado sin errores.\n");
  process.exit(0);
}

// ─── Write to Firestore ───────────────────────────────────────────────────────

console.log("\nEscribiendo a Firestore...");

const BATCH_SIZE = 490;
let batch = db.batch();
let ops = 0;

async function flushBatch() {
  if (ops > 0) {
    await batch.commit();
    batch = db.batch();
    ops = 0;
  }
}

async function batchSet(ref: FirebaseFirestore.DocumentReference, data: object) {
  batch.set(ref, data);
  ops++;
  if (ops >= BATCH_SIZE) await flushBatch();
}

for (const receta of recetasFinal) {
  await batchSet(db.collection("recetas").doc(receta.idReceta), receta);
}
await flushBatch();
console.log(`✓ /recetas: ${recetasFinal.length} documentos escritos`);

for (const menu of menusFinal) {
  await batchSet(db.collection("menus").doc(menu.idMenu), menu);
}
await flushBatch();
console.log(`✓ /menus: ${menusFinal.length} documentos escritos`);

console.log("\n✓ Seed completado. Verificar en Firebase Console → Firestore.\n");
process.exit(0);
