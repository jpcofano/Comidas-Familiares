# Resumen de sesión — 21/05/2026

## Contexto del proyecto

**App:** Comida Familiar Cofano — sistema de planificación semanal de comidas para 4 personas (JP, María, Sofía, Federico) con dieta keto/baja en hidratos.

**Repo:** `https://github.com/jpcofano/Comidas-Familiares` (local en `C:\Users\20243359679\OneDrive\Documentos\AppsScript\Comidas-Familiares`)

**Proyecto Firebase:** `comida-familiar` (live en `https://comida-familiar.web.app`)

**Cuenta principal Anthropic:** `jpcofano@gmail.com`
**Cuenta alias (Code corriendo bajo esta):** `jpcofano.ia@gmail.com` (whitelisteada en `/config/familia.miembros.juanpablo.mails` como alias de JP — funciona en la app real)

**Stack:** Vite + React 19 + TypeScript + Firebase (Auth + Firestore + Hosting). Sin Cloud Functions por ahora (plan Spark gratis).

---

## Estado actual (qué está cerrado y deployado)

| Etapa | Estado | Qué quedó hecho |
|---|---|---|
| **E0** | ✅ Cerrada | Vite scaffold, Firebase setup (Firestore en `southamerica-east1`, Auth Google, Hosting), repo en GitHub, primer deploy |
| **E1.0** | ✅ Cerrada | `scripts/bootstrap-config.ts` crea `/config/familia` (con miembros + arrays de mails para aliases) y `/config/diccionarios` |
| **E1.1** | ✅ Cerrada | AuthProvider + useAuth + LoginScreen + UnauthorizedScreen + creación auto de `/users/{uid}` al login. Whitelist por arrays de mails funcionando |
| **E1.2** | ✅ Cerrada | Tokens CSS portados de Apps Script (`Styles.html`), AppShell (header + main + bottom nav), 4 botones nav (Inicio / Biblioteca / Compras / Historial), Biblioteca con tabs Recetas/Menús, 10 rutas con placeholders, detección desktop/touch |
| **E1.2.5** | ✅ Cerrada | Estilo B "Cocina cálida" (marrón `#8a4a2f` + crema `#fdfaf6`), lucide-react para íconos, Inter, escala de spacing tokenizada, themeability extrema (todo en CSS variables) |
| **E2.1** | ✅ Cerrada | Types completos en `src/types/models.ts` + helpers `src/lib/canonical.ts` (normalizeText, canonicalizarIngrediente, SINONIMOS_INGREDIENTES) + parsers permisivos `src/lib/parsers.ts` (parseNumber, parseTime, parseDificultad, parseCosto, parseSiNo) + 56/56 tests Vitest |
| **E2.2** | ⏳ Próximo | Data layer (un módulo por colección): `recetas.ts`, `planes.ts`, `compras.ts`, `historial.ts`, `menus.ts`, `diccionarios.ts` |

**Total commits Stage 2.1:** 15 (verificado en `git log`)

---

## Decisiones zanjadas (clave para no re-discutir)

### Modelo de datos
- **camelCase español** en todos los campos (`tipoPlan`, `nombreSeleccion`, `vecesCocinada`).
- **IDs human-readable**: `REC-XXXX`, `MENU-XXXX`, `PLAN-yyyyMMdd-timestamp`, `LST-SEM-yyyyMMdd-HHmmss`.
- **Modelo M** (clave): los menús son **composiciones livianas** que referencian recetas en `/recetas`. NO duplican tiempos/dificultad/etc — se derivan al vuelo con `deriveMenuMetadata()` (MAPEO §3.8).
- **Sin `tipoItem: "Componente"`** y **sin `elegibleSemana`** — las recetas que eran componentes pasan a su tipo real (Entrada, Receta principal, Postre, etc) en el seeding de E2.4.
- **Subcollections**: solo `/compras/{idLista}/items/{itemId}` (para toggle "Ya tengo" atómico). Ingredientes y pasos van **embebidos** en el doc de receta. menuItems van **embebidos** en el menú.
- **Historial** como colección plana global (no subcollection).
- **Votos y comentarios como maps** en el plan (no 4 columnas).
- **Voto + cierre automático**: una sola `runTransaction` del cliente (MAPEO §3.7) — sin Cloud Functions.

