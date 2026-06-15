"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  glass?: boolean;
}

export function Card({ children, className = "", glass = false }: CardProps) {
  return (
    <div
      className={`
        rounded-2xl border border-slate-200/60 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_20px_-4px_rgba(0,0,0,0.01)]
        ${glass
          ? "bg-white/80 backdrop-blur-md"
          : "bg-white"
        }
        ${className}
      `}
    >
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

const colorMap = {
  indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
  green: "text-emerald-600 bg-emerald-50 border-emerald-100",
  red: "text-rose-600 bg-rose-50 border-rose-100",
  yellow: "text-amber-600 bg-amber-50 border-amber-100",
  blue: "text-blue-600 bg-blue-50 border-blue-100",
  orange: "text-orange-600 bg-orange-50 border-orange-100",
};

const textColorMap = {
  indigo: "text-indigo-600",
  green: "text-emerald-600",
  red: "text-rose-600",
  yellow: "text-amber-600",
  blue: "text-blue-600",
  orange: "text-orange-600",
};

export function KPICard({
  title,
  value,
  subtitle,
  subtitleValue,
  icon,
  color = "indigo",
  loading = false,
}: KPICardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_20px_-4px_rgba(0,0,0,0.01)]">
        <div className="skeleton h-4 w-24 mb-4" />
        <div className="skeleton h-8 w-32 mb-2" />
        <div className="skeleton h-4 w-20" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_20px_-4px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {icon && (
          <div className={`p-2 rounded-xl border ${colorMap[color]}`}>{icon}</div>
        )}
      </div>
      <p className="text-3xl font-bold text-slate-900 mb-1 tracking-tight">{value}</p>
      {subtitle && subtitleValue !== undefined && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-slate-400">{subtitle}</span>
          <span className={`text-sm font-semibold ${textColorMap[color]}`}>
            {subtitleValue}
          </span>
        </div>
      )}
    </div>
  );
}
