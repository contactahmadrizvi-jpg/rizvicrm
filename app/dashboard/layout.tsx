"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";

// Pages that team members are NOT allowed to access
const ADMIN_ONLY_PATHS = [
  "/dashboard",
  "/dashboard/leads",
  "/dashboard/clients",
  "/dashboard/commissions",
  "/dashboard/team",
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Not logged in at all → go to login
    if (!user) {
      router.replace("/");
      return;
    }

    // Team member trying to access an admin-only route → redirect to projects
    if (!isAdmin && ADMIN_ONLY_PATHS.includes(pathname)) {
      router.replace("/dashboard/projects");
    }
  }, [user, isAdmin, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // While redirect is in flight, show nothing instead of flashing restricted content
  if (!isAdmin && ADMIN_ONLY_PATHS.includes(pathname)) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:pl-0 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
