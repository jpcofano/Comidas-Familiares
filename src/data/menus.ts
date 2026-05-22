import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Menu, MenuDerived, Receta, ComponenteMenu, FirestoreTimestamp } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";
import { normalizeText } from "../lib/canonical";
import { getReceta, getRecetasByIds, buscarRecetasPorNombre } from "./recetas";
import type { ParsedMenu } from "../import/parseMenu";

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getMenus(): Promise<Menu[]> {
  const snap = await getDocs(collection(db, "menus"));
  return snap.docs.map((d) => d.data() as Menu);
}

export async function getMenu(idMenu: string): Promise<Menu | null> {
  const snap = await getDoc(doc(db, "menus", idMenu));
  return snap.exists() ? (snap.data() as Menu) : null;
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function crearMenu(menu: Menu): Promise<Result<Menu, AppError>> {
  try {
    const ref = doc(db, "menus", menu.idMenu);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      return err("menu-already-exists", `Ya existe un menú con ID "${menu.idMenu}".`);
    }

    const docData: Menu = { ...menu, nombreCanonico: normalizeText(menu.nombreMenu) };
    await setDoc(ref, docData);
    return ok(docData);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo crear el menú.";
    return err("menu-create-failed", msg, e);
  }
}

export async function actualizarMenu(
  idMenu: string,
  updates: Partial<Menu>
): Promise<Result<void, AppError>> {
  try {
    const patched: Partial<Menu> = { ...updates };
    if (updates.nombreMenu) {
      patched.nombreCanonico = normalizeText(updates.nombreMenu);
    }
    await updateDoc(doc(db, "menus", idMenu), patched as Record<string, unknown>);
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo actualizar el menú.";
    return err("menu-update-failed", msg, e);
  }
}

export async function eliminarMenu(idMenu: string): Promise<Result<void, AppError>> {
  try {
    await deleteDoc(doc(db, "menus", idMenu));
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo eliminar el menú.";
    return err("menu-delete-failed", msg, e);
  }
}

// ─── Importador de menús ─────────────────────────────────────────────────────

export async function getMenuByNombreCanonigo(nombreCanonico: string): Promise<Menu | null> {
  const q = query(collection(db, "menus"), where("nombreCanonico", "==", nombreCanonico));
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as Menu);
}

export async function getProximoMenuId(): Promise<string> {
  const snap = await getDocs(collection(db, "menus"));
  const nums = snap.docs
    .map(d => d.id)
    .filter(id => /^MENU-\d{4}$/.test(id))
    .map(id => parseInt(id.slice(5), 10));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `MENU-${String(max + 1).padStart(4, "0")}`;
}

