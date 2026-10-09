"use client";

import React, { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import {
  MessageSquare,
  Search,
  User,
  Clock,
  Shield,
  Send,
  FileText,
  AlertCircle,
  Briefcase,
  ChevronRight,
} from "lucide-react";

export default function ConversationsModerationPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/conversations");
      if (res.ok) {
        const json = await res.json();
        setConversations(json.conversations || []);
        if (json.conversations?.length > 0 && !selectedConversationId) {
          loadConversation(json.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Fetch conversations error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (id: string) => {
    setSelectedConversationId(id);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/conversations?conversationId=${id}`);
      if (res.ok) {
        const json = await res.json();
        setActiveConversation(json.conversation);
        setMessages(json.messages || []);
      }
    } catch (err) {
      console.error("Load conversation error:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.creator?.display_name?.toLowerCase().includes(q) ||
      c.creator?.email?.toLowerCase().includes(q) ||
      c.business?.display_name?.toLowerCase().includes(q) ||
      c.business?.email?.toLowerCase().includes(q) ||
      c.campaign?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Conversations & Moderation</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                Admin Support Read Mode
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Secure moderation interface to inspect creator-business deal discussions and support disputes.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations by creator or business..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0f172a] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Master-Detail Moderation Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          {/* Conversation List */}
          <div className="lg:col-span-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 bg-[#0c1222] text-xs font-semibold text-slate-300">
              Active Threads ({filteredConversations.length})
            </div>

            <div className="flex-1 divide-y divide-slate-800/60 overflow-y-auto max-h-[600px]">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-slate-800/40 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  No conversations found
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedConversationId === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full text-left p-4 transition-colors flex items-start justify-between gap-3 ${
                        isSelected
                          ? "bg-indigo-600/15 border-l-2 border-indigo-500"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {conv.business?.display_name || "Business"} ↔ {conv.creator?.display_name || "Creator"}
                          </span>
                        </div>
                        {conv.campaign && (
                          <div className="text-[11px] text-indigo-400 truncate">
                            Brief: {conv.campaign.title}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500">
                          Last active: {formatDate(conv.last_message_at)}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 mt-2" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Message Thread Detail */}
          <div className="lg:col-span-7 rounded-xl bg-[#0f172a]/90 border border-slate-800 flex flex-col overflow-hidden">
            {activeConversation ? (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b border-slate-800 bg-[#0c1222] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {activeConversation.business?.display_name} & {activeConversation.creator?.display_name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Thread ID: <span className="font-mono">{activeConversation.id}</span>
                    </div>
                  </div>
                  <Badge variant="purple">Moderation Inspection</Badge>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[500px] bg-[#090d16]">
                  {loadingMessages ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 bg-slate-800/40 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-500">
                      No messages recorded in this conversation.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isCreator = msg.sender_id === activeConversation.creator_id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isCreator ? "items-start" : "items-end"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-semibold text-slate-400">
                              {msg.sender?.display_name || (isCreator ? "Creator" : "Business")}
                            </span>
                            <span className="text-[10px] text-slate-600">
                              {formatDate(msg.created_at)}
                            </span>
                          </div>

                          <div
                            className={`p-3 rounded-xl max-w-md text-xs leading-relaxed ${
                              isCreator
                                ? "bg-[#0f172a] border border-slate-800 text-slate-200"
                                : "bg-indigo-950/40 border border-indigo-500/30 text-indigo-100"
                            }`}
                          >
                            {msg.message_type === "proposal" ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[11px]">
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Deal Proposal Sent</span>
                                </div>
                                <div>{msg.content}</div>
                              </div>
                            ) : msg.message_type === "deal_confirmed" ? (
                              <div className="text-emerald-400 font-semibold flex items-center gap-1">
                                <span>🎉 Deal Confirmed & Accepted</span>
                              </div>
                            ) : (
                              <div>{msg.content}</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Audit Warning Footer */}
                <div className="p-3 bg-[#0c1222] border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    Read-only moderation view. Messages are end-to-end protected and logged for audit purposes.
                  </span>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-slate-500">
                Select a conversation on the left to inspect messages.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
