# Resumen de sesión — 21/05/2026 (cierre)

## Contexto del proyecto

**App:** Comida Familiar Cofano — sistema de planificación semanal de comidas para 4 personas (JP, María, Sofía, Federico) con dieta keto/baja en hidratos.

**Repo:** `https://github.com/jpcofano/Comidas-Familiares` (**privado** desde hoy)
**Local:** `C:\Users\20243359679\OneDrive\Documentos\AppsScript\Comidas-Familiares`
**Proyecto Firebase:** `comida-familiar` (live en `https://comida-familiar.web.app`)

**Cuentas Anthropic:**
- Principal: `jpcofano@gmail.com`
- Alias Code: `jpcofano.ia@gmail.com` (whitelisted como alias de JP en `/config/familia.miembros.juanpablo.mails`)

**Stack:** Vite + React 19 + TypeScript + Firebase (Auth + Firestore + Hosting). Plan Spark gratis. Sin Cloud Functions.

---

## Estado al cerrar la sesión

| Etapa | Estado | Qué quedó hecho |
|---|---|---|
| **E0** | ✅ Cerrada | Vite scaffold, Firebase setup, repo, primer deploy |
| **E1.0** | ✅ Cerrada | `/config/familia` y `/config/diccionarios` poblados con script |
| **E1.1** | ✅ Cerrada | Auth + whitelist + `/users/{uid}` automático |
| **E1.2** | ✅ Cerrada | Layout + routing + 10 rutas placeholder |
| **E1.2.5** | ✅ Cerrada | Estilo B "Cocina cálida" + lucide-react + Inter + spacing tokenizado |
| **E2.1** | ✅ Cerrada | Types completos + helpers (canonical, parsers) + 56 tests Vitest verdes |
| **E2.2** | ⏳ **PRÓXIMO — prompt ya entregado, listo para ejecutar** | Data layer + hooks + realtime + offline + voto transaccional |

---

## Lo que se decidió en esta sesión (importante)

### Cambios al modelo (MAPEO v1.2 → v1.3)
1. **Realtime nativo** vía `onSnapshot` en planes activos y compras (ex §9.9 promovido a **§6.8**).
2. **Offline persistence multi-tab** del SDK con la API moderna `persistentLocalCache + persistentMultipleTabManager` (NO la legacy `enableIndexedDbPersistence`).
3. **Hooks genéricos** del data layer: `useDoc`, `useCollection`, `useCollectionRealtime`.
4. **Manejo de errores diferenciado**: reads tiran excepciones, writes devuelven `Result<T, AppError>`.
5. **`runTransaction` del voto** se entrega en E2.2 (no se difiere a E3.6).
6. Nota nueva en §5.2 explicando cuándo usar `onSnapshot` vs `getDocs`.

### Decisiones de organización
- **Repo movido a privado** en GitHub (hoy). No afecta deploys ni nada técnico.
- **Estructura de docs en el repo**: `docs/MAPEO_FIRESTORE.md` + `docs/prompts/PROMPT_*.md` + `docs/RESUMEN_SESIONES/`. Organización manual por JP.
- **Mails reales** se mantienen en los prompts (los chicos tienen 15 y 16, son cuentas Gmail normales sin problemas COPPA).

### Decisiones del prompt E2.2 (zanjadas al armarlo)
- Un módulo por colección: `recetas.ts`, `menus.ts`, `planes.ts`, `compras.ts`, `historial.ts`, `diccionarios.ts`.
- `voteAndCloseIfComplete(idPlan, miembroId, puntaje, comentario)` en `planes.ts` con `runTransaction` (implementa §3.7).
- `deriveMenuMetadata(menu)` en `menus.ts` (implementa §3.8).
- Sumabilidad de ingredientes en `compras.ts` con `aportes[]`.
- Helpers puros (`calcularPromedio`, `calcularResultadoTextual`, `agruparPorClaveCanonica`) viven en `src/lib/voto.ts` y `src/lib/compras.ts` para testeabilidad.
- IDs de historial: formato `HIST-yyyyMMddHHmmss-rand4`.
- NO se instala `react-firebase-hooks` — implementación propia.
- **TODO documentado en el código**: qué hacer con contadores al votar un plan de menú (no zanjado todavía — se decide en Etapa 3 o 4).

---

## Próximo paso concreto

### Para JP en la siguiente sesión

1. **Subir al repo** (si no lo hizo ya):
   - `docs/MAPEO_FIRESTORE.md` (v1.3) — está en `/mnt/user-data/uploads/MAPEO_FIRESTORE.md` del último chat.
   - `docs/prompts/PROMPT_E2.2_data_layer.md` — está en `/mnt/user-data/outputs/PROMPT_E2.2_data_layer.md` del último chat.
   - Commit + push (`Docs: add MAPEO v1.3 and PROMPT E2.2`).

