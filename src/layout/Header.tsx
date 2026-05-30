import { useState, useEffect, useRef } from "react";
import { LogOut } from "lucide-react";
import { PlatoMark } from "../brand/PlatoMark";
import { useAuth } from "../auth/useAuth";
import "./Header.css";

export function Header() {
  const { state, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Click outside cierra el menú.
  useEffect(() => {
    if (!menuOpen) return;

    function handleClick(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  if (state.status !== "authenticated") return null;

  const { nombre } = state.user;
  const inicial = nombre.charAt(0).toUpperCase();

  return (
    <header className="app-header" ref={headerRef}>
      <div className="header-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span aria-hidden style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "var(--primary-soft)", color: "var(--primary)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <PlatoMark size={23} variant="simple" strokeWidth={1.6} />
          </span>
          <h1 className="header-title">Comida Familiar</h1>
        </div>
        <button
          className="avatar-button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menú de usuario"
          aria-expanded={menuOpen}
        >
          <span className="avatar" aria-hidden="true">{inicial}</span>
          <span className="username">{nombre}</span>
        </button>
      </div>
      {menuOpen && (
        <div className="user-menu" role="menu">
          <button
            type="button"
            className="user-menu-item"
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
          >
            <LogOut size={16} aria-hidden />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </header>
  );
}
