import { NavLink } from "react-router-dom";

const items = [
  { to: "/",           label: "Inicio",     glyph: "🏠" },
  { to: "/biblioteca", label: "Biblioteca", glyph: "📖" },
  { to: "/compras",    label: "Compras",    glyph: "🧾" },
  { to: "/historial",  label: "Historial",  glyph: "⭐" },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => (isActive ? "nav-btn active" : "nav-btn")}
        >
          <span className="nav-glyph" aria-hidden="true">{item.glyph}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
