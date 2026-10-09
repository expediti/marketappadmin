import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAuditAction } from "@/lib/auth/admin-auth";
import { getServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
  }

  try {
    const supabase = getServiceRoleClient();

    const { data: disputes, error } = await supabase
      .from("disputes")
      .select(
        `
        *,
        raised_by_user:profiles!disputes_raised_by_fkey(id, display_name, email, role),
        resolved_by_admin:profiles!disputes_resolved_by_fkey(id, display_name, email),
        order:orders(
          *,
          creator:profiles!orders_creator_id_fkey(id, display_name, email),
          business:profiles!orders_business_id_fkey(id, display_name, email),
          brief:order_briefs(*),
          deliveries:deliveries(*)
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ disputes: disputes || [] });
  } catch (error: any) {
    console.error("Fetch disputes error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
  }

  try {
    const body = await request.json();
    const { disputeId, resolution, notes } = body;

    if (!disputeId || !resolution) {
      return NextResponse.json(
        { error: "disputeId and resolution are required" },
        { status: 400 }
      );
    }

    if (!["resolved_creator", "resolved_business", "closed"].includes(resolution)) {
      return NextResponse.json(
        { error: "Invalid resolution status" },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const now = new Date().toISOString();

    const { data: dispute, error: disputeErr } = await supabase
      .from("disputes")
      .select("*, order:orders(*)")
      .eq("id", disputeId)
      .single();

    if (disputeErr || !dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    // 1. Update dispute
    const { error: updateDisputeErr } = await supabase
      .from("disputes")
      .update({
        status: resolution,
        resolution_notes: notes || null,
        resolved_at: now,
        resolved_by: auth.userId,
        updated_at: now,
      })
      .eq("id", disputeId);

    if (updateDisputeErr) throw updateDisputeErr;

    // 2. Transition order state safely
    if (dispute.order_id) {
      if (resolution === "resolved_creator") {
        // Release payment to creator
        await supabase
          .from("orders")
          .update({
            status: "completed",
            payment_status: "released",
            payout_status: "pending",
            completed_at: now,
            updated_at: now,
          })
          .eq("id", dispute.order_id);

        await supabase.from("order_events").insert({
          order_id: dispute.order_id,
          actor_id: auth.userId,
          event_type: "ADMIN_DISPUTE_RESOLVED_CREATOR",
          metadata: { dispute_id: disputeId, notes },
          created_at: now,
        });
      } else if (resolution === "resolved_business") {
        // Refund payment to business
        await supabase
          .from("orders")
          .update({
            status: "refunded",
            payment_status: "refunded",
            payout_status: "cancelled",
            updated_at: now,
          })
          .eq("id", dispute.order_id);

        await supabase.from("order_events").insert({
          order_id: dispute.order_id,
          actor_id: auth.userId,
          event_type: "ADMIN_DISPUTE_RESOLVED_BUSINESS",
          metadata: { dispute_id: disputeId, notes },
          created_at: now,
        });
      }
    }

    // 3. Log admin action
    await logAdminAuditAction({
      adminId: auth.userId!,
      action: "RESOLVE_DISPUTE",
      targetType: "dispute",
      targetId: disputeId,
      metadata: {
        order_id: dispute.order_id,
        resolution,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      disputeId,
      resolution,
      resolved_at: now,
    });
  } catch (error: any) {
    console.error("Resolve dispute error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve dispute" },
      { status: 500 }
    );
  }
}
