// src/routes/CompraRapidaArmar.tsx — Armar la compra rápida (E14.2)
// Disponible para juanpablo y maria. Muestra 3 tabs (Verdulería/Almacén/Fiambre),
// 3 modos A/B/C, checklist por góndola con steppers, multi-asignado y genera la instancia.

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ChevronLeft, ShoppingBag, RefreshCw } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getRecetas } from "../data/recetas";
import {
  generarInstanciaCompraRapida,
  guardarSeleccionPlantilla,
  seedPlantillasMaestras,
} from "../data/comprasRapidas";
import { groupByGondola, SECCIONES } from "../lib/gondolas";
import { MemberAvatar } from "../components/MemberAvatar";
import { MIEMBRO_IDS } from "../types/models";
import type { Receta, MiembroId, IngredienteEnReceta, ItemCompraRapida } from "../types/models";

type Modo = "sumar" | "destildar" | "siempre";

const NOMBRE_MIEMBRO: Record<MiembroId, string> = {
  juanpablo: "Juan Pablo",
  maria:     "María",
  sofia:     "Sofía",
  federico:  "Federico",
};

const ORDEN_MAESTROS = ["Verdulería", "Almacén", "Fiambre"];

// ─── Ruta ─────────────────────────────────────────────────────────────────────

export function CompraRapidaArmarRoute() {
  const { state } = useAuth();
  if (state.status !== "authenticated") return <Navigate to="/" replace />;

  const selfId = state.user.memberId as MiembroId;
  const puedeArmar = selfId === "juanpablo" || selfId === "maria";
  if (!puedeArmar) return <Navigate to="/" replace />;

  return <CompraRapidaArmarInner selfId={selfId} />;
}

// ─── Inner ────────────────────────────────────────────────────────────────────

