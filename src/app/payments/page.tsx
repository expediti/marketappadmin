"use client";

import React, { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";

export default function PaymentsPayoutsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"payouts" | "transactions">("payouts");

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders?limit=100");
      if (res.ok) {
        const json = await res.json();
        setOrders(json.orders || []);
      }
    } catch (err) {
      console.error("Fetch payments error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const totalVolume = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const totalFees = orders.reduce((sum, o) => sum + (Number(o.platform_fee) || 0), 0);
  const totalPayouts = orders.reduce((sum, o) => sum + (Number(o.creator_payout_amount) || 0), 0);

  const pendingPayoutOrders = orders.filter((o) => o.status === "completed" && o.payout_status !== "completed");
  const settledPayoutOrders = orders.filter((o) => o.payout_status === "completed");

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Payments & Creator Payouts</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Escrow accounting, Razorpay transaction records, and creator settlement execution.
            </p>
          </div>
        </div>

        {/* Financial Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Total Contract Volume</span>
              <DollarSign className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              {loading ? "..." : formatCurrency(totalVolume)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Gross marketplace value</p>
          </div>

          <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Platform Revenue (10%)</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-indigo-400 mt-2">
              {loading ? "..." : formatCurrency(totalFees)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Platform fee collected</p>
          </div>

          <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Creator Payouts (90%)</span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">
              {loading ? "..." : formatCurrency(totalPayouts)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Creator net disbursements</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("payouts")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "payouts"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Creator Payout Queue</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
              {pendingPayoutOrders.length} Pending
            </span>
          </button>

          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "transactions"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Order Transactions
          </button>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : activeTab === "payouts" ? (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0f172a]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1222] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Order ID</th>
                  <th className="px-4 py-3.5">Creator</th>
                  <th className="px-4 py-3.5">Creator UPI ID</th>
                  <th className="px-4 py-3.5">Payout Amount</th>
                  <th className="px-4 py-3.5">Settlement Status</th>
                  <th className="px-4 py-3.5">Transfer Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders
                  .filter((o) => o.status === "completed" || o.payment_status === "held_in_escrow")
                  .map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                        #{order.id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-200">
                          {order.creator?.display_name || "Creator"}
                        </div>
                        <div className="text-[11px] text-slate-500">{order.creator?.email}</div>
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-300">
                        {order.payout_upi_id || "Not configured"}
                      </td>
                      <td className="px-4 py-4 font-bold text-emerald-400">
                        {formatCurrency(order.creator_payout_amount)}
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={
                            order.payout_status === "completed"
                              ? "success"
                              : order.payout_status === "processing"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {order.payout_status || "pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-400 font-mono text-[11px]">
                        {order.payout_transfer_id || "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0f172a]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1222] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Order</th>
                  <th className="px-4 py-3.5">Contract Total</th>
                  <th className="px-4 py-3.5">Platform Fee</th>
                  <th className="px-4 py-3.5">Creator Payout</th>
                  <th className="px-4 py-3.5">Escrow State</th>
                  <th className="px-4 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                      #{order.id.substring(0, 8)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-200">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="px-4 py-4 text-indigo-400">
                      {formatCurrency(order.platform_fee)}
                    </td>
                    <td className="px-4 py-4 text-emerald-400">
                      {formatCurrency(order.creator_payout_amount)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
