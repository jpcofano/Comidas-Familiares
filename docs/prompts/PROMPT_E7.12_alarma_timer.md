# PROMPT_E7.12 — Alarma del timer de pasos (Cocinar): repetir hasta detener + más audible

> Etapa: **E7.12** · Versión MAPEO: **v1.8.6** · Rama sugerida: `feat/e7.12-alarma-timer`
> Prefijo de commits: `feat: E7.12 ...`

## Contexto

En la pantalla **Cocinar** (`src/routes/Cocinar.tsx`) hay un timer de pasos con countdown `MM:SS` (introducido en E3.5, refinado en E7.3/E7.4: `StepTimer` / "LiveTimer"). Cuando el countdown llega a `00:00` se dispara **un único beep corto** vía Web Audio + una notificación del navegador.

**Problema:** el beep único **apenas se escucha**. Cocinando, sin mirar la pantalla, se pierde. Hay que hacerlo más audible y que **siga sonando hasta que el usuario lo detenga**.

> ⚠️ El MAPEO no documenta la ubicación exacta del beep (es intención, no verdad). **El primer paso es diagnóstico, no código.**

## Diagnóstico previo (hacer ANTES de tocar nada; reportar y esperar *procedé*)

- **D1 — Localizar el audio actual.** Encontrá dónde se genera el beep al llegar a `00:00`: archivo, función, cómo se crea el `AudioContext`/oscilador, qué `gain`/duración/frecuencia usa, y desde qué efecto/handler se dispara (¿en `StepTimer`? ¿en `Cocinar.tsx`? ¿un helper en `src/lib/`?). Reportá ruta y snippet.
- **D2 — Notificación del navegador.** Localizá dónde se dispara la `Notification` actual y confirmá que es independiente del beep (para no repetirla).
- **D3 — Ciclo de vida del timer.** Identificá los puntos donde el timer se reinicia, cambia de paso o se desmonta (cleanup actual), para enganchar ahí el stop de la alarma.
- **D4 — Reportá cualquier discrepancia** entre lo de arriba y lo que asume este prompt antes de codear.

## Decisiones zanjadas (no reabrir salvo que el diagnóstico lo contradiga)

1. **Patrón repetido, no beep único.** Al llegar a `00:00`: patrón de **dos tonos** (beep-beep), pausa **~1.2 s**, y **repetir** hasta detenerse. Tonos más agudos y mayor `gain` que el actual para que corte en parlante de celular. Envelope con ataque/decay cortos para evitar clic.
2. **Control explícito "Detener alarma".** Al disparar, aparece un botón/banner destacado **"Detener alarma"** que la corta al instante. Ubicarlo donde hoy se ve el `00:00` (o como banner sobre el paso actual).
3. **La alarma también se detiene** al: avanzar/retroceder de paso, reiniciar el timer, o salir de la pantalla Cocinar.
4. **Auto-corte de seguridad: 60 s.** Si nadie la corta, se silencia sola a los 60 s. Definir como constante (`ALARMA_MAX_MS = 60_000`) para ajustar fácil.
5. **AudioContext.** Reutilizar el contexto ya desbloqueado por el gesto que inició el timer. Si al disparar está `suspended`, intentar `resume()`. Si falla (tab en background), no romper: la Notification queda como respaldo.
6. **Notification NO se repite.** Una sola, como hoy. Solo el **audio in-app** se repite.
7. **Cleanup obligatorio.** Detener osciladores + `clearInterval`/`clearTimeout` en: stop manual, cambio de paso, reinicio del timer, **desmontaje del componente** y navegación fuera de Cocinar. Sin esto, la alarma queda sonando al salir.

## Tareas

1. Extraer/ajustar la lógica de alarma en un helper reusable (ej. `src/lib/alarma.ts` o donde viva hoy el audio): función que **arranca** el patrón repetido y devuelve un **`stop()`** idempotente. Encapsular ahí oscilador, gain envelope, intervalo de repetición y el auto-corte de 60 s.
2. Reemplazar el disparo del beep único por el arranque de la alarma repetida al llegar a `00:00`.
3. Agregar el control **"Detener alarma"** en la UI de Cocinar; al tocarlo, llamar a `stop()`.
4. Enganchar `stop()` en todos los puntos de cleanup de D3 + en el `return` del `useEffect` del timer (desmontaje).
5. Mantener la Notification actual tal cual, garantizando que **no** se repite con el loop.

## Criterios de aceptación

- Al llegar a `00:00`, suena una alarma **audible y repetida** (no un solo beep).
- Aparece "Detener alarma" y **la corta al instante**.
- La alarma se **detiene sola a los 60 s** si nadie la toca.
- Al **cambiar de paso, reiniciar o salir** de Cocinar, no queda sonando (verificado).
- En **mobile (PWA)** con la pantalla encendida se escucha claramente.
- La notificación del navegador **se dispara una sola vez**, sin repetirse.

## Qué NO tocar

- Lógica de conteo de pasos / parser de tiempos libres (E7.3).
- Estados del plan ni escrituras en Firestore.
- El comportamiento de la Notification del navegador (solo asegurar que no se repita).
- El layout general de Cocinar más allá de sumar el control "Detener alarma".

## Testing manual (JP)

`?v=N` incremental + incógnito. Probar en desktop y en el celu (PWA instalada): countdown corto (ej. 5 s), dejar sonar, cortar con el botón, cambiar de paso mientras suena, salir de la pantalla mientras suena, y dejar correr 60 s para el auto-corte.
