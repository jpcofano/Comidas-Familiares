# PROMPT E2.3 — Security Rules + tests con emulador

> Etapa 2.3 del plan de migración (ver `MAPEO_FIRESTORE.md` §4 y §7.2).
> Pegar este archivo completo a Claude Code en la terminal del repo.

---

## 1. Contexto

El proyecto es la migración de **Comida Familiar** de Apps Script + Google Sheets a
Firebase + React + Vite. La fuente de verdad del modelo es `MAPEO_FIRESTORE.md`.

Estado del repo al arrancar este prompt:

- E1.0 a E1.2 cerradas: bootstrap de config, auth con Google + whitelist, layout + routing.
- E2.1 cerrada: types en `src/types/models.ts` + helpers de canonicalización.
- E2.2 cerrada: data layer completo (`src/data/*.ts`), `result.ts`, `firebase.ts`,
  hooks genéricos, 84 tests verdes, deploy a producción OK.
- E2.2.1 cerrada: headers COOP en `firebase.json` (la consola del navegador ya no
  emite warnings de Cross-Origin-Opener-Policy).

Esta etapa **no toca código de la app**. Es exclusivamente: definir las Security Rules
de Firestore, montar el emulador, escribir tests automatizados de las rules y deployar.

Hoy Firestore está corriendo con rules permisivas o de default — cualquier autenticado
puede leer/escribir. Esta etapa cierra esa puerta: la whitelist de `/config/familia`
pasa a ser la barrera real contra accesos externos.

---

## 2. Decisiones zanjadas (no re-litigar)

1. **Modelo de permisos**: el de `MAPEO_FIRESTORE.md` §4.1. Simple y permisivo
   *dentro* de la familia. La integridad fina (no votar plan `Evaluada`, no borrar
   receta con plan activo, etc.) se enforce en el cliente vía transacciones, **no**
   en las rules. Las rules solo controlan: ¿es un miembro de la whitelist? ¿es el owner?

2. **Resolución de identidad**: una rule helper `resolveMemberId()` lee
   `/config/familia`, toma `request.auth.token.email` y busca en qué miembro
   (`miembros.{key}.mails[]`) aparece ese email. Devuelve la key del miembro o null.

3. **Plan A vs Plan B de `resolveMemberId()`** — esto se decide DURANTE esta etapa,
   con el emulador en vivo:
   - **Plan A**: implementar `resolveMemberId()` con operaciones sobre el map y los
     arrays de mails (`keys()`, `filter()`, `hasAny()`, etc.), tal como en
     `MAPEO_FIRESTORE.md` §4.2.
   - **Plan B (fallback)**: si la sintaxis de Rules no permite expresar el recorrido
     del map de forma limpia, denormalizar a un map plano
     `mailToMember: { "jpcofano@gmail.com": "juanpablo", ... }` dentro de
     `/config/familia`, y que las rules hagan un lookup directo
     `familia.mailToMember[email]`.
   - **Criterio de decisión**: probá Plan A primero contra el emulador. Si después
     de un esfuerzo razonable (no más de ~30 min de iteración) la sintaxis del map
     no compila o no evalúa correctamente, pasá a Plan B. **Documentá en el reporte
     final cuál de los dos quedó y por qué.**
   - Si terminás en Plan B: agregá el campo `mailToMember` al doc `/config/familia`
     **vía `scripts/bootstrap-config.ts`** (extendé el script para que lo derive
     automáticamente del objeto `miembros`, así sigue siendo idempotente y la única
     fuente de verdad sigue siendo `miembros`). NO hardcodees el map en dos lugares.
     Después del cambio, corré `npm run bootstrap:config` para que el doc en
     producción quede actualizado.

4. **Comparación de emails case-insensitive**: los emails se comparan en minúsculas.
   Si Plan A no permite `lower()` sobre los elementos del array de forma práctica,
   se asume que los mails en `/config/familia` ya están en minúsculas (lo están) y
   se normaliza el `request.auth.token.email` a minúsculas antes de comparar.

5. **`firestore.rules` es un archivo nuevo en la raíz del repo.** `firebase.json` ya
   apunta a él (`"firestore": { "rules": "firestore.rules" }`) — verificá que el path
   coincida, no lo cambies si ya está bien.

