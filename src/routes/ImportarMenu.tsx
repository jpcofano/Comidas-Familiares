import { useState, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { parseMenuTxt } from "../import/parseMenu";
import { resolverEImportarMenu } from "../data/menus";

type ImportState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success"; idMenu: string; nombre: string; componentes: number }
  | { phase: "duplicate"; idMenu: string; nombre: string }
  | { phase: "error"; errors: string[] };

const PLACEHOLDER = `#MENU
nombre: Español de mar
escenarioUso: Noche de a dos
estilo: Español / mediterráneo
estado: Para probar
aptoNocheDeADos: Sí
hidratoOpcional: Arroz blanco o pan aparte
paraJuanPablo: Zarzuela sola, sin arroz ni pan
paraFamilia: Arroz blanco o pan para acompañar
notas: Muy especial

#COMPONENTES
orden | tipo        | idReceta_o_nombre           | obligatorio | notas
1     | Entrada     | Langostinos al ajillo       | Sí          | Sin manteca
2     | Principal   | REC-0102                    | Sí          |
3     | Postre      | Frutas asadas con canela    | No          |`;

export function ImportarMenuRoute() {
  const { state } = useAuth();
  const [txt, setTxt] = useState("");
  const [importState, setImportState] = useState<ImportState>({ phase: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  if (state.status !== "authenticated" || state.user.memberId !== "juanpablo") {
    return <Navigate to="/" replace />;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setTxt(ev.target?.result as string ?? "");
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  async function handleImport() {
    const parseResult = parseMenuTxt(txt);
    if (!parseResult.ok) {
      setImportState({ phase: "error", errors: parseResult.errors });
      return;
    }

    setImportState({ phase: "loading" });
    const result = await resolverEImportarMenu(parseResult.menu);

    if (!result.ok) {
      if (result.error.code === "menu-duplicate") {
        const cause = result.error.cause as { idMenu: string };
        setImportState({
          phase: "duplicate",
          idMenu: cause?.idMenu ?? "?",
          nombre: parseResult.menu.nombre,
        });
      } else {
        setImportState({
          phase: "error",
          errors: [result.error.message],
        });
      }
      return;
    }

    setImportState({
      phase: "success",
      idMenu: result.value.idMenu,
      nombre: result.value.nombreMenu,
      componentes: result.value.componentes.length,
    });
    setTxt("");
  }

  const isLoading = importState.phase === "loading";

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <Link to="/" style={{ fontSize: "0.875rem", color: "var(--color-primary)" }}>← Inicio</Link>
        <h2 style={{ margin: 0 }}>Importar menú</h2>
      </div>

      <p className="meta" style={{ marginBottom: "1rem" }}>
        Pegá el TXT con formato <code>#MENU</code> + <code>#COMPONENTES</code>, o subí un archivo .txt.
      </p>

      <textarea
        value={txt}
        onChange={e => setTxt(e.target.value)}
        placeholder={PLACEHOLDER}
        disabled={isLoading}
        rows={18}
        style={{
          width: "100%",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          padding: "0.75rem",
          border: "1px solid #ddd",
          borderRadius: "6px",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
        <button
          className="btn-secondary"
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
        >
          Subir .txt
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          onChange={handleFile}
          style={{ display: "none" }}
        />
        <button
          className="btn-primary"
          onClick={handleImport}
          disabled={isLoading || !txt.trim()}
        >
          {isLoading ? "Importando…" : "Importar"}
        </button>
        {txt && !isLoading && (
          <button
            className="btn-secondary"
            onClick={() => { setTxt(""); setImportState({ phase: "idle" }); }}
          >
            Limpiar
          </button>
        )}
      </div>

      {importState.phase === "success" && (
        <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#e6f9ec", borderRadius: "6px", borderLeft: "4px solid #2e7d32" }}>
          <strong>Menú importado</strong>
          <p style={{ margin: "0.25rem 0 0" }}>
            <strong>{importState.idMenu}</strong> — "{importState.nombre}" ({importState.componentes} componentes)
          </p>
        </div>
      )}

      {importState.phase === "duplicate" && (
        <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#fff8e1", borderRadius: "6px", borderLeft: "4px solid #f9a825" }}>
          <strong>Menú duplicado</strong>
          <p style={{ margin: "0.25rem 0 0" }}>
            Ya existe un menú con este nombre ({importState.idMenu}). No se creó uno nuevo.
          </p>
        </div>
      )}

      {importState.phase === "error" && (
        <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#fdecea", borderRadius: "6px", borderLeft: "4px solid #c62828" }}>
          <strong>Errores de validación</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
            {importState.errors.map((e, i) => <li key={i} style={{ marginBottom: "0.25rem" }}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
