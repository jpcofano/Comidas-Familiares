# PROMPT_E1.0 — Bootstrap de `/config` en Firestore

> Primer prompt de Etapa 1. Crea los documentos de configuración (`/config/familia` y `/config/diccionarios`) en Firestore vía Admin SDK con un script one-off idempotente.
>
> **Sin esto, ningún miembro puede loguearse** — la whitelist y los diccionarios no existen todavía.
>
> Tareas a ejecutar por Claude Code en el repo `Comidas-Familiares`.

---

## Contexto

- Proyecto Firebase ya creado: `comida-familiar`.
- Firestore ya habilitado en location `southamerica-east1` (modo production).
- Authentication ya habilitado (Google sign-in).
- Hosting ya deployado en `https://comida-familiar.web.app` (Etapa 0 cerrada).
- El cliente Firebase (`src/firebase.ts`) ya inicializa el SDK web. Lo que falta es poblar `/config/*` con datos reales antes de implementar la auth.
- Fuente de verdad del modelo de datos: `docs/MAPEO_FIRESTORE.md`, secciones **§2.7** y **§2.8**.

## Decisiones ya zanjadas

No cuestionar ni discutir estos puntos. Si algún detalle no cuadra con tu intuición, preguntar primero, no improvisar.

1. **Lenguaje del script**: TypeScript ejecutado con `tsx` (`npx tsx scripts/bootstrap-config.ts`). NO compilar a JS.
2. **SDK**: `firebase-admin` (server-side), NO el SDK web de cliente. El Admin SDK bypassa Security Rules.
3. **Credenciales**: service account JSON descargado por el usuario y guardado en `scripts/service-account.json`. El path está hardcodeado.
4. **Idempotencia**: el script debe poder correrse N veces sin romper nada. Si los docs ya existen, los **sobreescribe completamente** (usar `.set()` sin `merge`). Esto es OK porque los docs de `/config/*` son nuestra fuente de verdad — no contienen estado mutable del usuario.
5. **Estructura del proyecto**: el script vive en `scripts/bootstrap-config.ts`. Crear esa carpeta si no existe.
6. **Idioma**: comentarios en inglés, strings de dominio en castellano (nombres de miembros, valores de diccionarios).
7. **Dependencias**: `firebase-admin` y `tsx` van como **devDependencies** (no las usa el cliente en producción).
8. **El service account JSON NO se commitea**. Hay que asegurarse de que esté en `.gitignore`.

---

## Prerequisitos del usuario (chequear antes de empezar)

Antes de ejecutar el script, el usuario debe haber:

1. Ido a Firebase Console → Project Settings (engranaje) → pestaña **Service accounts** → botón **"Generate new private key"**.
2. Descargado el archivo JSON resultante.
3. Renombrado a `service-account.json` y guardado en `scripts/service-account.json` del repo local.

Si el archivo no existe cuando se corre el script, el script debe **fallar con un mensaje claro** explicando estos pasos. NO seguir adelante sin las credenciales.

---

## Tareas

### 1. Verificar y configurar `.gitignore`

Asegurar que `scripts/service-account.json` y `**/*-service-account*.json` estén en `.gitignore`. Si no están, agregarlos. Esto es **crítico para seguridad**: si el service account se filtra a GitHub público, cualquiera tiene acceso administrativo al proyecto Firebase.

### 2. Instalar dependencias

Agregar como devDependencies (`npm install -D ...`):

- `firebase-admin` (latest stable)
- `tsx` (latest stable)

NO agregar a dependencies de producción.

### 3. Crear `scripts/bootstrap-config.ts`

Un único archivo TypeScript que:

**a) Importe el Admin SDK y inicialice la app:**

```typescript
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
```

Lee el service account de `scripts/service-account.json`. Si no existe, imprime un mensaje claro al stderr explicando cómo generarlo y sale con código 1.

**b) Defina los datos exactamente como se especifican en MAPEO_FIRESTORE §2.7 y §2.8.**

Para `/config/familia` (§2.8):

```typescript
const familia = {
  miembros: {
    juanpablo: {
      nombre: "Juan Pablo",
      rol: "padre",
      mails: ["jpcofano@gmail.com"]
    },
    maria: {
      nombre: "María",
      rol: "madre",
      mails: ["marialascano@gmail.com", "maria.lascano@accenture.com"]
    },
    sofia: {
      nombre: "Sofía",
      rol: "hija",
      mails: ["sofiacofano@gmail.com"]
    },
    federico: {
      nombre: "Federico",
      rol: "hijo",
      mails: ["fedecofano1@gmail.com"]
    }
  },
  owner: "juanpablo",
  timezone: "America/Argentina/Buenos_Aires",
  semanaArrancaEn: "lunes"
};
```

Para `/config/diccionarios` (§2.7):

