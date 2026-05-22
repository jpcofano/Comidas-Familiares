import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export function HomeRoute() {
  const { state } = useAuth();
  const isJP =
    state.status === "authenticated" && state.user.memberId === "juanpablo";

  return (
    <div className="card">
      <h2>Inicio</h2>
      <p>Esta sección llega en Etapa 3.</p>
      <p className="meta">
        Va a mostrar: la Especial activa de la semana, extras, planes En proceso,
        resumen de compras, y accesos rápidos.
      </p>

      {isJP && (
        <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
          <p className="meta" style={{ marginBottom: "0.5rem" }}>Herramientas JP</p>
          <Link
            to="/menus/importar"
            style={{
              display: "inline-block",
              padding: "0.4rem 0.9rem",
              background: "var(--color-primary)",
              color: "#fff",
              borderRadius: "6px",
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            + Importar menú
          </Link>
        </div>
      )}
    </div>
  );
}
