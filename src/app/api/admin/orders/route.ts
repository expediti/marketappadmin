import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAuditAction } from "@/lib/auth/admin-auth";
import { getServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  try {
    const supabase = getServiceRoleClient();

    let dbQuery = supabase
      .from("orders")
      .select(
        `
        *,
        creator:profiles!creator_id(id, display_name, email, avatar_url),
        business:profiles!business_id(id, display_name, email, avatar_url),
        campaign:campaigns!campaign_id(id, title),
        brief:order_briefs!order_id(*),
        deliveries:deliveries!order_id(*)
      `,
        { count: "exact" }
      );

    if (status && status !== "all") {
      dbQuery = dbQuery.eq("status", status);
    }

    const { data: orders, count, error } = await dbQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const normalizedOrders = (orders || []).map((o: any) => ({
      ...o,
      creator: Array.isArray(o.creator) ? o.creator[0] || null : o.creator || null,
      business: Array.isArray(o.business) ? o.business[0] || null : o.business || null,
      campaign: Array.isArray(o.campaign) ? o.campaign[0] || null : o.campaign || null,
      brief: Array.isArray(o.brief) ? o.brief[0] || null : o.brief || null,
      deliveries: Array.isArray(o.deliveries) ? o.deliveries : [],
    }));

    return NextResponse.json({
      orders: normalizedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch orders" },
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
    const { orderId, action, notes, payoutUpiId, payoutTransferId } = body;

    if (!orderId || !action) {
      return NextResponse.json({ error: "orderId and action are required" }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const now = new Date().toISOString();

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (action === "update_payout_status") {
      const { payoutStatus } = body;
      const updateData: Record<string, any> = {
        payout_status: payoutStatus,
        updated_at: now,
      };

      if (payoutUpiId) updateData.payout_upi_id = payoutUpiId;
      if (payoutTransferId) updateData.payout_transfer_id = payoutTransferId;
      if (payoutStatus === "completed") updateData.payout_completed_at = now;

      const { error: updateErr } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateErr) throw updateErr;

      // Also update or insert in public.payouts table if exists
      if (payoutStatus === "completed" || payoutStatus === "processing") {
        await supabase.from("payouts").upsert(
          {
            order_id: orderId,
            creator_id: order.creator_id,
            amount: order.creator_payout_amount,
            currency: "INR",
            provider: "upi_manual",
            provider_transfer_id: payoutTransferId || null,
            status: payoutStatus,
            created_at: now,
            updated_at: now,
          },
          { onConflict: "order_id" }
        );
      }

      await logAdminAuditAction({
        adminId: auth.userId!,
        action: "UPDATE_ORDER_PAYOUT",
        targetType: "order",
        targetId: orderId,
        metadata: {
          previous_payout_status: order.payout_status,
          new_payout_status: payoutStatus,
          payout_transfer_id: payoutTransferId,
          notes,
        },
      });

      return NextResponse.json({ success: true, orderId, payoutStatus });
    }

    return NextResponse.json({ error: "Unsupported order action" }, { status: 400 });
  } catch (error: any) {
    console.error("Order action error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to execute order action" },
      { status: 500 }
    );
  }
}
