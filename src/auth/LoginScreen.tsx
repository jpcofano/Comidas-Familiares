import { useState } from "react";
import { useAuth } from "./useAuth";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    try {
      await signIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#fafafa",
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Comida Familiar</h1>
      <p style={{ color: "#666", marginBottom: 32, textAlign: "center" }}>
        Planificación semanal de comidas para la familia Cofano
      </p>
      <button
        onClick={handleSignIn}
        style={{
          padding: "12px 24px",
          fontSize: 16,
          cursor: "pointer",
          borderRadius: 8,
          border: "1px solid #ddd",
          backgroundColor: "#fff",
        }}
      >
        Entrar con Google
      </button>
      {error && (
        <p style={{ color: "red", marginTop: 16, maxWidth: 320, textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}
