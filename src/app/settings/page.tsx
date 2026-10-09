"use client";

import React, { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge } from "@/components/ui/Badge";
import {
  Settings,
  ShieldCheck,
  Server,
  Database,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  RefreshCw,
} from "lucide-react";

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const json = await res.json();
        setSettings(json);
      }
    } catch (err) {
      console.error("Fetch settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <AdminShell>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Platform Settings & Feature Controls</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Active configuration parameters, feature gates, and Cloudflare Worker environment state.
            </p>
          </div>

          <button
            onClick={fetchSettings}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Check Connectivity</span>
          </button>
        </div>

        {/* Database & Cloudflare System Health */}
        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Server className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">System & Cloudflare Environment</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800/80">
              <span className="text-slate-500 block text-[11px]">Worker Application</span>
              <span className="font-semibold text-slate-200">marketmyidea-admin</span>
              <span className="block text-[11px] text-slate-500 mt-1">OpenNext Cloudflare Worker</span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800/80">
              <span className="text-slate-500 block text-[11px]">Production Hostname</span>
              <span className="font-semibold text-indigo-400 font-mono">admin.marketmyidea.online</span>
              <span className="block text-[11px] text-slate-500 mt-1">Dedicated Admin DNS CNAME</span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800/80">
              <span className="text-slate-500 block text-[11px]">Supabase Database Health</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-emerald-400">Connected</span>
                {settings?.databaseStatus?.latencyMs && (
                  <span className="text-slate-500 text-[11px]">
                    ({settings.databaseStatus.latencyMs}ms)
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800/80">
              <span className="text-slate-500 block text-[11px]">Server Security Boundary</span>
              <span className="font-semibold text-slate-200 flex items-center gap-1 mt-1">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Service Role Secret Isolated</span>
              </span>
            </div>
          </div>
        </div>

        {/* Feature Gates & Business Constants */}
        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Feature Flags & Business Rules</h2>
          </div>

          <div className="space-y-3">
            {/* Instagram Manual Verification */}
            <div className="p-4 rounded-lg bg-[#090d16] border border-slate-800/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>Manual Instagram Verification Workflow</span>
                  <Badge variant="success">Active</Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  Allows creators to submit Instagram profile links and 1-3 Reel URLs for admin review.
                </p>
              </div>
            </div>

            {/* Instagram OAuth */}
            <div className="p-4 rounded-lg bg-[#090d16] border border-slate-800/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>Meta Instagram Graph API OAuth Connect</span>
                  <Badge variant="neutral">Disabled in Code</Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  Controlled by <code className="text-indigo-400">INSTAGRAM_OAUTH_ENABLED = false</code>. Preserved for future Meta app review without breaking current manual workflow.
                </p>
              </div>
            </div>

            {/* Platform Fee */}
            <div className="p-4 rounded-lg bg-[#090d16] border border-slate-800/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white">
                  Platform Commission Fee (10%)
                </div>
                <p className="text-[11px] text-slate-400">
                  Fixed 10% platform fee deducted on deal acceptance (<code className="text-indigo-400">public.accept_deal_proposal</code>).
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-indigo-400">10% / 90% Split</span>
              </div>
            </div>

            {/* Delivery Auto-Approval */}
            <div className="p-4 rounded-lg bg-[#090d16] border border-slate-800/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white">
                  Delivery Auto-Approval Window
                </div>
                <p className="text-[11px] text-slate-400">
                  Completed orders automatically finalize 48 hours after delivery submission if unreviewed.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-200">48 Hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
