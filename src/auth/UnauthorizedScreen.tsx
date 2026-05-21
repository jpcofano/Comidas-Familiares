import { Lock } from "lucide-react";
import { useAuth } from "./useAuth";
import "./auth.css";

interface Props {
  email: string;
}

export function UnauthorizedScreen({ email }: Props) {
  const { signOut } = useAuth();

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon" aria-hidden="true">
          <Lock size={36} strokeWidth={1.5} />
        </div>
        <h1 style={{ fontSize: "var(--fs-xl)" }}>Acceso restringido</h1>
        <p>Esta app es de uso familiar privado. Tu mail no está autorizado.</p>
        <p className="meta">Mail intentado: {email}</p>
        <button
          type="button"
          className="btn btn-secondary login-button"
          onClick={signOut}
        >
          Salir
        </button>
      </div>
    </div>
  );
}
