import { useParams } from "react-router-dom";

export function CocinarRoute() {
  const { id } = useParams();
  return (
    <div className="card">
      <h2>Modo cocinar</h2>
      <p>Esta sección llega en Etapa 3.</p>
      <p className="meta">
        Receta: <code>{id}</code>. Va a mostrar los pasos uno a uno
        con pantalla activa y temporizador opcional.
      </p>
    </div>
  );
}
