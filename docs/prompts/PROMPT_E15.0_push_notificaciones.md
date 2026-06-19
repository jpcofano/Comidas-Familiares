# PROMPT E15.0 — Notificaciones push (FCM): comida + lista de compras, con preferencias granulares

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> **A implementar ahora.** Numerar al próximo libre si `E15.0` ya existe.
>
> **Contexto verificado (19-jun-2026):**
> - PWA con service worker ya andando (`vite-plugin-pwa` / Workbox, `registerType:'autoUpdate'`).
> - SDK `firebase` v12 (incluye `firebase/messaging`). Proyecto Firebase con `messagingSenderId`
>   ya configurado en `src/firebase.ts`.
> - **No** existe `functions/` ni FCM aún. El Perfil tiene un placeholder "Notificaciones ·
>   Próximamente" (`Perfil.tsx:443`) con 3 toggles muertos.
> - Decisiones del usuario: **(1) habilita plan Blaze. (2) "hay comida" → push a los 4.
>   (3) preferencias granulares: un permiso de navegador + dos toggles por miembro.**
>
> **Objetivo:** push real (llega con la app cerrada) en dos momentos: se publica una **comida** y se
> genera una **lista de compras** (compra rápida). El flujo "Yo me encargo" queda **igual**.

---

## Arquitectura (5 piezas)
```
[SW mensajería] ← entrega ── [FCM] ← envía ── [Cloud Function onCreate] ← dispara ── [Firestore: plan/compra creada]
       ↑                                                    │
   token del navegador                          lee config/pushTokens + preferencias
```

---

## PARTE 1 — Cliente: permiso, token y SW de mensajería

### 1a. `public/firebase-messaging-sw.js` (nuevo)
Service worker dedicado de FCM (convive con el de Workbox; FCM usa su propio archivo en la raíz).
Usar la API compat de messaging en el SW:
```js
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "…", authDomain: "…", projectId: "…",
  messagingSenderId: "133743597694", appId: "…",   // mismos valores de src/firebase.ts
});

const messaging = firebase.messaging();

// Push en background (app cerrada / pestaña sin foco).
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, tag } = payload.notification ?? payload.data ?? {};
  self.registration.showNotification(title ?? "Comida Familiar", {
    body: body ?? "", icon: icon ?? "/icons/icon-192.png",
    badge: "/icons/icon-192.png", tag,
    data: payload.data ?? {},   // incluye { url } para el click
  });
});

// Tap en la notificación → abrir/enfocar la ruta.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.includes(url));
      if (open) return open.focus();
      return clients.openWindow(url);
    })
  );
});
```

### 1b. `src/lib/push.ts` (nuevo)
```ts
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app } from "../firebase";
import { doc, setDoc, deleteField } from "firebase/firestore";
import { db } from "../firebase";
import type { MiembroId } from "../types/models";

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string;   // de Firebase Console

export async function pushSoportado(): Promise<boolean> {
  return (await isSupported().catch(() => false)) && "serviceWorker" in navigator && "Notification" in window;
}

// Pide permiso, obtiene token y lo guarda. Devuelve true si quedó activo.
export async function activarPush(memberId: MiembroId): Promise<boolean> {
  if (!(await pushSoportado())) return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) return false;

  // Token por miembro (un miembro puede tener varios dispositivos → mapa de tokens).
  await setDoc(doc(db, "config", "pushTokens"), { [memberId]: { [token]: true } }, { merge: true });
  return true;
}

export async function desactivarPush(memberId: MiembroId, token?: string) {
  if (!token) return;
  await setDoc(doc(db, "config", "pushTokens"),
    { [memberId]: { [token]: deleteField() } }, { merge: true });
}

// Mensajes con la app en foco (opcional: mostrar toast in-app en vez de notificación del SO).
export function escucharPushEnForeground(cb: (titulo: string, cuerpo: string) => void) {
  isSupported().then((ok) => {
    if (!ok) return;
    onMessage(getMessaging(app), (payload) => {
      const n = payload.notification ?? payload.data ?? {};
      cb(n.title ?? "Comida Familiar", n.body ?? "");
    });
  });
}
```
> Exportá `app` desde `src/firebase.ts` si todavía no se exporta. Agregá `VITE_FCM_VAPID_KEY` al
> `.env` (y a `.env.example`); la VAPID key se saca de **Firebase Console → Project settings →
> Cloud Messaging → Web Push certificates**.

