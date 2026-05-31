import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getMenu, computeMenuDerived } from "../data/menus";
import { getRecetasByIds } from "../data/recetas";
import { getSeccionRecetaMeta } from "../lib/catalogo";
import { subscribeToPlanesActivos, elegirMenuComoEspecial, sumarMenuComoEnProceso } from "../data/planes";
import { evaluarEspecialMenu, evaluarEnProcesoMenu } from "../lib/elegibilidad";
import { getSemanaActual, getSemanaFin } from "../lib/fechas";
import type { Menu, Receta, Plan, MenuDerived } from "../types/models";

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg { text: string; ok: boolean }

function Toast({ msg, onDone }: { msg: ToastMsg; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", bottom: "var(--space-5)", left: "50%", transform: "translateX(-50%)",
      background: msg.ok ? "var(--ok-bg)" : "var(--err-bg)",
      color: msg.ok ? "var(--ok-text)" : "var(--err-text)",
      padding: "10px 20px", borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-toast)", fontSize: "var(--fs-sm)",
      zIndex: 9999, maxWidth: "90vw", textAlign: "center",
    }}>
      {msg.text}
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  mensaje, onConfirmar, onCancelar,
}: {
  mensaje: string; onConfirmar: () => void; onCancelar: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9998, padding: "var(--space-4)",
    }}>
      <div className="card" style={{ maxWidth: 380, width: "100%", margin: 0 }}>
        <p style={{ marginBottom: "var(--space-4)", lineHeight: 1.5 }}>{mensaje}</p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirmar}>Reemplazar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers de display ───────────────────────────────────────────────────────