```typescript
const diccionarios = {
  tiposItem: ["Receta principal", "Entrada", "Guarnición", "Postre",
              "Panificado", "Snack", "Desayuno", "Conserva",
              "Hidrato opcional", "Componente"],
  proteinas: ["Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado",
              "Mariscos", "Huevos", "Legumbres", "Mixta", "Vegetariana"],
  escenarios: ["Noche de a dos", "Cocina rápida", "Cena Especial", "Celebración"],
  climaPlato: ["Liviano", "Medio", "Potente"],
  pensadaPara: ["Especial", "Semana", "Cualquiera"],
  tiposPlan: ["Especial", "Especial extra", "En proceso"],
  ocasiones: ["Cena familiar", "Con invitados", "Cumpleaños", "Celebración", "Otra"],
  aptoNocheDeADos: ["Sí", "No", "Adaptable"],
  dificultades: ["Baja", "Media", "Media-alta", "Alta"],
  costos: ["Bajo", "Medio", "Medio/Alto", "Alto"],
  miembros: [
    { id: "juanpablo", nombre: "Juan Pablo", rol: "padre" },
    { id: "maria",     nombre: "María",      rol: "madre" },
    { id: "sofia",     nombre: "Sofía",      rol: "hija"  },
    { id: "federico",  nombre: "Federico",   rol: "hijo"  }
  ],
  estadosPlan: {
    activos: ["Elegida", "Compra pendiente", "Compra lista", "Cocinada"],
    finales: ["Evaluada"]
  },
  seccionesIngredientes: ["Principal", "Base de sabor", "Líquido de cocción",
                          "Condimentos", "Cocción", "Guarnición baja en hidratos",
                          "Opcional familia"],
  unidadesCanonicas: ["g", "kg", "ml", "l", "unidad", "unidades",
                      "cda", "cdta", "taza", "pizca", "gusto"],
  version: 1,
  ultimaActualizacion: Timestamp.now()
};
```

**Importante**: los strings en castellano deben tener tildes correctas y eñes en UTF-8. Verificar que el archivo se guarda en UTF-8.

**c) Escriba ambos docs con `.set()` (sin merge)**:

```typescript
await db.collection("config").doc("familia").set(familia);
await db.collection("config").doc("diccionarios").set(diccionarios);
```

**d) Imprima un log claro al stdout** de qué hizo:

```
✓ Conectado al proyecto: comida-familiar
✓ Escrito /config/familia (4 miembros: Juan Pablo, María, Sofía, Federico — 5 mails autorizados)
✓ Escrito /config/diccionarios (10 enums + miembros + estados + secciones + unidades)
✓ Bootstrap completo. Ahora ya pueden loguearse los miembros.
```

**e) Manejo de errores**: cualquier fallo (credenciales mal, red, permisos) se reporta con `console.error` y exit code 1. No swallowear errores silenciosamente.

### 4. Agregar un script a `package.json`

En `"scripts"`:

```json
"bootstrap:config": "tsx scripts/bootstrap-config.ts"
```

Esto permite correr `npm run bootstrap:config` en lugar del comando largo.

### 5. Documentar en el README

Agregar una sección en el README (después de "Setup desde cero") titulada **"Bootstrap de configuración (one-off)"** con instrucciones para el desarrollador. Incluir:

- Para qué sirve el script.
- Cómo generar el service account.
- Cómo correrlo.
- Que es idempotente (se puede correr varias veces si hace falta).
- Que NO se commitea el JSON.

### 6. Ejecutar el script y verificar

**No ejecutes el script si el service account no está en `scripts/service-account.json`.** Si no está, dejá el código todo listo pero indicale al usuario qué tiene que hacer.

Si el service account está, correlo:

```bash
npm run bootstrap:config
```

Y mostrá el output completo al usuario.

---

## Criterios de aceptación

1. ✅ `scripts/bootstrap-config.ts` existe y es TypeScript válido (sin errores de tipo).
2. ✅ `package.json` tiene `firebase-admin` y `tsx` en `devDependencies` y el script `bootstrap:config`.
3. ✅ `.gitignore` excluye `scripts/service-account.json`.
4. ✅ El README tiene la sección de bootstrap.
5. ✅ Al correr `npm run bootstrap:config` con el service account presente, los docs `/config/familia` y `/config/diccionarios` aparecen en Firestore con el shape exacto de MAPEO §2.7 y §2.8.
6. ✅ El script es idempotente: correrlo dos veces no rompe nada ni duplica datos.
7. ✅ Si el service account no existe, el script falla con un mensaje claro **antes** de intentar conectarse a Firebase.

### Verificación manual posterior al éxito

El usuario debe ir a [consola Firebase → Firestore](https://console.firebase.google.com/project/comida-familiar/firestore/data) y confirmar visualmente que:

- Existe colección `config` con docs `familia` y `diccionarios`.
- `familia.miembros.maria.mails` tiene **2 elementos** (Gmail + Accenture).
- `diccionarios.tiposItem` tiene **10 elementos** y empieza con "Receta principal".
- Las tildes y eñes se ven correctamente (no como `Mar\u00eda`).

---

## Qué NO tocar

- **NO modificar** `src/firebase.ts` ni nada en `src/`. Esto es solo trabajo de configuración, no de UI.
- **NO crear** colecciones `/recetas`, `/menus`, `/planes`, etc. Esas vienen en Etapa 2 con `PROMPT_E2.4_seeds_import.md`.
- **NO escribir** las Security Rules todavía. Las rules viejas (default deny-all de production mode) funcionan porque el Admin SDK las bypassa.
- **NO instalar** el SDK web de Firebase en `dependencies` por este prompt. Ya está instalado de Etapa 0.
- **NO crear** `/config/familia.mailsAutorizados` con el shape viejo (map plano). Usar la estructura nueva de §2.8 con `miembros: { id: { nombre, rol, mails: [...] } }`.

---

## Notas para el operador (JP)

Cuando Code termine, vas a tener que:

1. **Generar el service account** desde Firebase Console (instrucciones arriba).
2. Guardarlo en `scripts/service-account.json`.
3. Correr `npm run bootstrap:config`.
4. Verificar visualmente en la consola Firebase (link en criterios de aceptación).
5. Commit + push (el service account NO se va a subir porque está gitignored — verificá con `git status` que solo aparezcan los archivos nuevos del código, no el JSON).

Si todo OK, cerramos este prompt y arrancamos `PROMPT_E1.1_auth_provider.md`.
