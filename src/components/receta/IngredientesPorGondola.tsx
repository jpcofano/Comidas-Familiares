// src/components/receta/IngredientesPorGondola.tsx
// Vista de ingredientes de receta con toggle "Por rol" / "Por góndola".
// - Por rol (default): agrupa por ing.seccion (sección culinaria del importador).
// - Por góndola: agrupa por seccionGondola del catálogo (lookup async, cacheado).

import { useState, useEffect } from "react";
import { getCatalogo } from "../../data/ingredientes";
import { getSeccionRecetaMeta, groupByGondola } from "../../lib/catalogo";
import { GondolaChip } from "../GondolaChip";
import { pluralizarUnidad } from "../../lib/unidades";
import { sustitutosDeItem } from "../../lib/sustitutos";
import type { Sustituto } from "../../lib/sustitutos";
import type { IngredienteEnReceta, Ingrediente } from "../../types/models";

const VISTA_KEY = "cf-ingredientes-vista";
const SUSTITUTOS_KEY = "cf-mostrar-sustitutos";

function getInitialMostrarSustitutos(): boolean {
  try { return localStorage.getItem(SUSTITUTOS_KEY) !== "false"; } catch {}
  return true;
}

function getInitialVista(): "rol" | "gondola" {
  try {
    if (localStorage.getItem(VISTA_KEY) === "gondola") return "gondola";
  } catch {}
  return "rol";
}

// ─── Chip de sección culinaria ────────────────────────────────────────────────

function SeccionChip({ seccion, size = 20 }: { seccion: string; size?: number }) {
  const meta = getSeccionRecetaMeta(seccion);
  return (
    <span
      aria-label={seccion}
      style={{
        width: size, height: size,
        borderRadius: size <= 18 ? 5 : 7,
        background: meta.color, color: "#fff",
        fontSize: size * 0.55, fontWeight: 700, lineHeight: 1,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {meta.letra}
    </span>
  );
}

// ─── Fila de ingrediente ──────────────────────────────────────────────────────

function IngredienteLi({
  ing, idx, sustitutos, mostrarSustitutos,
}: {
  ing: IngredienteEnReceta;
  idx: number;
  sustitutos: Sustituto[];
  mostrarSustitutos: boolean;
}) {
  const cantidadStr = ing.cantidadLabel ?? (ing.cantidad != null ? String(ing.cantidad) : "");
  const unidadStr = ing.unidad
    ? pluralizarUnidad(ing.unidad, ing.cantidadMax ?? ing.cantidadMin ?? 1)
    : "";
  return (
    <li style={{
      display: "flex", justifyContent: "space-between",
      padding: "8px 0",
      borderTop: idx === 0 ? "none" : "1px solid var(--border-subtle)",
      fontSize: "var(--fs-sm)",
      color: ing.opcional ? "var(--muted)" : "var(--text)",
    }}>
      <span>
        {ing.textoOriginal}
        {ing.opcional && (
          <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginLeft: 4 }}>
            (opcional)
          </span>
        )}
        {mostrarSustitutos && sustitutos.length > 0 && (
          <span style={{ display: "block", fontSize: "var(--fs-xs)", color: "var(--primary)", marginTop: 2 }}>
            ⇄ o {sustitutos.map(s => s.nombre).join(" o ")}
          </span>
        )}
      </span>
      <span style={{
        color: "var(--muted-strong)", flexShrink: 0,
        marginLeft: "var(--space-3)", fontVariantNumeric: "tabular-nums",
      }}>
        {cantidadStr} {unidadStr}
      </span>
    </li>
  );
}

// ─── Subheader de grupo ───────────────────────────────────────────────────────

function GrupoHeader({ chip, label, count }: { chip: React.ReactNode; label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-2)" }}>
      {chip}
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--muted)",
      }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: "var(--muted)", opacity: 0.6 }}>{count}</span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface IngredientesPorGondolaProps {
  ingredientes: IngredienteEnReceta[];
}

