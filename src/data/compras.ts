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
  increment,
} from "firebase/firestore";
import { db } from "../firebase";
import type { ListaCompras, ItemCompra, AporteCompra, Ingrediente, Plan, Receta, Menu } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";
import { getCatalogo } from "./ingredientes";

const ESTADOS_CONTRIBUYENTES = ["Elegida", "Compra pendiente", "Compra lista"] as const;

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getListaById(idLista: string): Promise<ListaCompras | null> {
  const snap = await getDoc(doc(db, "compras", idLista));
  return snap.exists() ? (snap.data() as ListaCompras) : null;
}

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

// ─── Agrupación de ingredientes por catálogo ──────────────────────────────────

function agruparPorIdIngrediente(
  planesConReceta: Array<{ plan: Plan; receta: Receta }>,
  itemsAnteriores: ItemCompra[],
  catalogo: Map<string, Ingrediente>
): ItemCompra[] {
  const acc = new Map<string, ItemCompra>();

  for (const { plan, receta } of planesConReceta) {
    for (const ing of receta.ingredientes) {
      const unidad = ing.unidad ?? "";
      const clave = `${ing.idIngrediente}|${unidad}`;
      const cat = catalogo.get(ing.idIngrediente);
      if (!cat) continue;

      const cantidadNum = typeof ing.cantidad === "number" ? ing.cantidad : 0;

      const aporte: AporteCompra = {
        idPlan: plan.idPlan,
        idReceta: receta.idReceta,
        nombreReceta: receta.nombre,
        textoOriginal: ing.textoOriginal,
        tipoAporte: "receta",
        cantidad: cantidadNum,
        unidad,
      };

      if (acc.has(clave)) {
        const item = acc.get(clave)!;
        item.cantidadTotal += cantidadNum;
        item.aportes.push(aporte);
        if (ing.notas) item.notas = item.notas ? `${item.notas} | ${ing.notas}` : ing.notas;
        if (ing.opcional === false) item.opcional = false;
      } else {
        acc.set(clave, {
          id: "",
          idIngrediente: ing.idIngrediente,
          nombrePreferido: cat.nombrePreferido,
          categoria: ing.categoriaOverride || cat.categoria,
          cantidadTotal: cantidadNum,
          cantidadLabel: "",
          unidad,
          opcional: ing.opcional !== false,
          yaTengo: false,
          aportes: [aporte],
          notas: ing.notas ?? "",
        });
      }
    }
  }

  // Preservar yaTengo desde sincronización anterior
  for (const old of itemsAnteriores) {
    for (const it of acc.values()) {
      if (it.idIngrediente === old.idIngrediente && it.unidad === old.unidad) {
        it.yaTengo = old.yaTengo;
        break;
      }
    }
  }

  // Componer cantidadLabel
  for (const it of acc.values()) {
    it.cantidadLabel = it.cantidadTotal > 0
      ? `${it.cantidadTotal} ${it.unidad}`.trim()
      : "a gusto";
  }

  return [...acc.values()];
}

// ─── Batch helpers ────────────────────────────────────────────────────────────

function commitItemsBatch(
  batch: ReturnType<typeof writeBatch>,
  idLista: string,
  itemsAnteriores: ItemCompra[],
  nuevosItems: ItemCompra[],
  missingItems: string[] = []
): void {
  for (const old of itemsAnteriores) {
    batch.delete(doc(db, "compras", idLista, "items", old.id));
  }
  for (const item of nuevosItems) {
    const ref = doc(collection(db, "compras", idLista, "items"));
    const { id: _discard, ...rest } = item;
    batch.set(ref, { ...rest, id: ref.id });
  }
  const totalItems = nuevosItems.length;
  const totalYaTengo = nuevosItems.filter((i) => i.yaTengo).length;
  batch.update(doc(db, "compras", idLista), {
    totalItems,
    totalYaTengo,
    totalPendientes: totalItems - totalYaTengo,
    missingItems,
  });
}

