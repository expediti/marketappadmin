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
        raised_by_user:profiles!raised_by(id, display_name, email, role),
        resolved_by_admin:profiles!resolved_by(id, display_name, email),
        order:orders!order_id(
          *,
          creator:profiles!creator_id(id, display_name, email),
          business:profiles!business_id(id, display_name, email),
          brief:order_briefs!order_id(*),
          deliveries:deliveries!order_id(*)
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const normalizedDisputes = (disputes || []).map((d: any) => ({
      ...d,
      raised_by_user: Array.isArray(d.raised_by_user) ? d.raised_by_user[0] || null : d.raised_by_user || null,
      resolved_by_admin: Array.isArray(d.resolved_by_admin) ? d.resolved_by_admin[0] || null : d.resolved_by_admin || null,
      order: d.order
        ? {
            ...d.order,
            creator: Array.isArray(d.order.creator) ? d.order.creator[0] || null : d.order.creator || null,
            business: Array.isArray(d.order.business) ? d.order.business[0] || null : d.order.business || null,
            brief: Array.isArray(d.order.brief) ? d.order.brief[0] || null : d.order.brief || null,
            deliveries: Array.isArray(d.order.deliveries) ? d.order.deliveries : [],
          }
        : null,
    }));

    return NextResponse.json({ disputes: normalizedDisputes });
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
