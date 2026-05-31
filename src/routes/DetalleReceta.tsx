import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, X } from "lucide-react";
import { SkeletonHeader } from "../components/skeletons/SkeletonHeader";
import { SkeletonRow } from "../components/skeletons/SkeletonRow";
import { useAuth } from "../auth/useAuth";
import { getReceta, actualizarReceta } from "../data/recetas";
import { subscribeToPlanesActivos } from "../data/planes";
import { elegirComoEspecial, sumarComoExtra, sumarComoEnProceso } from "../data/planes";
import { evaluarEspecial, evaluarExtra, evaluarEnProceso } from "../lib/elegibilidad";
import { getSemanaActual, getSemanaFin } from "../lib/fechas";
import { MetaCards } from "../components/receta/MetaCards";
import { RecetaPill } from "../components/receta/RecetaPill";
import { IngredientesPorGondola } from "../components/receta/IngredientesPorGondola";
import { PasosPreview } from "../components/receta/PasosPreview";
import { AccionesPlan } from "../components/receta/AccionesPlan";
import { CocinarSticky } from "../components/receta/CocinarSticky";
import {
  COCINAS, ESCENARIOS, DIFICULTADES, COSTOS,
  APTO_NOCHE_DE_A_DOS, CLIMAS_PLATO, PENSADA_PARA,
  GRUPOS_PROTEINA, GRUPOS_PROTEINA_ORDEN,
} from "../types/models";
import type { Receta, Plan } from "../types/models";

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
      boxShadow: "0 4px 12px rgba(0,0,0,.18)", fontSize: "var(--fs-sm)",
      zIndex: 9999, maxWidth: "90vw", textAlign: "center",
    }}>
      {msg.text}
    </div>
  );
}

// ─── Confirmación ─────────────────────────────────────────────────────────────

function ConfirmDialog({
  mensaje, onConfirmar, onCancelar,
}: {
  mensaje: string;
  onConfirmar: () => void;
  onCancelar: () => void;
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

// ─── SectionTitle ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 style={{
      fontSize: "var(--fs-base)",
      fontWeight: "var(--fw-semibold)" as unknown as number,
      color: "var(--text-strong)",
      margin: "0 0 var(--space-3)",
    }}>
      {children}
    </h2>
  );
}

// ─── Bottom-sheet de clasificación ───────────────────────────────────────────

interface ClasificacionSheetProps {
  receta: Receta;
  onClose: () => void;
  onSaved: (patch: Partial<Receta>) => void;
}

