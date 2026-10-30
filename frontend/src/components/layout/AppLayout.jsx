import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { RequireAuth } from "../auth/RequireAuth";
import { LanguageToggle } from "../ui/LanguageToggle";

export function AppLayout({ roles }) {
  return (
    <RequireAuth roles={roles}>
      <div className="flex min-h-screen bg-grey-50">
        <Sidebar />
        <main className="flex-1 md:ml-56 pb-16 md:pb-0 min-w-0">
          {/* Mobile language bar */}
          <div className="md:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-grey-200">
            <span className="text-xs font-semibold text-grey-700">Language:</span>
            <LanguageToggle />
          </div>
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </RequireAuth>
  );
}
