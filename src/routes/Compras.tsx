// src/routes/Compras.tsx — Lista de compras v2 (Variant C: "Recetas envueltas")
//
// Vista principal: por receta (cada plan = card con day badge + título + cocineros).
// Vista alterna: lista completa agrupada por góndola (toggle pill arriba).
// Sin filtro todo/pendientes/yaTengo — completados se ven inline (atenuados).

import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { subscribeToPlanesActivos } from "../data/planes";
import { getListaById, subscribeToItemsLista, toggleItemYaTengo } from "../data/compras";
import { getSemanaActual } from "../lib/fechas";
import { groupByGondola } from "../lib/gondolas";
import { ProgressRing } from "../components/ProgressRing";
import { RecetaCardV2 } from "../components/RecetaCardV2";
import { GondolaCardV2 } from "../components/GondolaCardV2";
import type { ListaCompras, ItemCompra, Plan, MiembroId } from "../types/models";

type ModoVista = "receta" | "gondola";

// ─── Ruta principal ───────────────────────────────────────────────────────────

export function ComprasRoute() {
  const { state } = useAuth();
  const memberId = state.status === "authenticated" ? state.user.memberId as MiembroId : null;
  const isJP = memberId === "juanpablo";

  const semanaInicio = useMemo(() => getSemanaActual(), []);

  const [planes, setPlanes] = useState<Plan[]>([]);
  const [lista, setLista] = useState<ListaCompras | null>(null);
  const [items, setItems] = useState<ItemCompra[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [modoVista, setModoVista] = useState<ModoVista>("receta");
  const unsubItems = useRef<(() => void) | null>(null);

  // Planes en tiempo real
  useEffect(() => {
    return subscribeToPlanesActivos(semanaInicio, (p) => {
      setPlanes(p);
      setLoadingPlanes(false);
    });
  }, [semanaInicio]);

  // Lista: derivada del listaComprasId de los planes
  const listaId = useMemo(
    () => planes.find((p) => p.listaComprasId != null)?.listaComprasId ?? null,
    [planes]
  );

  useEffect(() => {
    if (loadingPlanes) return;
    if (!listaId) { setLista(null); return; }
    getListaById(listaId).then(setLista);
  }, [listaId, loadingPlanes]);

  // Items en tiempo real cuando cambia la lista
  useEffect(() => {
    if (unsubItems.current) { unsubItems.current(); unsubItems.current = null; }
    if (!lista) { setItems([]); return; }
    unsubItems.current = subscribeToItemsLista(lista.idLista, setItems);
    return () => { if (unsubItems.current) unsubItems.current(); };
  }, [lista?.idLista]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleItem(itemId: string) {
    if (!lista) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    await toggleItemYaTengo(lista.idLista, itemId, !item.yaTengo);
  }

  // Para miembros no-JP: solo items de sus planes asignados
  const itemsVisibles = useMemo(() => {
    if (isJP || !memberId) return items;
    const misPlanIds = new Set(
      planes.filter((p) => p.asignaciones.includes(memberId)).map((p) => p.idPlan)
    );
    return items.filter((i) => i.aportes.some((a) => misPlanIds.has(a.idPlan)));
  }, [items, planes, memberId, isJP]);

  // Vista por receta: planes que tienen al menos un item visible
  const porPlan = useMemo(() => {
    return planes
      .filter((p) => itemsVisibles.some((i) => i.aportes.some((a) => a.idPlan === p.idPlan)))
      .map((p) => ({
        plan: p,
        items: itemsVisibles.filter((i) => i.aportes.some((a) => a.idPlan === p.idPlan)),
      }));
  }, [planes, itemsVisibles]);

  // Vista por góndola: todos los items agrupados
  const porGondola = useMemo(
    () => groupByGondola(itemsVisibles),
    [itemsVisibles]
  );

  const yaTengoCount = itemsVisibles.filter((i) => i.yaTengo).length;
  const hasPlanes = planes.length > 0;
  const missingItems =
    (lista as (ListaCompras & { missingItems?: string[] }) | null)?.missingItems ?? [];

  if (loadingPlanes) {
    return <div className="card"><p className="meta">Cargando…</p></div>;
  }

  return (
    <div style={{ paddingBottom: "var(--space-10)" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-strong)",
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
            }}>
              Lista de compras
            </h1>
            {lista ? (
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {planes.length} {planes.length === 1 ? "comida" : "comidas"} esta semana
              </p>
            ) : hasPlanes ? (
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                Generando lista… aparece automáticamente al crear planes.
              </p>
            ) : (
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                No hay comidas elegidas esta semana.{" "}
                {isJP && (
                  <Link to="/biblioteca" style={{ color: "var(--primary)" }}>
                    Ver recetas →
                  </Link>
                )}
              </p>
            )}
          </div>

          {lista && itemsVisibles.length > 0 && (
            <ProgressRing done={yaTengoCount} total={itemsVisibles.length} />
          )}
        </div>

        {/* Toggle vista */}
        {lista && itemsVisibles.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <PillToggle active={modoVista === "receta"} onClick={() => setModoVista("receta")}>
              Por receta
            </PillToggle>
            <PillToggle active={modoVista === "gondola"} onClick={() => setModoVista("gondola")}>
              Lista completa
            </PillToggle>
          </div>
        )}
      </div>

      {/* ── Aviso ingredientes faltantes ────────────────────────────────────── */}
      {missingItems.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--warn-text)", margin: 0 }}>
            Sin ingredientes cargados: {missingItems.join(", ")}
          </p>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {lista && itemsVisibles.length > 0 && (
        modoVista === "receta"
          ? porPlan.map(({ plan, items: planItems }) => (
              <RecetaCardV2
                key={plan.idPlan}
                plan={plan}
                items={planItems}
                onToggle={handleToggleItem}
              />
            ))
          : porGondola.map((g) => (
              <GondolaCardV2
                key={g.seccion}
                seccion={g.seccion}
                items={g.items}
                onToggle={handleToggleItem}
              />
            ))
      )}

      {/* ── Empty states ────────────────────────────────────────────────────── */}
      {lista && itemsVisibles.length === 0 && (
        <div className="card">
          <p className="meta" style={{ textAlign: "center", padding: "var(--space-4) 0" }}>
            Lista vacía. Los ingredientes aparecen al crear planes.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── PillToggle (local) ────────────────────────────────────────────────────────

function PillToggle({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        fontSize: 13,
        fontWeight: 600,
        borderRadius: 999,
        cursor: "pointer",
        background: active ? "var(--primary)" : "transparent",
        color: active ? "#fff" : "var(--muted)",
        border: active ? "none" : "1px solid var(--border)",
        transition: "all 160ms ease",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}
