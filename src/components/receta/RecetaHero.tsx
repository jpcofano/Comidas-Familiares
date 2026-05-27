// src/components/receta/RecetaHero.tsx — hero image o placeholder gradient

interface RecetaHeroProps {
  imagenUrl?: string;
  nombre: string;
}

export function RecetaHero({ imagenUrl, nombre }: RecetaHeroProps) {
  if (imagenUrl) {
    return (
      <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: "var(--space-4)" }}>
        <img
          src={imagenUrl}
          alt={nombre}
          style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  return (
    <div style={{
      height: 180,
      borderRadius: "var(--radius-lg)",
      background: "linear-gradient(135deg, oklch(0.62 0.08 60), oklch(0.55 0.10 25))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "var(--space-4)",
    }}>
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.6)",
      }}>
        Foto de la receta
      </span>
    </div>
  );
}
