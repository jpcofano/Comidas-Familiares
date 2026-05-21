import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export function BibliotecaRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useAuth();
  const tab = searchParams.get("tab") ?? "recetas";

  const isJP =
    state.status === "authenticated" && state.user.memberId === "juanpablo";

  return (
    <>
      <div className="tabs">
        <button
          className={tab === "recetas" ? "tab active" : "tab"}
          onClick={() => setSearchParams({ tab: "recetas" })}
        >
          Recetas
        </button>
        <button
          className={tab === "menus" ? "tab active" : "tab"}
          onClick={() => setSearchParams({ tab: "menus" })}
        >
          Menús
        </button>
        {isJP && tab === "recetas" && (
          <Link to="/biblioteca/importar" className="tab-action">
            + Importar
          </Link>
        )}
      </div>

      <div className="card">
        {tab === "recetas" ? (
          <>
            <h2>Recetas</h2>
            <p>Esta sección llega en Etapa 3.</p>
            <p className="meta">
              Va a mostrar las 78 recetas seedeadas con filtros por proteína,
              tipo, sin lácteos, sin hidratos.
            </p>
          </>
        ) : (
          <>
            <h2>Menús</h2>
            <p>Esta sección llega en Etapa 3.</p>
            <p className="meta">
              Va a mostrar los 5 menús compuestos por recetas (modelo M).
              Tiempos y dificultad se derivan al vuelo de las componentes.
            </p>
          </>
        )}
      </div>
    </>
  );
}
