import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { subscribeToPlanesActivosMiembro } from "../data/planes";
import { getHistorialReciente } from "../data/historial";
import { getSemanaActual } from "../lib/fechas";
import type { Plan, Historial, MiembroId } from "../types/models";

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    "Elegida":          { bg: "var(--surface-alt)",  color: "var(--muted)" },
    "Compra pendiente": { bg: "var(--warn-bg)",       color: "var(--warn-text)" },
    "Compra lista":     { bg: "var(--info-bg)",       color: "var(--info-text)" },
    "Cocinando":        { bg: "var(--primary)",       color: "#fff" },
    "Cocinada":         { bg: "var(--ok-bg)",         color: "var(--ok-text)" },
  };
  const s = styles[estado] ?? styles["Elegida"];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "var(--radius-full)",
      fontSize: "var(--fs-xs)",
      fontWeight: "var(--fw-medium)",
      background: s.bg,
      color: s.color,
      whiteSpace: "nowrap",
    }}>
      {estado}
    </span>
  );
}

function PlanRow({ plan }: { plan: Plan }) {
  const esReceta = plan.tipoSeleccion === "receta";
  const inner = (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "var(--space-2)",
      padding: "var(--space-3) 0",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: "var(--fw-medium)", color: "var(--text-strong)" }}>
          {plan.nombreSeleccion}
        </p>
        <p className="meta" style={{ margin: 0 }}>{plan.tipoPlan}</p>
      </div>
      <EstadoBadge estado={plan.estado} />
    </div>
  );

  if (esReceta) {
    return <Link to={`/recetas/${plan.idSeleccion}`} style={{ textDecoration: "none", display: "block" }}>{inner}</Link>;
  }
  return <div>{inner}</div>;
}

function PendienteRow({ plan }: { plan: Plan }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "var(--space-2)",
      padding: "var(--space-3) 0",
      borderBottom: "1px solid var(--border)",
    }}>
      <p style={{ margin: 0, fontWeight: "var(--fw-medium)", color: "var(--text-strong)" }}>
        {plan.nombreSeleccion}
      </p>
      <Link to={`/voto/${plan.idPlan}`}>
        <button className="btn btn-primary" style={{ fontSize: "var(--fs-sm)" }}>
          Evaluar
        </button>
      </Link>
    </div>
  );
}

function HistorialRow({ entrada, miembroId }: { entrada: Historial; miembroId: MiembroId }) {
  const miPuntaje = entrada.calificaciones?.[miembroId];
  return (
    <Link to={`/historial/${entrada.idHist}`} style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-2) 0",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--text-strong)" }}>
            {entrada.nombreSeleccion}
          </p>
          <p className="meta" style={{ margin: 0, fontSize: "var(--fs-xs)" }}>
            {entrada.fechaRealizada}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {miPuntaje != null && (
            <p style={{ margin: 0, fontSize: "var(--fs-sm)", fontWeight: "var(--fw-medium)" }}>
              Mi nota: {miPuntaje}
            </p>
          )}
          {entrada.resultado && (
            <p className="meta" style={{ margin: 0, fontSize: "var(--fs-xs)" }}>{entrada.resultado}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export function MemberDashboard() {
  const { state } = useAuth();
  const semana = getSemanaActual();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  const memberId = state.status === "authenticated" ? state.user.memberId : null;
  const nombre   = state.status === "authenticated" ? state.user.nombre   : "";

  useEffect(() => {
    if (!memberId) return;
    return subscribeToPlanesActivosMiembro(semana, memberId, setPlanes);
  }, [semana, memberId]);

  useEffect(() => {
    getHistorialReciente().then((r) => {
      if (r.ok) setHistorial(r.value.slice(0, 15));
      setLoadingHistorial(false);
    });
  }, []);

  if (!memberId) return null;

  const pendientes = planes.filter(
    (p) => p.estado === "Cocinada" && !p.votos?.[memberId as MiembroId]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* Saludo */}
      <div className="card">
        <h2 style={{ margin: "0 0 var(--space-1)" }}>Hola, {nombre}</h2>
        <p className="meta" style={{ margin: 0 }}>Semana del {semana}</p>
      </div>

      {/* Mis planes de la semana */}
      <div className="card">
        <h3 style={{ margin: "0 0 var(--space-2)" }}>Mi semana</h3>
        {planes.length === 0 ? (
          <p className="meta">No hay planes activos esta semana.</p>
        ) : (
          planes.map((p) => <PlanRow key={p.idPlan} plan={p} />)
        )}
      </div>

      {/* Pendientes de evaluar */}
      <div className="card">
        <h3 style={{ margin: "0 0 var(--space-2)" }}>Pendientes de evaluar</h3>
        {pendientes.length === 0 ? (
          <p className="meta">No hay planes esperando tu evaluación.</p>
        ) : (
          pendientes.map((p) => <PendienteRow key={p.idPlan} plan={p} />)
        )}
      </div>

      {/* Mi historial */}
      <div className="card">
        <h3 style={{ margin: "0 0 var(--space-2)" }}>Mi historial</h3>
        {loadingHistorial ? (
          <p className="meta">Cargando…</p>
        ) : historial.length === 0 ? (
          <p className="meta">Todavía no hay evaluaciones registradas.</p>
        ) : (
          historial.map((h) => (
            <HistorialRow key={h.idHist} entrada={h} miembroId={memberId as MiembroId} />
          ))
        )}
        {!loadingHistorial && historial.length > 0 && (
          <Link to="/historial" style={{ display: "block", marginTop: "var(--space-2)", color: "var(--primary)", fontSize: "var(--fs-sm)" }}>
            Ver historial completo →
          </Link>
        )}
      </div>

    </div>
  );
}
