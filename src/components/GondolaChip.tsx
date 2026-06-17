// src/components/GondolaChip.tsx — chip cuadrado con letra y color de sección

import { getSeccionMeta } from "../lib/catalogo";

interface GondolaChipProps {
  seccion: string;
  size?: 16 | 18 | 20 | 22 | 26;
}

export function GondolaChip({ seccion, size = 22 }: GondolaChipProps) {
  const meta = getSeccionMeta(seccion);
  return (
    <span
      aria-label={seccion}
      style={{
        width: size,
        height: size,
        borderRadius: size <= 18 ? 5 : 7,
        background: meta.color,
        color: '#fff',
        fontSize: size * 0.55,
        fontWeight: 700,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {meta.letra}
    </span>
  );
}