### Reglas de elegibilidad
- **Especial**: solo `tipoItem === "Receta principal"`.
- **Especial extra / En proceso**: cualquier receta.
- **Cocinar extras al marcar Cocinada la Especial**: mantenemos el comportamiento de Apps Script (modal pregunta).

### Familia (`/config/familia`)
- Whitelist por arrays de mails — aliases se agregan editando Firestore desde la consola, **sin redeploy**.
- JP: `jpcofano@gmail.com`, `jpcofano.ia@gmail.com`
- María: `marialascano@gmail.com`, `maria.lascano@accenture.com`
- Sofía: `sofiacofano@gmail.com`
- Federico: `fedecofano1@gmail.com`

### UX / Layout
- Header: avatar circular con inicial sobre `#8a4a2f` (estilo B), nombre del miembro, menú con logout.
- Bottom nav 4 botones: Inicio / Biblioteca / Compras / Historial.
- Biblioteca con tabs Recetas/Menús. Botón "+ Importar" visible **solo para JP**.
- Mobile-first, max-width 720px en desktop.
- **Identidad visual final** se rediseña en **Etapa 6 con Claude Design** (no antes — todo es provisional pero portable porque vive en CSS variables).

### Mejoras sobre Apps Script (ya planificadas)
- §6.1 Ingredientes sumables en lista de compras (canonicalizarIngrediente + unidades canónicas).
- §6.2 Atomicidad del voto (`runTransaction`).
- §6.3 Comentarios por miembro snapshoteados en historial.
- §6.4 Offline-first vía cache local del SDK.
- §6.5 Filtros con campos numéricos derivados (`tiempoTotalMin`, `dificultadOrden`, `costoOrden`).
- §6.6 Whitelist robusta vía Firebase Auth (no URL param).
- §6.7 Menús como composiciones vivas (Modelo M).
- **§6.8 (nueva en v1.3)** Realtime en planes activos + compras vía `onSnapshot`.

### E2.2 — decisiones recién zanjadas (esta sesión)
- **Estructura**: un módulo por colección (`src/data/recetas.ts`, `planes.ts`, etc) — ya estaba en el MAPEO §7.2.
- **Realtime**: usar `onSnapshot` desde el principio en **planes activos** y **compras**. Snapshot único para recetas, menús, historial, config. **Esto cambia el MAPEO: §9.9 → §6.8.**
- **Hooks vs funciones puras**: opción C — funciones puras + hooks genéricos `useDoc` / `useCollection` / `useCollectionRealtime` que cubren el 80% de los componentes.
- **Manejo de errores**: opción C — excepciones en reads, `Result<T, Error>` en writes (feedback claro al usuario).
- **`runTransaction` del voto**: se incluye en `planes.ts` desde E2.2 (no se difiere a E3.6).
- **Offline persistence del SDK** se activa en E2.2 (IndexedDB).

### Aliases en types
- E2.1 dejó `MemberId`/`MemberRole`/`MemberInfo` como aliases para retro-compat con `src/auth/`. Decisión: **dejar así** (los aliases son baratos, no es deuda real).

---

## Plan de prompts pendiente (MAPEO §7)

### Etapa 2 — Modelo de datos + Rules + Seeds
- ⏳ **E2.2** — Data layer (`src/data/*.ts`) ← **PRÓXIMO**
- E2.3 — Security Rules + tests con emulador
- E2.4 — Seeds de Firestore (78 recetas + migración componentes a tipo real + 5 menús)
- E2.5 — Importador de menús
- E2.6 — Índices Firestore

