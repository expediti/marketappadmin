"use client";

import React, { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  FileText,
} from "lucide-react";

export default function DisputesManagementPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);

  // Resolution state
  const [resolutionStatus, setResolutionStatus] = useState<string>("resolved_creator");
  const [resolutionNotes, setResolutionNotes] = useState<string>("");
  const [resolving, setResolving] = useState(false);
  const [resolveSuccess, setResolveSuccess] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/disputes");
      if (res.ok) {
        const json = await res.json();
        setDisputes(json.disputes || []);
      }
    } catch (err) {
      console.error("Fetch disputes error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;
    setResolving(true);
    setResolveError(null);
    setResolveSuccess(null);

    try {
      const res = await fetch("/api/admin/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disputeId: selectedDispute.id,
          resolution: resolutionStatus,
          notes: resolutionNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to resolve dispute");

      setResolveSuccess(`Dispute resolved as: ${resolutionStatus.replace("_", " ")}`);
      setTimeout(() => {
        setResolveModalOpen(false);
        fetchDisputes();
      }, 1000);
    } catch (err: any) {
      setResolveError(err.message || "Failed to resolve dispute");
    } finally {
      setResolving(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Order Disputes & Resolutions</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Arbitrate order conflicts, review deliverables, and issue escrow releases or refunds.
            </p>
          </div>
        </div>

        {/* Disputes Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-16 text-center rounded-xl bg-[#0f172a]/50 border border-slate-800/80">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/80 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">No active disputes</p>
            <p className="text-xs text-slate-500 mt-1">All orders are progressing normally without conflict.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0f172a]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1222] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Dispute ID</th>
                  <th className="px-4 py-3.5">Order</th>
                  <th className="px-4 py-3.5">Raised By</th>
                  <th className="px-4 py-3.5">Reason</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Created</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {disputes.map((dispute) => (
                  <tr key={dispute.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                      #{dispute.id.substring(0, 8)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-200">
                        {formatCurrency(dispute.order?.amount)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Order #{dispute.order_id?.substring(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-300">
                        {dispute.raised_by_user?.display_name || "User"}
                      </div>
                      <Badge variant="neutral">{dispute.raised_by_user?.role || "user"}</Badge>
                    </td>
                    <td className="px-4 py-4 text-slate-300 max-w-xs truncate">
                      {dispute.reason}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={dispute.status} />
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      {formatDate(dispute.created_at)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setResolutionStatus(dispute.status === "open" ? "resolved_creator" : dispute.status);
                          setResolutionNotes(dispute.resolution_notes || "");
                          setResolveError(null);
                          setResolveSuccess(null);
                          setResolveModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Arbitrate</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Arbitration Resolution Modal */}
        <Modal
          isOpen={resolveModalOpen}
          onClose={() => setResolveModalOpen(false)}
          title={`Arbitrate Dispute #${selectedDispute?.id?.substring(0, 8)}`}
          maxWidth="2xl"
        >
          {selectedDispute && (
            <form onSubmit={handleResolveDispute} className="space-y-6">
              {resolveError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{resolveError}</span>
                </div>
              )}
              {resolveSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{resolveSuccess}</span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Dispute Reason</span>
                  <p className="text-slate-200 mt-1 leading-relaxed bg-[#0f172a] p-3 rounded-lg border border-slate-800">
                    {selectedDispute.reason}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Contract Amount</span>
                    <span className="text-slate-200 font-bold">
                      {formatCurrency(selectedDispute.order?.amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Current Status</span>
                    <StatusBadge status={selectedDispute.status} />
                  </div>
                </div>
              </div>

              {/* Resolution Form */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Administrative Ruling
                </h4>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Ruling Decision
                  </label>
                  <select
                    value={resolutionStatus}
                    onChange={(e) => setResolutionStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="resolved_creator">
                      Rule for Creator (Release escrow payment to creator)
                    </option>
                    <option value="resolved_business">
                      Rule for Business (Refund escrow payment to brand)
                    </option>
                    <option value="under_review">Mark Under Review (Gather more details)</option>
                    <option value="closed">Close Dispute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Arbitration / Resolution Notes
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Provide detailed justification for the ruling..."
                    className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {resolving ? "Submitting Ruling..." : "Apply Ruling & Transition Escrow"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}
