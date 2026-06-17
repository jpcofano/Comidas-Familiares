# PROMPT E14.1 — Compras asignables (encargado/a de compras) + Avatar con foto

> Pegar a Claude Code en una sesión abierta en el repo `Comidas-Familiares`.
> Dos funcionalidades nuevas, **ambas a implementar ahora**. **Numerar al próximo
> libre** si `E14.1` ya existe.
>
> **Prerequisito (aplicar primero):** los 3 fixes de la auditoría del 3-jun-2026
> (`comprimirImagen.ts` con fallback, `Perfil.tsx` color con error visible + paleta
> de 12, `MemberAvatar.tsx` sin hook condicional, `useInstallPrompt.ts` + `main.tsx`
> para instalación visible) y **deployar reglas** (`firebase deploy --only firestore:rules`).
> Este prompt construye encima de esos archivos.

---

## FEATURE A — La lista de compras se puede asignar a un miembro (principal)

### Concepto
Hoy JP (owner) ve la lista completa y cada miembro ve **solo los ítems de los planes
que tiene asignados para cocinar** (filtro `itemsVisibles` en `Compras.tsx`). No existe
forma de decir "esta semana **las compras las hace María**".

Queremos un **encargado/a de compras** por semana:
- Cualquier miembro puede **encargarse** de las compras (self-assign) desde la pantalla Compras.
- JP además puede **delegar** las compras a cualquier miembro.
- **El/la encargado/a ve la lista COMPLETA** (todos los ítems, todas las recetas), igual que JP,
  y puede tildar todo. El resto de los miembros sigue viendo solo lo suyo (sin cambios).

> Caso real: JP planifica, pero el sábado va María al súper → JP (o María) marca a María como
> encargada y ella ve y tilda la lista entera.

### Modelo de datos — extender `ListaCompras` (sin colección nueva)
`src/types/models.ts`, interface `ListaCompras` (campo nuevo, opcional, retrocompatible):
```ts
export interface ListaCompras {
  idLista: string;
  semanaInicio: string;
  fechaGeneracion: FirestoreTimestamp;
  totalItems?: number;
  totalYaTengo?: number;
  totalPendientes?: number;            // ya se escribe; tiparlo de paso
  missingItems?: string[];             // ya se escribe; tiparlo de paso
  encargadoCompras?: MiembroId | null; // NUEVO — quién hace las compras esta semana
}
```

### Capa de datos — `src/data/compras.ts`
1. **Suscripción al doc de la lista** (hoy `getListaById` es one-shot; necesitamos realtime para
   que el cambio de encargado y los totales se vean al instante en todos los dispositivos):
```ts
export function subscribeToLista(
  idLista: string,
  cb: (lista: ListaCompras | null) => void
): () => void {
  return onSnapshot(doc(db, "compras", idLista), (snap) =>
    cb(snap.exists() ? (snap.data() as ListaCompras) : null)
  );
}
```
2. **Asignar / liberar encargado** (merge en el doc raíz; `null` = sin encargado):
```ts
export async function asignarEncargadoCompras(
  idLista: string,
  memberId: MiembroId | null
): Promise<Result<void, AppError>> {
  try {
    await updateDoc(doc(db, "compras", idLista), { encargadoCompras: memberId });
    return ok(undefined);
  } catch (e) {
    return err("encargado-compras-failed", firebaseErrorMessage(e) ?? "No se pudo asignar las compras.", e);
  }
}
```

### Reglas de Firestore
**Sin cambios.** `match /compras/{id} { allow read, write: if isFamilyMember() }` ya permite que
cualquier miembro escriba `encargadoCompras`. (App de una familia, dato de bajo riesgo — mismo
criterio que `config/perfiles`.) Confirmar deploy.

