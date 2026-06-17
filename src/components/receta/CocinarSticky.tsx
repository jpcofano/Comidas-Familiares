// src/components/receta/CocinarSticky.tsx — botón sticky bottom "Empezar a cocinar"

interface CocinarStickyProps {
  onClick: () => void;
}

export function CocinarSticky({ onClick }: CocinarStickyProps) {
  return (
    <div style={{
      position: "sticky",
      bottom: 0,
      marginTop: "var(--space-7, 28px)",
      padding: "12px 0 calc(20px + env(safe-area-inset-bottom, 0px))",
      background: "linear-gradient(180deg, rgba(253,250,246,0) 0%, var(--bg) 35%)",
      zIndex: 10,
    }}>
      <button
        onClick={onClick}
        className="btn btn-primary"
        style={{
          width: "100%",
          boxShadow: "0 6px 18px rgba(138, 74, 47, 0.28)",
          fontSize: "var(--fs-base)",
          fontWeight: 600,
          padding: "15px 16px",
          borderRadius: "var(--radius-lg)",
        }}
      >
        Empezar a cocinar
      </button>
    </div>
  );
}
