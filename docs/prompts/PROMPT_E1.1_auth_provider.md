# PROMPT_E1.1 — Auth con Google + whitelist

> Segundo prompt de Etapa 1. Implementa autenticación con Google Sign-in, valida el mail contra la whitelist en `/config/familia`, crea/actualiza el doc `/users/{uid}`, y muestra un placeholder de home con saludo personalizado.
>
> Sin routing todavía (eso es E1.2). Sin layout completo (eso es E1.2). Esta etapa cierra el ciclo de auth end-to-end con la UI mínima necesaria para validarlo.
>
> Tareas a ejecutar por Claude Code en el repo `Comidas-Familiares`.

---

## Contexto

- **Etapa 0 cerrada**: Vite + React + TS scaffold, Firebase SDK inicializado en `src/firebase.ts`, hosting deployado en `comida-familiar.web.app`.
- **Etapa 1.0 cerrada**: docs `/config/familia` y `/config/diccionarios` poblados con datos reales en Firestore.
- **Google sign-in** ya habilitado en Firebase Authentication.
- **Firestore actual**: production mode, default deny-all (nadie puede leer/escribir desde el cliente todavía).
- **Fuente de verdad** del modelo: `docs/MAPEO_FIRESTORE.md`, especialmente §2.8 (`/config/familia`), §2.9 (`/users/{uid}`), §4.2 (Security Rules).

## Decisiones ya zanjadas

No cuestionar ni reinterpretar. Preguntar si algo no cuadra.

1. **Método de login**: `signInWithPopup` con `GoogleAuthProvider`. Si el navegador bloquea popups (mobile Safari), no manejar fallback todavía — lo hacemos cuando aparezca el problema.
2. **Sesión persistente**: `browserLocalPersistence` (default). Si hay sesión activa al cargar la página, auto-login sin pedir confirmación.
3. **Resolución de `memberId`**: en el cliente, leyendo `/config/familia` y recorriendo los arrays `miembros.{X}.mails`. Match case-insensitive sobre el `email` que devuelve Firebase Auth.
4. **Email no autorizado**: mostrar `UnauthorizedScreen` con el mensaje **"Esta app es de uso familiar privado. Tu mail no está autorizado."** y un botón **"Salir"** que hace signOut y vuelve a LoginScreen. **No** crear ningún doc en `/users` para usuarios no autorizados.
5. **Doc `/users/{uid}`**: lo crea/actualiza el cliente con `setDoc(..., { merge: true })`. Se setea en cada login (refresca `ultimoLogin`). `fechaPrimerLogin` se setea solo si el doc no existe.
6. **Sin React Router todavía**. El `App.tsx` switchea entre 4 estados (`loading | unauthenticated | unauthorized | authenticated`) con renders condicionales. El routing llega en E1.2.
7. **Sin design tokens detallados todavía**. UI minimalista con estilos inline aceptables. Lo prolijo viene en E1.2.
8. **Security Rules mínimas para esta etapa** (no las completas de §4.2 todavía):
   - `/config/{docId}`: read si `request.auth != null`, write solo Admin SDK (deny).
   - `/users/{uid}`: read/create/update si `request.auth.uid == uid`, delete deny.
   - Resto: deny.
   Las rules completas (con `resolveMemberId()` server-side) llegan en `PROMPT_E2.3`.

## Política de commits (importante)

A partir de este prompt, **un commit por tarea numerada**. No agrupar varias tareas en un commit.

- **Formato del mensaje**: `Stage 1.1: <descripción>` en inglés, modo imperativo. Ejemplos:
  - `Stage 1.1: add firestore rules for config and users`
  - `Stage 1.1: add AuthProvider with Google sign-in`
  - `Stage 1.1: add LoginScreen component`
- **Push solo al final** del prompt completo. No pushear cada commit (excepto si una tarea explícitamente lo pide).
- **Antes de cada commit**: `git status` para confirmar que no se incluye `service-account.json`, archivos `.env`, ni nada con credenciales.

---

## Prerequisitos del usuario (chequear antes de empezar)

1. **Dominios autorizados** en Firebase Auth. Andar a Console → Authentication → Settings → Authorized domains. Deben estar (vienen por default):
   - `localhost`
   - `comida-familiar.web.app`
   - `comida-familiar.firebaseapp.com`

Si alguno falta, agregarlo antes de correr el script.

---

## Tareas

### Tarea 1 — Configurar Firestore Rules deployable

