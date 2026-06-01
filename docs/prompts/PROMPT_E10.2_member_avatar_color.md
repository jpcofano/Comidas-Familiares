# PROMPT E10.2 — Avatares de miembro con color propio en el historial (y en toda la app)

> **Etapa 10 — Experiencia del miembro.** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **Depende de E10.1** (ya debe existir `PerfilesProvider` + `useColorMiembro` + `config/perfiles`).
> **MAPEO vigente esperado:** v2.3.0 (post E10.1). Verificá el header y reportá.
> **Al terminar: commit + push (git == local).**

## Por qué

E10.1 dejó que cada miembro elija el color de su avatar (`config/perfiles`). Falta que ese color
**se vea donde aparece el miembro** — sobre todo en el **historial**, donde cada calificación
muestra el avatar de quien votó. Hoy `MemberAvatar` resuelve color por el token estático
`--member-{key}` (keyeado por nombre **normalizado**), así que ignora el color custom.

## Diagnóstico (pegar evidencia)
1. `MemberAvatar.tsx`: resuelve `PALETTE[normalize(name)].bg` (token `--member-*`). Recibe
   `name`, no `memberId`.
2. Llamadas en el historial:
   - `HistorialDetalle.tsx` filas de calificación: `<MemberAvatar name={NOMBRE_MIEMBRO[mid]} />`
     (tiene el `mid: MiembroId` a mano).
   - Tarjetas del listado (`components/historial/*`): confirmar si muestran avatar (hoy no) o solo
     "Tu nota".
3. `AvatarStack` (plan cards) y `Voto` también usan `MemberAvatar name=`.
4. Confirmar que E10.1 expone `useColorMiembro(memberId): string | undefined`.

## Cambios de código

### 1. `MemberAvatar` color-aware por `memberId`
- Agregar prop opcional **`memberId?: MiembroId`**. Si viene, el color sale de
  `useColorMiembro(memberId)` (custom) con fallback al token `--member-{memberId}`; si no, el
  comportamiento actual por `name` (sin romper llamadas existentes).
- Resolver el color en el componente (suscrito al provider) para que **re-renderice en realtime**
  cuando alguien cambia su color desde el perfil.
- Mantener inicial/`label` y tamaños como están. (Referencia de mecanismo en el prototipo:
  `MemberAvatar.jsx` usa un store con pub-sub + `useMemberColor(key)`; en el repo es el provider de E10.1.)

### 2. Pasar `memberId` donde lo tenemos
- **`HistorialDetalle.tsx`** (filas de calificación): `<MemberAvatar memberId={mid} name={NOMBRE_MIEMBRO[mid]} size={24} />`.
  Es el caso principal del pedido: cada nota muestra el avatar de su autor con su color.
- **`Voto`** (calificaciones): ídem, pasar `memberId`.
- **`AvatarStack`**: aceptar `memberIds?: MiembroId[]` paralelo a `names` (o resolver el id desde
  el nombre con el mismo normalize que ya usa) y pasar `memberId` a cada `MemberAvatar`. Así las
  plan cards también reflejan el color.

### 3. (Opcional, si las cards del listado no muestran avatar)
- Si el diseño lo pide, sumar el avatar del autor de la nota propia en la card del listado. **Solo
  si ya estaba previsto** — no inventar contenido nuevo. Si hoy muestran "Tu nota", dejarlo.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch: v2.3.0 → **v2.3.1**. Reportá versión.
2. Subsección `### 1.2.E10.2 Cambios en v2.3.1 (E10.2 — MemberAvatar con color propio)`: prop
   `memberId`, resolución por `useColorMiembro` con fallback al token, llamadas actualizadas en
   historial/voto/plan cards, realtime.
3. En §11 Lote 10, marcar **E10.2 ✅ HECHO (v2.3.1)**.
4. Registrar `**PROMPT_E10.2_member_avatar_color.md** ✅ CERRADO (v2.3.1)`.

## Criterio de aceptación
1. Cambiar el color de un miembro en su perfil actualiza su avatar **en las calificaciones del
   historial** (detalle) en realtime y persiste al recargar.
2. El mismo color se ve en las plan cards (AvatarStack) y en Voto.
3. Llamadas viejas de `MemberAvatar` sin `memberId` siguen funcionando (fallback al token).
4. Build + typecheck + tests verdes.
5. Pegá el diff de `MemberAvatar.tsx`, `HistorialDetalle.tsx`, `Voto*`, `AvatarStack` y la
   subsección 1.2.E10.2.

## Fuera de scope
- Agregar un campo "quién cocinó" al `Historial` (el modelo no lo tiene; sería migración aparte).
- Cambiar la lógica de cálculo de notas/promedios.

## Cierre
```
git add -A
git commit -m "E10.2: MemberAvatar con color propio (memberId + useColorMiembro) en historial/voto/plan cards + MAPEO v2.3.1"
git push
```
Confirmá push OK.