### `src/routes/Compras.tsx`
1. **Pasar de `getListaById` a `subscribeToLista`** en el `useEffect` de la lista (guardar el unsub).
2. **Nueva regla de visibilidad** — el encargado ve todo:
```ts
const esEncargado = !!memberId && lista?.encargadoCompras === memberId;
const verCompleta = isJP || esEncargado;

const itemsVisibles = useMemo(() => {
  if (verCompleta || !memberId) return items;          // JP o encargado → lista completa
  const misPlanIds = new Set(
    planes.filter((p) => p.asignaciones.includes(memberId)).map((p) => p.idPlan)
  );
  return items.filter((i) => i.aportes.some((a) => misPlanIds.has(a.idPlan)));
}, [items, planes, memberId, verCompleta]);
```
3. **UI de asignación**, en el header de Compras, debajo del título/contador, **solo si hay `lista`**:
   - **Estado actual:** "Compras: **{nombre del encargado}**" con su `MemberAvatar`, o "Compras sin asignar".
   - **Acción para cualquier miembro (no-JP):**
     - Si **nadie** es encargado, o lo es otro → botón **"Encargarme de las compras"**
       → `asignarEncargadoCompras(lista.idLista, memberId)`.
     - Si **yo** soy el encargado → botón sutil **"Ya no me encargo"** → `asignarEncargadoCompras(lista.idLista, null)`.
   - **Acción para JP (owner):** fila de avatares de los 4 miembros (reusar el patrón del selector de
     `Perfil.tsx`); tocar uno lo marca como encargado (resaltado = activo); un chip **"Sin asignar"**
     para liberar. Así JP delega a quien quiera.
   - Optimista + error visible (mismo patrón que el color en `Perfil.tsx`: estado local `encargadoPend`,
     revertir y mostrar mensaje si el `Result` falla).
4. **Banner para el encargado** (si `esEncargado` y no es JP): card sutil arriba de la lista,
   "🛒 Te toca hacer las compras esta semana." (texto, sin emoji si rompe el estilo — usar el patrón
   de avisos existente con `var(--info-*)`).

### (Opcional, si entra fácil) Home / Mi semana
En `Home.tsx` / `MemberDashboard.tsx`, si el miembro es `encargadoCompras` de la semana activa,
mostrar un recordatorio tappable "Te toca las compras →" que linkea a `/compras`. No bloquear el
prompt por esto.

### Criterios de aceptación — Feature A
1. JP ve un selector de encargado en Compras y puede asignar/desasignar a cualquier miembro; persiste y
   se ve en realtime en otro dispositivo.
2. María toca **"Encargarme de las compras"** y pasa a ver la **lista completa** (todas las recetas/ítems),
   no solo sus planes; puede tildar cualquier ítem.
3. Un miembro que **no** es encargado sigue viendo solo los ítems de sus planes asignados (sin regresión).
4. "Ya no me encargo" / "Sin asignar" vuelve el estado a sin encargado y la vista de ese miembro
   se re-filtra a lo suyo.
5. Si falla la escritura, aparece un mensaje en pantalla (no se traga el error).

---

## FEATURE B — Avatar con foto (además del color)

### Concepto
Cada miembro puede subir una **foto** para su avatar. Si hay foto, se muestra en vez de la inicial;
si no, sigue el círculo de color con inicial (comportamiento actual). El color sigue existiendo como
fallback y como borde.

> **Costo / decisión:** se guarda como **data URL comprimida y chica** dentro de `config/perfiles`
> (doc ya suscrito en realtime por `PerfilesProvider`, cero infra nueva). Con miniaturas de ~96-128 px
> son ~5-15 KB c/u; 4 miembros ≈ <100 KB, muy por debajo del límite de 1 MB por documento de Firestore.
> Si en el futuro quieren fotos grandes/reales, migrar a **Firebase Storage** (ya hay `storageBucket`)
> y guardar la URL — pero para esta app la data URL chica alcanza y es lo más simple.

### Modelo de datos — extender `PerfilMiembro`
`src/types/models.ts`:
```ts
export interface PerfilMiembro {
  color?: string;
  preferencias?: string[];
  fotoUrl?: string;   // NUEVO — data URL JPEG comprimida (miniatura). Ausente → inicial con color.
}
```

### Capa de datos — `src/data/perfiles.ts`
```ts
export async function setFotoMiembro(
  id: MiembroId,
  fotoUrl: string | null,
): Promise<Result<void, AppError>> {
  try {
    // null = quitar la foto (usar deleteField si preferís; string vacío también sirve como "sin foto").
    await setDoc(REF(), { [id]: { fotoUrl: fotoUrl ?? "" } }, { merge: true });
    return ok(undefined);
  } catch (e) {
    return err("FIRESTORE_ERROR", firebaseErrorMessage(e) ?? "Error al guardar la foto.");
  }
}
```

