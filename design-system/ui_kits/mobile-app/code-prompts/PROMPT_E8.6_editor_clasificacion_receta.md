# PROMPT E8.6 — Editor de clasificación de receta en la app

> **Etapa 8 — ciclo de diseño post-E7.13.** Toca código + `docs/MAPEO_FIRESTORE.md`
> (y posiblemente `firestore.rules`).
> **MAPEO vigente esperado:** la versión que dejó E8.5. Verificá y reportá.
> **Al terminar: commit + push** — ver "Cierre".

## Por qué

Cierra el gap de §1.2.E7.13 pto 6: hoy `cocina` (y el resto de la clasificación) **solo** se
completa desde la consola de Firebase. Esto **destraba migrar las 78 recetas viejas** desde el
celular. Alcance acordado en diseño: **solo el bloque "Clasificación"** (no ingredientes ni
pasos — esa sería una edición completa, mini-proyecto aparte).

## Lo que ya existe (usar)
- `actualizarReceta(idReceta, patch): Promise<Result<...>>` (`src/data/recetas.ts`).
- Enums del modelo (`src/types/models.ts`): `COCINAS`, `ESCENARIOS`(/`Escenario`),
  `PROTEINAS`, `DIFICULTADES`, `COSTOS`, `APTO_NOCHE_DE_A_DOS`, etc.
- Campos de clasificación en `Receta`: `cocina?`, `escenarioUso`, `estilo`,
  `tecnicaPrincipal`, `climaDelPlato?`, `pensadaPara`, `proteinaPrincipal`, `dificultad`,
  `costoEstimado`, `sinLacteos`, `hidratos`, `aptoNocheDeADos`.

## Cambios de código

### 1. Acción "Editar clasificación" en el detalle  (`src/routes/DetalleReceta.tsx`)
- Botón **"Editar"** (lápiz) junto al título, **solo JP**.
- Si la receta **no** tiene `cocina`, además mostrar en la fila de pills un chip punteado
  **"Sin clasificar · completar"** (colores `--warn-*`) que abre el mismo editor. Esto hace
  visible, receta por receta, cuáles de las 78 viejas faltan migrar.

### 2. Bottom-sheet "Editar clasificación"
Modal anclado abajo (mismo patrón que el editor de ingredientes de E8.3; portal a nivel app,
sin animación que lo saque de viewport). Campos (prefill con los valores actuales):
- **Cocina de origen** (`COCINAS`) — el driver de la migración.
- **Escenario de uso**, **Proteína**, **Dificultad**, **Costo**, **Apto noche de a dos**
  (selects de sus enums).
- **Estilo** (text), **Sin lácteos** / **Sin hidratos** (toggles).
- (Opcional, si entra cómodo: `climaDelPlato`, `pensadaPara`, `tecnicaPrincipal`.)
- Guardar → `actualizarReceta(id, patch)`; toast; refrescar el detalle (pills al instante).
  Dar `key` por `idReceta` al sheet para reinicializar el form si cambia de receta.

### 3. Firestore rules  (`firestore.rules`)
Confirmar que **JP puede `update`** en `/recetas/{id}` para estos campos. Si las rules
restringen campos, habilitar el bloque de clasificación. Reportar qué se cambió.

## Cambios en el MAPEO (`docs/MAPEO_FIRESTORE.md`)
1. Bump patch del header.
2. Subsección `### 1.2.E8.6 Cambios en vX.Y.Z (E8.6 — editor de clasificación de receta)`:
   alcance (solo clasificación), campos editables, chip "Sin clasificar", rules.
3. En §1.2.E7.13 pto 6, cerrar el pendiente: "el editor en la app llegó en E8.6; las recetas
   viejas ya se clasifican desde el celular".
4. En §11, marcar **E8.6 como ✅ HECHO (vX.Y.Z)** (aclarar: solo clasificación; edición
   completa de receta queda como posible feature futura).
5. Registrar `**PROMPT_E8.6_editor_clasificacion_receta.md** ✅ CERRADO (vX.Y.Z)`.

## Criterio de aceptación
1. JP puede setear `cocina` y demás clasificación desde el detalle, y persiste.
2. Una receta sin `cocina` muestra el chip "Sin clasificar"; tras guardar, aparece el pill de
   cocina y el chip desaparece.
3. El editor abre prefilled en recetas ya clasificadas.
4. Build + typecheck + tests verdes; rules deployadas si cambiaron.
5. Pegá la subsección 1.2.E8.6 y el estado de E8.6 en §11.

## Fuera de scope
- Editar ingredientes / pasos / nombre de la receta (sería edición completa, otro prompt).
- Crear receta desde cero (ya existe el importador).

## Cierre — dejar local y git iguales
```
git add -A
git commit -m "E8.6: editor de clasificación de receta en la app (incl. cocina) + rules + MAPEO"
git push
```
Si cambiaron rules: `firebase deploy --only firestore:rules`. Confirmá push OK.
