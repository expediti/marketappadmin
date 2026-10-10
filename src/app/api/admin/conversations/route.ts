import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-auth";
import { getServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  try {
    const supabase = getServiceRoleClient();

    // If a specific conversation is requested, fetch full message history
    if (conversationId) {
      const [{ data: conversation, error: convErr }, { data: messages, error: msgErr }] = await Promise.all([
        supabase
          .from("conversations")
          .select(
            `
            *,
            creator:profiles!creator_id(id, display_name, email, avatar_url),
            business:profiles!business_id(id, display_name, email, avatar_url),
            campaign:campaigns!campaign_id(id, title, product_name)
          `
          )
          .eq("id", conversationId)
          .single(),
        supabase
          .from("messages")
          .select(
            `
            *,
            sender:profiles!sender_id(id, display_name, email, avatar_url),
            receiver:profiles!receiver_id(id, display_name, email, avatar_url)
          `
          )
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(100),
      ]);

      if (convErr) throw convErr;
      if (msgErr) throw msgErr;

      const normalizedMessages = (messages || []).map((m: any) => ({
        ...m,
        sender: Array.isArray(m.sender) ? m.sender[0] || null : m.sender || null,
        receiver: Array.isArray(m.receiver) ? m.receiver[0] || null : m.receiver || null,
      }));

      const normalizedConv = conversation
        ? {
            ...conversation,
            creator: Array.isArray(conversation.creator) ? conversation.creator[0] || null : conversation.creator || null,
            business: Array.isArray(conversation.business) ? conversation.business[0] || null : conversation.business || null,
            campaign: Array.isArray(conversation.campaign) ? conversation.campaign[0] || null : conversation.campaign || null,
          }
        : null;

      return NextResponse.json({
        conversation: normalizedConv,
        messages: normalizedMessages,
      });
    }

    // Otherwise list conversations
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        creator:profiles!creator_id(id, display_name, email, avatar_url),
        business:profiles!business_id(id, display_name, email, avatar_url),
        campaign:campaigns!campaign_id(id, title, product_name)
      `
      )
      .order("last_message_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const normalizedConversations = (conversations || []).map((c: any) => ({
      ...c,
      creator: Array.isArray(c.creator) ? c.creator[0] || null : c.creator || null,
      business: Array.isArray(c.business) ? c.business[0] || null : c.business || null,
      campaign: Array.isArray(c.campaign) ? c.campaign[0] || null : c.campaign || null,
    }));

    return NextResponse.json({
      conversations: normalizedConversations,
    });
  } catch (error: any) {
    console.error("Fetch conversations error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
