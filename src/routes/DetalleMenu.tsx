import { useParams } from "react-router-dom";

export function DetalleMenuRoute() {
  const { id } = useParams();
  return (
    <div className="card">
      <h2>Detalle de menú</h2>
      <p>Esta sección llega en Etapa 3.</p>
      <p className="meta">
        Menú: <code>{id}</code>. Va a mostrar las recetas componentes
        con tiempos y dificultad derivados al vuelo.
      </p>
    </div>
  );
}
