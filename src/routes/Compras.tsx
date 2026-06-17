// src/routes/Compras.tsx — Lista de compras v2 (Variant C: "Recetas envueltas")
//
// Vista principal: por receta (cada plan = card con day badge + título + cocineros).
// Vista alterna: lista completa agrupada por góndola (toggle pill arriba).
// Sin filtro todo/pendientes/yaTengo — completados se ven inline (atenuados).

import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { subscribeToPlanesActivos } from "../data/planes";
import { subscribeToLista, subscribeToItemsLista, toggleItemYaTengo } from "../data/compras";
import { subscribeContador, mesActualKey, resumenPorMes } from "../data/comprasContador";
import type { ComprasContador } from "../types/models";
import { getCatalogo } from "../data/ingredientes";
import { getSemanaActual } from "../lib/fechas";
import { groupByGondola } from "../lib/catalogo";
import { sustitutosDeItemCompra } from "../lib/sustitutos";
import { ProgressRing } from "../components/ProgressRing";
import { RecetaCardV2 } from "../components/RecetaCardV2";
import { GondolaCardV2 } from "../components/GondolaCardV2";
import type { ListaCompras, ItemCompra, Plan, MiembroId, Ingrediente } from "../types/models";
import { MIEMBRO_IDS } from "../types/models";

import { SkeletonHeader } from "../components/skeletons/SkeletonHeader";
import { SkeletonList } from "../components/skeletons/SkeletonList";


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
  const [contador, setContador] = useState<ComprasContador>({ meses: {} });

  // Catálogo (cacheado — carga una vez)
  useEffect(() => { getCatalogo().then(setCatalogo).catch(() => {}); }, []);

  // Contador de compras por mes (realtime)
  useEffect(() => subscribeContador(setContador), []);

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

  const puedeGestionarCompras = memberId === "juanpablo" || memberId === "maria";

  // JP ve lista completa; el resto solo los ítems de sus planes asignados
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

        {/* Botón armar (JP + María) */}
        {puedeGestionarCompras && (
          <Link
            to="/compras/armar"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: "var(--radius-md)",
              background: "var(--primary)", color: "#fff",
              textDecoration: "none", fontWeight: 700,
              fontSize: "var(--fs-sm)", marginBottom: 10,
            }}
          >
            <ShoppingBag size={16} />
            Armar la compra
          </Link>
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

      {/* ── Contador de compras rápidas ─────────────────────────────────────── */}
      <ContadorCompras contador={contador} />
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

// ─── Contador de compras rápidas ──────────────────────────────────────────────

const NOMBRE_MIEMBRO_CORTO: Record<MiembroId, string> = {
  juanpablo: "JP", maria: "María", sofia: "Sofía", federico: "Federico",
};

function ContadorCompras({ contador }: { contador: ComprasContador }) {
  const resumen = resumenPorMes(contador);
  if (resumen.length === 0) return null;

  const mesActual = mesActualKey();
  const actual    = resumen.find(r => r.mesKey === mesActual);
  const historico = resumen.filter(r => r.mesKey !== mesActual);

  const renderFila = (porMiembro: Partial<Record<MiembroId, number>>, mostrarBarra: boolean) => {
    const entradas = MIEMBRO_IDS.map(id => ({ id, n: porMiembro[id] ?? 0 }));
    const max = Math.max(...entradas.map(e => e.n), 1);
    const lider = Math.max(...entradas.map(e => e.n));
    return entradas.map(({ id, n }) => (
      <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ width: 48, fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>
          {n === lider && lider > 0 ? "🥇 " : ""}{NOMBRE_MIEMBRO_CORTO[id]}
        </span>
        {mostrarBarra && (
          <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${(n / max) * 100}%`, height: "100%", background: "var(--primary)", borderRadius: 4, transition: "width .3s" }} />
          </div>
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-strong)", minWidth: 16, textAlign: "right" }}>{n}</span>
      </div>
    ));
  };

  const formatearMes = (key: string) => {
    const [y, m] = key.split("-");
    const nombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${nombres[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      {actual && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <p style={{ margin: "0 0 var(--space-2)", fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--text-strong)" }}>
            Quién se ocupó · {formatearMes(mesActual)}
          </p>
          {renderFila(actual.porMiembro, true)}
        </div>
      )}
      {historico.length > 0 && (
        <div className="card">
          <p style={{ margin: "0 0 var(--space-2)", fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--text-strong)" }}>
            Histórico por mes
          </p>
          {historico.map(({ mesKey, porMiembro, total }) => {
            const lider = Object.entries(porMiembro).sort((a,b)=>(b[1]??0)-(a[1]??0))[0];
            return (
              <div key={mesKey} style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--text-strong)" }}>
                    {formatearMes(mesKey)}
                  </span>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>{total} compras</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {MIEMBRO_IDS.map(id => {
                    const n = porMiembro[id] ?? 0;
                    const esLider = lider && lider[0] === id && (lider[1] ?? 0) > 0;
                    return n > 0 ? (
                      <span key={id} style={{
                        padding: "2px 8px", borderRadius: 999, fontSize: 11,
                        background: "var(--surface-strong)", border: "1px solid var(--border)",
                        color: "var(--text-strong)",
                      }}>
                        {esLider ? "🥇 " : ""}{NOMBRE_MIEMBRO_CORTO[id]} {n}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
