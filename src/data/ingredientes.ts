import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, arrayUnion, serverTimestamp, query, where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Ingrediente } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";
import { normalizeText } from "../lib/canonical";

let cachedCatalog: Map<string, Ingrediente> | null = null;

export async function getCatalogo(): Promise<Map<string, Ingrediente>> {
  if (cachedCatalog) return cachedCatalog;
  const snap = await getDocs(collection(db, "ingredientes"));
  cachedCatalog = new Map(snap.docs.map((d) => [d.id, d.data() as Ingrediente]));
  return cachedCatalog;
}

export async function getIngrediente(id: string): Promise<Ingrediente | null> {
  const snap = await getDoc(doc(db, "ingredientes", id));
  return snap.exists() ? (snap.data() as Ingrediente) : null;
}

export function invalidateCatalogCache(): void {
  cachedCatalog = null;
}

export async function proximoIdIngrediente(): Promise<string> {
  const snap = await getDocs(collection(db, "ingredientes"));
  const nums = snap.docs
    .map(d => d.id)
    .filter(id => /^ING-\d{4}$/.test(id))
    .map(id => parseInt(id.slice(4), 10));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `ING-${String(max + 1).padStart(4, "0")}`;
}

// Pure function — builds the doc shape for a new ingredient created via the importer.
// Exported for testing; any change to the schema must be reflected in the test.
export function buildNuevoIngredienteDoc(opts: {
  id: string;
  nombre: string;
  canon: string;
  texNorm: string;
  categoria: string;
  unidadNorm: string | null;
}): Omit<Ingrediente, "fechaCreacion" | "ultimaModificacion" | "vecesUsado"> {
  return {
    idIngrediente: opts.id,
    canonico: opts.canon,
    nombrePreferido: opts.nombre,
    sinonimos: opts.canon !== opts.texNorm && opts.texNorm ? [opts.texNorm] : [],
    categoria: opts.categoria,
    rolNutricional: [],
    seccionGondola: "Despensa / otros",
    unidadesHabituales: opts.unidadNorm ? [opts.unidadNorm] : [],
    ambiguo: true,
    origen: "import",
  };
}

export async function crearIngrediente(
  ing: Omit<Ingrediente, "fechaCreacion" | "ultimaModificacion" | "vecesUsado">
): Promise<Result<Ingrediente, AppError>> {
  try {
    const ref = doc(db, "ingredientes", ing.idIngrediente);
    const docData = {
      ...ing,
      vecesUsado: 0,
      fechaCreacion: serverTimestamp(),
      ultimaModificacion: serverTimestamp(),
    } as unknown as Ingrediente;
    await setDoc(ref, docData);
    invalidateCatalogCache();
    return ok(docData);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo crear el ingrediente.";
    return err("ingrediente-create-failed", msg, e);
  }
}

export async function getIngredientesAmbiguos(): Promise<Result<Ingrediente[], AppError>> {
  try {
    const snap = await getDocs(query(collection(db, "ingredientes"), where("ambiguo", "==", true)));
    return ok(snap.docs.map((d) => d.data() as Ingrediente));
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo cargar el catálogo.";
    return err("ingredientes-load-failed", msg, e);
  }
}

export async function actualizarIngrediente(
  idIngrediente: string,
  cambios: Partial<Pick<Ingrediente, "categoria" | "rolNutricional" | "seccionGondola" | "ambiguo">>
): Promise<Result<void, AppError>> {
  try {
    await updateDoc(doc(db, "ingredientes", idIngrediente), {
      ...cambios,
      ultimaModificacion: serverTimestamp(),
    });
    invalidateCatalogCache();
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo actualizar el ingrediente.";
    return err("ingrediente-update-failed", msg, e);
  }
}

export async function agregarSinonimo(
  idIngrediente: string,
  sinonimo: string
): Promise<Result<void, AppError>> {
  try {
    const norm = normalizeText(sinonimo);
    if (!norm) return ok(undefined);
    await updateDoc(doc(db, "ingredientes", idIngrediente), {
      sinonimos: arrayUnion(norm),
      ultimaModificacion: serverTimestamp(),
    });
    invalidateCatalogCache();
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo agregar el sinónimo.";
    return err("sinonimo-add-failed", msg, e);
  }
}
