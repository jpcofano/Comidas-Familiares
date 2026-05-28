import { NavLink } from "react-router-dom";
import { Home, BookOpen, ShoppingBag, History } from "lucide-react";
import { useAuth } from "../auth/useAuth";

const jpItems = [
  { to: "/",           label: "Inicio",     Icon: Home },
  { to: "/biblioteca", label: "Biblioteca", Icon: BookOpen },
  { to: "/compras",    label: "Compras",    Icon: ShoppingBag },
  { to: "/historial",  label: "Historial",  Icon: History },
];

const memberItems = [
  { to: "/",           label: "Mi semana",  Icon: Home },
  { to: "/compras",    label: "Compras",    Icon: ShoppingBag },
  { to: "/historial",  label: "Historial",  Icon: History },
];

export function BottomNav() {
  const { state } = useAuth();
  const isJP = state.status === "authenticated" && state.user.memberId === "juanpablo";
  const items = isJP ? jpItems : memberItems;

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
