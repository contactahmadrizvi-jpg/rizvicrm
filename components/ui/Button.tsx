"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

const variantMap = {
  primary: "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-sm shadow-indigo-600/10",
  secondary: "bg-slate-100 hover:bg-slate-200/80 text-slate-800 border-slate-200/60",
  danger: "bg-rose-600 hover:bg-rose-500 text-white border-transparent shadow-sm shadow-rose-600/10",
  ghost: "bg-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-800 border-transparent",
};

const sizeMap = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-medium border
        transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantMap[variant]} ${sizeMap[size]} ${className}
      `}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
