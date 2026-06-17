// Tarjeta de macros estimadas por porción para DetalleReceta.
// Llama macrosDeReceta() y renderiza: hidratos netos (estrella) + secundarios + pie de cobertura.

import { macrosDeReceta } from "../../lib/macros";
import type { Receta, Ingrediente } from "../../types/models";

interface MacrosCardProps {
  receta: Receta;
  catalogoById: Map<string, Ingrediente>;
}

export function MacrosCard({ receta, catalogoById }: MacrosCardProps) {
  const m = macrosDeReceta(receta, catalogoById);

  const totalIngredientes = receta.ingredientes.filter(i => !i.opcional).length;
  const conDatos = totalIngredientes - m.ingredientesSinDatos.length;
  const coberturaLabel = `Estimado sobre ${conDatos} de ${totalIngredientes} ingrediente${totalIngredientes !== 1 ? "s" : ""}`;
  const parcial = m.cobertura > 0 && m.cobertura < 1;

  // Cobertura 0 → estado vacío discreto
  if (m.cobertura === 0) {
    return (
      <div style={{
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-md)",
        border: "1.5px dashed var(--border)",
        marginBottom: "var(--space-3)",
        textAlign: "center",
      }}>
        <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
          Sin datos de macros para esta receta todavía.
        </p>
      </div>
    );
  }

  const pp = m.porPorcion;

  const secundarios = [
    { label: "kcal",             value: pp.kcal.toFixed(0) },
    { label: "Proteínas",        value: `${pp.proteinas.toFixed(1)} g` },
    { label: "Grasas",           value: `${pp.grasas.toFixed(1)} g` },
    { label: "Fibra",            value: `${pp.fibra.toFixed(1)} g` },
    { label: "Hidratos totales", value: `${pp.carbohidratos.toFixed(1)} g` },
  ];

  return (
    <div className="card" style={{ marginBottom: "var(--space-3)" }}>
      {/* Header */}
      <p style={{
        margin: "0 0 var(--space-3)",
        fontSize: "var(--fs-xs)", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: ".06em",
        color: "var(--muted)",
      }}>
        Macros por porción
      </p>

      {/* Número estrella — hidratos netos */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <span style={{
          fontSize: 32, fontWeight: 700,
          color: "var(--primary)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {m.hidratosNetosPorPorcion.toFixed(1)} g
        </span>
        <p style={{ margin: "2px 0 0", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
          Hidratos netos · carbohidratos − fibra · lo que cuenta para keto
        </p>
      </div>

      {/* Secundarios en grilla */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "var(--space-2)",
        marginBottom: "var(--space-3)",
      }}>
        {secundarios.map(s => (
          <div key={s.label} style={{
            background: "var(--surface-alt)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2)",
            textAlign: "center",
          }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>
              {s.value}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "var(--muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pie de cobertura */}
      <p style={{
        margin: 0,
        fontSize: "var(--fs-xs)",
        color: parcial ? "var(--warn-text)" : "var(--muted)",
      }}>
        {parcial ? `Parcial · ${coberturaLabel}` : coberturaLabel}
      </p>
    </div>
  );
}
