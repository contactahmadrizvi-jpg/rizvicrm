"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, Commission } from "@/lib/types";
import { KPICard } from "@/components/ui/Card";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import {
  TrendingUp,
  DollarSign,
  Code2,
  Bot,
  Users,
  PhoneCall,
  Calendar,
  AlertTriangle,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const DISMISSED_KEY = "crm_dismissed_deadline_alerts";

function getDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

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
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Load dismissed alerts from localStorage on mount
  useEffect(() => {
    setDismissedAlerts(getDismissed());
  }, []);

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

  // Filter projects by date range
  const filteredProjects = projects.filter((project) => {
    if (!dateRange.start || !dateRange.end) return true;
    const projectDate = new Date(project.createdAt);
    return projectDate >= dateRange.start && projectDate <= dateRange.end;
  });

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
  };

  // Deadline alerts: projects with deadline within 7 days (not yet dismissed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  const urgentProjects = projects.filter((p) => {
    if (!p.deadline) return false;
    if (dismissedAlerts.includes(p.id)) return false;
    const dl = new Date(p.deadline);
    dl.setHours(0, 0, 0, 0);
    return dl <= in7Days; // includes overdue
  });

  const dismissAlert = (projectId: string) => {
    const updated = [...dismissedAlerts, projectId];
    setDismissedAlerts(updated);
    saveDismissed(updated);
  };

  const getDaysRemaining = (deadline: string) => {
    const dl = new Date(deadline);
    dl.setHours(0, 0, 0, 0);
    return Math.round((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Revenue calculations based on PAID amounts only
  const totalRevenue = filteredProjects.reduce((sum, p) => sum + (p.totalPaid || 0), 0);
  const totalRemainingPayments = filteredProjects.reduce((sum, p) => sum + (p.remainingPayment || 0), 0);
  const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
  
  const appDevRevenue = filteredProjects
    .filter((p) => p.projectType === "App Development")
    .reduce((sum, p) => sum + (p.totalPaid || 0), 0);
  const appDevRemaining = filteredProjects
    .filter((p) => p.projectType === "App Development")
    .reduce((sum, p) => sum + (p.remainingPayment || 0), 0);
    
  const aiRevenue = filteredProjects
    .filter((p) => p.projectType === "AI Receptionist")
    .reduce((sum, p) => sum + (p.totalPaid || 0), 0);
  const aiRemaining = filteredProjects
    .filter((p) => p.projectType === "AI Receptionist")
    .reduce((sum, p) => sum + (p.remainingPayment || 0), 0);

  // Commission calculations - use ACTUAL assigned commissions from projects
  const totalCommission = filteredProjects.reduce((sum, p) => sum + (p.totalCommission || 0), 0);
  
  const salesCloserCommission = filteredProjects.reduce(
    (sum, p) => sum + (p.salesCloserCommission || 0),
    0
  );
  
  const coldCallerCommission = filteredProjects.reduce(
    (sum, p) => sum + (p.coldCallerCommission || 0),
    0
  );

  // Calculate commission per project type
  const appDevCommission = filteredProjects
    .filter((p) => p.projectType === "App Development")
    .reduce((sum, p) => sum + (p.totalCommission || 0), 0);
    
  const aiCommission = filteredProjects
    .filter((p) => p.projectType === "AI Receptionist")
    .reduce((sum, p) => sum + (p.totalCommission || 0), 0);

  const totalProfit = totalRevenue - totalCommission;
  const appDevProfit = appDevRevenue - appDevCommission;
  const aiProfit = aiRevenue - aiCommission;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time overview of your business performance
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowDateFilter(!showDateFilter)}
          className="gap-2"
        >
          <Calendar size={16} />
          {dateRange.start && dateRange.end ? "Filter Active" : "Filter by Date"}
        </Button>
      </div>

      {/* Deadline Alerts */}
      {urgentProjects.length > 0 && (
        <div className="mb-6 flex flex-col gap-2.5">
          {urgentProjects.map((project) => {
            const days = getDaysRemaining(project.deadline!);
            const isOverdue = days < 0;
            const isToday = days === 0;

            const label = isOverdue
              ? `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`
              : isToday
              ? "Due today"
              : `${days} day${days !== 1 ? "s" : ""} left`;

            const headline = isOverdue
              ? "Project Overdue"
              : isToday
              ? "Due Today"
              : "Deadline Approaching";

            return (
              <div
                key={project.id}
                style={
                  isOverdue
                    ? { background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)", borderColor: "#fca5a5" }
                    : { background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", borderColor: "#fcd34d" }
                }
                className="flex items-center gap-4 px-5 py-3.5 rounded-2xl border shadow-sm"
              >
                {/* Icon badge */}
                <div
                  className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl"
                  style={
                    isOverdue
                      ? { background: "#fee2e2" }
                      : { background: "#fde68a" }
                  }
                >
                  <AlertTriangle
                    size={20}
                    style={{ color: isOverdue ? "#dc2626" : "#d97706" }}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={
                        isOverdue
                          ? { background: "#fecaca", color: "#b91c1c" }
                          : { background: "#fde68a", color: "#92400e" }
                      }
                    >
                      {headline}
                    </span>
                    <span
                      className="font-bold text-sm truncate"
                      style={{ color: isOverdue ? "#7f1d1d" : "#78350f" }}
                    >
                      {project.name}
                    </span>
                    {project.clientName && (
                      <span
                        className="text-xs"
                        style={{ color: isOverdue ? "#b91c1c" : "#92400e", opacity: 0.7 }}
                      >
                        · {project.clientName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock size={11} style={{ color: isOverdue ? "#dc2626" : "#d97706" }} />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: isOverdue ? "#dc2626" : "#b45309" }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: isOverdue ? "#b91c1c" : "#92400e", opacity: 0.65 }}
                    >
                      — deadline: {project.deadline}
                    </span>
                  </div>
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => dismissAlert(project.id)}
                  aria-label="Dismiss alert"
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150"
                  style={
                    isOverdue
                      ? { background: "#fecaca", color: "#dc2626" }
                      : { background: "#fde68a", color: "#d97706" }
                  }
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = isOverdue ? "#fca5a5" : "#fcd34d";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = isOverdue ? "#fecaca" : "#fde68a";
                  }}
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Date Filter */}
      {showDateFilter && (
        <div className="mb-6">
          <DateRangePicker onDateChange={handleDateChange} />
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        {/* Total Revenue + Profit */}
        <div className="sm:col-span-2 xl:col-span-1">
          <KPICard
            title="Total Paid Revenue"
            value={formatCurrency(totalRevenue)}
            subtitle="Net Profit"
            subtitleValue={formatCurrency(totalProfit)}
            icon={<TrendingUp size={18} />}
            color={totalProfit >= 0 ? "green" : "red"}
            loading={loading}
          />
        </div>

        {/* Remaining Payments */}
        <KPICard
          title="Remaining Payments"
          value={formatCurrency(totalRemainingPayments)}
          subtitle="Total Budget"
          subtitleValue={formatCurrency(totalBudget)}
          icon={<DollarSign size={18} />}
          color="orange"
          loading={loading}
        />

        {/* App Dev */}
        <KPICard
          title="App Dev (Paid)"
          value={formatCurrency(appDevRevenue)}
          subtitle="Remaining"
          subtitleValue={formatCurrency(appDevRemaining)}
          icon={<Code2 size={18} />}
          color="indigo"
          loading={loading}
        />

        {/* AI Receptionist */}
        <KPICard
          title="AI Receptionist (Paid)"
          value={formatCurrency(aiRevenue)}
          subtitle="Remaining"
          subtitleValue={formatCurrency(aiRemaining)}
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
      {!loading && filteredProjects.length > 0 && (
        <div className="mt-8 bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Recent Projects</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.slice(0, 8).map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900 font-semibold">
                      {project.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {project.clientName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {project.projectType}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 text-right">
                      {formatCurrency(project.budget)}
                    </td>
                    <td className="px-6 py-4 text-sm text-emerald-600 font-semibold text-right">
                      {formatCurrency(project.totalPaid || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-orange-600 font-semibold text-right">
                      {formatCurrency(project.remainingPayment || 0)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          project.paymentStatus === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                            : project.paymentStatus === "Partial"
                            ? "bg-amber-50 text-amber-700 border-amber-200/50"
                            : "bg-rose-50 text-rose-700 border-rose-200/50"
                        }`}
                      >
                        {project.paymentStatus || "Unpaid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filteredProjects.length === 0 && (
        <div className="mt-8 bg-white border border-slate-200/60 rounded-2xl p-12 text-center shadow-sm">
          <TrendingUp size={40} className="text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">
            {dateRange.start && dateRange.end
              ? "No projects in selected date range"
              : "No projects yet. Add clients and projects to see revenue data."}
          </p>
        </div>
      )}
    </div>
  );
}
