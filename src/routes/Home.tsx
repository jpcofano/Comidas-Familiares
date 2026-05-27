import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { subscribeToPlanesActivos, marcarCocinada, descartarPlan } from "../data/planes";
import { getListaById } from "../data/compras";
import { getRecetasByIds } from "../data/recetas";
import { getMenu } from "../data/menus";
import { getSemanaActual } from "../lib/fechas";
import { separarPlanes } from "../lib/home";
import { WeekStrip } from "../components/WeekStrip";
import { PlanCard } from "../components/PlanCard";
import { CompraProgress } from "../components/CompraProgress";
import { SemanaBadge } from "../components/SemanaBadge";
import type { Plan, ListaCompras, Menu, Receta } from "../types/models";
import { MemberDashboard } from "./MemberDashboard";

// ─── Helper: formatea rango de semana "26 may – 1 jun" ───────────────────────

const MESES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function getSemanaRango(semanaInicio: string): string {
  const lunes = new Date(semanaInicio + "T12:00:00");
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()} ${MESES_ES[d.getMonth()]}`;
  return `${fmt(lunes)} – ${fmt(domingo)}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getContexto(plan: Plan): string {
  const dateStr = plan.fecha ?? plan.fechaPrevistaComida;
  if (!dateStr) return "Especial de la semana";
  const d = new Date(dateStr + "T12:00:00");
  return `Especial · ${DAYS_ES[d.getDay()]}`;
}

function fechaToWeekIdx(dateStr: string): number | null {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay(); // 0=Sun...6=Sat
  return day === 0 ? 6 : day - 1; // 0=Mon...6=Sun
}

function detallePath(plan: Plan): string {
  if (plan.tipoSeleccion === "menu") return `/menus/${plan.idSeleccion}`;
  return `/recetas/${plan.idSeleccion}`;
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, color: "var(--muted)",
      textTransform: "uppercase", letterSpacing: ".06em",
      margin: "4px 0 8px",
    }}>
      {children}
    </p>
  );
}

// ─── Public route ─────────────────────────────────────────────────────────────

export function HomeRoute() {
  const { state } = useAuth();
  const isJP = state.status === "authenticated" && state.user.memberId === "juanpablo";
  if (!isJP) return <MemberDashboard />;
  return <HomeJP />;
}

// ─── JP home ──────────────────────────────────────────────────────────────────

