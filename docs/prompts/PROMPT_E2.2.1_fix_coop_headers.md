# PROMPT E2.2.1 — Fix COOP headers para Firebase Auth popup

## Contexto

Tras el deploy de E2.2, la consola en producción muestra warnings:

```
Cross-Origin-Opener-Policy policy would block the window.closed call.
Cross-Origin-Opener-Policy policy would block the window.close call.
```

Estos warnings los emite Chrome porque `signInWithPopup` de Firebase Auth necesita monitorear el popup con `window.closed` / `window.close`, y la política COOP por defecto del browser lo bloquea. La auth funciona igual, pero queremos eliminar el ruido en consola configurando el header correcto desde Firebase Hosting.

**Scope**: cambio de configuración únicamente. No tocar código de la app.

## Tarea única — Agregar headers en `firebase.json` y redeployar Hosting

### 1. Leer `firebase.json` actual y mostrar el contenido

Antes de modificar, mostrar el archivo completo para que JP confirme.

### 2. Modificar `firebase.json` para agregar la sección `headers` dentro de `hosting`

El bloque a agregar (mergeado con la config existente, NO reemplazar todo el archivo):

```json
"headers": [
  {
    "source": "**",
    "headers": [
      {
        "key": "Cross-Origin-Opener-Policy",
        "value": "same-origin-allow-popups"
      }
    ]
  }
]
```

**Reglas importantes**:
- Si ya existe una key `headers` en `hosting`, fusionar — no duplicar.
- NO tocar `public`, `ignore`, `rewrites`, ni ninguna otra config existente.
- Mostrar el diff antes del save y esperar confirmación.

### 3. Validar JSON

Ejecutar `node -e "JSON.parse(require('fs').readFileSync('firebase.json', 'utf8')); console.log('JSON válido')"` o equivalente. Si falla, abortar.

### 4. Build de la app

```bash
npm run build
```

Debe terminar sin errores. (No hace falta porque el cambio es solo de config de Hosting, pero confirmamos que nada se rompió.)

### 5. Deploy solo de Hosting

```bash
firebase deploy --only hosting
```

Capturar la URL del release y el hosting URL final. Mostrar el output completo en respuesta.

### 6. Commit y push

```bash
git add firebase.json
git commit -m "Stage 2.2: add COOP headers to silence Firebase Auth popup warnings"
git push
```

**Verificar antes del `git add`**: que `scripts/service-account.json` NO esté en staging (`git status` primero).

## Criterios de aceptación

- [ ] `firebase.json` tiene la sección `headers` con `Cross-Origin-Opener-Policy: same-origin-allow-popups` aplicada a `source: "**"`.
- [ ] El resto de `firebase.json` queda intacto.
- [ ] `npm run build` pasa sin errores.
- [ ] `firebase deploy --only hosting` termina con éxito y muestra "Deploy complete".
- [ ] 1 commit con prefijo `Stage 2.2:` + push.

## Verificación manual de JP (post-Code)

1. Abrir `https://comida-familiar.web.app` en Chrome → DevTools → Network → recargar.
2. Click sobre el documento HTML raíz → tab "Headers" → en "Response Headers" debe aparecer `cross-origin-opener-policy: same-origin-allow-popups`.
3. Console: hacer login. Los warnings COOP de `window.closed` y `window.close` ya no deberían aparecer.

## Nota

Si después del deploy los warnings persisten, puede ser caché del browser. Probar en ventana incógnito antes de pensar que el fix no anduvo.