function CompraRapidaArmarInner({ selfId }: { selfId: MiembroId }) {
  const navigate = useNavigate();

  const [plantillas, setPlantillas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Tab activo (índice en plantillas)
  const [tabIdx, setTabIdx] = useState(0);

  // Modo A/B/C (persiste al tab actual a través de modoPreferido)
  const [modo, setModo] = useState<Modo>("siempre");

  // Estado marcado + cantidades por ingrediente (se re-inicia al cambiar tab o modo)
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [cantidades, setCantidades] = useState<Record<string, string>>({});

  // Asignados (multi-select)
  const [asignados, setAsignados] = useState<MiembroId[]>([selfId]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cargarPlantillas() {
    setLoading(true);
    getRecetas()
      .then((rs) => {
        const crs = rs.filter((r) => r.esCompraRapida);
        crs.sort((a, b) => {
          const ai = ORDEN_MAESTROS.indexOf(a.destino ?? "");
          const bi = ORDEN_MAESTROS.indexOf(b.destino ?? "");
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return 0;
        });
        setPlantillas(crs);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { cargarPlantillas(); }, []);

  const plantilla = plantillas[tabIdx] ?? null;

  // Re-inicializar checked/cantidades cuando cambia la plantilla o el modo
  const initItems = useCallback((p: Receta, m: Modo) => {
    const newChecked: Record<string, boolean> = {};
    const newCant: Record<string, string> = {};
    for (const ing of p.ingredientes) {
      let isChecked = false;
      if (m === "sumar")     isChecked = false;
      else if (m === "destildar") isChecked = true;
      else { // siempre
        if (p.ultimaSeleccion && p.ultimaSeleccion.length > 0) {
          isChecked = p.ultimaSeleccion.includes(ing.idIngrediente);
        } else {
          isChecked = !!(ing as IngredienteEnReceta).habitual;
        }
      }
      newChecked[ing.idIngrediente] = isChecked;
      newCant[ing.idIngrediente]    = String(ing.cantidad ?? "1");
    }
    setChecked(newChecked);
    setCantidades(newCant);
  }, []);

  useEffect(() => {
    if (!plantilla) return;
    const modoInicial: Modo = plantilla.modoPreferido ?? "siempre";
    setModo(modoInicial);
    initItems(plantilla, modoInicial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabIdx, plantilla?.idReceta]);

  useEffect(() => {
    if (!plantilla) return;
    initItems(plantilla, modo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  async function handleSeed() {
    setSeeding(true);
    setError(null);
    const r = await seedPlantillasMaestras();
    if (!r.ok) setError(r.error.message);
    else cargarPlantillas();
    setSeeding(false);
  }

  function toggleCheck(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function cambiarCantidad(id: string, delta: number) {
    setCantidades((prev) => {
      const n = Math.max(0.5, parseFloat(prev[id] ?? "1") + delta);
      return { ...prev, [id]: Number.isInteger(n) ? String(n) : n.toFixed(1) };
    });
  }

  function toggleAsignado(id: MiembroId) {
    setAsignados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // Items para la vista: en modo C, los marcados (con ★) van primero dentro del grupo
  const ingConSeccion = useMemo(() => {
    if (!plantilla) return [];
    return plantilla.ingredientes.map((ing) => ({
      ...ing,
      seccionGondola: ing.seccion ?? "Despensa / otros",
    }));
  }, [plantilla]);

  const porGondola = useMemo(() => {
    if (!ingConSeccion.length) return [];
    const grupos = groupByGondola(ingConSeccion);
    if (modo !== "siempre") return grupos;
    // En modo C: dentro de cada grupo, marcados primero
    return grupos.map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) => {
        const ac = checked[a.idIngrediente] ? 0 : 1;
        const bc = checked[b.idIngrediente] ? 0 : 1;
        return ac - bc;
      }),
    }));
  }, [ingConSeccion, modo, checked]);

  async function handleGenerar() {
    if (!plantilla || asignados.length === 0) {
      setError("Elegí al menos un miembro para asignar la compra.");
      return;
    }
    setError(null);
    setSaving(true);

    const itemsMarcados: ItemCompraRapida[] = plantilla.ingredientes
      .filter((ing) => checked[ing.idIngrediente])
      .map((ing) => ({
        idIngrediente: ing.idIngrediente,
        nombre: ing.textoOriginal,
        cantidad: cantidades[ing.idIngrediente] ?? String(ing.cantidad ?? "1"),
        unidad: ing.unidad ?? "",
        seccionGondola: ing.seccion ?? "Despensa / otros",
        comprado: false,
      }));

    if (itemsMarcados.length === 0) {
      setError("Marcá al menos un ítem antes de generar.");
      setSaving(false);
      return;
    }

    const [genResult, saveResult] = await Promise.all([
      generarInstanciaCompraRapida(plantilla, asignados, itemsMarcados),
      guardarSeleccionPlantilla(
        plantilla.idReceta,
        itemsMarcados.map((it) => it.idIngrediente),
        modo,
      ),
    ]);

    setSaving(false);

    if (!genResult.ok) { setError(genResult.error.message); return; }
    if (!saveResult.ok) console.warn("No se pudo guardar la selección:", saveResult.error);

    navigate(`/compra-rapida/${genResult.value.idPlan}`);
  }

  const faltanMaestros = plantillas.length < 3 ||
    !ORDEN_MAESTROS.every((d) => plantillas.some((p) => p.destino === d));

  if (loading) {
    return (
      <div style={{ padding: "var(--space-4)" }}>
        <p className="meta">Cargando plantillas…</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "var(--space-10)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ padding: "4px", display: "flex", alignItems: "center" }}
        >
          <ChevronLeft size={20} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-strong)" }}>
          Armar la compra
        </h1>
      </div>

      {/* Seed banner */}
      {faltanMaestros && (
        <div className="card" style={{ marginBottom: "var(--space-3)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--text)" }}>
            Faltan las plantillas maestras (Verdulería, Almacén, Fiambre).
          </p>
          <button
            className="btn btn-primary"
            onClick={() => void handleSeed()}
            disabled={seeding}
            style={{ fontSize: "var(--fs-sm)", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}
          >
            <RefreshCw size={14} />
            {seeding ? "Creando…" : "Crear plantillas"}
          </button>
        </div>
      )}

      {plantillas.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
          <p className="meta">No hay plantillas todavía.</p>
        </div>
      ) : (
        <>
          {/* Tabs de comercio */}
          <div style={{ display: "flex", gap: 6, marginBottom: "var(--space-3)", overflowX: "auto" }}>
            {plantillas.map((p, i) => (
              <button
                key={p.idReceta}
                onClick={() => setTabIdx(i)}
                style={{
                  padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", flexShrink: 0,
                  background: tabIdx === i ? "var(--primary)" : "transparent",
                  color: tabIdx === i ? "#fff" : "var(--muted)",
                  border: tabIdx === i ? "none" : "1px solid var(--border)",
                  transition: "all 160ms ease", fontFamily: "inherit",
                }}
              >
                {p.destino ?? p.nombre.replace("Compra rápida · ", "")}
              </button>
            ))}
          </div>

          {plantilla && (
            <>
              {/* Selector de modo */}
              <div className="card" style={{ marginBottom: "var(--space-3)" }}>
                <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--fs-xs)", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Modo</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["sumar", "destildar", "siempre"] as Modo[]).map((m) => {
                    const labels: Record<Modo, string> = { sumar: "A · Sumar", destildar: "B · Destildar", siempre: "C · De siempre" };
                    return (
                      <button
                        key={m}
                        onClick={() => setModo(m)}
                        style={{
                          flex: 1, padding: "7px 6px", borderRadius: "var(--radius-md)", fontSize: 12,
                          fontWeight: 600, cursor: "pointer", textAlign: "center",
                          background: modo === m ? "var(--primary)" : "var(--surface-strong)",
                          color: modo === m ? "#fff" : "var(--text)",
                          border: modo === m ? "none" : "1px solid var(--border)",
                          fontFamily: "inherit", transition: "all 160ms ease",
                        }}
                      >
                        {labels[m]}
                      </button>
                    );
                  })}
                </div>
                <p style={{ margin: "var(--space-2) 0 0", fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
                  {modo === "sumar"     && "Todo desmarcado. Tocá lo que necesitás."}
                  {modo === "destildar" && "Todo marcado. Sacá lo que no va esta semana."}
                  {modo === "siempre"   && "Arranca con lo que elegiste la última vez (o los habituales ★ en el primer uso)."}
                </p>
              </div>

              {/* Lista por góndola */}
              {porGondola.length === 0 ? (
                <div className="card">
                  <p className="meta" style={{ margin: 0 }}>Esta plantilla no tiene ítems.</p>
                </div>
              ) : (
                porGondola.map((grupo) => {
                  const meta = SECCIONES[grupo.seccion] ?? { color: "var(--muted)", letra: "?" };
                  return (
                    <div key={grupo.seccion} className="card" style={{ marginBottom: "var(--space-3)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-2)" }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: meta.color, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {meta.letra}
                        </span>
                        <span style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text-strong)" }}>
                          {grupo.seccion}
                        </span>
                      </div>

                      {grupo.items.map((ing) => {
                        const esHabitual = !!(ing as IngredienteEnReceta).habitual;
                        const isChecked = checked[ing.idIngrediente] ?? false;
                        return (
                          <div
                            key={ing.idIngrediente}
                            style={{
                              display: "flex", alignItems: "center", gap: "var(--space-2)",
                              padding: "10px 0", borderBottom: "1px solid var(--border-subtle)",
                            }}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleCheck(ing.idIngrediente)}
                              style={{
                                width: 22, height: 22, borderRadius: "var(--radius-sm)",
                                border: `2px solid ${isChecked ? "var(--primary)" : "var(--border)"}`,
                                background: isChecked ? "var(--primary)" : "transparent",
                                cursor: "pointer", flexShrink: 0, display: "flex",
                                alignItems: "center", justifyContent: "center",
                              }}
                            >
                              {isChecked && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>

                            {/* Nombre + ★ habitual */}
                            <span
                              onClick={() => toggleCheck(ing.idIngrediente)}
                              style={{
                                flex: 1, fontSize: "var(--fs-sm)", cursor: "pointer",
                                color: isChecked ? "var(--text-strong)" : "var(--muted)",
                                textDecoration: !isChecked ? "none" : undefined,
                                minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}
                            >
                              {modo === "siempre" && esHabitual && (
                                <span style={{ color: "var(--primary)", marginRight: 4, fontSize: 10 }}>★</span>
                              )}
                              {ing.textoOriginal}
                            </span>

                            {/* Stepper (solo si marcado) */}
                            {isChecked && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                                <button
                                  onClick={() => cambiarCantidad(ing.idIngrediente, -0.5)}
                                  style={stepBtn}
                                >−</button>
                                <span style={{ fontSize: 12, minWidth: 32, textAlign: "center", color: "var(--text-strong)" }}>
                                  {cantidades[ing.idIngrediente] ?? "1"} {ing.unidad ?? ""}
                                </span>
                                <button
                                  onClick={() => cambiarCantidad(ing.idIngrediente, 0.5)}
                                  style={stepBtn}
                                >+</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}

              {/* Resumen marcados */}
              <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", margin: "0 0 var(--space-3)", textAlign: "center" }}>
                {Object.values(checked).filter(Boolean).length} de {plantilla.ingredientes.length} ítems marcados
              </p>

              {/* Footer: asignados + CTA */}
              <div className="card">
                <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--fs-xs)", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Asignar a
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
                  {MIEMBRO_IDS.map((mid) => (
                    <button
                      key={mid}
                      onClick={() => toggleAsignado(mid)}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                        background: "none", border: "none", cursor: "pointer", padding: 4,
                      }}
                    >
                      <span style={{
                        borderRadius: "50%",
                        outline: asignados.includes(mid) ? "2px solid var(--primary)" : "none",
                        outlineOffset: 2,
                      }}>
                        <MemberAvatar name={NOMBRE_MIEMBRO[mid]} memberId={mid} size={34} />
                      </span>
                      <span style={{
                        fontSize: 10,
                        color: asignados.includes(mid) ? "var(--primary)" : "var(--muted)",
                        fontWeight: asignados.includes(mid) ? 700 : 400,
                      }}>
                        {NOMBRE_MIEMBRO[mid].split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>

                {error && (
                  <p style={{ color: "var(--err-text)", fontSize: "var(--fs-xs)", margin: "0 0 var(--space-2)" }}>
                    {error}
                  </p>
                )}

                <button
                  className="btn btn-primary"
                  disabled={saving || asignados.length === 0}
                  onClick={() => void handleGenerar()}
                  style={{ width: "100%", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <ShoppingBag size={16} />
                  {saving ? "Generando…" : "Generar la de esta semana"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Estilos locales ──────────────────────────────────────────────────────────

const stepBtn: React.CSSProperties = {
  width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
  background: "var(--surface-strong)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 16,
  color: "var(--text)", fontFamily: "inherit",
};
