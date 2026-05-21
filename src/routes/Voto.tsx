import { useParams } from "react-router-dom";

export function VotoRoute() {
  const { idPlan } = useParams();
  return (
    <div className="card">
      <h2>Votar plan</h2>
      <p>Esta sección llega en Etapa 3.</p>
      <p className="meta">
        Plan: <code>{idPlan}</code>. Va a permitir a cada miembro
        puntuar y comentar el plan de la semana.
      </p>
    </div>
  );
}
