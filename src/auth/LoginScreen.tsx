import { useState } from "react";
import { PlatoMark } from "../brand/PlatoMark";
import { useAuth } from "./useAuth";
import "./auth.css";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon" aria-hidden="true">
          <PlatoMark size={40} variant="vapor" strokeWidth={1.6} />
        </div>
        <h1>Comida Familiar</h1>
        <p className="meta">
          Planificación semanal de comidas para la familia Cofano
        </p>
        <button
          type="button"
          className="btn btn-primary login-button"
          onClick={handleSignIn}
          disabled={busy}
        >
          {busy ? "Entrando…" : "Entrar con Google"}
        </button>
        {error && (
          <p className="login-error">{error}</p>
        )}
      </div>
    </div>
  );
}