function formatMinutos(min: number): string {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m} min` : `${h}h`;
}

const DIFICULTAD_LABELS = ["—", "Baja", "Media", "Media-alta", "Alta"] as const;
const COSTO_LABELS = ["—", "Bajo", "Medio", "Medio/Alto", "Alto"] as const;

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  label, puede, razon, loading: isLoading, onClick,
}: {
  label: string; puede: boolean; razon?: string; loading: boolean; onClick: () => void;
}) {
  return (
    <div>
      <button
        className="btn btn-primary"
        onClick={onClick}
        disabled={!puede || isLoading}
        style={{ width: "100%", fontSize: "var(--fs-sm)", opacity: puede ? 1 : 0.5 }}
      >
        {isLoading ? "…" : label}
      </button>
      {!puede && razon && (
        <p className="meta" style={{ marginTop: "var(--space-1)", fontSize: "var(--fs-xs)" }}>
          {razon}
        </p>
      )}
    </div>
  );
}

// ─── Ruta principal ───────────────────────────────────────────────────────────

export function DetalleMenuRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();
  const isJP = state.status === "authenticated" && state.user.memberId === "juanpablo";

  const [menu, setMenu] = useState<Menu | null>(null);
  const [recetasMap, setRecetasMap] = useState<Map<string, Receta>>(new Map());
  const [derived, setDerived] = useState<MenuDerived | null>(null);
  const [planesActivos, setPlanesActivos] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingAccion, setLoadingAccion] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [confirm, setConfirm] = useState<{ mensaje: string; accion: () => void } | null>(null);

  const semanaInicio = getSemanaActual();
  const semanaFin = getSemanaFin(semanaInicio);

  useEffect(() => {
    if (!id) return;
    getMenu(id)
      .then(async (m) => {
        if (!m) { setLoadError("Menú no encontrado."); setLoading(false); return; }
        setMenu(m);
        const allIds = m.componentes.map((c) => c.idReceta);
        const recetas = await getRecetasByIds(allIds);
        const map = new Map(recetas.map((r) => [r.idReceta, r]));
        setRecetasMap(map);
        const obligatorias = m.componentes
          .filter((c) => c.obligatorio)
          .map((c) => map.get(c.idReceta))
          .filter((r): r is Receta => r !== undefined);
        setDerived(computeMenuDerived(obligatorias));
        setLoading(false);
      })
      .catch(() => { setLoadError("No se pudo cargar el menú."); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!isJP) return;
    return subscribeToPlanesActivos(semanaInicio, setPlanesActivos);
  }, [isJP, semanaInicio]);

  const showToast = useCallback((text: string, ok: boolean) => setToast({ text, ok }), []);

  function getRecetaPrincipalNombre(): string {
    if (!menu) return "";
    const comp =
      menu.componentes.find((c) => c.tipo === "Principal" && c.obligatorio) ??
      menu.componentes.find((c) => c.obligatorio);
    return comp ? (recetasMap.get(comp.idReceta)?.nombre ?? menu.nombreMenu) : menu.nombreMenu;
  }

  async function handleEspecial() {
    if (!menu) return;
    const { puede, razon, especialExistente } = evaluarEspecialMenu(menu, planesActivos);
    if (!puede) { showToast(razon ?? "No se puede elegir como Especial.", false); return; }
    if (especialExistente) {
      setConfirm({
        mensaje: `Ya hay una Especial esta semana: "${especialExistente.nombreSeleccion}". ¿Reemplazarla? Se descartarán también sus extras.`,
        accion: () => ejecutarEspecial(especialExistente),
      });
    } else {
      await ejecutarEspecial();
    }
  }

  async function ejecutarEspecial(especialExistente?: Plan) {
    if (!menu) return;
    setConfirm(null);
    setLoadingAccion("especial");
    const result = await elegirMenuComoEspecial(menu, getRecetaPrincipalNombre(), semanaInicio, semanaFin, especialExistente);
    setLoadingAccion(null);
    if (result.ok) showToast(`"${menu.nombreMenu}" elegido como Especial.`, true);
    else showToast(result.error.message, false);
  }

  async function handleEnProceso() {
    if (!menu) return;
    const { puede, razon } = evaluarEnProcesoMenu(menu, planesActivos);
    if (!puede) { showToast(razon ?? "No se puede agregar como En proceso.", false); return; }
    setLoadingAccion("enproceso");
    const result = await sumarMenuComoEnProceso(menu, getRecetaPrincipalNombre(), semanaInicio, semanaFin);
    setLoadingAccion(null);
    if (result.ok) showToast(`"${menu.nombreMenu}" sumado como En proceso.`, true);
    else showToast(result.error.message, false);
  }

  if (loading) return <div className="card"><p className="meta">Cargando menú…</p></div>;
  if (loadError || !menu) {
    return (
      <div className="card">
        <p style={{ color: "var(--err-text)" }}>{loadError ?? "Menú no encontrado."}</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: "var(--space-3)" }}>
          Volver
        </button>
      </div>
    );
  }

  const elegEspecial = evaluarEspecialMenu(menu, planesActivos);
  const elegEnProceso = evaluarEnProcesoMenu(menu, planesActivos);

  return (
    <>
      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ padding: "4px", display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ margin: 0, fontSize: "var(--fs-lg)", color: "var(--text-strong)", flex: 1, minWidth: 0 }}>
          {menu.nombreMenu}
        </h2>
      </div>

      {/* Metadata del menú */}
      <div style={{ background: "var(--surface-strong)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 18px", marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
          <span style={{
            fontSize: "var(--fs-xs)", padding: "2px 8px",
            borderRadius: "var(--radius-full)", background: "var(--surface-alt)", color: "var(--muted-strong)",
          }}>
            {menu.escenarioUso}
          </span>
          {menu.estado && (
            <span style={{
              fontSize: "var(--fs-xs)", padding: "2px 8px",
              borderRadius: "var(--radius-full)", background: "var(--info-bg)", color: "var(--info-text)",
            }}>
              {menu.estado}
            </span>
          )}
        </div>

        {menu.estilo && <p className="meta" style={{ marginBottom: "var(--space-1)" }}>{menu.estilo}</p>}
        {menu.climaDelMenu && <p className="meta" style={{ marginBottom: "var(--space-1)" }}>Clima: {menu.climaDelMenu}</p>}
        {menu.idealPara && <p className="meta" style={{ marginBottom: "var(--space-1)" }}>Ideal para: {menu.idealPara}</p>}
        {menu.descripcion && (
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--text)", margin: "var(--space-2) 0 0", lineHeight: 1.5 }}>
            {menu.descripcion}
          </p>
        )}

        {/* Derivados */}
        {derived && (
          <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
            <span className="meta">{formatMinutos(derived.tiempoTotalMin)} total</span>
            <span className="meta">{DIFICULTAD_LABELS[derived.dificultadOrden] ?? "—"}</span>
            <span className="meta">{COSTO_LABELS[derived.costoOrden] ?? "—"}</span>
            <span className="meta">{derived.porcionesMin}–{derived.porcionesMax} porciones</span>
            {derived.sinLacteos && (
              <span style={{ fontSize: "var(--fs-xs)", padding: "1px 7px", borderRadius: "var(--radius-full)", background: "var(--ok-bg)", color: "var(--ok-text)" }}>
                Sin lácteos
              </span>
            )}
            {derived.hidratos && (
              <span style={{ fontSize: "var(--fs-xs)", padding: "1px 7px", borderRadius: "var(--radius-full)", background: "var(--surface-alt)", color: "var(--muted-strong)" }}>
                Con hidratos
              </span>
            )}
          </div>
        )}

        {menu.riesgos && (
          <div style={{
            marginTop: "var(--space-3)", padding: "var(--space-2) var(--space-3)",
            background: "var(--warn-bg)", borderRadius: "var(--radius-sm)",
          }}>
            <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--warn-text)" }}>⚠ {menu.riesgos}</p>
          </div>
        )}
      </div>

      {/* Componentes */}
      <div style={{ background: "var(--surface-strong)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 18px", marginBottom: "var(--space-3)" }}>
        <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: "0 0 var(--space-3)" }}>
          Componentes ({menu.componentes.length})
        </p>
        {[...menu.componentes].sort((a, b) => a.orden - b.orden).map((comp) => {
          const receta = recetasMap.get(comp.idReceta);
          return (
            <Link
              key={comp.idReceta}
              to={`/recetas/${comp.idReceta}`}
              style={{ textDecoration: "none", display: "block", marginBottom: "var(--space-2)" }}
            >
              <div style={{
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface-strong)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", flex: 1, minWidth: 0 }}>
                    {/* Chip de letra por tipo de componente */}
                    {(() => {
                      const meta = getSeccionRecetaMeta(comp.tipo ?? "");
                      return (
                        <span aria-label={comp.tipo} style={{
                          width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                          background: meta.color, color: "#fff",
                          fontSize: 11, fontWeight: 700, lineHeight: 1,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {meta.letra}
                        </span>
                      );
                    })()}
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", display: "block" }}>
                        {comp.tipo}
                      </span>
                      <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-strong)", fontWeight: "var(--fw-medium)" }}>
                        {receta?.nombre ?? comp.idReceta}
                      </span>
                    </div>
                  </div>
                  {!comp.obligatorio && (
                    <span style={{
                      fontSize: "var(--fs-xs)", padding: "1px 6px",
                      borderRadius: "var(--radius-full)", background: "var(--surface-alt)", color: "var(--muted)",
                      flexShrink: 0,
                    }}>
                      Opcional
                    </span>
                  )}
                </div>
                {receta && (
                  <p className="meta" style={{ marginTop: "2px", fontSize: "var(--fs-xs)" }}>
                    {receta.proteinaPrincipal} · {receta.tiempoTotalLabel} · {receta.dificultad}
                  </p>
                )}
                {comp.notas && (
                  <p className="meta" style={{ marginTop: "2px", fontSize: "var(--fs-xs)", fontStyle: "italic" }}>
                    {comp.notas}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Notas adicionales */}
      {(menu.notas || menu.notasOcasion || menu.paraJuanPablo || menu.paraFamilia) && (
        <div style={{ background: "var(--surface-strong)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 18px", marginBottom: "var(--space-3)" }}>
          {menu.paraJuanPablo && (
            <p style={{ fontSize: "var(--fs-sm)", margin: "0 0 var(--space-2)" }}>
              <span style={{ color: "var(--muted)", fontSize: "var(--fs-xs)" }}>Para JP: </span>
              {menu.paraJuanPablo}
            </p>
          )}
          {menu.paraFamilia && (
            <p style={{ fontSize: "var(--fs-sm)", margin: "0 0 var(--space-2)" }}>
              <span style={{ color: "var(--muted)", fontSize: "var(--fs-xs)" }}>Para la familia: </span>
              {menu.paraFamilia}
            </p>
          )}
          {menu.notasOcasion && (
            <p style={{ fontSize: "var(--fs-sm)", margin: "0 0 var(--space-2)" }}>
              <span style={{ color: "var(--muted)", fontSize: "var(--fs-xs)" }}>Ocasión: </span>
              {menu.notasOcasion}
            </p>
          )}
          {menu.notas && (
            <p style={{ fontSize: "var(--fs-sm)", margin: 0 }}>
              <span style={{ color: "var(--muted)", fontSize: "var(--fs-xs)" }}>Notas: </span>
              {menu.notas}
            </p>
          )}
        </div>
      )}

      {/* Acciones JP */}
      {isJP && (
        <div style={{ background: "var(--surface-strong)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <ActionBtn
            label="Elegir como Especial"
            puede={elegEspecial.puede}
            razon={elegEspecial.razon}
            loading={loadingAccion === "especial"}
            onClick={handleEspecial}
          />
          <ActionBtn
            label="Sumar como En proceso"
            puede={elegEnProceso.puede}
            razon={elegEnProceso.razon}
            loading={loadingAccion === "enproceso"}
            onClick={handleEnProceso}
          />
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      {confirm && (
        <ConfirmDialog
          mensaje={confirm.mensaje}
          onConfirmar={confirm.accion}
          onCancelar={() => setConfirm(null)}
        />
      )}
    </>
  );
}
