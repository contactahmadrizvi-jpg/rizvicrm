"use client";

type BadgeVariant = "meeting" | "closed" | "rejected" | "default";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const variantMap: Record<BadgeVariant, string> = {
  meeting: "bg-amber-50 text-amber-700 border-amber-200/50",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
  rejected: "bg-rose-50 text-rose-700 border-rose-200/50",
  default: "bg-slate-50 text-slate-600 border-slate-200/50",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantMap[variant]}`}
    >
      {children}
    </span>
  );
}
