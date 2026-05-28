// src/components/receta/AccionesPlan.tsx — acciones de plan para JP en detalle de receta
//
// Tres botones que arman el plan de la semana desde la receta: Especial / Extra / En proceso.
// Reglas:
//   - Si una acción no es elegible (puede: false), el botón se oculta.
//   - Si es elegible pero hay conflicto resolvable (ej. ya hay Especial),
//     el botón se muestra; el handler en la página decide si pedir confirmación.

interface Elegibilidad {
  puede: boolean;
  razon?: string;
}

interface AccionesPlanProps {
  elegEspecial: Elegibilidad;
  elegExtra: Elegibilidad;
  elegEnProceso: Elegibilidad;
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
  // Si ninguna acción es elegible, no mostrar la sección entera.
  const algunaDisponible = elegEspecial.puede || elegExtra.puede || elegEnProceso.puede;
  if (!algunaDisponible) return null;

  return (
    <section style={{ marginBottom: "var(--space-3)" }}>
      <p style={{
        fontSize: "var(--fs-xs)",
        fontWeight: 600,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: "var(--space-2)",
      }}>
        Agregar al plan de la semana
      </p>
      {elegEspecial.puede && (
        <AccionBtn
          label="Elegir como Especial"
          loading={loadingAccion === "especial"}
          disabled={loadingAccion !== null}
          onClick={onEspecial}
        />
      )}
      {elegExtra.puede && (
        <AccionBtn
          label="Sumar como Especial extra"
          loading={loadingAccion === "extra"}
          disabled={loadingAccion !== null}
          onClick={onExtra}
        />
      )}
      {elegEnProceso.puede && (
        <AccionBtn
          label="Sumar como En proceso"
          loading={loadingAccion === "enproceso"}
          disabled={loadingAccion !== null}
          onClick={onEnProceso}
        />
      )}
    </section>
  );
}

function AccionBtn({
  label, loading, disabled, onClick,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "12px 14px",
        marginBottom: "var(--space-2)",
        borderRadius: "var(--radius-md)",
        background: "var(--primary-soft)",
        border: "1px solid transparent",
        cursor: disabled ? "default" : "pointer",
        opacity: loading ? 0.6 : 1,
        textAlign: "left",
        fontFamily: "inherit",
        fontSize: "var(--fs-sm)",
        fontWeight: "var(--fw-semibold)" as unknown as number,
        color: "var(--primary)",
      }}
    >
      {loading ? "…" : label}
    </button>
  );
}
