"use client";

import React, { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  Users,
  Search,
  Filter,
  UserCheck,
  Briefcase,
  Shield,
  Eye,
  Calendar,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ totalPages: 1, total: 0 });
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Role modification state
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleChangeSuccess, setRoleChangeSuccess] = useState<string | null>(null);
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        role: roleFilter,
        query: searchQuery,
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
        setPagination(json.pagination || { totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleRoleChange = async (newRole: string) => {
    if (!selectedUser) return;
    setUpdatingRole(true);
    setRoleChangeError(null);
    setRoleChangeSuccess(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: "update_role",
          role: newRole,
          reason: "Administrative role update via Admin Panel",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update role");

      setRoleChangeSuccess(`User role successfully changed to ${newRole}`);
      setSelectedUser({ ...selectedUser, role: newRole });
      fetchUsers();
    } catch (err: any) {
      setRoleChangeError(err.message || "Failed to update role");
    } finally {
      setUpdatingRole(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>User Directory</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                {pagination.total} Registered Accounts
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Search and inspect creator, business, and administrator profiles.
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f172a]/90 p-4 rounded-xl border border-slate-800">
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["all", "creator", "business", "admin"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRoleFilter(r);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  roleFilter === r
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {r === "all" ? "All Roles" : `${r}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center rounded-xl bg-[#0f172a]/50 border border-slate-800/80">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">No users found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or role filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0f172a]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1222] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">User Identity</th>
                  <th className="px-4 py-3.5">Platform Role</th>
                  <th className="px-4 py-3.5">City / Location</th>
                  <th className="px-4 py-3.5">Linked Profile Details</th>
                  <th className="px-4 py-3.5">Registered</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((user) => {
                  const creator = user.creator_profile;
                  const business = user.business_profile;

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Identity */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center shrink-0 border border-slate-700">
                            {user.display_name?.charAt(0) || user.email?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200">
                              {user.display_name || "Unnamed User"}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-4">
                        <Badge
                          variant={
                            user.role === "admin"
                              ? "purple"
                              : user.role === "creator"
                              ? "info"
                              : user.role === "business"
                              ? "default"
                              : "neutral"
                          }
                        >
                          {user.role || "none"}
                        </Badge>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-4 text-slate-400">
                        {user.city ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{user.city}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Profile Details */}
                      <td className="px-4 py-4">
                        {user.role === "creator" && creator ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-300 font-medium">
                              {formatNumber(creator.follower_count)} followers
                            </div>
                            <StatusBadge status={creator.verification_status} />
                          </div>
                        ) : user.role === "business" && business ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-200 font-medium">
                              {business.business_name || "Brand Account"}
                            </div>
                            <div className="text-[11px] text-slate-500">{business.business_type}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(user.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setRoleChangeError(null);
                            setRoleChangeSuccess(null);
                            setDetailModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* User Detail & Role Management Modal */}
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`User Details: ${selectedUser?.display_name || selectedUser?.email || "Account"}`}
          maxWidth="2xl"
        >
          {selectedUser && (
            <div className="space-y-6">
              {roleChangeError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{roleChangeError}</span>
                </div>
              )}
              {roleChangeSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>{roleChangeSuccess}</span>
                </div>
              )}

              {/* Base User Metadata */}
              <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">User ID (UUID)</span>
                  <span className="font-mono text-slate-300">{selectedUser.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Email Address</span>
                  <span className="font-medium text-slate-200">{selectedUser.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Registered Date</span>
                  <span className="text-slate-300">{formatDate(selectedUser.created_at)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Current Global Role</span>
                  <Badge variant={selectedUser.role === "admin" ? "purple" : "default"}>
                    {selectedUser.role || "none"}
                  </Badge>
                </div>
              </div>

              {/* Creator Profile Section */}
              {selectedUser.creator_profile && (
                <div className="p-4 rounded-xl bg-[#0c1222] border border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Creator Profile Attributes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Verification</span>
                      <StatusBadge status={selectedUser.creator_profile.verification_status} />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Follower Count</span>
                      <span className="text-slate-200 font-medium">
                        {formatNumber(selectedUser.creator_profile.follower_count)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">UPI Payout ID</span>
                      <span className="font-mono text-slate-300">
                        {selectedUser.creator_profile.payout_upi_id || "Not set"}
                      </span>
                    </div>
                  </div>
                  {selectedUser.creator_profile.bio && (
                    <div className="text-xs text-slate-400 bg-[#090d16] p-2.5 rounded-lg border border-slate-800/80">
                      {selectedUser.creator_profile.bio}
                    </div>
                  )}
                </div>
              )}

              {/* Business Profile Section */}
              {selectedUser.business_profile && (
                <div className="p-4 rounded-xl bg-[#0c1222] border border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Business Profile Attributes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Business Name</span>
                      <span className="text-slate-200 font-medium">
                        {selectedUser.business_profile.business_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Industry / Type</span>
                      <span className="text-slate-300">
                        {selectedUser.business_profile.business_type} • {selectedUser.business_profile.industry}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Role Assignment Controls */}
              <div className="pt-4 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Change Account Role
                </label>
                <div className="flex items-center gap-2">
                  {["creator", "business", "admin"].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      disabled={updatingRole || selectedUser.role === r}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors disabled:opacity-40 ${
                        selectedUser.role === r
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Note: Updating a user's role is recorded in the administrative audit log.
                </p>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}