### 1c. Modelo de preferencias (`src/types/models.ts`)
Extender `PerfilMiembro` con las preferencias granulares (capa B):
```ts
export interface PerfilMiembro {
  color?: string;
  preferencias?: string[];
  fotoUrl?: string;
  notif?: { comida?: boolean; compras?: boolean };   // NUEVO — default: ambos true al activar
}
```
Y documentar el doc nuevo `config/pushTokens`:
```ts
// Doc único /config/pushTokens. Por miembro, un mapa de tokens FCM activos (multi-dispositivo).
export interface PushTokens { [memberId: string]: Record<string, true>; }
```

### 1d. Toggle en Perfil (`src/routes/Perfil.tsx`, reemplaza el placeholder de la línea ~443)
- Card "Notificaciones" **real** (solo para el propio perfil, `targetId === selfId`):
  - Botón maestro **"Activar notificaciones"** → `activarPush(selfId)`; al granted, setear
    `notif: { comida: true, compras: true }` en `config/perfiles` y mostrar los dos toggles.
  - Si el permiso está denegado a nivel navegador, mostrar ayuda ("Activalas desde los ajustes del
    navegador/teléfono").
  - Dos **toggles de preferencia** (capa B), guardados con un `setNotifPref(selfId, {comida})`:
    - 🍽 **Avisos de comida**
    - 🛒 **Avisos de compras**
  - En iOS no instalado: nota "En iPhone, agregá la app a la pantalla de inicio para recibir avisos"
    (reusar `isStandalone`/`isIOS` de `useInstallPrompt`).
- Nueva función en `src/data/perfiles.ts`: `setNotifPref(id, patch: {comida?:boolean;compras?:boolean})`
  → merge en `config/perfiles`.

---

## PARTE 2 — Backend: Cloud Functions (requiere Blaze)

### 2a. Inicializar `functions/` (TypeScript)
`firebase init functions` (TypeScript, sin ESLint si complica). Añadir `firebase-admin` y
`firebase-functions`. Helper de envío compartido:
```ts
// functions/src/enviar.ts
import * as admin from "firebase-admin";
admin.initializeApp();

type Tipo = "comida" | "compras";

export async function notificarFamilia(
  tipo: Tipo,
  payload: { title: string; body: string; url: string },
  excluir?: string,           // memberId a no notificar (ej. quien generó la lista)
) {
  const db = admin.firestore();
  const [tokensSnap, perfilesSnap] = await Promise.all([
    db.doc("config/pushTokens").get(),
    db.doc("config/perfiles").get(),
  ]);
  const tokensByMember = (tokensSnap.data() ?? {}) as Record<string, Record<string, true>>;
  const perfiles = (perfilesSnap.data() ?? {}) as Record<string, { notif?: { comida?: boolean; compras?: boolean } }>;

  const tokens: string[] = [];
  for (const [memberId, toks] of Object.entries(tokensByMember)) {
    if (memberId === excluir) continue;
    const pref = perfiles[memberId]?.notif;
    // default true si no hay preferencia seteada
    const quiere = pref?.[tipo] ?? true;
    if (!quiere) continue;
    tokens.push(...Object.keys(toks));
  }
  if (!tokens.length) return;

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: { url: payload.url, tipo },
    webpush: { fcmOptions: { link: payload.url } },
  });
}
```

### 2b. Trigger "hay comida"
Dispara al crearse un plan de comida (no compra rápida). Ajustar el path/colección reales
(`planes/{id}`) y el filtro:
```ts
// functions/src/index.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { notificarFamilia } from "./enviar";

export const avisoComida = onDocumentCreated("planes/{id}", async (event) => {
  const p = event.data?.data();
  if (!p) return;
  if (p.tipoSeleccion === "compra-rapida") return;        // las compras van por el otro trigger
  // Solo cuando "se publica" una comida — ajustar a la condición real
  // (p.ej. estado/tipoPlan que represente publicado; evitar disparar en borradores).
  const nombre = p.nombreSeleccion ?? p.recetaPrincipal ?? "Comida";
  await notificarFamilia("comida", {
    title: "Comida Familiar",
    body: `Hay ${nombre} 🍽 Tocá para ver el plato.`,
    url: `/plan/${event.params.id}`,                       // ajustar a la ruta real del detalle
  });
});
```

### 2c. Trigger "hay lista de compras"
Dispara al generarse una compra rápida; excluye a quien la generó:
```ts
export const avisoCompra = onDocumentCreated("planes/{id}", async (event) => {
  const p = event.data?.data();
  if (!p || p.tipoSeleccion !== "compra-rapida") return;
  const destino = (p.nombreSeleccion ?? "Compra").replace(/^Compra rápida · /, "");
  const n = (p.itemsCompraRapida ?? []).length;
  await notificarFamilia(
    "compras",
    { title: "Comida Familiar", body: `Nueva lista · ${destino} (${n} ítems). ¿Quién se encarga?`, url: "/compras" },
    p.generadaPor ?? undefined,                            // si guardás quién la generó; si no, omitir
  );
});
```
> Si hoy **no** se guarda quién generó la compra, agregá `generadaPor: selfId` al crear la instancia
> (en `generarInstanciaCompraRapida`) para poder excluirlo. Si no, se notifica a los 4 (aceptable).

---

## PARTE 3 — Reglas de Firestore
```
match /config/pushTokens {
  allow read, write: if isFamilyMember();   // cada miembro escribe su token
}
// config/perfiles ya permite escritura de miembros (preferencias notif van ahí)
```
`firebase deploy --only firestore:rules,functions`.

---

## PARTE 4 — Setup (pasos manuales, documentar en README)
1. **Blaze**: subir el proyecto a plan Blaze (Firebase Console → Upgrade). Requerido para Functions.
2. **VAPID**: Console → Project settings → Cloud Messaging → Web Push certificates → generar par →
   pegar la clave pública en `VITE_FCM_VAPID_KEY`.
3. Deploy de functions + rules. Probar en Android/desktop (permiso en navegador) y en iPhone
   **instalado** (iOS 16.4+).

---

## Cierre
1. **MAPEO_FIRESTORE.md**: `config/pushTokens`, `PerfilMiembro.notif`, y opcional `Plan.generadaPor`.
   Documentar las 2 functions. Bump de versión.
2. **Tests**: `enviar.notificarFamilia` filtra por preferencia (mock de perfiles: uno con
   `notif.compras=false` no recibe la de compras) y excluye al generador; `push.ts` no rompe en
   navegadores sin soporte (`pushSoportado()` → false).
3. `npm test` verde, `npm run build` ok.
4. Pegar diff de `firebase-messaging-sw.js`, `push.ts`, `perfiles.ts`, `Perfil.tsx`, `models.ts`,
   `functions/src/*`, `firestore.rules`, README (setup).

```
git commit -m "E15.0: push FCM (comida + lista) con preferencias granulares por miembro + 2 Cloud Functions"
```

## Criterios de aceptación
1. En Perfil, "Activar notificaciones" pide permiso, guarda el token en `config/pushTokens` y
   muestra los toggles 🍽/🛒. Reemplaza el placeholder "Próximamente".
2. Publicar una **comida** dispara push a los 4 (que tengan el toggle de comida ON); tap → detalle.
3. Generar una **lista** dispara push a los demás (no al generador) con el toggle de compras ON;
   tap → `/compras`.
4. Un miembro con 🛒 OFF no recibe las de compras pero sí las de comida (y viceversa).
5. Funciona con la app cerrada en Android/desktop y en iPhone instalado (iOS 16.4+).
6. El flujo "Yo me encargo" y todo lo demás sigue igual; sin regresiones.
```
