import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { subscribeToPlanesActivos, marcarCocinada, descartarPlan, actualizarAsignaciones } from "../data/planes";
import { getListaById } from "../data/compras";
import { getSemanaActual } from "../lib/fechas";
import { separarPlanes } from "../lib/home";
import type { Plan, ListaCompras, Menu, MiembroId } from "../types/models";
import { MIEMBRO_IDS } from "../types/models";
import { getMenu } from "../data/menus";

const NOMBRES: Record<string, string> = {
  juanpablo: "Juan Pablo", maria: "María", sofia: "Sofía", federico: "Federico",
};
import { MemberDashboard } from "./MemberDashboard";

// ─── Public route ─────────────────────────────────────────────────────────────

export function HomeRoute() {
  const { state } = useAuth();
  const isJP = state.status === "authenticated" && state.user.memberId === "juanpablo";

  if (!isJP) return <MemberDashboard />;

  return <HomeJP />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    "Elegida":          { bg: "var(--surface-alt)",  color: "var(--muted)" },
    "Compra pendiente": { bg: "var(--warn-bg)",       color: "var(--warn-text)" },
    "Compra lista":     { bg: "var(--info-bg)",       color: "var(--info-text)" },
    "Cocinando":        { bg: "var(--primary)",       color: "#fff" },
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
  if (plan.tipoSeleccion === "menu") return `/menus/${plan.idSeleccion}`;
  return `/recetas/${plan.idSeleccion}`;
}

interface PlanCardProps {
  plan: Plan;
  menu?: Menu | null;
  featured?: boolean;
  isEspecial?: boolean;
  isJP?: boolean;
  busy: boolean;
  confirming: boolean;
  onCocinar: () => void;
  onMarcarCocinada: () => void;
  onAskDiscard: () => void;
  onCancelDiscard: () => void;
  onDescartar: () => void;
  onEvaluar: () => void;
  onVerDetalle: () => void;
}

