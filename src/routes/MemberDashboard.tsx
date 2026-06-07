import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, UserCheck } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { subscribeToPlanesActivos } from "../data/planes";
import { getHistorialReciente } from "../data/historial";
import { getSemanaActual, formatearRangoSemana, fechaToWeekIdx, fechaHoy } from "../lib/fechas";
import { useColorMiembro } from "../contexts/PerfilesContext";
import { WeekStrip } from "../components/WeekStrip";
import { EstadoBadge } from "../components/EstadoBadge";
import { AvatarStack, MemberAvatar } from "../components/MemberAvatar";
import { SkeletonList } from "../components/skeletons/SkeletonList";
import { tomarCompraRapida, liberarCompraRapida } from "../data/comprasRapidas";
import type { Plan, Historial, MiembroId } from "../types/models";

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAY_NAMES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_ABBR       = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const NOMBRES_MIEMBROS: Record<string, string> = {
  juanpablo: "Juan Pablo",
  maria: "María",
  sofia: "Sofía",
  federico: "Federico",
};

// ─── Visibilidad (Tarea 4) ────────────────────────────────────────────────────

// Filtra los planes que un miembro puede ver con nombre completo.
// TODO E12.x: hardening server-side — hoy subscribeToPlanesActivos trae todos los planes
// al cliente; un miembro podría leer nombreSeleccion de planes ajenos desde la consola.
// Reforzar con Firestore Rules (proyección redactada) o una query filtrada por asignaciones.
// Ver docs/MAPEO_FIRESTORE.md §E12.x.
function planesVisiblesPara(planes: Plan[], memberId: MiembroId): Plan[] {
  return planes.filter((p) => (p.asignaciones as string[]).includes(memberId));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diaDestr(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const idx = fechaToWeekIdx(dateStr);
  return idx !== null ? DAY_NAMES_FULL[idx] : "";
}

function chipDiaLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const idx = fechaToWeekIdx(dateStr);
  if (idx === null) return "";
  const d = new Date(dateStr + "T12:00:00");
  return `${DAY_ABBR[idx]} ${d.getDate()}`;
}

