import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { SkeletonHeader } from "../components/skeletons/SkeletonHeader";
import { SkeletonList } from "../components/skeletons/SkeletonList";
import { subscribeToPlanesActivos } from "../data/planes";
import { getListaById, subscribeToItemsLista, toggleItemYaTengo } from "../data/compras";
import { getSemanaActual } from "../lib/fechas";
import { agruparPorReceta } from "../lib/compras";
import { ORDEN_GONDOLA } from "../lib/catalogo";
import { formatearCantidadUnidad } from "../lib/unidades";
import type { ListaCompras, ItemCompra, Plan, MiembroId } from "../types/models";

type ModoVista = "gondola" | "receta";
type Filtro = "todo" | "pendientes" | "yaTengo";

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  idLista,
  expanded,
  onToggleExpand,
}: {
  item: ItemCompra;
  idLista: string;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  async function handleToggle() {
    await toggleItemYaTengo(idLista, item.id, !item.yaTengo);
  }

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        padding: "9px 0", borderBottom: "1px solid var(--line)",
        opacity: item.yaTengo ? 0.45 : 1,
      }}>
        <button
          onClick={handleToggle}
          aria-label={item.yaTengo ? "Quitar ya tengo" : "Marcar ya tengo"}
          style={{
            flexShrink: 0, width: 24, height: 24, borderRadius: "var(--radius-sm)",
            border: `2px solid ${item.yaTengo ? "var(--ok-text)" : "var(--border)"}`,
            background: item.yaTengo ? "var(--ok-bg)" : "transparent",
            cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {item.yaTengo && <span style={{ fontSize: 13, color: "var(--ok-text)", lineHeight: 1 }}>✓</span>}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: "var(--fs-sm)", color: "var(--text)",
            textDecoration: item.yaTengo ? "line-through" : "none",
          }}>
            {item.nombrePreferido}
          </span>
          {item.cantidadLabel && (
            <span className="meta" style={{ marginLeft: "var(--space-2)" }}>
              {item.cantidadTotal > 0
                ? formatearCantidadUnidad(item.cantidadTotal, item.unidad)
                : item.cantidadLabel}
            </span>
          )}
        </div>

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
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        )}
      </div>

      {expanded && item.aportes.length > 1 && (
        <div style={{
          paddingLeft: "calc(24px + var(--space-3))",
          paddingTop: "var(--space-1)", paddingBottom: "var(--space-2)",
        }}>
          {item.aportes.map((a, i) => (
            <p key={i} className="meta" style={{ margin: "2px 0" }}>
              {a.tipoAporte === "alternativa" ? "↳" : "·"} {a.textoOriginal}
              {a.cantidad > 0 ? ` (${formatearCantidadUnidad(a.cantidad, a.unidad)})` : ""} — {a.nombreReceta}
              {a.tipoAporte === "alternativa" && a.alternativaCon?.length
                ? ` · alt: ${a.alternativaCon.join(", ")}` : ""}
            </p>
          ))}
          {item.notas && (
            <p className="meta" style={{ margin: "4px 0 0", fontStyle: "italic" }}>{item.notas}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sección de grupo ─────────────────────────────────────────────────────────

function GrupoSeccion({
  titulo,
  items,
  idLista,
  expanded,
  onToggleExpand,
}: {
  titulo: string;
  items: ItemCompra[];
  idLista: string;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div className="card" style={{ marginBottom: "var(--space-2)" }}>
      <p style={{
        fontSize: "var(--fs-xs)", fontWeight: "var(--fw-medium)",
        textTransform: "uppercase", letterSpacing: ".05em",
        color: "var(--muted)", marginBottom: "var(--space-2)",
      }}>
        {titulo}
      </p>
      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          idLista={idLista}
          expanded={expanded.has(item.id)}
          onToggleExpand={() => onToggleExpand(item.id)}
        />
      ))}
    </div>
  );
}

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
  const [modoVista, setModoVista] = useState<ModoVista>("gondola");
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const unsubItems = useRef<(() => void) | null>(null);

  // Planes en tiempo real
  useEffect(() => {
    return subscribeToPlanesActivos(semanaInicio, (p) => {
      setPlanes(p);
      setLoadingPlanes(false);
    });
  }, [semanaInicio]);

  // Lista: derivada del listaComprasId de los planes (realtime)
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

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Para miembros no-JP: solo items de sus planes asignados (filtra por idPlan en aportes)
  const itemsVisibles = useMemo(() => {
    if (isJP || !memberId) return items;
    const misPlanIds = new Set(
      planes.filter((p) => p.asignaciones.includes(memberId)).map((p) => p.idPlan)
    );
    return items.filter((i) => i.aportes.some((a) => misPlanIds.has(a.idPlan)));
  }, [items, planes, memberId, isJP]);

  // Aplicar filtro
  const itemsFiltrados = useMemo(() => {
    if (filtro === "pendientes") return itemsVisibles.filter((i) => !i.yaTengo);
    if (filtro === "yaTengo") return itemsVisibles.filter((i) => i.yaTengo);
    return itemsVisibles;
  }, [itemsVisibles, filtro]);

  // Agrupar por sección de góndola, en el orden canónico de ORDEN_GONDOLA
  const porGondola = useMemo(() => {
    const map = new Map<string, ItemCompra[]>();
    for (const item of itemsFiltrados) {
      const sec = item.seccionGondola || "Despensa / otros";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(item);
    }
    for (const [, ings] of map) ings.sort((a, b) => a.nombrePreferido.localeCompare(b.nombrePreferido, "es"));
    const ordered: [string, ItemCompra[]][] = [];
    for (const sec of ORDEN_GONDOLA) {
      if (map.has(sec)) ordered.push([sec, map.get(sec)!]);
    }
    // Secciones no reconocidas al final (no debería ocurrir con el catálogo normalizado)
    for (const [sec, ings] of map) {
      if (!ORDEN_GONDOLA.includes(sec as typeof ORDEN_GONDOLA[number])) ordered.push([sec, ings]);
    }
    return ordered;
  }, [itemsFiltrados]);

  // Agrupar por receta
  const porReceta = useMemo(() => {
    const map = agruparPorReceta(itemsFiltrados);
    for (const [, ings] of map) ings.sort((a, b) => a.nombrePreferido.localeCompare(b.nombrePreferido, "es"));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [itemsFiltrados]);

  const pendientes = itemsVisibles.filter((i) => !i.yaTengo).length;
  const yaTengoCount = itemsVisibles.filter((i) => i.yaTengo).length;
  const hasPlanes = planes.length > 0;

  // missingItems del doc raíz (campo extra, no tipado)
  const missingItems = (lista as (ListaCompras & { missingItems?: string[] }) | null)?.missingItems ?? [];

  if (loadingPlanes) {
    return <div className="card"><SkeletonHeader /><div style={{ marginTop: "var(--space-3)" }}><SkeletonList count={3} /></div></div>;
  }

  const grupos = modoVista === "gondola" ? porGondola : porReceta;

  return (
    <>
      {/* Cabecera */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <h1 style={{
          fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)",
          color: "var(--text-strong)", margin: "0 0 var(--space-2)",
        }}>
          Compras
        </h1>

        {lista ? (
          <p className="meta">
            <strong>{pendientes}</strong> pendientes · <strong>{yaTengoCount}</strong> ya tengo · <strong>{items.length}</strong> total
          </p>
        ) : hasPlanes ? (
          <p className="meta">Generando lista… aparece automáticamente al crear planes.</p>
        ) : (
          <p className="meta">
            No hay comidas elegidas esta semana.{" "}
            {isJP && <Link to="/biblioteca" style={{ color: "var(--primary)" }}>Ver recetas →</Link>}
          </p>
        )}

        {/* Aviso de componentes sin ingredientes */}
        {missingItems.length > 0 && (
          <p style={{ marginTop: "var(--space-2)", fontSize: "var(--fs-xs)", color: "var(--warn-text)" }}>
            Sin ingredientes cargados: {missingItems.join(", ")}
          </p>
        )}
      </div>

      {/* Controles de vista y filtro */}
      {lista && items.length > 0 && (
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
          {/* Toggle vista */}
          <div style={{ display: "flex", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
            {(["gondola", "receta"] as ModoVista[]).map((modo) => (
              <button
                key={modo}
                onClick={() => setModoVista(modo)}
                style={{
                  padding: "5px 12px", fontSize: "var(--fs-xs)", border: "none", cursor: "pointer",
                  background: modoVista === modo ? "var(--primary)" : "var(--surface-strong)",
                  color: modoVista === modo ? "#fff" : "var(--text)",
                }}
              >
                {modo === "gondola" ? "Por góndola" : "Por receta"}
              </button>
            ))}
          </div>

          {/* Filtro */}
          <div style={{ display: "flex", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
            {(["todo", "pendientes", "yaTengo"] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                style={{
                  padding: "5px 12px", fontSize: "var(--fs-xs)", border: "none", cursor: "pointer",
                  background: filtro === f ? "var(--primary)" : "var(--surface-strong)",
                  color: filtro === f ? "#fff" : "var(--text)",
                }}
              >
                {f === "todo" ? "Todo" : f === "pendientes" ? "Pendientes" : "Ya tengo"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grupos de ítems */}
      {lista && grupos.map(([titulo, catItems]) => (
        <GrupoSeccion
          key={titulo}
          titulo={titulo}
          items={catItems}
          idLista={lista.idLista}
          expanded={expanded}
          onToggleExpand={toggleExpand}
        />
      ))}

      {lista && itemsFiltrados.length === 0 && (
        <div className="card">
          <p className="meta" style={{ textAlign: "center", padding: "var(--space-4) 0" }}>
            {filtro === "todo"
              ? "Lista vacía. Los ingredientes aparecen al crear planes."
              : filtro === "pendientes"
              ? "No hay ítems pendientes."
              : "No hay ítems marcados como ya tengo."}
          </p>
        </div>
      )}
    </>
  );
}
