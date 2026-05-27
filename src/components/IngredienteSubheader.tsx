// src/components/IngredienteSubheader.tsx — etiqueta de sección dentro de cards
// Chip 18px + nombre en uppercase 11px muted.

import { GondolaChip } from "./GondolaChip";

interface IngredienteSubheaderProps {
  seccion: string;
}

export function IngredienteSubheader({ seccion }: IngredienteSubheaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '6px 0 8px',
    }}>
      <GondolaChip seccion={seccion} size={18} />
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
      }}>
        {seccion}
      </span>
    </div>
  );
}