function cocinarHref(plan: Plan): string {
  return plan.tipoSeleccion === "menu"
    ? `/planes/${plan.idPlan}/componentes`
    : `/planes/${plan.idPlan}/cocinar/${plan.idSeleccion}`;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function PlanRowCompacto({ plan }: { plan: Plan }) {
  const dateStr = plan.fecha ?? plan.fechaPrevistaComida;
  const chip = chipDiaLabel(dateStr);
  const canCocinar = ["Compra pendiente", "Compra lista", "Cocinando"].includes(plan.estado);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--space-2)",
      padding: "var(--space-3) 0", borderBottom: "1px solid var(--border-subtle)",
    }}>
      {chip && (
        <span style={{
          flexShrink: 0, minWidth: 36, textAlign: "center",
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          color: "var(--muted)", lineHeight: 1.2,
        }}>
          {chip}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "var(--fs-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {plan.nombreSeleccion}
        </p>
        <p className="meta" style={{ margin: 0, fontSize: "var(--fs-xs)" }}>
          {plan.tipoPlan}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
        <EstadoBadge estado={plan.estado} />
        {canCocinar && (
          <Link to={cocinarHref(plan)}>
            <button className="btn btn-primary" style={{ fontSize: "var(--fs-xs)", padding: "3px 10px" }}>
              {plan.estado === "Cocinando" ? "Continuar" : "Cocinar"}
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

function HistorialRow({ entrada, miembroId }: { entrada: Historial; miembroId: MiembroId }) {
  const miPuntaje = entrada.calificaciones?.[miembroId];
  return (
    <Link to={`/historial/${entrada.idHist}`} style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: "var(--space-2)", padding: "var(--space-2) 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {entrada.nombreSeleccion}
          </p>
          <p className="meta" style={{ margin: 0, fontSize: "var(--fs-xs)" }}>{entrada.fechaRealizada}</p>
        </div>
        {miPuntaje != null && (
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", fontWeight: "var(--fw-medium)", flexShrink: 0, color: "var(--text-strong)" }}>
            {miPuntaje}★
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export function MemberDashboard() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const semana = getSemanaActual();

  // memberId puede ser null antes de autenticar — dar fallback para hooks
  const memberId = (state.status === "authenticated" ? state.user.memberId : "maria") as MiembroId;
  const nombre   = state.status === "authenticated" ? state.user.nombre : "";
  const memberColor = useColorMiembro(memberId);

  const [planes, setPlanes] = useState<Plan[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState(false);

  useEffect(() => subscribeToPlanesActivos(semana, setPlanes), [semana]);

  useEffect(() => {
    getHistorialReciente()
      .then((r) => {
        if (r.ok) setHistorial(r.value.slice(0, 4));
        else setErrorHistorial(true);
      })
      .finally(() => setLoadingHistorial(false));
  }, []);

  if (state.status !== "authenticated") return null;

  // ── Derivar datos ────────────────────────────────────────────────────────────

  const todosLosMiosPorTipo = planesVisiblesPara(planes, memberId);
  const misPlanes = todosLosMiosPorTipo.filter((p) => p.tipoSeleccion !== "compra-rapida");
  // E14.5: compras rápidas activas → las ven los 4 (no filtrar por asignaciones)
  const misCompras = planes.filter(
    (p) => p.tipoSeleccion === "compra-rapida" && p.estado !== "Compra lista",
  );

  // Dias con CUALQUIER plan activo (solo existencia, sin nombres ajenos)
  const diasConComida = useMemo(() => {
    const s = new Set<number>();
    planes.forEach((p) => {
      if (p.estado === "Cocinada") return;
      const dateStr = p.fecha ?? p.fechaPrevistaComida;
      if (dateStr) { const i = fechaToWeekIdx(dateStr); if (i !== null) s.add(i); }
    });
    return s;
  }, [planes]);

  // Mis días de cocina
  const misDias = useMemo(() => {
    const s = new Set<number>();
    misPlanes.forEach((p) => {
      const dateStr = p.fecha ?? p.fechaPrevistaComida;
      if (dateStr) { const i = fechaToWeekIdx(dateStr); if (i !== null) s.add(i); }
    });
    return s;
  }, [misPlanes]);

  // Hero: plan de hoy (o el próximo mío)
  const hoyStr = fechaHoy();
  const hoyIdx = fechaToWeekIdx(hoyStr);

  const platoDeHoy = misPlanes.find((p) => {
    const dateStr = p.fecha ?? p.fechaPrevistaComida;
    return dateStr ? fechaToWeekIdx(dateStr) === hoyIdx : false;
  });
  const heroPlato = platoDeHoy ?? misPlanes[0] ?? null;
  const heroEsHoy = !!platoDeHoy;

  // Pendientes de votar (Cocinada + sin mi voto)
  const pendientes = planes.filter(
    (p) => p.estado === "Cocinada" && !p.votos?.[memberId]
  );

  // Planes listados (excluye el del hero)
  const planesListados = heroPlato
    ? misPlanes.filter((p) => p.idPlan !== heroPlato.idPlan)
    : misPlanes;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* 1. Saludo */}
      <div>
        <h2 style={{ margin: "0 0 var(--space-1)", fontSize: 24, fontWeight: 700, color: "var(--text-strong)" }}>
          Hola, {nombre}
        </h2>
        <p className="meta" style={{ margin: 0 }}>
          Semana del {formatearRangoSemana(semana)}
        </p>
      </div>

      {/* 2. Tira de semana */}
      <div style={{
        background: "var(--surface-strong)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "var(--space-3) var(--space-3) var(--space-2)",
      }}>
        <WeekStrip
          semanaInicio={semana}
          misDias={misDias}
          diasConComida={diasConComida}
          memberColor={memberColor}
          showLegend
        />
      </div>

      {/* 3. Hero plato */}
      {heroPlato && (() => {
        const dateStr = heroPlato.fecha ?? heroPlato.fechaPrevistaComida;
        const diaNombre = diaDestr(dateStr);
        const eyebrow = heroEsHoy
          ? "Hoy cocinás vos"
          : `Tu próximo plato · ${diaNombre}`;
        const canCocinar = ["Compra pendiente", "Compra lista", "Cocinando"].includes(heroPlato.estado);
        const btnText = heroPlato.estado === "Cocinando" ? "Continuar cocción" : "Empezar";
        const coCocineros = (heroPlato.asignaciones as string[]).filter((id) => id !== memberId);
        const coNombres = coCocineros.map((id) => NOMBRES_MIEMBROS[id] ?? id);
        const coIds = coCocineros as MiembroId[];

        return (
          <div style={{
            borderRadius: "var(--radius-md)", overflow: "hidden",
            border: "1px solid var(--border)",
            display: "flex",
          }}>
            {/* Barra lateral de color */}
            <div style={{ width: 5, background: memberColor, flexShrink: 0 }} />
            {/* Contenido */}
            <div style={{ flex: 1, padding: "var(--space-4)", background: "var(--surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                <p style={{ margin: 0, fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                  {eyebrow}
                </p>
                <EstadoBadge estado={heroPlato.estado} />
              </div>
              <h2 style={{ margin: "0 0 var(--space-1)", fontSize: 20, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.2 }}>
                {heroPlato.nombreSeleccion}
              </h2>
              <p className="meta" style={{ margin: "0 0 var(--space-3)" }}>
                {heroPlato.tipoPlan}
              </p>
              {coNombres.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                  <AvatarStack names={coNombres} memberIds={coIds} size={22} />
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                    {coNombres.join(", ")} también cocina{coNombres.length > 1 ? "n" : ""}
                  </span>
                </div>
              )}
              {canCocinar && (
                <Link to={cocinarHref(heroPlato)} style={{ display: "block" }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", fontWeight: 700 }}
                  >
                    {btnText}
                  </button>
                </Link>
              )}
            </div>
          </div>
        );
      })()}

      {/* 4. Banner por votar */}
      {pendientes.length > 0 && (
        <div style={{
          background: "var(--warn-bg)", border: "1px solid var(--warn-line)",
          borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)",
        }}>
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--warn-text)", fontWeight: "var(--fw-medium)" }}>
            {pendientes.length === 1 ? "Un plato espera tu nota" : `${pendientes.length} platos esperan tu nota`}
          </p>
          <button
            className="btn"
            onClick={() => navigate(`/voto/${pendientes[0].idPlan}`)}
            style={{
              flexShrink: 0, background: "var(--warn-text)", color: "#fff",
              border: "none", fontSize: "var(--fs-sm)", padding: "5px 14px",
              borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Evaluar →
          </button>
        </div>
      )}

      {/* 5. Lo que cocinás esta semana */}
      <div className="card">
        <h3 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--fs-base)", fontWeight: "var(--fw-semibold)", color: "var(--text-strong)" }}>
          Lo que cocinás esta semana
        </h3>
        {misPlanes.length === 0 ? (
          <p className="meta" style={{ margin: "var(--space-2) 0 0" }}>
            No tenés platos asignados esta semana.
          </p>
        ) : planesListados.length === 0 ? (
          <p className="meta" style={{ margin: "var(--space-2) 0 0" }}>
            Solo el plato de arriba esta semana.
          </p>
        ) : (
          planesListados.map((p) => <PlanRowCompacto key={p.idPlan} plan={p} />)
        )}
        {diasConComida.size > misDias.size && (
          <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--fs-xs)", color: "var(--muted)", fontStyle: "italic" }}>
            Los demás días ya hay una comida programada.
          </p>
        )}
      </div>

      {/* 6. Compras rápidas — turno voluntario */}
      {(() => {
        const puedeGestionarCompras = memberId === "juanpablo" || memberId === "maria";
        if (misCompras.length === 0 && !puedeGestionarCompras) return null;
        return (
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
              <h3 style={{ margin: 0, fontSize: "var(--fs-base)", fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <ShoppingBag size={16} color="var(--primary)" />
                Compras
              </h3>
              {puedeGestionarCompras && (
                <Link to="/compras/armar" style={{ fontSize: 11, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
                  + Armar
                </Link>
              )}
            </div>
            {misCompras.length === 0 ? (
              <p className="meta" style={{ margin: 0, fontSize: "var(--fs-xs)" }}>
                No hay compras pendientes.{puedeGestionarCompras && <> Tocá <strong>+ Armar</strong> para preparar la de esta semana.</>}
              </p>
            ) : (
              misCompras.map((p) => (
                <CompraRapidaCardTurno key={p.idPlan} plan={p} selfId={memberId} />
              ))
            )}
          </div>
        );
      })()}

      {/* 7. Mi historial */}
      <div className="card">
        <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--fs-base)", fontWeight: "var(--fw-semibold)", color: "var(--text-strong)" }}>
          Mi historial
        </h3>
        {loadingHistorial ? (
          <SkeletonList count={3} />
        ) : errorHistorial ? (
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--err-text)" }}>
            No se pudo cargar tu historial.
          </p>
        ) : historial.length === 0 ? (
          <p className="meta">Todavía no hay evaluaciones registradas.</p>
        ) : (
          historial.map((h) => (
            <HistorialRow key={h.idHist} entrada={h} miembroId={memberId} />
          ))
        )}
        {!loadingHistorial && historial.length > 0 && (
          <Link
            to="/historial"
            style={{ display: "block", marginTop: "var(--space-3)", color: "var(--primary)", fontSize: "var(--fs-sm)" }}
          >
            Ver todo →
          </Link>
        )}
      </div>

    </div>
  );
}

// ─── Card turno voluntario (3 estados) ───────────────────────────────────────

function CompraRapidaCardTurno({ plan, selfId }: { plan: Plan; selfId: MiembroId }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encargado = plan.encargado ?? null;
  const items = plan.itemsCompraRapida ?? [];
  const comprados = items.filter(it => it.comprado).length;

  async function handleTomar() {
    setBusy(true); setError(null);
    const r = await tomarCompraRapida(plan.idPlan, selfId);
    setBusy(false);
    if (!r.ok) setError(r.error.message);
  }

  async function handleLiberar() {
    setBusy(true); setError(null);
    const r = await liberarCompraRapida(plan.idPlan);
    setBusy(false);
    if (!r.ok) setError(r.error.message);
  }

  return (
    <div style={{ padding: "var(--space-3) 0", borderBottom: "1px solid var(--border-subtle)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <ShoppingBag size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {plan.nombreSeleccion}
        </span>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>{comprados}/{items.length}</span>
      </div>

      {/* Estado */}
      {encargado === null ? (
        /* Sin encargado */
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>Sin encargado · la ven los 4</span>
          <button
            disabled={busy}
            onClick={() => void handleTomar()}
            style={{
              padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff",
              cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
            }}
          >
            Yo me encargo
          </button>
        </div>
      ) : encargado === selfId ? (
        /* Yo me encargo */
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserCheck size={14} color="var(--ok-text)" />
            <span style={{ fontSize: 11, color: "var(--ok-text)", fontWeight: 600, flex: 1 }}>Lo estoy haciendo yo</span>
            <button
              onClick={() => navigate(`/compra-rapida/${plan.idPlan}`)}
              style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
            >
              Ver lista →
            </button>
          </div>
          <button
            disabled={busy}
            onClick={() => void handleLiberar()}
            style={{ marginTop: 4, fontSize: 11, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
          >
            Ya no puedo — liberar
          </button>
        </div>
      ) : (
        /* Otro lo hace */
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MemberAvatar name={NOMBRES_MIEMBROS[encargado] ?? encargado} memberId={encargado} size={20} />
          <span style={{ fontSize: 11, color: "var(--muted)", flex: 1 }}>
            {NOMBRES_MIEMBROS[encargado] ?? encargado} se está encargando
          </span>
          <button
            disabled={busy}
            onClick={() => void handleTomar()}
            style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
          >
            La hago yo
          </button>
        </div>
      )}

      {error && (
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--err-text)" }}>{error}</p>
      )}
    </div>
  );
}
