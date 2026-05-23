/**
 * Reseed completo de la base de datos con el modelo v1.4 (catálogo de ingredientes).
 * Wipe + load de /ingredientes, /recetas, /menus.
 * También borra /compras, /planes, /historial (datos de prueba viejos).
 *
 * Uso: npm run reseed
 * Dry-run: npm run reseed -- --dry-run
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeText } from "../src/lib/canonical";
import { parseDificultad, parseCosto, parseTime } from "../src/lib/parsers";

const DRY_RUN = process.argv.includes("--dry-run");
const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`ERROR: scripts/service-account.json no encontrado.`);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJson(filename: string): unknown[] {
  const path = resolve(`scripts/seed-data/${filename}`);
  if (!existsSync(path)) { console.error(`ERROR: ${path} no encontrado.`); process.exit(1); }
  return JSON.parse(readFileSync(path, "utf-8")) as unknown[];
}

function parseBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  const s = String(val ?? "").trim().toLowerCase();
  return s === "sí" || s === "si" || s === "true" || s === "1" || s === "yes";
}

function parseNumOrNull(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parsePorciones(label: string): { min: number | null; max: number | null } {
  if (!label) return { min: null, max: null };
  const m = label.match(/(\d+)\s*(?:a|-)\s*(\d+)/);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  const single = label.match(/^(\d+)/);
  if (single) return { min: Number(single[1]), max: Number(single[1]) };
  return { min: null, max: null };
}

// ─── Wipe de una colección (todos los docs, sin subcollections por defecto) ───

async function wipeCollection(name: string): Promise<void> {
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  const chunks: FirebaseFirestore.DocumentReference[][] = [];
  let cur: FirebaseFirestore.DocumentReference[] = [];
  for (const d of snap.docs) { cur.push(d.ref); if (cur.length === 400) { chunks.push(cur); cur = []; } }
  if (cur.length) chunks.push(cur);
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach((r) => batch.delete(r));
    if (!DRY_RUN) await batch.commit();
  }
  console.log(`  ✓ wipe ${name}: ${snap.size} docs`);
}

async function wipeCompras(): Promise<void> {
  const snap = await db.collection("compras").get();
  for (const d of snap.docs) {
    const items = await d.ref.collection("items").get();
    if (!items.empty) {
      const batch = db.batch();
      items.docs.forEach((i) => batch.delete(i.ref));
      if (!DRY_RUN) await batch.commit();
    }
    if (!DRY_RUN) await d.ref.delete();
  }
  console.log(`  ✓ wipe compras: ${snap.size} docs (+ items subcollections)`);
}

// ─── Load helpers ─────────────────────────────────────────────────────────────

async function batchWrite(
  colName: string,
  items: Array<{ id: string; data: Record<string, unknown> }>
): Promise<void> {
  const chunks: typeof items[] = [];
  for (let i = 0; i < items.length; i += 400) chunks.push(items.slice(i, i + 400));
  for (const chunk of chunks) {
    const batch = db.batch();
    for (const { id, data } of chunk) {
      batch.set(db.collection(colName).doc(id), data);
    }
    if (!DRY_RUN) await batch.commit();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log("🔵 DRY RUN — no se escribe nada en Firestore\n");

  // ── Wipe ────────────────────────────────────────────────────────────────────
  console.log("1. Wipe de colecciones...");
  await wipeCollection("ingredientes");
  await wipeCollection("recetas");
  await wipeCollection("menus");
  await wipeCompras();
  await wipeCollection("planes");
  await wipeCollection("historial");

  // ── Load ingredientes ────────────────────────────────────────────────────────
  console.log("\n2. Cargando ingredientes...");
  const rawIngredientes = readJson("catalogo_ingredientes.json") as Record<string, unknown>[];
  const ingredientesItems = rawIngredientes.map((r) => ({
    id: r["idIngrediente"] as string,
    data: r as Record<string, unknown>,
  }));
  await batchWrite("ingredientes", ingredientesItems);
  console.log(`  ✓ ${ingredientesItems.length} ingredientes`);

  // ── Load recetas ─────────────────────────────────────────────────────────────
  console.log("\n3. Cargando recetas...");
  const rawRecetas = readJson("recetas.json") as Record<string, unknown>[];

  const recetasItems = rawRecetas.map((r) => {
    const nombre = String(r["nombre"] ?? "");
    const dif = String(r["dificultad"] ?? "");
    const costo = String(r["costoEstimado"] ?? "");
    const porcLabel = String(r["porcionesLabel"] ?? "");
    const { min: porMin, max: porMax } = parsePorciones(porcLabel);

    // Bug 1 fix: parsers devuelven {label, orden} — extraer por separado
    const difParsed = parseDificultad(dif);
    const costoParsed = parseCosto(costo);

    // Bug 3 fix: tiempos se derivan del label string con parseTime
    const tiempoActivoLabel = String(r["tiempoActivoLabel"] ?? "");
    const tiempoTotalLabel = String(r["tiempoTotalLabel"] ?? "");

    const data: Record<string, unknown> = {
      idReceta: r["idReceta"],
      nombre,
      nombreCanonico: normalizeText(nombre),
      tipoItem: r["tipoItem"] ?? "Receta principal",
      proteinaPrincipal: r["proteinaPrincipal"] ?? "Vacuna",
      estilo: r["estilo"] ?? "",
      tecnicaPrincipal: r["tecnicaPrincipal"] ?? "",
      escenarioUso: r["escenarioUso"] ?? "Cena Especial",
      pensadaPara: r["pensadaPara"] ?? "Especial",
      sinLacteos: parseBool(r["sinLacteos"]),
      hidratos: parseBool(r["hidratos"]),
      aptoNocheDeADos: r["aptoNocheDeADos"] ?? "No",
      paraJuanPablo: parseBool(r["paraJuanPablo"] ?? "Sí"),
      paraFamilia: parseBool(r["paraFamilia"] ?? "Sí"),
      tiempoActivoLabel,
      tiempoActivoMin: parseTime(tiempoActivoLabel)?.value ?? null,
      tiempoTotalLabel,
      tiempoTotalMin: parseTime(tiempoTotalLabel)?.value ?? null,
      dificultad: difParsed.label || dif,
      dificultadOrden: difParsed.orden,
      porcionesLabel: porcLabel,
      porcionesMin: porMin,
      porcionesMax: porMax,
      costoEstimado: costoParsed.label || costo,
      costoOrden: costoParsed.orden,
      vecesCocinada: Number(r["vecesCocinada"] ?? 0),
      ingredientes: (r["ingredientes"] as unknown[] ?? []).map((ing: unknown) => {
        const i = ing as Record<string, unknown>;
        const out: Record<string, unknown> = {
          idIngrediente: i["idIngrediente"],
          textoOriginal: i["textoOriginal"] ?? "",
        };
        if (i["preparacion"]) out["preparacion"] = i["preparacion"];
        if (i["seccion"]) out["seccion"] = i["seccion"];
        if (i["cantidad"] != null) out["cantidad"] = i["cantidad"];
        if (i["unidad"]) out["unidad"] = i["unidad"];
        if (i["categoriaOverride"]) out["categoriaOverride"] = i["categoriaOverride"];
        out["opcional"] = Boolean(i["opcional"] ?? false);
        if (i["notas"]) out["notas"] = i["notas"];
        if (Array.isArray(i["alternativas"]) && (i["alternativas"] as unknown[]).length > 0) {
          out["alternativas"] = i["alternativas"];
        }
        return out;
      }),
      // Bug 2 fix: JSON usa orden/contenido/tiempoLabel/truco/riesgo
      pasos: (r["pasos"] as unknown[] ?? []).map((p: unknown) => {
        const paso = p as Record<string, unknown>;
        const tiempoLabelPaso = String(paso["tiempoLabel"] ?? "");
        const out: Record<string, unknown> = {
          nroPaso: Number(paso["orden"] ?? 1),
          titulo: paso["titulo"] ?? "",
          detalle: paso["contenido"] ?? "",
          tiempoEstimadoLabel: tiempoLabelPaso,
          tiempoEstimadoMin: parseTime(tiempoLabelPaso)?.value ?? null,
        };
        if (paso["momento"]) out["momento"] = paso["momento"];
        if (paso["truco"]) out["puntoClave"] = paso["truco"];
        if (paso["riesgo"]) out["errorComun"] = paso["riesgo"];
        if (paso["notas"]) out["notas"] = paso["notas"];
        return out;
      }),
    };

    // Campos opcionales de receta
    if (r["climaDelPlato"]) data["climaDelPlato"] = r["climaDelPlato"];
    if (r["hidratoOpcional"]) data["hidratoOpcional"] = r["hidratoOpcional"];
    if (r["acompPadres"]) data["acompPadres"] = r["acompPadres"];
    if (r["porQueEsEspecial"] ?? r["porQueEspecial"]) data["porQueEspecial"] = r["porQueEsEspecial"] ?? r["porQueEspecial"];
    if (r["riesgos"]) data["riesgos"] = r["riesgos"];
    if (r["notas"]) data["notas"] = r["notas"];
    if (r["notasNoche"] ?? r["notasNocheDeADos"]) data["notasNocheDeADos"] = r["notasNoche"] ?? r["notasNocheDeADos"];
    if (r["fuente"]) data["fuente"] = r["fuente"];

    return { id: r["idReceta"] as string, data };
  });

  await batchWrite("recetas", recetasItems);
  console.log(`  ✓ ${recetasItems.length} recetas`);

  // ── Load menús ────────────────────────────────────────────────────────────────
  console.log("\n4. Cargando menús...");
  const rawMenus = readJson("menus.json") as Record<string, unknown>[];
  const menusItems = rawMenus.map((m) => ({
    id: m["idMenu"] as string,
    data: {
      idMenu: m["idMenu"],
      nombreMenu: m["nombreMenu"],
      nombreCanonico: normalizeText(String(m["nombreMenu"] ?? "")),
      estado: m["estado"] ?? "Para probar",
      componentes: m["componentes"] ?? [],
      ...(m["estilo"] ? { estilo: m["estilo"] } : {}),
      ...(m["escenarioUso"] ? { escenarioUso: m["escenarioUso"] } : {}),
      ...(m["climaDelMenu"] ? { climaDelMenu: m["climaDelMenu"] } : {}),
      ...(m["idealPara"] ? { idealPara: m["idealPara"] } : {}),
      ...(m["descripcion"] ? { descripcion: m["descripcion"] } : {}),
      ...(m["aptoNocheDeADos"] ? { aptoNocheDeADos: m["aptoNocheDeADos"] } : {}),
      ...(m["notas"] ? { notas: m["notas"] } : {}),
      ...(m["notasOcasion"] ? { notasOcasion: m["notasOcasion"] } : {}),
    } as Record<string, unknown>,
  }));
  await batchWrite("menus", menusItems);
  console.log(`  ✓ ${menusItems.length} menús`);

  // ── Verificación ──────────────────────────────────────────────────────────────
  if (!DRY_RUN) {
    console.log("\n5. Verificación...");
    const [ingSnap, recSnap, menuSnap] = await Promise.all([
      db.collection("ingredientes").get(),
      db.collection("recetas").get(),
      db.collection("menus").get(),
    ]);
    console.log(`  ingredientes: ${ingSnap.size} (esperado ${ingredientesItems.length})`);
    console.log(`  recetas:      ${recSnap.size} (esperado ${recetasItems.length})`);
    console.log(`  menús:        ${menuSnap.size} (esperado ${menusItems.length})`);

    if (ingSnap.size !== ingredientesItems.length ||
        recSnap.size !== recetasItems.length ||
        menuSnap.size !== menusItems.length) {
      console.error("  ⚠ Los conteos no coinciden — revisar manualmente.");
    } else {
      console.log("  ✓ Conteos correctos.");
    }
  }

  console.log(DRY_RUN ? "\n🔵 Dry run completo. No se escribió nada." : "\n✅ Reseed completo.");
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });
