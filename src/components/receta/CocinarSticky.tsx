// src/components/receta/CocinarSticky.tsx — botón sticky bottom "Empezar a cocinar"

interface CocinarStickyProps {
  onClick: () => void;
}

export function CocinarSticky({ onClick }: CocinarStickyProps) {
  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 480,
      padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      zIndex: 100,
    }}>
      <button
        onClick={onClick}
        className="btn btn-primary"
        style={{
          width: "100%",
          boxShadow: "0 6px 18px rgba(138, 74, 47, 0.28)",
          fontSize: "var(--fs-base)",
          fontWeight: 600,
        }}
      >
        Empezar a cocinar
      </button>
    </div>
  );
}
