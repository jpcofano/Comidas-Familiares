import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ShoppingBag, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getPlan } from "../data/planes";
import { toggleItemComprado, marcarCompraRapidaHecha, tomarCompraRapida, liberarCompraRapida } from "../data/comprasRapidas";
import { groupByGondola, getSeccionMeta } from "../lib/catalogo";
import { construirTextoLista, compartirLista } from "../lib/compartirLista";
import type { Plan, ItemCompraRapida } from "../types/models";

const WA_GREEN = "#1f8a4c";

const NOMBRES: Record<string, string> = {
  juanpablo: "Juan Pablo", maria: "María", sofia: "Sofía", federico: "Federico",
};

function BtnCompartirWA({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: "var(--radius-md)",
        background: WA_GREEN, color: "#fff",
        border: "none", fontWeight: 700, fontSize: "var(--fs-sm)",
        cursor: "pointer", fontFamily: "inherit",
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      Compartir lista
    </button>
  );
}

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

  function handleCompartir() {
    if (!plan) return;
    const titulo = `Compra · ${plan.nombreSeleccion}`;
    const enc = plan.encargado;
    const subtitulo = enc ? `(la hace ${NOMBRES[enc] ?? enc})` : null;
    const mapped = items.map((it) => ({
      nombre:   it.nombre,
      cantidad: it.cantidad,
      unidad:   it.unidad,
      seccion:  it.seccionGondola,
      comprado: it.comprado,
    }));
    void compartirLista(construirTextoLista(titulo, subtitulo, mapped));
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

      {/* Compartir */}
      {!hecha && items.length > 0 && (
        <BtnCompartirWA onClick={handleCompartir} />
      )}

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
