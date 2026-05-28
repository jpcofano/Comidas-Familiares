// src/components/receta/IngredientesPorGondola.tsx
// Agrupa los ingredientes de la receta por sección de góndola.
// OJO: acá el campo es `seccion` (de Receta), NO `seccionGondola` (de ItemCompra).

import { groupByGondola } from "../../lib/catalogo";
import { GondolaChip } from "../GondolaChip";
import { pluralizarUnidad } from "../../lib/unidades";
import type { IngredienteEnReceta } from "../../types/models";

interface IngredientesPorGondolaProps {
  ingredientes: IngredienteEnReceta[];
}

export function IngredientesPorGondola({ ingredientes }: IngredientesPorGondolaProps) {
  const grupos = groupByGondola(ingredientes, (ing) => ing.seccion ?? "");

  return (
    <div>
      {grupos.map((g, gi) => (
        <div key={g.seccion} style={{ marginTop: gi === 0 ? 0 : "var(--space-4)" }}>
          {/* Subheader de sección */}
          {g.seccion && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "var(--space-2)",
            }}>
              <GondolaChip seccion={g.seccion} size={20} />
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}>
                {g.seccion}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted)", opacity: 0.6 }}>
                {g.items.length}
              </span>
            </div>
          )}

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {g.items.map((ing, idx) => {
              const cantidadStr = ing.cantidadLabel
                ?? (ing.cantidad != null ? String(ing.cantidad) : "");
              const unidadStr = ing.unidad
                ? pluralizarUnidad(ing.unidad, ing.cantidadMax ?? ing.cantidadMin ?? 1)
                : "";
              return (
                <li
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderTop: idx === 0 ? "none" : "1px solid var(--border-subtle)",
                    fontSize: "var(--fs-sm)",
                    color: ing.opcional ? "var(--muted)" : "var(--text)",
                  }}
                >
                  <span>
                    {ing.textoOriginal}
                    {ing.opcional && (
                      <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginLeft: 4 }}>
                        (opcional)
                      </span>
                    )}
                  </span>
                  <span style={{
                    color: "var(--muted-strong)",
                    flexShrink: 0,
                    marginLeft: "var(--space-3)",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {cantidadStr} {unidadStr}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
