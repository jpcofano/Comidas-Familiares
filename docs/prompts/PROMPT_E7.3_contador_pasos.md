# Tarea: agregar contador real al paso a paso de cocinar (React/TS)

## Contexto del stack

App en raíz del repo: **React 19 + Vite + TypeScript + Firestore + react-router-dom v7**.
El submodule `Migracion/` es código muerto, solo consulta, NO tocar.

**Archivos clave (verificá antes de empezar):**
- `src/routes/Cocinar.tsx` — pantalla cocinar paso a paso (rutas `/recetas/:id/cocinar`
  y `/menus/:id/cocinar`).
- `src/components/PasoCard.tsx` (nombre probable) — componente que renderiza UN paso.
  Recibe prop `onToggleTachado` y se usa tanto en modo `guiada` como en `scroll`.
- `src/styles/tokens.css` — CSS variables del sistema (`--primary`, `--ok-bg`,
  `--ok-line`, `--ok-text`, `--border`, `--surface`, `--radius-lg`, etc).
- `src/types/models.ts` — types TypeScript de `Receta`, `Paso`, etc.

**Modos de la pantalla:**
- `guiada`: un paso visible a la vez, con navegación Anterior/Siguiente.
- `scroll`: todos los pasos visibles, destildables (tachado).

**Shape del paso (de `MAPEO_FIRESTORE.md`):** los pasos vienen embebidos en
`receta.pasos[]` con campos `nroPaso`, `titulo`, `detalle`, `tiempoEstimado`,
`puntoClave`, `errorComun`, `momento`. El campo `tiempoEstimado` es string libre:
`"20 min"`, `"5 min"`, `"1 h 15 min"`, `"45 min"`, `"2 h"`, `"3 min"`, o vacío/`"-"`.

## Requerimientos funcionales

### 1. Parser (función pura)

Crear `src/utils/parseTime.ts` (o agregar a un módulo de helpers existente si lo hay —
chequear primero `src/utils/`, `src/data/` o donde vivan los helpers de canonicalización
mencionados en E2.1).

```ts
export function parseTiempoEstimadoASegundos(input: string | null | undefined): number | null {
  // Acepta: "20 min", "1 h 15 min", "2 h", "45", "1h30min", "30 mins",
  //         "1 hora 30 minutos", "1h", "2hs"
  // Suma: (h|hs|hora|horas) * 3600 + (min|mins|minuto|minutos) * 60
  // Si solo número sin unidad → asumir minutos
  // Devuelve null si no parseable, vacío, "-", o resultado <= 0
}
```

Tests unitarios (Vitest si está configurado):
- `"20 min"` → `1200`
- `"1 h 15 min"` → `4500`
- `"2 h"` → `7200`
- `"45"` → `2700`
- `"1h30min"` → `5400`
- `"30 mins"`, `"1 hora 30 minutos"` → `1800`, `5400`
- `""`, `null`, `undefined`, `"-"`, `"un rato"`, `"0 min"` → `null`

### 2. Componente `<StepTimer />`

Crear `src/components/StepTimer.tsx`.

**Props:**
```ts
interface StepTimerProps {
  tiempoEstimado: string | null | undefined;
  /** Texto para el body de la notificación; típicamente paso.momento || paso.titulo */
  stepLabel: string;
}
```

**Si `parseTiempoEstimadoASegundos(tiempoEstimado)` devuelve `null` → retornar `null`.**
No renderizar nada. El caller no tiene que hacer condición.

**Estado interno (useState):**
- `status: 'idle' | 'running' | 'paused' | 'done'`
- `remainingSeconds: number`

**Refs (useRef):**
- `intervalRef: number | null` — id del setInterval
- `audioContextRef: AudioContext | null` — para cleanup

**Lógica:**
- Inicial: `idle`, `remainingSeconds = totalSegundos`.
- `Iniciar contador` → arranca `setInterval` cada 1000ms decrementando.
- Cuando llega a 0 → `status='done'`, dispara las 3 señales (§3), limpia interval.
- `Pausar`/`Reanudar` → toggle interval.
- `Reiniciar` → limpia interval, vuelve a `idle` con `remainingSeconds = totalSegundos`.

