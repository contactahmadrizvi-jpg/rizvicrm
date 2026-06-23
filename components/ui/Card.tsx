"use client";

import { ReactNode } from "react";

interface CardProps { children: ReactNode; className?: string; }

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white border border-[#e8e8e4] rounded-xl shadow-card ${className}`}>
      {children}
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subtitleValue?: string | number;
  icon?: ReactNode;
  color?: "indigo" | "green" | "red" | "yellow" | "blue" | "orange";
  loading?: boolean;
}

const iconBg: Record<string, string> = {
  indigo: "bg-[#eff0ff] text-[#4338ca] border-[#c7d2fe]",
  green:  "bg-[#edf7f3] text-[#1a7f5a] border-[#a7f3d0]",
  red:    "bg-[#fdf1f0] text-[#c0392b] border-[#fecaca]",
  yellow: "bg-[#fef9ec] text-[#b45309] border-[#fde68a]",
  blue:   "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
  orange: "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]",
};

const valColor: Record<string, string> = {
  indigo: "text-[#4338ca]", green: "text-[#1a7f5a]", red: "text-[#c0392b]",
  yellow: "text-[#b45309]", blue: "text-[#1d4ed8]",  orange: "text-[#c2410c]",
};

export function KPICard({ title, value, subtitle, subtitleValue, icon, color = "indigo", loading = false }: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-white border border-[#e8e8e4] rounded-xl p-5 shadow-card">
        <div className="skeleton h-3 w-24 mb-4" />
        <div className="skeleton h-7 w-28 mb-2" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e8e8e4] rounded-xl p-5 shadow-card hover:shadow-lift transition-shadow duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <p className="label-caps">{title}</p>
        {icon && (
          <div className={`p-2 rounded-lg border text-sm ${iconBg[color]}`}>{icon}</div>
        )}
      </div>
      <p className={`stat-num mb-1.5 text-[#111110]`}>{value}</p>
      {subtitle && subtitleValue !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#858580]">{subtitle}</span>
          <span className={`text-xs font-semibold ${valColor[color]}`}>{subtitleValue}</span>
        </div>
      )}
    </div>
  );
}
