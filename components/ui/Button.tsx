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
  primary: "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent",
  secondary: "bg-white/10 hover:bg-white/20 text-white border-white/10",
  danger: "bg-red-600/80 hover:bg-red-500 text-white border-transparent",
  ghost: "bg-transparent hover:bg-white/10 text-slate-400 hover:text-white border-transparent",
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
