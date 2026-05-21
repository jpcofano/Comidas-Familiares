import { type DocumentData, QueryDocumentSnapshot, Timestamp } from "firebase/firestore";

export function converter<T>() {
  return {
    toFirestore(data: T): DocumentData {
      return data as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      return snapshot.data() as T;
    },
  };
}

export function nowTimestamp(): Timestamp {
  return Timestamp.now();
}

export function firebaseErrorMessage(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  const code = (err as { code?: string }).code;
  if (!code) return null;

  switch (code) {
    case "permission-denied":
      return "No tenés permiso para hacer esta acción.";
    case "unavailable":
      return "No se pudo conectar con el servidor. Probá de nuevo en unos segundos.";
    case "not-found":
      return "No se encontró el documento solicitado.";
    case "already-exists":
      return "Ya existe un documento con esa identificación.";
    case "failed-precondition":
      return "La operación falló por una validación previa.";
    case "aborted":
      return "La operación fue cancelada por un conflicto. Probá de nuevo.";
    case "deadline-exceeded":
      return "La operación tardó demasiado. Probá de nuevo.";
    default:
      return `Error de Firebase (${code}).`;
  }
}
