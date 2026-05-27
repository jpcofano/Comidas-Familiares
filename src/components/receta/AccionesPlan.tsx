// src/components/receta/AccionesPlan.tsx — acciones JP plegadas
// Botón header colapsable + 3 AccionRow (Especial / Extra / En proceso).

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface AccionRowProps {
  label: string;
  disabled: boolean;
  razon?: string;
  loading: boolean;
  onClick: () => void;
}

function AccionRow({ label, disabled, razon, loading, onClick }: AccionRowProps) {
  return (
    <div style={{ paddingBottom: "var(--space-2)" }}>
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`btn ${disabled ? "btn-secondary" : "btn-primary"}`}
        style={{
          width: "100%",
          opacity: disabled ? 0.6 : 1,
          fontSize: "var(--fs-sm)",
        }}
      >
        {loading ? "…" : label}
      </button>
      {disabled && razon && (
        <p className="meta" style={{ marginTop: "var(--space-1)", fontSize: "var(--fs-xs)" }}>
          {razon}
        </p>
      )}
    </div>
  );
}

interface AccionesPlanProps {
  elegEspecial: { puede: boolean; razon?: string };
  elegExtra: { puede: boolean; razon?: string };
  elegEnProceso: { puede: boolean; razon?: string };
  loadingAccion: "especial" | "extra" | "enproceso" | null;
  onEspecial: () => void;
  onExtra: () => void;
  onEnProceso: () => void;
}

export function AccionesPlan({
  elegEspecial, elegExtra, elegEnProceso,
  loadingAccion,
  onEspecial, onExtra, onEnProceso,
}: AccionesPlanProps) {
  const [abierto, setAbierto] = useState(false);

  const disponibles = [elegEspecial, elegExtra, elegEnProceso].filter((e) => e.puede).length;

  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      marginBottom: "var(--space-3)",
    }}>
      {/* Botón header */}
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          background: "var(--surface-strong)",
          border: 0,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "var(--fs-sm)", color: "var(--text-strong)" }}>
          Agregar al plan de la semana
          {disponibles > 0 && (
            <span style={{ marginLeft: 6, fontSize: "var(--fs-xs)", color: "var(--primary)", fontWeight: 500 }}>
              · {disponibles} disponible{disponibles !== 1 ? "s" : ""}
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          color="var(--muted)"
          style={{
            transition: "transform 200ms ease",
            transform: abierto ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Body plegable */}
      {abierto && (
        <div style={{
          padding: "var(--space-3) var(--space-4) var(--space-2)",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--surface-alt)",
        }}>
          <AccionRow
            label="Elegir como Especial"
            disabled={!elegEspecial.puede}
            razon={elegEspecial.razon}
            loading={loadingAccion === "especial"}
            onClick={onEspecial}
          />
          <AccionRow
            label="Sumar como Especial extra"
            disabled={!elegExtra.puede}
            razon={elegExtra.razon}
            loading={loadingAccion === "extra"}
            onClick={onExtra}
          />
          <AccionRow
            label="Sumar como En proceso"
            disabled={!elegEnProceso.puede}
            razon={elegEnProceso.razon}
            loading={loadingAccion === "enproceso"}
            onClick={onEnProceso}
          />
        </div>
      )}
    </div>
  );
}
