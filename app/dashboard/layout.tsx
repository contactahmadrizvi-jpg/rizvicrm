"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";

function isPathAllowed(pathname: string, allowedPages: string[]): boolean {
  return allowedPages.some((page) =>
    page === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === page || pathname.startsWith(page + "/")
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, appUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const hasAccess = isAdmin
    ? true
    : pathname === "/dashboard/projects"
      ? true
      : appUser?.allowedPages && appUser.allowedPages.length > 0
        ? isPathAllowed(pathname, appUser.allowedPages)
        : false;

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/"); return; }
    if (!hasAccess) router.replace("/dashboard/projects");
  }, [user, isAdmin, loading, pathname, router, hasAccess]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f7f7f5]">
      <Sidebar />
      <main className="flex-1 min-w-0 pt-16 lg:pt-0 overflow-auto">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
