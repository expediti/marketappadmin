"use client";

import React, { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingCart,
  Search,
  Filter,
  Eye,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Film,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function OrdersManagementPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ totalPages: 1, total: 0 });
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Payout update state
  const [payoutStatus, setPayoutStatus] = useState("completed");
  const [payoutTransferId, setPayoutTransferId] = useState("");
  const [updatingPayout, setUpdatingPayout] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setOrders(json.orders || []);
        setPagination(json.pagination || { totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleUpdatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdatingPayout(true);
    setPayoutError(null);
    setPayoutSuccess(null);

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          action: "update_payout_status",
          payoutStatus,
          payoutTransferId,
          payoutUpiId: selectedOrder.payout_upi_id,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update payout status");

      setPayoutSuccess(`Payout status updated to ${payoutStatus}`);
      setSelectedOrder({
        ...selectedOrder,
        payout_status: payoutStatus,
        payout_transfer_id: payoutTransferId,
      });
      fetchOrders();
    } catch (err: any) {
      setPayoutError(err.message || "Failed to update payout");
    } finally {
      setUpdatingPayout(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Orders & Escrow Lifecycle</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                {pagination.total} Deals
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Inspect order contracts, escrow funding, delivery submissions, and creator payouts.
            </p>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-[#0f172a]/90 p-3 rounded-xl border border-slate-800">
          {[
            { id: "all", label: "All Orders" },
            { id: "pending_payment", label: "Pending Payment" },
            { id: "in_progress", label: "In Progress" },
            { id: "submitted", label: "Submitted" },
            { id: "completed", label: "Completed" },
            { id: "disputed", label: "Disputed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center rounded-xl bg-[#0f172a]/50 border border-slate-800/80">
            <ShoppingCart className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">No orders found</p>
            <p className="text-xs text-slate-500 mt-1">There are no orders matching this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0f172a]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1222] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Order ID</th>
                  <th className="px-4 py-3.5">Creator & Business</th>
                  <th className="px-4 py-3.5">Amount & Fees</th>
                  <th className="px-4 py-3.5">Order Status</th>
                  <th className="px-4 py-3.5">Payment & Escrow</th>
                  <th className="px-4 py-3.5">Payout Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Order ID */}
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                      #{order.id.substring(0, 8)}
                    </td>

                    {/* Parties */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="text-slate-200 font-medium flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-400">Biz</span>
                          <span>{order.business?.display_name || order.business?.email || "Brand"}</span>
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.2 bg-indigo-950 text-indigo-300 rounded">Creator</span>
                          <span>{order.creator?.display_name || order.creator?.email || "Creator"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Financials */}
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-200">
                        {formatCurrency(order.amount)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Fee: {formatCurrency(order.platform_fee)} (10%) • Payout: {formatCurrency(order.creator_payout_amount)}
                      </div>
                    </td>

                    {/* Order Status */}
                    <td className="px-4 py-4">
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Payment Escrow */}
                    <td className="px-4 py-4">
                      <StatusBadge status={order.payment_status} />
                    </td>

                    {/* Payout */}
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

                    {/* Actions */}
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setPayoutStatus(order.payout_status || "completed");
                          setPayoutTransferId(order.payout_transfer_id || "");
                          setPayoutError(null);
                          setPayoutSuccess(null);
                          setDetailModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Order Inspection #${selectedOrder?.id?.substring(0, 8)}`}
          maxWidth="2xl"
        >
          {selectedOrder && (
            <div className="space-y-6">
              {payoutError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{payoutError}</span>
                </div>
              )}
              {payoutSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{payoutSuccess}</span>
                </div>
              )}

              {/* Financial Summary Card */}
              <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Total Contract Amount</span>
                  <span className="text-base font-bold text-white">
                    {formatCurrency(selectedOrder.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Platform Fee (10%)</span>
                  <span className="text-base font-bold text-indigo-400">
                    {formatCurrency(selectedOrder.platform_fee)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Creator Payout (90%)</span>
                  <span className="text-base font-bold text-emerald-400">
                    {formatCurrency(selectedOrder.creator_payout_amount)}
                  </span>
                </div>
              </div>

              {/* Milestones & Timestamps */}
              <div className="p-4 rounded-xl bg-[#0c1222] border border-slate-800 space-y-2 text-xs">
                <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                  Timeline & Milestones
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                  <div>Created: {formatDate(selectedOrder.created_at)}</div>
                  <div>Work Started: {formatDate(selectedOrder.work_started_at)}</div>
                  <div>Delivery Submitted: {formatDate(selectedOrder.submitted_at)}</div>
                  <div>Auto-Approve At: {formatDate(selectedOrder.auto_approve_at)}</div>
                  <div>Completed: {formatDate(selectedOrder.completed_at)}</div>
                  <div>Deadline: {formatDate(selectedOrder.deadline)}</div>
                </div>
              </div>

              {/* Deliveries */}
              {Array.isArray(selectedOrder.deliveries) && selectedOrder.deliveries.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-300 text-xs uppercase tracking-wider">
                    Delivery Submissions ({selectedOrder.deliveries.length})
                  </h4>
                  {selectedOrder.deliveries.map((delivery: any) => (
                    <div
                      key={delivery.id}
                      className="p-3 rounded-lg bg-[#090d16] border border-slate-800 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-200">
                          Version {delivery.version}
                        </span>
                        <StatusBadge status={delivery.status} />
                      </div>
                      {delivery.reel_url && (
                        <a
                          href={delivery.reel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>View Delivered Reel</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {delivery.notes && (
                        <p className="text-slate-400 text-[11px] bg-slate-900 p-2 rounded">
                          {delivery.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Creator Payout Execution Management */}
              <form onSubmit={handleUpdatePayout} className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="font-semibold text-slate-300 text-xs uppercase tracking-wider">
                  Creator Settlement / Payout Management
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Creator UPI ID
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedOrder.payout_upi_id || "Not configured"}
                      className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Payout Status
                    </label>
                    <select
                      value={payoutStatus}
                      onChange={(e) => setPayoutStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed (Settled)</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Bank / UPI Transfer Reference ID
                  </label>
                  <input
                    type="text"
                    value={payoutTransferId}
                    onChange={(e) => setPayoutTransferId(e.target.value)}
                    placeholder="e.g. UTR / UPI Ref # 4289102948"
                    className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updatingPayout}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {updatingPayout ? "Updating..." : "Save Payout Record"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}