6. **Tests de rules**: con `@firebase/rules-unit-testing` corriendo contra el
   emulador de Firestore. Es una dependencia de desarrollo nueva. Los tests de rules
   van en su propio archivo/carpeta y NO se mezclan con los 84 tests de lógica pura
   de E2.2 (esos no necesitan emulador; estos sí).

7. **Idioma**: inglés en infraestructura (nombres de tests, helpers de test),
   español en el dominio. Igual que el resto del repo.

---

## 3. Tareas

### 3.1 Crear `firestore.rules`

En la raíz del repo, creá `firestore.rules` con `rules_version = '2'` implementando
el modelo de `MAPEO_FIRESTORE.md` §4.1 / §4.2:

- Helper `resolveMemberId()` (Plan A; si no, Plan B — ver decisión 3).
- Helper `isFamilyMember()`: `request.auth != null && resolveMemberId() != null`.
- Helper `isOwner()`: es family member **y** `resolveMemberId()` coincide con
  `familia.owner`.
- `match /recetas/{id}`, `/menus/{id}`, `/planes/{id}`, `/historial/{id}`:
  `allow read, write: if isFamilyMember()`.
- `match /compras/{id}` + subcollection `match /items/{itemId}`:
  `allow read, write: if isFamilyMember()` en ambos niveles.
- `match /config/{docId}`: `allow read: if isFamilyMember()`;
  `allow write: if isOwner()`.
- `match /users/{uid}`:
  - `read`: `request.auth != null && request.auth.uid == uid`.
  - `create`: `request.auth.uid == uid && isFamilyMember()`.
  - `update`: `(request.auth.uid == uid || isOwner()) && isFamilyMember()`.
  - `delete`: `isOwner()`.
- **Default deny**: cualquier path no contemplado queda denegado (es el comportamiento
  por defecto de Rules v2 — no agregues un `match /{document=**}` permisivo).

### 3.2 Configurar el emulador de Firestore

- Agregá la sección `emulators` a `firebase.json` con el emulador de Firestore
  (y Auth si hace falta para los tests). Puerto estándar de Firestore (8080) salvo
  conflicto. Incluí el `ui` del emulator suite.
- Si hace falta, ajustá/creá `.firebaserc` para que apunte al proyecto `comida-familiar`.
- Asegurate de que `firebase emulators:start` levante sin pedir login interactivo
  (los tests deben poder correr offline contra el emulador).

### 3.3 Tests de rules

- Instalá `@firebase/rules-unit-testing` como `devDependency`.
- Creá los tests de rules en una ubicación clara y separada de los tests de E2.2
  (ej. `tests/rules/firestore.rules.test.ts` o `src/__tests__/rules/` — seguí la
  convención que ya use el repo para tests).
- Los tests deben cargar `firestore.rules`, sembrar un `/config/familia` de prueba
  con los 4 miembros (usá los datos reales de `MAPEO_FIRESTORE.md` §2.8: `juanpablo`,
  `maria`, `sofia`, `federico`, con sus mails; `owner: "juanpablo"`), y cubrir
  **como mínimo** estos casos:

  **Acceso de externos:**
  - Usuario sin autenticar → denegado read y write en `/recetas`, `/planes`,
    `/config/familia`, `/users/*`.
  - Usuario autenticado con un email que NO está en la whitelist → denegado read y
    write en todas las colecciones de dominio.

  **Acceso de miembros (whitelist):**
  - Miembro autenticado (ej. María con `marialascano@gmail.com`) → puede read y write
    en `/recetas`, `/menus`, `/planes`, `/historial`, `/compras` y
    `/compras/{id}/items`.
  - Miembro con un alias secundario (María con `maria.lascano@accenture.com`) →
    también pasa la whitelist (verifica que el recorrido de arrays de mails funciona).
  - Miembro autenticado → puede read en `/config/diccionarios` y `/config/familia`,
    pero NO puede write en `/config/*` si no es el owner.

  **Owner:**
  - JP (owner) → puede write en `/config/familia` y `/config/diccionarios`.
  - Un miembro no-owner (ej. Sofía) → denegado write en `/config/*`.

  **`/users/{uid}`:**
  - Un miembro puede read/create/update su propio doc `/users/{suUid}`.
  - Un miembro NO puede read el doc `/users/{uid}` de otro miembro.
  - El owner puede update el doc de otro miembro; un no-owner no.
  - Solo el owner puede delete un doc de `/users`.

