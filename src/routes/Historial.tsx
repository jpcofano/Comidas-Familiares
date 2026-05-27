import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getHistorialReciente } from "../data/historial";
import { normalizeText } from "../lib/canonical";
import { SummaryMetrics } from "../components/historial/SummaryMetrics";
import { FilterChips } from "../components/historial/FilterChips";
import { MonthGroup } from "../components/historial/MonthGroup";
import { EmptyState } from "../components/historial/EmptyState";
import type { Historial } from "../types/models";
import type { FiltroId } from "../components/historial/FilterChips";

// ─── Lógica de filtros ────────────────────────────────────────────────────────

const FILTROS: Record<FiltroId, (e: Historial) => boolean> = {
  todos: () => true,
  top:   (e) => e.resultado === "Excelente" || e.resultado === "Muy bueno",
  ok:    (e) => e.resultado === "Excelente" || e.resultado === "Muy bueno" || e.resultado === "Bueno",
  mal:   (e) => e.resultado === "Regular" || e.resultado === "Malísimo",
};

// ─── Ruta ─────────────────────────────────────────────────────────────────────

export function HistorialRoute() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState<Historial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroId>("todos");

  useEffect(() => {
    getHistorialReciente().then((r) => {
      if (r.ok) setEntries(r.value);
      else setError(r.error.message);
      setLoading(false);
    });
  }, []);

  // Filtro primero, búsqueda después
  const filtradas = useMemo(() => {
    let result = entries.filter(FILTROS[filtro]);
    if (busqueda.trim()) {
      const q = normalizeText(busqueda);
      result = result.filter((e) =>
        normalizeText(e.nombreSeleccion).includes(q) ||
        normalizeText(e.receta).includes(q) ||
        normalizeText(e.queSalioBien ?? "").includes(q)
      );
    }
    return result;
  }, [entries, filtro, busqueda]);

  // Agrupar por mes "YYYY-MM"
  const porMes = useMemo(() => {
    const map = new Map<string, Historial[]>();
    for (const entry of filtradas) {
      const key = entry.fechaRealizada.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    // Orden descendente por mes (más reciente primero)
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtradas]);

  if (loading) return <div className="card"><p className="meta">Cargando historial…</p></div>;
  if (error) return <div className="card"><p style={{ color: "var(--err-text)" }}>{error}</p></div>;

  // Determinar contexto para EmptyState
  const emptyContext = entries.length === 0
    ? "sin-entries"
    : busqueda.trim()
      ? "sin-matches-busqueda"
      : "sin-matches-filtro";

  return (
    <>
      {/* Header + métricas */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <h2 style={{ margin: "0 0 var(--space-3)", color: "var(--text-strong)" }}>Historial</h2>

        {/* Summary metrics (sobre total, no filtradas) */}
        <SummaryMetrics entries={entries} />

        {/* Filtros */}
        <div style={{ marginBottom: "var(--space-3)" }}>
          <FilterChips activo={filtro} onChange={setFiltro} />
        </div>

        {/* Buscador */}
        <input
          type="search"
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            fontSize: "var(--fs-sm)",
            background: "var(--surface-strong)",
            color: "var(--text)",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Lista o empty state */}
      {filtradas.length === 0 ? (
        <EmptyState context={emptyContext} />
      ) : (
        porMes.map(([mesKey, mesEntries]) => (
          <MonthGroup
            key={mesKey}
            mesKey={mesKey}
            entries={mesEntries}
            onClickEntry={(entry) => navigate(`/historial/${entry.idHist}`)}
          />
        ))
      )}
    </>
  );
}
