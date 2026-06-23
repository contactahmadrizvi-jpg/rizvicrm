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
  Users2,
  Users,
  Mail,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ADMIN_NAV = [
  { href: "/dashboard",             label: "Dashboard",   icon: LayoutDashboard },
  { href: "/dashboard/leads",       label: "Leads",       icon: Users2 },
  { href: "/dashboard/clients",     label: "Clients",     icon: UserCheck },
  { href: "/dashboard/projects",    label: "Projects",    icon: FolderKanban },
  { href: "/dashboard/commissions", label: "Commissions", icon: DollarSign },
  { href: "/dashboard/email-copy",  label: "Email Copy",  icon: Mail },
  { href: "/dashboard/team",        label: "Team",        icon: Users },
];

const MEMBER_NAV = [
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
];

export const ALL_NAV_ITEMS = ADMIN_NAV;

export function Sidebar() {
  const pathname = usePathname();
  const { logOut, user, appUser, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = isAdmin
    ? ADMIN_NAV
    : appUser?.allowedPages && appUser.allowedPages.length > 0
      ? ADMIN_NAV.filter((item) => appUser.allowedPages!.includes(item.href))
      : MEMBER_NAV;

  const initials = (appUser?.displayName || user?.email || "?")
    .split(/[\s@]/).filter(Boolean).map((s) => s[0].toUpperCase()).slice(0, 2).join("");

  const NavContent = () => (
    <div className="flex flex-col h-full" style={{ background: "#16162a" }}>

      {/* Wordmark */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #c9a84c 0%, #e8c96a 100%)" }}>
            <span style={{ color: "#16162a", fontWeight: 800, fontSize: 13, lineHeight: 1 }}>R</span>
          </div>
          <div>
            <p style={{ color: "#f0f0ee", fontWeight: 600, fontSize: 13, letterSpacing: "-0.02em", lineHeight: 1 }}>
              Rizvi CRM
            </p>
            <p style={{ color: "#5a5a78", fontSize: 10, marginTop: 3 }}>Operations</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {/* Section label */}
        <p style={{ color: "#3e3e58", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", paddingLeft: 10, marginBottom: 6, marginTop: 4 }}>
          Menu
        </p>

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
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: "-0.01em",
                transition: "all 0.1s",
                background: isActive
                  ? "linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.08) 100%)"
                  : "transparent",
                color: isActive ? "#e8c96a" : "#7070a0",
                textDecoration: "none",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLElement).style.color = "#b0b0cc";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#7070a0";
                }
              }}
            >
              {/* Active left border */}
              {isActive && (
                <span style={{
                  position: "absolute", left: 0, top: "25%", bottom: "25%",
                  width: 3, borderRadius: "0 2px 2px 0",
                  background: "linear-gradient(180deg, #c9a84c, #e8c96a)",
                }} />
              )}
              <Icon size={14} style={{ color: isActive ? "#c9a84c" : "#4a4a6a", flexShrink: 0 }} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 2 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#c9a84c", fontSize: 10, fontWeight: 700 }}>{initials}</span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              {appUser?.displayName && (
                <p style={{ color: "#c0c0d8", fontSize: 12, fontWeight: 500,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1 }}>
                  {appUser.displayName}
                </p>
              )}
              <p style={{ color: "#4a4a6a", fontSize: 10, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: appUser?.displayName ? 3 : 0 }}>
                {user.email}
              </p>
            </div>
          </div>
        )}
        <button onClick={logOut} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "9px 10px", borderRadius: 8, fontSize: 13, fontWeight: 400,
          color: "#4a4a6a", background: "transparent", border: "none", cursor: "pointer",
          transition: "all 0.1s",
        }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(192,57,43,0.1)";
            (e.currentTarget as HTMLElement).style.color = "#e05c4e";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#4a4a6a";
          }}>
          <LogOut size={14} style={{ flexShrink: 0 }} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-[210px] h-screen sticky top-0 shrink-0"
        style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
        <NavContent />
      </aside>

      {/* Mobile toggle */}
      <button className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg"
        style={{ background: "#16162a", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
        onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[210px] h-full z-50"
            style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
