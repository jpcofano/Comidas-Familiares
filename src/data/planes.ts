import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
  increment,
  runTransaction,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Plan, Historial, Receta, MiembroId, MemberId } from "../types/models";
import { MIEMBRO_IDS } from "../types/models";
import { ok, err, type Result, type AppError } from "../lib/result";
import { firebaseErrorMessage } from "./_helpers";
import { calcularPromedio, calcularResultadoTextual, proximoIdHistorial } from "../lib/voto";
import { sincronizarListaDesdeFirestore } from "./compras";

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getPlanesActivos(semanaInicio: string): Promise<Plan[]> {
  const q = query(
    collection(db, "planes"),
    where("semanaInicio", "==", semanaInicio),
    where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista", "Cocinada"])
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
    where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista", "Cocinada"])
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
          where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista", "Cocinada"])
        )
      );
      for (const extra of extrasSnap.docs) {
        await deleteDoc(extra.ref);
        borrados.push(extra.id);
      }
    }

    await deleteDoc(ref);
    sincronizarListaDesdeFirestore(plan.semanaInicio).catch(() => {});
    return ok({ cascadeBorrados: borrados });
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo descartar el plan.";
    return err("plan-discard-failed", msg, e);
  }
}

export async function marcarCocinada(
  idPlan: string,
  opciones?: { cocinarExtras: boolean }
): Promise<Result<void, AppError>> {
  try {
    const ref = doc(db, "planes", idPlan);
    await updateDoc(ref, { estado: "Cocinada" });

    if (opciones?.cocinarExtras) {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const plan = snap.data() as Plan;
        if (plan.tipoPlan === "Especial") {
          const extrasSnap = await getDocs(
            query(
              collection(db, "planes"),
              where("origen", "==", `extra:${idPlan}`),
              where("estado", "in", ["Elegida", "Compra pendiente", "Compra lista"])
            )
          );
          await Promise.all(extrasSnap.docs.map((d) => updateDoc(d.ref, { estado: "Cocinada" })));
        }
      }
    }

    return ok(undefined);
  } catch (e) {
    const msg = firebaseErrorMessage(e) ?? "No se pudo marcar el plan como Cocinada.";
    return err("plan-marcar-cocinada-failed", msg, e);
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
  if (result.ok) sincronizarListaDesdeFirestore(semanaInicio).catch(() => {});
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
  if (result.ok) sincronizarListaDesdeFirestore(semanaInicio).catch(() => {});
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
  if (result.ok) sincronizarListaDesdeFirestore(semanaInicio).catch(() => {});
  return result;
}

// ─── Voto + cierre transaccional (§3.7) ──────────────────────────────────────

export interface VoteOutcome {
  planActualizado: Plan;
  cerrado: boolean;
  promedio?: number;
  resultado?: string;
  idHistorial?: string;
}

class TransactionAbort extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function voteAndCloseIfComplete(
  idPlan: string,
  miembroId: MemberId,
  puntaje: number,
  comentario: string
): Promise<Result<VoteOutcome, AppError>> {
  if (puntaje < 1 || puntaje > 10) {
    return err("invalid-score", "El puntaje debe estar entre 1 y 10.");
  }

  try {
    const result = await runTransaction(db, async (tx) => {
      const planRef = doc(db, "planes", idPlan);
      const planSnap = await tx.get(planRef);

      if (!planSnap.exists()) {
        throw new TransactionAbort("plan-not-found", "El plan no existe.");
      }

      const plan = planSnap.data() as Plan;

      if (plan.estado !== "Cocinada") {
        throw new TransactionAbort(
          "plan-not-cookable",
          `No se puede votar un plan en estado "${plan.estado}". Tiene que estar Cocinada.`
        );
      }

      const nuevosVotos: Plan["votos"] = {
        ...(plan.votos ?? {}),
        [miembroId]: puntaje,
      } as Plan["votos"];

      const nuevosComentarios: Plan["comentariosPlan"] = {
        ...(plan.comentariosPlan ?? {}),
        [miembroId]: comentario,
      } as Plan["comentariosPlan"];

      tx.update(planRef, {
        [`votos.${miembroId}`]: puntaje,
        [`comentariosPlan.${miembroId}`]: comentario,
      });

      const votosCompletos = (MIEMBRO_IDS as readonly MiembroId[]).every(
        (mid) => typeof nuevosVotos[mid] === "number"
      );

      if (!votosCompletos) {
        return {
          planActualizado: { ...plan, votos: nuevosVotos, comentariosPlan: nuevosComentarios },
          cerrado: false,
        } as VoteOutcome;
      }

      // Todos votaron — cerrar evaluación
      const promedio = calcularPromedio(nuevosVotos);
      const resultado = calcularResultadoTextual(promedio);
      const fechaHoy = new Date().toISOString().slice(0, 10);
      const idHistorial = proximoIdHistorial();
      const historialRef = doc(db, "historial", idHistorial);

      const historialDoc: Historial = {
        idHist: idHistorial,
        fechaRealizada: fechaHoy,
        fechaRealizadaTimestamp: Timestamp.now(),
        idPlan: plan.idPlan,
        idReceta: plan.tipoSeleccion === "receta" ? plan.idSeleccion : "",
        idMenu: plan.tipoSeleccion === "menu" ? plan.idSeleccion : "",
        receta: plan.nombreSeleccion,
        tipoSeleccion: plan.tipoSeleccion,
        idSeleccion: plan.idSeleccion,
        nombreSeleccion: plan.nombreSeleccion,
        semanaInicio: plan.semanaInicio,
        ocasion: plan.datosCocinero?.ocasion ?? "",
        calificaciones: nuevosVotos as Record<MiembroId, number>,
        comentarios: nuevosComentarios,
        promedio,
        resultado: resultado as Historial["resultado"],
        repetir: plan.datosCocinero?.repetir ?? "",
        costoRealAprox: plan.datosCocinero?.costoRealAprox ?? "",
        dificultadReal: plan.datosCocinero?.dificultadReal ?? "",
        queSalioBien: plan.datosCocinero?.queSalioBien ?? "",
        queCambiaria: plan.datosCocinero?.queCambiaria ?? "",
        notasFamiliares: plan.datosCocinero?.notasFamiliares ?? "",
      };

      tx.set(historialRef, historialDoc);
      tx.update(planRef, { estado: "Evaluada" });

      // TODO v1.4: decidir qué hacer para planes de menú (no se actualizan
      // contadores en el menú ni en sus componentes por ahora).
      if (plan.tipoSeleccion === "receta") {
        const recetaRef = doc(db, "recetas", plan.idSeleccion);
        tx.update(recetaRef, {
          vecesCocinada: increment(1),
          ultimaEvaluacion: Timestamp.now(),
          ultimoPuntaje: promedio,
        });
      }

      return {
        planActualizado: {
          ...plan,
          votos: nuevosVotos,
          comentariosPlan: nuevosComentarios,
          estado: "Evaluada",
        },
        cerrado: true,
        promedio,
        resultado,
        idHistorial,
      } as VoteOutcome;
    });

    return ok(result);
  } catch (e) {
    if (e instanceof TransactionAbort) {
      return err(e.code, e.message, e);
    }
    return err("vote-transaction-failed", "No se pudo registrar el voto. Probá de nuevo.", e);
  }
}