**Cleanup OBLIGATORIO:**
```ts
useEffect(() => {
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  };
}, [tiempoEstimado]);  // cleanup también al cambiar de paso (cambio de prop)
```

**Atención con React 19 + StrictMode:** en dev los effects corren dos veces. Hacer
el cleanup idempotente. **NO** crear `AudioContext` en un effect que se monte
automático — crearlo solo bajo demanda dentro del handler de "Iniciar" o del beep
(para que StrictMode no produzca beeps fantasma).

### 3. Aviso al llegar a 00:00 — TRES señales

**Visual:**
- Atributo `data-state="done"` en la card.
- Animación de parpadeo verde con `var(--ok-bg)`, `var(--ok-line)`, `var(--ok-text)`.
- Display pasa a `¡Listo!`.

**Sonora (Web Audio API, sin archivos):**
```ts
function playDoneBeep(audioContextRef: RefObject<AudioContext | null>) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    audioContextRef.current = ctx;

    const beepAt = (when: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.3, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(when);
      osc.stop(when + 0.16);
    };
    const t0 = ctx.currentTime;
    beepAt(t0);
    beepAt(t0 + 0.25);
    beepAt(t0 + 0.50);

    setTimeout(() => {
      ctx.close().catch(() => {});
      audioContextRef.current = null;
    }, 1000);
  } catch { /* silencio */ }
}
```

**Notificación:**
- Si `Notification.permission === 'granted'` →
  `new Notification('Paso terminado', { body: stepLabel, tag: 'cs-step-timer' })`.
- Si `'default'` → mostrar link discreto `Activar avisos del navegador` debajo del
  display que llame a `Notification.requestPermission()`. NO pedir automático.
- Si `'denied'` → no mostrar el link.
- Wrap en `try/catch` (Safari iOS no-PWA puede no soportar).

### 4. UI según estado

| status | Display | Botones |
|---|---|---|
| `idle` | `MM:SS` total | `Iniciar contador` |
| `running` | `MM:SS` decreciente | `Pausar`, `Reiniciar` |
| `paused` | `MM:SS` congelado | `Reanudar`, `Reiniciar` |
| `done` | `¡Listo!` | `Reiniciar` |

**Usar las clases globales del sistema** (vienen del CSS portado de `Styles.html`):
- Botones: `<button className="primary">`, `<button className="ghost">`,
  `<button className="secondary">`.
- La estructura ya está en CSS global; no inventar variantes nuevas.

### 5. Integración en `PasoCard.tsx`

Importar `StepTimer` y agregarlo **debajo** del bloque que muestra `tiempoEstimado`
(la línea donde hoy se renderiza el string):

```tsx
import { StepTimer } from './StepTimer';

// ...dentro del JSX, después del campo Tiempo estimado:
<StepTimer
  tiempoEstimado={paso.tiempoEstimado}
  stepLabel={paso.momento || paso.titulo || 'Tu paso terminó'}
/>
```

**El componente decide solo si renderiza** (devuelve `null` si no hay tiempo válido).

### 6. Comportamiento por modo (`guiada` vs `scroll`)

**No requiere lógica especial en `StepTimer`** — el cleanup por unmount + cambio de
prop `tiempoEstimado` resuelve los dos casos automáticamente:

- **Modo `guiada`**: al cambiar de paso, el PasoCard se desmonta (o re-renderiza con
  otro `tiempoEstimado`) → el cleanup del effect detiene el timer del paso anterior.
  Comportamiento idéntico al especificado originalmente.
- **Modo `scroll`**: cada `PasoCard` está montado independientemente → cada uno
  puede tener su timer corriendo en paralelo (útil para multi-pot). Cuando el usuario
  sale de la pantalla, el unmount de `Cocinar.tsx` limpia todos los timers en cascada.

**Importante**: si el `PasoCard` se renderiza con `key={paso.nroPaso}` (probable),
React lo desmonta/remonta limpiamente al cambiar de paso en modo guiada. Verificar
que la `key` esté bien puesta — si no, ajustar.

