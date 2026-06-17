import { doc, setDoc, updateDoc, serverTimestamp, runTransaction, writeBatch, increment } from "firebase/firestore";
import { db } from "../firebase";
import type { Plan, Receta, MiembroId, ItemCompraRapida } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";
import { crearPlan } from "./planes";
import { getRecetas, invalidateRecetasCache, proximoIdReceta } from "./recetas";
import { getCatalogo } from "./ingredientes";
import { getSemanaActual, getSemanaFin } from "../lib/fechas";
import { normalizeText } from "../lib/canonical";

// ─── Plantilla ────────────────────────────────────────────────────────────────

export interface DatosPlantilla {
  destino: string;
  items: Array<{
    idIngrediente: string;
    nombre: string;
    cantidad: string;
    unidad: string;
    seccionGondola: string;
    habitual?: boolean;
  }>;
}

export async function crearPlantillaCompraRapida(
  datos: DatosPlantilla,
): Promise<Result<Receta, AppError>> {
  try {
    const idReceta = await proximoIdReceta();
    const nombre = `Compra rápida · ${datos.destino}`;
    const ingredientes = datos.items.map((it) => ({
      idIngrediente: it.idIngrediente,
      textoOriginal: it.nombre,
      cantidad: it.cantidad,
      unidad: it.unidad,
      seccion: it.seccionGondola,
      ...(it.habitual !== undefined && { habitual: it.habitual }),
    }));
    const docData: Receta = {
      idReceta,
      nombre,
      nombreCanonico: normalizeText(nombre),
      tipoItem: "Receta principal",
      proteinaPrincipal: "Vegetal",
      estilo: "",
      tecnicaPrincipal: "",
      escenarioUso: "Cocina rápida",
      pensadaPara: "Semana",
      sinLacteos: false,
      sinGluten: false,
      hidratos: false,
      aptoNocheDeADos: "No",
      paraJuanPablo: true,
      paraFamilia: true,
      tiempoActivoLabel: "",
      tiempoActivoMin: null,
      tiempoTotalLabel: "",
      tiempoTotalMin: null,
      dificultad: "Baja",
      dificultadOrden: 1,
      porcionesLabel: "",
      porcionesMin: null,
      porcionesMax: null,
      costoEstimado: "Bajo",
      costoOrden: 1,
      ingredientes,
      pasos: [],
      vecesCocinada: 0,
      esCompraRapida: true,
      destino: datos.destino,
      fechaImportacion: serverTimestamp() as unknown as string,
    };
    await setDoc(doc(db, "recetas", idReceta), docData);
    invalidateRecetasCache();
    return ok(docData);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo crear la plantilla.";
    return err("compra-rapida-create-failed", msg, e);
  }
}

export async function actualizarPlantillaCompraRapida(
  idReceta: string,
  datos: DatosPlantilla,
): Promise<Result<void, AppError>> {
  try {
    const nombre = `Compra rápida · ${datos.destino}`;
    const ingredientes = datos.items.map((it) => ({
      idIngrediente: it.idIngrediente,
      textoOriginal: it.nombre,
      cantidad: it.cantidad,
      unidad: it.unidad,
      seccion: it.seccionGondola,
      ...(it.habitual !== undefined && { habitual: it.habitual }),
    }));
    await updateDoc(doc(db, "recetas", idReceta), {
      nombre,
      nombreCanonico: normalizeText(nombre),
      destino: datos.destino,
      ingredientes,
      ultimaModificacion: serverTimestamp(),
    });
    invalidateRecetasCache();
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo actualizar la plantilla.";
    return err("compra-rapida-update-failed", msg, e);
  }
}

// ─── Instancia ────────────────────────────────────────────────────────────────

export async function generarInstanciaCompraRapida(
  plantilla: Receta,
  itemsSeleccionados: ItemCompraRapida[],
): Promise<Result<Plan, AppError>> {
  const semanaInicio = getSemanaActual();
  const semanaFin = getSemanaFin(semanaInicio);

  return crearPlan({
    idPlan: generarIdInstancia(),
    semanaInicio,
    semanaFin,
    tipoSeleccion: "compra-rapida",
    tipoPlan: "En proceso",
    idSeleccion: plantilla.idReceta,
    nombreSeleccion: plantilla.nombre,
    recetaPrincipal: plantilla.nombre,
    estado: "Compra pendiente",
    fechaPrevistaComida: null,
    cantidadPersonas: 1,
    listaComprasId: null,
    notas: "",
    origen: null,
    asignaciones: [],    // sin asignar — la ven los 4 por turno voluntario
    encargado: null,     // nadie la tomó todavía
    itemsCompraRapida: itemsSeleccionados,
  });
}