### Compresión — `src/lib/comprimirImagen.ts`
Reusar la función (ya con el fallback `<img>` del fix de auditoría) pero para avatar pedir una
miniatura chica. Agregar un parámetro opcional **sin romper las llamadas existentes**:
```ts
export async function comprimirImagen(
  file: File,
  opts: { maxLado?: number; presupuesto?: number } = {}
): Promise<string> {
  const PRESUPUESTO = opts.presupuesto ?? 900_000;
  const LADO_1 = opts.maxLado ?? 1440;
  const LADO_2 = opts.maxLado ? Math.round(opts.maxLado * 0.75) : 1080;
  // ...usar LADO_1 / LADO_2 en los dos intentos y PRESUPUESTO en el loop de calidades
}
// Avatar: comprimirImagen(file, { maxLado: 128, presupuesto: 60_000 })
```

### UI — `src/routes/Perfil.tsx`
En el hero (donde está el `MemberAvatar size={64}`), si `canEdit`:
- Hacer el avatar tappable / agregar un link **"Cambiar foto"** debajo del nombre que dispara un
  `<input type="file" accept="image/*">` oculto (mismo patrón que `HistorialDetalle.tsx`).
- `onChange`: `const dataUrl = await comprimirImagen(file, { maxLado: 128, presupuesto: 60_000 })`
  → `setFotoMiembro(targetId, dataUrl)`. Manejar error con el mismo mensaje visible que el color.
- Si ya hay foto (`perfiles[targetId]?.fotoUrl`), mostrar también **"Quitar foto"** → `setFotoMiembro(targetId, null)`.
- Estado "Procesando…" mientras comprime/sube.

### UI — `src/components/MemberAvatar.tsx`
En `AvatarCircle`, además del color, leer la foto del contexto y, si existe, renderizar la imagen
llenando el círculo (la inicial queda de fallback mientras carga / si no hay foto):
```tsx
const perfiles = usePerfiles();
const custom  = memberId ? perfiles[memberId]?.color : undefined;
const fotoUrl = memberId ? perfiles[memberId]?.fotoUrl : undefined;
const bg = custom ?? (memberId ? `var(--member-${memberId})` : (PALETTE[key] ? `var(--member-${key})` : "var(--muted)"));

return (
  <span style={{ width: size, height: size, borderRadius: "50%", background: bg, color: m.fg,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: size <= 22 ? 10 : 11, fontWeight: 600, flexShrink: 0, overflow: "hidden" }}>
    {fotoUrl
      ? <img src={fotoUrl} alt="" width={size} height={size}
             style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      : m.label}
  </span>
);
```
La foto se ve **en toda la app** (header, plan cards, historial, voto) gracias al provider realtime,
sin tocar esos archivos.

### Reglas de Firestore
**Sin cambios** — `config/perfiles` ya permite escritura de cualquier miembro (ver auditoría / fix).

### Criterios de aceptación — Feature B
1. Desde su perfil, un miembro sube una foto y su avatar pasa a mostrarla **en el header y en toda la app**
   en realtime, y persiste al recargar.
2. "Quitar foto" vuelve al círculo de color con inicial.
3. El doc `config/perfiles` queda chico (miniatura comprimida); no se rompe el límite de 1 MB.
4. Miembros sin foto siguen viéndose exactamente igual que hoy (color + inicial).
5. JP puede cambiar la foto de cualquier miembro desde el selector; un miembro solo la suya.

---

## Cierre (para ambas features)
1. Actualizar `docs/MAPEO_FIRESTORE.md`: campo `encargadoCompras` en `compras/{idLista}`, campo
   `fotoUrl` en `config/perfiles/{id}`, y las nuevas funciones de datos. Bump de versión.
2. Tests: si hay `comprimirImagen.test.ts`, ajustar al nuevo parámetro opcional (la firma vieja
   `comprimirImagen(file)` debe seguir andando). Agregar test de `asignarEncargadoCompras` si entra fácil.
3. `npm test` verde, `npm run build` ok.
4. Pegar el diff de `models.ts`, `compras.ts`, `Compras.tsx`, `perfiles.ts`, `comprimirImagen.ts`,
   `Perfil.tsx`, `MemberAvatar.tsx`.

```
git commit -m "E14.1: lista de compras asignable (encargado/a) + avatar con foto (config/perfiles) + MAPEO"
```

## Decisiones a confirmar antes de codear (si hay duda, preguntar)
- **¿Quién puede asignar el encargado?** Default propuesto: cualquier miembro puede **encargarse a sí
  mismo** o liberar; **JP puede asignar a cualquiera**. Si quieren que un miembro pueda asignar a OTRO,
  es solo ampliar la UI (el dato ya lo permite).
- **Avatar:** data URL chica en `config/perfiles` (elegido). Migrar a Storage solo si después quieren
  fotos grandes.
