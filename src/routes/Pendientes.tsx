import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { subscribeToPlanesActivosMiembro } from "../data/planes";
import { getSemanaActual } from "../lib/fechas";
import type { Plan, MiembroId } from "../types/models";

export function PendientesRoute() {
  const { state } = useAuth();
  const semana = getSemanaActual();
  const [planes, setPlanes] = useState<Plan[]>([]);

  const memberId = state.status === "authenticated" ? state.user.memberId : null;
  const isJP = memberId === "juanpablo";

  useEffect(() => {
    if (!memberId) return;
    return subscribeToPlanesActivosMiembro(semana, memberId, setPlanes);
  }, [semana, memberId]);

  if (isJP) return <Navigate to="/" replace />;
  if (!memberId) return null;

  const pendientes = planes.filter(
    (p) => p.estado === "Cocinada" && !p.votos?.[memberId as MiembroId]
  );

  return (
    <div className="card">
      <h2 style={{ margin: "0 0 var(--space-3)" }}>Pendientes de evaluar</h2>
      {pendientes.length === 0 ? (
        <p className="meta">No hay planes esperando tu evaluación.</p>
      ) : (
        pendientes.map((p) => (
          <div key={p.idPlan} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-3) 0",
            borderBottom: "1px solid var(--border)",
          }}>
            <p style={{ margin: 0, fontWeight: "var(--fw-medium)", color: "var(--text-strong)" }}>
              {p.nombreSeleccion}
            </p>
            <Link to={`/voto/${p.idPlan}`}>
              <button className="btn btn-primary" style={{ fontSize: "var(--fs-sm)" }}>
                Evaluar
              </button>
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