export async function tomarCompraRapida(
  idPlan: string,
  memberId: MiembroId,
): Promise<Result<void, AppError>> {
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "planes", idPlan);
      const snap = await tx.get(ref);
      const actual = snap.data()?.encargado ?? null;
      if (actual && actual !== memberId) throw new Error("ya-tomada");
      tx.update(ref, { encargado: memberId });
    });
    return ok(undefined);
  } catch (e) {
    if ((e as Error).message === "ya-tomada")
      return err("compra-ya-tomada", "Otra persona ya se encargó de esta compra.", e);
    return err("compra-tomar-failed", firebaseErrorMessage(e) ?? "No se pudo tomar la compra.", e);
  }
}

export async function liberarCompraRapida(idPlan: string): Promise<Result<void, AppError>> {
  try {
    await updateDoc(doc(db, "planes", idPlan), { encargado: null });
    return ok(undefined);
  } catch (e) {
    return err("compra-liberar-failed", firebaseErrorMessage(e) ?? "No se pudo liberar.", e);
  }
}

// ─── Persistir selección en la plantilla (modo C) ────────────────────────────

export async function guardarSeleccionPlantilla(
  idReceta: string,
  ultimaSeleccion: string[],
  modoPreferido: "sumar" | "destildar" | "siempre",
): Promise<Result<void, AppError>> {
  try {
    await updateDoc(doc(db, "recetas", idReceta), {
      ultimaSeleccion,
      modoPreferido,
      ultimaModificacion: serverTimestamp(),
    });
    invalidateRecetasCache();
    return ok(undefined);
  } catch (e) {
    return err(
      "compra-rapida-seleccion-failed",
      firebaseErrorMessage(e) ?? "No se pudo guardar la selección.",
      e,
    );
  }
}

// ─── Seed: 3 plantillas maestras ─────────────────────────────────────────────

type SeedItem = { nombre: string; cantidad: string; unidad: string };

const SEED_MAESTROS: Array<{ destino: string; items: SeedItem[] }> = [
  {
    destino: "Verdulería",
    items: [
      { nombre: "papa",        cantidad: "1",   unidad: "kg" },
      { nombre: "cebolla",     cantidad: "1",   unidad: "kg" },
      { nombre: "tomate",      cantidad: "0.5", unidad: "kg" },
      { nombre: "zanahoria",   cantidad: "0.5", unidad: "kg" },
      { nombre: "ajo",         cantidad: "1",   unidad: "cabeza" },
      { nombre: "limon",       cantidad: "4",   unidad: "u" },
      { nombre: "naranja",     cantidad: "1",   unidad: "kg" },
      { nombre: "lechuga",     cantidad: "1",   unidad: "u" },
      { nombre: "espinaca",    cantidad: "1",   unidad: "atado" },
      { nombre: "zapallo",     cantidad: "0.5", unidad: "kg" },
      { nombre: "batata",      cantidad: "0.5", unidad: "kg" },
      { nombre: "brocoli",     cantidad: "1",   unidad: "u" },
      { nombre: "banana",      cantidad: "1",   unidad: "kg" },
      { nombre: "manzana",     cantidad: "1",   unidad: "kg" },
      { nombre: "pepino",      cantidad: "1",   unidad: "u" },
      { nombre: "zapallito",   cantidad: "2",   unidad: "u" },
      { nombre: "choclo",      cantidad: "2",   unidad: "u" },
      { nombre: "morron",      cantidad: "1",   unidad: "u" },
      { nombre: "puerro",      cantidad: "1",   unidad: "u" },
      { nombre: "apio",        cantidad: "1",   unidad: "u" },
    ],
  },
  {
    destino: "Almacén",
    items: [
      { nombre: "aceite de girasol",  cantidad: "1",   unidad: "l" },
      { nombre: "sal",                cantidad: "1",   unidad: "kg" },
      { nombre: "harina",             cantidad: "1",   unidad: "kg" },
      { nombre: "arroz",              cantidad: "1",   unidad: "kg" },
      { nombre: "fideos",             cantidad: "1",   unidad: "kg" },
      { nombre: "tomate triturado",   cantidad: "2",   unidad: "lata" },
      { nombre: "leche",              cantidad: "2",   unidad: "l" },
      { nombre: "crema de leche",     cantidad: "1",   unidad: "u" },
      { nombre: "manteca",            cantidad: "200", unidad: "g" },
      { nombre: "queso rallado",      cantidad: "1",   unidad: "u" },
      { nombre: "caldo",              cantidad: "2",   unidad: "u" },
      { nombre: "azucar",             cantidad: "1",   unidad: "kg" },
      { nombre: "vinagre",            cantidad: "1",   unidad: "u" },
      { nombre: "aceite de oliva",    cantidad: "1",   unidad: "u" },
      { nombre: "pan",                cantidad: "1",   unidad: "u" },
      { nombre: "yerba",              cantidad: "1",   unidad: "kg" },
      { nombre: "cafe",               cantidad: "1",   unidad: "u" },
      { nombre: "mayonesa",           cantidad: "1",   unidad: "u" },
    ],
  },
  {
    destino: "Fiambre",
    items: [
      { nombre: "jamon cocido",       cantidad: "200", unidad: "g" },
      { nombre: "jamon crudo",        cantidad: "100", unidad: "g" },
      { nombre: "queso cremoso",      cantidad: "200", unidad: "g" },
      { nombre: "mozzarella",         cantidad: "250", unidad: "g" },
      { nombre: "queso gouda",        cantidad: "200", unidad: "g" },
      { nombre: "ricota",             cantidad: "250", unidad: "g" },
      { nombre: "yogur",              cantidad: "4",   unidad: "u" },
      { nombre: "salame",             cantidad: "100", unidad: "g" },
    ],
  },
];

