# PROMPT DOCS — Actualizar §7.6 del MAPEO: E6.2 push notifications (en espera)

> **Tipo:** documentación pura. **Solo toca `MAPEO_FIRESTORE.md`. Cero código, cero datos.**
> **App:** Comida Familiar — proyecto Firebase `comida-familiar`.
> **MAPEO vigente:** v1.6.9 (confirmar el número exacto en el header al abrir).

## Por qué este prompt

E6.1 + E6.1.1 cerraron la parte instalable de la PWA. El otro prompt de la Etapa 6,
**E6.2 — push notifications**, queda **previsto pero en espera** por decisión de JP.

El problema: la descripción actual de E6.2 en §7.6 del MAPEO tiene **información
incorrecta** que ya hizo perder tiempo y lo va a volver a hacer cuando se retome. Dice
que FCM "requiere Blaze para mensajes desde el server". Eso es falso. Este prompt
corrige §7.6 con el estado real, averiguado y verificado, para que el día que se
retome E6.2 se parta de información correcta.

## Lo que hay que dejar registrado en §7.6 (estado real de E6.2)

Reescribir la entrada de E6.2 en §7.6 para que refleje esto:

**E6.2 — Push notifications — EN ESPERA (decisión de JP).**

Hechos verificados (no cambian con el plan de Firebase):

- **Firebase Cloud Messaging (FCM) es gratis** en ambos planes (Spark y Blaze): sin
  cargo por mensaje, sin límite de cantidad, sin cargo por exceso. FCM **no** requiere
  Blaze. (La afirmación anterior del MAPEO era incorrecta.)
- Lo que define la arquitectura no es FCM, es **quién dispara la notificación**. Hay
  dos caminos, y E6.2 tendrá que elegir uno al retomarse:

  **Camino A — Cloud Function (push real).** Una Cloud Function escucha cambios en
  Firestore (ej. `plan.asignaciones` actualizado) y dispara el FCM. La notificación
  llega al destinatario **con la app cerrada** — es push de verdad. El uso de Cloud
  Functions para una familia de 4 está holgadamente dentro de la capa gratuita (2M
  invocaciones/mes). Pero desplegar Cloud Functions **requiere el plan Blaze
  activado** — es decir, asociar una tarjeta al proyecto. No implica cargos reales en
  este volumen, pero se pierde el corte automático del plan Spark. Mitigable con una
  alerta de presupuesto en Google Cloud.

  **Camino B — push disparado desde el cliente (sin Cloud Function, sin Blaze).**
  Evaluado y **descartado como solución principal**: el push lo tendría que disparar
  el navegador de quien genera el evento, lo que exige que esa persona mantenga la app
  abierta en el momento — justo lo contrario del uso real (JP asigna la Especial y
  cierra la app). Además, mandar push device-to-device necesita una credencial de
  servidor que no puede vivir de forma segura en el cliente. No sirve para el caso de
  uso de esta app.

- Alternativa intermedia, también registrada: **notificaciones dentro de la app**
  (badge / campanita con contador de pendientes), construidas sobre el realtime que la
  app ya tiene (`useCollectionRealtime`). No son push del sistema operativo —se ven al
  abrir la app, no suenan el celular— pero son 100% gratis, sin Blaze, sin permisos de
  navegador. Es una opción válida si en el futuro se decide no ir por el Camino A.

- **iOS:** push en PWA de iOS funciona solo en versiones recientes de iOS y solo si la
  app está instalada en la pantalla de inicio. A verificar contra los dispositivos de
  la familia cuando se retome E6.2.

**Estado:** en espera. Cuando JP retome E6.2, la primera decisión es Camino A
(Blaze + push real) vs. notificaciones in-app. Si va por A, el trabajo es lo
suficientemente grande como para partirse en dos prompts (infraestructura: permiso +
tokens FCM + Cloud Function + push de prueba; y luego el cableado a los eventos reales
de la app).

## Cambios

### C1 — Reescribir la entrada de E6.2 en §7.6

Reemplazar la descripción actual de `PROMPT_E6.2_push_notifications.md` en §7.6 por el
contenido de arriba (adaptado al estilo y formato del MAPEO — no copiar literal este
prompt, integrarlo como corresponde a una sección de documento).

### C2 — Marcar E6.1 / E6.1.1 como cerrados en §7.6

Si no está hecho ya: marcar `PROMPT_E6.1_pwa_manifest.md` (implementado como E6.1) y la
splash de iOS (E6.1.1) como **✅ CERRADOS** en §7.6, con una línea de qué cubrió cada
uno, igual que el resto de las entradas cerradas de la sección.

### C3 — Header del MAPEO

Subir la versión del header del MAPEO al siguiente número de patch (ej. v1.6.9 → v1.7.0
o v1.6.10 — seguir la convención que el documento venga usando). Fecha actualizada.

## Fuera de scope

- **No** tocar código, ni datos, ni configuración de Firebase.
- **No** implementar nada de E6.2 — sigue en espera.
- **No** activar Blaze.

## Criterio de aceptación

- Pegá la sección §7.6 final del MAPEO, mostrando la entrada de E6.2 reescrita y E6.1 /
  E6.1.1 marcados como cerrados.
- Confirmá el número de versión nuevo del header.

## Commit

```
Docs: MAPEO — estado real de E6.2 (push en espera) + E6.1/E6.1.1 cerrados
```
