import { useState, useEffect, useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getRecetas } from "../data/recetas";
import { subscribeVisibilidad, toggleVisibilidadReceta } from "../data/visibilidad";
import { filtrarRecetas, FILTROS_INICIALES } from "../lib/filtros";
import { SkeletonList } from "../components/skeletons/SkeletonList";
import type { Receta } from "../types/models";
import type { VisibilidadBiblioteca } from "../types/models";
import { TIPOS_ITEM, COCINAS, GRUPOS_PROTEINA, GRUPOS_PROTEINA_ORDEN } from "../types/models";

const MIEMBROS = [
  { id: "maria",    nombre: "María",    color: "#74324a" },
  { id: "sofia",    nombre: "Sofía",    color: "#3c4a6e" },
  { id: "federico", nombre: "Federico", color: "#2e5d2e" },
] as const;

export function VisibilidadBibliotecaRoute() {
  const { state } = useAuth();
  const isJP = state.status === "authenticated" && state.user.memberId === "juanpablo";
  if (!isJP) return <Navigate to="/biblioteca" replace />;
  return <VisibilidadEditor />;
}

function VisibilidadEditor() {
  const navigate = useNavigate();
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [visibilidad, setVisibilidad] = useState<VisibilidadBiblioteca>({ maria: [], sofia: [], federico: [] });
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [tipoItem, setTipoItem] = useState("");
  const [proteina, setProteina] = useState("");
  const [cocina, setCocina] = useState("");

  useEffect(() => {
    getRecetas().then(rs => { setRecetas(rs); setLoading(false); });
    return subscribeVisibilidad(setVisibilidad);
  }, []);

  const filtradas = useMemo(
    () => filtrarRecetas(recetas, { ...FILTROS_INICIALES, tipoItem, proteina, cocina, busqueda }),
    [recetas, tipoItem, proteina, cocina, busqueda],
  );

  const selectStyle: React.CSSProperties = {
    padding: "6px 10px", borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)", background: "var(--surface-strong)",
    color: "var(--text)", fontSize: "var(--fs-sm)", flex: 1, minWidth: 0,
  };

  if (loading) return <div className="card"><SkeletonList count={6} /></div>;

  const totales = {
    maria:    visibilidad.maria.length,
    sofia:    visibilidad.sofia.length,
    federico: visibilidad.federico.length,
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ padding: "4px", display: "flex", alignItems: "center" }}
        >
          <ChevronLeft size={20} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-strong)" }}>
          Asignar recetas
        </h1>
      </div>
      <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", margin: "0 0 var(--space-3)" }}>
        Elegí qué recetas ve cada miembro en su biblioteca. Pueden cocinar cualquier receta que les asignes en un plan, esté o no acá.
      </p>

      {/* Contadores por miembro */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        {MIEMBROS.map(m => (
          <div key={m.id} style={{
            flex: 1, padding: "var(--space-2) var(--space-3)",
            background: "var(--surface-strong)", borderRadius: "var(--radius-md)",
            border: `1px solid ${m.color}22`, textAlign: "center",
          }}>
            <p style={{ margin: 0, fontSize: "var(--fs-xs)", fontWeight: 700, color: m.color }}>{m.nombre}</p>
            <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>
              {totales[m.id]}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <input
          type="search"
          placeholder="Buscar receta…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            width: "100%", padding: "7px 12px", marginBottom: "var(--space-2)",
            borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
            fontSize: "var(--fs-sm)", background: "var(--surface-strong)",
            color: "var(--text)", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          <select value={tipoItem} onChange={e => setTipoItem(e.target.value)} style={selectStyle}>
            <option value="">Todos los tipos</option>
            {TIPOS_ITEM.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={proteina} onChange={e => setProteina(e.target.value)} style={selectStyle}>
            <option value="">Todas las proteínas</option>
            {GRUPOS_PROTEINA_ORDEN.map(g => (
              <optgroup key={g} label={g}>
                <option value={g}>Todas: {g}</option>
                {GRUPOS_PROTEINA[g].map(p => <option key={p} value={p}>{p}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <select value={cocina} onChange={e => setCocina(e.target.value)} style={selectStyle}>
          <option value="">Todas las cocinas</option>
          {COCINAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Lista de recetas con chips de miembro */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{
          padding: "var(--space-2) var(--space-3)",
          background: "var(--surface-alt)",
          borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
            Recetas · {filtradas.length}
          </span>
        </div>

        {filtradas.length === 0 ? (
          <p className="meta" style={{ padding: "var(--space-4)", textAlign: "center" }}>
            Sin recetas para esos filtros.
          </p>
        ) : (
          filtradas.map((r, idx) => (
            <RecetaFila
              key={r.idReceta}
              receta={r}
              visibilidad={visibilidad}
              isLast={idx === filtradas.length - 1}
            />
          ))
        )}
      </div>
    </>
  );
}

function RecetaFila({
  receta, visibilidad, isLast,
}: {
  receta: Receta;
  visibilidad: VisibilidadBiblioteca;
  isLast: boolean;
}) {
  return (
    <div style={{
      padding: "var(--space-3)",
      borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
    }}>
      <p style={{ margin: "0 0 2px", fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--text-strong)", lineHeight: 1.3 }}>
        {receta.nombre}
      </p>
      <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
        {receta.proteinaPrincipal} · {receta.tipoItem}
      </p>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {MIEMBROS.map(m => {
          const activo = visibilidad[m.id].includes(receta.idReceta);
          return (
            <button
              key={m.id}
              onClick={() => void toggleVisibilidadReceta(m.id, receta.idReceta, !activo)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px",
                borderRadius: 999,
                border: `1.5px solid ${m.color}`,
                background: activo ? m.color : "transparent",
                color: activo ? "#fff" : m.color,
                fontSize: "var(--fs-xs)", fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 140ms ease",
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: "50%",
                background: activo ? "rgba(255,255,255,0.25)" : m.color,
                color: "#fff",
                fontSize: 9, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {m.nombre[0]}
              </span>
              {m.nombre}
            </button>
          );
        })}
      </div>
    </div>
  );
}
