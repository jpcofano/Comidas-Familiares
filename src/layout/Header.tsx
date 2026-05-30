import { useState, useEffect, useRef } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { PlatoMark } from "../brand/PlatoMark";
import { useAuth } from "../auth/useAuth";
import { getInitialTheme, applyTheme, type Theme } from "../lib/theme";
import "./Header.css";

export function Header() {
  const { state, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const headerRef = useRef<HTMLElement>(null);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

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
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "none", background: "transparent",
            color: "var(--muted-strong)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
          }}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
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
