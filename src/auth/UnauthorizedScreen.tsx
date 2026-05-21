import { useAuth } from "./useAuth";

interface Props {
  email: string;
}

export function UnauthorizedScreen({ email }: Props) {
  const { signOut } = useAuth();

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
      <p style={{ fontSize: 18, marginBottom: 8, textAlign: "center", maxWidth: 360 }}>
        Esta app es de uso familiar privado. Tu mail no está autorizado.
      </p>
      <p style={{ color: "#888", fontSize: 13, marginBottom: 32 }}>
        Mail intentado: {email}
      </p>
      <button
        onClick={signOut}
        style={{
          padding: "10px 24px",
          fontSize: 15,
          cursor: "pointer",
          borderRadius: 8,
          border: "1px solid #ddd",
          backgroundColor: "#fff",
        }}
      >
        Salir
      </button>
    </div>
  );
}
