# PROMPT E3.1.1 — Fix de la Home (E3.1)

> Mini-prompt de corrección sobre la Home entregada en E3.1.
> Pegar este archivo completo a Claude Code en la terminal del repo.

---

## 1. Contexto

La Home modo JP de E3.1 ya está en producción y **funciona**: las acciones "Marcar
Cocinada", "Descartar" y la navegación a evaluar andan correctamente. Esta etapa NO
toca esa lógica — son **tres ajustes acotados**, dos visuales y uno de navegación.

No se re-implementa nada. No se tocan las acciones ni el data layer.

---

## 2. Las tres correcciones

### 2.1 Texto fantasma — contraste de los títulos

**Problema:** los títulos de la Home se ven en gris muy claro, casi ilegibles sobre
el fondo crema de las cards. Afecta el título de sección ("Esta semana") y los
nombres de receta dentro de cada tarjeta ("Bondiola braseada al Malbec", etc.).

**Causa probable:** un token de color de texto mal aplicado — probablemente un color
pensado para fondo oscuro, o un estado "muted"/"disabled", usado donde debería ir el
color de texto principal sobre fondo claro.

**Corrección:** revisá los tokens de diseño portados de `Styles.html` y aplicá el
token de **texto principal sobre fondo claro** a esos títulos. NO parchees con un
color hex hardcodeado — usá el token correcto del sistema de diseño, para que sea
consistente con el resto de las pantallas y no se vuelva a romper. Los títulos deben
quedar perfectamente legibles (contraste alto sobre el fondo crema de las cards).

### 2.2 Anidar el extra bajo el Especial

**Problema:** hoy la Home muestra tres secciones del mismo peso visual —Especial,
Extras, En proceso— como si fueran independientes. Pero un Especial extra **cuelga**
del Especial (`origen: "extra:<idPlan del Especial>"`): es la misma comida ampliada,
no un plan suelto.

**Corrección:** reforzá visualmente esa jerarquía. El/los extra(s) deben verse
**asociados al Especial del que dependen** — anidados, indentados, o agrupados dentro
del bloque del Especial, en lugar de flotar como una sección separada de igual
jerarquía. La sección "En proceso" sí es independiente y se mantiene como bloque
aparte. Usá los tokens de diseño existentes; es un cambio de layout/jerarquía, no de
colores nuevos.

### 2.3 Botón "Ver receta" en las tres tarjetas

**Contexto del flujo (confirmado contra el Apps Script):** el flujo de cocción es
Home → **detalle de receta** → botón "Cocinar" → **pasos**. El detalle de receta y la
pantalla de pasos son etapas futuras (E3.3 y E3.5) — NO se construyen acá.

**Corrección:** agregá un botón **"Ver receta"** a cada una de las tres tarjetas de
plan (Especial, extra, En proceso), junto a los botones de acción que ya tienen
("Marcar Cocinada", "Descartar"). El botón **navega a la ruta del detalle de receta**
(`/recetas/:id` o la que defina el routing de E1.2), pasando el `idReceta` /
`idSeleccion` del plan.

Importante:
- La ruta del detalle ya existe en el routing de E1.2 — hoy es un placeholder. El
  botón debe navegar igual; cuando E3.3 construya el detalle, el enlace ya funciona.
- Para planes con `tipoSeleccion === "menu"`, el destino puede ser el detalle de
  menú (`/menus/:id`) en vez del de receta — usá la ruta que corresponda según el
  `tipoSeleccion` del plan. Si esto agrega complejidad, dejá un `// TODO E3.3` y por
  ahora navegá al detalle de receta usando `recetaPrincipal` / `idSeleccion`; lo
  importante es que el botón exista y navegue.
- NO se implementa el detalle ni el modo cocinar en este prompt.

---

## 3. Criterios de aceptación

1. Los títulos de la Home (sección y nombres de receta) son legibles, con buen
   contraste, usando el token de texto correcto (no un hex hardcodeado).
2. Los extras se muestran visualmente anidados/asociados al Especial; "En proceso"
   sigue como bloque independiente.
3. Las tres tarjetas tienen botón "Ver receta" que navega a la ruta del detalle.
4. Las acciones existentes (Marcar Cocinada, Descartar, ir a evaluar) siguen
   funcionando sin cambios.
5. `npm run build` sin errores. `npm run test` sigue verde (set actual intacto).
6. Deploy a producción: `firebase deploy --only hosting`.
7. Commits con prefijo `Stage 3.1.1:` + push.

---

## 4. Qué NO tocar

- **La lógica de las acciones de la Home** (Marcar Cocinada, Descartar con cascada,
  navegación a evaluar): funcionan, no se tocan.
- **El data layer de E2.2**, los **types de E2.1**, `firestore.rules`,
  `firestore.indexes.json`, los scripts: fuera de scope.
- **El detalle de receta y el modo cocinar**: son E3.3 y E3.5. Acá solo se deja el
  botón que navega a esa ruta — no se construye la pantalla.
- **El set de tests existente**: no se edita.

---

## 5. Antes de cerrar — reporte esperado

- Tabla de criterios (1–7) con estado.
- Qué token de color se aplicó a los títulos y de dónde salió.
- Cómo quedó resuelta visualmente la anidación del extra.
- A qué ruta navega "Ver receta" y cómo se maneja el caso `tipoSeleccion === "menu"`.
- Mostrame el diff de los archivos de la Home antes de guardar.
- Confirmación de que las acciones existentes siguen intactas.
- Lista de commits `Stage 3.1.1:`.
- Recordatorio para JP: abrir `https://comida-familiar.web.app` en incógnito,
  confirmar que los títulos se leen bien y que "Ver receta" navega (aunque el detalle
  todavía sea placeholder).