- Si terminaste en Plan B, los tests deben sembrar el `/config/familia` con el campo
  `mailToMember` incluido (derivado de `miembros`, igual que hace el script).

### 3.4 Script de test

- Agregá un script en `package.json` para correr los tests de rules contra el
  emulador. Patrón habitual: `firebase emulators:exec --only firestore "<runner de tests de rules>"`,
  de modo que levante el emulador, corra los tests y lo apague solo.
- Nombrá el script de forma que NO pise `npm run test` (los 84 tests de E2.2).
  Ej. `test:rules`. Opcionalmente un `test:all` que corra ambos.
- `npm run test` (E2.2, sin emulador) debe seguir dando 84/84 verde, intacto.

### 3.5 Deploy de las rules

- Una vez que todos los tests de rules pasen, deployá **solo** las rules:
  `firebase deploy --only firestore:rules`.
- **NO** deployes hosting ni nada más en esta etapa.
- Después del deploy, verificá en el reporte que el deploy reportó éxito.

### 3.6 Verificación de no-regresión de la app real

- Importante: al activar las rules en producción, la app real
  (`https://comida-familiar.web.app`) debe seguir funcionando para los miembros
  logueados. El doc `/config/familia` en producción tiene que existir y tener la
  forma que las rules esperan.
- Si en Plan B agregaste `mailToMember`, confirmá que corriste
  `npm run bootstrap:config` para que producción tenga el campo nuevo **antes** de
  deployar las rules (si deployás las rules primero y el doc no tiene `mailToMember`,
  todos los logins se rompen).
- En el reporte, dejá indicado el orden exacto en que hiciste las cosas.

---

## 4. Criterios de aceptación

1. `firestore.rules` existe en la raíz, con `rules_version = '2'` y el modelo §4.1.
2. El emulador de Firestore levanta con `firebase emulators:start` sin login
   interactivo.
3. `@firebase/rules-unit-testing` está en `devDependencies`.
4. Existe un archivo de tests de rules, separado de los tests de E2.2.
5. Todos los casos del punto 3.3 están cubiertos y pasan en verde.
6. `npm run test:rules` (o el nombre elegido) corre el emulador, ejecuta los tests
   y lo apaga, terminando en verde.
7. `npm run test` sigue dando 84/84 verde, sin cambios.
8. `npm run build` sin errores.
9. `firebase deploy --only firestore:rules` reportó éxito.
10. El reporte final indica explícitamente si quedó **Plan A** o **Plan B** y por qué.
11. Commits con prefijo `Stage 2.3:` + push.

---

## 5. Qué NO tocar

- **Nada de `src/data/*`, `src/firebase.ts`, `src/lib/result.ts`, hooks**: el data
  layer de E2.2 está cerrado. Esta etapa no modifica lógica de app.
- **Los 84 tests de E2.2**: no se editan, no se renombran, no se mueven.
- **`firebase.json` → `hosting`**: la sección de hosting y los headers COOP de
  E2.2.1 quedan intactos. Solo se agrega la sección `emulators` y se verifica
  `firestore.rules`.
- **`scripts/bootstrap-config.ts`**: solo se toca SI se va a Plan B (para derivar
  `mailToMember`). Si quedás en Plan A, no se toca.
- **Componentes React, routing, layout**: fuera de scope total.
- **`firestore.indexes.json`**: los índices son E2.6, no esta etapa.

---

## 6. Antes de cerrar — reporte esperado

Devolveme un resumen con:

- Tabla de criterios de aceptación (1–11) con estado.
- Plan A o Plan B, y el motivo de la decisión.
- Si fue Plan B: confirmación de que `bootstrap-config.ts` se extendió y se corrió
  contra producción antes del deploy de rules.
- El orden exacto de los pasos finales (bootstrap → deploy rules → verificación).
- Cualquier TODO que haya quedado, marcado en código con `// TODO`.
- Lista de commits `Stage 2.3:`.
- Recordatorio para JP: probar en `https://comida-familiar.web.app` que el login y
  la navegación siguen funcionando con las rules activas.
