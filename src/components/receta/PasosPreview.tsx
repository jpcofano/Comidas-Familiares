// src/components/receta/PasosPreview.tsx — muestra los primeros 3 pasos
// Banner ⚠ riesgos ANTES de los pasos. Botón "Ver los N pasos restantes ↓" expande inline.

import { useState } from "react";
import type { Paso } from "../../types/models";

interface PasosPreviewProps {
  pasos: Paso[];
  riesgos?: string;
}

export function PasosPreview({ pasos, riesgos }: PasosPreviewProps) {
  const [expandido, setExpandido] = useState(false);
  const sorted = [...pasos].sort((a, b) => a.nroPaso - b.nroPaso);
  const visibles = expandido ? sorted : sorted.slice(0, 3);
  const restantes = sorted.length - 3;

  return (
    <div>
      {/* Banner de riesgos */}
      {riesgos && (
        <div style={{
          padding: "10px 12px",
          background: "var(--warn-bg)",
          borderRadius: "var(--radius-sm)",
          marginBottom: "var(--space-3)",
        }}>
          <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--warn-text)" }}>
            ⚠ {riesgos}
          </p>
        </div>
      )}

      <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {visibles.map((paso) => (
          <li key={paso.nroPaso} style={{ marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
              {/* Número círculo */}
              <span style={{
                flexShrink: 0,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--primary-soft)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--fs-xs)",
                fontWeight: "var(--fw-semibold)" as unknown as number,
              }}>
                {paso.nroPaso}
              </span>

              <div style={{ flex: 1 }}>
                {paso.titulo && (
                  <p style={{
                    fontWeight: "var(--fw-medium)" as unknown as number,
                    color: "var(--text-strong)",
                    marginBottom: "var(--space-1)",
                    fontSize: "var(--fs-sm)",
                    margin: "0 0 4px",
                  }}>
                    {paso.titulo}
                  </p>
                )}
                {paso.tiempoEstimadoLabel && (
                  <p style={{
                    fontSize: "var(--fs-xs)",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    margin: "0 0 4px",
                  }}>
                    {paso.tiempoEstimadoLabel}
                  </p>
                )}
                <p style={{
                  fontSize: "var(--fs-sm)",
                  color: "var(--text)",
                  lineHeight: 1.55,
                  margin: 0,
                }}>
                  {paso.detalle}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* Botón expandir */}
      {!expandido && restantes > 0 && (
        <button
          onClick={() => setExpandido(true)}
          className="btn btn-ghost"
          style={{
            width: "100%",
            fontSize: "var(--fs-sm)",
            color: "var(--primary)",
            marginTop: "var(--space-2)",
          }}
        >
          Ver los {restantes} {restantes === 1 ? "paso restante" : "pasos restantes"} ↓
        </button>
      )}
    </div>
  );
}
