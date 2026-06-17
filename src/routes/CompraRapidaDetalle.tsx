import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ShoppingBag, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getPlan } from "../data/planes";
import { toggleItemComprado, marcarCompraRapidaHecha, tomarCompraRapida, liberarCompraRapida } from "../data/comprasRapidas";
import { groupByGondola, getSeccionMeta } from "../lib/catalogo";
import type { Plan, ItemCompraRapida } from "../types/models";

export function CompraRapidaDetalleRoute() {
  const { idPlan } = useParams<{ idPlan: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<ItemCompraRapida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  if (state.status !== "authenticated") return <Navigate to="/" replace />;

  const memberId = state.user.memberId;

  useEffect(() => {
    if (!idPlan) return;
    getPlan(idPlan)
      .then((p) => {
        if (!p || p.tipoSeleccion !== "compra-rapida") {
          setError("Compra rápida no encontrada.");
          return;
        }
        setPlan(p);
        setItems(p.itemsCompraRapida ?? []);
      })
      .catch(() => setError("No se pudo cargar la compra."))
      .finally(() => setLoading(false));
  }, [idPlan, memberId]);

  async function handleToggle(idIngrediente: string) {
    if (!idPlan || !plan) return;
    const newItems = items.map((it) =>
      it.idIngrediente === idIngrediente ? { ...it, comprado: !it.comprado } : it,
    );
    setItems(newItems);
    await toggleItemComprado(idPlan, idIngrediente, items);
  }

  async function handleMarcarHecha() {
    if (!idPlan || !plan) return;
    setMarking(true);
    const completadaPor = (plan.encargado as typeof memberId) ?? (memberId as typeof memberId);
    const r = await marcarCompraRapidaHecha(idPlan, completadaPor);
    if (r.ok) {
      navigate("/");
    } else {
      setError(r.error.message);
      setMarking(false);
    }
  }

  async function handleTomar() {
    if (!idPlan) return;
    const r = await tomarCompraRapida(idPlan, memberId as import("../types/models").MiembroId);
    if (!r.ok) setError(r.error.message);
    else setPlan((prev) => prev ? { ...prev, encargado: memberId as import("../types/models").MiembroId } : prev);
  }

  async function handleLiberar() {
    if (!idPlan) return;
    const r = await liberarCompraRapida(idPlan);
    if (!r.ok) setError(r.error.message);
    else setPlan((prev) => prev ? { ...prev, encargado: null } : prev);
  }

  if (loading) return <p className="meta" style={{ padding: "var(--space-4)" }}>Cargando…</p>;
  if (error) return <p style={{ color: "var(--err-text)", padding: "var(--space-4)" }}>{error}</p>;
  if (!plan) return null;

  const grupos = groupByGondola(items, (it) => it.seccionGondola);
  const totalComprados = items.filter((it) => it.comprado).length;
  const total = items.length;
  const hecha = plan.estado === "Compra lista";
  const encargado = plan.encargado ?? null;
  const soYoElEncargado = encargado === memberId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <ShoppingBag size={20} color="var(--primary)" />
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-strong)" }}>
            {plan.nombreSeleccion}
          </h1>
          <p className="meta" style={{ margin: 0 }}>
            {hecha ? "Compra hecha ✓" : `${totalComprados} de ${total} comprados`}
          </p>
        </div>
      </div>

      {/* Progreso */}
      {!hecha && total > 0 && (
        <div style={{
          height: 6, background: "var(--border)", borderRadius: "var(--radius-full)", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${(totalComprados / total) * 100}%`,
            background: "var(--ok-text)", borderRadius: "var(--radius-full)",
            transition: "width .2s",
          }} />
        </div>
      )}

      {/* Turno voluntario */}
      {!hecha && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {encargado === null ? (
            <>
              <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>Sin encargado</span>
              <button
                onClick={() => void handleTomar()}
                style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
              >
                Yo me encargo
              </button>
            </>
          ) : soYoElEncargado ? (
            <button
              onClick={() => void handleLiberar()}
              style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
            >
              Ya no puedo — liberar
            </button>
          ) : (
            <>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{encargado} se está encargando</span>
              <button
                onClick={() => void handleTomar()}
                style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
              >
                La hago yo
              </button>
            </>
          )}
        </div>
      )}

      {/* Lista por góndola */}
      {grupos.map(({ seccion, items: secItems }) => {
        const meta = getSeccionMeta(seccion);
        return (
          <div key={seccion}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                background: meta.color, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>{meta.letra}</span>
              <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                {seccion}
              </span>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {secItems.map((it, idx) => (
                <button
                  key={it.idIngrediente}
                  disabled={hecha}
                  onClick={() => handleToggle(it.idIngrediente)}
                  style={{
                    width: "100%", textAlign: "left", background: "none", border: "none",
                    cursor: hecha ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: "var(--space-3)",
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: idx < secItems.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  {it.comprado
                    ? <CheckCircle2 size={18} color="var(--ok-text)" />
                    : <Circle size={18} color="var(--muted)" />
                  }
                  <span style={{
                    flex: 1, fontSize: "var(--fs-sm)", color: it.comprado ? "var(--muted)" : "var(--text-strong)",
                    textDecoration: it.comprado ? "line-through" : "none",
                  }}>
                    {it.nombre}
                  </span>
                  <span className="meta" style={{ flexShrink: 0, fontSize: "var(--fs-xs)" }}>
                    {it.cantidad} {it.unidad}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* CTA */}
      {!hecha && (
        <button
          className="btn btn-primary"
          disabled={marking}
          onClick={handleMarcarHecha}
          style={{ width: "100%", fontWeight: 700 }}
        >
          {marking ? "Guardando…" : "Marcar compra como hecha ✓"}
        </button>
      )}

      {hecha && (
        <div style={{
          background: "var(--ok-bg)", border: "1px solid var(--ok-text)",
          borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)",
          textAlign: "center",
        }}>
          <p style={{ margin: 0, color: "var(--ok-text)", fontWeight: 600, fontSize: "var(--fs-sm)" }}>
            ¡Compra terminada!
          </p>
        </div>
      )}
    </div>
  );
}
