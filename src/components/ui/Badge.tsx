import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral" | "purple";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    info: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    neutral: "bg-slate-800 text-slate-400 border-slate-700",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge variant="neutral">None</Badge>;

  const s = status.toLowerCase();
  if (["verified", "verified_manual", "verified_oauth", "completed", "active", "approved", "held_in_escrow", "resolved_creator", "resolved_business"].includes(s)) {
    return <Badge variant="success">{status.replace("_", " ")}</Badge>;
  }
  if (["pending", "pending_review", "pending_payment", "in_progress", "submitted", "under_review", "processing"].includes(s)) {
    return <Badge variant="warning">{status.replace("_", " ")}</Badge>;
  }
  if (["rejected", "cancelled", "failed", "disputed", "deleted"].includes(s)) {
    return <Badge variant="danger">{status.replace("_", " ")}</Badge>;
  }
  if (["resubmission_required", "revision_requested"].includes(s)) {
    return <Badge variant="purple">{status.replace("_", " ")}</Badge>;
  }
  if (["unverified", "unpaid", "draft", "open"].includes(s)) {
    return <Badge variant="neutral">{status.replace("_", " ")}</Badge>;
  }

  return <Badge variant="info">{status.replace("_", " ")}</Badge>;
}
