# PROMPT E3.3 — Detalle de receta + creación de planes

> Etapa 3.3 del plan de migración (ver `MAPEO_FIRESTORE.md` §2.2, §2.4, §3.1, §3.2,
> §3.3, §5.2, §7.3).
> Pegar este archivo completo a Claude Code en la terminal del repo.

---

## 1. Contexto

Migración de **Comida Familiar** de Apps Script + Google Sheets a Firebase + React +
Vite. Fuente de verdad del modelo: `MAPEO_FIRESTORE.md`.

Estado del repo al arrancar este prompt:

- Etapa 2 cerrada completa. En producción: 78 recetas, 5 menús.
- E3.1 + E3.1.1: Home modo JP funcional, con botón "Ver receta" que navega a
  `/recetas/:idSeleccion`. Script `scripts/seed-planes-prueba.ts` con planes de
  prueba marcados `[PRUEBA E3.1]`.
- E3.2: Biblioteca (`/biblioteca`) con tabs Recetas/Menús, filtros, búsqueda. Las
  tarjetas navegan a `/recetas/:id` y `/menus/:id`. Función pura `filtrarRecetas` en
  `src/lib/filtros.ts`. 130 tests.

Esta etapa construye el **detalle de receta** (`/recetas/:idReceta`) — hoy un
placeholder. Es la pantalla a la que navegan tanto la Home como la Biblioteca.
Incluye **la primera escritura real de planes**: los botones "Elegir como Especial",
"Sumar como Especial extra" y "Sumar como En proceso". Hasta ahora los planes salían
del script de prueba; desde esta etapa la app los crea de verdad.

**Crítico:** la creación de planes tiene reglas de negocio estrictas (`MAPEO §3.2`,
§3.3). Leer la sección 3 con atención.

---

## 2. Decisiones zanjadas (no re-litigar)

1. **Alcance: detalle completo, con los 3 botones.** Esta etapa incluye el render de
   la ficha (ingredientes + pasos) **y** las 3 acciones de creación de plan
   (decisión del usuario). El render y la creación de planes deben estar
   **separados** en el código: la lógica de creación de planes va en el data layer
   (`src/data/planes.ts`), NO dentro del componente de pantalla.

2. **Lectura del detalle: 1 sola query (de `MAPEO §5.2`).** Ingredientes y pasos
   vienen **embebidos** en el doc de receta — `getDoc(doc(db,"recetas",id))` trae
   todo. Usá la función del data layer (`src/data/recetas.ts`); si falta una función
   "traer receta por id", agregala.

3. **Creación de planes vía el data layer.** Las 3 acciones llaman funciones de
   `src/data/planes.ts`. **Revisá primero qué ya existe** en ese módulo: E2.2
   construyó el data layer de planes; puede que ya haya funciones de creación, o
   funciones parciales. Si existen y cumplen las reglas de la sección 3, usalas. Si
   faltan o están incompletas, agregalas/completalas en `planes.ts` con el estilo del
   módulo — NUNCA metas lógica de escritura de planes en el componente.

4. **Reglas de elegibilidad — `MAPEO §3.3` (NO la regla vieja del Apps Script).**
   El Apps Script viejo (`50_Plan.gs`) chequea un campo `elegibleSemana` — ese campo
   **fue eliminado en v1.2** (`MAPEO §1.2.bis` decisión 3). NO uses `elegibleSemana`.
   La regla v1.2 es:
   - **Elegir como Especial**: SOLO si `receta.tipoItem === "Receta principal"`. Una
     entrada, postre, panificado, etc. NO puede ser Especial. Si la receta no
     califica, el botón "Elegir como Especial" debe estar deshabilitado (o ausente),
     con una explicación visible de por qué.
   - **Sumar como Especial extra**: cualquier receta, EXCEPTO la que ya es la
     Especial activa de la semana o ya es otro extra activo del mismo Especial
     (anti-dup, §3.2).
   - **Sumar como En proceso**: cualquier receta.

