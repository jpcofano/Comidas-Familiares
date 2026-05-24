# PROMPT_E3.5.1 — Finalización explícita y pasos destildables en la pantalla de cocinar

## Contexto

E3.5 entregó la pantalla de cocinar y se ve bien (modo guiado paso a paso, modo
scroll, "Clave"/"Riesgo" por paso, banner de riesgo general, timers manuales,
modo libre desde detalle de receta). Pero al usarla, JP detectó dos fallas de
comportamiento que rompen el flujo real de cocinar:

1. **No se pueden destildar pasos.** Una vez que JP marca un paso como hecho, no
   puede desmarcarlo. Cocinar no es lineal — uno va y vuelve entre pasos.

2. **La pantalla finaliza sola.** Al marcar el último paso, el plan pasa
   automáticamente a "Cocinada" (plan-receta) o el componente se marca cocinado
   (plan-menú). No hay un botón "Finalizar" explícito. Esto es un problema:
   cuando uno cocina, va y viene con los pasos, y marcar el último paso no
   significa "terminé de cocinar".

Cita textual de JP: *"debería poder destachar el paso, y no debería finalizar
automáticamente ya que cuando uno cocina va y viene con los pasos"*.

## Pre-requisito

E3.5 desplegada (pantalla de cocinar funcionando visualmente). E3.4.4 cerrada
(`marcarCocinada` con limpieza de aportes, `marcarComponenteCocinado` granular).

## Decisiones de diseño (tomadas en chat con JP — no abrir a debate)

| # | Decisión | Resumen |
|---|---|---|
| 1 | Pasos destildables | El check de cada paso es bidireccional: se marca y se desmarca libremente. |
| 2 | Sin auto-finalización | Marcar el último paso NO dispara ningún cambio de estado de plan. Tachar pasos es solo progreso visual. |
| 3 | Botón "Finalizar" explícito | Existe un botón "Finalizar" deliberado. El cierre del plan ocurre solo cuando JP lo aprieta. |
| 4 | "Finalizar" no exige tachar todo | El botón está disponible aunque queden pasos sin tachar. Uno puede cocinar sin tachar cada paso. |
| 5 | Plan-menú: Finalizar por plan | **Opción A** (ver abajo): se sigue cocinando componente por componente; el cierre del MENÚ entero es un único "Finalizar" explícito, no automático. |

### Aclaración crítica sobre la decisión 5 — Opción A

El plan-menú se cocina **igual que hoy**: pantalla intermedia para elegir
componente, se entra a cocinar cada componente por separado, estado "Cocinando"
mientras quedan obligatorios. NO se rediseña a una sola pantalla con todos los
pasos juntos.

Lo único que cambia: hoy, cuando se cocina el último componente obligatorio, el
plan-menú pasa **automáticamente** a "Cocinada". Con E3.5.1, ese paso a "Cocinada"
deja de ser automático y pasa a ser un botón "Finalizar menú" explícito que JP
aprieta cuando decidió que terminó.

Si la intención fuera rediseñar el flujo de plan-menú (Opción B), este prompt NO
aplica — avisar a JP antes de seguir.

## Comportamiento deseado (detallado)

### Plan-receta (plan vinculado, no menú)

- Los pasos se tachan y destachan libremente. El estado de tachado vive donde ya
  vive hoy (localStorage single-device, según E3.5).
- Existe un botón "Finalizar" visible y accesible durante toda la sesión de
  cocinar (tanto en modo guiado como en modo scroll).
- Tachar el último paso NO hace nada más que tachar ese paso.
- Al apretar "Finalizar": se llama a la función que pasa el plan a "Cocinada"
  (la misma de E3.4.4 — `marcarCocinada` o equivalente, con su limpieza de
  aportes). Después de finalizar, navegar fuera de la pantalla de cocinar
  (a Home o a donde corresponda según E3.5).
