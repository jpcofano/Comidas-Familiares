import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { SkeletonList } from "../components/skeletons/SkeletonList";
import { getIngredientesAmbiguos, actualizarIngrediente } from "../data/ingredientes";
import { CATEGORIAS_INGREDIENTE, ROLES_NUTRICIONALES, ORDEN_GONDOLA } from "../lib/catalogo";
import type { Ingrediente } from "../types/models";

// ─── Editor de un ingrediente ambiguo ────────────────────────────────────────

function EditorIngrediente({
  ing,
  onGuardado,
}: {
  ing: Ingrediente;
  onGuardado: (id: string) => void;
}) {
  const [categoria, setCategoria] = useState(ing.categoria);
  const [roles, setRoles] = useState<string[]>(ing.rolNutricional ?? []);
  const [seccionGondola, setSeccionGondola] = useState(ing.seccionGondola || "Despensa / otros");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRol(rol: string) {
    setRoles((prev) =>
      prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol]
    );
  }

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    const r = await actualizarIngrediente(ing.idIngrediente, {
      categoria,
      rolNutricional: roles,
      seccionGondola,
      ambiguo: false,
    });
    setGuardando(false);
    if (r.ok) {
      onGuardado(ing.idIngrediente);
    } else {
      setError(r.error.message);
    }
  }

  return (
    <div className="card" style={{ marginBottom: "var(--space-3)" }}>
      <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: "0 0 var(--space-1)" }}>
        {ing.nombrePreferido}
      </p>
      <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", margin: "0 0 var(--space-3)" }}>
        {ing.idIngrediente} · importado como "{ing.canonico}"
      </p>

      {/* Categoría */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <label style={{ display: "block", fontSize: "var(--fs-xs)", color: "var(--muted)", marginBottom: "var(--space-1)" }}>
          Categoría (qué ES)
        </label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          style={{ width: "100%", padding: "6px 8px", fontSize: "var(--fs-sm)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
        >
          {CATEGORIAS_INGREDIENTE.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Sección de góndola */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <label style={{ display: "block", fontSize: "var(--fs-xs)", color: "var(--muted)", marginBottom: "var(--space-1)" }}>
          Sección de góndola (dónde se compra)
        </label>
        <select
          value={seccionGondola}
          onChange={(e) => setSeccionGondola(e.target.value)}
          style={{ width: "100%", padding: "6px 8px", fontSize: "var(--fs-sm)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
        >
          {ORDEN_GONDOLA.map((sec) => (
            <option key={sec} value={sec}>{sec}</option>
          ))}
        </select>
      </div>

      {/* Roles nutricionales */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", margin: "0 0 var(--space-1)" }}>
          Rol nutricional (qué aporta — puede ser varios, o ninguno)
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
          {ROLES_NUTRICIONALES.map((rol) => (
            <button
              key={rol}
              onClick={() => toggleRol(rol)}
              style={{
                padding: "4px 10px", fontSize: "var(--fs-xs)", borderRadius: "var(--radius-full)",
                border: "1px solid var(--border)", cursor: "pointer",
                background: roles.includes(rol) ? "var(--primary)" : "var(--surface-strong)",
                color: roles.includes(rol) ? "#fff" : "var(--text)",
              }}
            >
              {rol}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ color: "var(--err-text)", fontSize: "var(--fs-xs)", marginBottom: "var(--space-2)" }}>{error}</p>
      )}

      <button
        className="btn btn-primary"
        onClick={handleGuardar}
        disabled={guardando}
        style={{ width: "100%" }}
      >
        {guardando ? "Guardando…" : "Completar ingrediente"}
      </button>
    </div>
  );
}

// ─── Ruta ─────────────────────────────────────────────────────────────────────

export function CatalogoIngredientesRoute() {
  const { state } = useAuth();
  const navigate = useNavigate();

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getIngredientesAmbiguos().then((r) => {
      if (r.ok) setIngredientes(r.value);
      else setError(r.error.message);
      setLoading(false);
    });
  }, []);

  if (state.status !== "authenticated" || state.user.memberId !== "juanpablo") {
    navigate("/biblioteca", { replace: true });
    return null;
  }

  function handleGuardado(id: string) {
    setIngredientes((prev) => prev.filter((i) => i.idIngrediente !== id));
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ padding: "4px", display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ margin: 0, fontSize: "var(--fs-lg)", color: "var(--text-strong)" }}>
          Catálogo — Completar ingredientes
        </h2>
      </div>

      {loading && <div className="card"><SkeletonList count={3} /></div>}

      {error && (
        <div className="card">
          <p style={{ color: "var(--err-text)" }}>{error}</p>
        </div>
      )}

      {!loading && !error && ingredientes.length === 0 && (
        <div className="card">
          <p className="meta">No hay ingredientes pendientes de completar.</p>
        </div>
      )}

      {!loading && ingredientes.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--text)", margin: 0 }}>
            {ingredientes.length} ingrediente{ingredientes.length !== 1 ? "s" : ""} importado{ingredientes.length !== 1 ? "s" : ""} con valores por defecto.
            Completá la categoría, la sección de góndola y los roles nutricionales de cada uno.
          </p>
        </div>
      )}

      {ingredientes.map((ing) => (
        <EditorIngrediente key={ing.idIngrediente} ing={ing} onGuardado={handleGuardado} />
      ))}
    </>
  );
}
