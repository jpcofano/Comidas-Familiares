import { useParams } from "react-router-dom";

export function DetalleRecetaRoute() {
  const { id } = useParams();
  return (
    <div className="card">
      <h2>Detalle de receta</h2>
      <p>Esta sección llega en Etapa 3.</p>
      <p className="meta">
        Receta: <code>{id}</code>. Va a mostrar ingredientes, pasos,
        tiempos, proteína, macros opcionales y botón "Cocinar".
      </p>
    </div>
  );
}
