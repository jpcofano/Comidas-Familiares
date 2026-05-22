# PROMPT E3.1 — Home modo JP

> Etapa 3.1 del plan de migración (ver `MAPEO_FIRESTORE.md` §3.1, §3.2, §5.2, §7.3).
> Pegar este archivo completo a Claude Code en la terminal del repo.

---

## 1. Contexto

Migración de **Comida Familiar** de Apps Script + Google Sheets a Firebase + React +
Vite. Fuente de verdad del modelo: `MAPEO_FIRESTORE.md`.

Estado del repo al arrancar este prompt — **Etapa 2 cerrada completa**:

- E1.0–E1.2: bootstrap config, auth + whitelist, layout + routing. La Home (`/`) hoy
  es un placeholder vacío dejado en E1.2. El layout (header, bottom-nav) y los tokens
  de diseño de `Styles.html` ya existen.
- E2.1: types en `src/types/models.ts` (incluye `Plan`, `Receta`, `Menu`).
- E2.2: data layer completo en `src/data/*.ts`. `planes.ts` ya tiene
  `subscribeToPlanesActivos` (onSnapshot) y la transacción de voto. `compras.ts` y
  `menus.ts` con sus funciones.
- E2.3: Security Rules + emulador.
- E2.4: seeds en producción — 78 recetas, 5 menús.
- E2.5: importador de menús.
- E2.6: índices Firestore Enabled (incluye el de `planes` por
  `semanaInicio` + `estado`).

Esta etapa construye la **Home en modo JP**: la pantalla `/` que muestra el estado de
la comida de la semana — la Especial, sus extras, los planes En proceso, y un resumen
de la lista de compras. Es la primera pantalla funcional de la Etapa 3.

`/planes` está **vacía** hoy — nadie eligió comidas todavía (eso se hará desde el
detalle de receta, E3.3). Para poder diseñar y verificar la Home con datos reales,
esta etapa incluye un script que inserta planes de prueba (ver decisión 2).

**Nota de la Etapa 2:** en E2.5, `Menu.estilo` se cambió de requerido a opcional en
`models.ts`. Si esta etapa lee campos de `Menu`, tener presente que `estilo` puede ser
`undefined`.

---

## 2. Decisiones zanjadas (no re-litigar)

1. **Alcance: Home completa, con acciones.** Esta etapa incluye tanto el render del
   estado de la semana como las acciones de la Home (decisión del usuario). Las
   acciones se detallan en la tarea 3.4. Para las acciones que dependen de pantallas
   que aún no existen (elegir una receta para "sumar extra" necesita el listado de
   E3.2 / detalle de E3.3), ver decisión 6.

2. **Datos de prueba: planes reales en Firestore, vía script.** Como `/planes` está
   vacía, se crea `scripts/seed-planes-prueba.ts` (Admin SDK, mismo patrón que
   `scripts/seed-firestore.ts` de E2.4):
   - Inserta un escenario completo: **1 plan Especial + 1 Especial extra + 1 En
     proceso**, todos para la semana actual, apuntando a recetas que ya existen del
     seed (elegí 3 `REC-*` reales cualesquiera del catálogo).
   - El Especial extra debe tener `origen: "extra:<idPlan del Especial>"` — la
     cascada correcta de `MAPEO §3.2`.
   - **El estado de los planes es parametrizable**: el script acepta un argumento
     para fijar el `estado` (`Elegida`, `Compra pendiente`, `Compra lista`,
     `Cocinada`). Default `Elegida`. Esto permite regenerar los planes en distinto
     estado para verificar cómo responde la Home a cada uno.
   - **Los planes de prueba deben ser identificables y borrables**: marcá cada uno
     con `notas: "[PRUEBA E3.1]"` (o un prefijo reconocible en el `idPlan`), y el
     script debe aceptar un flag `--clean` que borre exactamente esos planes de
     prueba y nada más. Esto es importante: estos planes NO son datos reales y van a
     estorbar cuando E3.3 permita crear planes de verdad.
   - El plan escrito debe respetar **exactamente** el shape de `MAPEO §2.4` / el type
     `Plan` de E2.1: `votos` como map con los 4 miembros en `null`, `comentariosPlan`
     como map, `asignaciones: ["juanpablo"]` por default, `estado` válido del ciclo.
   - Agregá un script a `package.json` (ej. `seed:planes`). Documentá su uso (incl.
     `--clean` y el parámetro de estado) en el `README.md`.

