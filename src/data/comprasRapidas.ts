import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { Plan, Receta, MiembroId, ItemCompraRapida } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";
import { crearPlan } from "./planes";
import { invalidateRecetasCache, proximoIdReceta } from "./recetas";
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
  miembroId: MiembroId,
): Promise<Result<Plan, AppError>> {
  const semanaInicio = getSemanaActual();
  const semanaFin = getSemanaFin(semanaInicio);
  const itemsCompraRapida: ItemCompraRapida[] = plantilla.ingredientes.map((ing) => ({
    idIngrediente: ing.idIngrediente,
    nombre: ing.textoOriginal,
    cantidad: String(ing.cantidad ?? "1"),
    unidad: ing.unidad ?? "",
    seccionGondola: ing.seccion ?? "Despensa / otros",
    comprado: false,
  }));

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
    asignaciones: [miembroId],
    itemsCompraRapida,
  });
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
): Promise<Result<void, AppError>> {
  try {
    await updateDoc(doc(db, "planes", idPlan), { estado: "Compra lista" });
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
