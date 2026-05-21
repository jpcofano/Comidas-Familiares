import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { ListaCompras, ItemCompra, Plan, Receta } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";
import { agruparPorClaveCanonica } from "../lib/compras";

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getListaActiva(semanaInicio: string): Promise<ListaCompras | null> {
  const q = query(collection(db, "compras"), where("semanaInicio", "==", semanaInicio));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as ListaCompras;
}

export async function getItemsLista(idLista: string): Promise<ItemCompra[]> {
  const snap = await getDocs(collection(db, "compras", idLista, "items"));
  return snap.docs.map((d) => d.data() as ItemCompra);
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function subscribeToItemsLista(
  idLista: string,
  callback: (items: ItemCompra[]) => void
): () => void {
  return onSnapshot(collection(db, "compras", idLista, "items"), (snap) => {
    callback(snap.docs.map((d) => d.data() as ItemCompra));
  });
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function crearLista(semanaInicio: string): Promise<Result<ListaCompras, AppError>> {
  try {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const idLista = `LST-SEM-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const docData: ListaCompras = {
      idLista,
      semanaInicio,
      fechaGeneracion: serverTimestamp() as unknown as ListaCompras["fechaGeneracion"],
      totalItems: 0,
      totalYaTengo: 0,
    };

    await setDoc(doc(db, "compras", idLista), docData);
    return ok(docData);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo crear la lista.";
    return err("lista-create-failed", msg, e);
  }
}

export async function sincronizarListaSemana(
  semanaInicio: string,
  planes: Plan[],
  recetas: Map<string, Receta>
): Promise<Result<void, AppError>> {
  try {
    let lista = await getListaActiva(semanaInicio);
    if (!lista) {
      const r = await crearLista(semanaInicio);
      if (!r.ok) return r;
      lista = r.value;
    }

    const idLista = lista.idLista;
    const itemsAnteriores = await getItemsLista(idLista);

    const planesConReceta = planes.flatMap((plan) => {
      const receta = recetas.get(plan.idSeleccion);
      if (!receta) return [];
      return [{ plan, receta }];
    });

    const nuevosItems = agruparPorClaveCanonica(planesConReceta, itemsAnteriores);

    // Reemplazar subcollection items con batch
    const batch = writeBatch(db);

    for (const old of itemsAnteriores) {
      batch.delete(doc(db, "compras", idLista, "items", old.id));
    }

    for (const item of nuevosItems) {
      const ref = doc(collection(db, "compras", idLista, "items"));
      batch.set(ref, { ...item, id: ref.id });
    }

    const totalItems = nuevosItems.length;
    const totalYaTengo = nuevosItems.filter((i) => i.yaTengo).length;
    batch.update(doc(db, "compras", idLista), {
      totalItems,
      totalYaTengo,
      totalPendientes: totalItems - totalYaTengo,
    });

    await batch.commit();
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo sincronizar la lista.";
    return err("lista-sync-failed", msg, e);
  }
}

export async function toggleYaTengo(
  idLista: string,
  itemId: string,
  yaTengo: boolean
): Promise<Result<void, AppError>> {
  try {
    await updateDoc(doc(db, "compras", idLista, "items", itemId), { yaTengo });
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo actualizar el item.";
    return err("item-toggle-failed", msg, e);
  }
}

export async function agregarItemManual(
  idLista: string,
  item: Omit<ItemCompra, "id">
): Promise<Result<ItemCompra, AppError>> {
  try {
    const ref = await addDoc(collection(db, "compras", idLista, "items"), item);
    const created: ItemCompra = { ...item, id: ref.id };
    await updateDoc(ref, { id: ref.id });
    return ok(created);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo agregar el item.";
    return err("item-add-failed", msg, e);
  }
}

export async function eliminarItem(
  idLista: string,
  itemId: string
): Promise<Result<void, AppError>> {
  try {
    await deleteDoc(doc(db, "compras", idLista, "items", itemId));
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo eliminar el item.";
    return err("item-delete-failed", msg, e);
  }
}