3. **Lectura de datos vía el data layer y en tiempo real.** La Home usa
   `subscribeToPlanesActivos` de `src/data/planes.ts` (onSnapshot) — NO `getDocs`
   sueltos, NO el SDK directo. La query de planes activos de la semana es la de
   `MAPEO §5.2` ("Home modo JP"): `semanaInicio == semanaActual` +
   `estado in [Elegida, Compra pendiente, Compra lista, Cocinada]`. Si falta alguna
   función en el data layer, se agrega ahí, no en el componente.

4. **Separación Especial / extras / en proceso (de `MAPEO §5.2` y §3.2).** Sobre los
   planes activos de la semana:
   - **Especial**: el plan con `tipoPlan === "Especial"`.
   - **Extras**: planes con `tipoPlan === "Especial extra"` y
     `origen === "extra:" + idPlan-del-Especial`.
   - **En proceso**: planes con `tipoPlan === "En proceso"`.
   El cálculo de la semana actual (lunes ISO) usa el helper correspondiente; si no
   existe, se agrega a un módulo de utilidades de fecha.

5. **Resumen de compras (de `MAPEO §5.2`).** De los planes activos, tomar el primer
   `listaComprasId` no nulo; si existe, leer el resumen de esa lista (total de ítems,
   cuántos "ya tengo", pendientes) vía `src/data/compras.ts`. La Home muestra solo el
   **resumen** — no la lista completa (eso es la pantalla `/compras`, E3.4). Si no
   hay lista, mostrar el estado correspondiente ("sin lista de compras todavía").

6. **Acciones que cruzan a otras pantallas.** Algunas acciones de la Home necesitan
   pantallas que aún no existen:
   - **"Sumar extra"** y **"Sumar en proceso"** requieren elegir una receta → eso
     vive en el listado (E3.2) / detalle (E3.3). En esta etapa, estos botones
     **navegan** a la ruta del listado de recetas (`/recetas` o la que defina el
     routing de E1.2) — no implementan la selección acá. Si esa ruta aún es un
     placeholder, el botón navega igual; la funcionalidad se completa en E3.2/E3.3.
   - **"Marcar Cocinada"** cambia el estado del plan a `Cocinada` — esto SÍ se
     implementa acá completo (es un update de estado vía `src/data/planes.ts`),
     porque no depende de otra pantalla.
   - **"Descartar plan"** (eliminar un plan activo) se implementa acá completo. Ojo
     con la cascada: descartar un Especial debe descartar también sus extras
     (`MAPEO §3.2` — la lógica de borrado en cascada). Si el data layer de E2.2 ya
     tiene una función de borrado con cascada, usala; si no, agregala a `planes.ts`.
   - NO se implementa selección de recetas, modo cocinar ni evaluación en esta etapa.

7. **Estados de la Home.** La Home debe verse bien en estos casos, todos:
   - **Sin planes** (semana vacía): mensaje claro invitando a elegir la comida de la
     semana, con acceso al listado de recetas.
   - **Con Especial** (+ opcionalmente extras y en proceso): el caso completo.
   - Según el `estado` del plan, la acción primaria cambia: en `Elegida` /
     `Compra pendiente` / `Compra lista` se ofrece "Marcar Cocinada"; en `Cocinada`
     se ofrece ir a evaluar (la ruta de voto `/voto/:idPlan` existe del routing de
     E1.2 aunque la pantalla sea placeholder — el botón navega igual).

8. **Diseño.** Seguí los tokens portados en E1.2 (`Styles.html`: primary `#74324a`,
   cards, tipografía). La Home es la pantalla principal — tarjeta destacada para la
   Especial, secciones más livianas para extras / en proceso / resumen de compras.
   Mobile-first (la app se usa en celular). Si querés apoyo de diseño visual fino,
   `MAPEO §8` indica cuándo conviene — pero no es bloqueante.

9. **Idioma:** inglés en infraestructura (nombres de componentes, funciones),
   español en dominio y en todos los textos visibles. Igual que el resto del repo.

---

## 3. Tareas

### 3.1 Script de planes de prueba

- Creá `scripts/seed-planes-prueba.ts` según la decisión 2: escenario Especial +
  extra + en proceso, estado parametrizable, flag `--clean`, shape exacto de
  `MAPEO §2.4`.
- Script en `package.json` + sección en `README.md`.
- Corré el script (estado `Elegida`) para tener datos contra los que construir la
  Home.

### 3.2 Lógica de datos de la Home

- Si falta, agregá al data layer: cálculo de semana actual, separación
  Especial/extras/en proceso, lectura de resumen de compras, borrado en cascada.
- La Home se suscribe a los planes activos en tiempo real (`subscribeToPlanesActivos`).

### 3.3 Componente Home (render)

- Render del estado de la semana: tarjeta de la Especial, sección de extras, sección
  de En proceso, resumen de compras.
- Manejo de los estados de la decisión 7 (sin planes / con planes / según estado del
  plan).
