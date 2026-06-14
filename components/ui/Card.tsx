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
        rounded-2xl border border-white/10 p-6 shadow-xl
        ${glass
          ? "bg-white/5 backdrop-blur-md"
          : "bg-[#111827]"
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
  color?: "indigo" | "green" | "red" | "yellow" | "blue";
  loading?: boolean;
}

const colorMap = {
  indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  green: "text-green-400 bg-green-500/10 border-green-500/20",
  red: "text-red-400 bg-red-500/10 border-red-500/20",
  yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
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
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl">
        <div className="skeleton h-4 w-24 mb-4" />
        <div className="skeleton h-8 w-32 mb-2" />
        <div className="skeleton h-4 w-20" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-6 shadow-xl ${colorMap[color]}`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {icon && (
          <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {subtitle && subtitleValue !== undefined && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-slate-400">{subtitle}</span>
          <span className={`text-sm font-semibold ${colorMap[color].split(" ")[0]}`}>
            {subtitleValue}
          </span>
        </div>
      )}
    </div>
  );
}
