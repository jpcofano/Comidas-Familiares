# Comidas Familiares

## Bootstrap de configuración (one-off)

El script `scripts/bootstrap-config.ts` inicializa los documentos `/config/familia` y `/config/diccionarios` en Firestore. **Sin correrlo, ningún miembro de la familia puede loguearse** (la whitelist no existe todavía).

Es **idempotente**: podés correrlo N veces — siempre sobreescribe los docs con los datos canónicos, sin romper nada ni duplicar información.

### Cómo generár el service account

1. Abrí [Firebase Console → Project Settings](https://console.firebase.google.com/project/comida-familiar/settings/serviceaccounts/adminsdk)
2. Pestaña **Service accounts** → botón **"Generate new private key"** → confirmar
3. Renombrá el archivo descargado a `service-account.json`
4. Guardalo en `scripts/service-account.json` (está gitignored — **no lo commiteés**)

### Cómo correrlo

```bash
npm run bootstrap:config
```

El script falla con instrucciones claras si no encuentra el JSON de credenciales.

### Verificación

Después de correrlo, confirmá en [Firebase Console → Firestore](https://console.firebase.google.com/project/comida-familiar/firestore/data) que existen:
- `config/familia` con los 4 miembros
- `config/diccionarios` con los 10 enums

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Diseño visual

**Estado actual**: estilo "B · Cocina cálida" — paleta tierra cálida (marrón `#8a4a2f` + crema `#fdfaf6`).

**Provisorio**. La identidad visual definitiva se rediseñará en Etapa 6 (PWA pulida) con Claude Design. Hasta entonces, este estilo es la base de trabajo.

**Themeability**: todos los colores y radios viven en CSS variables en `src/styles/tokens.css`. Para cambiar paleta:

1. Editar los `--bg`, `--surface`, `--primary`, etc en `tokens.css`.
2. Ningún componente React tiene hex hardcodeado.
3. Re-deploy.

El cambio de paleta es 100% en CSS — no requiere modificar componentes.
