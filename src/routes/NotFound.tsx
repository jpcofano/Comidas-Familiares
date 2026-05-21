import { Link } from "react-router-dom";

export function NotFoundRoute() {
  return (
    <div className="card">
      <h2>Página no encontrada</h2>
      <p>La URL que buscás no existe.</p>
      <p className="meta">
        <Link to="/" style={{ color: "var(--primary)" }}>Volver al inicio</Link>
      </p>
    </div>
  );
}
