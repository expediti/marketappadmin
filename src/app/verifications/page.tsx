"use client";

import React, { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ExternalLink,
  Instagram,
  Search,
  Filter,
  Eye,
  AlertCircle,
  Film,
  Sparkles,
  MessageSquare,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

export default function CreatorVerificationsPage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("pending_review");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Review Form State
  const [reviewedFollowers, setReviewedFollowers] = useState<string>("");
  const [reviewedEngagement, setReviewedEngagement] = useState<string>("");
  const [reviewedViews, setReviewedViews] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      // Fetch creators via users endpoint with creator role
      const res = await fetch(`/api/admin/users?role=creator&limit=100`);
      if (res.ok) {
        const json = await res.json();
        const creatorProfiles = (json.users || [])
          .map((u: any) => ({
            ...u.creator_profile,
            user: u,
          }))
          .filter((cp: any) => cp && cp.id);
        setCreators(creatorProfiles);
      }
    } catch (err) {
      console.error("Failed to fetch creators:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  const openReviewModal = (creator: any) => {
    setSelectedCreator(creator);
    setReviewedFollowers(creator.reviewed_follower_count?.toString() || creator.claimed_followers?.toString() || "");
    setReviewedEngagement(creator.reviewed_engagement_rate?.toString() || creator.claimed_engagement_rate?.toString() || "");
    setReviewedViews(creator.reviewed_avg_reel_views?.toString() || "");
    setReviewNotes(creator.review_notes || "");
    setActionError(null);
    setActionSuccess(null);
    setReviewModalOpen(true);
  };

  const handleVerificationAction = async (status: string) => {
    if (!selectedCreator) return;
    setSubmittingAction(status);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/admin/creators/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: selectedCreator.user_id,
          status,
          reviewedFollowers: reviewedFollowers ? parseInt(reviewedFollowers, 10) : null,
          reviewedEngagement: reviewedEngagement ? parseFloat(reviewedEngagement) : null,
          reviewedViews: reviewedViews ? parseInt(reviewedViews, 10) : null,
          reviewNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update verification status");
      }

      setActionSuccess(`Creator verification updated to: ${status}`);
      setTimeout(() => {
        setReviewModalOpen(false);
        fetchCreators();
      }, 1000);
    } catch (err: any) {
      setActionError(err.message || "An unexpected error occurred");
    } finally {
      setSubmittingAction(null);
    }
  };

  // Filtered creators based on active tab and search
  const filteredCreators = creators.filter((c) => {
    const status = (c.verification_status || "unverified").toLowerCase();
    let matchesTab = true;

    if (activeTab === "pending_review") {
      matchesTab = status === "pending" || status === "pending_review";
    } else if (activeTab === "verified") {
      matchesTab = status.includes("verified");
    } else if (activeTab === "rejected") {
      matchesTab = status === "rejected";
    } else if (activeTab === "resubmission_required") {
      matchesTab = status === "resubmission_required";
    }

    const matchesSearch =
      !searchQuery ||
      c.user?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instagram_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instagram_profile_url?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const pendingCount = creators.filter(
    (c) => (c.verification_status || "unverified").toLowerCase() === "pending" || (c.verification_status || "unverified").toLowerCase() === "pending_review"
  ).length;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Creator Verification Queue</span>
              {pendingCount > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                  {pendingCount} Pending Review
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Inspect submitted Instagram profiles and Reels. Record verified follower & engagement metrics.
            </p>
          </div>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "pending_review", label: "Pending Review", count: pendingCount },
              { id: "verified", label: "Verified" },
              { id: "resubmission_required", label: "Resubmission Needed" },
              { id: "rejected", label: "Rejected" },
              { id: "all", label: "All Creators" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search creator name or IG..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0f172a] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Creators Table / Card Grid */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="py-16 text-center rounded-xl bg-[#0f172a]/50 border border-slate-800/80">
            <UserCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">No creator submissions found</p>
            <p className="text-xs text-slate-500 mt-1">
              There are no submissions matching the selected tab or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0f172a]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1222] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Creator Identity</th>
                  <th className="px-4 py-3.5">Instagram Profile</th>
                  <th className="px-4 py-3.5">Reels Submitted</th>
                  <th className="px-4 py-3.5">Claimed vs Reviewed</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCreators.map((creator) => {
                  const reels = Array.isArray(creator.submitted_reels)
                    ? creator.submitted_reels
                    : [];

                  return (
                    <tr key={creator.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Identity */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-500/20">
                            {creator.user?.display_name?.charAt(0) || "C"}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200">
                              {creator.user?.display_name || "Unnamed Creator"}
                            </div>
                            <div className="text-[11px] text-slate-500">{creator.user?.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Instagram */}
                      <td className="px-4 py-4">
                        {creator.instagram_profile_url ? (
                          <a
                            href={creator.instagram_profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
                          >
                            <Instagram className="w-3.5 h-3.5" />
                            <span>@{creator.instagram_username || "instagram_profile"}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </a>
                        ) : (
                          <span className="text-slate-500">Not submitted</span>
                        )}
                      </td>

                      {/* Reels */}
                      <td className="px-4 py-4">
                        {reels.length > 0 || creator.primary_reel_url ? (
                          <div className="flex items-center gap-1.5">
                            {creator.primary_reel_url && (
                              <a
                                href={creator.primary_reel_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-medium flex items-center gap-1 hover:bg-indigo-500/25"
                                title="Primary Reel"
                              >
                                <Film className="w-3 h-3" />
                                <span>Primary</span>
                              </a>
                            )}
                            {reels.map((reel: string, idx: number) => (
                              <a
                                key={idx}
                                href={reel}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] hover:text-white"
                                title={`Reel #${idx + 1}`}
                              >
                                #{idx + 1}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">No reels</span>
                        )}
                      </td>

                      {/* Metrics */}
                      <td className="px-4 py-4">
                        <div className="space-y-0.5">
                          <div className="text-slate-300 font-medium">
                            {formatNumber(creator.reviewed_follower_count ?? creator.claimed_followers)} followers
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {creator.reviewed_engagement_rate ?? creator.claimed_engagement_rate ?? 0}% engagement
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusBadge status={creator.verification_status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openReviewModal(creator)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review & Verify</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Verification Review Modal */}
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title={`Review Creator: ${selectedCreator?.user?.display_name || "Creator"}`}
          description="Verify Instagram profile submission, inspect reels, and record reviewed metrics."
          maxWidth="2xl"
        >
          {selectedCreator && (
            <div className="space-y-6">
              {/* Notifications */}
              {actionError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Creator Overview Box */}
              <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Creator Email</span>
                  <span className="font-semibold text-slate-200">{selectedCreator.user?.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Current Status</span>
                  <StatusBadge status={selectedCreator.verification_status} />
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Instagram Profile Link</span>
                  {selectedCreator.instagram_profile_url ? (
                    <a
                      href={selectedCreator.instagram_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium mt-0.5"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                      <span>{selectedCreator.instagram_profile_url}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  ) : (
                    <span className="text-slate-500">Not provided</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Self-Claimed Followers</span>
                  <span className="text-slate-300 font-medium">
                    {formatNumber(selectedCreator.claimed_followers)}
                  </span>
                </div>
              </div>

              {/* Submitted Reels List */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Submitted Reels & Proof
                </label>
                <div className="space-y-2">
                  {selectedCreator.primary_reel_url && (
                    <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span className="font-medium text-indigo-200">Primary Featured Reel</span>
                      </div>
                      <a
                        href={selectedCreator.primary_reel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                      >
                        <span>Open Reel</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {Array.isArray(selectedCreator.submitted_reels) &&
                    selectedCreator.submitted_reels.map((reel: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#090d16] border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate pr-4 text-slate-300">
                          <Film className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate">{reel}</span>
                        </div>
                        <a
                          href={reel}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium shrink-0"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                </div>
              </div>

              {/* Admin Review Metrics Form */}
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Admin Verified Metrics
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Observed Followers
                    </label>
                    <input
                      type="number"
                      value={reviewedFollowers}
                      onChange={(e) => setReviewedFollowers(e.target.value)}
                      placeholder="e.g. 25000"
                      className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Engagement Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={reviewedEngagement}
                      onChange={(e) => setReviewedEngagement(e.target.value)}
                      placeholder="e.g. 4.8"
                      className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Average Reel Views
                    </label>
                    <input
                      type="number"
                      value={reviewedViews}
                      onChange={(e) => setReviewedViews(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Internal Review Notes
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add audit rationale or instructions for the creator..."
                    className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleVerificationAction("unverified")}
                  disabled={!!submittingAction}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Revoke Verification
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerificationAction("resubmission_required")}
                    disabled={!!submittingAction}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Request Changes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerificationAction("rejected")}
                    disabled={!!submittingAction}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerificationAction("verified_manual")}
                    disabled={!!submittingAction}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Creator</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}
