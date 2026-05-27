// src/components/GondolaChip.tsx — chip cuadrado con letra y color de sección

import { SECCIONES, type Seccion } from "../lib/gondolas";

interface GondolaChipProps {
  seccion: Seccion;
  size?: 18 | 22 | 26;
}

export function GondolaChip({ seccion, size = 22 }: GondolaChipProps) {
  const meta = SECCIONES[seccion];
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