### 7. Convivencia con el estado `tachado`

En modo `scroll` los pasos son destildables. **El timer y el tachado son
independientes**: tachar un paso NO detiene su timer (uno puede destildar por error),
y completar el timer NO tilda el paso automáticamente (separación de
responsabilidades). Si visualmente el paso tachado tiene `opacity: 0.5` o similar,
el timer hereda ese estilo — está bien, refuerza el feedback visual.

## Estilo

Agregar al CSS donde estén los estilos del componente PasoCard (o crear
`src/components/StepTimer.module.css` si el proyecto usa CSS modules — chequear
convención existente):

```css
.step-timer {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  text-align: center;
  transition: background 0.3s, border-color 0.3s, color 0.3s;
}
.step-timer-display {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}
.step-timer-actions {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  flex-wrap: wrap;
}
.step-timer-actions button { min-width: 7rem; }
.step-timer[data-state="done"] {
  background: var(--ok-bg);
  border-color: var(--ok-line);
  color: var(--ok-text);
  animation: step-timer-blink 0.6s ease-in-out 4;
}
@keyframes step-timer-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
.step-timer-notif-link {
  display: block;
  margin-top: 0.4rem;
  font-size: 0.78rem;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}
```

Si usan CSS modules → convertir clases a camelCase. Si todo es CSS global → agregar
en el archivo correspondiente.

## Restricciones

- **NO TOCAR `Migracion/`** — código muerto, solo consulta.
- **NO TOCAR el modelo Firestore ni Security Rules** — feature 100% cliente.
- **NO AGREGAR DEPENDENCIAS** a `package.json` — usar Web Audio, Notification API,
  React hooks.
- **TypeScript estricto** — sin `any` salvo en el fallback de `webkitAudioContext`.
- **Reutilizar el design system** (`.primary`, `.ghost`, tokens CSS) — no inventar
  variantes ni paletas.
- **Mobile-first**: app se usa cocinando con celular en la mano, botones ≥44px alto.
- **No romper el botón "Finalizar"** existente al pie de la pantalla (v1.5.3 E3.5.1).
- **No tocar la lógica de tachado** (`onToggleTachado`) — es feature aparte.

## Criterios de aceptación

- En un paso con `tiempoEstimado = "20 min"`: aparece tarjeta con `20:00` y botón
  `Iniciar contador`.
- En un paso con `tiempoEstimado = ""` / `"-"` / `null`: NO aparece nada (cero
  espacio ocupado, ni siquiera un wrapper vacío).
- `Iniciar` → cuenta regresiva `19:59`, `19:58`, ...
- `Pausar` congela; `Reanudar` retoma desde ahí.
- `Reiniciar` vuelve al total inicial y estado `idle`.
- Al llegar a `00:00`: parpadeo verde 4 veces + triple beep 880 Hz + notificación
  (si hay permiso).
- En **modo guiada**: cambiar de paso con Anterior/Siguiente detiene limpiamente el
  timer del paso anterior (sin sonar, sin notificar).
- En **modo scroll**: múltiples timers pueden correr en paralelo en pasos distintos
  sin interferir.
- Salir de la pantalla (navegar fuera de `/recetas/:id/cocinar`) detiene TODOS los
  timers en cascada.
- En React StrictMode (dev) no hay doble-beep ni timers fantasma por el doble-mount.
- Tests del parser pasan los ~10 casos.
- Build de TypeScript pasa sin warnings nuevos.
- `npm run lint` no agrega errores.

## Entregable

- Archivos nuevos: `src/utils/parseTime.ts` (+ test si hay setup), `src/components/StepTimer.tsx`
  (+ CSS según convención).
- Archivos modificados: `src/components/PasoCard.tsx` (import + uso de StepTimer).
- Resumen 4-5 líneas en el commit message + cualquier decisión de diseño no cubierta
  (convención CSS, nombres exactos, ubicación de archivos si tuvo que ajustarse).
