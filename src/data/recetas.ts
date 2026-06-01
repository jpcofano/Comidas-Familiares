import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Receta } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";
import { normalizeText } from "../lib/canonical";

// ─── Reads ────────────────────────────────────────────────────────────────────

let cachedRecetas: Receta[] | null = null;

export async function getRecetas(): Promise<Receta[]> {
  if (cachedRecetas) return cachedRecetas;
  const q = query(collection(db, "recetas"), orderBy("nombre"));
  const snap = await getDocs(q);
  cachedRecetas = snap.docs.map((d) => d.data() as Receta);
  return cachedRecetas;
}

export async function getReceta(idReceta: string): Promise<Receta | null> {
  const snap = await getDoc(doc(db, "recetas", idReceta));
  return snap.exists() ? (snap.data() as Receta) : null;
}

// Retorna todas las recetas para el owner; para otros miembros filtra por visibilidad.
// El filtrado es sobre getRecetas() cacheado — sin query extra a Firestore.
export async function getRecetasParaMiembro(memberId: string): Promise<Receta[]> {
  if (memberId === "juanpablo") return getRecetas();
  const { getVisibilidad } = await import("./visibilidad");
  const [todas, visibilidad] = await Promise.all([getRecetas(), getVisibilidad()]);
  const visibles = new Set((visibilidad as unknown as Record<string, string[]>)[memberId] ?? []);
  return todas.filter(r => visibles.has(r.idReceta));
}

export async function getRecetasByIds(ids: string[]): Promise<Receta[]> {
  if (ids.length === 0) return [];
  const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, "recetas", id))));
  return snaps.filter((s) => s.exists()).map((s) => s.data() as Receta);
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function crearReceta(
  receta: Omit<Receta, "fechaImportacion" | "vecesCocinada">
): Promise<Result<Receta, AppError>> {
  try {
    const ref = doc(db, "recetas", receta.idReceta);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      return err("recipe-already-exists", `Ya existe una receta con ID "${receta.idReceta}".`);
    }

    const nombreCanonico = normalizeText(receta.nombre);
    const docData: Receta = {
      ...receta,
      nombreCanonico,
      vecesCocinada: 0,
      fechaImportacion: serverTimestamp() as unknown as string,
    };

    await setDoc(ref, docData);
    return ok(docData);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo crear la receta.";
    return err("recipe-create-failed", msg, e);
  }
}

export async function actualizarReceta(
  idReceta: string,
  updates: Partial<Receta>
): Promise<Result<void, AppError>> {
  try {
    const patched: Partial<Receta> = { ...updates };
    if (updates.nombre) {
      patched.nombreCanonico = normalizeText(updates.nombre);
    }
    await updateDoc(doc(db, "recetas", idReceta), patched as Record<string, unknown>);
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo actualizar la receta.";
    return err("recipe-update-failed", msg, e);
  }
}

export async function eliminarReceta(idReceta: string): Promise<Result<void, AppError>> {
  try {
    await deleteDoc(doc(db, "recetas", idReceta));
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo eliminar la receta.";
    return err("recipe-delete-failed", msg, e);
  }
}

export async function buscarRecetasPorNombre(nombre: string): Promise<Receta[]> {
  const nc = normalizeText(nombre);
  const snap = await getDocs(collection(db, "recetas"));
  return snap.docs.map(d => d.data() as Receta).filter(r => r.nombreCanonico === nc);
}

export async function proximoIdReceta(): Promise<string> {
  const snap = await getDocs(collection(db, "recetas"));
  const nums = snap.docs
    .map(d => d.id)
    .filter(id => /^REC-\d{4}$/.test(id))
    .map(id => parseInt(id.slice(4), 10));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `REC-${String(max + 1).padStart(4, "0")}`;
}