export async function resolverEImportarMenu(
  parsed: ParsedMenu
): Promise<Result<Menu, AppError>> {
  // 1. Resolve componentes against /recetas
  const resolved: ComponenteMenu[] = [];
  const resErrors: string[] = [];

  for (const comp of parsed.componentes) {
    const raw = comp.idRecetaONombre;
    let receta: Receta | null = null;

    if (raw.includes("/")) {
      // Cross-check: "REC-XXXX / nombre" — both must point to the same receta
      const slashIdx = raw.indexOf("/");
      const idPart    = raw.slice(0, slashIdx).trim();
      const namePart  = raw.slice(slashIdx + 1).trim();
      receta = await getReceta(idPart);
      if (!receta) {
        resErrors.push(`Componente "${raw}": receta "${idPart}" no encontrada. Importar primero la receta.`);
        continue;
      }
      if (receta.nombreCanonico !== normalizeText(namePart)) {
        resErrors.push(`Componente "${raw}": el ID y el nombre no coinciden (ID apunta a "${receta.nombre}").`);
        continue;
      }
    } else if (/^REC-/i.test(raw)) {
      receta = await getReceta(raw);
      if (!receta) {
        resErrors.push(`Componente "${raw}" no encontrado. Importar primero la receta.`);
        continue;
      }
    } else {
      const matches = await buscarRecetasPorNombre(raw);
      if (matches.length === 0) {
        resErrors.push(`Componente "${raw}" no encontrado. Importar primero la receta.`);
        continue;
      }
      if (matches.length > 1) {
        resErrors.push(`Componente "${raw}" ambiguo: ${matches.length} recetas coinciden.`);
        continue;
      }
      receta = matches[0];
    }

    resolved.push({
      orden: comp.orden,
      tipo: comp.tipo,
      idReceta: receta.idReceta,
      obligatorio: comp.obligatorio,
      ...(comp.notas ? { notas: comp.notas } : {}),
    });
  }

  if (resErrors.length > 0) {
    return err("menu-resolution-failed", resErrors.join("\n"), resErrors);
  }

  // 2. Anti-duplicado por nombreCanonico
  const duplicate = await getMenuByNombreCanonigo(parsed.nombreCanonico);
  if (duplicate) {
    return err(
      "menu-duplicate",
      `Ya existe un menú con este nombre (${duplicate.idMenu}: "${duplicate.nombreMenu}").`,
      { idMenu: duplicate.idMenu, nombreCanonico: duplicate.nombreCanonico }
    );
  }

  // 3. Generar próximo idMenu
  const idMenu = await getProximoMenuId();

  // 4. Armar y persistir el menú (Modelo M — sin campos derivados)
  const menu: Menu = {
    idMenu,
    nombreMenu: parsed.nombre,
    nombreCanonico: parsed.nombreCanonico,
    estado: parsed.estado,
    escenarioUso: parsed.escenarioUso,
    componentes: resolved,
    fechaCreacion: serverTimestamp() as unknown as FirestoreTimestamp,
    ...(parsed.descripcion      ? { descripcion: parsed.descripcion }         : {}),
    ...(parsed.climaDelMenu     ? { climaDelMenu: parsed.climaDelMenu }       : {}),
    ...(parsed.idealPara        ? { idealPara: parsed.idealPara }             : {}),
    ...(parsed.estilo           ? { estilo: parsed.estilo }                   : {}),
    ...(parsed.aptoNocheDeADos  ? { aptoNocheDeADos: parsed.aptoNocheDeADos }: {}),
    ...(parsed.hidratoOpcional  ? { hidratoOpcional: parsed.hidratoOpcional } : {}),
    ...(parsed.paraJuanPablo    ? { paraJuanPablo: parsed.paraJuanPablo }     : {}),
    ...(parsed.paraFamilia      ? { paraFamilia: parsed.paraFamilia }         : {}),
    ...(parsed.riesgos          ? { riesgos: parsed.riesgos }                 : {}),
    ...(parsed.notas            ? { notas: parsed.notas }                     : {}),
    ...(parsed.notasOcasion     ? { notasOcasion: parsed.notasOcasion }       : {}),
  };

  return crearMenu(menu);
}

// ─── Derivados (§3.8) ─────────────────────────────────────────────────────────

export async function deriveMenuMetadata(menu: Menu): Promise<MenuDerived> {
  const obligatorios = menu.componentes.filter((c) => c.obligatorio);
  const ids = obligatorios.map((c) => c.idReceta);
  const recetas = await getRecetasByIds(ids);
  return computeMenuDerived(recetas);
}

// Pure helper — exported for testing
export function computeMenuDerived(recetas: Receta[]): MenuDerived {
  return {
    tiempoActivoMin: sumarTiempoActivo(recetas),
    tiempoTotalMin: calcularTiempoTotal(recetas),
    dificultadOrden: maxOrDefault(recetas.map((r) => r.dificultadOrden), 1),
    sinLacteos: recetas.length > 0 ? recetas.every((r) => r.sinLacteos) : true,
    hidratos: recetas.some((r) => r.hidratos),
    porcionesMin: minOrDefault(recetas.map((r) => r.porcionesMin ?? 1), 1),
    porcionesMax: minOrDefault(recetas.map((r) => r.porcionesMax ?? 1), 1),
    costoOrden: maxOrDefault(recetas.map((r) => r.costoOrden), 1),
  };
}

function sumarTiempoActivo(recetas: Receta[]): number {
  return recetas.reduce((sum, r) => sum + (r.tiempoActivoMin ?? 0), 0);
}

function calcularTiempoTotal(recetas: Receta[]): number {
  if (recetas.length === 0) return 0;
  // §3.8: max(tiempoTotalMin) de los componentes + suma de tiempoActivoMin de los demás.
  // Asume cocciones pasivas solapadas, activas en secuencia.
  const totales = recetas.map((r) => r.tiempoTotalMin ?? 0);
  const maxTotal = Math.max(...totales);
  const idxMaxTotal = totales.indexOf(maxTotal);
  const activosDelResto = recetas
    .filter((_, i) => i !== idxMaxTotal)
    .reduce((sum, r) => sum + (r.tiempoActivoMin ?? 0), 0);
  return maxTotal + activosDelResto;
}

function maxOrDefault(nums: number[], def: number): number {
  return nums.length === 0 ? def : Math.max(...nums);
}

function minOrDefault(nums: number[], def: number): number {
  return nums.length === 0 ? def : Math.min(...nums);
}
