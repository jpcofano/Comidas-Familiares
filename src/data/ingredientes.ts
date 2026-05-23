import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { Ingrediente } from "../types/models";

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
