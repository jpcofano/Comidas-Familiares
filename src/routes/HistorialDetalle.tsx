import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { getHistorialPorId } from "../data/historial";
import { MIEMBRO_IDS } from "../types/models";
import type { Historial, MiembroId } from "../types/models";
import { MemberAvatar } from "../components/MemberAvatar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOMBRE_MIEMBRO: Record<MiembroId, string> = {
  juanpablo: "Juan Pablo",
  maria: "María",
  sofia: "Sofía",
  federico: "Federico",
};

function ResultadoBadge({ resultado }: { resultado: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    "Excelente": { bg: "var(--ok-bg)",   color: "var(--ok-text)" },
    "Muy bueno": { bg: "var(--ok-bg)",   color: "var(--ok-text)" },
    "Bueno":     { bg: "var(--info-bg)", color: "var(--info-text)" },
    "Regular":   { bg: "var(--warn-bg)", color: "var(--warn-text)" },
    "Malísimo":  { bg: "var(--err-bg)",  color: "var(--err-text)" },
  };
  const s = colors[resultado] ?? { bg: "var(--surface-alt)", color: "var(--muted)" };
  return (
    <span style={{
      display: "inline-block", padding: "4px 14px",
      borderRadius: "var(--radius-full)", fontSize: "var(--fs-sm)",
      fontWeight: "var(--fw-medium)", background: s.bg, color: s.color,
    }}>
      {resultado}
    </span>
  );
}

function Campo({ label, valor }: { label: string; valor: string | undefined }) {
  if (!valor) return null;
  return (
    <div style={{ marginBottom: "var(--space-2)" }}>
      <span style={{ color: "var(--muted)", fontSize: "var(--fs-xs)" }}>{label}: </span>
      <span style={{ fontSize: "var(--fs-sm)" }}>{valor}</span>
    </div>
  );
}

// ─── Ruta ─────────────────────────────────────────────────────────────────────

export function HistorialDetalleRoute() {
  const { idHist } = useParams<{ idHist: string }>();
  const navigate = useNavigate();

  const [entry, setEntry] = useState<Historial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idHist) return;
    getHistorialPorId(idHist).then((r) => {
      if (r.ok) setEntry(r.value);
      else setError(r.error.message);
      setLoading(false);
    });
  }, [idHist]);

  if (loading) return <div className="card"><p className="meta">Cargando…</p></div>;
  if (error || !entry) {
    return (
      <div className="card">
        <p style={{ color: "var(--err-text)" }}>{error ?? "Entrada no encontrada."}</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: "var(--space-3)" }}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ padding: "4px", display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ margin: 0, fontSize: "var(--fs-lg)", color: "var(--text-strong)", flex: 1, minWidth: 0 }}>
          {entry.nombreSeleccion}
        </h2>
      </div>

      {/* Hero score */}
      <div className="card" style={{ marginBottom: "var(--space-3)", textAlign: "center", padding: "var(--space-6) var(--space-4)" }}>
        <div style={{ marginBottom: "var(--space-2)", lineHeight: 1 }}>
          <span style={{ fontSize: 36, fontWeight: "var(--fw-bold)", color: "var(--primary)" }}>
            {entry.promedio}
          </span>
          <span style={{ fontSize: 18, color: "var(--muted)", marginLeft: 4 }}> / 10</span>
        </div>
        {entry.resultado && (
          <div style={{ marginBottom: "var(--space-3)" }}>
            <ResultadoBadge resultado={entry.resultado} />
          </div>
        )}
        <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", margin: "0 0 2px" }}>{entry.fechaRealizada}</p>
        {entry.ocasion && <p className="meta" style={{ margin: 0 }}>{entry.ocasion}</p>}
      </div>

      {/* Ver receta / menú */}
      {((entry.tipoSeleccion === "receta" && entry.idReceta) ||
        (entry.tipoSeleccion === "menu" && entry.idMenu)) && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          {entry.tipoSeleccion === "receta" && entry.idReceta && (
            <Link to={`/recetas/${entry.idReceta}`} style={{ fontSize: "var(--fs-sm)", color: "var(--primary)" }}>
              Ver receta →
            </Link>
          )}
          {entry.tipoSeleccion === "menu" && entry.idMenu && (
            <Link to={`/menus/${entry.idMenu}`} style={{ fontSize: "var(--fs-sm)", color: "var(--primary)" }}>
              Ver menú →
            </Link>
          )}
        </div>
      )}

      {/* Calificaciones */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: "0 0 var(--space-3)" }}>
          Calificaciones
        </p>
        {MIEMBRO_IDS.map((mid, idx) => {
          const nota = entry.calificaciones?.[mid as MiembroId];
          const comentario = entry.comentarios?.[mid as MiembroId];
          const isLast = idx === MIEMBRO_IDS.length - 1;
          return (
            <div
              key={mid}
              style={{
                paddingBottom: "var(--space-2)",
                marginBottom: "var(--space-2)",
                borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <MemberAvatar name={NOMBRE_MIEMBRO[mid as MiembroId]} size={24} />
                  <span style={{ fontSize: "var(--fs-sm)", color: "var(--text)" }}>
                    {NOMBRE_MIEMBRO[mid as MiembroId]}
                  </span>
                </div>
                <span style={{
                  fontSize: "var(--fs-sm)",
                  fontWeight: nota != null ? "var(--fw-semibold)" : "var(--fw-regular)",
                  color: nota != null ? "var(--text-strong)" : "var(--muted)",
                }}>
                  {nota != null ? nota : "Sin voto"}
                </span>
              </div>
              {comentario && (
                <p style={{
                  margin: "var(--space-1) 0 0",
                  paddingLeft: 30,
                  fontSize: "var(--fs-xs)",
                  color: "var(--muted)",
                  fontStyle: "italic",
                  lineHeight: "var(--lh-base)",
                }}>
                  {comentario}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Notas del cocinero */}
      {(entry.repetir || entry.costoRealAprox || entry.dificultadReal ||
        entry.queSalioBien || entry.queCambiaria || entry.notasFamiliares) && (
        <div className="card">
          <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: "0 0 var(--space-3)" }}>
            Notas del cocinero
          </p>
          <Campo label="¿Repetir?" valor={entry.repetir || undefined} />
          <Campo label="Costo real" valor={entry.costoRealAprox || undefined} />
          <Campo label="Dificultad real" valor={entry.dificultadReal || undefined} />
          <Campo label="Qué salió bien" valor={entry.queSalioBien || undefined} />
          <Campo label="Qué cambiaría" valor={entry.queCambiaria || undefined} />
          <Campo label="Notas familiares" valor={entry.notasFamiliares || undefined} />
        </div>
      )}
    </>
  );
}
