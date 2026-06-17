import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ShoppingBag, X, Plus, Minus } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getCatalogo } from "../data/ingredientes";
import { getReceta } from "../data/recetas";
import {
  crearPlantillaCompraRapida,
  actualizarPlantillaCompraRapida,
  type DatosPlantilla,
} from "../data/comprasRapidas";
import { getSeccionMeta } from "../lib/catalogo";
import { normalizeText } from "../lib/canonical";
import type { Ingrediente, MiembroId } from "../types/models";

const MIEMBROS: { id: MiembroId; label: string }[] = [
  { id: "juanpablo", label: "JP"      },
  { id: "maria",     label: "María"   },
  { id: "sofia",     label: "Sofía"   },
  { id: "federico",  label: "Federico"},
];

interface ItemLocal {
  idIngrediente: string;
  nombre: string;
  cantidad: string;
  unidad: string;
  seccionGondola: string;
  unidadesHabituales: string[];
}

export function CompraRapidaEditorRoute() {
  const { state } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const isEditing = !!id;

  if (state.status !== "authenticated") return <Navigate to="/biblioteca" replace />;
  const selfId = state.user.memberId;
  if (selfId !== "juanpablo" && selfId !== "maria") return <Navigate to="/biblioteca" replace />;

  return <CompraRapidaEditorInner idReceta={id} isEditing={isEditing} />;
}

