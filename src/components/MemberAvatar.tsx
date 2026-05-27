// src/components/MemberAvatar.tsx — círculo de iniciales por miembro + stack

interface Palette { bg: string; fg: string; label: string }

const PALETTE: Record<string, Palette> = {
  juanpablo: { bg: "var(--member-juanpablo)", fg: "#fff", label: "JP" },
  juanpablo_: { bg: "var(--member-juanpablo)", fg: "#fff", label: "JP" }, // normalized alias
  maria:     { bg: "var(--member-maria)",     fg: "#fff", label: "M"  },
  sofia:     { bg: "var(--member-sofia)",     fg: "#fff", label: "S"  },
  federico:  { bg: "var(--member-federico)",  fg: "#fff", label: "F"  },
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "");
}

interface MemberAvatarProps {
  name: string;
  size?: number;
  withName?: boolean;
}

export function MemberAvatar({ name, size = 22, withName = false }: MemberAvatarProps) {
  const key = normalize(name);
  const m: Palette = PALETTE[key] ?? {
    bg: "var(--muted)",
    fg: "#fff",
    label: (name || "?").charAt(0).toUpperCase(),
  };

  const circle = (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      background: m.bg, color: m.fg,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size <= 22 ? 10 : 11,
      fontWeight: "var(--fw-semibold)" as unknown as number,
      flexShrink: 0, letterSpacing: 0,
    }}>
      {m.label}
    </span>
  );

  if (!withName) return circle;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {circle}
      <span style={{ fontSize: 13, color: "var(--text)" }}>{name}</span>
    </span>
  );
}

interface AvatarStackProps {
  names: string[];
  size?: number;
  max?: number;
  onClick?: () => void;
}

export function AvatarStack({ names, size = 22, max = 4, onClick }: AvatarStackProps) {
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center",
        cursor: onClick ? "pointer" : "default",
        borderRadius: "var(--radius-sm)",
        outline: "none",
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? "Editar quiénes cocinan este plato" : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      onFocus={onClick ? (e) => { e.currentTarget.style.boxShadow = "var(--shadow-focus)"; } : undefined}
      onBlur={onClick ? (e) => { e.currentTarget.style.boxShadow = "none"; } : undefined}
    >
      {shown.map((n, i) => (
        <span key={n + i} style={{
          marginLeft: i === 0 ? 0 : -6,
          border: "2px solid var(--surface-strong)",
          borderRadius: "50%",
          display: "inline-flex",
        }}>
          <MemberAvatar name={n} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span style={{
          marginLeft: -6, width: size, height: size, borderRadius: "50%",
          background: "var(--surface-alt)", color: "var(--muted-strong)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 600,
          border: "2px solid var(--surface-strong)",
        }}>
          +{overflow}
        </span>
      )}
    </span>
  );
}
