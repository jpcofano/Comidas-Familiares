import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
  increment,
  runTransaction,
  type Transaction,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Plan, Historial, Receta, Menu, MiembroId, DatosCocinero } from "../types/models";
import { MIEMBRO_IDS } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";
import { calcularPromedio, calcularResultadoTextual, proximoIdHistorial } from "../lib/voto";
import { getSemanaFin } from "../lib/fechas";
import { sincronizarListaDesdeFirestore, limpiarAportesDelPlan } from "./compras";

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getPlanesActivos(semanaInicio: string): Promise<Plan[]> {
  const q = query(
    collection(db, "planes"),
    where("semanaInicio", "==", semanaInicio),
    where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista", "Cocinando", "Cocinada"])
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Plan);
}

export async function getPlan(idPlan: string): Promise<Plan | null> {
  const snap = await getDoc(doc(db, "planes", idPlan));
  return snap.exists() ? (snap.data() as Plan) : null;
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function subscribeToPlanesActivos(
  semanaInicio: string,
  callback: (planes: Plan[]) => void
): () => void {
  const q = query(
    collection(db, "planes"),
    where("semanaInicio", "==", semanaInicio),
    where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista", "Cocinando", "Cocinada"])
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as Plan));
  });
}

// Usa el índice compuesto semanaInicio + estado + asignaciones (ARRAY_CONTAINS) de §5.3.
export function subscribeToPlanesActivosMiembro(
  semanaInicio: string,
  miembroId: string,
  callback: (planes: Plan[]) => void
): () => void {
  const q = query(
    collection(db, "planes"),
    where("semanaInicio", "==", semanaInicio),
    where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista", "Cocinando", "Cocinada"]),
    where("asignaciones", "array-contains", miembroId)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as Plan));
  });
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function crearPlan(
  plan: Omit<Plan, "fechaEleccion" | "votos" | "comentariosPlan" | "datosCocinero">
): Promise<Result<Plan, AppError>> {
  try {
    const votos = Object.fromEntries(MIEMBRO_IDS.map((id) => [id, null])) as Plan["votos"];
    const comentariosPlan = Object.fromEntries(
      MIEMBRO_IDS.map((id) => [id, ""])
    ) as Plan["comentariosPlan"];

    const docData: Plan = {
      ...plan,
      fechaEleccion: serverTimestamp() as unknown as Plan["fechaEleccion"],
      votos,
      comentariosPlan,
      datosCocinero: null,
    };
    await setDoc(doc(db, "planes", plan.idPlan), docData);
    return ok(docData);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo crear el plan.";
    return err("plan-create-failed", msg, e);
  }
}

export async function actualizarPlan(
  idPlan: string,
  updates: Partial<Plan>
): Promise<Result<void, AppError>> {
  try {
    await updateDoc(doc(db, "planes", idPlan), updates as Record<string, unknown>);
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo actualizar el plan.";
    return err("plan-update-failed", msg, e);
  }
}

export async function descartarPlan(
  idPlan: string
): Promise<Result<{ cascadeBorrados: string[] }, AppError>> {
  try {
    const ref = doc(db, "planes", idPlan);
    const snap = await getDoc(ref);
    if (!snap.exists()) return err("plan-not-found", "El plan no existe.");

    const plan = snap.data() as Plan;
    const borrados: string[] = [];

    if (plan.tipoPlan === "Especial") {
      const extrasSnap = await getDocs(
        query(
          collection(db, "planes"),
          where("origen", "==", `extra:${idPlan}`),
          where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista", "Cocinando", "Cocinada"])
        )
      );
      for (const extra of extrasSnap.docs) {
        await deleteDoc(extra.ref);
        borrados.push(extra.id);
      }
    }

    await deleteDoc(ref);
    sincronizarListaDesdeFirestore(plan.semanaInicio).then((r) => {
      if (!r.ok) console.error("[sync] descartarPlan — sincronizarListaDesdeFirestore falló:", r.error);
    });
    return ok({ cascadeBorrados: borrados });
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo descartar el plan.";
    return err("plan-discard-failed", msg, e);
  }
}

