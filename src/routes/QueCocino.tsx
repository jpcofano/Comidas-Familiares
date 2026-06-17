import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { getRecetas } from "../data/recetas";
import { getCatalogo } from "../data/ingredientes";
import { normalizeText } from "../lib/canonical";
import { filtrarRecetas, FILTROS_INICIALES } from "../lib/filtros";
import { evaluarCocinables, despensaDefaultIds } from "../lib/cocinables";
import type { RecetaCocinable, Bucket } from "../lib/cocinables";
import { GondolaChip } from "../components/GondolaChip";
import { SkeletonList } from "../components/skeletons/SkeletonList";
import type { Receta, Ingrediente } from "../types/models";

const DESPENSA_KEY = "cf-despensa";

function loadDespensa(): string[] | null {
  try {
    const raw = localStorage.getItem(DESPENSA_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return null;
}

function saveDespensa(ids: string[]) {
  try { localStorage.setItem(DESPENSA_KEY, JSON.stringify(ids)); } catch {}
}

// ─── Card de resultado ────────────────────────────────────────────────────────

const BUCKET_LABELS: Record<Bucket, string> = {
  ahora:  "Cocinás ahora",
  cambio: "Con un cambio",
  falta1: "Te falta 1",
  faltaN: "Te faltan varios",
};

function linhaEstado(rc: RecetaCocinable, catalogo: Map<string, Ingrediente>): string {
  if (rc.bucket === "ahora") return "✓ Tenés todo";
  if (rc.bucket === "cambio") {
    const sus = rc.sustituciones[0];
    const faltaNombre = catalogo.get(sus.faltaId)?.nombrePreferido ?? sus.faltaId;
    const conNombre   = catalogo.get(sus.conId)?.nombrePreferido   ?? sus.conId;
    const extra = rc.sustituciones.length > 1 ? ` (+${rc.sustituciones.length - 1} más)` : "";
    return `⇄ Usá ${conNombre} en vez de ${faltaNombre}${extra}`;
  }
  const nombres = rc.faltan
    .slice(0, 3)
    .map(id => catalogo.get(id)?.nombrePreferido ?? id)
    .join(", ");
  const extra = rc.faltan.length > 3 ? ` +${rc.faltan.length - 3}` : "";
  return `+ Te falta: ${nombres}${extra}`;
}

function RecetaCocinableCard({ rc, catalogo }: { rc: RecetaCocinable; catalogo: Map<string, Ingrediente> }) {
  const navigate = useNavigate();
  const r = rc.receta;
  return (
    <div
      className="card card-interactive"
      onClick={() => navigate(`/recetas/${r.idReceta}`)}
      style={{ marginBottom: "var(--space-2)", cursor: "pointer" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
        <p style={{ fontWeight: "var(--fw-medium)", color: "var(--text-strong)", margin: 0, flex: 1 }}>
          {r.nombre}
        </p>
        <span style={{
          fontSize: "var(--fs-xs)", padding: "2px 8px",
          borderRadius: "var(--radius-full)",
          background: "var(--surface-alt)", color: "var(--muted-strong)",
          whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {Math.round(rc.cobertura * 100)}%
        </span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-1)", flexWrap: "wrap" }}>
        <span className="meta">{r.proteinaPrincipal}</span>
        {r.tiempoTotalLabel && <span className="meta">{r.tiempoTotalLabel}</span>}
        <span className="meta">{r.dificultad}</span>
      </div>
      <p style={{
        margin: "var(--space-1) 0 0",
        fontSize: "var(--fs-xs)",
        color: rc.bucket === "ahora" ? "var(--ok-text)"
          : rc.bucket === "cambio" ? "var(--primary)"
          : "var(--muted)",
      }}>
        {linhaEstado(rc, catalogo)}
      </p>
    </div>
  );
}

// ─── Ruta principal ───────────────────────────────────────────────────────────

export function QueCocinoRoute() {
  const navigate = useNavigate();

  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [catalogo, setCatalogo] = useState<Map<string, Ingrediente>>(new Map());
  const [loading, setLoading] = useState(true);

  // Despensa: Set de idIngrediente
  const [despensa, setDespensa] = useState<Set<string>>(new Set());
  const [despensaOpen, setDespensaOpen] = useState(false);
  const [busqDespensa, setBusqDespensa] = useState("");

  // Filtros dieta
  const [esVegetariano, setEsVegetariano] = useState(false);
  const [esKeto, setEsKeto] = useState(false);

  useEffect(() => {
    Promise.all([getRecetas(), getCatalogo()]).then(([rs, cat]) => {
      setRecetas(rs);
      setCatalogo(cat);

      // Inicializar despensa desde localStorage, o con básicos si es la primera vez
      const saved = loadDespensa();
      if (saved !== null) {
        setDespensa(new Set(saved));
      } else {
        const defaults = despensaDefaultIds(cat);
        setDespensa(defaults);
        saveDespensa([...defaults]);
      }

      setLoading(false);
    });
  }, []);

  function toggleDespensa(id: string) {
    setDespensa(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveDespensa([...next]);
      return next;
    });
  }

  // Universo filtrado por dieta
  const universo = useMemo(() => filtrarRecetas(recetas, {
    ...FILTROS_INICIALES,
    esVegetariano,
    esKeto,
  }), [recetas, esVegetariano, esKeto]);

  // Resultados de cocinabilidad
  const cocinables = useMemo(
    () => evaluarCocinables(universo, despensa, catalogo),
    [universo, despensa, catalogo],
  );

  // Ingredientes del catálogo para la despensa UI (ordenados por nombre)
  const catalogoOrdenado = useMemo(() => {
    const items = [...catalogo.values()].sort((a, b) =>
      a.nombrePreferido.localeCompare(b.nombrePreferido, "es"),
    );
    if (!busqDespensa.trim()) return items;
    const q = normalizeText(busqDespensa);
    return items.filter(i =>
      normalizeText(i.nombrePreferido).includes(q) ||
      normalizeText(i.canonico).includes(q),
    );
  }, [catalogo, busqDespensa]);

  // Agrupar resultados por bucket
  const porBucket = useMemo(() => {
    const buckets: Bucket[] = ["ahora", "cambio", "falta1", "faltaN"];
    return buckets
      .map(b => ({ bucket: b, items: cocinables.filter(rc => rc.bucket === b) }))
      .filter(g => g.items.length > 0);
  }, [cocinables]);

  if (loading) return <div className="card"><SkeletonList count={5} /></div>;

  const chipStyle = (activo: boolean): React.CSSProperties => ({
    padding: "4px 12px", borderRadius: "var(--radius-full)",
    border: `1px solid ${activo ? "var(--primary)" : "var(--border)"}`,
    background: activo ? "var(--primary-soft)" : "transparent",
    color: activo ? "var(--primary)" : "var(--muted)",
    fontWeight: activo ? 600 : 400,
    fontSize: "var(--fs-sm)", cursor: "pointer",
    fontFamily: "inherit",
  });

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ padding: "4px", display: "flex", alignItems: "center" }}
          aria-label="Volver"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-strong)" }}>
          ¿Qué cocino?
        </h1>
      </div>

      {/* Panel despensa */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <button
          onClick={() => setDespensaOpen(v => !v)}
          style={{
            width: "100%", border: "none", background: "none",
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: 0,
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: "var(--fs-sm)" }}>
            Mi despensa
          </span>
          <span className="meta">{despensa.size} en casa {despensaOpen ? "▲" : "▼"}</span>
        </button>

        {despensaOpen && (
          <div style={{ marginTop: "var(--space-3)" }}>
            <input
              type="search"
              placeholder="Buscar ingrediente…"
              value={busqDespensa}
              onChange={e => setBusqDespensa(e.target.value)}
              style={{
                width: "100%", padding: "7px 12px",
                borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
                fontSize: "var(--fs-sm)", background: "var(--surface-strong)",
                color: "var(--text)", boxSizing: "border-box",
                marginBottom: "var(--space-3)",
              }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
              {catalogoOrdenado.map(ing => {
                const activo = despensa.has(ing.idIngrediente);
                return (
                  <button
                    key={ing.idIngrediente}
                    onClick={() => toggleDespensa(ing.idIngrediente)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 8px",
                      borderRadius: "var(--radius-full)",
                      border: `1px solid ${activo ? "var(--primary)" : "var(--border)"}`,
                      background: activo ? "var(--primary-soft)" : "transparent",
                      color: activo ? "var(--primary)" : "var(--muted)",
                      fontSize: "var(--fs-xs)", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <GondolaChip seccion={ing.seccionGondola} size={16} />
                    {ing.nombrePreferido}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filtros dieta */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <button style={chipStyle(!esVegetariano && !esKeto)} onClick={() => { setEsVegetariano(false); setEsKeto(false); }}>
          Todas
        </button>
        <button style={chipStyle(esVegetariano)} onClick={() => { setEsVegetariano(v => !v); setEsKeto(false); }}>
          Vegetariana
        </button>
        <button style={chipStyle(esKeto)} onClick={() => { setEsKeto(v => !v); setEsVegetariano(false); }}>
          Keto
        </button>
      </div>

      {/* Resultados */}
      {cocinables.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
          <p className="meta">Sin recetas para esos filtros.</p>
        </div>
      ) : (
        porBucket.map(({ bucket, items }) => (
          <div key={bucket} style={{ marginBottom: "var(--space-4)" }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: "var(--muted)",
              textTransform: "uppercase", letterSpacing: ".06em",
              margin: "0 0 var(--space-2)",
            }}>
              {BUCKET_LABELS[bucket]} · {items.length}
            </p>
            {items.map(rc => (
              <RecetaCocinableCard key={rc.receta.idReceta} rc={rc} catalogo={catalogo} />
            ))}
          </div>
        ))
      )}
    </>
  );
}
