import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import "./AppShell.css";

export function AppShell() {
  return (
    <>
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