export async function marcarCocinada(
  idPlan: string,
  opciones?: { cocinarExtras?: boolean; resetComponentes?: boolean }
): Promise<Result<void, AppError>> {
  try {
    const ref = doc(db, "planes", idPlan);
    const snap = await getDoc(ref);
    if (!snap.exists()) return err("plan-not-found", "El plan no existe.");
    const plan = snap.data() as Plan;

    const updates: Record<string, unknown> = { estado: "Cocinada" };
    if (opciones?.resetComponentes) updates.componentesCocinados = [];
    await updateDoc(ref, updates);

    if (plan.listaComprasId) {
      const r = await limpiarAportesDelPlan(plan.listaComprasId, idPlan);
      if (!r.ok) console.error("[limpieza] marcarCocinada:", r.error);
    }

    if (opciones?.cocinarExtras && plan.tipoPlan === "Especial") {
      const extrasSnap = await getDocs(
        query(
          collection(db, "planes"),
          where("origen", "==", `extra:${idPlan}`),
          where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista"])
        )
      );
      await Promise.all(extrasSnap.docs.map((d) => updateDoc(d.ref, { estado: "Cocinada" })));
    }

    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo marcar el plan como Cocinada.";
    return err("plan-marcar-cocinada-failed", msg, e);
  }
}

export async function marcarComponenteCocinado(
  idPlan: string,
  idReceta: string
): Promise<Result<void, AppError>> {
  try {
    const planRef = doc(db, "planes", idPlan);
    const planSnap = await getDoc(planRef);
    if (!planSnap.exists()) return err("plan-not-found", "El plan no existe.");
    const plan = planSnap.data() as Plan;

    const prevCocinados = plan.componentesCocinados ?? [];
    const nuevosCocinados = prevCocinados.includes(idReceta)
      ? prevCocinados
      : [...prevCocinados, idReceta];

    // Siempre "Cocinando" — el paso a "Cocinada" lo hace el usuario explícitamente
    // con "Finalizar menú" en SeleccionarComponenteMenu (E3.5.1).
    await updateDoc(planRef, {
      estado: "Cocinando",
      componentesCocinados: nuevosCocinados,
    });

    if (plan.listaComprasId) {
      const r = await limpiarAportesDelPlan(plan.listaComprasId, idPlan, idReceta);
      if (!r.ok) console.error("[limpieza] marcarComponenteCocinado:", r.error);
    }

    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo marcar el componente como cocinado.";
    return err("marcar-componente-failed", msg, e);
  }
}

export async function desmarcarComponenteCocinado(
  idPlan: string,
  idReceta: string
): Promise<Result<void, AppError>> {
  try {
    const ref = doc(db, "planes", idPlan);
    const snap = await getDoc(ref);
    if (!snap.exists()) return err("plan-not-found", "El plan no existe.");
    const plan = snap.data() as Plan;
    const nuevosCocinados = (plan.componentesCocinados ?? []).filter((id) => id !== idReceta);
    await updateDoc(ref, { componentesCocinados: nuevosCocinados });
    // Los aportes de este componente ya fueron limpiados de la lista y no se restauran.
    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo desmarcar el componente.";
    return err("firestore-error", msg, e);
  }
}

// ─── Creación de planes (§3.2, §3.3) ─────────────────────────────────────────