- Estados de carga y de error.

### 3.4 Acciones de la Home

- **Marcar Cocinada**: update de estado vía data layer. Implementación completa.
- **Descartar plan**: borrado vía data layer, con cascada de extras si es un
  Especial. Implementación completa. Pedí confirmación al usuario antes de borrar
  (es destructivo).
- **Sumar extra / Sumar en proceso**: navegan al listado de recetas (decisión 6).
- **Ir a evaluar** (cuando el plan está `Cocinada`): navega a `/voto/:idPlan`.

### 3.5 Tests

- Tests de la lógica pura que se pueda aislar: separación Especial/extras/en proceso
  a partir de un array de planes, cálculo de semana actual. Van junto al set
  existente (100 tests tras E2.5) y no deben romperlo.
- La parte de UI y la suscripción en vivo pueden verificarse manualmente; documentá
  esa verificación en el reporte.

### 3.6 Build + deploy

- `npm run build` sin errores.
- Deploy a producción: `firebase deploy --only hosting`.

---

## 4. Criterios de aceptación

1. `scripts/seed-planes-prueba.ts` existe: crea Especial + extra + en proceso, estado
   parametrizable, flag `--clean`, planes marcados como `[PRUEBA E3.1]`, shape exacto
   de `MAPEO §2.4`.
2. La Home lee planes activos en tiempo real vía `subscribeToPlanesActivos` (data
   layer), no SDK directo.
3. La Home separa correctamente Especial / extras (por `origen`) / en proceso.
4. La Home muestra el resumen de compras (no la lista completa).
5. La Home se ve bien en los 3 estados de la decisión 7 (sin planes, con planes,
   según estado del plan).
6. "Marcar Cocinada" y "Descartar plan" (con cascada de extras y confirmación)
   funcionan completos.
7. "Sumar extra / en proceso" y "Ir a evaluar" navegan a las rutas correspondientes.
8. Tests de lógica pura en verde, sumados al set sin romper los existentes.
9. `npm run build` sin errores.
10. Deploy a producción exitoso.
11. Verificación funcional documentada en el reporte (Home con los planes de prueba).
12. Commits con prefijo `Stage 3.1:` + push.

---

## 5. Qué NO tocar

- **`firestore.rules`, `firestore.indexes.json`, `scripts/seed-firestore.ts`,
  `scripts/bootstrap-config.ts`**: cerrados en etapas anteriores. No se tocan.
- **El data layer de E2.2**: se *extiende* con funciones nuevas si hacen falta, pero
  NO se modifican las funciones existentes (`subscribeToPlanesActivos`, la
  transacción de voto, etc.) ni `result.ts` ni `firebase.ts`.
- **Los types de E2.1**: la Home los usa. Si un type pareciera insuficiente, NO lo
  modifiques por tu cuenta — reportalo y pará. (En E2.5 se cambió un type sin avisar;
  no repetir eso.)
- **El importador de menús (E2.5)** y otras pantallas (recetas, compras, etc.): fuera
  de scope. Los botones de la Home solo *navegan* a sus rutas.
- **El modo miembro de la Home**: `MAPEO §5.2` define una Home distinta para
  miembros (dashboard). Esta etapa es **solo modo JP**. El modo miembro es una etapa
  aparte — si el layout de E1.2 ya detecta el modo, dejá el camino de miembro como
  está (placeholder); no lo implementes acá.
- **El set de tests de E2.2/E2.3/E2.5**: no se editan ni mueven.

---

## 6. Antes de cerrar — reporte esperado

- Tabla de criterios de aceptación (1–12) con estado.
- Las 3 recetas (`REC-*`) usadas en los planes de prueba y los `idPlan` generados.
- Cómo se corre el script de planes de prueba: parámetro de estado y `--clean`.
- Funciones nuevas agregadas al data layer (si hubo).
- Resultado de la verificación funcional: la Home con los planes de prueba, en al
  menos 2 estados distintos (ej. `Elegida` y `Cocinada`).
- Confirmación de que NO se modificó ningún type de E2.1 ni función existente de
  E2.2 (o, si fue inevitable, qué y por qué — reportado, no silencioso).
- Cualquier `// TODO` que haya quedado en código (esperables: los que apuntan a
  E3.2/E3.3 para completar "sumar extra").
- Lista de commits `Stage 3.1:`.
- Recordatorio para JP: abrir `https://comida-familiar.web.app`, ver la Home con los
  planes de prueba; regenerar con el script en estado `Cocinada` para ver el otro
  layout; y, cuando E3.3 esté lista y se puedan crear planes reales, correr el script
  con `--clean` para limpiar los de prueba.
