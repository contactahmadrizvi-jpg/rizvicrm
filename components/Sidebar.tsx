"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FolderKanban,
  DollarSign,
  LogOut,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/clients", label: "Clients", icon: UserCheck },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/commissions", label: "Commissions", icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logOut, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Rizvi CRM</p>
          <p className="text-xs text-slate-400">Sales Dashboard</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-150 group
                ${isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <Icon size={18} className={isActive ? "text-white" : "text-slate-500 group-hover:text-white"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-4 py-4 border-t border-white/10">
        {user && (
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
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
      <aside className="hidden lg:flex flex-col w-64 bg-[#111827] border-r border-white/10 h-screen sticky top-0 shrink-0">
        <NavContent />
      </aside>

      {/* Mobile Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#111827] border border-white/10 rounded-xl text-white shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-[#111827] border-r border-white/10 h-full z-50">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
