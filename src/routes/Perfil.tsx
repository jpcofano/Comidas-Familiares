import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { useColorMiembro, usePerfiles } from "../contexts/PerfilesContext";
import { setColorMiembro, addPreferencia, removePreferencia, setFotoMiembro } from "../data/perfiles";
import { comprimirImagen } from "../lib/comprimirImagen";
import { getHistorialReciente } from "../data/historial";
import { getVisibilidad } from "../data/visibilidad";
import { getRecetas } from "../data/recetas";
import { MemberAvatar } from "../components/MemberAvatar";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import { MIEMBRO_IDS } from "../types/models";
import type { MiembroId, Historial } from "../types/models";

const NOMBRE_MIEMBRO: Record<MiembroId, string> = {
  juanpablo: "Juan Pablo",
  maria:     "María",
  sofia:     "Sofía",
  federico:  "Federico",
};

// Paleta ampliada — 12 tonos cálidos, todos legibles con texto blanco.
const PALETA = [
  "#8a4a2f", "#a8552e", "#b3701f", "#7a5c1e", // tierras / ocres
  "#2e5d2e", "#3f6b46", "#2f6f6a", "#3c4a6e", // verdes / teal / azul
  "#5a3e7a", "#74324a", "#9a3d5a", "#8a3520", // violeta / bordó / rojo
];

const PREFERENCIAS_SUGERIDAS = [
  "Sin gluten", "Sin lactosa", "Vegetariano", "Vegano",
  "No come pescado", "No come mariscos", "No come cerdo",
  "Sin picante", "Sin maní",
];

// ─── Ruta ─────────────────────────────────────────────────────────────────────

export function PerfilRoute() {
  const { memberId: paramId } = useParams<{ memberId?: string }>();
  const { state } = useAuth();

  if (state.status !== "authenticated") return <Navigate to="/" replace />;

  const selfId = state.user.memberId as MiembroId;
  const isJP = selfId === "juanpablo";

  // No-owner: solo su propio perfil
  const targetId: MiembroId = isJP && paramId && MIEMBRO_IDS.includes(paramId as MiembroId)
    ? (paramId as MiembroId)
    : selfId;

  // Si no-owner intenta acceder a perfil ajeno → redirect
  if (!isJP && paramId && paramId !== selfId) {
    return <Navigate to="/perfil" replace />;
  }

  return <PerfilView selfId={selfId} targetId={targetId} isJP={isJP} />;
}

// ─── Vista de perfil ──────────────────────────────────────────────────────────

