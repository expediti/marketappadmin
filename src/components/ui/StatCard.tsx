import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "indigo" | "emerald" | "amber" | "rose" | "sky" | "default";
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const iconBg = {
    default: "bg-slate-800 text-slate-300 border-slate-700",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  };

  return (
    <div
      className={cn(
        "relative p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-sm hover:border-slate-700 transition-all duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={cn("p-2 rounded-lg border", iconBg[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center text-xs font-medium">
            <span className={trend.isPositive ? "text-emerald-400" : "text-rose-400"}>
              {trend.value}
            </span>
            <span className="ml-1.5 text-slate-500">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
