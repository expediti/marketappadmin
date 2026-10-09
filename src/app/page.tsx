"use client";

import React, { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Briefcase,
  Clock,
  ShoppingCart,
  CreditCard,
  AlertTriangle,
  Activity,
  ArrowRight,
  RefreshCw,
  Shield,
  TrendingUp,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/login";
          return;
        }
        throw new Error(`Failed to load metrics: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch overview data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const stats = data?.stats || {};
  const recentActions = data?.recentActivity?.adminActions || [];
  const recentEvents = data?.recentActivity?.orderEvents || [];

  return (
    <AdminShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Admin Overview</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                Live Supabase Data
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time platform metrics, verification queues, and audit telemetry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOverview}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Metrics</span>
            </button>
            <Link
              href="/verifications"
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verify Creators ({stats.pendingVerifications || 0})</span>
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchOverview} className="underline font-semibold ml-4">
              Try again
            </button>
          </div>
        )}

        {/* Primary Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Registered Users"
            value={loading ? "..." : (stats.totalUsers || 0).toLocaleString()}
            description={`${stats.creatorCount || 0} Creators • ${stats.businessCount || 0} Businesses`}
            icon={Users}
            variant="default"
          />

          <StatCard
            title="Pending Verifications"
            value={loading ? "..." : stats.pendingVerifications || 0}
            description="Instagram manual review queue"
            icon={Clock}
            variant={stats.pendingVerifications > 0 ? "amber" : "default"}
          />

          <StatCard
            title="Verified Creators"
            value={loading ? "..." : stats.verifiedCreators || 0}
            description="Active vetted portfolio profiles"
            icon={CheckCircle2}
            variant="emerald"
          />

          <StatCard
            title="Active Deals & Orders"
            value={loading ? "..." : stats.activeOrders || 0}
            description={`${stats.completedOrders || 0} completed • ${stats.pendingPaymentOrders || 0} pending pay`}
            icon={ShoppingCart}
            variant="indigo"
          />
        </div>

        {/* Secondary Financial & Moderation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Platform Volume"
            value={loading ? "..." : formatCurrency(stats.grossVolume)}
            description="Gross captured payments"
            icon={TrendingUp}
            variant="sky"
          />

          <StatCard
            title="Pending Payouts"
            value={loading ? "..." : stats.pendingPayouts || 0}
            description="Settlement transfers awaiting execution"
            icon={CreditCard}
            variant={stats.pendingPayouts > 0 ? "amber" : "default"}
          />

          <StatCard
            title="Open Disputes"
            value={loading ? "..." : stats.disputedOrders || 0}
            description="Escrow dispute resolutions needed"
            icon={AlertTriangle}
            variant={stats.disputedOrders > 0 ? "rose" : "emerald"}
          />
        </div>

        {/* Dual Stream Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Administrative Audit Stream */}
          <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-white">Recent Admin Actions</h2>
                </div>
                <Link
                  href="/activity"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <span>View full log</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-slate-800/40 animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : recentActions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No recent administrative actions recorded.
                  </div>
                ) : (
                  recentActions.map((action: any) => (
                    <div
                      key={action.id}
                      className="p-3 rounded-lg bg-[#090d16] border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">
                            {action.action.replace("_", " ")}
                          </span>
                          <Badge variant="purple">{action.target_type}</Badge>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          By: {action.admin?.display_name || action.admin?.email || "Admin"}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {formatDate(action.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Order & Escrow Lifecycle Events */}
          <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">Order & Escrow Events</h2>
                </div>
                <Link
                  href="/orders"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <span>Manage orders</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-slate-800/40 animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : recentEvents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No recent order events recorded.
                  </div>
                ) : (
                  recentEvents.map((event: any) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg bg-[#090d16] border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">
                            {event.event_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          Actor: {event.actor?.display_name || event.actor?.email || "System"}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {formatDate(event.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
