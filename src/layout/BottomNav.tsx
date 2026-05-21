import { NavLink } from "react-router-dom";
import { Home, BookOpen, ShoppingBag, History } from "lucide-react";

const items = [
  { to: "/",           label: "Inicio",     Icon: Home },
  { to: "/biblioteca", label: "Biblioteca", Icon: BookOpen },
  { to: "/compras",    label: "Compras",    Icon: ShoppingBag },
  { to: "/historial",  label: "Historial",  Icon: History },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => (isActive ? "nav-btn active" : "nav-btn")}
        >
          <Icon size={20} strokeWidth={2} aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