- Conviene una confirmación liviana antes de finalizar ("¿Terminaste de cocinar?
  El plan pasará a Cocinada") para que no sea un tap accidental. Mantenerla
  simple — no un modal pesado.

### Modo libre (cocinar desde detalle de receta, sin plan)

- Mismo comportamiento de pasos destildables.
- NO hay plan que marcar. El botón en este modo es "Salir" / "Listo" y solo
  cierra la pantalla. No cambia ningún estado en Firestore.
- Confirmar en el diagnóstico cómo distingue hoy la pantalla el modo libre del
  modo plan-vinculado (E3.5 lo definió como activación 1c).

### Plan-menú (Opción A)

- Se cocina cada componente por separado, como hoy.
- Al terminar de cocinar un componente, hay un botón explícito tipo "Componente
  listo" que llama a `marcarComponenteCocinado(idPlan, idReceta)`. Esto agrega el
  componente a `componentesCocinados[]` y dispara la limpieza granular de aportes
  (E3.4.4). NO pasa el plan-menú a "Cocinada".
- En la pantalla intermedia del menú (la de elegir componente), cuando todos los
  componentes **obligatorios** están en `componentesCocinados[]`, aparece un
  botón "Finalizar menú". Apretarlo pasa el plan a "Cocinada".
- Mientras falte algún obligatorio, "Finalizar menú" no aparece (o está
  deshabilitado con un texto que explique por qué).
- Por consistencia con "ir y venir": evaluar si "Componente listo" debe ser
  reversible (destildable). **Decisión por defecto: sí, reversible** — quitar el
  componente de `componentesCocinados[]` debe ser posible mientras el plan no esté
  "Cocinada". Si esto es técnicamente costoso, reportarlo en el diagnóstico antes
  de implementar y JP decide.

## Diagnóstico requerido ANTES de codear

(Patrón establecido desde E3.4.3: diagnóstico primero, JP confirma, después fix.)

1. **Identificar los archivos de la pantalla de cocinar.** Reportar qué
   componente(s) implementan la pantalla de cocinar (plan-receta, modo libre) y
   la pantalla intermedia de plan-menú. Rutas exactas.

2. **Localizar el auto-cierre.** Reportar literal el código donde, hoy, marcar el
   último paso dispara el cambio de estado del plan. ¿Es un `useEffect` que
   observa "todos los pasos tachados"? ¿Una llamada dentro del handler del último
   paso? Pegar las líneas. Este es el código que hay que quitar.

3. **Manejo del tachado de pasos.** Reportar cómo se marca un paso hoy: ¿el
   handler solo agrega el paso al set de tachados, o ya soporta toggle? Confirmar
   si el "no se puede destachar" es porque el handler no contempla el camino
   inverso, o porque la UI no expone la acción.

4. **Cómo finaliza hoy cada modo.** Reportar qué función se llama al "terminar"
   en: (a) plan-receta, (b) modo libre, (c) plan-menú componente, (d) cómo llega
   hoy el plan-menú a "Cocinada". Confirmar si `marcarCocinada` sirve para cerrar
   un plan-menú o si hay otra función.

Reportar 1-4 en una primera respuesta. JP confirma y después arrancás.

## Criterios de aceptación con verificación literal

NO basta con reportar ✅. JP verifica personalmente en app + Firebase Console.

### A — Pasos destildables

1. En una receta con varios pasos: marcar el paso 2. Confirmar visualmente que
   queda tachado. Volver a tocar el paso 2: debe destacharse. Repetir con otro
   paso. Reportar que el toggle funciona en ambos sentidos.

2. Marcar varios pasos, destachar uno del medio, navegar a otro paso y volver:
   el estado de tachado se conserva (sigue en localStorage). Reportar.

### B — Sin auto-finalización

3. Plan-receta: tachar TODOS los pasos, incluido el último. Abrir Firebase
   Console y confirmar que el plan **sigue en su estado anterior**
   ("Compra pendiente" / "Compra lista" / "Cocinando"), NO pasó a "Cocinada".
   Pegar el `estado` literal del doc del plan.

### C — Finalizar explícito (plan-receta)

4. Con el plan del paso 3, apretar el botón "Finalizar". Confirmar la
   confirmación liviana. Aceptar. Abrir Firebase Console: el plan ahora sí está
   en `estado: "Cocinada"`. Pegar el valor.

5. Confirmar que la limpieza de aportes de E3.4.4 se ejecutó: contar ítems en
   `/compras/{idLista}/items/` con aporte de ese plan antes y después de
   finalizar. Después debe ser 0 (o los ítems compartidos quedaron sin el aporte
   del plan). Pegar los dos conteos.

6. Finalizar también debe poder usarse SIN haber tachado todos los pasos: tomar
   otro plan-receta, tachar solo 1 paso, apretar "Finalizar" → el plan pasa a
   "Cocinada" igual. Reportar.

### D — Modo libre

7. Cocinar una receta en modo libre (desde detalle de receta, sin plan). Tachar
   y destachar pasos: funciona. Apretar el botón de salida: la pantalla se cierra
   y NO se creó ni modificó ningún plan en Firestore. Confirmar que `/planes` no
   cambió.

### E — Plan-menú (Opción A)

8. Plan-menú con 2 componentes obligatorios + 1 opcional. Cocinar el primer
   obligatorio y apretar "Componente listo". Confirmar en Firebase Console:
   `componentesCocinados` contiene esa receta, el plan sigue en "Cocinando" (NO
   "Cocinada"). Pegar el array y el estado.

9. En la pantalla intermedia, con un solo obligatorio listo: el botón "Finalizar
   menú" NO debe estar disponible (ausente o deshabilitado). Reportar qué se ve.

10. Cocinar el segundo obligatorio y apretar "Componente listo". Ahora en la
    pantalla intermedia el botón "Finalizar menú" SÍ aparece. Apretarlo:
    confirmar en Firebase Console que el plan pasa a `estado: "Cocinada"`.
    Pegar el valor.

11. (Si se implementó "Componente listo" reversible) Marcar un componente como
    listo y luego destildarlo: confirmar que sale de `componentesCocinados[]` y
    el botón "Finalizar menú" desaparece de nuevo. Si NO se implementó reversible,
    reportarlo explícitamente acá con la razón dada en el diagnóstico.

## Edge cases a documentar en código

1. **Plan-menú con 0 componentes obligatorios**: si todos los componentes son
   opcionales, "Finalizar menú" debe estar disponible desde el inicio (la
   condición "todos los obligatorios cocinados" se cumple vacuamente). Coherente
   con lo documentado en E3.5 / E3.4.4.

2. **Salir sin finalizar**: si JP sale de la pantalla de cocinar sin apretar
   "Finalizar", no pasa nada — el plan queda como estaba y los pasos tachados
   siguen en localStorage. Volver a entrar restaura el progreso. Documentar.

3. **Finalizar un plan ya "Cocinada"**: si por algún camino se llega a "Finalizar"
   sobre un plan que ya está en "Cocinada", no debe re-ejecutar la limpieza ni
   romper. Idempotencia o guard. Documentar.

4. **localStorage de otro device**: el tachado es single-device (decisión E3.5).
   Si JP cocina desde otro dispositivo, los pasos arrancan sin tachar. No es un
   bug. Sin cambios acá.

## Patrón a respetar

Igual que E3.4.3 / E3.4.4 / E3.4.5: spread condicional para campos opcionales en
escrituras a Firestore, sin `undefined` ni `?? null`.

## Cambios al MAPEO_FIRESTORE.md

Bump del MAPEO. **Nota de versión**: este prompt asume que se mergea DESPUÉS de
E3.4.5 (que cierra como v1.5.2), por lo tanto sería **v1.5.3**. Si por orden de
trabajo E3.5.1 se mergea ANTES que E3.4.5, usar v1.5.2 acá y E3.4.5 pasa a v1.5.3.
Confirmar el número correcto al momento del commit.

Cambios a documentar:
- **§2.4** (Plan): en la sección de reglas de transición de estado (creada en
  E3.4.4), aclarar que el paso a "Cocinada" ocurre por acción explícita del
  usuario ("Finalizar"), NO automáticamente al completar pasos o componentes.
- Sección de la pantalla de cocinar (donde E3.5 la haya documentado): documentar
  pasos destildables y el botón "Finalizar" explícito por modo (plan-receta,
  modo libre, plan-menú).
- Changelog: agregar entrada de la versión describiendo finalización explícita y
  pasos destildables.

## Convención de commits

- Código: `Stage 3.5.1: explicit finish + toggleable steps in cooking screen`
- Doc: `Docs: MAPEO v1.5.3 (explicit finish in cooking screen)` (ajustar número
  según orden de merge — ver nota arriba)