**a)** Crear archivo `firestore.rules` en la raíz del proyecto con este contenido exacto:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // /config/* - read for any authenticated user, write only via Admin SDK
    match /config/{docId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // /users/{uid} - each user owns their own doc
    match /users/{uid} {
      allow read, create, update: if request.auth != null
                                  && request.auth.uid == uid;
      allow delete: if false;
    }

    // Everything else - explicit deny (will be opened up in PROMPT_E2.3)
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**b)** Modificar `firebase.json` para incluir la sección de Firestore. El archivo actual tiene solo `hosting`. Agregar:

```json
"firestore": {
  "rules": "firestore.rules"
}
```

El JSON final tiene `hosting` y `firestore` como hermanos.

**c)** Deployar las rules:

```bash
firebase deploy --only firestore:rules
```

Verificar que el output diga "Deploy complete!". Si falla, mostrarme el error.

**Commit**: `Stage 1.1: add minimal firestore rules for config and users`

---

### Tarea 2 — Definir types TypeScript

Crear `src/types/models.ts` con los types necesarios para esta etapa. NO definir todos los types del MAPEO ahora (los demás vienen en `PROMPT_E2.1`). Solo los que se usan en auth:

```typescript
import type { Timestamp } from "firebase/firestore";

/** ID de miembro de la familia. Estable (no cambia entre logins ni mails). */
export type MemberId = "juanpablo" | "maria" | "sofia" | "federico";

/** Rol del miembro (informativo, no afecta permisos en esta etapa). */
export type MemberRole = "padre" | "madre" | "hija" | "hijo" | "invitado";

/** Un miembro de la familia tal como vive en /config/familia.miembros[memberId]. */
export interface MemberInfo {
  nombre: string;
  rol: MemberRole;
  mails: string[];
}

/** Shape del doc /config/familia. */
export interface FamiliaConfig {
  miembros: Record<string, MemberInfo>;
  owner: string;
  timezone: string;
  semanaArrancaEn: string;
}

/** Shape del doc /users/{uid}. */
export interface UserDoc {
  uid: string;
  email: string;
  memberId: MemberId;
  nombre: string;
  rol: MemberRole;
  ultimoLogin: Timestamp;
  fechaPrimerLogin: Timestamp;
}
```

**Commit**: `Stage 1.1: add models for FamiliaConfig and UserDoc`

---

### Tarea 3 — Helper de resolución de `memberId`

Crear `src/auth/resolveMemberId.ts`. Función pura que dado un email y la config de familia, devuelve el `memberId` o `null`.

```typescript
import type { FamiliaConfig, MemberId } from "../types/models";

/**
 * Resolves the memberId for a given email by searching through
 * /config/familia.miembros[*].mails. Case-insensitive match.
 *
 * Returns null if the email is not authorized.
 */
export function resolveMemberId(
  email: string,
  familia: FamiliaConfig
): MemberId | null {
  const normalized = email.trim().toLowerCase();

  for (const [memberId, info] of Object.entries(familia.miembros)) {
    const matches = info.mails.some(
      (m) => m.trim().toLowerCase() === normalized
    );
    if (matches) {
      return memberId as MemberId;
    }
  }

  return null;
}
```

**Commit**: `Stage 1.1: add resolveMemberId helper`

---

### Tarea 4 — Helper de upsert de `/users/{uid}`

Crear `src/auth/upsertUserDoc.ts`. Función que crea/actualiza el doc `/users/{uid}` al login.

```typescript
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { MemberId, MemberInfo, UserDoc } from "../types/models";
import type { User } from "firebase/auth";

/**
 * Creates or refreshes the /users/{uid} document for the authenticated user.
 * - On first login: sets all fields including fechaPrimerLogin.
 * - On subsequent logins: updates email + ultimoLogin only (keeps fechaPrimerLogin
 *   and the original nombre/rol/memberId resolution).
 */
export async function upsertUserDoc(
  firebaseUser: User,
  memberId: MemberId,
  memberInfo: MemberInfo
): Promise<void> {
  const userRef = doc(db, "users", firebaseUser.uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    // Refresh email and ultimoLogin only. memberId is stable.
    await setDoc(
      userRef,
      {
        email: firebaseUser.email ?? "",
        ultimoLogin: serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }

  // First login: create full doc.
  const newDoc: Omit<UserDoc, "ultimoLogin" | "fechaPrimerLogin"> = {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? "",
    memberId,
    nombre: memberInfo.nombre,
    rol: memberInfo.rol,
  };

  await setDoc(userRef, {
    ...newDoc,
    ultimoLogin: serverTimestamp(),
    fechaPrimerLogin: serverTimestamp(),
  });
}
```

