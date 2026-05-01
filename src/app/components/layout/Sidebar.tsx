import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, FolderKanban, Users, CheckSquare,
  LogOut, Settings, ChevronRight, Shield, User
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", adminOnly: false },
  { to: "/projects", icon: FolderKanban, label: "Projects", adminOnly: false },
  { to: "/users", icon: Users, label: "Team Members", adminOnly: true },
  { to: "/activity", icon: Settings, label: "Activity Log", adminOnly: true },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
          <CheckSquare className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-white truncate">Team Task Manager</p>
          <p className="text-xs text-slate-400 truncate">Project workspace</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-3">Main Menu</p>
        {NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="px-3 pb-4 border-t border-slate-800 pt-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/60 mb-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            {isAdmin
              ? <Shield className="w-4 h-4 text-indigo-400" />
              : <User className="w-4 h-4 text-slate-400" />
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                isAdmin ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-700 text-slate-400"
              }`}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