function generarIdPlan(): string {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PLAN-${hoy}-${Date.now()}`;
}

export async function elegirComoEspecial(
  receta: Receta,
  semanaInicio: string,
  semanaFin: string,
  especialExistente?: Plan
): Promise<Result<Plan, AppError>> {
  if (especialExistente) {
    const borrado = await descartarPlan(especialExistente.idPlan);
    if (!borrado.ok) return borrado as Result<Plan, AppError>;
  }

  const result = await crearPlan({
    idPlan: generarIdPlan(),
    semanaInicio,
    semanaFin,
    tipoSeleccion: "receta",
    tipoPlan: "Especial",
    idSeleccion: receta.idReceta,
    nombreSeleccion: receta.nombre,
    recetaPrincipal: receta.nombre,
    estado: "Elegida",
    fechaPrevistaComida: null,
    cantidadPersonas: 4,
    listaComprasId: null,
    notas: "",
    origen: null,
    asignaciones: ["juanpablo"],
  });
  if (result.ok) {
    sincronizarListaDesdeFirestore(semanaInicio).then((r) => {
      if (!r.ok) console.error("[sync] elegirComoEspecial — sincronizarListaDesdeFirestore falló:", r.error);
    });
  }
  return result;
}

export async function sumarComoExtra(
  receta: Receta,
  especial: Plan,
  semanaInicio: string,
  semanaFin: string
): Promise<Result<Plan, AppError>> {
  const result = await crearPlan({
    idPlan: generarIdPlan(),
    semanaInicio,
    semanaFin,
    tipoSeleccion: "receta",
    tipoPlan: "Especial extra",
    idSeleccion: receta.idReceta,
    nombreSeleccion: receta.nombre,
    recetaPrincipal: receta.nombre,
    estado: "Elegida",
    fechaPrevistaComida: null,
    cantidadPersonas: 4,
    listaComprasId: null,
    notas: "",
    origen: `extra:${especial.idPlan}`,
    asignaciones: ["juanpablo"],
  });
  if (result.ok) {
    sincronizarListaDesdeFirestore(semanaInicio).then((r) => {
      if (!r.ok) console.error("[sync] sumarComoExtra — sincronizarListaDesdeFirestore falló:", r.error);
    });
  }
  return result;
}

export async function sumarComoEnProceso(
  receta: Receta,
  semanaInicio: string,
  semanaFin: string
): Promise<Result<Plan, AppError>> {
  const result = await crearPlan({
    idPlan: generarIdPlan(),
    semanaInicio,
    semanaFin,
    tipoSeleccion: "receta",
    tipoPlan: "En proceso",
    idSeleccion: receta.idReceta,
    nombreSeleccion: receta.nombre,
    recetaPrincipal: receta.nombre,
    estado: "Elegida",
    fechaPrevistaComida: null,
    cantidadPersonas: 4,
    listaComprasId: null,
    notas: "",
    origen: null,
    asignaciones: ["juanpablo"],
  });
  if (result.ok) {
    sincronizarListaDesdeFirestore(semanaInicio).then((r) => {
      if (!r.ok) console.error("[sync] sumarComoEnProceso — sincronizarListaDesdeFirestore falló:", r.error);
    });
  }
  return result;
}

// ─── Acciones de plan para menús (E3.7) ──────────────────────────────────────

export async function elegirMenuComoEspecial(
  menu: Menu,
  recetaPrincipalNombre: string,
  semanaInicio: string,
  semanaFin: string,
  especialExistente?: Plan
): Promise<Result<Plan, AppError>> {
  if (especialExistente) {
    const borrado = await descartarPlan(especialExistente.idPlan);
    if (!borrado.ok) return borrado as Result<Plan, AppError>;
  }
  const result = await crearPlan({
    idPlan: generarIdPlan(),
    semanaInicio,
    semanaFin,
    tipoSeleccion: "menu",
    tipoPlan: "Especial",
    idSeleccion: menu.idMenu,
    nombreSeleccion: menu.nombreMenu,
    recetaPrincipal: recetaPrincipalNombre,
    estado: "Elegida",
    fechaPrevistaComida: null,
    cantidadPersonas: 4,
    listaComprasId: null,
    notas: "",
    origen: null,
    asignaciones: ["juanpablo"],
  });
  if (result.ok) {
    sincronizarListaDesdeFirestore(semanaInicio).then((r) => {
      if (!r.ok) console.error("[sync] elegirMenuComoEspecial — sincronizarListaDesdeFirestore falló:", r.error);
    });
  }
  return result;
}

export async function sumarMenuComoEnProceso(
  menu: Menu,
  recetaPrincipalNombre: string,
  semanaInicio: string,
  semanaFin: string
): Promise<Result<Plan, AppError>> {
  const result = await crearPlan({
    idPlan: generarIdPlan(),
    semanaInicio,
    semanaFin,
    tipoSeleccion: "menu",
    tipoPlan: "En proceso",
    idSeleccion: menu.idMenu,
    nombreSeleccion: menu.nombreMenu,
    recetaPrincipal: recetaPrincipalNombre,
    estado: "Elegida",
    fechaPrevistaComida: null,
    cantidadPersonas: 4,
    listaComprasId: null,
    notas: "",
    origen: null,
    asignaciones: ["juanpablo"],
  });
  if (result.ok) {
    sincronizarListaDesdeFirestore(semanaInicio).then((r) => {
      if (!r.ok) console.error("[sync] sumarMenuComoEnProceso — sincronizarListaDesdeFirestore falló:", r.error);
    });
  }
  return result;
}

// ─── Evaluación distribuida (E4.2) ────────────────────────────────────────────

class TransactionAbort extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// Cierra el plan dentro de una transacción en curso.
// Reutilizado por voteAndCloseIfComplete (cierre automático al último voto)
// y por forzarCierreEvaluacion (cierre manual de JP).
function _cerrarEvaluacion(
  tx: Transaction,
  planRef: ReturnType<typeof doc>,
  plan: Plan,
  votosFinales: Plan["votos"],
  comentariosFinales: Plan["comentariosPlan"],
  datosCocineroFinal: DatosCocinero | null,
  puntajesComponentes?: Record<string, number>
): { promedio: number; resultado: string } {
  const promedio = calcularPromedio(votosFinales);
  const resultado = calcularResultadoTextual(promedio);
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const idHistorial = proximoIdHistorial();

  const historialDoc: Historial = {
    idHist: idHistorial,
    fechaRealizada: fechaHoy,
    fechaRealizadaTimestamp: Timestamp.now(),
    idPlan: plan.idPlan,
    idReceta: plan.tipoSeleccion === "receta" ? plan.idSeleccion : "",
    idMenu:   plan.tipoSeleccion === "menu"   ? plan.idSeleccion : "",
    receta: plan.nombreSeleccion,
    tipoSeleccion: plan.tipoSeleccion,
    idSeleccion: plan.idSeleccion,
    nombreSeleccion: plan.nombreSeleccion,
    semanaInicio: plan.semanaInicio,
    ocasion: datosCocineroFinal?.ocasion ?? "",
    calificaciones: votosFinales as Record<MiembroId, number>,
    comentarios: comentariosFinales,
    promedio,
    resultado: resultado as Historial["resultado"],
    repetir: datosCocineroFinal?.repetir ?? "",
    costoRealAprox: datosCocineroFinal?.costoRealAprox ?? "",
    dificultadReal: datosCocineroFinal?.dificultadReal ?? "",
    queSalioBien: datosCocineroFinal?.queSalioBien ?? "",
    queCambiaria: datosCocineroFinal?.queCambiaria ?? "",
    notasFamiliares: datosCocineroFinal?.notasFamiliares ?? "",
  };

  tx.set(doc(db, "historial", idHistorial), historialDoc);
  tx.update(planRef, {
    estado: "Evaluada",
    votos: votosFinales,
    comentariosPlan: comentariosFinales,
    ...(datosCocineroFinal != null ? { datosCocinero: datosCocineroFinal } : {}),
  });

  if (plan.tipoSeleccion === "receta") {
    tx.update(doc(db, "recetas", plan.idSeleccion), {
      vecesCocinada: increment(1),
      ultimaEvaluacion: Timestamp.now(),
      ultimoPuntaje: promedio,
    });
  } else {
    tx.update(doc(db, "menus", plan.idSeleccion), { vecesCocinada: increment(1) });
    for (const idReceta of (plan.componentesCocinados ?? [])) {
      const extra: Record<string, unknown> = { vecesCocinada: increment(1) };
      if (puntajesComponentes?.[idReceta] != null) {
        extra.ultimoPuntaje = puntajesComponentes[idReceta];
        extra.ultimaEvaluacion = Timestamp.now();
      }
      tx.update(doc(db, "recetas", idReceta), extra);
    }
  }

  return { promedio, resultado };
}

// Voto de cualquier miembro (siempre los 4, independiente de asignaciones).
// Si todos los MIEMBRO_IDS votaron, cierra automáticamente.
export async function voteAndCloseIfComplete(
  idPlan: string,
  miembroId: MiembroId,
  puntaje: number,
  comentario: string,
  datosCocinero?: DatosCocinero,
  puntajesComponentes?: Record<string, number>
): Promise<Result<{ cerrado: boolean; promedio?: number; resultado?: string }, AppError>> {
  if (puntaje < 1 || puntaje > 10) {
    return err("invalid-score", "El puntaje debe estar entre 1 y 10.");
  }

  try {
    const result = await runTransaction(db, async (tx) => {
      const planRef = doc(db, "planes", idPlan);
      const planSnap = await tx.get(planRef);
      if (!planSnap.exists()) throw new TransactionAbort("plan-not-found", "El plan no existe.");

      const plan = planSnap.data() as Plan;
      if (plan.estado !== "Cocinada") {
        throw new TransactionAbort(
          "plan-not-cocinada",
          plan.estado === "Evaluada"
            ? "Este plan ya fue evaluado."
            : `El plan no está en estado Cocinada (está en "${plan.estado}").`
        );
      }
      const votosFinales: Plan["votos"] = { ...plan.votos, [miembroId]: puntaje };
      const comentariosFinales: Plan["comentariosPlan"] = { ...plan.comentariosPlan, [miembroId]: comentario };
      // datosCocinero es exclusivo de JP; si JP votó primero y luego cierra otro miembro, se conserva el existente.
      const datosCocineroFinal = miembroId === "juanpablo" && datosCocinero
        ? datosCocinero
        : plan.datosCocinero;

      // Cierre cuando TODOS los 4 miembros votaron (independiente de quién cocina).
      const votantesCompletos = MIEMBRO_IDS.every((id) => votosFinales[id] != null);

      if (votantesCompletos) {
        const { promedio, resultado } = _cerrarEvaluacion(
          tx, planRef, plan, votosFinales, comentariosFinales, datosCocineroFinal, puntajesComponentes
        );
        return { cerrado: true, promedio, resultado };
      }

      // Cierre parcial: registrar solo el voto del miembro
      const update: Record<string, unknown> = {
        [`votos.${miembroId}`]: puntaje,
        [`comentariosPlan.${miembroId}`]: comentario,
      };
      if (miembroId === "juanpablo" && datosCocinero) update.datosCocinero = datosCocinero;
      tx.update(planRef, update);
      return { cerrado: false };
    });

    return ok(result);
  } catch (e) {
    if (e instanceof TransactionAbort) return err(e.code, e.message, e);
    return err("firestore-error", "Error al guardar el voto. Probá de nuevo.", e);
  }
}

// Edita quiénes están asignados al plan. Limpia votos de los desasignados con deleteField().
// La restricción "solo JP puede llamar esto" se enforcea en la UI, no en las rules (§D5 E4.3).
export async function actualizarAsignaciones(
  idPlan: string,
  nuevasAsignaciones: MiembroId[]
): Promise<Result<void, AppError>> {
  if (nuevasAsignaciones.length === 0) {
    return err("empty-asignaciones", "Tiene que comerlo al menos una persona.");
  }
  if (!nuevasAsignaciones.every((id) => (MIEMBRO_IDS as readonly string[]).includes(id))) {
    return err("invalid-miembro", "ID de miembro inválido.");
  }

  try {
    await runTransaction(db, async (tx) => {
      const planRef = doc(db, "planes", idPlan);
      const planSnap = await tx.get(planRef);
      if (!planSnap.exists()) throw new TransactionAbort("plan-not-found", "El plan no existe.");

      const plan = planSnap.data() as Plan;
      if (plan.estado === "Evaluada") {
        throw new TransactionAbort(
          "plan-evaluada",
          "No se pueden cambiar las asignaciones de un plan ya evaluado."
        );
      }

      tx.update(planRef, { asignaciones: nuevasAsignaciones });
    });

    return ok(undefined);
  } catch (e) {
    if (e instanceof TransactionAbort) return err(e.code, e.message, e);
    return err("firestore-error", "Error al actualizar las asignaciones. Probá de nuevo.", e);
  }
}

// Solo para JP: cierra el plan con los votos que haya en ese momento.
export async function forzarCierreEvaluacion(
  idPlan: string
): Promise<Result<{ promedio: number; resultado: string }, AppError>> {
  try {
    const result = await runTransaction(db, async (tx) => {
      const planRef = doc(db, "planes", idPlan);
      const planSnap = await tx.get(planRef);
      if (!planSnap.exists()) throw new TransactionAbort("plan-not-found", "El plan no existe.");

      const plan = planSnap.data() as Plan;
      if (plan.estado !== "Cocinada") {
        throw new TransactionAbort(
          "plan-not-cocinada",
          plan.estado === "Evaluada"
            ? "Este plan ya fue evaluado."
            : `El plan no está en estado Cocinada (está en "${plan.estado}").`
        );
      }

      return _cerrarEvaluacion(tx, planRef, plan, plan.votos, plan.comentariosPlan, plan.datosCocinero);
    });

    return ok(result);
  } catch (e) {
    if (e instanceof TransactionAbort) return err(e.code, e.message, e);
    return err("firestore-error", "Error al cerrar la evaluación. Probá de nuevo.", e);
  }
}

// ─── E7.1 — Fecha del plan ─────────────────────────────────────────────────────

/**
 * Asigna o quita el día de un plan.
 * @param fecha  "YYYY-MM-DD" dentro de la semana del plan, o null para quitar el día.
 */
export async function asignarFechaPlan(
  idPlan: string,
  fecha: string | null,
): Promise<Result<void, AppError>> {
  try {
    const planRef = doc(db, "planes", idPlan);
    const snap = await getDoc(planRef);
    if (!snap.exists()) return err("plan-not-found", `Plan ${idPlan} no encontrado.`);

    if (fecha !== null) {
      const plan = snap.data() as Plan;
      const semanaFin = getSemanaFin(plan.semanaInicio);
      if (fecha < plan.semanaInicio || fecha > semanaFin) {
        return err(
          "fecha-fuera-de-semana",
          `La fecha ${fecha} no pertenece a la semana del plan (${plan.semanaInicio} – ${semanaFin}).`,
        );
      }
      await updateDoc(planRef, { fecha });
    } else {
      await updateDoc(planRef, { fecha: deleteField() });
    }

    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo asignar la fecha al plan.";
    return err("firestore-error", msg, e);
  }
}
