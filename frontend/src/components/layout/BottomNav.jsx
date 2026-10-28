import { NavLink } from "react-router-dom";
import { LayoutDashboard, List, ListPlus, Package, ClipboardList, Users, Flag, Building2, HeartHandshake, Inbox } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { clsx } from "../../utils/clsx";

const DONOR_TABS = [
  { to: "/donor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/donor/listings", label: "Listings", icon: List },
  { to: "/donor/requests", label: "Requests", icon: Inbox },
  { to: "/donor/listings/new", label: "New", icon: ListPlus },
  { to: "/donor/profile", label: "Profile", icon: Building2 },
];

const RECIPIENT_TABS = [
  { to: "/recipient/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/recipient/browse", label: "Browse", icon: Package },
  { to: "/recipient/requests", label: "Requests", icon: ClipboardList },
  { to: "/recipient/profile", label: "Profile", icon: HeartHandshake },
];

const ADMIN_TABS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/listings", label: "Listings", icon: List },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/reports", label: "Reports", icon: Flag },
];

const ROLE_TABS = { donor: DONOR_TABS, recipient: RECIPIENT_TABS, admin: ADMIN_TABS };

export function BottomNav() {
  const { user } = useAuth();
  const tabs = ROLE_TABS[user?.role] || [];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-grey-200 z-30 safe-bottom"
      aria-label="Bottom navigation"
    >
      <div className="flex">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors min-h-[56px]",
                isActive ? "text-green-600" : "text-grey-500"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
