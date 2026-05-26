import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

let cachedPromptLLM: string | null = null;

export async function getPromptLLM(): Promise<string> {
  if (cachedPromptLLM !== null) return cachedPromptLLM;

  const ref = doc(db, "config", "importador");
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    cachedPromptLLM = "";
    return "";
  }

  cachedPromptLLM = (snap.data().promptLLM as string | undefined) ?? "";
  return cachedPromptLLM;
}
