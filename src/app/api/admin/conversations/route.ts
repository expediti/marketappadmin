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
      const [{ data: conversation }, { data: messages, error: msgErr }] = await Promise.all([
        supabase
          .from("conversations")
          .select(
            `
            *,
            creator:profiles!conversations_creator_id_fkey(id, display_name, email, avatar_url),
            business:profiles!conversations_business_id_fkey(id, display_name, email, avatar_url),
            campaign:campaigns(*)
          `
          )
          .eq("id", conversationId)
          .single(),
        supabase
          .from("messages")
          .select(
            `
            *,
            sender:profiles!messages_sender_id_fkey(id, display_name, email, avatar_url),
            receiver:profiles!messages_receiver_id_fkey(id, display_name, email, avatar_url)
          `
          )
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(100),
      ]);

      if (msgErr) throw msgErr;

      return NextResponse.json({
        conversation,
        messages: messages || [],
      });
    }

    // Otherwise list conversations
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        creator:profiles!conversations_creator_id_fkey(id, display_name, email, avatar_url),
        business:profiles!conversations_business_id_fkey(id, display_name, email, avatar_url),
        campaign:campaigns(id, title, product_name)
      `
      )
      .order("last_message_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({
      conversations: conversations || [],
    });
  } catch (error: any) {
    console.error("Fetch conversations error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
