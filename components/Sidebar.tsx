"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  UserCheck,
  FolderKanban,
  DollarSign,
  LogOut,
  Menu,
  X,
  Zap,
  Users2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ADMIN_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/leads", label: "Leads", icon: Users2 },
  { href: "/dashboard/clients", label: "Clients", icon: UserCheck },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/commissions", label: "Commissions", icon: DollarSign },
  { href: "/dashboard/team", label: "Team", icon: Users },
];

const MEMBER_NAV = [
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logOut, user, appUser, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = isAdmin ? ADMIN_NAV : MEMBER_NAV;

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-100">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-600/10">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Rizvi CRM</p>
          <p className="text-xs text-slate-400">Sales Dashboard</p>
        </div>
      </div>

      {/* Role badge */}
      {appUser && (
        <div className="px-5 pt-4 pb-2">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isAdmin
              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}>
            <ShieldCheck size={11} />
            {isAdmin ? "Admin" : "Team Member"}
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-150 group
                ${isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >
              <Icon
                size={18}
                className={isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-4 py-4 border-t border-slate-100">
        {user && (
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200/80 h-screen sticky top-0 shrink-0">
        <NavContent />
      </aside>

      {/* Mobile Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-slate-200/80 rounded-xl text-slate-700 shadow-sm hover:bg-slate-50"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-white border-r border-slate-200/80 h-full z-50">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
