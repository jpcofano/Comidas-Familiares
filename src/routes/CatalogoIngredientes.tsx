import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, X, ArrowLeftRight } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import {
  getCatalogo,
  actualizarIngrediente,
  crearIngrediente,
  eliminarIngrediente,
  proximoIdIngrediente,
  setEquivalencia,
  quitarEquivalencia,
} from "../data/ingredientes";
import { getRecetas } from "../data/recetas";
import { normalizeText } from "../lib/canonical";
import {
  CATEGORIAS_INGREDIENTE,
  ROLES_NUTRICIONALES,
  ORDEN_GONDOLA,
  getSeccionMeta,
  groupByGondola,
} from "../lib/catalogo";
import type { Ingrediente, Receta } from "../types/models";

// ─── Gondola letter badge ─────────────────────────────────────────────────────

function GondolaBadge({ seccion }: { seccion: string }) {
  const meta = getSeccionMeta(seccion);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
      background: meta.color, color: "#fff",
      fontSize: 11, fontWeight: 700,
    }}>
      {meta.letra}
    </span>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function IngredienteRow({ ing, onClick }: { ing: Ingrediente; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-2)",
        padding: "var(--space-3) 0", borderBottom: "1px solid var(--border)",
        cursor: "pointer",
      }}
    >
      <GondolaBadge seccion={ing.seccionGondola} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontWeight: "var(--fw-medium)", color: "var(--text-strong)",
          fontSize: "var(--fs-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {ing.nombrePreferido}
        </p>
        <p style={{
          margin: 0, fontSize: "var(--fs-xs)", color: "var(--muted)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {ing.categoria}{ing.rolNutricional?.length ? " · " + ing.rolNutricional.join(", ") : ""}
        </p>
      </div>
      <Pencil size={14} style={{ color: "var(--muted)", flexShrink: 0 }} aria-hidden />
    </div>
  );
}

// ─── Bottom-sheet editor ──────────────────────────────────────────────────────