function ClasificacionSheet({ receta, onClose, onSaved }: ClasificacionSheetProps) {
  const [cocina,           setCocina]           = useState<string>(receta.cocina ?? "");
  const [proteinaPrincipal,setProteinaPrincipal] = useState<string>(receta.proteinaPrincipal ?? "");
  const [escenarioUso,     setEscenarioUso]     = useState<string>(receta.escenarioUso ?? "");
  const [dificultad,       setDificultad]       = useState<string>(receta.dificultad ?? "");
  const [costoEstimado,    setCostoEstimado]    = useState<string>(receta.costoEstimado ?? "");
  const [aptoNoche,        setAptoNoche]        = useState<string>(receta.aptoNocheDeADos ?? "No");
  const [estilo,           setEstilo]           = useState<string>(receta.estilo ?? "");
  const [sinLacteos,       setSinLacteos]       = useState<boolean>(receta.sinLacteos ?? false);
  const [hidratos,         setHidratos]         = useState<boolean>(receta.hidratos ?? false);
  const [climaDelPlato,    setClimaDelPlato]    = useState<string>(receta.climaDelPlato ?? "");
  const [pensadaPara,      setPensadaPara]      = useState<string>(receta.pensadaPara ?? "");
  const [tecnica,          setTecnica]          = useState<string>(receta.tecnicaPrincipal ?? "");
  const [guardando,        setGuardando]        = useState(false);
  const [error,            setError]            = useState<string | null>(null);

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px", fontSize: "var(--fs-sm)",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--surface-strong)", color: "var(--text)", fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "var(--fs-xs)", color: "var(--muted)", marginBottom: "var(--space-1)",
  };

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    // Solo incluir strings no-vacíos; booleanos siempre
    const patch: Partial<Receta> = { sinLacteos, hidratos, aptoNocheDeADos: aptoNoche as Receta["aptoNocheDeADos"] };
    if (cocina)            patch.cocina            = cocina as Receta["cocina"];
    if (proteinaPrincipal) patch.proteinaPrincipal = proteinaPrincipal as Receta["proteinaPrincipal"];
    if (escenarioUso)      patch.escenarioUso      = escenarioUso as Receta["escenarioUso"];
    if (dificultad)        patch.dificultad        = dificultad as Receta["dificultad"];
    if (costoEstimado)     patch.costoEstimado     = costoEstimado as Receta["costoEstimado"];
    if (estilo.trim())     patch.estilo            = estilo.trim();
    if (climaDelPlato)     patch.climaDelPlato     = climaDelPlato as Receta["climaDelPlato"];
    if (pensadaPara)       patch.pensadaPara       = pensadaPara as Receta["pensadaPara"];
    if (tecnica.trim())    patch.tecnicaPrincipal  = tecnica.trim();

    const r = await actualizarReceta(receta.idReceta, patch);
    if (r.ok) {
      onSaved(patch);
    } else {
      setGuardando(false);
      setError(r.error.message);
    }
  }

  function SelectField({ label, value, onChange, options, placeholder }: {
    label: string; value: string; onChange: (v: string) => void;
    options: readonly string[]; placeholder: string;
  }) {
    return (
      <div style={{ marginBottom: "var(--space-3)" }}>
        <label style={labelStyle}>{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} style={fieldStyle}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100 }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 101,
        maxHeight: "90dvh", overflowY: "auto",
        background: "var(--surface)", borderRadius: "16px 16px 0 0",
        padding: "20px 20px calc(20px + env(safe-area-inset-bottom))",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
          <h3 style={{ margin: 0 }}>Editar clasificación</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <SelectField label="Cocina de origen" value={cocina} onChange={setCocina}
          options={COCINAS} placeholder="— Sin clasificar —" />
        {/* Proteína — select jerárquico con optgroup */}
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label style={labelStyle}>Proteína principal</label>
          <select value={proteinaPrincipal} onChange={e => setProteinaPrincipal(e.target.value)} style={fieldStyle}>
            <option value="">— Seleccionar —</option>
            {GRUPOS_PROTEINA_ORDEN.map(grupo => (
              <optgroup key={grupo} label={grupo}>
                {GRUPOS_PROTEINA[grupo].map(p => <option key={p} value={p}>{p}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <SelectField label="Escenario de uso" value={escenarioUso} onChange={setEscenarioUso}
          options={ESCENARIOS} placeholder="— Seleccionar —" />
        <SelectField label="Dificultad" value={dificultad} onChange={setDificultad}
          options={DIFICULTADES} placeholder="— Seleccionar —" />
        <SelectField label="Costo estimado" value={costoEstimado} onChange={setCostoEstimado}
          options={COSTOS} placeholder="— Seleccionar —" />
        <SelectField label="Apto noche de a dos" value={aptoNoche} onChange={setAptoNoche}
          options={APTO_NOCHE_DE_A_DOS} placeholder="— Seleccionar —" />
        <SelectField label="Clima del plato" value={climaDelPlato} onChange={setClimaDelPlato}
          options={CLIMAS_PLATO} placeholder="— Seleccionar —" />
        <SelectField label="Pensada para" value={pensadaPara} onChange={setPensadaPara}
          options={PENSADA_PARA} placeholder="— Seleccionar —" />

        <div style={{ marginBottom: "var(--space-3)" }}>
          <label style={labelStyle}>Estilo (texto libre)</label>
          <input type="text" value={estilo} onChange={e => setEstilo(e.target.value)} style={fieldStyle} />
        </div>
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label style={labelStyle}>Técnica principal (texto libre)</label>
          <input type="text" value={tecnica} onChange={e => setTecnica(e.target.value)} style={fieldStyle} />
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          {([
            { label: "Sin lácteos", value: sinLacteos, set: setSinLacteos },
            { label: "Con hidratos", value: hidratos,   set: setHidratos },
          ] as const).map(({ label, value, set }) => (
            <button
              key={label}
              onClick={() => set(!value)}
              style={{
                padding: "5px 12px", fontSize: "var(--fs-xs)", borderRadius: "var(--radius-full)",
                border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
                background: value ? "var(--primary)" : "var(--surface-strong)",
                color: value ? "var(--on-primary)" : "var(--text)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p style={{ color: "var(--err-text)", fontSize: "var(--fs-xs)", marginBottom: "var(--space-2)" }}>{error}</p>}

        <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando} style={{ width: "100%" }}>
          {guardando ? "Guardando…" : "Guardar clasificación"}
        </button>
      </div>
    </>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export function DetalleRecetaRoute() {
  const { id: idReceta } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();
  const isJP = state.status === "authenticated" && state.user.memberId === "juanpablo";

  const [receta, setReceta] = useState<Receta | null>(null);
  const [loadingReceta, setLoadingReceta] = useState(true);
  const [errorReceta, setErrorReceta] = useState<string | null>(null);

  const [planesActivos, setPlanesActivos] = useState<Plan[]>([]);
  const semanaInicio = getSemanaActual();
  const semanaFin = getSemanaFin(semanaInicio);

  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [confirm, setConfirm] = useState<{ mensaje: string; accion: () => void } | null>(null);
  const [loadingAccion, setLoadingAccion] = useState<"especial" | "extra" | "enproceso" | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Carga la receta
  useEffect(() => {
    if (!idReceta) return;
    getReceta(idReceta)
      .then((r) => {
        if (!r) setErrorReceta("Receta no encontrada.");
        else setReceta(r);
      })
      .catch(() => setErrorReceta("No se pudo cargar la receta."))
      .finally(() => setLoadingReceta(false));
  }, [idReceta]);

  // Suscripción a planes activos (solo JP)
  useEffect(() => {
    if (!isJP) return;
    const unsub = subscribeToPlanesActivos(semanaInicio, setPlanesActivos);
    return unsub;
  }, [isJP, semanaInicio]);

  const showToast = useCallback((text: string, ok: boolean) => {
    setToast({ text, ok });
  }, []);

  // ── Acciones ────────────────────────────────────────────────────────────────

  async function handleEspecial() {
    if (!receta) return;
    const { puede, razon, especialExistente } = evaluarEspecial(receta, planesActivos);
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
    if (!receta) return;
    setConfirm(null);
    setLoadingAccion("especial");
    const result = await elegirComoEspecial(receta, semanaInicio, semanaFin, especialExistente);
    setLoadingAccion(null);
    if (result.ok) showToast(`"${receta.nombre}" agregada como Especial.`, true);
    else showToast(result.error.message, false);
  }

  async function handleExtra() {
    if (!receta) return;
    const { puede, razon } = evaluarExtra(receta, planesActivos);
    if (!puede) { showToast(razon ?? "No se puede agregar como extra.", false); return; }
    setLoadingAccion("extra");
    const especial = planesActivos.find(p => p.tipoPlan === "Especial")!;
    const result = await sumarComoExtra(receta, especial, semanaInicio, semanaFin);
    setLoadingAccion(null);
    if (result.ok) showToast(`"${receta.nombre}" sumada como Especial extra.`, true);
    else showToast(result.error.message, false);
  }

  async function handleEnProceso() {
    if (!receta) return;
    const { puede, razon } = evaluarEnProceso(receta, planesActivos);
    if (!puede) { showToast(razon ?? "No se puede agregar como En proceso.", false); return; }
    setLoadingAccion("enproceso");
    const result = await sumarComoEnProceso(receta, semanaInicio, semanaFin);
    setLoadingAccion(null);
    if (result.ok) showToast(`"${receta.nombre}" sumada como En proceso.`, true);
    else showToast(result.error.message, false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingReceta) {
    return (
      <div className="card">
        <SkeletonHeader />
        <div style={{ marginTop: "var(--space-4)" }}>
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  if (errorReceta || !receta) {
    return (
      <div className="card">
        <p style={{ color: "var(--err-text)" }}>{errorReceta ?? "Receta no encontrada."}</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: "var(--space-3)" }}>
          Volver
        </button>
      </div>
    );
  }

  const elegEspecial = evaluarEspecial(receta, planesActivos);
  const elegExtra = evaluarExtra(receta, planesActivos);
  const elegEnProceso = evaluarEnProceso(receta, planesActivos);

  return (
    <div>
      {/* 1. Header con volver + chip tipo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        marginBottom: "var(--space-3)",
      }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ padding: "4px", display: "flex", alignItems: "center" }}
          aria-label="Volver"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="meta">{receta.tipoItem}</span>
      </div>

      {/* 2. Título + porQueEspecial */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
          <h1 style={{
            flex: 1,
            fontSize: 24,
            fontWeight: 700,
            color: "var(--text-strong)",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            margin: "0 0 var(--space-2)",
          }}>
            {receta.nombre}
          </h1>
          {isJP && (
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Editar clasificación"
              style={{
                flexShrink: 0, marginTop: 4,
                background: "none", border: "none", cursor: "pointer",
                color: "var(--muted)", padding: 4, display: "flex",
              }}
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
        {receta.porQueEspecial && (
          <p style={{
            fontSize: "var(--fs-sm)",
            color: "var(--muted-strong)",
            fontStyle: "italic",
            margin: 0,
          }}>
            {receta.porQueEspecial}
          </p>
        )}
      </div>

      {/* 3. MetaCards */}
      <MetaCards
        tiempoTotalLabel={receta.tiempoTotalLabel}
        tiempoActivoLabel={receta.tiempoActivoLabel}
        porcionesLabel={receta.porcionesLabel}
        dificultad={receta.dificultad}
      />

      {/* 4. Acciones JP — plegadas, arriba de las pills */}
      {isJP && (
        <AccionesPlan
          elegEspecial={elegEspecial}
          elegExtra={elegExtra}
          elegEnProceso={elegEnProceso}
          loadingAccion={loadingAccion}
          onEspecial={() => void handleEspecial()}
          onExtra={() => void handleExtra()}
          onEnProceso={() => void handleEnProceso()}
        />
      )}

      {/* 5. Pills */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-2)",
        marginBottom: "var(--space-5)",
      }}>
        {receta.proteinaPrincipal && (
          <RecetaPill label={receta.proteinaPrincipal} variant="accent" />
        )}
        {receta.escenarioUso && <RecetaPill label={receta.escenarioUso} />}
        {receta.estilo && <RecetaPill label={receta.estilo} />}
        {receta.tecnicaPrincipal && <RecetaPill label={receta.tecnicaPrincipal} />}
        {receta.costoEstimado && <RecetaPill label={`Costo ${receta.costoEstimado}`} />}
        {receta.sinLacteos && <RecetaPill label="Sin lácteos" variant="ok" />}
        {!receta.hidratos && <RecetaPill label="Sin hidratos" variant="info" />}
        {receta.aptoNocheDeADos === "Sí" && <RecetaPill label="Noche de a dos ✓" variant="info" />}
        {receta.cocina
          ? <RecetaPill label={receta.cocina} />
          : isJP && (
            <button
              onClick={() => setSheetOpen(true)}
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "3px 10px", borderRadius: "var(--radius-full)",
                fontSize: "var(--fs-xs)", fontWeight: 600, cursor: "pointer",
                background: "var(--warn-bg)", color: "var(--warn-text)",
                border: "1px dashed var(--warn-line)", fontFamily: "inherit",
              }}
            >
              Sin clasificar · completar
            </button>
          )
        }
      </div>

      {/* 6. Ingredientes */}
      {receta.ingredientes.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <SectionTitle>Ingredientes</SectionTitle>
          <IngredientesPorGondola ingredientes={receta.ingredientes} />
        </div>
      )}

      {/* 7. Preparación */}
      {receta.pasos.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <SectionTitle>Preparación</SectionTitle>
          <PasosPreview pasos={receta.pasos} riesgos={receta.riesgos} />
        </div>
      )}

      {/* 8. Tip del cocinero */}
      {receta.notas && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <SectionTitle>Tip del cocinero</SectionTitle>
          <p style={{
            fontSize: "var(--fs-sm)",
            color: "var(--muted-strong)",
            fontStyle: "italic",
            margin: 0,
            lineHeight: 1.55,
          }}>
            {receta.notas}
          </p>
        </div>
      )}

      {/* 9. Sticky bottom Cocinar (solo JP) */}
      {isJP && (
        <CocinarSticky onClick={() => navigate(`/recetas/${idReceta}/cocinar`)} />
      )}

      {/* Sheet de clasificación */}
      {sheetOpen && receta && (
        <ClasificacionSheet
          key={receta.idReceta}
          receta={receta}
          onClose={() => setSheetOpen(false)}
          onSaved={(patch) => {
            setReceta((prev) => prev ? { ...prev, ...patch } : prev);
            setSheetOpen(false);
            showToast("Clasificación guardada.", true);
          }}
        />
      )}

      {/* Modal de confirmación */}
      {confirm && (
        <ConfirmDialog
          mensaje={confirm.mensaje}
          onConfirmar={confirm.accion}
          onCancelar={() => setConfirm(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