export function IngredientesPorGondola({ ingredientes }: IngredientesPorGondolaProps) {
  const [vista, setVista] = useState<"rol" | "gondola">(getInitialVista);
  const [catalogo, setCatalogo] = useState<Map<string, Ingrediente> | null>(null);
  const [mostrarSustitutos, setMostrarSustitutos] = useState(getInitialMostrarSustitutos);

  useEffect(() => {
    getCatalogo().then(setCatalogo).catch(() => {});
  }, []);

  function switchVista(v: "rol" | "gondola") {
    setVista(v);
    try { localStorage.setItem(VISTA_KEY, v); } catch {}
  }

  function toggleSustitutos() {
    const next = !mostrarSustitutos;
    setMostrarSustitutos(next);
    try { localStorage.setItem(SUSTITUTOS_KEY, next ? "true" : "false"); } catch {}
  }

  function getSustitutos(ing: IngredienteEnReceta): Sustituto[] {
    return catalogo ? sustitutosDeItem(ing, catalogo) : [];
  }

  // ── Vista por rol culinario ─────────────────────────────────────────────────
  // Agrupa por ing.seccion en orden de primera aparición.

  function renderPorRol() {
    const map = new Map<string, IngredienteEnReceta[]>();
    for (const ing of ingredientes) {
      const sec = ing.seccion?.trim() || "Principal";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(ing);
    }
    return [...map.entries()].map(([seccion, items], gi) => (
      <div key={seccion} style={{ marginTop: gi === 0 ? 0 : "var(--space-4)" }}>
        <GrupoHeader
          chip={<SeccionChip seccion={seccion} size={20} />}
          label={seccion}
          count={items.length}
        />
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((ing, idx) => (
            <IngredienteLi
              key={idx} ing={ing} idx={idx}
              sustitutos={getSustitutos(ing)}
              mostrarSustitutos={mostrarSustitutos}
            />
          ))}
        </ul>
      </div>
    ));
  }

  // ── Vista por góndola ───────────────────────────────────────────────────────
  // Lookup de seccionGondola desde el catálogo. Fallback a "Por rol" si aún no cargó.

  function renderPorGondola() {
    if (!catalogo) return renderPorRol();

    const withGondola = ingredientes.map((ing) => ({
      ing,
      seccionGondola: catalogo.get(ing.idIngrediente)?.seccionGondola ?? "Otros",
    }));
    const grupos = groupByGondola(withGondola, (item) => item.seccionGondola);

    return grupos.map(({ seccion, items }, gi) => (
      <div key={seccion} style={{ marginTop: gi === 0 ? 0 : "var(--space-4)" }}>
        <GrupoHeader
          chip={<GondolaChip seccion={seccion} size={20} />}
          label={seccion}
          count={items.length}
        />
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map(({ ing }, idx) => (
            <IngredienteLi
              key={idx} ing={ing} idx={idx}
              sustitutos={getSustitutos(ing)}
              mostrarSustitutos={mostrarSustitutos}
            />
          ))}
        </ul>
      </div>
    ));
  }

  return (
    <div>
      {/* Toggles */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", gap: "var(--space-1)" }}>
          {(["rol", "gondola"] as const).map((v) => (
            <button
              key={v}
              onClick={() => switchVista(v)}
              style={{
                padding: "3px 10px", fontSize: "var(--fs-xs)", borderRadius: "var(--radius-full)",
                border: `1px solid ${vista === v ? "var(--primary)" : "var(--border)"}`,
                cursor: "pointer", fontFamily: "inherit",
                background: vista === v ? "var(--primary-soft)" : "transparent",
                color: vista === v ? "var(--primary)" : "var(--muted)",
                fontWeight: vista === v ? "var(--fw-semibold)" : "var(--fw-regular)",
              }}
            >
              {v === "rol" ? "Por rol" : "Por góndola"}
            </button>
          ))}
        </div>
        {catalogo && (
          <button
            onClick={toggleSustitutos}
            style={{
              padding: "3px 10px", fontSize: "var(--fs-xs)", borderRadius: "var(--radius-full)",
              border: `1px solid ${mostrarSustitutos ? "var(--primary)" : "var(--border)"}`,
              cursor: "pointer", fontFamily: "inherit",
              background: mostrarSustitutos ? "var(--primary-soft)" : "transparent",
              color: mostrarSustitutos ? "var(--primary)" : "var(--muted)",
            }}
          >
            Sustitutos
          </button>
        )}
      </div>

      {vista === "rol" ? renderPorRol() : renderPorGondola()}
    </div>
  );
}
