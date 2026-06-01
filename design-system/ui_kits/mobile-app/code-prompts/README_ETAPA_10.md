# Etapa 10 — "Experiencia del miembro"

Prompts del ciclo post-Lote 9. **Cada prompt:** toca código, actualiza `docs/MAPEO_FIRESTORE.md`
y al terminar **commitea + pushea** (local = git).

## Estado de entrada
- **MAPEO ≥ v2.2.2** — Lote 9 completo (E9.1–E9.10). Falta correr E9.9 (acceso miembros) y E9.10
  (tarjetas-filtro del Historial) si aún no se aplicaron.

## Lote 10 — eje `E10.x`

| Prompt | Qué hace | Estado |
|---|---|---|
| **E10.1** | Perfil de miembro (color de avatar, preferencias, stats, notif placeholder) | ⬜ a ejecutar |
| **E10.2** | Avatares de miembro con color propio en historial/voto/plan cards | ⬜ a ejecutar (dep. E10.1) |
| **E10.3** | Importador Paso 2 a tokens (arreglar dark mode) | ⬜ a ejecutar |

> Decisiones tomadas: entrada por el avatar del header · cada uno ve el suyo, JP ve todos
> (selector) · cada miembro edita su color + preferencias · **sin alta/baja de miembros** ·
> notificaciones solo placeholder · **layout: hero** (descartado compacto).

## Diseñado en el prototipo (`ui_kits/mobile-app/`)
- **`PerfilScreen.jsx`** (E10.1) — perfil hero, selector de miembro (JP), color picker,
  preferencias editables, stats, mini-historial, notif placeholder.
- **`Header.jsx`** — avatar clickeable (→ perfil) + color/inicial dinámicos.
- **`MemberAvatar.jsx`** (E10.2) — color-aware vía store con pub-sub (`window.__memberColorStore`)
  + `useMemberColor`; App publica los colores de `perfiles`. En el repo el equivalente es el
  `PerfilesProvider`/`useColorMiembro` de E10.1, keyeado por `memberId`.
- **`ImportarRecetaScreen.jsx`** (E10.3) — Paso 2 ya íntegro en tokens (referencia para portar el
  repo, que tiene hardcodeos).
- Tweak `perfilLayout` (hero / compacto) para comparar.
