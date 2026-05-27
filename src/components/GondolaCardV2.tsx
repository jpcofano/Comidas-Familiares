// src/components/GondolaCardV2.tsx — card de sección de góndola (vista alterna)
// GondolaChip 26px + nombre + contador "X faltan" + chips de ingredientes.

import { GondolaChip } from "./GondolaChip";
import { IngredienteChip } from "./IngredienteChip";
import type { ItemCompra } from "../types/models";

interface GondolaCardV2Props {
  seccion: string;
  items: ItemCompra[];
  onToggle: (itemId: string) => void;
}

export function GondolaCardV2({ seccion, items, onToggle }: GondolaCardV2Props) {
  const pendientes = items.filter((i) => !i.yaTengo).length;

  return (
    <div style={{
      background: "var(--surface-strong)",
      borderRadius: 18,
      marginBottom: 12,
      padding: "12px 14px 14px 16px",
      border: "1px solid var(--border-subtle)",
    }}>
      {/* Section header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
      }}>
        <GondolaChip seccion={seccion} size={26} />
        <span style={{
          fontSize: 15,
          fontWeight: 700,
          color: "var(--text-strong)",
          flex: 1,
        }}>
          {seccion}
        </span>
        <span style={{
          fontSize: 11,
          color: "var(--muted)",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
        }}>
          {pendientes > 0 ? `${pendientes} faltan` : "✓ todo listo"}
        </span>
      </div>

      {/* Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((item) => (
          <IngredienteChip
            key={item.id}
            item={item}
            onToggle={() => onToggle(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
