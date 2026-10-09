"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  ShoppingCart,
  MessageSquare,
  CreditCard,
  AlertCircle,
  Activity,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Creator Verifications", href: "/verifications", icon: CheckCircle2 },
  { name: "Orders & Escrow", href: "/orders", icon: ShoppingCart },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Payments & Payouts", href: "/payments", icon: CreditCard },
  { name: "Disputes", href: "/disputes", icon: AlertCircle },
  { name: "Activity & Audit", href: "/activity", icon: Activity },
  { name: "Settings & Flags", href: "/settings", icon: Settings },
];

export function AdminSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-[#0c1222] border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide text-white block">MarketMyIdea</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400">Admin Control</span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-indigo-400" : "text-slate-400"
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer / System Status */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0a0f1d]">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-slate-300">Supabase Connected</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Cloudflare Worker Target</p>
        </div>
      </aside>
    </>
  );
}
