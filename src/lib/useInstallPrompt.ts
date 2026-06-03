import { useEffect, useState, useCallback } from "react";

// El evento beforeinstallprompt no está tipado en el DOM lib estándar.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type WinDeferred = { __deferredInstall?: BeforeInstallPromptEvent };

export function useInstallPrompt() {
  // Inicializa desde el evento capturado temprano en main.tsx (si ya se disparó).
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    () => (window as unknown as WinDeferred).__deferredInstall ?? null
  );
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onAvailable = () => {
      const ev = (window as unknown as WinDeferred).__deferredInstall;
      if (ev) setDeferred(ev);
    };
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener("om-install-available", onAvailable);   // emitido desde main.tsx
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("om-install-available", onAvailable);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    (window as unknown as WinDeferred).__deferredInstall = undefined;
    setDeferred(null); // el evento es de un solo uso
  }, [deferred]);

  // Detectar si ya corre como app instalada (display-mode standalone).
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari expone navigator.standalone
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  // iOS no dispara beforeinstallprompt → hay que mostrar instrucciones manuales.
  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  // Botón nativo disponible solo si: hay evento, no instalada, no standalone.
  const canInstall = !!deferred && !installed && !isStandalone;

  return { canInstall, promptInstall, isIOS, isStandalone };
}
