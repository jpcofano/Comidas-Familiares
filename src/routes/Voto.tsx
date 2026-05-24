import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { getPlan, guardarEvaluacionJP } from "../data/planes";
import { getDiccionarios } from "../data/diccionarios";
import { getReceta } from "../data/recetas";
import { getMenu } from "../data/menus";
import type { Plan, DatosCocinero, Dificultad, Receta } from "../types/models";

// ─── Selector de puntaje 1-10 (5+5 botones) ──────────────────────────────────

function SelectorPuntaje({
  valor, onChange, disabled,
}: { valor: number | null; onChange: (v: number) => void; disabled?: boolean }) {
  const fila = (nums: number[]) => (
    <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "center" }}>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          disabled={disabled}
          style={{
            width: 40, height: 40, borderRadius: "var(--radius-sm)",
            border: valor === n ? "2px solid var(--primary)" : "1px solid var(--border)",
            background: valor === n ? "var(--primary)" : "var(--surface-alt)",
            color: valor === n ? "#fff" : "var(--text)",
            fontWeight: valor === n ? "var(--fw-semibold)" : "normal",
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: "var(--fs-sm)",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {fila([1, 2, 3, 4, 5])}
      {fila([6, 7, 8, 9, 10])}
    </div>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

const DATOS_COCINERO_EMPTY: DatosCocinero = {
  ocasion: "",
  repetir: "",
  costoRealAprox: "",
  dificultadReal: "",
  queSalioBien: "",
  queCambiaria: "",
  notasFamiliares: "",
};

export function VotoRoute() {
  const { idPlan } = useParams<{ idPlan: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [componentesNombres, setComponentesNombres] = useState<Record<string, string>>({});
  const [ocasiones, setOcasiones] = useState<string[]>([]);
  const [dificultades, setDificultades] = useState<Dificultad[]>([]);
  const [loading, setLoading] = useState(true);

  const [puntaje, setPuntaje] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [datos, setDatos] = useState<DatosCocinero>(DATOS_COCINERO_EMPTY);
  const [puntajesComp, setPuntajesComp] = useState<Record<string, number | null>>({});
  const [mostrarComps, setMostrarComps] = useState(false);

  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idPlan) return;
    Promise.all([getPlan(idPlan), getDiccionarios()]).then(async ([p, dic]) => {
      setPlan(p);
      setOcasiones(dic.ocasiones ?? []);
      setDificultades(dic.dificultades ?? []);

      if (p?.tipoSeleccion === "menu" && p.componentesCocinados?.length) {
        const menu = await getMenu(p.idSeleccion);
        if (menu) {
          const recetas = await Promise.all(
            p.componentesCocinados.map((id) => getReceta(id))
          );
          const map: Record<string, string> = {};
          p.componentesCocinados.forEach((id, i) => {
            const r = recetas[i] as Receta | null;
            map[id] = r?.nombre ?? id;
          });
          setComponentesNombres(map);
          setMostrarComps(false);
        }
      }
      setLoading(false);
    });
  }, [idPlan]);

  function setDato<K extends keyof DatosCocinero>(k: K, v: DatosCocinero[K]) {
    setDatos((prev) => ({ ...prev, [k]: v }));
  }

  async function handleGuardar() {
    if (!idPlan || !plan || puntaje === null) return;
    setGuardando(true);
    setError(null);

    const puntajesComponentes: Record<string, number> = {};
    for (const [id, p] of Object.entries(puntajesComp)) {
      if (p !== null) puntajesComponentes[id] = p;
    }

    const r = await guardarEvaluacionJP(idPlan, {
      puntaje,
      comentario,
      datosCocinero: datos,
      ...(Object.keys(puntajesComponentes).length > 0 ? { puntajesComponentes } : {}),
    });

    if (r.ok) {
      navigate("/");
    } else {
      setError(r.error.message);
      setGuardando(false);
      setConfirmando(false);
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (loading) return <div className="card"><p className="meta">Cargando…</p></div>;

  if (!plan) {
    return (
      <div className="card">
        <p style={{ color: "var(--err-text)" }}>Plan no encontrado.</p>
        <button className="btn btn-secondary" onClick={() => navigate("/")} style={{ marginTop: "var(--space-3)" }}>
          Volver
        </button>
      </div>
    );
  }

  if (plan.estado === "Evaluada") {
    return (
      <div className="card">
        <p style={{ fontWeight: "var(--fw-semibold)", marginBottom: "var(--space-2)" }}>
          {plan.nombreSeleccion}
        </p>
        <p className="meta">Este plan ya fue evaluado y no se puede modificar.</p>
        <button className="btn btn-secondary" onClick={() => navigate("/")} style={{ marginTop: "var(--space-3)" }}>
          Volver al inicio
        </button>
      </div>
    );
  }

  if (plan.estado !== "Cocinada") {
    return (
      <div className="card">
        <p className="meta">
          El plan "{plan.nombreSeleccion}" está en estado "{plan.estado}".
          Solo se puede evaluar un plan en estado Cocinada.
        </p>
        <button className="btn btn-secondary" onClick={() => navigate("/")} style={{ marginTop: "var(--space-3)" }}>
          Volver
        </button>
      </div>
    );
  }

  const esMenu = plan.tipoSeleccion === "menu";
  const compsCocinados = plan.componentesCocinados ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ padding: "4px", display: "flex" }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)" }}>
          Evaluar — {plan.nombreSeleccion}
        </span>
      </div>

      {/* Puntaje */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <p style={{ fontWeight: "var(--fw-medium)", marginBottom: "var(--space-3)" }}>
          Tu puntaje (1-10)
        </p>
        <SelectorPuntaje valor={puntaje} onChange={setPuntaje} disabled={guardando} />
        {puntaje !== null && (
          <p className="meta" style={{ textAlign: "center", marginTop: "var(--space-2)" }}>
            {puntaje} / 10
          </p>
        )}
      </div>

      {/* Comentario */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <p style={{ fontWeight: "var(--fw-medium)", marginBottom: "var(--space-2)" }}>Comentario (opcional)</p>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          disabled={guardando}
          placeholder="¿Qué te pareció?"
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box", resize: "vertical",
            padding: "var(--space-2)", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)", background: "var(--surface-alt)",
            color: "var(--text)", fontSize: "var(--fs-sm)",
          }}
        />
      </div>

      {/* Datos del cocinero */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <p style={{ fontWeight: "var(--fw-medium)", marginBottom: "var(--space-3)" }}>Datos de la cocción</p>

        {/* Ocasión */}
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label className="meta" style={{ display: "block", marginBottom: "var(--space-1)" }}>Ocasión</label>
          <select
            value={datos.ocasion ?? ""}
            onChange={(e) => setDato("ocasion", e.target.value as DatosCocinero["ocasion"])}
            disabled={guardando}
            style={{
              width: "100%", padding: "var(--space-2)", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)", background: "var(--surface-alt)",
              color: "var(--text)", fontSize: "var(--fs-sm)",
            }}
          >
            <option value="">— Sin especificar —</option>
            {ocasiones.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Repetir */}
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label className="meta" style={{ display: "block", marginBottom: "var(--space-1)" }}>¿La repetirías?</label>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {(["Sí", "No", ""] as const).map((v) => (
              <button
                key={v || "nd"}
                type="button"
                onClick={() => setDato("repetir", v)}
                disabled={guardando}
                style={{
                  flex: 1, padding: "var(--space-2)", borderRadius: "var(--radius-sm)",
                  border: datos.repetir === v ? "2px solid var(--primary)" : "1px solid var(--border)",
                  background: datos.repetir === v ? "var(--primary)" : "var(--surface-alt)",
                  color: datos.repetir === v ? "#fff" : "var(--text)",
                  fontSize: "var(--fs-sm)", cursor: guardando ? "not-allowed" : "pointer",
                }}
              >
                {v || "NS/NC"}
              </button>
            ))}
          </div>
        </div>

        {/* Dificultad real */}
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label className="meta" style={{ display: "block", marginBottom: "var(--space-1)" }}>Dificultad real</label>
          <select
            value={datos.dificultadReal}
            onChange={(e) => setDato("dificultadReal", e.target.value as DatosCocinero["dificultadReal"])}
            disabled={guardando}
            style={{
              width: "100%", padding: "var(--space-2)", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)", background: "var(--surface-alt)",
              color: "var(--text)", fontSize: "var(--fs-sm)",
            }}
          >
            <option value="">— Sin especificar —</option>
            {dificultades.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Costo real */}
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label className="meta" style={{ display: "block", marginBottom: "var(--space-1)" }}>Costo aprox.</label>
          <input
            type="text"
            value={datos.costoRealAprox}
            onChange={(e) => setDato("costoRealAprox", e.target.value)}
            disabled={guardando}
            placeholder="ej. $8.000"
            style={{
              width: "100%", boxSizing: "border-box", padding: "var(--space-2)",
              borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
              background: "var(--surface-alt)", color: "var(--text)", fontSize: "var(--fs-sm)",
            }}
          />
        </div>

        {/* Qué salió bien */}
        {(["queSalioBien", "queCambiaria", "notasFamiliares"] as const).map((campo) => {
          const labels: Record<string, string> = {
            queSalioBien: "¿Qué salió bien?",
            queCambiaria: "¿Qué cambiarías?",
            notasFamiliares: "Notas para la familia",
          };
          return (
            <div key={campo} style={{ marginBottom: "var(--space-3)" }}>
              <label className="meta" style={{ display: "block", marginBottom: "var(--space-1)" }}>
                {labels[campo]}
              </label>
              <textarea
                value={datos[campo]}
                onChange={(e) => setDato(campo, e.target.value)}
                disabled={guardando}
                rows={2}
                style={{
                  width: "100%", boxSizing: "border-box", resize: "vertical",
                  padding: "var(--space-2)", borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)", background: "var(--surface-alt)",
                  color: "var(--text)", fontSize: "var(--fs-sm)",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Puntajes por componente (solo plan-menú) */}
      {esMenu && compsCocinados.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <button
            type="button"
            onClick={() => setMostrarComps((v) => !v)}
            style={{
              width: "100%", textAlign: "left", background: "none", border: "none",
              cursor: "pointer", padding: 0, display: "flex", justifyContent: "space-between",
            }}
          >
            <span style={{ fontWeight: "var(--fw-medium)" }}>Calificar componentes (opcional)</span>
            <span className="meta">{mostrarComps ? "▲" : "▼"}</span>
          </button>

          {mostrarComps && (
            <div style={{ marginTop: "var(--space-3)" }}>
              {compsCocinados.map((idReceta) => (
                <div key={idReceta} style={{ marginBottom: "var(--space-4)" }}>
                  <p className="meta" style={{ marginBottom: "var(--space-2)" }}>
                    {componentesNombres[idReceta] ?? idReceta}
                  </p>
                  <SelectorPuntaje
                    valor={puntajesComp[idReceta] ?? null}
                    onChange={(v) => setPuntajesComp((prev) => ({ ...prev, [idReceta]: v }))}
                    disabled={guardando}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: "var(--space-3)", padding: "var(--space-3)",
          background: "var(--err-bg, #fef2f2)", borderRadius: "var(--radius-sm)",
          border: "1px solid var(--err-line, #fca5a5)",
        }}>
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--err-text)" }}>{error}</p>
        </div>
      )}

      {/* Botón guardar con confirmación inline */}
      {confirmando ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          <p className="meta" style={{ textAlign: "center" }}>
            La evaluación es definitiva. El plan pasará a "Evaluada" y no se podrá editar.
          </p>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              className="btn btn-primary"
              onClick={handleGuardar}
              disabled={guardando || puntaje === null}
              style={{ flex: 1 }}
            >
              {guardando ? "Guardando…" : "Sí, guardar evaluación"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmando(false)}
              disabled={guardando}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primary"
          onClick={() => setConfirmando(true)}
          disabled={puntaje === null || guardando}
          style={{ width: "100%", marginBottom: "var(--space-4)" }}
        >
          Guardar evaluación
        </button>
      )}
    </>
  );
}
