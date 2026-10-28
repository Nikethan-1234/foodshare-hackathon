import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ListPlus, List, Users, ClipboardList,
  Package, Flag, LogOut, Leaf, Building2, HeartHandshake, Inbox
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { clsx } from "../../utils/clsx";

const DONOR_LINKS = [
  { to: "/donor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/donor/listings", label: "My Listings", icon: List },
  { to: "/donor/requests", label: "Requests", icon: Inbox },
  { to: "/donor/listings/new", label: "New Listing", icon: ListPlus },
  { to: "/donor/profile", label: "Profile", icon: Building2 },
];

const RECIPIENT_LINKS = [
  { to: "/recipient/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/recipient/browse", label: "Browse Food", icon: Package },
  { to: "/recipient/requests", label: "My Requests", icon: ClipboardList },
  { to: "/recipient/profile", label: "Profile", icon: HeartHandshake },
];

const ADMIN_LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/listings", label: "Listings", icon: List },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/reports", label: "Reports", icon: Flag },
];

const ROLE_LINKS = { donor: DONOR_LINKS, recipient: RECIPIENT_LINKS, admin: ADMIN_LINKS };

export function Sidebar() {
  const { user, profile, logout } = useAuth();
  const links = ROLE_LINKS[user?.role] || [];

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-grey-200 fixed top-0 left-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-grey-200">
        <Leaf className="h-5 w-5 text-green-600" />
        <span className="text-base font-semibold text-grey-900">FoodShare</span>
        <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">DEMO</span>
      </div>
      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-0.5" aria-label="Main navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors min-h-[44px]",
                isActive
                  ? "bg-green-50 text-green-700"
                  : "text-grey-600 hover:bg-grey-50 hover:text-grey-900"
              )
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      {/* User */}
      <div className="border-t border-grey-200 p-3">
        <div className="text-xs text-grey-500 truncate mb-1">{profile?.organization_name || user?.email}</div>
        <div className="text-xs text-grey-400 capitalize mb-2">{user?.role}</div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-grey-600 hover:text-grey-900 w-full px-2 py-1.5 rounded hover:bg-grey-50 min-h-[44px]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
