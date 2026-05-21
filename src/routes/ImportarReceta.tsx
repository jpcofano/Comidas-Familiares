import { useAuth } from "../auth/useAuth";
import { Navigate } from "react-router-dom";

export function ImportarRecetaRoute() {
  const { state } = useAuth();

  if (
    state.status !== "authenticated" ||
    state.user.memberId !== "juanpablo"
  ) {
    return <Navigate to="/biblioteca" replace />;
  }

  return (
    <div className="card">
      <h2>Importar receta</h2>
      <p>Esta sección llega en Etapa 2.</p>
      <p className="meta">
        Va a permitir pegar JSON/texto de una receta y normalizarla
        al modelo canónico antes de guardarla en /recetas.
      </p>
    </div>
  );
}
