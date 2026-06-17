// PlatoMark.jsx — Comida Familiar logomark "Plato con vapor" (variante F).
// Ported 1:1 from the live app (src/brand/PlatoMark.tsx).
//   variant="vapor"  → hero con vapor, para ≥28px
//   variant="simple" → chrome sin vapor (4 manteles), para <28px
// Color via currentColor (heredá con `color` en el contenedor).

function PlatoMark({ size = 24, variant = 'vapor', strokeWidth = 1.6, color, style = {} }) {
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
    style: { display: 'inline-block', verticalAlign: 'middle', color, ...style },
  };

  if (variant === 'vapor') {
    return (
      <svg {...common}>
        <path d="M9 7 C 10.5 6, 8.5 4, 9 2.5" strokeWidth={strokeWidth * 0.72} opacity="0.55"/>
        <path d="M12 6.5 C 10 5, 14 3.5, 12 1.5" strokeWidth={strokeWidth * 0.94} opacity="0.95"/>
        <path d="M15 7 C 13.5 6, 15.5 4, 15 2.5" strokeWidth={strokeWidth * 0.72} opacity="0.65"/>
        <circle cx="12" cy="13" r="5"/>
        <circle cx="12" cy="13" r="2.4" fill="currentColor" stroke="none"/>
        <path d="M9 22h6"/>
        <path d="M22 10v6"/>
        <path d="M2 10v6"/>
      </svg>
    );
  }

  // simple: 4 manteles, sin vapor
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="5"/>
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/>
      <path d="M9 21h6"/>
      <path d="M21 9v6"/>
      <path d="M3 9v6"/>
      <path d="M9 3h6"/>
    </svg>
  );
}

window.PlatoMark = PlatoMark;
