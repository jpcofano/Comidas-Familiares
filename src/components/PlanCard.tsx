// src/components/PlanCard.tsx — card de plan con visual del DS v1.0

import { useState, useEffect } from "react";
import { actualizarAsignaciones } from "../data/planes";
import { AvatarStack } from "./MemberAvatar";
import type { Plan, Menu, MiembroId, EstadoPlan } from "../types/models";
import { MIEMBRO_IDS } from "../types/models";

const NOMBRES: Record<string, string> = {
  juanpablo: "Juan Pablo", maria: "María", sofia: "Sofía", federico: "Federico",
};

// ─── EstadoBadge ─────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: EstadoPlan | string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    "Elegida":          { bg: "var(--surface-alt)",  color: "var(--muted)" },
    "Compra pendiente": { bg: "var(--warn-bg)",       color: "var(--warn-text)" },
    "Compra lista":     { bg: "var(--info-bg)",       color: "var(--info-text)" },
    "Cocinando":        { bg: "var(--primary)",       color: "#fff" },
    "Cocinada":         { bg: "var(--ok-bg)",         color: "var(--ok-text)" },
    "Evaluada":         { bg: "var(--surface-alt)",   color: "var(--muted-strong)" },
  };
  const s = styles[estado] ?? styles["Elegida"];
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px",
      borderRadius: "var(--radius-full)",
      fontSize: "var(--fs-xs)", fontWeight: "var(--fw-medium)" as unknown as number,
      background: s.bg, color: s.color, flexShrink: 0,
    }}>
      {estado}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PlanCardProps {
  plan: Plan;
  menu?: Menu | null;
  featured?: boolean;
  isJP?: boolean;
  busy?: boolean;
  proteina?: string;
  tiempoLabel?: string;
  dificultad?: string;
  contexto?: string;
  onCocinar?: () => void;
  onVerReceta: () => void;
  onMarkCocinada?: () => void;
  onDescartar?: () => void;        // llamado DESPUÉS de confirmar
  onEvaluar?: () => void;
  confirmDescartarMsg?: string;
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────

export function PlanCard({
  plan, menu, featured, isJP, busy,
  proteina, tiempoLabel, dificultad, contexto,
  onCocinar, onVerReceta, onMarkCocinada, onDescartar, onEvaluar,
  confirmDescartarMsg,
}: PlanCardProps) {
  const canCocinar = (["Compra pendiente", "Compra lista", "Cocinando"] as const)
    .includes(plan.estado as "Compra pendiente" | "Compra lista" | "Cocinando");

  // Progreso de menú
  const cocinados   = plan.componentesCocinados?.length ?? 0;
  const obligatorios = menu?.componentes.filter((c) => c.obligatorio).length ?? 0;

  // ··· dropdown
  const [moreOpen, setMoreOpen] = useState(false);

  // Confirmación de descarte
  const [confirming, setConfirming] = useState(false);

  // Editor de asignaciones
  const [asigEditing, setAsigEditing] = useState(false);
  const [asigLocal, setAsigLocal] = useState<string[]>(() => [...plan.asignaciones]);
  const [guardandoAsig, setGuardandoAsig] = useState(false);
  const [errorAsig, setErrorAsig] = useState<string | null>(null);

  useEffect(() => {
    if (!asigEditing) setAsigLocal([...plan.asignaciones]);
  }, [plan.asignaciones, asigEditing]);

  async function doGuardarAsig() {
    setGuardandoAsig(true);
    setErrorAsig(null);
    const r = await actualizarAsignaciones(plan.idPlan, asigLocal as MiembroId[]);
    setGuardandoAsig(false);
    if (r.ok) {
      setAsigEditing(false);
      setMoreOpen(false);
    } else {
      setErrorAsig(r.error.message);
    }
  }

  function handleDescartar() {
    setConfirming(false);
    setMoreOpen(false);
    onDescartar?.();
  }

  const cocineroNombres = plan.asignaciones.map((id) => NOMBRES[id] ?? id);

  return (
    <div style={{
      border: featured ? "2px solid var(--primary)" : "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      background: "var(--surface-strong)",
      overflow: "hidden",
      marginBottom: "var(--space-3)",
    }}>
      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: featured ? "16px 18px 14px" : "14px 16px" }}>

        {/* Overline (solo featured) */}
        {featured && (
          <p style={{
            fontSize: 11, fontWeight: 700, color: "var(--primary)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: 6,
          }}>
            {contexto || "Especial de la semana"}
          </p>
        )}

        {/* Título + badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <h3 style={{
            fontWeight: 600, fontSize: featured ? 18 : 15,
            color: "var(--text-strong)", margin: 0,
            lineHeight: 1.2, letterSpacing: "-0.01em",
          }}>
            {plan.nombreSeleccion}
          </h3>
          <EstadoBadge estado={plan.estado} />
        </div>

        {/* Metadata: proteína · tiempo · dificultad */}
        {(proteina || tiempoLabel || dificultad) && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "4px 12px",
            marginTop: 8, fontSize: 13, color: "var(--muted)",
          }}>
            {proteina   && <span>{proteina}</span>}
            {tiempoLabel && <span>· {tiempoLabel}</span>}
            {dificultad  && <span>· {dificultad}</span>}
          </div>
        )}

        {/* Progreso de menú */}
        {plan.estado === "Cocinando" && plan.tipoSeleccion === "menu" && obligatorios > 0 && (
          <p className="meta" style={{ margin: "4px 0 0", fontSize: "var(--fs-xs)" }}>
            {cocinados}/{obligatorios} cocinados
          </p>
        )}

        {/* Cocineros */}
        {cocineroNombres.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            marginTop: 12, paddingTop: 10,
            borderTop: "1px solid var(--border-subtle)",
          }}>
            <AvatarStack
              names={cocineroNombres}
              size={22}
              onClick={isJP && plan.estado !== "Evaluada" ? () => setAsigEditing(true) : undefined}
            />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {cocineroNombres.join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* ── Action footer ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 8,
        padding: "10px 18px 12px",
        background: "var(--surface-alt)",
        borderTop: "1px solid var(--border-subtle)",
        position: "relative",
      }}>
        {canCocinar && onCocinar && (
          <button
            className="btn btn-primary"
            onClick={onCocinar}
            disabled={busy}
            style={{ flex: 1, fontSize: "var(--fs-sm)" }}
          >
            {busy ? "…" : plan.estado === "Cocinando" ? "Continuar cocinando" : "Cocinar"}
          </button>
        )}
        {plan.estado === "Cocinada" && onEvaluar && (
          <button
            className="btn btn-primary"
            onClick={onEvaluar}
            style={{ flex: 1, fontSize: "var(--fs-sm)" }}
          >
            Evaluar
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={onVerReceta}
          style={{ flex: canCocinar ? "0 0 auto" : 1, fontSize: "var(--fs-sm)" }}
        >
          Ver receta
        </button>
        <button
          aria-label="Más acciones"
          onClick={() => { setMoreOpen((v) => !v); setConfirming(false); }}
          style={{
            background: "var(--surface-strong)", border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)", padding: "0 10px",
            cursor: "pointer", color: "var(--muted)",
            fontFamily: "inherit", fontSize: 18, lineHeight: 1,
            minWidth: 38,
          }}
        >···</button>
      </div>

      {/* ── Menú de más acciones ──────────────────────────────────────────── */}
      {moreOpen && !asigEditing && !confirming && (
        <div style={{
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--surface-strong)",
          display: "flex", flexDirection: "column",
        }}>
          {onMarkCocinada && canCocinar && (
            <button
              className="btn btn-ghost"
              onClick={() => { setMoreOpen(false); onMarkCocinada(); }}
              disabled={busy}
              style={{ textAlign: "left", padding: "10px 18px", fontSize: "var(--fs-sm)", borderRadius: 0 }}
            >
              Marcar cocinada
            </button>
          )}
          {onDescartar && (
            <button
              className="btn btn-ghost"
              onClick={() => setConfirming(true)}
              disabled={busy}
              style={{
                textAlign: "left", padding: "10px 18px", fontSize: "var(--fs-sm)",
                color: "var(--err-text)", borderRadius: 0,
              }}
            >
              Descartar
            </button>
          )}
          <button
            className="btn btn-ghost"
            onClick={() => setMoreOpen(false)}
            style={{ textAlign: "left", padding: "10px 18px", fontSize: "var(--fs-sm)", color: "var(--muted)", borderRadius: 0 }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ── Confirmar descarte ────────────────────────────────────────────── */}
      {confirming && (
        <div style={{
          borderTop: "1px solid var(--warn-line)",
          background: "var(--warn-bg)",
          padding: "var(--space-3) var(--space-4)",
        }}>
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--warn-text)" }}>
            {confirmDescartarMsg ?? "¿Descartar este plan?"}
          </p>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <button
              className="btn btn-primary"
              onClick={handleDescartar}
              disabled={busy}
              style={{ fontSize: "var(--fs-sm)", background: "var(--err-text)", flex: 1 }}
            >
              {busy ? "…" : "Confirmar"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { setConfirming(false); setMoreOpen(false); }}
              style={{ fontSize: "var(--fs-sm)", flex: 1 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Editor de asignaciones (detrás del ···) ───────────────────────── */}
      {asigEditing && (
        <div style={{
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--surface-alt)",
          padding: "var(--space-3) var(--space-4)",
        }}>
          <p className="meta" style={{ marginBottom: "var(--space-2)", fontSize: "var(--fs-xs)" }}>
            Quiénes cocinan este plato
          </p>
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
                }}
                disabled={guardandoAsig}
              />
              <label htmlFor={`asig-${plan.idPlan}-${id}`} style={{ fontSize: "var(--fs-sm)", cursor: "pointer" }}>
                {NOMBRES[id]}
              </label>
            </div>
          ))}

          {asigLocal.length === 0 && (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--fs-xs)", color: "var(--err-text)" }}>
              Tiene que cocinarlo al menos una persona.
            </p>
          )}
          {errorAsig && (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--fs-xs)", color: "var(--err-text)" }}>
              {errorAsig}
            </p>
          )}

          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
            <button
              className="btn btn-primary"
              onClick={() => void doGuardarAsig()}
              disabled={asigLocal.length === 0 || guardandoAsig}
              style={{ flex: 1, fontSize: "var(--fs-xs)" }}
            >
              {guardandoAsig ? "Guardando…" : "Guardar"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { setAsigEditing(false); setErrorAsig(null); setMoreOpen(false); }}
              disabled={guardandoAsig}
              style={{ flex: 1, fontSize: "var(--fs-xs)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
