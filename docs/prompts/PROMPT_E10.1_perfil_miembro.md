# PROMPT E10.1 — Perfil de miembro (avatar/color, preferencias, stats, notif placeholder)

> **Etapa 10 — "Experiencia del miembro".** Toca código + `docs/MAPEO_FIRESTORE.md`.
> **MAPEO vigente esperado:** ≥ v2.2.2 (después de E9.9/E9.10). Verificá el header y reportá.
> **Al terminar: commit + push (git == local).**

## Qué resuelve

Hoy el avatar del header **no hace nada** y no hay vista de perfil. Sumar una pantalla de
**Perfil de miembro** (entrada: tocar el avatar del header) donde:
- Cada miembro ve **su** perfil; **el owner (JP) ve el de todos** con un selector.
- Cada uno puede **cambiar el color de su avatar** (se refleja en toda la app) y **editar sus
  preferencias** de comida (ej. "No come pescado").
- Se muestran **stats** (platos que calificó, su promedio, recetas en su biblioteca) y un acceso
  a **su historial**.
- Sección **Notificaciones** como *placeholder* "próximamente" (sin backend).

**Fuera de scope (pedido explícito):** agregar/quitar miembros, cambiar roles. No tocar eso.

## Diagnóstico previo (pegar evidencia)
1. `FamiliaConfig` / `FamiliaConfigMiembro` en `types/models.ts` (`{ nombre, rol, mails }`).
2. Cómo `MemberAvatar.tsx` resuelve color (tokens `--member-{id}`) e inicial.
3. `resolveMemberId` + `AuthProvider` (memberId del usuario actual, owner).
4. Confirmar que NO existe doc `config/perfiles` ni campos color/preferencias.

## Modelo de datos — doc nuevo `config/perfiles`
Mismo patrón liviano que `config/visibilidad` (no ensuciar `config/familia`):
```ts
export interface PerfilMiembro { color?: string; preferencias?: string[]; }
export type PerfilesConfig = Partial<Record<MiembroId, PerfilMiembro>>;
// doc /config/perfiles
```
- `color`: hex de la paleta curada (ver UI). Si falta → usar el token `--member-{id}` actual (fallback).
- `preferencias`: lista de strings libres.

## Capa de datos — `src/data/perfiles.ts` (nuevo)
```ts
export async function getPerfiles(): Promise<PerfilesConfig>
export function subscribePerfiles(cb): Unsubscribe              // realtime (patrón existente)
export async function setColorMiembro(id: MiembroId, color: string): Promise<Result<…>>
export async function addPreferencia(id, texto): Promise<Result<…>>
export async function removePreferencia(id, texto): Promise<Result<…>>
```

## Color en toda la app — `MemberAvatar`
Para que el color elegido se vea en header, plan cards, historial, etc.:
- Crear un **contexto** `PerfilesProvider` (suscrito a `config/perfiles`) + hook
  `useColorMiembro(memberId): string` que devuelve el color custom o el token `--member-{id}`.
- `MemberAvatar` usa ese color (hoy toma `PALETTE[key].bg`). Mantener inicial/label como están.
- El avatar del **header** pasa a ser un `<Link to="/perfil">` (hoy no navega).

## UI — pantalla `/perfil` (propio) y `/perfil/:memberId` (owner ve a otro)
- Ruta en `App.tsx`. El avatar del header → `/perfil`. No-owner: siempre su propio perfil
  (ignorar `:memberId` si no es owner → redirect a `/perfil`). Owner: selector de miembros arriba
  (fila de avatares) que cambia `:memberId`.
- **Contenido** (una sola pantalla, scroll):
  1. (Owner) **selector de miembros** — fila de avatares; el activo resaltado.
  2. **Encabezado**: avatar grande + nombre + línea ("Tu perfil" / "Perfil de la familia"; "· planifica" si es el owner).
  3. **Color de avatar** (si es perfil propio **o** sos owner): swatches de una paleta curada
     (ver abajo). Tap = `setColorMiembro`. Se refleja al instante (realtime).
  4. **Stats** (3 cards): "platos calificó" (`historial` con `calificaciones[id] != null`),
     "su promedio" (promedio de esas notas, 1 decimal o "—"), "en su biblioteca"
     (owner → total de recetas; miembro → largo de `visibilidad[id]`).
  5. **Preferencias de comida**: chips; si es propio/owner, agregar (input + sugeridos) y quitar (×).
  6. **Historial**: últimos 2-3 platos que calificó (nombre + fecha + su nota) + "Ver historial completo →" (`/historial`).
  7. **Notificaciones**: placeholder con filas desactivadas (Avisos de compra / Recordatorio de
     cocción / Recordatorio de votar) + leyenda "Próximamente". Sin lógica.
- **Paleta curada** (derivada de la de miembros, no inventar libres):
  `['#8a4a2f','#74324a','#3c4a6e','#2e5d2e','#7a5c1e','#9a4d2e']` (o los tokens `--member-*` + 2
  variantes). Mostrar como swatches redondos; el activo con anillo.
- **Layout**: implementar la variante **hero** (el diseño tiene las dos en el prototipo del kit,
  `PerfilScreen.jsx`, tweak `perfilLayout`; **se eligió hero**).
  - *hero*: avatar centrado grande, nombre, swatches debajo, stats en fila, secciones apiladas.
  - (*compacto* queda como referencia descartada — no implementar.)
- Light y dark con tokens.

## Permisos (`firestore.rules`)
Doc `config/perfiles`: app de una sola familia, datos de bajo riesgo →
`allow read, write: if isFamilyMember();`. (Coherente con el resto de `config`. No requiere
field-level.)

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump **minor** (feature nueva): → **v2.3.0**. Reportá versión.
2. Subsección `### 1.2.E10.1 Cambios en v2.3.0 (E10.1 — Perfil de miembro)`: doc `config/perfiles`,
   `perfiles.ts`, `PerfilesProvider`/`useColorMiembro`, `MemberAvatar` con color custom, ruta
   `/perfil(/:memberId)`, avatar del header navegable, stats, preferencias editables, notif
   placeholder. Aclarar: **no** hay alta/baja de miembros (fuera de scope).
3. Abrir en §11 el **Lote 10 — Experiencia del miembro** y marcar **E10.1 ✅ HECHO (v2.3.0)**.
4. Registrar `**PROMPT_E10.1_perfil_miembro.md** ✅ CERRADO (v2.3.0)`.

## Criterio de aceptación
1. Tocar el avatar del header abre el perfil. Un miembro ve el suyo; JP tiene selector y ve a
   cualquiera.
2. Cambiar el color desde el perfil actualiza el avatar **en el header y en toda la app** (plan
   cards, historial) en realtime, y persiste (`config/perfiles`).
3. Agregar/quitar una preferencia persiste y se ve.
4. Las 3 stats muestran valores correctos (calificó / promedio / en biblioteca).
5. La sección Notificaciones es visualmente clara como "próximamente" (sin toggles activos).
6. No hay UI de alta/baja de miembros. Build + typecheck + tests verdes.
7. Pegá el diff de `perfiles.ts`, `MemberAvatar.tsx`, `App.tsx`, la pantalla nueva y la
   subsección 1.2.E10.1.

## Cierre
```
git add -A
git commit -m "E10.1: Perfil de miembro — color de avatar + preferencias (config/perfiles), stats, notif placeholder + MAPEO v2.3.0"
git push
```
Confirmá push OK.