export async function sincronizarListaSemana(
  semanaInicio: string,
  planes: Plan[],
  recetas: Map<string, Receta>
): Promise<Result<void, AppError>> {
  try {
    const catalogo = await getCatalogo();

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

    const nuevosItems = agruparPorIdIngrediente(planesConReceta, itemsAnteriores, catalogo);

    const batch = writeBatch(db);
    commitItemsBatch(batch, idLista, itemsAnteriores, nuevosItems);
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

// Auto-sync sin importar planes.ts: consulta Firestore directamente para evitar
// dependencias circulares (planes.ts importa esta función).
// Resuelve componentes de menús y filtra Cocinada/Evaluada (§3.1.6, decisión 2).
export async function sincronizarListaDesdeFirestore(
  semanaInicio: string
): Promise<Result<void, AppError>> {
  try {
    const planesSnap = await getDocs(
      query(
        collection(db, "planes"),
        where("semanaInicio", "==", semanaInicio),
        where("estado", "in", [...ESTADOS_CONTRIBUYENTES])
      )
    );
    const planes = planesSnap.docs.map((d) => d.data() as Plan);

    // Recolectar todos los idReceta necesarios (directos + componentes de menú)
    const recetaIds = new Set<string>();
    const menuComponentes = new Map<string, string[]>(); // idPlan → [idReceta]
    const missingItems: string[] = [];

    for (const plan of planes) {
      if (plan.tipoSeleccion === "receta") {
        recetaIds.add(plan.idSeleccion);
      } else {
        const menuSnap = await getDoc(doc(db, "menus", plan.idSeleccion));
        if (menuSnap.exists()) {
          const menu = menuSnap.data() as Menu;
          const ids = menu.componentes.map((c) => c.idReceta);
          menuComponentes.set(plan.idPlan, ids);
          ids.forEach((id) => recetaIds.add(id));
        }
      }
    }

    const recetasSnaps = await Promise.all(
      [...recetaIds].map((id) => getDoc(doc(db, "recetas", id)))
    );
    const recetasMap = new Map<string, Receta>(
      recetasSnaps.filter((s) => s.exists()).map((s) => [s.id, s.data() as Receta])
    );

    // Expandir menús en sus componentes
    const planesConReceta: Array<{ plan: Plan; receta: Receta }> = [];
    for (const plan of planes) {
      if (plan.tipoSeleccion === "receta") {
        const receta = recetasMap.get(plan.idSeleccion);
        if (receta) planesConReceta.push({ plan, receta });
        else missingItems.push(plan.nombreSeleccion);
      } else {
        const comps = menuComponentes.get(plan.idPlan) ?? [];
        for (const cId of comps) {
          const receta = recetasMap.get(cId);
          if (receta) planesConReceta.push({ plan, receta });
          else missingItems.push(`${plan.nombreSeleccion} / componente ${cId}`);
        }
      }
    }

    // Obtener o crear lista
    let lista = await getListaActiva(semanaInicio);
    if (!lista) {
      const r = await crearLista(semanaInicio);
      if (!r.ok) return r;
      lista = r.value;
    }
    const idLista = lista.idLista;
    const itemsAnteriores = await getItemsLista(idLista);

    const catalogo = await getCatalogo();
    const nuevosItems = agruparPorIdIngrediente(planesConReceta, itemsAnteriores, catalogo);

    const batch = writeBatch(db);
    commitItemsBatch(batch, idLista, itemsAnteriores, nuevosItems, missingItems);

    for (const plan of planes) {
      const planRef = doc(db, "planes", plan.idPlan);
      const updates: Record<string, unknown> = {};
      if (plan.listaComprasId !== idLista) updates.listaComprasId = idLista;
      if (plan.estado === "Elegida") updates.estado = "Compra pendiente";
      if (Object.keys(updates).length > 0) batch.update(planRef, updates);
    }

    await batch.commit();
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo sincronizar la lista.";
    return err("lista-sync-auto-failed", msg, e);
  }
}

// Toggle yaTengo + actualiza resumen denormalizado del doc raíz (§2.5).
export async function toggleItemYaTengo(
  idLista: string,
  itemId: string,
  nuevoYaTengo: boolean
): Promise<Result<void, AppError>> {
  try {
    const delta = nuevoYaTengo ? 1 : -1;
    const batch = writeBatch(db);
    batch.update(doc(db, "compras", idLista, "items", itemId), { yaTengo: nuevoYaTengo });
    batch.update(doc(db, "compras", idLista), {
      totalYaTengo: increment(delta),
      totalPendientes: increment(-delta),
    });
    await batch.commit();
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo actualizar el ítem.";
    return err("item-toggle-failed", msg, e);
  }
}

// Sincroniza la lista Y avanza planes: Elegida→Compra pendiente + setea listaComprasId.
// Invariante §3.1.6 del MAPEO.
export async function sincronizarYAvanzarPlanes(
  semanaInicio: string,
  planes: Plan[],
  recetas: Map<string, Receta>
): Promise<Result<{ idLista: string }, AppError>> {
  try {
    const syncResult = await sincronizarListaSemana(semanaInicio, planes, recetas);
    if (!syncResult.ok) return syncResult as unknown as Result<{ idLista: string }, AppError>;

    const lista = await getListaActiva(semanaInicio);
    if (!lista) return err("lista-not-found", "Lista no encontrada después de sincronizar.");

    const batch = writeBatch(db);
    let hasUpdates = false;
    for (const plan of planes) {
      const planRef = doc(db, "planes", plan.idPlan);
      const updates: Record<string, unknown> = {};
      if (plan.listaComprasId !== lista.idLista) updates.listaComprasId = lista.idLista;
      if (plan.estado === "Elegida") updates.estado = "Compra pendiente";
      if (Object.keys(updates).length > 0) {
        batch.update(planRef, updates);
        hasUpdates = true;
      }
    }
    if (hasUpdates) await batch.commit();

    return ok({ idLista: lista.idLista });
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo sincronizar la lista.";
    return err("lista-sync-failed", msg, e);
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