export async function seedPlantillasMaestras(): Promise<Result<void, AppError>> {
  try {
    const [existentes, catalogo] = await Promise.all([
      getRecetas(),
      getCatalogo(),
    ]);

    const destinosExistentes = new Set(
      existentes.filter((r) => r.esCompraRapida).map((r) => r.destino),
    );

    for (const maestro of SEED_MAESTROS) {
      if (destinosExistentes.has(maestro.destino)) continue;

      const items: DatosPlantilla["items"] = [];
      for (const seed of maestro.items) {
        const nc = normalizeText(seed.nombre);
        const found = [...catalogo.values()].find(
          (ing) =>
            normalizeText(ing.nombrePreferido).includes(nc) ||
            (ing.sinonimos ?? []).some((s) => normalizeText(s).includes(nc)),
        );
        if (!found) continue;
        items.push({
          idIngrediente: found.idIngrediente,
          nombre: found.nombrePreferido,
          cantidad: seed.cantidad,
          unidad: found.unidadesHabituales?.[0] ?? seed.unidad,
          seccionGondola: found.seccionGondola,
          habitual: true,
        });
      }

      if (items.length === 0) continue;

      const r = await crearPlantillaCompraRapida({ destino: maestro.destino, items });
      if (!r.ok) return { ok: false, error: r.error };
    }

    return ok(undefined);
  } catch (e) {
    return err("seed-maestros-failed", firebaseErrorMessage(e) ?? "No se pudo hacer el seed.", e);
  }
}

// ─── Operaciones sobre la instancia ──────────────────────────────────────────

export async function toggleItemComprado(
  idPlan: string,
  idIngrediente: string,
  items: ItemCompraRapida[],
): Promise<Result<void, AppError>> {
  try {
    const updated = items.map((it) =>
      it.idIngrediente === idIngrediente ? { ...it, comprado: !it.comprado } : it,
    );
    await updateDoc(doc(db, "planes", idPlan), { itemsCompraRapida: updated });
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo actualizar el ítem.";
    return err("compra-rapida-toggle-failed", msg, e);
  }
}

export async function marcarCompraRapidaHecha(
  idPlan: string,
  completadaPor: MiembroId,
): Promise<Result<void, AppError>> {
  try {
    const mesKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const batch = writeBatch(db);
    batch.update(doc(db, "planes", idPlan), { estado: "Compra lista" });
    batch.set(
      doc(db, "config", "comprasContador"),
      { meses: { [mesKey]: { [completadaPor]: increment(1) } } },
      { merge: true },
    );
    await batch.commit();
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo marcar la compra como hecha.";
    return err("compra-rapida-hecha-failed", msg, e);
  }
}

// ─── Helpers privados ─────────────────────────────────────────────────────────

function generarIdInstancia(): string {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `COMPRA-${hoy}-${Date.now()}`;
}
