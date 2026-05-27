// src/components/IngredienteChip.tsx — chip tap-eable para lista de compras
// Estados: pendiente (crema) / hecho (verde + line-through).
// whiteSpace: nowrap para que "3 un" nunca se rompa.

import type { ItemCompra } from "../types/models";
import { formatearCantidadUnidad } from "../lib/unidades";

interface IngredienteChipProps {
  item: ItemCompra;
  onToggle: () => void;
}

export function IngredienteChip({ item, onToggle }: IngredienteChipProps) {
  const done = item.yaTengo;
  const cantidadStr = item.cantidadTotal > 0
    ? formatearCantidadUnidad(item.cantidadTotal, item.unidad)
    : item.cantidadLabel;

  return (
    <button
      onClick={onToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px 8px 9px',
        borderRadius: 999,
        background: done ? 'var(--ok-bg)' : 'var(--surface-alt)',
        border: `1px solid ${done ? 'var(--ok-line)' : 'var(--border-subtle)'}`,
        color: done ? 'var(--ok-text)' : 'var(--text)',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        textDecoration: done ? 'line-through' : 'none',
        transition: 'all 160ms ease',
        lineHeight: 1.25,
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
      }}
    >
      {/* Checkbox square */}
      <span style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        flexShrink: 0,
        background: done ? 'var(--ok-text)' : 'transparent',
        border: done ? 'none' : '1.5px solid var(--border)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 10,
        fontWeight: 700,
      }}>
        {done && '✓'}
      </span>

      {/* Nombre */}
      <span>{item.nombrePreferido}</span>

      {/* Cantidad */}
      {cantidadStr && (
        <span style={{
          fontSize: 12.5,
          color: done ? 'var(--ok-text)' : 'var(--muted)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
          marginLeft: 1,
          whiteSpace: 'nowrap',
        }}>
          · {cantidadStr}
        </span>
      )}
    </button>
  );
}
