// src/routes/Compras.tsx — Lista de compras v2 (Variant C: "Recetas envueltas")
//
// Vista principal: por receta (cada plan = card con day badge + título + cocineros).
// Vista alterna: lista completa agrupada por góndola (toggle pill arriba).
// Sin filtro todo/pendientes/yaTengo — completados se ven inline (atenuados).

import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { subscribeToPlanesActivos } from "../data/planes";
import { subscribeToLista, subscribeToItemsLista, toggleItemYaTengo, asignarEncargadoCompras } from "../data/compras";
import { getCatalogo } from "../data/ingredientes";
import { getSemanaActual } from "../lib/fechas";
import { groupByGondola } from "../lib/catalogo";
import { sustitutosDeItemCompra } from "../lib/sustitutos";
import { ProgressRing } from "../components/ProgressRing";
import { RecetaCardV2 } from "../components/RecetaCardV2";
import { GondolaCardV2 } from "../components/GondolaCardV2";
import type { ListaCompras, ItemCompra, Plan, MiembroId, Ingrediente } from "../types/models";
import { MIEMBRO_IDS } from "../types/models";
import { MemberAvatar } from "../components/MemberAvatar";
import { SkeletonHeader } from "../components/skeletons/SkeletonHeader";
import { SkeletonList } from "../components/skeletons/SkeletonList";

