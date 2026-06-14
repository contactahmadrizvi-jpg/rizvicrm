"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, Commission } from "@/lib/types";
import { KPICard } from "@/components/ui/Card";
import {
  TrendingUp,
  DollarSign,
  Code2,
  Bot,
  Users,
  PhoneCall,
} from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let projectsLoaded = false;
    let commissionsLoaded = false;

    const checkDone = () => {
      if (projectsLoaded && commissionsLoaded) setLoading(false);
    };

    const unsubProjects = onSnapshot(collection(db, "projects"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
      setProjects(data);
      projectsLoaded = true;
      checkDone();
    });

    const unsubCommissions = onSnapshot(collection(db, "commissions"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Commission));
      setCommissions(data);
      commissionsLoaded = true;
      checkDone();
    });

    return () => {
      unsubProjects();
      unsubCommissions();
    };
  }, []);

  // Revenue calculations
  const totalRevenue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const appDevRevenue = projects
    .filter((p) => p.projectType === "App Development")
    .reduce((sum, p) => sum + (p.budget || 0), 0);
  const aiRevenue = projects
    .filter((p) => p.projectType === "AI Receptionist")
    .reduce((sum, p) => sum + (p.budget || 0), 0);

  const salesCloserCommission = commissions
    .filter((c) => c.role === "Sales Closer")
    .reduce((sum, c) => sum + (c.totalCommission || 0), 0);
  const coldCallerCommission = commissions
    .filter((c) => c.role === "Cold Caller")
    .reduce((sum, c) => sum + (c.totalCommission || 0), 0);
  const totalCommission = salesCloserCommission + coldCallerCommission;

  const totalProfit = totalRevenue - totalCommission;
  const appDevProfit = appDevRevenue - (appDevRevenue / (totalRevenue || 1)) * totalCommission;
  const aiProfit = aiRevenue - (aiRevenue / (totalRevenue || 1)) * totalCommission;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Real-time overview of your business performance
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Total Revenue + Profit */}
        <div className="sm:col-span-2 xl:col-span-1">
          <KPICard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            subtitle="Net Profit"
            subtitleValue={formatCurrency(totalProfit)}
            icon={<TrendingUp size={18} />}
            color={totalProfit >= 0 ? "green" : "red"}
            loading={loading}
          />
        </div>

        {/* App Dev */}
        <KPICard
          title="App Development Revenue"
          value={formatCurrency(appDevRevenue)}
          subtitle="Est. Profit"
          subtitleValue={formatCurrency(appDevProfit)}
          icon={<Code2 size={18} />}
          color="indigo"
          loading={loading}
        />

        {/* AI Receptionist */}
        <KPICard
          title="AI Receptionist Revenue"
          value={formatCurrency(aiRevenue)}
          subtitle="Est. Profit"
          subtitleValue={formatCurrency(aiProfit)}
          icon={<Bot size={18} />}
          color="blue"
          loading={loading}
        />

        {/* Sales Closer Commission */}
        <KPICard
          title="Sales Closers Commission"
          value={formatCurrency(salesCloserCommission)}
          subtitle="Employees"
          subtitleValue={commissions.filter((c) => c.role === "Sales Closer").length}
          icon={<Users size={18} />}
          color="yellow"
          loading={loading}
        />

        {/* Cold Caller Commission */}
        <KPICard
          title="Cold Callers Commission"
          value={formatCurrency(coldCallerCommission)}
          subtitle="Employees"
          subtitleValue={commissions.filter((c) => c.role === "Cold Caller").length}
          icon={<PhoneCall size={18} />}
          color="yellow"
          loading={loading}
        />

        {/* Total Commission Impact */}
        <KPICard
          title="Total Commission (Cost)"
          value={formatCurrency(totalCommission)}
          subtitle="% of Revenue"
          subtitleValue={
            totalRevenue > 0
              ? `${((totalCommission / totalRevenue) * 100).toFixed(1)}%`
              : "0%"
          }
          icon={<DollarSign size={18} />}
          color="red"
          loading={loading}
        />
      </div>

      {/* Summary Table */}
      {!loading && projects.length > 0 && (
        <div className="mt-8 bg-[#111827] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-base font-semibold text-white">Recent Projects</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Upfront
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {projects.slice(0, 8).map((project) => (
                  <tr key={project.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      {project.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {project.clientName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {project.projectType}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-400 font-medium text-right">
                      {formatCurrency(project.budget)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 text-right">
                      {formatCurrency(project.upfrontPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="mt-8 bg-[#111827] border border-white/10 rounded-2xl p-12 text-center">
          <TrendingUp size={40} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">
            No projects yet. Add clients and projects to see revenue data.
          </p>
        </div>
      )}
    </div>
  );
}
