"use client";

type BadgeVariant = "meeting" | "closed" | "rejected" | "default";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const variantMap: Record<BadgeVariant, string> = {
  meeting: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  closed: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  default: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantMap[variant]}`}
    >
      {children}
    </span>
  );
}