const NOMBRE_MIEMBRO: Record<MiembroId, string> = {
  juanpablo: "Juan Pablo",
  maria:     "María",
  sofia:     "Sofía",
  federico:  "Federico",
};

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
  const [catalogo, setCatalogo] = useState<Map<string, Ingrediente> | null>(null);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [modoVista, setModoVista] = useState<ModoVista>("receta");
  const unsubItems = useRef<(() => void) | null>(null);
  const unsubLista = useRef<(() => void) | null>(null);

  // Encargado: optimista + error
  const [encargadoPend, setEncargadoPend] = useState<MiembroId | null | undefined>(undefined);
  const [encargadoError, setEncargadoError] = useState<string | null>(null);
  const encargadoActual: MiembroId | null =
    encargadoPend !== undefined ? encargadoPend : (lista?.encargadoCompras ?? null);

  // Catálogo (cacheado — carga una vez)
  useEffect(() => { getCatalogo().then(setCatalogo).catch(() => {}); }, []);

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
    if (unsubLista.current) { unsubLista.current(); unsubLista.current = null; }
    if (loadingPlanes) return;
    if (!listaId) { setLista(null); return; }
    unsubLista.current = subscribeToLista(listaId, setLista);
    return () => { if (unsubLista.current) { unsubLista.current(); unsubLista.current = null; } };
  }, [listaId, loadingPlanes]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleAsignarEncargado(nuevoId: MiembroId | null) {
    if (!lista) return;
    setEncargadoError(null);
    setEncargadoPend(nuevoId);
    const r = await asignarEncargadoCompras(lista.idLista, nuevoId);
    if (!r.ok) {
      setEncargadoPend(undefined);
      setEncargadoError("No se pudo asignar el encargado.");
    } else {
      setEncargadoPend(undefined);
    }
  }

  const esEncargado = !!memberId && lista?.encargadoCompras === memberId;
  const verCompleta = isJP || esEncargado;

  // JP o encargado ven la lista completa; el resto solo lo suyo
  const itemsVisibles = useMemo(() => {
    if (verCompleta || !memberId) return items;
    const misPlanIds = new Set(
      planes.filter((p) => p.asignaciones.includes(memberId)).map((p) => p.idPlan)
    );
    return items.filter((i) => i.aportes.some((a) => misPlanIds.has(a.idPlan)));
  }, [items, planes, memberId, verCompleta]);

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
    () => groupByGondola(itemsVisibles, (it) => it.seccionGondola),
    [itemsVisibles]
  );

  const sustitutosMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!catalogo) return map;
    for (const item of itemsVisibles) {
      const nombres = sustitutosDeItemCompra(item, catalogo);
      if (nombres.length > 0) map.set(item.id, nombres);
    }
    return map;
  }, [itemsVisibles, catalogo]);

  const yaTengoCount = itemsVisibles.filter((i) => i.yaTengo).length;
  const hasPlanes = planes.length > 0;
  const missingItems = lista?.missingItems ?? [];

  if (loadingPlanes) {
    return <div className="card"><SkeletonHeader /><div style={{ marginTop: "var(--space-3)" }}><SkeletonList count={3} /></div></div>;
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

        {/* Encargado de compras — selector JP */}
        {isJP && lista && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>Compras:</span>
              {MIEMBRO_IDS.map(mid => (
                <button
                  key={mid}
                  onClick={() => void handleAsignarEncargado(encargadoActual === mid ? null : mid)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    background: "none", border: "none", cursor: "pointer", padding: 2,
                  }}
                >
                  <span style={{
                    borderRadius: "50%",
                    outline: encargadoActual === mid ? "2px solid var(--primary)" : "none",
                    outlineOffset: 2,
                  }}>
                    <MemberAvatar name={NOMBRE_MIEMBRO[mid]} memberId={mid} size={30} />
                  </span>
                  <span style={{
                    fontSize: 10,
                    color: encargadoActual === mid ? "var(--primary)" : "var(--muted)",
                    fontWeight: encargadoActual === mid ? 700 : 400,
                  }}>
                    {NOMBRE_MIEMBRO[mid].split(" ")[0]}
                  </span>
                </button>
              ))}
              {encargadoActual !== null && (
                <button
                  onClick={() => void handleAsignarEncargado(null)}
                  style={{
                    padding: "4px 10px", borderRadius: 999, fontSize: 11,
                    border: "1px solid var(--border)", background: "var(--surface-alt)",
                    color: "var(--muted)", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Sin asignar
                </button>
              )}
            </div>
            {encargadoError && (
              <p style={{ color: "var(--err-text)", fontSize: "var(--fs-xs)", margin: "4px 0 0" }}>
                {encargadoError}
              </p>
            )}
          </div>
        )}

        {/* Encargado de compras — estado y acción (no-JP) */}
        {!isJP && lista && memberId && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                Compras:{" "}
                {encargadoActual
                  ? (
                    <>
                      <MemberAvatar name={NOMBRE_MIEMBRO[encargadoActual]} memberId={encargadoActual} size={18} />
                      <strong style={{ fontSize: 12 }}>{NOMBRE_MIEMBRO[encargadoActual]}</strong>
                    </>
                  )
                  : <em>sin asignar</em>
                }
              </span>
              {encargadoActual === memberId ? (
                <button
                  onClick={() => void handleAsignarEncargado(null)}
                  style={{
                    padding: "4px 10px", borderRadius: 999, fontSize: 11,
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--muted)", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Ya no me encargo
                </button>
              ) : (
                <button
                  onClick={() => void handleAsignarEncargado(memberId)}
                  style={{
                    padding: "4px 10px", borderRadius: 999, fontSize: 11,
                    border: "1px solid var(--primary)", background: "transparent",
                    color: "var(--primary)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                  }}
                >
                  Encargarme de las compras
                </button>
              )}
            </div>
            {encargadoError && (
              <p style={{ color: "var(--err-text)", fontSize: "var(--fs-xs)", margin: "4px 0 0" }}>
                {encargadoError}
              </p>
            )}
          </div>
        )}

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

      {/* ── Banner encargado (no-JP) ────────────────────────────────────────── */}
      {esEncargado && !isJP && (
        <div style={{
          padding: "10px 14px", borderRadius: "var(--radius-md)",
          background: "var(--surface-strong)", border: "1px solid var(--border)",
          marginBottom: "var(--space-3)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span aria-hidden style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>🛒</span>
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--text-strong)", fontWeight: 600 }}>
            Te toca hacer las compras esta semana.
          </p>
        </div>
      )}

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
                sustitutosMap={sustitutosMap}
              />
            ))
          : porGondola.map((g) => (
              <GondolaCardV2
                key={g.seccion}
                seccion={g.seccion}
                items={g.items}
                onToggle={handleToggleItem}
                sustitutosMap={sustitutosMap}
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
