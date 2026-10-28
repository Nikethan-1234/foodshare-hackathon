import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { RequireAuth } from "../auth/RequireAuth";

export function AppLayout({ roles }) {
  return (
    <RequireAuth roles={roles}>
      <div className="flex min-h-screen bg-grey-50">
        <Sidebar />
        <main className="flex-1 md:ml-56 pb-16 md:pb-0 min-w-0">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </RequireAuth>
  );
}
