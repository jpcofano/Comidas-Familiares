import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Manifest viene de public/manifest.json — el plugin no genera el suyo.
      manifest: false,
      // El SW se registra automáticamente y se actualiza en background.
      registerType: 'autoUpdate',
      workbox: {
        // Precachea todo el shell estático.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // SPA: navegar a cualquier ruta sin red sirve index.html del cache.
        navigateFallback: 'index.html',
        // Excluye las rutas de redirección de Firebase Auth del fallback.
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
        // Las peticiones a firestore.googleapis.com y dominios de Firebase son
        // cross-origin — el SW no las intercepta sin configuración explícita,
        // y la persistencia offline del SDK de Firestore ya las maneja.
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
