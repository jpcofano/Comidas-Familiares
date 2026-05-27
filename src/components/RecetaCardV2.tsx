// src/components/RecetaCardV2.tsx — card de receta para lista de compras (Variant C)
// Day badge izquierda · título + porciones + avatares · stamp "✓ Lista" cuando completa
// Color band izquierdo por día · barrita de progreso al fondo.

import { groupByGondola } from "../lib/gondolas";
import { IngredienteSubheader } from "./IngredienteSubheader";
import { IngredienteChip } from "./IngredienteChip";
import { AvatarStack } from "./MemberAvatar";
import type { ItemCompra, Plan } from "../types/models";

const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

const DIA_COLOR: Record<string, string> = {
  Dom: "oklch(0.50 0.09 15)",
  Lun: "oklch(0.55 0.10 25)",
  Mar: "oklch(0.62 0.09 50)",
  Mié: "oklch(0.55 0.08 130)",
  Jue: "oklch(0.50 0.08 200)",
  Vie: "oklch(0.45 0.10 320)",
  Sáb: "oklch(0.55 0.07 260)",
};

interface RecetaCardV2Props {
  plan: Plan;
  items: ItemCompra[];
  onToggle: (itemId: string) => void;
}

export function RecetaCardV2({ plan, items, onToggle }: RecetaCardV2Props) {
  const done = items.length > 0 && items.every((i) => i.yaTengo);
  const completedCount = items.filter((i) => i.yaTengo).length;
  const grupos = groupByGondola(items);

  // Day badge info
  const fecha = plan.fecha ?? plan.fechaPrevistaComida;
  let diaAbr = "";
  let diaNum = 0;
  if (fecha) {
    const d = new Date(fecha + "T12:00:00");
    diaAbr = DIAS_ES[d.getDay()];
    diaNum = d.getDate();
  }
  const bandColor = DIA_COLOR[diaAbr] ?? "var(--primary)";

  return (
    <div style={{
      background: "var(--surface-strong)",
      borderRadius: 18,
      marginBottom: 14,
      overflow: "hidden",
      position: "relative",
      border: "1px solid var(--border-subtle)",
      opacity: done ? 0.82 : 1,
      transition: "opacity 200ms ease",
    }}>
      {/* Left color band */}
      <div style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0,
        width: 4,
        background: bandColor,
      }} />

      {/* Recipe header */}
      <div style={{
        padding: "14px 16px 10px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        {/* Day badge */}
        {diaAbr ? (
          <div style={{
            width: 44,
            flexShrink: 0,
            padding: "8px 0",
            borderRadius: 10,
            background: "var(--surface-alt)",
            textAlign: "center",
            lineHeight: 1,
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: bandColor,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 2,
            }}>
              {diaAbr}
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-strong)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {diaNum}
            </div>
          </div>
        ) : (
          <div style={{ width: 44, flexShrink: 0 }} />
        )}

        {/* Recipe info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontSize: 17,
            fontWeight: 700,
            color: "var(--text-strong)",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
            marginBottom: 3,
          }}>
            {plan.nombreSeleccion}
          </h2>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
              {plan.cantidadPersonas} porc · {items.length} ingredientes
            </span>
            {plan.asignaciones.length > 0 && (
              <>
                <span style={{ color: "var(--border)" }}>·</span>
                <AvatarStack names={plan.asignaciones} size={18} />
              </>
            )}
          </div>
        </div>

        {/* Done stamp */}
        {done && (
          <span style={{
            padding: "4px 8px",
            borderRadius: 999,
            background: "var(--ok-bg)",
            color: "var(--ok-text)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.02em",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6.5l2.5 2.5 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Lista
          </span>
        )}
      </div>

      {/* Ingredients grouped by gondola */}
      <div style={{ padding: "10px 14px 14px 18px" }}>
        {grupos.map((g, gi) => (
          <div key={g.seccion} style={{ marginTop: gi === 0 ? 0 : 8 }}>
            <IngredienteSubheader seccion={g.seccion} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {g.items.map((item) => (
                <IngredienteChip
                  key={item.id}
                  item={item}
                  onToggle={() => onToggle(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar at bottom when partially done */}
      {!done && completedCount > 0 && (
        <div style={{
          position: "absolute",
          left: 0, bottom: 0,
          height: 3,
          background: "var(--primary)",
          width: `${(completedCount / items.length) * 100}%`,
          transition: "width 280ms ease",
        }} />
      )}
    </div>
  );
}
