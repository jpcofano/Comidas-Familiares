import { app } from "./firebase";
import "./App.css";

function App() {
  return (
    <div style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <h1>Comida Familiar</h1>
      <p>Etapa 0 — Firebase conectado ✅</p>
      <p style={{ color: "#888", fontSize: 14 }}>
        Project ID: <code>{app.options.projectId}</code>
      </p>
    </div>
  );
}

export default App;