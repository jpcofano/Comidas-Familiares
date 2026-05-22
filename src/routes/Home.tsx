import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { subscribeToPlanesActivos, marcarCocinada, descartarPlan } from "../data/planes";
import { getListaById } from "../data/compras";
import { getSemanaActual } from "../lib/fechas";
import { separarPlanes } from "../lib/home";
import type { Plan, ListaCompras } from "../types/models";

// ─── Public route ─────────────────────────────────────────────────────────────

export function HomeRoute() {
  const { state } = useAuth();
  const isJP = state.status === "authenticated" && state.user.memberId === "juanpablo";

  if (!isJP) {
    return (
      <div className="card">
        <h2>Inicio</h2>
        <p>Esta sección llega en Etapa 3.</p>
        <p className="meta">
          Va a mostrar: la Especial activa de la semana, extras, planes En proceso,
          resumen de compras, y accesos rápidos.
        </p>
      </div>
    );
  }

  return <HomeJP />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    "Elegida":          { bg: "var(--surface-alt)",  color: "var(--muted)" },
    "Compra pendiente": { bg: "var(--warn-bg)",       color: "var(--warn-text)" },
    "Compra lista":     { bg: "var(--info-bg)",       color: "var(--info-text)" },
    "Cocinada":         { bg: "var(--ok-bg)",         color: "var(--ok-text)" },
  };
  const s = styles[estado] ?? styles["Elegida"];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "var(--radius-full)",
      fontSize: "var(--fs-xs)",
      fontWeight: "var(--fw-medium)",
      background: s.bg,
      color: s.color,
    }}>
      {estado}
    </span>
  );
}

function detallePath(plan: Plan): string {
  // TODO E3.3: cuando exista DetalleMenu, rutear menus a /menus/:id
  return `/recetas/${plan.idSeleccion}`;
}

interface PlanCardProps {
  plan: Plan;
  featured?: boolean;
  isEspecial?: boolean;
  busy: boolean;
  confirming: boolean;
  onMarcarCocinada: () => void;
  onAskDiscard: () => void;
  onCancelDiscard: () => void;
  onDescartar: () => void;
  onEvaluar: () => void;
  onVerDetalle: () => void;
}