interface SheetProps {
  ingToEdit: Ingrediente | null;  // null = create new
  recetasDelIngrediente: Receta[];
  catalogo: Ingrediente[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onDeleted: () => void;
}

function IngredienteSheet({ ingToEdit, recetasDelIngrediente, catalogo, onClose, onSaved, onDeleted }: SheetProps) {
  const navigate = useNavigate();
  const isNew = ingToEdit === null;

  const [nombre, setNombre] = useState(ingToEdit?.nombrePreferido ?? "");
  const [categoria, setCategoria] = useState(ingToEdit?.categoria ?? CATEGORIAS_INGREDIENTE[0]);
  const [seccion, setSeccion] = useState(ingToEdit?.seccionGondola ?? "Despensa / otros");
  const [roles, setRoles] = useState<string[]>(ingToEdit?.rolNutricional ?? []);
  const [equivIds, setEquivIds] = useState<string[]>(ingToEdit?.equivalencias ?? []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function handleAgregarEquiv(idB: string) {
    const r = await setEquivalencia(ingToEdit!.idIngrediente, idB);
    if (r.ok) setEquivIds((prev) => [...prev, idB]);
  }

  async function handleQuitarEquiv(idB: string) {
    const r = await quitarEquivalencia(ingToEdit!.idIngrediente, idB);
    if (r.ok) setEquivIds((prev) => prev.filter((id) => id !== idB));
  }

  function toggleRol(rol: string) {
    setRoles((prev) => prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol]);
  }

  async function handleGuardar() {
    const trimmed = nombre.trim();
    if (!trimmed) { setError("El nombre es obligatorio."); return; }
    setGuardando(true);
    setError(null);

    let result;
    if (isNew) {
      const id = await proximoIdIngrediente();
      result = await crearIngrediente({
        idIngrediente: id,
        canonico: normalizeText(trimmed),
        nombrePreferido: trimmed,
        sinonimos: [],
        categoria,
        rolNutricional: roles,
        seccionGondola: seccion,
        unidadesHabituales: [],
        ambiguo: false,
        origen: "manual",
      });
    } else {
      result = await actualizarIngrediente(ingToEdit!.idIngrediente, {
        nombrePreferido: trimmed,
        categoria,
        rolNutricional: roles,
        seccionGondola: seccion,
        ambiguo: false,
      });
    }

    if (result.ok) {
      onSaved(isNew ? "Ingrediente creado." : "Guardado.");
    } else {
      setGuardando(false);
      setError(result.error.message);
    }
  }

  async function handleEliminar() {
    setEliminando(true);
    const r = await eliminarIngrediente(ingToEdit!.idIngrediente);
    if (r.ok) {
      onDeleted();
    } else {
      setEliminando(false);
      setError(r.error.message);
      setConfirmEliminar(false);
    }
  }

  const vecesUsado = ingToEdit?.vecesUsado ?? 0;

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px", fontSize: "var(--fs-sm)",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--surface-strong)", color: "var(--text)",
    fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "var(--fs-xs)", color: "var(--muted)", marginBottom: "var(--space-1)",
  };

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100 }}
      />
      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 101,
        maxHeight: "90dvh", overflowY: "auto",
        background: "var(--surface)",
        borderRadius: "16px 16px 0 0",
        padding: "20px 20px calc(20px + env(safe-area-inset-bottom))",
      }}>
        {/* Header del sheet */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
          <h3 style={{ margin: 0, color: "var(--text-strong)" }}>
            {isNew ? "Nuevo ingrediente" : ingToEdit!.nombrePreferido}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {/* Metadata */}
        {!isNew && (
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", margin: "0 0 var(--space-3)" }}>
            {ingToEdit!.idIngrediente}
            {vecesUsado > 0
              ? ` · Usado en ${vecesUsado} receta${vecesUsado !== 1 ? "s" : ""}`
              : " · Sin recetas que lo usen"}
          </p>
        )}

        {/* Nombre */}
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label style={labelStyle}>Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={fieldStyle}
          />
        </div>

        {/* Categoría */}
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label style={labelStyle}>Categoría (qué ES)</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={fieldStyle}>
            {CATEGORIAS_INGREDIENTE.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Sección de góndola */}
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label style={labelStyle}>Sección de góndola (DÓNDE se compra)</label>
          <select value={seccion} onChange={(e) => setSeccion(e.target.value)} style={fieldStyle}>
            {ORDEN_GONDOLA.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Roles nutricionales */}
        <div style={{ marginBottom: "var(--space-4)" }}>
          <p style={{ ...labelStyle, marginBottom: "var(--space-1)" }}>Rol nutricional (qué APORTA)</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
            {ROLES_NUTRICIONALES.map((rol) => (
              <button
                key={rol}
                onClick={() => toggleRol(rol)}
                style={{
                  padding: "4px 10px", fontSize: "var(--fs-xs)", borderRadius: "var(--radius-full)",
                  border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
                  background: roles.includes(rol) ? "var(--primary)" : "var(--surface-strong)",
                  color: roles.includes(rol) ? "var(--on-primary)" : "var(--text)",
                }}
              >
                {rol}
              </button>
            ))}
          </div>
        </div>

        {/* Equivalencias / sustitutos */}
        {!isNew && (
          <div style={{ marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", marginBottom: "var(--space-1)" }}>
              <ArrowLeftRight size={12} style={{ color: "var(--accent)", flexShrink: 0 }} aria-hidden />
              <p style={{ ...labelStyle, margin: 0 }}>Se puede reemplazar por</p>
            </div>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", margin: "0 0 var(--space-2)", fontStyle: "italic" }}>
              Equivalencias del catálogo · distinto de sinónimos y del "X o Y" de una receta puntual.
            </p>
            {equivIds.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)", marginBottom: "var(--space-2)" }}>
                {equivIds.map((id) => {
                  const ing = catalogo.find((c) => c.idIngrediente === id);
                  return (
                    <span key={id} style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "3px 8px", borderRadius: "var(--radius-full)",
                      background: "var(--accent-soft)", color: "var(--accent)",
                      border: "1px solid var(--accent-soft)", fontSize: "var(--fs-xs)",
                    }}>
                      {ing?.nombrePreferido ?? id}
                      <button
                        onClick={() => handleQuitarEquiv(id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: 0, display: "flex", lineHeight: 1 }}
                        aria-label={`Quitar ${ing?.nombrePreferido ?? id}`}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <select
              value=""
              onChange={(e) => { if (e.target.value) handleAgregarEquiv(e.target.value); }}
              style={{ ...fieldStyle, width: "auto" }}
            >
              <option value="">+ Agregar sustituto…</option>
              {catalogo
                .filter((c) => c.idIngrediente !== ingToEdit!.idIngrediente && !equivIds.includes(c.idIngrediente))
                .sort((a, b) => a.nombrePreferido.localeCompare(b.nombrePreferido, "es"))
                .map((c) => <option key={c.idIngrediente} value={c.idIngrediente}>{c.nombrePreferido}</option>)
              }
            </select>
          </div>
        )}

        {/* En N recetas */}
        {!isNew && (
          <div style={{ marginBottom: "var(--space-4)" }}>
            <p style={{ ...labelStyle, marginBottom: "var(--space-2)" }}>
              {recetasDelIngrediente.length > 0
                ? `En ${recetasDelIngrediente.length} receta${recetasDelIngrediente.length !== 1 ? "s" : ""}`
                : "No figura en ninguna receta todavía"}
            </p>
            {recetasDelIngrediente.map((r, idx) => (
              <button
                key={r.idReceta}
                onClick={() => { navigate(`/recetas/${r.idReceta}`); onClose(); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "var(--space-2) 0", fontFamily: "inherit",
                  background: "none", border: "none",
                  borderTop: idx === 0 ? "none" : "1px solid var(--border-subtle)",
                  cursor: "pointer",
                }}
              >
                <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--text-strong)", fontWeight: "var(--fw-medium)" }}>
                  {r.nombre}
                </p>
                <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                  {[r.cocina, r.proteinaPrincipal, r.tiempoTotalLabel].filter(Boolean).join(" · ")}
                </p>
              </button>
            ))}
          </div>
        )}

        {error && (
          <p style={{ color: "var(--err-text)", fontSize: "var(--fs-xs)", marginBottom: "var(--space-2)" }}>
            {error}
          </p>
        )}

        <button
          className="btn btn-primary"
          onClick={handleGuardar}
          disabled={guardando}
          style={{ width: "100%", marginBottom: "var(--space-3)" }}
        >
          {guardando ? "Guardando…" : isNew ? "Crear ingrediente" : "Guardar cambios"}
        </button>

        {/* Eliminar (solo edición) */}
        {!isNew && !confirmEliminar && (
          <button
            onClick={() => setConfirmEliminar(true)}
            style={{
              width: "100%", padding: "10px", background: "none", fontFamily: "inherit",
              border: "1px solid var(--err-line)", borderRadius: "var(--radius-sm)",
              color: "var(--err-text)", fontSize: "var(--fs-sm)", cursor: "pointer",
            }}
          >
            Eliminar ingrediente
          </button>
        )}

        {/* Confirmación de eliminación */}
        {!isNew && confirmEliminar && (
          <div style={{
            padding: "var(--space-3)", background: "var(--err-bg)",
            borderRadius: "var(--radius-sm)", border: "1px solid var(--err-line)",
          }}>
            {vecesUsado > 0 && (
              <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--fs-xs)", color: "var(--err-text)" }}>
                ⚠ Está en {vecesUsado} receta{vecesUsado !== 1 ? "s" : ""}. Eliminarlo no actualizará esas recetas.
              </p>
            )}
            <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--fs-sm)", color: "var(--err-text)", fontWeight: "var(--fw-medium)" }}>
              ¿Confirmar eliminación?
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmEliminar(false)} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={eliminando}
                style={{
                  flex: 1, padding: "10px", background: "var(--err-text)", border: "none",
                  borderRadius: "var(--radius-sm)", color: "#fff", fontSize: "var(--fs-sm)",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {eliminando ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Ruta ─────────────────────────────────────────────────────────────────────

export function CatalogoIngredientesRoute() {
  const { state } = useAuth();
  const navigate = useNavigate();

  const [catalogo, setCatalogo] = useState<Ingrediente[]>([]);
  const [recetasIndex, setRecetasIndex] = useState<Map<string, Receta[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterGondola, setFilterGondola] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ ing: Ingrediente | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isJP = state.status === "authenticated" && state.user.memberId === "juanpablo";

  useEffect(() => {
    if (!isJP) return;
    Promise.all([getCatalogo(), getRecetas()])
      .then(([catMap, recetas]) => {
        setCatalogo([...catMap.values()].sort((a, b) => a.nombrePreferido.localeCompare(b.nombrePreferido, "es")));
        const idx = new Map<string, Receta[]>();
        for (const r of recetas) {
          for (const ing of r.ingredientes ?? []) {
            if (!idx.has(ing.idIngrediente)) idx.set(ing.idIngrediente, []);
            idx.get(ing.idIngrediente)!.push(r);
          }
        }
        setRecetasIndex(idx);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Error al cargar el catálogo.");
        setLoading(false);
      });
  }, [isJP]);

  if (!isJP) {
    navigate("/biblioteca", { replace: true });
    return null;
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function refreshCatalogo() {
    getCatalogo()
      .then((map) => {
        setCatalogo([...map.values()].sort((a, b) => a.nombrePreferido.localeCompare(b.nombrePreferido, "es")));
      })
      .catch(() => {});
  }

  function handleSaved(msg: string) {
    setSheet(null);
    showToast(msg);
    refreshCatalogo();
  }

  function handleDeleted() {
    setSheet(null);
    showToast("Ingrediente eliminado.");
    refreshCatalogo();
  }

  const ambiguos = catalogo.filter((i) => i.ambiguo);
  const completos = catalogo.filter((i) => !i.ambiguo);

  const lc = search.toLowerCase();
  const filtered = completos.filter(
    (ing) =>
      (!lc || ing.nombrePreferido.toLowerCase().includes(lc)) &&
      (!filterGondola || ing.seccionGondola === filterGondola),
  );
  const grouped = groupByGondola(filtered, (i) => i.seccionGondola);

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ padding: "4px", display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: "var(--fs-lg)", color: "var(--text-strong)" }}>Ingredientes</h2>
          {!loading && (
            <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
              {catalogo.length} en el catálogo · ordenados por góndola
            </p>
          )}
        </div>
        <button
          className="btn btn-primary"
          style={{ fontSize: "var(--fs-sm)", flexShrink: 0 }}
          onClick={() => setSheet({ ing: null })}
        >
          + Nuevo
        </button>
      </div>

      {loading && <div className="card"><p className="meta">Cargando…</p></div>}
      {loadError && <div className="card"><p style={{ color: "var(--err-text)" }}>{loadError}</p></div>}

      {!loading && !loadError && (
        <>
          {/* Por completar */}
          {ambiguos.length > 0 && (
            <div className="card" style={{ marginBottom: "var(--space-3)", borderLeft: "3px solid var(--warn-line)" }}>
              <p style={{ margin: "0 0 var(--space-2)", fontWeight: "var(--fw-semibold)", color: "var(--warn-text)", fontSize: "var(--fs-sm)" }}>
                Por completar · {ambiguos.length}
              </p>
              {ambiguos.map((ing) => (
                <IngredienteRow key={ing.idIngrediente} ing={ing} onClick={() => setSheet({ ing })} />
              ))}
            </div>
          )}

          {/* Buscador + filtro por góndola */}
          <div className="card" style={{ marginBottom: "var(--space-3)" }}>
            <input
              type="search"
              placeholder="Buscar ingrediente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "7px 10px", fontSize: "var(--fs-sm)",
                borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
                background: "var(--surface-strong)", color: "var(--text)",
                fontFamily: "inherit", marginBottom: "var(--space-2)",
              }}
            />
            <div style={{ display: "flex", gap: "var(--space-1)", overflowX: "auto", paddingBottom: 2 }}>
              <button
                onClick={() => setFilterGondola(null)}
                style={{
                  flexShrink: 0, padding: "4px 10px", fontSize: "var(--fs-xs)", borderRadius: "var(--radius-full)",
                  border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
                  background: filterGondola === null ? "var(--primary)" : "var(--surface-strong)",
                  color: filterGondola === null ? "var(--on-primary)" : "var(--text)",
                }}
              >
                Todas
              </button>
              {ORDEN_GONDOLA.map((sec) => {
                const active = filterGondola === sec;
                const meta = getSeccionMeta(sec);
                return (
                  <button
                    key={sec}
                    onClick={() => setFilterGondola(active ? null : sec)}
                    style={{
                      flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", fontSize: "var(--fs-xs)", borderRadius: "var(--radius-full)",
                      border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      background: active ? "var(--primary)" : "var(--surface-strong)",
                      color: active ? "var(--on-primary)" : "var(--text)",
                    }}
                  >
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 16, height: 16, borderRadius: "50%",
                      background: active ? "rgba(255,255,255,0.3)" : meta.color,
                      color: "#fff", fontSize: 9, fontWeight: 700, flexShrink: 0,
                    }}>
                      {meta.letra}
                    </span>
                    {sec}
                  </button>
                );
              })}
            </div>
          </div>

          {filtered.length === 0 && completos.length > 0 && (
            <div className="card">
              <p className="meta">
                Sin resultados{search ? ` para "${search}"` : ""}{filterGondola ? ` en ${filterGondola}` : ""}.
              </p>
            </div>
          )}

          {/* Lista agrupada */}
          {grouped.map(({ seccion, items }) => (
            <div key={seccion} className="card" style={{ marginBottom: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                <GondolaBadge seccion={seccion} />
                <p style={{ margin: 0, fontWeight: "var(--fw-semibold)", fontSize: "var(--fs-sm)", color: "var(--text-strong)" }}>
                  {seccion}
                </p>
                <span style={{ marginLeft: "auto", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                  {items.length}
                </span>
              </div>
              {items.map((ing) => (
                <IngredienteRow key={ing.idIngrediente} ing={ing} onClick={() => setSheet({ ing })} />
              ))}
            </div>
          ))}
        </>
      )}

      {/* Bottom-sheet */}
      {sheet !== null && (
        <IngredienteSheet
          key={sheet.ing?.idIngrediente ?? "nuevo"}
          ingToEdit={sheet.ing}
          recetasDelIngrediente={sheet.ing ? (recetasIndex.get(sheet.ing.idIngrediente) ?? []) : []}
          catalogo={catalogo}
          onClose={() => setSheet(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "var(--space-8)", left: "50%", transform: "translateX(-50%)",
          background: "var(--surface-strong)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", padding: "8px 16px",
          fontSize: "var(--fs-sm)", color: "var(--text-strong)",
          zIndex: 200, boxShadow: "var(--shadow-toast)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}
    </>
  );
}
