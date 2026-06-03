import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/utilities.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { detectAndMarkDesktop } from './styles/detectDesktop'

detectAndMarkDesktop();

// Capturá el evento de instalación apenas el navegador lo emita. Suele dispararse
// antes de que el usuario abra su perfil, así que lo guardamos en window y avisamos
// con un evento propio que useInstallPrompt() escucha.
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as unknown as { __deferredInstall?: Event }).__deferredInstall = e;
  window.dispatchEvent(new Event("om-install-available"));
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