2. **Pasar a Claude Code** con la instrucción habitual:
   > Ejecutá las tareas definidas en `docs/prompts/PROMPT_E2.2_data_layer.md`. Antes de cualquier cambio mostrame el diff y esperá confirmación. Un commit por tarea con los mensajes especificados. Push solo al final.

3. **Cuidado especial** durante el diff de `src/firebase.ts`: verificar que `firebaseConfig` (apiKey, projectId, etc.) NO se modifica, y que `app`/`auth`/`db` siguen siendo las exports. Code va a reemplazar `getFirestore(app)` por `initializeFirestore` con multi-tab cache.

4. **Cuando termine**, pasarle al chat de Claude:
   - `npm run test` completo (esperado: ~75-90 verdes).
   - `git log --oneline -20` (esperado: ~13-14 commits Stage 2.2).
   - DevTools → Application → IndexedDB con la base `firestore/...` creada.
   - Cualquier TODO marcado por Code.

### Para el siguiente chat de Claude principal

Decisión pendiente para Etapa 3-4: qué hacer con contadores al votar un plan de menú. Tres opciones:
- Status quo Apps Script (no tocar nada).
- Incrementar `vecesCocinada` en el menú.
- Incrementar `vecesCocinada` en todos los componentes obligatorios.

Mientras tanto, en `voteAndCloseIfComplete` hay un TODO documentado.

---

## Plan de prompts pendiente (MAPEO §7)

### Etapa 2 — restante
- ⏳ **E2.2** Data layer ← prompt entregado, listo para Code
- E2.3 Security Rules + tests con emulador
- E2.4 Seeds (78 recetas + migración componentes + 5 menús)
- E2.5 Importador de menús
- E2.6 Índices Firestore

### Etapa 3 — Funcionalidad core modo JP
E3.1 Home / E3.2 Listado recetas / E3.3 Detalle / E3.4 Compras / E3.5 Cocinar / E3.6 Evaluar

### Etapa 4 — Multi-miembro
Dashboard miembro + voto individual + cierre automático + asignaciones desde UI.

### Etapa 5 — Importador de recetas desde frontend

### Etapa 6 — PWA pulida (con Claude Design)
Íconos, splash, manifest, theme color, fullscreen iOS, offline service worker, push notifications. **Acá se rediseña identidad visual completa** (hoy es estilo B provisorio).

### Etapa 7 — Opcional
Dashboard historial avanzado (D.3), multi-semana, etc.

---

## Patrón de trabajo (recordatorio para el próximo chat)

### Política de commits con Code
- Un commit por tarea numerada del prompt.
- Prefijo `Stage X.Y:` siempre.
- Inglés, modo imperativo.
- Push al final del prompt.
- Verificar antes de cada `git add` que `scripts/service-account.json` NO esté en staging.

### Flujo Claude principal ↔ Claude Code
1. Claude (yo) escribe `PROMPT_EX.Y_xxx.md`.
2. JP lo baja, guarda en `docs/prompts/`, commitea al repo.
3. JP abre Claude Code apuntando al repo y pasa la instrucción de ejecutar el prompt.
4. Code ejecuta tarea por tarea, JP aprueba cada diff.
5. Al final: JP pasa `git log`, output de tests, screenshots a Claude principal para validar.

### Cosas que JP hace, NO Code
- Verificación visual en Firebase Console.
- Operaciones git con credenciales (auth GitHub).
- Decisiones de producto.
- Cambios de visibilidad de repo, generación de service accounts.

### Cómo retomar en chat nuevo
Mensaje de apertura tipo:
> Estoy retomando un proyecto. Te paso:
> 1. El último `RESUMEN_SESION_yyyy-mm-dd.md`.
> 2. El `MAPEO_FIRESTORE.md` (versión actual).
> Necesito que [TAREA CONCRETA].

NO pegar prompts viejos cerrados al chat nuevo salvo que la tarea actual dependa de ellos.

---

## Archivos entregados en esta sesión

Todos quedaron en `/mnt/user-data/outputs/` del chat 2026-05-21:

| Archivo | Estado |
|---|---|
| `MAPEO_FIRESTORE.md` (v1.2 → debería pasar a v1.3 en repo) | JP confirmar si lo actualizó |
| `PROMPT_E1.2.5_visual_polish.md` | ✅ ejecutado, E1.2.5 cerrada |
| `PROMPT_E2.2_data_layer.md` | ⏳ listo, no ejecutado todavía |
| `RESUMEN_SESION_2026-05-21_cierre.md` | este archivo |

---

## Para el próximo chat de Claude principal

Cuando JP abra chat nuevo, lo más probable es uno de estos dos casos:

**Caso A — E2.2 ya cerrada por Code**: JP pasa `git log`, tests, screenshots. Claude valida y arranca a escribir `PROMPT_E2.3_security_rules.md`. Para esto Claude necesita leer §4.2 del MAPEO y diseñar tests con el emulador de Firestore.

**Caso B — E2.2 frenada o con problemas**: JP pasa el problema concreto. Claude diagnostica y propone fix. Puede ser un patch al prompt o un mini-prompt de cleanup.
