"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "gold";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

const variantMap = {
  primary:   "bg-[#1a1a2e] hover:bg-[#2d2d5e] text-white border-transparent shadow-sm",
  secondary: "bg-white hover:bg-[#f4f4f2] text-[#1a1a2e] border-[#e8e8e4] hover:border-[#d0d0cc]",
  danger:    "bg-[#c0392b] hover:bg-[#a93226] text-white border-transparent shadow-sm",
  ghost:     "bg-transparent hover:bg-[#f4f4f2] text-[#4a4a48] border-transparent",
  gold:      "bg-[#c9a84c] hover:bg-[#b8963e] text-white border-transparent shadow-sm",
};

const sizeMap = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-sm",
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
        inline-flex items-center justify-center gap-2 rounded-lg font-medium border
        tracking-[-0.01em] transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantMap[variant]} ${sizeMap[size]} ${className}
      `}
    >
      {loading && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}