function CompraRapidaEditorInner({
  idReceta,
  isEditing,
}: {
  idReceta?: string;
  isEditing: boolean;
}) {
  const navigate = useNavigate();

  const [destino, setDestino] = useState("");
  const [items, setItems] = useState<ItemLocal[]>([]);
  const [asignadoA, setAsignadoA] = useState<MiembroId[]>(["maria"]);
  const [catalogo, setCatalogo] = useState<Map<string, Ingrediente>>(new Map());
  const [busqueda, setBusqueda] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const promises: Promise<unknown>[] = [getCatalogo().then(setCatalogo)];
    if (isEditing && idReceta) {
      promises.push(
        getReceta(idReceta).then((r) => {
          if (!r || !r.esCompraRapida) return;
          setDestino(r.destino ?? "");
          setItems(
            r.ingredientes.map((ing) => {
              const cat = catalogo.get(ing.idIngrediente);
              return {
                idIngrediente: ing.idIngrediente,
                nombre: ing.textoOriginal,
                cantidad: String(ing.cantidad ?? "1"),
                unidad: ing.unidad ?? "",
                seccionGondola: ing.seccion ?? "Despensa / otros",
                unidadesHabituales: cat?.unidadesHabituales ?? [],
              };
            }),
          );
        }),
      );
    }
    Promise.all(promises).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-populate when catalog arrives (for edit mode where catalog might load after receta)
  useEffect(() => {
    if (catalogo.size > 0 && isEditing && idReceta) {
      setItems((prev) =>
        prev.map((it) => {
          const cat = catalogo.get(it.idIngrediente);
          if (!cat) return it;
          return {
            ...it,
            unidadesHabituales: cat.unidadesHabituales ?? [],
            unidad: it.unidad || (cat.unidadesHabituales?.[0] ?? ""),
          };
        }),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo]);

  const sugerencias = useMemo(() => {
    if (!busqueda.trim()) return [];
    const nc = normalizeText(busqueda);
    return Array.from(catalogo.values())
      .filter(
        (ing) =>
          ing.categoria !== "Utensilio" &&
          (normalizeText(ing.nombrePreferido).includes(nc) ||
            ing.sinonimos?.some((s) => normalizeText(s).includes(nc))),
      )
      .slice(0, 8);
  }, [busqueda, catalogo]);

  function agregarItem(ing: Ingrediente) {
    if (items.find((it) => it.idIngrediente === ing.idIngrediente)) {
      setBusqueda("");
      return;
    }
    const unidad = ing.unidadesHabituales?.[0] ?? "";
    setItems((prev) => [
      ...prev,
      {
        idIngrediente: ing.idIngrediente,
        nombre: ing.nombrePreferido,
        cantidad: "1",
        unidad,
        seccionGondola: ing.seccionGondola,
        unidadesHabituales: ing.unidadesHabituales ?? [],
      },
    ]);
    setBusqueda("");
    searchRef.current?.focus();
  }

  function quitarItem(id: string) {
    setItems((prev) => prev.filter((it) => it.idIngrediente !== id));
  }

  function cambiarCantidad(id: string, delta: number) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.idIngrediente !== id) return it;
        const n = Math.max(0.5, parseFloat(it.cantidad || "1") + delta);
        return { ...it, cantidad: Number.isInteger(n) ? String(n) : n.toFixed(1) };
      }),
    );
  }

  function setCantidadTexto(id: string, val: string) {
    setItems((prev) =>
      prev.map((it) => (it.idIngrediente === id ? { ...it, cantidad: val } : it)),
    );
  }

  function setUnidad(id: string, val: string) {
    setItems((prev) =>
      prev.map((it) => (it.idIngrediente === id ? { ...it, unidad: val } : it)),
    );
  }

  async function handleGuardar() {
    if (!destino.trim()) { setError("Ingresá el destino de la compra."); return; }
    if (items.length === 0) { setError("Agregá al menos un ítem."); return; }
    setError(null);
    setSaving(true);
    const datos: DatosPlantilla = {
      destino: destino.trim(),
      items: items.map(({ idIngrediente, nombre, cantidad, unidad, seccionGondola }) => ({
        idIngrediente, nombre, cantidad, unidad, seccionGondola,
      })),
    };
    try {
      if (isEditing && idReceta) {
        const r = await actualizarPlantillaCompraRapida(idReceta, datos);
        if (!r.ok) { setError(r.error.message); return; }
      } else {
        const r = await crearPlantillaCompraRapida(datos);
        if (!r.ok) { setError(r.error.message); return; }
      }
      navigate("/biblioteca?tab=compras");
    } finally {
      setSaving(false);
    }
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 12px",
    borderRadius: "var(--radius-full)",
    fontSize: "var(--fs-sm)",
    fontWeight: active ? 600 : 400,
    background: active ? "var(--primary)" : "var(--surface-strong)",
    color: active ? "#fff" : "var(--text)",
    border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
    cursor: "pointer",
  });

  if (loading) return <p className="meta" style={{ padding: "var(--space-4)" }}>Cargando…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <ShoppingBag size={20} color="var(--primary)" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-strong)" }}>
          {isEditing ? "Editar compra rápida" : "Nueva compra rápida"}
        </h1>
      </div>

      {/* Destino */}
      <div className="card">
        <label style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--text-strong)", display: "block", marginBottom: "var(--space-2)" }}>
          Destino
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span className="meta" style={{ whiteSpace: "nowrap" }}>Compra rápida ·</span>
          <input
            type="text"
            placeholder="Verdulería, Chino, Carrefour…"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            style={{
              flex: 1, padding: "8px 10px", borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)", background: "var(--surface-strong)",
              color: "var(--text)", fontSize: "var(--fs-sm)",
            }}
          />
        </div>
      </div>

      {/* Buscar y agregar ítems */}
      <div className="card" style={{ gap: "var(--space-3)", display: "flex", flexDirection: "column" }}>
        <label style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--text-strong)" }}>
          Ítems
        </label>
        <div style={{ position: "relative" }}>
          <input
            ref={searchRef}
            type="search"
            placeholder="Buscar en el catálogo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)", background: "var(--surface-strong)",
              color: "var(--text)", fontSize: "var(--fs-sm)", boxSizing: "border-box",
            }}
          />
          {sugerencias.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", boxShadow: "0 4px 12px rgba(0,0,0,.12)",
              marginTop: 2, overflow: "hidden",
            }}>
              {sugerencias.map((ing) => {
                const meta = getSeccionMeta(ing.seccionGondola);
                return (
                  <button
                    key={ing.idIngrediente}
                    onClick={() => agregarItem(ing)}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 12px",
                      background: "none", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "var(--space-2)",
                      fontSize: "var(--fs-sm)", color: "var(--text)",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: meta.color, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>{meta.letra}</span>
                    {ing.nombrePreferido}
                    <span className="meta" style={{ marginLeft: "auto", fontSize: "var(--fs-xs)" }}>
                      {ing.seccionGondola}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Lista de ítems */}
        {items.length === 0 ? (
          <p className="meta" style={{ margin: 0 }}>Ningún ítem todavía. Buscá arriba.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {items.map((it) => {
              const meta = getSeccionMeta(it.seccionGondola);
              return (
                <div key={it.idIngrediente} style={{
                  display: "flex", alignItems: "center", gap: "var(--space-2)",
                  padding: "var(--space-2) 0", borderBottom: "1px solid var(--border-subtle)",
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: meta.color, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>{meta.letra}</span>

                  <span style={{ flex: 1, fontSize: "var(--fs-sm)", color: "var(--text-strong)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.nombre}
                  </span>

                  {/* Stepper */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => cambiarCantidad(it.idIngrediente, -1)} style={stepperBtn}>
                      <Minus size={12} />
                    </button>
                    <input
                      type="text"
                      value={it.cantidad}
                      onChange={(e) => setCantidadTexto(it.idIngrediente, e.target.value)}
                      style={{
                        width: 40, textAlign: "center", padding: "3px 4px",
                        border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                        fontSize: "var(--fs-sm)", background: "var(--surface-strong)", color: "var(--text)",
                      }}
                    />
                    <button onClick={() => cambiarCantidad(it.idIngrediente, 1)} style={stepperBtn}>
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Unidad */}
                  {it.unidadesHabituales.length > 1 ? (
                    <select
                      value={it.unidad}
                      onChange={(e) => setUnidad(it.idIngrediente, e.target.value)}
                      style={{
                        padding: "3px 6px", border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)", background: "var(--surface-strong)",
                        color: "var(--text)", fontSize: "var(--fs-sm)", flexShrink: 0,
                      }}
                    >
                      {it.unidadesHabituales.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  ) : (
                    <span className="meta" style={{ flexShrink: 0, fontSize: "var(--fs-xs)" }}>
                      {it.unidad || "u."}
                    </span>
                  )}

                  <button onClick={() => quitarItem(it.idIngrediente)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", flexShrink: 0, padding: 2 }}>
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Asignar a */}
      <div className="card">
        <label style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--text-strong)", display: "block", marginBottom: "var(--space-2)" }}>
          Asignar a
        </label>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {MIEMBROS.map((m) => (
            <button
              key={m.id}
              onClick={() => setAsignadoA((prev) =>
                prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]
              )}
              style={chipStyle(asignadoA.includes(m.id))}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ color: "var(--err-text)", fontSize: "var(--fs-sm)", margin: 0 }}>{error}</p>
      )}

      {/* CTAs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <button
          className="btn btn-primary"
          disabled={saving}
          onClick={() => handleGuardar()}
          style={{ width: "100%", fontWeight: 700 }}
        >
          {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Guardar plantilla"}
        </button>
        <button
          className="btn btn-ghost"
          disabled={saving}
          onClick={() => navigate("/biblioteca?tab=compras")}
          style={{ width: "100%", color: "var(--muted)" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

const stepperBtn: React.CSSProperties = {
  width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
  background: "var(--surface-strong)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)", cursor: "pointer", flexShrink: 0,
  color: "var(--text)",
};