**Commit**: `Stage 1.1: add upsertUserDoc helper`

---

### Tarea 5 — AuthProvider con context

Crear `src/auth/AuthProvider.tsx` con un React Context que expone el estado de auth.

**Estados posibles** (modelarlo como union type):

```typescript
type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "unauthorized"; email: string }
  | { status: "authenticated"; user: UserDoc };
```

**Comportamiento:**

1. Al montar, escuchar `onAuthStateChanged` del SDK.
2. Cuando hay un user de Firebase:
   - Leer `/config/familia` (con `getDoc`).
   - Llamar a `resolveMemberId(user.email, familia)`.
   - Si devuelve `null` → estado `unauthorized` y `signOut()` del Firebase Auth.
   - Si devuelve un `memberId` válido → `upsertUserDoc()`, después `getDoc(/users/{uid})`, después estado `authenticated`.
3. Cuando no hay user → estado `unauthenticated`.
4. Mientras hace cualquier de los anteriores → estado `loading`.

Exponer en el context:
- `state: AuthState`
- `signIn(): Promise<void>` — invoca `signInWithPopup` con `GoogleAuthProvider`.
- `signOut(): Promise<void>` — invoca `signOut` del SDK.

Crear también `src/auth/useAuth.ts` con un hook simple:

```typescript
import { useContext } from "react";
import { AuthContext } from "./AuthProvider";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
```

**Commit**: `Stage 1.1: add AuthProvider context and useAuth hook`

---

### Tarea 6 — LoginScreen

Crear `src/auth/LoginScreen.tsx`. Pantalla simple con:

- Título grande: **"Comida Familiar"**
- Subtítulo: **"Planificación semanal de comidas para la familia Cofano"**
- Botón: **"Entrar con Google"** que llama a `signIn()` del context.

Estilos inline aceptables. Centrado vertical y horizontal. Fondo limpio.

Si `signIn()` falla (popup blocked, usuario cancela, etc), capturar el error y mostrarlo bajo el botón. No es bonito todavía, alcanza con `<p style={{color: 'red'}}>{error.message}</p>`.

**Commit**: `Stage 1.1: add LoginScreen with Google sign-in button`

---

### Tarea 7 — UnauthorizedScreen

Crear `src/auth/UnauthorizedScreen.tsx`. Pantalla con:

- Mensaje: **"Esta app es de uso familiar privado. Tu mail no está autorizado."**
- Subtexto chico mostrando qué mail se intentó: `"Mail intentado: {email}"`
- Botón **"Salir"** que llama a `signOut()` del context.

Mismo estilo minimalista que LoginScreen.

**Commit**: `Stage 1.1: add UnauthorizedScreen for non-whitelisted users`

---

### Tarea 8 — Wiring en `App.tsx` y `main.tsx`

**a)** Modificar `src/main.tsx` para envolver `<App />` con `<AuthProvider>`:

```typescript
import { AuthProvider } from "./auth/AuthProvider";
// ...
<AuthProvider>
  <App />
</AuthProvider>
```

**b)** Reemplazar el contenido completo de `src/App.tsx` por:

```typescript
import { useAuth } from "./auth/useAuth";
import { LoginScreen } from "./auth/LoginScreen";
import { UnauthorizedScreen } from "./auth/UnauthorizedScreen";

function App() {
  const { state, signOut } = useAuth();

  if (state.status === "loading") {
    return <div style={{ padding: 32 }}>Cargando…</div>;
  }

  if (state.status === "unauthenticated") {
    return <LoginScreen />;
  }

  if (state.status === "unauthorized") {
    return <UnauthorizedScreen email={state.email} />;
  }

  // authenticated — placeholder home for this stage
  return (
    <div style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <h1>Comida Familiar</h1>
      <p>Hola, <strong>{state.user.nombre}</strong> 👋</p>
      <p style={{ color: "#888", fontSize: 14 }}>
        memberId: <code>{state.user.memberId}</code><br />
        rol: <code>{state.user.rol}</code>
      </p>
      <button onClick={signOut} style={{ marginTop: 24 }}>
        Cerrar sesión
      </button>
    </div>
  );
}

export default App;
```

**Commit**: `Stage 1.1: wire AuthProvider in main.tsx and reorganize App.tsx`

---

### Tarea 9 — Verificación local

Levantar el dev server:

```bash
npm run dev
```

**No commitear** todavía. Pedir al usuario (JP) que verifique manualmente lo siguiente en `http://localhost:5173/`:

1. Aparece LoginScreen con título, subtítulo y botón.
2. Click en "Entrar con Google" → abre popup → usuario elige una cuenta autorizada (ej. `jpcofano@gmail.com`) → ve "Hola, Juan Pablo" con su memberId y rol.
3. Click en "Cerrar sesión" → vuelve a LoginScreen.
4. Click en "Entrar con Google" otra vez con un mail random (cuenta personal de Code Devuelve un mail no autorizado, por ej cualquier @gmail.com ajeno) → ve UnauthorizedScreen con el mensaje correcto.
5. Click en "Salir" → vuelve a LoginScreen.
6. Re-loguear con un mail autorizado → auto-login (si el navegador conserva la sesión, debería entrar directo sin popup la próxima vez que abras la pestaña).

**Para JP:** verificar también en Firebase Console → Firestore que aparezca `/users/{tu-uid}` con todos los campos del shape de §2.9 y los timestamps poblados.

**Si todo OK:** proceder a Tarea 10.
**Si algo falla:** pegarme el error/observación y diagnosticar.

---

### Tarea 10 — Build y deploy a producción

```bash
npm run build
firebase deploy --only hosting
```

Verificar visualmente en `https://comida-familiar.web.app` que el flow funciona en vivo (no solo localhost).

**Commit**: `Stage 1.1: deploy auth flow to production`

---

### Tarea 11 — Push final

```bash
git status     # confirmar que NO está service-account.json ni nada raro
git log --oneline -15
git push
```

El `git log` es para que JP vea la cadena de commits de Stage 1.1 antes de pushear.

---

## Criterios de aceptación

Todos deben cumplirse para considerar `PROMPT_E1.1` cerrado:

1. ✅ `firestore.rules` existe y está deployado. Se puede verificar en Firebase Console → Firestore → Rules.
2. ✅ `firebase.json` tiene la sección `firestore`.
3. ✅ Carpeta `src/auth/` con 5 archivos: `AuthProvider.tsx`, `useAuth.ts`, `LoginScreen.tsx`, `UnauthorizedScreen.tsx`, `resolveMemberId.ts`, `upsertUserDoc.ts`.
4. ✅ Carpeta `src/types/` con `models.ts`.
5. ✅ Login con mail autorizado funciona y crea/actualiza `/users/{uid}`.
6. ✅ Login con mail no autorizado muestra UnauthorizedScreen y NO crea ningún doc.
7. ✅ Auto-login funciona al recargar la página con sesión activa.
8. ✅ `npm run dev` sin warnings ni errores de TypeScript.
9. ✅ `npm run build` exitoso, deploy a producción funciona en vivo.
10. ✅ Historial de commits con al menos 8 commits con prefijo `Stage 1.1:`.

---

## Qué NO tocar

- **NO modificar** `/config/familia` ni `/config/diccionarios`. Esos datos ya están bien (Etapa 1.0).
- **NO crear** colecciones `/recetas`, `/planes`, `/menus`, etc. Vienen en Etapa 2.
- **NO instalar** React Router todavía. Es el siguiente prompt (E1.2).
- **NO portar** los design tokens completos de `Styles.html`. Eso es E1.2.
- **NO escribir** las Security Rules completas de §4.2 (con `resolveMemberId()` server-side). Solo las mínimas de Tarea 1.
- **NO crear** Cloud Functions. Plan Spark, todo desde cliente.
- **NO commitear** `service-account.json` ni ningún archivo de credenciales.

---

## Para JP, después de cerrar el prompt

Cuando todo cumpla los criterios de aceptación:

1. **Verificá en producción** entrando desde tu celular a `https://comida-familiar.web.app`. Es buena práctica probar el flow en un dispositivo nuevo (sin sesión previa) para asegurarte que el primer login funciona limpio.
2. **Pedile a un miembro de la familia** (ej. María) que pruebe a entrar desde su celu con su cuenta Google. Si entra y ve "Hola, María", la whitelist funciona end-to-end. Si lo hace desde Accenture y desde Gmail personal, los dos mails resuelven a `maria` (verás dos docs en `/users/{uid}` distintos pero ambos con `memberId: maria` — eso es esperado, ver MAPEO §2.9).
3. **Anotame qué problemas aparezcan** (si los hay). Cosas típicas: popup bloqueado en mobile Safari, "Account chooser" molesto cuando hay varias cuentas Google, etc. Se resuelven en un mini-prompt de cleanup.

Si todo OK, arrancamos `PROMPT_E1.2_layout_routing.md` (la última parte de Etapa 1: layout base + React Router + design system portado de `Styles.html`).
