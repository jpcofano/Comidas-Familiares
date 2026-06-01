import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, Navigate, Link } from "react-router-dom";
import { Plus, Carrot, ChevronRight, Users } from "lucide-react";
import { SkeletonList } from "../components/skeletons/SkeletonList";
import { useAuth } from "../auth/useAuth";
import { getRecetas, getRecetasParaMiembro } from "../data/recetas";
import { getMenus, deriveMenuMetadata } from "../data/menus";
import { filtrarRecetas, hayFiltrosActivos, FILTROS_INICIALES } from "../lib/filtros";
import type { FiltrosReceta } from "../lib/filtros";
import type { Receta, Menu, MenuDerived } from "../types/models";
import { TIPOS_ITEM, COCINAS, GRUPOS_PROTEINA, GRUPOS_PROTEINA_ORDEN } from "../types/models";

// ─── Cache de derivados de menú (por sesión) ──────────────────────────────────

const menuDerivedCache = new Map<string, MenuDerived>();

async function getDerivedCached(menu: Menu): Promise<MenuDerived> {
  if (menuDerivedCache.has(menu.idMenu)) return menuDerivedCache.get(menu.idMenu)!;
  const derived = await deriveMenuMetadata(menu);
  menuDerivedCache.set(menu.idMenu, derived);
  return derived;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutos(min: number): string {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m} min` : `${h}h`;
}

const DIFICULTAD_LABELS = ["—", "Baja", "Media", "Media-alta", "Alta"] as const;

function dificultadLabel(orden: number): string {
  return DIFICULTAD_LABELS[orden] ?? "—";
}

// ─── Tarjeta de receta ────────────────────────────────────────────────────────

function RecetaCard({ receta }: { receta: Receta }) {
  const navigate = useNavigate();
  return (
    <div
      className="card card-interactive"
      onClick={() => navigate(`/recetas/${receta.idReceta}`)}
      style={{ marginBottom: "var(--space-3)", cursor: "pointer" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
        <p style={{ fontWeight: "var(--fw-medium)", color: "var(--text-strong)", margin: 0, flex: 1 }}>
          {receta.nombre}
        </p>
        <span style={{
          fontSize: "var(--fs-xs)",
          padding: "2px 8px",
          borderRadius: "var(--radius-full)",
          background: "var(--surface-alt)",
          color: "var(--muted-strong)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {receta.tipoItem}
        </span>
      </div>

      <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-2)", flexWrap: "wrap" }}>
        <span className="meta">{receta.proteinaPrincipal}</span>
        {receta.tiempoTotalLabel && (
          <span className="meta">{receta.tiempoTotalLabel}</span>
        )}
        <span className="meta">{receta.dificultad}</span>
      </div>

      {(receta.sinLacteos || !receta.hidratos) && (
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
          {receta.sinLacteos && (
            <span style={{ fontSize: "var(--fs-xs)", padding: "1px 7px", borderRadius: "var(--radius-full)", background: "var(--ok-bg)", color: "var(--ok-text)" }}>
              Sin lácteos
            </span>
          )}
          {!receta.hidratos && (
            <span style={{ fontSize: "var(--fs-xs)", padding: "1px 7px", borderRadius: "var(--radius-full)", background: "var(--info-bg)", color: "var(--info-text)" }}>
              Sin hidratos
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta de menú ──────────────────────────────────────────────────────────

function MenuCard({ menu, derived }: { menu: Menu; derived: MenuDerived | null }) {
  const navigate = useNavigate();
  return (
    <div
      className="card card-interactive"
      onClick={() => navigate(`/menus/${menu.idMenu}`)}
      style={{ marginBottom: "var(--space-3)", cursor: "pointer" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
        <p style={{ fontWeight: "var(--fw-medium)", color: "var(--text-strong)", margin: 0, flex: 1 }}>
          {menu.nombreMenu}
        </p>
        <span style={{
          fontSize: "var(--fs-xs)",
          padding: "2px 8px",
          borderRadius: "var(--radius-full)",
          background: "var(--surface-alt)",
          color: "var(--muted-strong)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {menu.escenarioUso}
        </span>
      </div>

      {menu.estilo && (
        <p className="meta" style={{ marginTop: "var(--space-1)" }}>{menu.estilo}</p>
      )}

      <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-2)", flexWrap: "wrap" }}>
        <span className="meta">{menu.componentes.length} componentes</span>
        {derived ? (
          <>
            <span className="meta">{formatMinutos(derived.tiempoTotalMin)}</span>
            <span className="meta">{dificultadLabel(derived.dificultadOrden)}</span>
            {derived.sinLacteos && (
              <span style={{ fontSize: "var(--fs-xs)", padding: "1px 7px", borderRadius: "var(--radius-full)", background: "var(--ok-bg)", color: "var(--ok-text)" }}>
                Sin lácteos
              </span>
            )}
          </>
        ) : (
          <span className="meta">Calculando…</span>
        )}
      </div>
    </div>
  );
}

// ─── Tab Recetas ──────────────────────────────────────────────────────────────

function TabRecetas({ memberId, isJP }: { memberId: string; isJP: boolean }) {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosReceta>(FILTROS_INICIALES);

  useEffect(() => {
    const load = isJP ? getRecetas() : getRecetasParaMiembro(memberId);
    load
      .then(setRecetas)
      .catch(() => setError("No se pudieron cargar las recetas."))
      .finally(() => setLoading(false));
  }, [memberId, isJP]);

  const resultado = useMemo(() => filtrarRecetas(recetas, filtros), [recetas, filtros]);
  const filtrosActivos = hayFiltrosActivos(filtros);

  function toggle(campo: "sinLacteos" | "sinHidratos" | "esVegetariano" | "esKeto") {
    setFiltros(f => ({ ...f, [campo]: !f[campo] }));
  }

  const selectStyle: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
    background: "var(--surface-strong)",
    color: "var(--text)",
    fontSize: "var(--fs-sm)",
    flex: 1,
    minWidth: 0,
  };

  if (loading) return <SkeletonList count={5} />;
  if (error) return <p style={{ color: "var(--err-text)", padding: "var(--space-4) 0" }}>{error}</p>;

  return (
    <div>
      {/* Búsqueda */}
      <input
        type="search"
        placeholder="Buscar receta…"
        value={filtros.busqueda}
        onChange={e => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          fontSize: "var(--fs-sm)",
          background: "var(--surface-strong)",
          color: "var(--text)",
          boxSizing: "border-box",
          marginBottom: "var(--space-3)",
        }}
      />

      {/* Selects de filtro */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        <select
          value={filtros.tipoItem}
          onChange={e => setFiltros(f => ({ ...f, tipoItem: e.target.value }))}
          style={selectStyle}
        >
          <option value="">Todos los tipos</option>
          {TIPOS_ITEM.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filtros.proteina}
          onChange={e => setFiltros(f => ({ ...f, proteina: e.target.value }))}
          style={selectStyle}
        >
          <option value="">Todas las proteínas</option>
          {GRUPOS_PROTEINA_ORDEN.map(grupo => (
            <optgroup key={grupo} label={grupo}>
              <option value={grupo}>Todas: {grupo}</option>
              {GRUPOS_PROTEINA[grupo].map(p => <option key={p} value={p}>{p}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        <select
          value={filtros.cocina}
          onChange={e => setFiltros(f => ({ ...f, cocina: e.target.value }))}
          style={selectStyle}
        >
          <option value="">Todas las cocinas</option>
          {COCINAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Toggles booleanos + limpiar */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
        <button
          className={`btn ${filtros.sinLacteos ? "btn-primary" : "btn-secondary"}`}
          onClick={() => toggle("sinLacteos")}
          style={{ fontSize: "var(--fs-sm)" }}
        >
          Sin lácteos
        </button>
        <button
          className={`btn ${filtros.sinHidratos ? "btn-primary" : "btn-secondary"}`}
          onClick={() => toggle("sinHidratos")}
          style={{ fontSize: "var(--fs-sm)" }}
        >
          Sin hidratos
        </button>
        <button
          className={`btn ${filtros.esVegetariano ? "btn-primary" : "btn-secondary"}`}
          onClick={() => toggle("esVegetariano")}
          style={{ fontSize: "var(--fs-sm)" }}
        >
          Vegetariana
        </button>
        <button
          className={`btn ${filtros.esKeto ? "btn-primary" : "btn-secondary"}`}
          onClick={() => toggle("esKeto")}
          style={{ fontSize: "var(--fs-sm)" }}
        >
          Keto
        </button>
        {filtrosActivos && (
          <button
            className="btn btn-ghost"
            onClick={() => setFiltros(FILTROS_INICIALES)}
            style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}
          >
            Limpiar
          </button>
        )}
        <span className="meta" style={{ marginLeft: "auto" }}>
          {resultado.length} {resultado.length === 1 ? "receta" : "recetas"}
        </span>
      </div>

      {/* Listado */}
      {resultado.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
          <p className="meta">
            {!isJP && recetas.length === 0
              ? "Todavía no tenés recetas en tu biblioteca. Pedile a JP que te habilite algunas."
              : "Ninguna receta coincide con los filtros."}
          </p>
        </div>
      ) : (
        resultado.map(r => <RecetaCard key={r.idReceta} receta={r} />)
      )}
    </div>
  );
}

// ─── Tab Menús ────────────────────────────────────────────────────────────────

function TabMenus() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menusDerived, setMenusDerived] = useState<Map<string, MenuDerived>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMenus()
      .then(async ms => {
        setMenus(ms);
        const entries = await Promise.all(
          ms.map(async m => [m.idMenu, await getDerivedCached(m)] as [string, MenuDerived])
        );
        setMenusDerived(new Map(entries));
      })
      .catch(() => setError("No se pudieron cargar los menús."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonList count={5} />;
  if (error) return <p style={{ color: "var(--err-text)", padding: "var(--space-4) 0" }}>{error}</p>;

  if (menus.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
        <p className="meta" style={{ marginBottom: "var(--space-3)" }}>No hay menús todavía.</p>
        <Link to="/menus/importar" style={{ color: "var(--primary)", fontSize: "var(--fs-sm)" }}>
          Importar menú →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <span className="meta" style={{ display: "block", marginBottom: "var(--space-3)" }}>
        {menus.length} {menus.length === 1 ? "menú" : "menús"}
      </span>
      {menus.map(m => (
        <MenuCard key={m.idMenu} menu={m} derived={menusDerived.get(m.idMenu) ?? null} />
      ))}
    </div>
  );
}

// ─── Ruta principal ───────────────────────────────────────────────────────────

export function BibliotecaRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useAuth();

  if (state.status !== "authenticated") return <Navigate to="/" replace />;

  const memberId = state.user.memberId;
  const isJP = memberId === "juanpablo";
  const tab = searchParams.get("tab") ?? "recetas";

  return (
    <>
      <div className="tabs">
        <button
          className={tab === "recetas" ? "tab active" : "tab"}
          onClick={() => setSearchParams({ tab: "recetas" })}
        >
          Recetas
        </button>
        {isJP && (
          <button
            className={tab === "menus" ? "tab active" : "tab"}
            onClick={() => setSearchParams({ tab: "menus" })}
          >
            Menús
          </button>
        )}
        {isJP && tab === "recetas" && (
          <Link to="/biblioteca/importar" className="tab-action">
            <Plus size={16} aria-hidden />
            <span>Importar</span>
          </Link>
        )}
      </div>

      {isJP && (
        <>
          <Link
            to="/biblioteca/catalogo"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "var(--space-3) var(--space-4)",
              marginBottom: "var(--space-2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface-strong)",
              color: "var(--text-strong)",
              textDecoration: "none",
              gap: "var(--space-3)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <Carrot size={18} color="var(--primary)" aria-hidden />
              <span style={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>
                Catálogo de ingredientes
              </span>
            </span>
            <ChevronRight size={16} color="var(--muted)" aria-hidden />
          </Link>

          <Link
            to="/biblioteca/visibilidad"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "var(--space-3) var(--space-4)",
              marginBottom: "var(--space-2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface-strong)",
              color: "var(--text-strong)",
              textDecoration: "none",
              gap: "var(--space-3)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <Users size={18} color="var(--primary)" aria-hidden />
              <span style={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>
                Asignar recetas a la familia
              </span>
            </span>
            <ChevronRight size={16} color="var(--muted)" aria-hidden />
          </Link>
        </>
      )}

      {!isJP && (
        <div style={{ marginBottom: "var(--space-3)" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px" }}>
            Mis recetas
          </h1>
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", margin: 0 }}>
            Las recetas que JP eligió para vos. Elegí una para ver el paso a paso.
          </p>
        </div>
      )}

      <div className="card">
        {tab === "recetas"
          ? <TabRecetas memberId={memberId} isJP={isJP} />
          : (isJP ? <TabMenus /> : null)}
      </div>
    </>
  );
}
