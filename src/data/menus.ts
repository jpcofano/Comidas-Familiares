import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Menu, MenuDerived, Receta } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";
import { normalizeText } from "../lib/canonical";
import { getRecetasByIds } from "./recetas";

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