function PerfilView({
  selfId, targetId, isJP,
}: {
  selfId: MiembroId;
  targetId: MiembroId;
  isJP: boolean;
}) {
  const navigate = useNavigate();
  const perfiles = usePerfiles();
  const colorTarget = useColorMiembro(targetId);
  const { canInstall, promptInstall, isIOS, isStandalone } = useInstallPrompt();

  const perfil = perfiles[targetId] ?? {};
  const preferencias: string[] = perfil.preferencias ?? [];

  // Stats
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [bibliotecaCount, setBibliotecaCount] = useState<number | null>(null);
  const [totalRecetas, setTotalRecetas] = useState<number | null>(null);

  // Color: selección optimista + error visible
  const [colorError, setColorError] = useState<string | null>(null);
  const [colorPend, setColorPend] = useState<string | null>(null);

  // Foto
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [fotoPending, setFotoPending] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);

  useEffect(() => {
    getHistorialReciente().then(r => { if (r.ok) setHistorial(r.value); });
    if (isJP && targetId === "juanpablo") {
      getRecetas().then(rs => setTotalRecetas(rs.length));
    } else {
      getVisibilidad().then(v => setBibliotecaCount(((v as unknown as Record<string, string[]>)[targetId] ?? []).length));
    }
  }, [targetId, isJP]);

  // Resetear estado de color/foto al cambiar de miembro
  useEffect(() => { setColorPend(null); setColorError(null); setFotoError(null); }, [targetId]);

  async function elegirColor(hex: string) {
    setColorError(null);
    setColorPend(hex);                       // resalta la selección al instante
    const r = await setColorMiembro(targetId, hex);
    if (!r.ok) {
      setColorPend(null);                    // revertí el resaltado
      setColorError(
        "No se pudo guardar el color. Si no sos el dueño del plan, " +
        "puede faltar deployar las reglas de Firestore (config/perfiles)."
      );
    }
  }
  const colorSel = colorPend ?? colorTarget; // valor mostrado mientras viaja al server

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoError(null);
    setFotoPending(true);
    try {
      const dataUrl = await comprimirImagen(file, { maxLado: 128, presupuesto: 60_000 });
      const r = await setFotoMiembro(targetId, dataUrl);
      if (!r.ok) setFotoError("No se pudo guardar la foto.");
    } catch (err) {
      setFotoError(err instanceof Error ? err.message : "Error al procesar la foto.");
    } finally {
      setFotoPending(false);
      e.target.value = "";
    }
  }

  async function handleQuitarFoto() {
    setFotoError(null);
    setFotoPending(true);
    const r = await setFotoMiembro(targetId, null);
    setFotoPending(false);
    if (!r.ok) setFotoError("No se pudo quitar la foto.");
  }

  const misEntradas = useMemo(
    () => historial.filter(e => e.calificaciones?.[targetId] != null),
    [historial, targetId],
  );
  const platosCalificados = misEntradas.length;
  const miPromedio = platosCalificados > 0
    ? (misEntradas.reduce((s, e) => s + (e.calificaciones[targetId] ?? 0), 0) / platosCalificados)
    : null;
  const ultimosPlatos = misEntradas.slice(0, 3);
  const enBiblioteca = targetId === "juanpablo" ? totalRecetas : bibliotecaCount;

  // Preferencias input
  const [nuevaPref, setNuevaPref] = useState("");
  const canEdit = isJP || targetId === selfId;

  async function handleAddPref(texto: string) {
    const t = texto.trim();
    if (!t || preferencias.includes(t)) return;
    setNuevaPref("");
    await addPreferencia(targetId, t);
  }

  return (
    <>
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
          {targetId === selfId ? "Tu perfil" : `Perfil de ${NOMBRE_MIEMBRO[targetId]}`}
        </h1>
      </div>

      {/* Selector de miembros (solo owner) */}
      {isJP && (
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", marginBottom: "var(--space-4)" }}>
          {MIEMBRO_IDS.map(mid => (
            <button
              key={mid}
              onClick={() => navigate(mid === selfId ? "/perfil" : `/perfil/${mid}`)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer", padding: 4,
              }}
            >
              <span style={{
                borderRadius: "50%",
                outline: targetId === mid ? `2px solid var(--primary)` : "none",
                outlineOffset: 2,
              }}>
                <MemberAvatar name={NOMBRE_MIEMBRO[mid]} memberId={mid} size={36} />
              </span>
              <span style={{
                fontSize: "var(--fs-xs)",
                color: targetId === mid ? "var(--primary)" : "var(--muted)",
                fontWeight: targetId === mid ? 700 : 400,
              }}>
                {NOMBRE_MIEMBRO[mid].split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Hero */}
      <div className="card" style={{ textAlign: "center", marginBottom: "var(--space-3)", padding: "var(--space-6) var(--space-4) var(--space-4)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "var(--space-3)", gap: 6 }}>
          {canEdit ? (
            <button
              onClick={() => fotoInputRef.current?.click()}
              disabled={fotoPending}
              style={{ background: "none", border: "none", cursor: fotoPending ? "default" : "pointer", padding: 0 }}
              aria-label="Cambiar foto de perfil"
            >
              <MemberAvatar name={NOMBRE_MIEMBRO[targetId]} memberId={targetId} size={64} />
            </button>
          ) : (
            <MemberAvatar name={NOMBRE_MIEMBRO[targetId]} memberId={targetId} size={64} />
          )}
          {canEdit && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={() => fotoInputRef.current?.click()}
                disabled={fotoPending}
                style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
              >
                {fotoPending ? "Procesando…" : "Cambiar foto"}
              </button>
              {!!perfiles[targetId]?.fotoUrl && !fotoPending && (
                <button
                  onClick={() => void handleQuitarFoto()}
                  style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                >
                  Quitar foto
                </button>
              )}
            </div>
          )}
          {fotoError && (
            <p style={{ color: "var(--err-text)", fontSize: "var(--fs-xs)", margin: 0, textAlign: "center" }}>
              {fotoError}
            </p>
          )}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px" }}>
          {NOMBRE_MIEMBRO[targetId]}
        </h2>
        <p className="meta" style={{ margin: "0 0 var(--space-4)" }}>
          {targetId === selfId ? "Tu perfil" : (isJP ? "Perfil · planificás vos" : "")}
        </p>

        {/* Swatches de color (solo si puede editar) */}
        {canEdit && (
          <div>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginBottom: "var(--space-2)" }}>Color del avatar</p>
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "center", flexWrap: "wrap" }}>
              {PALETA.map(hex => (
                <button
                  key={hex}
                  onClick={() => void elegirColor(hex)}
                  aria-label={`Color ${hex}`}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: hex,
                    border: "none",
                    outline: colorSel === hex ? "3px solid var(--primary)" : "2px solid transparent",
                    outlineOffset: 2,
                    cursor: "pointer",
                    transition: "outline 120ms ease",
                  }}
                />
              ))}
            </div>
            {colorError && (
              <p style={{ color: "var(--err-text)", fontSize: "var(--fs-xs)", marginTop: "var(--space-2)" }}>
                {colorError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        {[
          { label: "Calificó", value: platosCalificados, sub: "platos" },
          { label: "Promedio", value: miPromedio != null ? miPromedio.toFixed(1) : "—", sub: "su nota" },
          { label: "Biblioteca", value: enBiblioteca ?? "…", sub: targetId === "juanpablo" ? "recetas" : "recetas asignadas" },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: "var(--space-3)",
            background: "var(--surface-strong)", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)", textAlign: "center",
          }}>
            <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</p>
            <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 700, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Preferencias */}
      <div className="card" style={{ marginBottom: "var(--space-3)" }}>
        <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: "0 0 var(--space-3)", fontSize: "var(--fs-sm)" }}>
          Preferencias de comida
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: preferencias.length > 0 ? "var(--space-3)" : 0 }}>
          {preferencias.map(p => (
            <span key={p} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 999,
              background: "var(--surface-alt)", border: "1px solid var(--border)",
              fontSize: "var(--fs-xs)", color: "var(--text)",
            }}>
              {p}
              {canEdit && (
                <button
                  onClick={() => void removePreferencia(targetId, p)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1 }}
                  aria-label={`Quitar ${p}`}
                >×</button>
              )}
            </span>
          ))}
          {preferencias.length === 0 && (
            <p className="meta" style={{ margin: 0 }}>Sin preferencias registradas.</p>
          )}
        </div>
        {canEdit && (
          <div>
            <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
              <input
                type="text"
                placeholder="Agregar preferencia…"
                value={nuevaPref}
                onChange={e => setNuevaPref(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void handleAddPref(nuevaPref); }}
                style={{
                  flex: 1, padding: "7px 10px",
                  borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
                  fontSize: "var(--fs-sm)", background: "var(--surface-strong)", color: "var(--text)",
                }}
              />
              <button
                className="btn btn-secondary"
                onClick={() => void handleAddPref(nuevaPref)}
                style={{ fontSize: "var(--fs-sm)", whiteSpace: "nowrap" }}
              >
                Agregar
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
              {PREFERENCIAS_SUGERIDAS.filter(s => !preferencias.includes(s)).map(s => (
                <button
                  key={s}
                  onClick={() => void addPreferencia(targetId, s)}
                  style={{
                    padding: "3px 8px", borderRadius: 999, fontSize: "var(--fs-xs)",
                    border: "1px dashed var(--border)", background: "transparent",
                    color: "var(--muted)", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Últimos platos calificados */}
      {ultimosPlatos.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: "0 0 var(--space-3)", fontSize: "var(--fs-sm)" }}>
            Últimos platos calificados
          </p>
          {ultimosPlatos.map((e, idx) => (
            <div
              key={e.idHist}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "var(--space-2) 0",
                borderTop: idx === 0 ? "none" : "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--text-strong)" }}>{e.nombreSeleccion}</p>
                <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--muted)" }}>{e.fechaRealizada}</p>
              </div>
              <span style={{
                fontSize: 16, fontWeight: 700, color: colorTarget,
                fontVariantNumeric: "tabular-nums", flexShrink: 0,
              }}>
                {e.calificaciones[targetId]}
              </span>
            </div>
          ))}
          <button
            className="btn btn-ghost"
            onClick={() => navigate("/historial")}
            style={{ fontSize: "var(--fs-sm)", color: "var(--primary)", marginTop: "var(--space-2)", padding: 0 }}
          >
            Ver historial completo →
          </button>
        </div>
      )}

      {/* Instalar app — visible para el miembro logueado (a menos que ya corra instalada) */}
      {targetId === selfId && !isStandalone && (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
          <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: "0 0 4px", fontSize: "var(--fs-sm)" }}>
            Instalar la app
          </p>
          <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
            Agregala a tu pantalla de inicio para abrirla como app, sin la barra del navegador.
          </p>
          {canInstall ? (
            <button
              className="btn btn-primary"
              onClick={() => void promptInstall()}
              style={{ width: "100%" }}
            >
              Instalar app
            </button>
          ) : isIOS ? (
            <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--text)" }}>
              En iPhone: tocá <strong>Compartir</strong> y después <strong>"Agregar a inicio"</strong>.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
              Abrí el menú del navegador (⋮) y elegí <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong>.
            </p>
          )}
        </div>
      )}

      {/* Notificaciones (placeholder) */}
      <div className="card">
        <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", margin: "0 0 4px", fontSize: "var(--fs-sm)" }}>
          Notificaciones
        </p>
        <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
          Próximamente
        </p>
        {[
          "Avisos de compra",
          "Recordatorio de cocción",
          "Recordatorio de votar",
        ].map(label => (
          <div
            key={label}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "var(--space-2) 0",
              borderTop: "1px solid var(--border-subtle)",
              opacity: 0.45,
            }}
          >
            <span style={{ fontSize: "var(--fs-sm)", color: "var(--text)" }}>{label}</span>
            <span style={{
              width: 36, height: 20, borderRadius: 10,
              background: "var(--border)", display: "inline-block",
            }} />
          </div>
        ))}
      </div>

      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => void handleFotoChange(e)}
      />
    </>
  );
}
