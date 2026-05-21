import { useEffect, useState } from "react";
import {
  DocumentReference,
  CollectionReference,
  getDoc,
  getDocs,
  onSnapshot,
  QueryConstraint,
  query,
} from "firebase/firestore";

export type LoadingState = "idle" | "loading" | "loaded" | "error";

export interface AsyncState<T> {
  data: T | null;
  status: LoadingState;
  error: Error | null;
}

/**
 * Reads a single document once. No realtime.
 */
export function useDoc<T>(ref: DocumentReference<T> | null): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    status: ref ? "loading" : "idle",
    error: null,
  });

  useEffect(() => {
    if (!ref) {
      setState({ data: null, status: "idle", error: null });
      return;
    }

    let active = true;
    setState({ data: null, status: "loading", error: null });

    getDoc(ref)
      .then((snap) => {
        if (!active) return;
        if (snap.exists()) {
          setState({ data: snap.data() as T, status: "loaded", error: null });
        } else {
          setState({ data: null, status: "loaded", error: null });
        }
      })
      .catch((e: Error) => {
        if (!active) return;
        setState({ data: null, status: "error", error: e });
      });

    return () => {
      active = false;
    };
  }, [ref?.path]);

  return state;
}

/**
 * Reads a collection or query once. No realtime.
 */
export function useCollection<T>(
  collectionRef: CollectionReference<T> | null,
  constraints: QueryConstraint[] = []
): AsyncState<T[]> {
  const [state, setState] = useState<AsyncState<T[]>>({
    data: null,
    status: collectionRef ? "loading" : "idle",
    error: null,
  });

  const constraintsKey = JSON.stringify(constraints);

  useEffect(() => {
    if (!collectionRef) {
      setState({ data: null, status: "idle", error: null });
      return;
    }

    let active = true;
    setState({ data: null, status: "loading", error: null });

    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

    getDocs(q)
      .then((snap) => {
        if (!active) return;
        const data = snap.docs.map((d) => d.data() as T);
        setState({ data, status: "loaded", error: null });
      })
      .catch((e: Error) => {
        if (!active) return;
        setState({ data: null, status: "error", error: e });
      });

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionRef?.path, constraintsKey]);

  return state;
}

/**
 * Subscribes to a collection or query in realtime via onSnapshot.
 * Automatically cleans up on unmount.
 */
export function useCollectionRealtime<T>(
  collectionRef: CollectionReference<T> | null,
  constraints: QueryConstraint[] = []
): AsyncState<T[]> {
  const [state, setState] = useState<AsyncState<T[]>>({
    data: null,
    status: collectionRef ? "loading" : "idle",
    error: null,
  });

  const constraintsKey = JSON.stringify(constraints);

  useEffect(() => {
    if (!collectionRef) {
      setState({ data: null, status: "idle", error: null });
      return;
    }

    setState({ data: null, status: "loading", error: null });

    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => d.data() as T);
        setState({ data, status: "loaded", error: null });
      },
      (e: Error) => {
        setState({ data: null, status: "error", error: e });
      }
    );

    return () => {
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionRef?.path, constraintsKey]);

  return state;
}