function PlanCard({
  plan, featured, isEspecial, busy, confirming,
  onMarcarCocinada, onAskDiscard, onCancelDiscard, onDescartar, onEvaluar, onVerDetalle,
}: PlanCardProps) {
  const canCook = ["Elegida", "Compra pendiente", "Compra lista"].includes(plan.estado);

  return (
    <div style={{
      border: featured ? "2px solid var(--primary)" : "1px solid var(--border)",
      borderRadius: featured ? "var(--radius-lg)" : "var(--radius-md)",
      padding: featured ? "var(--space-4)" : "var(--space-3) var(--space-4)",
      background: "var(--surface-strong)",
      marginBottom: "var(--space-3)",
    }}>
      {featured && (
        <p style={{
          fontSize: "var(--fs-xs)",
          fontWeight: "var(--fw-bold)",
          color: "var(--primary)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: "var(--space-2)",
        }}>
          Especial de la semana
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
        {/* Fix 2.1: color explícito para texto principal sobre fondo claro */}
        <p style={{
          fontWeight: "var(--fw-medium)",
          fontSize: featured ? "var(--fs-md)" : "var(--fs-base)",
          color: "var(--text-strong)",
          margin: 0,
        }}>
          {plan.nombreSeleccion}
        </p>
        <EstadoBadge estado={plan.estado} />
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
        {canCook && (
          <button className="btn btn-primary" onClick={onMarcarCocinada} disabled={busy} style={{ fontSize: "var(--fs-sm)" }}>
            {busy ? "…" : "Marcar Cocinada"}
          </button>
        )}
        {plan.estado === "Cocinada" && (
          <button className="btn btn-secondary" onClick={onEvaluar} style={{ fontSize: "var(--fs-sm)" }}>
            Ir a evaluar
          </button>
        )}
        {/* Fix 2.3: botón Ver receta en todas las tarjetas */}
        <button className="btn btn-secondary" onClick={onVerDetalle} style={{ fontSize: "var(--fs-sm)" }}>
          Ver receta
        </button>
        {!confirming && (
          <button
            className="btn btn-ghost"
            onClick={onAskDiscard}
            disabled={busy}
            style={{ fontSize: "var(--fs-sm)", color: "var(--err-text)", marginLeft: "auto" }}
          >
            Descartar
          </button>
        )}
      </div>

      {confirming && (
        <div style={{
          marginTop: "var(--space-3)",
          padding: "var(--space-3)",
          background: "var(--warn-bg)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--warn-line)",
        }}>
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--warn-text)" }}>
            {isEspecial
              ? "¿Descartar la Especial? También se van a descartar sus extras."
              : "¿Descartar este plan?"}
          </p>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <button
              className="btn btn-primary"
              onClick={onDescartar}
              disabled={busy}
              style={{ fontSize: "var(--fs-sm)", background: "var(--err-text)" }}
            >
              {busy ? "…" : "Confirmar descarte"}
            </button>
            <button className="btn btn-secondary" onClick={onCancelDiscard} style={{ fontSize: "var(--fs-sm)" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── JP home ──────────────────────────────────────────────────────────────────

function HomeJP() {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState<ListaCompras | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const semana = useMemo(() => getSemanaActual(), []);

  useEffect(() => {
    return subscribeToPlanesActivos(semana, (p) => {
      setPlanes(p);
      setLoading(false);
    });
  }, [semana]);

  useEffect(() => {
    const listaId = planes.find(p => p.listaComprasId != null)?.listaComprasId ?? null;
    if (!listaId) { setLista(null); return; }
    getListaById(listaId).then(setLista);
  }, [planes]);

  const { especial, extras, enProceso } = useMemo(() => separarPlanes(planes), [planes]);

  async function handleMarcarCocinada(idPlan: string) {
    setBusy(idPlan);
    await marcarCocinada(idPlan);
    setBusy(null);
  }

  async function handleDescartar(idPlan: string) {
    setBusy(idPlan);
    await descartarPlan(idPlan);
    setBusy(null);
    setConfirmDiscard(null);
  }

  if (loading) {
    return (
      <div className="card">
        <p className="meta">Cargando…</p>
      </div>
    );
  }

  const hasPlanes = especial || extras.length > 0 || enProceso.length > 0;

  return (
    <div className="card" style={{ paddingBottom: "var(--space-6)" }}>
      {/* Fix 2.1: color explícito para el título de sección */}
      <h2 style={{ marginBottom: "var(--space-4)", color: "var(--text-strong)" }}>Esta semana</h2>

      {/* ── Sin planes ────────────────────────────────────────────────── */}
      {!hasPlanes && (
        <div style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
          <p className="meta" style={{ marginBottom: "var(--space-4)" }}>
            Todavía no hay comidas elegidas para esta semana.
          </p>
          <Link
            to="/biblioteca"
            className="btn btn-primary"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Ver recetas
          </Link>
        </div>
      )}

      {/* ── Especial + extras anidados (Fix 2.2) ──────────────────────── */}
      {especial && (
        <section style={{ marginBottom: "var(--space-2)" }}>
          <PlanCard
            plan={especial}
            featured
            isEspecial
            busy={busy === especial.idPlan}
            confirming={confirmDiscard === especial.idPlan}
            onMarcarCocinada={() => handleMarcarCocinada(especial.idPlan)}
            onAskDiscard={() => setConfirmDiscard(especial.idPlan)}
            onCancelDiscard={() => setConfirmDiscard(null)}
            onDescartar={() => handleDescartar(especial.idPlan)}
            onEvaluar={() => navigate(`/voto/${especial.idPlan}`)}
            onVerDetalle={() => navigate(detallePath(especial))}
          />

          {/* Extras anidados bajo el Especial con línea lateral */}
          <div style={{
            marginLeft: "var(--space-5)",
            paddingLeft: "var(--space-4)",
            borderLeft: "3px solid var(--line)",
          }}>
            {extras.length > 0 && (
              <>
                <p className="meta" style={{ fontSize: "var(--fs-xs)", margin: "var(--space-1) 0 var(--space-2)" }}>
                  Extras
                </p>
                {extras.map(p => (
                  <PlanCard
                    key={p.idPlan}
                    plan={p}
                    busy={busy === p.idPlan}
                    confirming={confirmDiscard === p.idPlan}
                    onMarcarCocinada={() => handleMarcarCocinada(p.idPlan)}
                    onAskDiscard={() => setConfirmDiscard(p.idPlan)}
                    onCancelDiscard={() => setConfirmDiscard(null)}
                    onDescartar={() => handleDescartar(p.idPlan)}
                    onEvaluar={() => navigate(`/voto/${p.idPlan}`)}
                    onVerDetalle={() => navigate(detallePath(p))}
                  />
                ))}
              </>
            )}
            <button
              className="btn btn-ghost"
              onClick={() => navigate("/biblioteca")}
              style={{ fontSize: "var(--fs-sm)", marginTop: extras.length > 0 ? "var(--space-1)" : "var(--space-2)", marginBottom: "var(--space-2)" }}
            >
              + Sumar extra
            </button>
          </div>
        </section>
      )}

      {/* ── En proceso ────────────────────────────────────────────────── */}
      {enProceso.length > 0 && (
        <section style={{ marginTop: "var(--space-4)" }}>
          <p className="meta" style={{ marginBottom: "var(--space-2)" }}>En proceso</p>
          {enProceso.map(p => (
            <PlanCard
              key={p.idPlan}
              plan={p}
              busy={busy === p.idPlan}
              confirming={confirmDiscard === p.idPlan}
              onMarcarCocinada={() => handleMarcarCocinada(p.idPlan)}
              onAskDiscard={() => setConfirmDiscard(p.idPlan)}
              onCancelDiscard={() => setConfirmDiscard(null)}
              onDescartar={() => handleDescartar(p.idPlan)}
              onEvaluar={() => navigate(`/voto/${p.idPlan}`)}
              onVerDetalle={() => navigate(detallePath(p))}
            />
          ))}
        </section>
      )}

      {/* ── Sumar en proceso ──────────────────────────────────────────── */}
      {!enProceso.length && hasPlanes && (
        <div style={{ marginTop: "var(--space-3)" }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/biblioteca")}
            style={{ fontSize: "var(--fs-sm)" }}
          >
            + Sumar en proceso
          </button>
        </div>
      )}

      {/* ── Compras ───────────────────────────────────────────────────── */}
      {hasPlanes && (
        <section style={{
          marginTop: "var(--space-5)",
          padding: "var(--space-3) var(--space-4)",
          background: "var(--surface-alt)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="meta" style={{ margin: 0 }}>Lista de compras</p>
            {lista && (
              <Link to="/compras" style={{ fontSize: "var(--fs-xs)", color: "var(--primary)" }}>
                Ver todo →
              </Link>
            )}
          </div>
          {lista ? (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--fs-sm)", color: "var(--text)" }}>
              <strong>{(lista.totalItems ?? 0) - (lista.totalYaTengo ?? 0)}</strong> pendientes
              {" · "}
              <strong>{lista.totalYaTengo ?? 0}</strong> ya tengo
            </p>
          ) : (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--fs-sm)", color: "var(--muted)" }}>
              Sin lista de compras todavía.
            </p>
          )}
        </section>
      )}

      {/* ── Herramientas JP ───────────────────────────────────────────── */}
      <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border)" }}>
        <p className="meta" style={{ marginBottom: "var(--space-2)" }}>Herramientas JP</p>
        <Link
          to="/menus/importar"
          style={{
            display: "inline-block",
            padding: "0.4rem 0.9rem",
            background: "var(--primary)",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          + Importar menú
        </Link>
      </div>
    </div>
  );
}