function PlanCard({
  plan, menu, featured, isEspecial, isJP, busy, confirming,
  onCocinar, onMarcarCocinada, onAskDiscard, onCancelDiscard, onDescartar, onEvaluar, onVerDetalle,
}: PlanCardProps) {
  const canCocinar = ["Compra pendiente", "Compra lista", "Cocinando"].includes(plan.estado);

  // ── Asignaciones (solo JP, solo planes no evaluados) ────────────────────────
  const [asigEditing, setAsigEditing] = useState(false);
  const [asigLocal, setAsigLocal] = useState<string[]>(() => [...plan.asignaciones]);
  const [guardandoAsig, setGuardandoAsig] = useState(false);
  const [errorAsig, setErrorAsig] = useState<string | null>(null);
  const [showConfirmAsig, setShowConfirmAsig] = useState(false);

  useEffect(() => {
    if (!asigEditing) setAsigLocal([...plan.asignaciones]); // eslint-disable-line react-hooks/set-state-in-effect
  }, [plan.asignaciones, asigEditing]);

  const removidosConVoto = plan.asignaciones.filter(
    (id) => !asigLocal.includes(id) && plan.votos?.[id as MiembroId] != null
  );

  function handleClickGuardarAsig() {
    if (removidosConVoto.length > 0) { setShowConfirmAsig(true); return; }
    void doGuardarAsig();
  }

  async function doGuardarAsig() {
    setGuardandoAsig(true);
    setErrorAsig(null);
    setShowConfirmAsig(false);
    const r = await actualizarAsignaciones(plan.idPlan, asigLocal as MiembroId[]);
    setGuardandoAsig(false);
    if (r.ok) {
      setAsigEditing(false);
    } else {
      setErrorAsig(r.error.message);
    }
  }

  // Progreso de menú en estado Cocinando
  const cocinados = plan.componentesCocinados?.length ?? 0;
  const obligatorios = menu?.componentes.filter((c) => c.obligatorio).length ?? 0;

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
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontWeight: "var(--fw-medium)",
            fontSize: featured ? "var(--fs-md)" : "var(--fs-base)",
            color: "var(--text-strong)",
            margin: 0,
          }}>
            {plan.nombreSeleccion}
          </p>
          {plan.estado === "Cocinando" && plan.tipoSeleccion === "menu" && obligatorios > 0 && (
            <p className="meta" style={{ margin: "2px 0 0" }}>
              {cocinados}/{obligatorios} cocinados
            </p>
          )}
        </div>
        <EstadoBadge estado={plan.estado} />
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
        {canCocinar && (
          <button className="btn btn-primary" onClick={onCocinar} disabled={busy} style={{ fontSize: "var(--fs-sm)" }}>
            {busy ? "…" : plan.estado === "Cocinando" ? "Continuar cocinando" : "Cocinar"}
          </button>
        )}
        {canCocinar && (
          <button
            className="btn btn-secondary"
            onClick={onMarcarCocinada}
            disabled={busy}
            style={{ fontSize: "var(--fs-xs)", padding: "4px 10px" }}
          >
            Marcar Cocinada
          </button>
        )}
        {plan.estado === "Cocinada" && (
          <button className="btn btn-secondary" onClick={onEvaluar} style={{ fontSize: "var(--fs-sm)" }}>
            Ir a evaluar
          </button>
        )}
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

      {/* Asignaciones — solo JP, solo planes no evaluados */}
      {isJP && plan.estado !== "Evaluada" && (
        <div style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="meta" style={{ margin: 0, fontSize: "var(--fs-xs)" }}>Quién come este plato</p>
            {!asigEditing && (
              <button
                className="btn btn-ghost"
                onClick={() => { setAsigLocal([...plan.asignaciones]); setAsigEditing(true); setErrorAsig(null); setShowConfirmAsig(false); }}
                style={{ fontSize: "var(--fs-xs)" }}
              >
                Editar
              </button>
            )}
          </div>

          {!asigEditing && (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--fs-sm)", color: "var(--text)" }}>
              {plan.asignaciones.map((id) => NOMBRES[id] ?? id).join(", ")}
            </p>
          )}

          {asigEditing && (
            <>
              <div style={{ marginTop: "var(--space-2)" }}>
                {MIEMBRO_IDS.map((id) => (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-1) 0" }}>
                    <input
                      type="checkbox"
                      id={`asig-${plan.idPlan}-${id}`}
                      checked={asigLocal.includes(id)}
                      onChange={(e) => {
                        setAsigLocal((prev) =>
                          e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                        );
                        setShowConfirmAsig(false);
                      }}
                      disabled={guardandoAsig}
                    />
                    <label htmlFor={`asig-${plan.idPlan}-${id}`} style={{ fontSize: "var(--fs-sm)", cursor: "pointer" }}>
                      {NOMBRES[id]}
                    </label>
                  </div>
                ))}
              </div>

              {asigLocal.length === 0 && (
                <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--fs-xs)", color: "var(--err-text)" }}>
                  Tiene que comerlo al menos una persona.
                </p>
              )}

              {errorAsig && (
                <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--fs-xs)", color: "var(--err-text)" }}>
                  {errorAsig}
                </p>
              )}

              {showConfirmAsig && (
                <div style={{
                  marginTop: "var(--space-2)", padding: "var(--space-2)",
                  background: "var(--warn-bg)", borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--warn-text)",
                }}>
                  <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--fs-xs)", color: "var(--warn-text)" }}>
                    {removidosConVoto.map((id) => NOMBRES[id] ?? id).join(", ")}
                    {removidosConVoto.length === 1 ? " ya votó" : " ya votaron"} este plan.
                    {" "}Si {removidosConVoto.length === 1 ? "lo sacás, su voto" : "los sacás, sus votos"} se{" "}
                    {removidosConVoto.length === 1 ? "va a borrar" : "van a borrar"}. ¿Confirmás?
                  </p>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button className="btn btn-primary" onClick={() => void doGuardarAsig()} disabled={guardandoAsig} style={{ flex: 1, fontSize: "var(--fs-xs)" }}>
                      {guardandoAsig ? "Guardando…" : "Sí, guardar"}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowConfirmAsig(false)} disabled={guardandoAsig} style={{ flex: 1, fontSize: "var(--fs-xs)" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {!showConfirmAsig && (
                <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleClickGuardarAsig}
                    disabled={asigLocal.length === 0 || guardandoAsig}
                    style={{ flex: 1, fontSize: "var(--fs-xs)" }}
                  >
                    {guardandoAsig ? "Guardando…" : "Guardar"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setAsigEditing(false); setErrorAsig(null); setShowConfirmAsig(false); }}
                    disabled={guardandoAsig}
                    style={{ flex: 1, fontSize: "var(--fs-xs)" }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </>
          )}
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
  const [menusMap, setMenusMap] = useState<Map<string, Menu>>(new Map());
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

  // Cargar menús de planes tipo menú para mostrar progreso
  useEffect(() => {
    const menuPlanes = planes.filter((p) => p.tipoSeleccion === "menu");
    Promise.all(menuPlanes.map((p) => getMenu(p.idSeleccion))).then((menus) => {
      const map = new Map<string, Menu>();
      menuPlanes.forEach((p, i) => { if (menus[i]) map.set(p.idSeleccion, menus[i]!); });
      setMenusMap(map);
    });
  }, [planes]);

  const { especial, extras, enProceso } = useMemo(() => separarPlanes(planes), [planes]);

  function handleCocinar(plan: Plan) {
    if (plan.tipoSeleccion === "menu") {
      navigate(`/planes/${plan.idPlan}/componentes`);
    } else {
      navigate(`/planes/${plan.idPlan}/cocinar/${plan.idSeleccion}`);
    }
  }

  async function handleMarcarCocinada(plan: Plan) {
    setBusy(plan.idPlan);
    await marcarCocinada(plan.idPlan, { resetComponentes: plan.tipoSeleccion === "menu" });
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
            menu={especial.tipoSeleccion === "menu" ? (menusMap.get(especial.idSeleccion) ?? null) : null}
            featured
            isEspecial
            isJP
            busy={busy === especial.idPlan}
            confirming={confirmDiscard === especial.idPlan}
            onCocinar={() => handleCocinar(especial)}
            onMarcarCocinada={() => handleMarcarCocinada(especial)}
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
                    menu={p.tipoSeleccion === "menu" ? (menusMap.get(p.idSeleccion) ?? null) : null}
                    isJP
                    busy={busy === p.idPlan}
                    confirming={confirmDiscard === p.idPlan}
                    onCocinar={() => handleCocinar(p)}
                    onMarcarCocinada={() => handleMarcarCocinada(p)}
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
              menu={p.tipoSeleccion === "menu" ? (menusMap.get(p.idSeleccion) ?? null) : null}
              isJP
              busy={busy === p.idPlan}
              confirming={confirmDiscard === p.idPlan}
              onCocinar={() => handleCocinar(p)}
              onMarcarCocinada={() => handleMarcarCocinada(p)}
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
