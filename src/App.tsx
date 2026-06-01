import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import { LoginScreen } from "./auth/LoginScreen";
import { UnauthorizedScreen } from "./auth/UnauthorizedScreen";
import { AppShell } from "./layout/AppShell";
import { HomeRoute } from "./routes/Home";
import { BibliotecaRoute } from "./routes/Biblioteca";
import { ImportarRecetaRoute } from "./routes/ImportarReceta";
import { CatalogoIngredientesRoute } from "./routes/CatalogoIngredientes";
import { DetalleRecetaRoute } from "./routes/DetalleReceta";
import { CocinarRoute } from "./routes/Cocinar";
import { SeleccionarComponenteMenuRoute } from "./routes/SeleccionarComponenteMenu";
import { DetalleMenuRoute } from "./routes/DetalleMenu";
import { ImportarMenuRoute } from "./routes/ImportarMenu";
import { ComprasRoute } from "./routes/Compras";
import { HistorialRoute } from "./routes/Historial";
import { HistorialDetalleRoute } from "./routes/HistorialDetalle";
import { VotoRoute } from "./routes/Voto";
import { QueCocinoRoute } from "./routes/QueCocino";
import { VisibilidadBibliotecaRoute } from "./routes/VisibilidadBiblioteca";
import { NotFoundRoute } from "./routes/NotFound";

function JPOnly({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  if (state.status === "authenticated" && state.user.memberId !== "juanpablo") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return <div className="loading-screen">Cargando…</div>;
  }
  if (state.status === "unauthenticated") {
    return <LoginScreen />;
  }
  if (state.status === "unauthorized") {
    return <UnauthorizedScreen email={state.email} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/biblioteca" element={<BibliotecaRoute />} />
          <Route path="/biblioteca/importar" element={<ImportarRecetaRoute />} />
          <Route path="/biblioteca/catalogo" element={<CatalogoIngredientesRoute />} />
          <Route path="/biblioteca/visibilidad" element={<VisibilidadBibliotecaRoute />} />
          <Route path="/recetas/:id" element={<DetalleRecetaRoute />} />
          <Route path="/recetas/:id/cocinar" element={<CocinarRoute />} />
          <Route path="/planes/:idPlan/cocinar/:idReceta" element={<CocinarRoute />} />
          <Route path="/planes/:idPlan/componentes" element={<SeleccionarComponenteMenuRoute />} />
          <Route path="/menus/importar" element={<ImportarMenuRoute />} />
          <Route path="/menus/:id" element={<JPOnly><DetalleMenuRoute /></JPOnly>} />
          <Route path="/pendientes" element={<Navigate to="/" replace />} />
          <Route path="/compras" element={<ComprasRoute />} />
          <Route path="/historial" element={<HistorialRoute />} />
          <Route path="/historial/:idHist" element={<HistorialDetalleRoute />} />
          <Route path="/voto/:idPlan" element={<VotoRoute />} />
          <Route path="/que-cocino" element={<QueCocinoRoute />} />
          <Route path="*" element={<NotFoundRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
