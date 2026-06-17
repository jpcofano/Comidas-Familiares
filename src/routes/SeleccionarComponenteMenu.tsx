import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getPlan, marcarCocinada, desmarcarComponenteCocinado } from "../data/planes";
import { getMenu } from "../data/menus";
import { getReceta } from "../data/recetas";
import { getCatalogo } from "../data/ingredientes";
import { macrosDeReceta } from "../lib/macros";
import type { Plan, Menu, Receta, Ingrediente } from "../types/models";
import { SkeletonHeader } from "../components/skeletons/SkeletonHeader";

export function SeleccionarComponenteMenuRoute() {
  const { idPlan } = useParams<{ idPlan: string }>();
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const memberId = authState.status === "authenticated" ? authState.user.memberId : "";
  const isJP = memberId === "juanpablo";

  const [plan, setPlan] = useState<Plan | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [recetasMap, setRecetasMap] = useState<Map<string, Receta>>(new Map());
  const [catalogo, setCatalogo] = useState<Map<string, Ingrediente>>(new Map());
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);

  useEffect(() => { getCatalogo().then(setCatalogo).catch(() => {}); }, []);

  useEffect(() => {
    if (!idPlan) return;
    getPlan(idPlan).then(async (p) => {
      if (!p) { setLoading(false); return; }
      setPlan(p);
      const m = await getMenu(p.idSeleccion);
      if (!m) { setLoading(false); return; }
      setMenu(m);
      const recetas = await Promise.all(
        m.componentes.map((c) => getReceta(c.idReceta))
      );
      const map = new Map<string, Receta>();
      m.componentes.forEach((c, i) => {
        const r = recetas[i];
        if (r) map.set(c.idReceta, r);
      });
      setRecetasMap(map);
      setLoading(false);
    });
  }, [idPlan]);

  if (loading) return <div className="card"><SkeletonHeader /></div>;
  if (!plan || !menu) {
    return (
      <div className="card">
        <p style={{ color: "var(--err-text)" }}>Plan o menú no encontrado.</p>
        <button className="btn btn-secondary" onClick={() => navigate("/")} style={{ marginTop: "var(--space-3)" }}>
          Ir a inicio
        </button>
      </div>
    );
  }
  // Guard: solo JP o miembro asignado puede cocinar este menú
  if (!isJP && !(plan.asignaciones as string[])?.includes(memberId)) {
    return <Navigate to="/" replace />;
  }

  const cocinados = new Set(plan.componentesCocinados ?? []);
  const obligatorios = menu.componentes.filter((c) => c.obligatorio);
  const opcionales = menu.componentes.filter((c) => !c.obligatorio);
  const obligCocinados = obligatorios.filter((c) => cocinados.has(c.idReceta)).length;
  const menuCompleto = obligCocinados === obligatorios.length;

  function irACocinar(idReceta: string) {
    navigate(`/planes/${idPlan}/cocinar/${idReceta}`);
  }

  async function handleFinalizarMenu() {
    if (!idPlan) return;
    setFinalizando(true);
    await marcarCocinada(idPlan);
    navigate("/");
  }

  async function handleDesmarcar(idReceta: string) {
    if (!idPlan || !plan) return;
    const r = await desmarcarComponenteCocinado(idPlan, idReceta);
    if (r.ok) {
      setPlan({
        ...plan,
        componentesCocinados: (plan.componentesCocinados ?? []).filter((id) => id !== idReceta),
      });
    }
  }

  function renderComponente(c: NonNullable<typeof menu>["componentes"][number], opcional: boolean) {
    const r = recetasMap.get(c.idReceta);
    const nombre = r?.nombre ?? c.idReceta;
    const hecho = cocinados.has(c.idReceta);

    return (
      <div key={c.idReceta} style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "var(--space-3) 0", borderBottom: "1px solid var(--border-subtle)",
        gap: "var(--space-3)", opacity: opcional ? 0.75 : 1,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: "var(--fs-sm)", color: "var(--text-strong)",
            fontWeight: hecho ? "normal" : "var(--fw-medium)",
            textDecoration: hecho ? "line-through" : "none",
          }}>
            {hecho ? "✓ " : ""}{nombre}
          </p>
          {opcional && <span className="meta">Opcional</span>}
        </div>
        {hecho ? (
          <button
            className="btn btn-ghost"
            onClick={() => handleDesmarcar(c.idReceta)}
            style={{ fontSize: "var(--fs-xs)", flexShrink: 0, color: "var(--muted)" }}
          >
            Desmarcar
          </button>
        ) : (
          <button
            className={opcional ? "btn btn-secondary" : "btn btn-primary"}
            onClick={() => irACocinar(c.idReceta)}
            style={{ fontSize: "var(--fs-xs)", flexShrink: 0 }}
          >
            Cocinar →
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate("/")}
          style={{ padding: "4px", display: "flex", alignItems: "center" }}
        >
          <ChevronLeft size={20} />
        </button>
        <span className="meta">{menu.nombreMenu}</span>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: "0 0 var(--space-1)" }}>
          {menu.nombreMenu}
        </p>
        <p className="meta">
          {obligCocinados}/{obligatorios.length} obligatorios cocinados
        </p>

        {/* Finalizar menú — visible solo cuando todos los obligatorios están cocinados */}
        {menuCompleto && (
          <div style={{
            marginTop: "var(--space-3)", padding: "var(--space-3)",
            background: "var(--ok-bg)", borderRadius: "var(--radius-md)",
          }}>
            <p style={{ margin: "0 0 var(--space-2)", color: "var(--ok-text)", fontWeight: "var(--fw-semibold)" }}>
              ✓ Todos los obligatorios cocinados
            </p>
            <button
              className="btn btn-primary"
              onClick={handleFinalizarMenu}
              disabled={finalizando}
              style={{ width: "100%", fontSize: "var(--fs-sm)" }}
            >
              {finalizando ? "…" : "Finalizar menú"}
            </button>
          </div>
        )}
      </div>

      {/* Macros del menú completo */}
      {catalogo.size > 0 && (() => {
        const componentesConReceta = menu.componentes.filter(c => recetasMap.has(c.idReceta));
        if (componentesConReceta.length === 0) return null;

        let kcal = 0, carbohidratos = 0, proteinas = 0, grasas = 0, fibra = 0;
        let totalIngredientes = 0, sinDatosTotal = 0;

        for (const c of componentesConReceta) {
          const m = macrosDeReceta(recetasMap.get(c.idReceta)!, catalogo);
          kcal          += m.porPorcion.kcal;
          carbohidratos += m.porPorcion.carbohidratos;
          proteinas     += m.porPorcion.proteinas;
          grasas        += m.porPorcion.grasas;
          fibra         += m.porPorcion.fibra;
          totalIngredientes += recetasMap.get(c.idReceta)!.ingredientes.filter(i => !i.opcional).length;
          sinDatosTotal     += m.ingredientesSinDatos.length;
        }

        const hidratosNetos = Math.max(0, carbohidratos - fibra);
        const conDatos = totalIngredientes - sinDatosTotal;
        const cobertura = totalIngredientes > 0 ? conDatos / totalIngredientes : 0;

        if (cobertura === 0) {
          return (
            <div style={{
              padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)",
              border: "1.5px dashed var(--border)", marginBottom: "var(--space-3)",
              textAlign: "center",
            }}>
              <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                Sin datos de macros para este menú todavía.
              </p>
            </div>
          );
        }

        const parcial = cobertura > 0 && cobertura < 1;
        const coberturaLabel = `Estimado sobre ${conDatos} de ${totalIngredientes} ingrediente${totalIngredientes !== 1 ? "s" : ""}`;
        const secundarios = [
          { label: "kcal",             value: kcal.toFixed(0) },
          { label: "Proteínas",        value: `${proteinas.toFixed(1)} g` },
          { label: "Grasas",           value: `${grasas.toFixed(1)} g` },
          { label: "Fibra",            value: `${fibra.toFixed(1)} g` },
          { label: "Hidratos totales", value: `${carbohidratos.toFixed(1)} g` },
        ];

        return (
          <div className="card" style={{ marginBottom: "var(--space-3)" }}>
            <p style={{
              margin: "0 0 var(--space-1)", fontSize: "var(--fs-xs)", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)",
            }}>
              Macros por porción del menú completo
            </p>
            <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
              Una porción del menú completo (todos los componentes)
            </p>
            <div style={{ marginBottom: "var(--space-3)" }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: "var(--primary)", fontVariantNumeric: "tabular-nums" }}>
                {hidratosNetos.toFixed(1)} g
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                Hidratos netos · carbohidratos − fibra · lo que cuenta para keto
              </p>
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--space-2)", marginBottom: "var(--space-3)",
            }}>
              {secundarios.map(s => (
                <div key={s.label} style={{
                  background: "var(--surface-alt)", borderRadius: "var(--radius-sm)",
                  padding: "var(--space-2)", textAlign: "center",
                }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>
                    {s.value}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: "var(--muted)" }}>{s.label}</p>
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: parcial ? "var(--warn-text)" : "var(--muted)" }}>
              {parcial ? `Parcial · ${coberturaLabel}` : coberturaLabel}
            </p>
          </div>
        );
      })()}

      {/* Obligatorios */}
      {obligatorios.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <p style={{
            fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semibold)", textTransform: "uppercase",
            letterSpacing: ".05em", color: "var(--muted)", margin: "0 0 var(--space-1)",
          }}>
            Obligatorios
          </p>
          {obligatorios.map((c) => renderComponente(c, false))}
        </div>
      )}

      {/* Opcionales */}
      {opcionales.length > 0 && (
        <div className="card">
          <p style={{
            fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semibold)", textTransform: "uppercase",
            letterSpacing: ".05em", color: "var(--muted)", margin: "0 0 var(--space-1)",
          }}>
            Opcionales
          </p>
          {opcionales.map((c) => renderComponente(c, true))}
        </div>
      )}
    </>
  );
}
