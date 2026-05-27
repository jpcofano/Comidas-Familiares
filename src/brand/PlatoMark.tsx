// src/brand/PlatoMark.tsx
//
// Comida Familiar — logomark "Plato con vapor" (variante F).
// - "vapor"  → hero con vapor, para ≥28px.
// - "simple" → chrome sin vapor (4 placemats), para <28px.
// Color toma de currentColor; controlable con la prop `color` o estilo CSS.

import type { CSSProperties } from "react";

interface PlatoMarkProps {
  size?: number;
  variant?: "vapor" | "simple";
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
  "aria-label"?: string;
}

export function PlatoMark({
  size = 24,
  variant = "vapor",
  strokeWidth = 1.6,
  color,
  style,
  className,
  "aria-label": ariaLabel,
}: PlatoMarkProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": ariaLabel ? undefined : (true as const),
    role: ariaLabel ? "img" : undefined,
    "aria-label": ariaLabel,
    style: { display: "inline-block", verticalAlign: "middle", color, ...style },
    className,
  };

  if (variant === "vapor") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" {...common}>
        {/* Steam: 3 S-curves con amplitud y opacidad variables */}
        <path d="M9 7 C 10.5 6, 8.5 4, 9 2.5" strokeWidth={strokeWidth * 0.72} opacity="0.55" />
        <path d="M12 6.5 C 10 5, 14 3.5, 12 1.5" strokeWidth={strokeWidth * 0.94} opacity="0.95" />
        <path d="M15 7 C 13.5 6, 15.5 4, 15 2.5" strokeWidth={strokeWidth * 0.72} opacity="0.65" />
        {/* Plato + comida */}
        <circle cx="12" cy="13" r="5" />
        <circle cx="12" cy="13" r="2.4" fill="currentColor" stroke="none" />
        {/* 3 manteles (arriba abierto para el vapor) */}
        <path d="M9 22h6" />
        <path d="M22 10v6" />
        <path d="M2 10v6" />
      </svg>
    );
  }

  // simple: 4 manteles, sin vapor — para chrome / tamaños pequeños
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...common}>
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <path d="M9 21h6" />
      <path d="M21 9v6" />
      <path d="M3 9v6" />
      <path d="M9 3h6" />
    </svg>
  );
}
