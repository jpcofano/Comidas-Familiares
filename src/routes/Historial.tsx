import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getHistorialReciente } from "../data/historial";
import { SkeletonList } from "../components/skeletons/SkeletonList";
import { normalizeText } from "../lib/canonical";
import type { Historial } from "../types/models";

// ─── Badge de resultado ───────────────────────────────────────────────────────

function ResultadoBadge({ resultado }: { resultado: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    "Excelente":  { bg: "var(--ok-bg)",      color: "var(--ok-text)" },
    "Muy bueno":  { bg: "var(--ok-bg)",      color: "var(--ok-text)" },
    "Bueno":      { bg: "var(--info-bg)",    color: "var(--info-text)" },
    "Regular":    { bg: "var(--warn-bg)",    color: "var(--warn-text)" },
    "Malísimo":   { bg: "var(--err-bg)",     color: "var(--err-text)" },
  };
  const s = colors[resultado] ?? { bg: "var(--surface-alt)", color: "var(--muted)" };
  return (
    <span style={{
      fontSize: "var(--fs-xs)", padding: "2px 8px",
      borderRadius: "var(--radius-full)",
      background: s.bg, color: s.color,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {resultado}
    </span>
  );
}

// ─── Ruta ─────────────────────────────────────────────────────────────────────

export function HistorialRoute() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Historial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    getHistorialReciente().then((r) => {
      if (r.ok) setEntries(r.value);
      else setError(r.error.message);
      setLoading(false);
    });
  }, []);

  const filtradas = busqueda.trim()
    ? entries.filter((e) => {
        const q = normalizeText(busqueda);
        return normalizeText(e.nombreSeleccion).includes(q) || normalizeText(e.receta).includes(q);
      })
    : entries;

  if (loading) return <div className="card"><SkeletonList count={5} /></div>;
  if (error) return <div className="card"><p style={{ color: "var(--err-text)" }}>{error}</p></div>;

  return (
    <>
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <h2 style={{ margin: "0 0 var(--space-3)", color: "var(--text-strong)" }}>Historial</h2>
        <input
          type="search"
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: "100%", padding: "8px 12px",
            borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
            fontSize: "var(--fs-sm)", background: "var(--surface-strong)",
            color: "var(--text)", boxSizing: "border-box",
          }}
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
          <p className="meta">
            {entries.length === 0
              ? "Todavía no hay platos evaluados."
              : "Ningún resultado para esa búsqueda."}
          </p>
        </div>
      ) : (
        filtradas.map((entry) => (
          <div
            key={entry.idHist}
            className="card card-interactive"
            onClick={() => navigate(`/historial/${entry.idHist}`)}
            style={{ marginBottom: "var(--space-2)", cursor: "pointer" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
              <p style={{ fontWeight: "var(--fw-medium)", color: "var(--text-strong)", margin: 0, flex: 1, minWidth: 0 }}>
                {entry.nombreSeleccion}
              </p>
              {entry.resultado && <ResultadoBadge resultado={entry.resultado} />}
            </div>
            <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-1)", flexWrap: "wrap" }}>
              <span className="meta">{entry.fechaRealizada}</span>
              <span className="meta">Promedio: {entry.promedio}</span>
              {entry.ocasion && <span className="meta">{entry.ocasion}</span>}
            </div>
          </div>
        ))
      )}
    </>
  );
}
