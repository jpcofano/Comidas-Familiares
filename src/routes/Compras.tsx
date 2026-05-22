import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { subscribeToPlanesActivos } from "../data/planes";
import {
  getListaActiva,
  subscribeToItemsLista,
  toggleYaTengo,
  sincronizarYAvanzarPlanes,
} from "../data/compras";
import { getRecetasByIds } from "../data/recetas";
import { getSemanaActual } from "../lib/fechas";
import type { ListaCompras, ItemCompra, Plan } from "../types/models";

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: "var(--space-5)", left: "50%", transform: "translateX(-50%)",
      background: "var(--surface-strong)", color: "var(--text)",
      padding: "10px 20px", borderRadius: "var(--radius-md)",
      boxShadow: "0 4px 12px rgba(0,0,0,.18)", fontSize: "var(--fs-sm)",
      zIndex: 9999, maxWidth: "90vw", textAlign: "center",
    }}>
      {text}
    </div>
  );
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  expanded,
  onToggle,
  onToggleExpand,
}: {
  item: ItemCompra;
  expanded: boolean;
  onToggle: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        padding: "8px 0", borderBottom: "1px solid var(--line)",
        opacity: item.yaTengo ? 0.5 : 1,
      }}>
        {/* Checkbox manual */}
        <button
          onClick={onToggle}
          aria-label={item.yaTengo ? "Quitar ya tengo" : "Marcar ya tengo"}
          style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: "var(--radius-sm)",
            border: `2px solid ${item.yaTengo ? "var(--ok-text)" : "var(--border)"}`,
            background: item.yaTengo ? "var(--ok-bg)" : "transparent",
            cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {item.yaTengo && (
            <span style={{ fontSize: 12, color: "var(--ok-text)", lineHeight: 1 }}>✓</span>
          )}
        </button>

        {/* Nombre + cantidad */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: "var(--fs-sm)", color: "var(--text)",
            textDecoration: item.yaTengo ? "line-through" : "none",
          }}>
            {item.ingredienteLabel}
          </span>
          {item.cantidadLabel && (
            <span className="meta" style={{ marginLeft: "var(--space-2)" }}>
              {item.cantidadLabel}
            </span>
          )}
        </div>

        {/* Expandir si hay más de 1 aporte */}
        {item.aportes.length > 1 && (
          <button
            onClick={onToggleExpand}
            aria-label="Ver aportes"
            style={{
              flexShrink: 0, background: "none", border: "none",
              cursor: "pointer", padding: 2, color: "var(--muted)",
              display: "flex", alignItems: "center",
            }}
          >
            {expanded
              ? <ChevronDown size={15} />
              : <ChevronRight size={15} />}
          </button>
        )}
      </div>

      {/* Aportes expandidos */}
      {expanded && item.aportes.length > 1 && (
        <div style={{
          paddingLeft: "calc(22px + var(--space-3))",
          paddingTop: "var(--space-1)",
          paddingBottom: "var(--space-2)",
        }}>
          {item.aportes.map((a, i) => (
            <p key={i} className="meta" style={{ margin: "2px 0" }}>
              · {a.cantidadLabel} {item.unidad} — {a.nombreReceta}
            </p>
          ))}
          {item.notas && (
            <p className="meta" style={{ margin: "4px 0 0", fontStyle: "italic" }}>
              {item.notas}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ruta principal ───────────────────────────────────────────────────────────

export function ComprasRoute() {
  const { state } = useAuth();
  const isJP = state.status === "authenticated" && state.user.memberId === "juanpablo";

  const semanaInicio = useMemo(() => getSemanaActual(), []);

  const [planes, setPlanes] = useState<Plan[]>([]);
  const [lista, setLista] = useState<ListaCompras | null>(null);
  const [items, setItems] = useState<ItemCompra[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [loadingLista, setLoadingLista] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const unsubItems = useRef<(() => void) | null>(null);

  // Planes en tiempo real
  useEffect(() => {
    return subscribeToPlanesActivos(semanaInicio, (p) => {
      setPlanes(p);
      setLoadingPlanes(false);
    });
  }, [semanaInicio]);

  // Lista de la semana (carga inicial)
  useEffect(() => {
    if (loadingPlanes) return;
    setLoadingLista(true);
    getListaActiva(semanaInicio).then((l) => {
      setLista(l);
      setLoadingLista(false);
    });
  }, [loadingPlanes, semanaInicio]);

  // Items en tiempo real cuando cambia la lista
  useEffect(() => {
    if (unsubItems.current) { unsubItems.current(); unsubItems.current = null; }
    if (!lista) { setItems([]); return; }
    unsubItems.current = subscribeToItemsLista(lista.idLista, setItems);
    return () => { if (unsubItems.current) unsubItems.current(); };
  }, [lista?.idLista]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSincronizar = useCallback(async () => {
    if (!planes.length) return;
    setSyncing(true);
    const ids = [...new Set(
      planes.filter((p) => p.tipoSeleccion === "receta").map((p) => p.idSeleccion)
    )];
    const recetasList = await getRecetasByIds(ids);
    const recetasMap = new Map(recetasList.map((r) => [r.idReceta, r]));
    const result = await sincronizarYAvanzarPlanes(semanaInicio, planes, recetasMap);
    if (result.ok) {
      const nuevaLista = await getListaActiva(semanaInicio);
      setLista(nuevaLista);
      setToast("Lista actualizada.");
    } else {
      setToast("Error: " + result.error.message);
    }
    setSyncing(false);
  }, [planes, semanaInicio]);

  async function handleToggle(item: ItemCompra) {
    if (!lista) return;
    await toggleYaTengo(lista.idLista, item.id, !item.yaTengo);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Agrupar items por categoría
  const porCategoria = useMemo(() => {
    const map = new Map<string, ItemCompra[]>();
    for (const item of items) {
      const cat = item.categoria || "Sin categoría";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    for (const [, ings] of map) {
      ings.sort((a, b) => a.ingredienteLabel.localeCompare(b.ingredienteLabel, "es"));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [items]);

  const pendientes = items.filter((i) => !i.yaTengo).length;
  const yaTengoCount = items.filter((i) => i.yaTengo).length;
  const hasPlanes = planes.length > 0;

  if (loadingPlanes || loadingLista) {
    return (
      <div className="card">
        <p className="meta">Cargando…</p>
      </div>
    );
  }

  return (
    <>
      {/* Cabecera */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: 0 }}>
            Compras
          </h1>
          {hasPlanes && isJP && (
            <button
              className="btn btn-secondary"
              onClick={handleSincronizar}
              disabled={syncing}
              style={{ fontSize: "var(--fs-sm)" }}
            >
              {syncing ? "Sincronizando…" : lista ? "Actualizar" : "Sincronizar"}
            </button>
          )}
        </div>

        {/* Resumen */}
        {lista ? (
          <p className="meta" style={{ marginTop: "var(--space-2)" }}>
            <strong>{pendientes}</strong> pendientes
            {" · "}
            <strong>{yaTengoCount}</strong> ya tengo
            {" · "}
            <strong>{items.length}</strong> total
          </p>
        ) : hasPlanes ? (
          <p className="meta" style={{ marginTop: "var(--space-2)" }}>
            {isJP
              ? 'Sincronizá para generar la lista de ingredientes.'
              : 'La lista de compras todavía no fue generada.'}
          </p>
        ) : (
          <p className="meta" style={{ marginTop: "var(--space-2)" }}>
            No hay comidas elegidas esta semana.{" "}
            {isJP && (
              <Link to="/biblioteca" style={{ color: "var(--primary)" }}>
                Ver recetas →
              </Link>
            )}
          </p>
        )}
      </div>

      {/* Items por categoría */}
      {lista && porCategoria.length > 0 && porCategoria.map(([cat, catItems]) => (
        <div key={cat} className="card" style={{ marginBottom: "var(--space-2)" }}>
          <p style={{
            fontSize: "var(--fs-xs)", fontWeight: "var(--fw-medium)",
            textTransform: "uppercase", letterSpacing: ".05em",
            color: "var(--muted)", marginBottom: "var(--space-2)",
          }}>
            {cat}
          </p>
          {catItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              expanded={expanded.has(item.id)}
              onToggle={() => handleToggle(item)}
              onToggleExpand={() => toggleExpand(item.id)}
            />
          ))}
        </div>
      ))}

      {lista && items.length === 0 && (
        <div className="card">
          <p className="meta" style={{ textAlign: "center", padding: "var(--space-4) 0" }}>
            Lista vacía. Actualizá para regenerarla.
          </p>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </>
  );
}