### Etapa 3 — Funcionalidad core modo JP
- E3.1 Home (Especial + extras + En proceso + resumen compras + acciones)
- E3.2 Listado de recetas con filtros
- E3.3 Detalle de receta
- E3.4 Compras (sumabilidad + "Ya tengo")
- E3.5 Cocinar (paso a paso + marcar Cocinada)
- E3.6 Evaluar (votos + datos cocinero)

### Etapa 4 — Multi-miembro
Dashboard miembro + voto individual + cierre automático al 4to + asignaciones desde UI.

### Etapa 5 — Importador de recetas desde frontend
Replicar flow Apps Script con todas las validaciones.

### Etapa 6 — PWA pulida (con Claude Design)
Íconos, splash screens, manifest completo, theme color, fullscreen iOS, offline service worker, eventualmente push notifications.

### Etapa 7 — Opcional
Dashboard historial avanzado (D.3), multi-semana, etc.

---

## Patrón de trabajo

### Política de commits
- Un commit por tarea numerada del prompt (no uno gigante por etapa).
- Prefijo `Stage X.Y:` siempre.
- Inglés, modo imperativo: `add X`, `fix Y`, `update Z`.
- Push al final del prompt, no por commit (salvo razón puntual).
- **Verificar antes de cada `git add`** que `scripts/service-account.json` NO esté en staging.

### Flujo con Claude Code
1. Claude (asistente principal) escribe `PROMPT_EX.Y_xxx.md` en este chat.
2. Usuario lo baja y guarda en `docs/prompts/`.
3. Usuario abre Claude Code apuntando al repo y le pasa: *"Ejecutá las tareas de docs/prompts/PROMPT_EX.Y_xxx.md. Mostrame diffs antes de cada cambio. Commit por tarea con los mensajes del prompt."*
4. Code ejecuta, usuario aprueba cada diff.
5. Al final: `git log --oneline` + screenshots/output al asistente para validar.

### Plan mode en Code
Code está corriendo en plan mode (modo conservador, pide aprobación de cada acción). Es esperado, no es bug. Probablemente activado porque la cuenta `jpcofano.ia@gmail.com` no tiene la misma config que la principal. No bloqueante.

### Cosas que el usuario hace, NO Code
- Verificación visual en Firebase Console (tildes, shapes anidados).
- Operaciones de git con credenciales (auth de GitHub).
- Decisiones de producto.

---

## Cosa importante para retomar en otra cuenta

**El MAPEO_FIRESTORE.md está en v1.2 en el repo. Hay que actualizarlo a v1.3** con los siguientes cambios antes de ejecutar E2.2:

1. Mover §9.9 "Lista de compras compartida en tiempo real" a **§6.8 "Realtime en planes y compras"** (ya no es futuro, se implementa en E2.2).
2. Agregar en §5.2 nota sobre cuándo usar `onSnapshot` vs `getDocs`:
   - Realtime: `/planes` de la semana activa, `/compras/{idLista}/items`.
   - Snapshot: `/recetas`, `/menus`, `/historial`, `/config/*`.
3. Agregar nota sobre habilitar offline persistence del SDK en `src/firebase.ts` (IndexedDB).
4. Actualizar §7.2 PROMPT_E2.2: describir hooks genéricos `useDoc`/`useCollection`/`useCollectionRealtime` + función `subscribeToPlanesActivos()` con `onSnapshot` en `planes.ts` + función `voteAndCloseIfComplete(idPlan, miembroId, puntaje, comentario)` con `runTransaction` en `planes.ts`.

---

## Próximo entregable

`PROMPT_E2.2_data_layer.md` — código de los 6 módulos del data layer + hooks genéricos + `runTransaction` del voto.

**Ya tengo decididas todas las preguntas previas. Si el siguiente chat retoma esto, lo único pendiente es:**
1. Bajar el MAPEO v1.3 actualizado.
2. Escribir y entregar PROMPT_E2.2.
