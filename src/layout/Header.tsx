import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import "./Header.css";

export function Header() {
  const { state, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Close menu when clicking outside the header
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
        <h1 className="header-title">Comida Familiar</h1>
        <button
          className="avatar-button"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menú de usuario"
        >
          <span className="avatar">{inicial}</span>
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
            Cerrar sesión
          </button>
        </div>
      )}
    </header>
  );
}