5. **Reglas anti-duplicado — `MAPEO §3.2`.**
   - **Especial**: máximo 1 activa por semana. Al elegir una receta como Especial
     cuando ya hay otra Especial activa → se descarta la anterior **con cascada de
     sus extras** (`§3.1` invariante 4). Esto es destructivo: pedí confirmación
     explícita al usuario antes ("Ya hay una Especial esta semana: <nombre>.
     ¿Reemplazarla? Se descartarán también sus extras."). Si la receta elegida YA es
     la Especial activa, no hacer nada (no duplicar).
   - **Especial extra**: no se puede sumar como extra una receta que ya es la
     Especial activa, ni una que ya es extra activo del mismo padre. Si no hay
     ninguna Especial activa esa semana, NO se puede sumar un extra → el botón se
     deshabilita con explicación ("Primero elegí una Especial").
   - **En proceso**: no duplicar `(tipoSeleccion, idSeleccion)` en planes activos de
     la semana. Si esa receta ya está En proceso esta semana, bloquear con aviso.

6. **Shape del plan creado — `MAPEO §2.4` exacto.** El doc en `/planes` debe tener:
   `idPlan` con formato `PLAN-yyyyMMdd-<timestamp>`, `semanaInicio`/`semanaFin` de la
   semana actual, `tipoSeleccion: "receta"`, `tipoPlan` (`"Especial"` |
   `"Especial extra"` | `"En proceso"`), `idSeleccion`, `nombreSeleccion`,
   `recetaPrincipal`, `estado: "Elegida"`, `fechaEleccion` (serverTimestamp),
   `asignaciones: ["juanpablo"]`, `votos` como map con los 4 miembros en `null`,
   `comentariosPlan` como map. Para un Especial extra: `origen: "extra:<idPlan del
   Especial>"`. Respetá el type `Plan` de E2.1.

7. **Semana actual.** El cálculo de la semana actual (lunes ISO) ya debería existir
   de E3.1 (la Home lo usa). Reusá ese helper — no lo redefinas.

8. **Reactividad.** Tras crear un plan, la Home ya refleja el cambio sola (usa
   `subscribeToPlanesActivos` en tiempo real). El detalle, tras una acción exitosa,
   debe dar feedback claro (toast/mensaje "Agregada como Especial") y actualizar el
   estado de sus propios botones (ej. si la receta pasó a ser la Especial,
   "Elegir como Especial" ya no aplica).

9. **Sincronización de lista de compras — fuera de scope.** En el Apps Script, crear
   un plan dispara `CS_sincronizarListaSemana_`. La lista de compras es E3.4. En esta
   etapa, crear el plan NO tiene que generar la lista. Si el data layer de E2.2 ya
   encadena algo de eso, está bien; si no, NO lo implementes acá — dejá un
   `// TODO E3.4` si hace falta marcarlo.

10. **`tipoSeleccion: "menu"` — fuera de scope.** Esta pantalla es el detalle de
    **receta**. Elegir un menú como plan es otra pantalla (detalle de menú, etapa
    futura). Acá solo se crean planes con `tipoSeleccion: "receta"`.

11. **Solo modo JP.** El detalle de receta lo usa JP para elegir comidas. Los
    miembros tienen una vista de detalle distinta (`MAPEO §5.1` lo marca accesible a
    miembros pero sin acciones de elección) — en esta etapa implementá modo JP; si
    el layout detecta miembro, dejá la vista de miembro sin los botones de crear
    plan (solo lectura). No hace falta más para miembro acá.

12. **Diseño.** Tokens de E1.2 (`Styles.html`: primary `#74324a`, `--text-strong`
    #0e0a07, `--line` #d8cdbe). Mobile-first. Ficha legible: datos clave arriba,
    ingredientes y pasos en secciones claras. Los 3 botones de acción visibles pero
    sin saturar. Coherente con Home y Biblioteca.

13. **Idioma:** inglés en infraestructura, español en dominio y textos visibles.

---

## 3. Tareas

### 3.1 Lógica de datos — creación de planes

- Revisá `src/data/planes.ts`. Implementá o completá las funciones necesarias para
  crear los 3 tipos de plan, aplicando TODAS las reglas de las decisiones 4, 5, 6.
- La lógica de elegibilidad y anti-duplicado debe ser **lo más pura y testeable
  posible**: separá "¿esta receta puede ser Especial / extra / en proceso dado el
  estado actual de planes?" (función pura, testeable sin Firestore) de la escritura
  en sí.
- El descarte en cascada del Especial anterior: si E3.1 ya implementó borrado con
  cascada, reusalo; si no, está en `planes.ts`.

### 3.2 Componente detalle de receta

- Pantalla en `/recetas/:idReceta`. Carga la receta con 1 query (decisión 2).
- Render: datos clave (tipoItem, proteína, tiempos, dificultad, porciones, costo,
  flags, escenario, etc.), sección de ingredientes, sección de pasos ordenados.
- Estados de carga, error, y receta inexistente (id que no existe).

### 3.3 Las 3 acciones

- **Elegir como Especial**: habilitado solo si `tipoItem === "Receta principal"`.
  Si ya hay otra Especial → confirmación de reemplazo (decisión 5). Crea el plan.
- **Sumar como Especial extra**: habilitado solo si hay una Especial activa y la
  receta no la duplica. Crea el plan extra con `origen`.
- **Sumar como En proceso**: habilitado salvo que la receta ya esté En proceso esta
  semana. Crea el plan.
- Cada acción: feedback de éxito/error claro, y actualización del estado de los
  botones tras la acción (decisión 8).
- Los botones deshabilitados muestran POR QUÉ lo están (no un botón muerto sin
  explicación).

### 3.4 Tests

- Tests de las **funciones puras** de elegibilidad y anti-duplicado: una receta que
  no es "Receta principal" no puede ser Especial; no se puede sumar extra sin
  Especial activa; no se duplica En proceso; la Especial duplicada exacta no hace
  nada; etc. Van junto al set existente (130 tras E3.2), sin romperlo.
- La UI y la escritura real pueden verificarse manualmente; documentá en el reporte.

### 3.5 Build + deploy

- `npm run build` sin errores.
- Deploy a producción: `firebase deploy --only hosting`.

---

## 4. Criterios de aceptación

1. El detalle de receta existe en `/recetas/:idReceta`, carga con 1 query, muestra
   datos + ingredientes + pasos.
2. "Elegir como Especial" habilitado solo para `tipoItem === "Receta principal"`;
   deshabilitado con explicación en caso contrario.
3. Elegir Especial cuando ya hay una activa → confirmación + descarte en cascada de
   la anterior y sus extras.
4. "Sumar como Especial extra" deshabilitado si no hay Especial activa o si
   duplicaría; funciona en el resto de los casos, con `origen` correcto.
5. "Sumar como En proceso" bloquea duplicados de la semana.
6. Los planes creados respetan el shape de `MAPEO §2.4` (votos/comentarios como map,
   `idPlan` con formato correcto, etc.).
7. NO se usa el campo `elegibleSemana` (eliminado en v1.2).
8. La creación de planes vive en `src/data/planes.ts`, no en el componente.
9. Funciones puras de elegibilidad/anti-duplicado testeadas; tests sumados al set sin
   romper los 130.
10. `npm run build` sin errores. Deploy exitoso.
11. Verificación funcional documentada: crear los 3 tipos de plan desde producción,
    confirmar en Firebase Console que los docs en `/planes` tienen el shape correcto.
12. Commits con prefijo `Stage 3.3:` + push.

---

## 5. Qué NO tocar

- **El data layer de E2.2**: se *extiende/completa* `planes.ts` para la creación,
  pero NO se modifican funciones existentes que ya funcionan (`subscribeToPlanesActivos`,
  la transacción de voto) ni `result.ts` ni `firebase.ts`.
- **Los types de E2.1**: el detalle los usa. Si un type pareciera insuficiente, NO
  lo modifiques por tu cuenta — reportalo y pará. (En E2.5 se cambió un type sin
  avisar; no repetir. Si el cambio es necesario de verdad, va reportado.)
- **La Home (E3.1/E3.1.1) y la Biblioteca (E3.2)**: cerradas. Si se reusan helpers o
  componentes, se reusan sin romperlas.
- **La lista de compras**: es E3.4. Crear un plan NO genera la lista en esta etapa
  (decisión 9).
- **El detalle de menú / elegir menú como plan**: etapa futura. Acá solo recetas.
- **`firestore.rules`, `firestore.indexes.json`, los scripts, el importador**: fuera
  de scope.
- **El set de tests existente**: no se edita ni se mueve.

---

## 6. Antes de cerrar — reporte esperado

- Tabla de criterios de aceptación (1–12) con estado.
- Qué había ya en `src/data/planes.ts` para creación de planes y qué se agregó/completó.
- Cómo quedaron separadas las funciones puras de elegibilidad/anti-duplicado de la
  escritura.
- Resultado de la verificación funcional: los 3 tipos de plan creados desde
  producción, con sus `idPlan`, confirmando shape correcto en Firebase Console.
- Confirmación de que NO se usó `elegibleSemana` y de que NO se modificó ningún type
  de E2.1 ni función existente de E2.2 (o, si fue inevitable, qué y por qué).
- Cualquier `// TODO` que haya quedado (esperable: `// TODO E3.4` para la
  sincronización de lista de compras).
- Lista de commits `Stage 3.3:`.
- Recordatorio para JP: desde `https://comida-familiar.web.app`, entrar al detalle de
  una receta "Receta principal", elegirla como Especial; entrar a otra y sumarla como
  extra; sumar una tercera como En proceso; verificar en la Home que aparecen los 3.
  Y un recordatorio: con planes reales ya creados, en algún momento conviene correr
  `scripts/seed-planes-prueba.ts --clean` para limpiar los planes `[PRUEBA E3.1]`.
