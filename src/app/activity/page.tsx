"use client";

import React, { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import {
  Activity,
  Shield,
  Search,
  Filter,
  Code,
  User,
  Clock,
  ChevronDown,
  ChevronRight,
  Database,
} from "lucide-react";

export default function ActivityAuditPage() {
  const [adminActions, setAdminActions] = useState<any[]>([]);
  const [orderEvents, setOrderEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"admin" | "orders">("admin");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/activity?limit=100");
      if (res.ok) {
        const json = await res.json();
        setAdminActions(json.adminActions || []);
        setOrderEvents(json.orderEvents || []);
      }
    } catch (err) {
      console.error("Fetch activity error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const filteredAdminActions = adminActions.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.action?.toLowerCase().includes(q) ||
      a.target_type?.toLowerCase().includes(q) ||
      a.target_id?.toLowerCase().includes(q) ||
      a.admin?.display_name?.toLowerCase().includes(q) ||
      a.admin?.email?.toLowerCase().includes(q)
    );
  });

  const filteredOrderEvents = orderEvents.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.event_type?.toLowerCase().includes(q) ||
      e.order_id?.toLowerCase().includes(q) ||
      e.actor?.display_name?.toLowerCase().includes(q) ||
      e.actor?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Activity & Audit Trail</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Immutable Ledger
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Comprehensive log of administrative actions, role transitions, and order state changes.
            </p>
          </div>
        </div>

        {/* Tab & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f172a]/90 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeTab === "admin"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Actions ({adminActions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeTab === "orders"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Order Lifecycle Events ({orderEvents.length})</span>
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Audit Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : activeTab === "admin" ? (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0f172a]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1222] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-4 py-3.5">Administrator</th>
                  <th className="px-4 py-3.5">Target Type</th>
                  <th className="px-4 py-3.5">Target ID</th>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAdminActions.map((action) => {
                  const isExpanded = expandedRow === action.id;
                  return (
                    <React.Fragment key={action.id}>
                      <tr className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-200">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 font-mono text-[11px]">
                            {action.action}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-300">
                            {action.admin?.display_name || action.admin?.email || "Admin"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="purple">{action.target_type}</Badge>
                        </td>
                        <td className="px-4 py-4 font-mono text-[11px] text-slate-400">
                          {action.target_id?.substring(0, 12)}...
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {formatDate(action.created_at)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => toggleExpand(action.id)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#090d16]/90">
                          <td colSpan={6} className="p-4 border-b border-slate-800">
                            <div className="text-[11px] font-mono text-indigo-300 mb-1">
                              Metadata Payload:
                            </div>
                            <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                              {JSON.stringify(action.metadata || {}, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0f172a]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1222] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Event Type</th>
                  <th className="px-4 py-3.5">Actor</th>
                  <th className="px-4 py-3.5">Order ID</th>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrderEvents.map((event) => {
                  const isExpanded = expandedRow === event.id;
                  return (
                    <React.Fragment key={event.id}>
                      <tr className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-200">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-mono text-[11px]">
                            {event.event_type}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {event.actor?.display_name || event.actor?.email || "System"}
                        </td>
                        <td className="px-4 py-4 font-mono text-[11px] text-slate-400">
                          #{event.order_id?.substring(0, 8)}
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {formatDate(event.created_at)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => toggleExpand(event.id)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#090d16]/90">
                          <td colSpan={5} className="p-4 border-b border-slate-800">
                            <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                              {JSON.stringify(event.metadata || {}, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
