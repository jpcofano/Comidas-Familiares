import { useAuth } from "./auth/useAuth";
import { LoginScreen } from "./auth/LoginScreen";
import { UnauthorizedScreen } from "./auth/UnauthorizedScreen";

function App() {
  const { state, signOut } = useAuth();

  if (state.status === "loading") {
    return <div style={{ padding: 32 }}>Cargando…</div>;
  }

  if (state.status === "unauthenticated") {
    return <LoginScreen />;
  }

  if (state.status === "unauthorized") {
    return <UnauthorizedScreen email={state.email} />;
  }

  return (
    <div style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <h1>Comida Familiar</h1>
      <p>Hola, <strong>{state.user.nombre}</strong> 👋</p>
      <p style={{ color: "#888", fontSize: 14 }}>
        memberId: <code>{state.user.memberId}</code><br />
        rol: <code>{state.user.rol}</code>
      </p>
      <button onClick={signOut} style={{ marginTop: 24 }}>
        Cerrar sesión
      </button>
    </div>
  );
}

export default App;