function HomeJP() {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState<ListaCompras | null>(null);
  const [menusMap, setMenusMap] = useState<Map<string, Menu>>(new Map());
  const [recetasMap, setRecetasMap] = useState<Map<string, Receta>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);

  const semana = useMemo(() => getSemanaActual(), []);

  // Suscripción a planes activos
  useEffect(() => {
    return subscribeToPlanesActivos(semana, (p) => {
      setPlanes(p);
      setLoading(false);
    });
  }, [semana]);

  // Cargar lista de compras
  useEffect(() => {
    const listaId = planes.find((p) => p.listaComprasId != null)?.listaComprasId ?? null;
    if (!listaId) { setLista(null); return; }
    getListaById(listaId).then(setLista);
  }, [planes]);

  // Cargar menús de planes tipo menú
  useEffect(() => {
    const menuPlanes = planes.filter((p) => p.tipoSeleccion === "menu");
    Promise.all(menuPlanes.map((p) => getMenu(p.idSeleccion))).then((menus) => {
      const map = new Map<string, Menu>();
      menuPlanes.forEach((p, i) => { if (menus[i]) map.set(p.idSeleccion, menus[i]!); });
      setMenusMap(map);
    });
  }, [planes]);

  // Cargar recetas para metadata de PlanCard
  useEffect(() => {
    const ids = planes.filter((p) => p.tipoSeleccion === "receta").map((p) => p.idSeleccion);
    if (ids.length === 0) return;
    getRecetasByIds(ids).then((recetas) => {
      const map = new Map<string, Receta>();
      recetas.forEach((r) => { if (r) map.set(r.idReceta, r); });
      setRecetasMap(map);
    });
  }, [planes]);

  const { especial, extras, enProceso } = useMemo(() => separarPlanes(planes), [planes]);

  const semanaRango = useMemo(() => getSemanaRango(semana), [semana]);

  // Días marcados en el WeekStrip
  const marked = useMemo(() => {
    const indices = new Set<number>();
    planes.forEach((p) => {
      const dateStr = p.fecha ?? p.fechaPrevistaComida;
      if (dateStr) {
        const idx = fechaToWeekIdx(dateStr);
        if (idx !== null) indices.add(idx);
      }
    });
    return [...indices];
  }, [planes]);

  // ── Handlers ────────────────────────────────────────────────────────────────

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
  }

  // ── Helpers de PlanCard props ────────────────────────────────────────────────

  function recetaProps(plan: Plan) {
    if (plan.tipoSeleccion !== "receta") return {};
    const r = recetasMap.get(plan.idSeleccion);
    if (!r) return {};
    return {
      proteina: r.proteinaPrincipal,
      tiempoLabel: r.tiempoActivoLabel,
      dificultad: r.dificultad,
    };
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="card">
        <p className="meta">Cargando…</p>
      </div>
    );
  }

  const hasPlanes = especial !== null || extras.length > 0 || enProceso.length > 0;

  return (
    <div className="card" style={{ paddingBottom: "var(--space-6)", display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Kicker + título + badge de semana ──────────────────────────── */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <p style={{
          fontSize: 11, fontWeight: 600, color: "var(--muted)",
          textTransform: "uppercase", letterSpacing: ".06em",
          marginBottom: 4,
        }}>
          Esta semana
        </p>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <h1 style={{
            fontSize: 20,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {planes.length === 0
              ? "Sin comidas planeadas"
              : `${planes.length} ${planes.length === 1 ? "comida planeada" : "comidas planeadas"}`}
          </h1>
          <SemanaBadge rango={semanaRango} />
        </div>
      </div>

      {/* ── WeekStrip ────────────────────────────────────────────────────── */}
      <WeekStrip semanaInicio={semana} marked={marked} />

      {/* ── Sin planes ───────────────────────────────────────────────────── */}
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

      {/* ── Especial + extras ────────────────────────────────────────────── */}
      {especial && (
        <section style={{ marginBottom: "var(--space-2)" }}>
          <PlanCard
            plan={especial}
            menu={especial.tipoSeleccion === "menu" ? (menusMap.get(especial.idSeleccion) ?? null) : null}
            featured
            isJP
            busy={busy === especial.idPlan}
            contexto={getContexto(especial)}
            confirmDescartarMsg="¿Descartar la Especial? También se van a descartar sus extras."
            onCocinar={() => handleCocinar(especial)}
            onVerReceta={() => navigate(detallePath(especial))}
            onMarkCocinada={() => handleMarcarCocinada(especial)}
            onDescartar={() => handleDescartar(especial.idPlan)}
            onEvaluar={() => navigate(`/voto/${especial.idPlan}`)}
            {...recetaProps(especial)}
          />

          {/* Extras */}
          <div style={{
            marginLeft: "var(--space-5)",
            paddingLeft: "var(--space-4)",
            borderLeft: "3px solid var(--line)",
          }}>
            {extras.length > 0 && (
              <>
                <SectionLabel>Extras</SectionLabel>
                {extras.map((p) => (
                  <PlanCard
                    key={p.idPlan}
                    plan={p}
                    menu={p.tipoSeleccion === "menu" ? (menusMap.get(p.idSeleccion) ?? null) : null}
                    isJP
                    busy={busy === p.idPlan}
                    onCocinar={() => handleCocinar(p)}
                    onVerReceta={() => navigate(detallePath(p))}
                    onMarkCocinada={() => handleMarcarCocinada(p)}
                    onDescartar={() => handleDescartar(p.idPlan)}
                    onEvaluar={() => navigate(`/voto/${p.idPlan}`)}
                    {...recetaProps(p)}
                  />
                ))}
              </>
            )}
            <button
              className="btn btn-ghost"
              onClick={() => navigate("/biblioteca")}
              style={{
                fontSize: "var(--fs-sm)",
                marginTop: extras.length > 0 ? "var(--space-1)" : "var(--space-2)",
                marginBottom: "var(--space-2)",
              }}
            >
              + Sumar extra
            </button>
          </div>
        </section>
      )}

      {/* ── En proceso ───────────────────────────────────────────────────── */}
      {enProceso.length > 0 && (
        <section style={{ marginTop: "var(--space-4)" }}>
          <SectionLabel>En proceso</SectionLabel>
          {enProceso.map((p) => (
            <PlanCard
              key={p.idPlan}
              plan={p}
              menu={p.tipoSeleccion === "menu" ? (menusMap.get(p.idSeleccion) ?? null) : null}
              isJP
              busy={busy === p.idPlan}
              onCocinar={() => handleCocinar(p)}
              onVerReceta={() => navigate(detallePath(p))}
              onMarkCocinada={() => handleMarcarCocinada(p)}
              onDescartar={() => handleDescartar(p.idPlan)}
              onEvaluar={() => navigate(`/voto/${p.idPlan}`)}
              {...recetaProps(p)}
            />
          ))}
        </section>
      )}

      {/* ── Lista de compras ─────────────────────────────────────────────── */}
      {hasPlanes && (
        <CompraProgress
          pendientes={(lista?.totalItems ?? 0) - (lista?.totalYaTengo ?? 0)}
          yaTengo={lista?.totalYaTengo ?? 0}
          onClick={() => navigate("/compras")}
        />
      )}

      {/* ── Herramientas JP ──────────────────────────────────────────────── */}
      <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border)" }}>
        <p className="meta" style={{ marginBottom: "var(--space-2)" }}>Herramientas JP</p>
        <Link
          to="/menus/importar"
          className="btn btn-primary"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          + Importar menú
        </Link>
      </div>
    </div>
  );
}
