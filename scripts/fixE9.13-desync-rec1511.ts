/**
 * E9.13 — Fix desync idIngrediente en REC-1511 (Cochinita pibil argentina).
 *
 * Fase 1: Agregar 6 ingredientes faltantes al catálogo de Firestore.
 * Fase 2: Re-apuntar los 15 refs erróneas de REC-1511 a los IDs correctos.
 *
 * Decisiones sobre "parciales" (D3 de E9.12):
 *   "Jugo de lima"           → ING-0307 "lima"         (jugo se expresa como prep)
 *   "Jugo de pomelo blanco"  → ING-0234 "pomelo"       (ídem)
 *   "Porotos negros cocidos" → ING-0263 "poroto negro"  (cocidos = estado de prep)
 *   "Manteca de cerdo"       → NUEVO (distinta de ING-0254 "manteca" que es butter)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(
  readFileSync(resolve("scripts/service-account.json"), "utf-8"),
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const pad = (n: number) => String(n).padStart(4, "0");

async function maxIngNum(): Promise<number> {
  const snap = await db.collection("ingredientes").get();
  let max = 0;
  snap.forEach(d => {
    const m = d.id.match(/^ING-(\d{4})$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max;
}

// ── Ingredientes a crear (si no existen ya por canonico) ─────────────────────
const NUEVOS_ING = [
  {
    canonico: "costillitas de cerdo",
    nombrePreferido: "Costillitas de cerdo",
    categoria: "Carne",
    seccionGondola: "Carniceria",
    rolNutricional: ["Proteina"],
    sinonimos: ["costillitas", "costillas de cerdo"],
  },
  {
    canonico: "vinagre blanco",
    nombrePreferido: "Vinagre blanco",
    categoria: "Condimento",
    seccionGondola: "Almacen / secos",
    rolNutricional: [],
    sinonimos: [],
  },
  {
    canonico: "aji putapario",
    nombrePreferido: "Ají putaparió",
    categoria: "Verdura",
    seccionGondola: "Verduleria",
    rolNutricional: [],
    sinonimos: ["aji putapario", "putapario"],
  },
  {
    canonico: "manteca de cerdo",
    nombrePreferido: "Manteca de cerdo",
    categoria: "Aceite y grasa",
    seccionGondola: "Almacen / secos",
    rolNutricional: ["Grasa"],
    sinonimos: ["grasa de cerdo", "lard"],
  },
  {
    canonico: "guantes de latex",
    nombrePreferido: "Guantes de látex",
    categoria: "Utensilio",
    seccionGondola: "Bazar / otros",
    rolNutricional: [],
    sinonimos: [],
  },
  {
    canonico: "bolsa hermetica grande",
    nombrePreferido: "Bolsa hermética grande",
    categoria: "Utensilio",
    seccionGondola: "Despensa / otros",
    rolNutricional: [],
    sinonimos: [],
  },
];

// ── Mapa de fix: idIngrediente viejo → nuevo (post-creación de NUEVOS) ────────
// Los IDs nuevos se resuelven dinámicamente tras la Fase 1.
// Los estáticos (ya existen en catálogo) se declaran aquí:
const STATIC_FIX_MAP: Record<string, string> = {
  "ING-0192": "ING-0268", // "Pasta de achiote"  → pasta de achiote (ya existe)
  "ING-0193": "ING-0307", // "Jugo de lima"       → lima
  "ING-0194": "ING-0234", // "Jugo de pomelo bl." → pomelo
  "ING-0197": "ING-0263", // "Porotos negros coc" → poroto negro
  "ING-0199": "ING-0307", // "Lima"               → lima
  "ING-0200": "ING-0283", // "Papel manteca"      → papel manteca (ya existe)
  "ING-0187": "ING-0269", // "Papel aluminio"     → papel aluminio (ya existe)
  "ING-0186": "ING-0282", // "Hilo de cocina"     → hilo de cocina (ya existe)
  "ING-0188": "ING-0270", // "Papel de cocina"    → papel de cocina (ya existe)
};

// canonico → oldId de los 6 nuevos (dinámico)
const DYNAMIC_CANON_TO_OLD: Record<string, string> = {
  "costillitas de cerdo":  "ING-0191",
  "vinagre blanco":        "ING-0195",
  "aji putapario":         "ING-0196",
  "manteca de cerdo":      "ING-0198",
  "guantes de latex":      "ING-0201",
  "bolsa hermetica grande": "ING-0202",
};

async function main() {
  // ── Backup ───────────────────────────────────────────────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupDir = resolve("scripts/backups");
  mkdirSync(backupDir, { recursive: true });

  const [ingSnap, recSnap] = await Promise.all([
    db.collection("ingredientes").get(),
    db.collection("recetas").get(),
  ]);
  writeFileSync(
    resolve(backupDir, `E9.13_ingredientes_${ts}.json`),
    JSON.stringify(ingSnap.docs.map(d => d.data()), null, 2),
  );
  writeFileSync(
    resolve(backupDir, `E9.13_recetas_${ts}.json`),
    JSON.stringify(recSnap.docs.map(d => d.data()), null, 2),
  );
  console.log(`Backup guardado (${ts})`);

  // canonico → id (catálogo vivo)
  const idByCanon = new Map<string, string>();
  ingSnap.forEach(d => {
    const x = d.data();
    idByCanon.set(x.canonico, x.idIngrediente ?? d.id);
  });

  // ── FASE 1: agregar ingredientes faltantes ───────────────────────────────
  console.log("\n── FASE 1: Ingredientes nuevos ─────────────────────────────");
  let nextId = (await maxIngNum()) + 1;
  const fixMap = { ...STATIC_FIX_MAP };

  for (const def of NUEVOS_ING) {
    const oldId = DYNAMIC_CANON_TO_OLD[def.canonico];
    if (idByCanon.has(def.canonico)) {
      const existId = idByCanon.get(def.canonico)!;
      console.log(`  = (existe) ${existId}  ${def.canonico}`);
      fixMap[oldId] = existId;
      continue;
    }
    const newId = `ING-${pad(nextId++)}`;
    await db.collection("ingredientes").doc(newId).set({
      idIngrediente: newId,
      canonico: def.canonico,
      nombrePreferido: def.nombrePreferido,
      sinonimos: def.sinonimos,
      categoria: def.categoria,
      rolNutricional: def.rolNutricional,
      seccionGondola: def.seccionGondola,
      vecesUsado: 0,
      fechaCreacion: FieldValue.serverTimestamp(),
      ultimaModificacion: FieldValue.serverTimestamp(),
    });
    fixMap[oldId] = newId;
    console.log(`  + ${newId}  ${def.nombrePreferido}  (reemplaza ${oldId})`);
  }

  // ── FASE 2: corregir ingredientes de REC-1511 ────────────────────────────
  console.log("\n── FASE 2: Actualizar REC-1511 ─────────────────────────────");
  const recDoc = await db.collection("recetas").doc("REC-1511").get();
  if (!recDoc.exists) {
    console.error("ERROR: REC-1511 no encontrada en Firestore.");
    process.exit(1);
  }

  const recData = recDoc.data()!;
  let changed = 0;

  const newIngredientes = (recData.ingredientes as any[]).map((ref: any) => {
    const nuevoId = fixMap[ref.idIngrediente];
    if (nuevoId) {
      console.log(`  FIX  "${ref.textoOriginal}"  ${ref.idIngrediente} → ${nuevoId}`);
      changed++;
      return { ...ref, idIngrediente: nuevoId };
    }
    return ref;
  });

  if (changed === 0) {
    console.log("  (ningún ref a corregir — idempotente, ya estaba correcto)");
  } else {
    await db.collection("recetas").doc("REC-1511").update({
      ingredientes: newIngredientes,
      ultimaModificacion: FieldValue.serverTimestamp(),
    });
    console.log(`\n  ✓ REC-1511 actualizada: ${changed} refs corregidas.`);
  }

  // ── Verificación ─────────────────────────────────────────────────────────
  console.log("\n── Verificación post-fix ───────────────────────────────────");
  const ingSnapPost = await db.collection("ingredientes").get();
  const catPost = new Map<string, string>();
  ingSnapPost.forEach(d => {
    const x = d.data();
    catPost.set(x.idIngrediente ?? d.id, x.canonico);
  });

  const recPost = await db.collection("recetas").doc("REC-1511").get();
  const refsPost = (recPost.data()!.ingredientes as any[]);
  let errores = 0;
  for (const ref of refsPost) {
    const canon = catPost.get(ref.idIngrediente);
    if (!canon) {
      console.log(`  ✗ HUÉRFANO  "${ref.textoOriginal}"  ${ref.idIngrediente}`);
      errores++;
    } else {
      console.log(`  ✓  "${ref.textoOriginal}"  →  ${ref.idIngrediente}  "${canon}"`);
    }
  }

  console.log(`\nFin E9.13 — ${changed} refs corregidas, ${errores} errores.`);
}

main().catch(e => { console.error(e); process.exit(1); });
