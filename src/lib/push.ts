import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app, db } from "../firebase";
import { doc, setDoc, deleteField } from "firebase/firestore";
import type { MiembroId } from "../types/models";

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string;

export async function pushSoportado(): Promise<boolean> {
  return (
    (await isSupported().catch(() => false)) &&
    "serviceWorker" in navigator &&
    "Notification" in window
  );
}

/** Pide permiso, obtiene token FCM y lo guarda en config/pushTokens. Devuelve true si quedó activo. */
export async function activarPush(memberId: MiembroId): Promise<boolean> {
  if (!(await pushSoportado())) return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) return false;

  // Un miembro puede tener varios dispositivos → mapa de tokens.
  await setDoc(doc(db, "config", "pushTokens"), { [memberId]: { [token]: true } }, { merge: true });
  return true;
}

export async function desactivarPush(memberId: MiembroId, token?: string) {
  if (!token) return;
  await setDoc(
    doc(db, "config", "pushTokens"),
    { [memberId]: { [token]: deleteField() } },
    { merge: true },
  );
}

/** Escucha mensajes con la app en foco (muestra un toast in-app en vez de notificación del SO). */
export function escucharPushEnForeground(cb: (titulo: string, cuerpo: string) => void) {
  isSupported().then((ok) => {
    if (!ok) return;
    onMessage(getMessaging(app), (payload) => {
      const n = (payload.notification ?? payload.data ?? {}) as Record<string, string>;
      cb(n.title ?? "Comida Familiar", n.body ?? "");
    });
  });
}
