import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-auth";
import { getServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
  }

  try {
    const supabase = getServiceRoleClient();

    // Query core statistics in parallel
    const [
      { count: totalUsers },
      { count: creatorCount },
      { count: businessCount },
      { count: pendingVerifications },
      { count: verifiedCreators },
      { count: activeOrders },
      { count: pendingPaymentOrders },
      { count: completedOrders },
      { count: disputedOrders },
      { count: pendingPayouts },
      { data: recentAdminActions },
      { data: recentOrderEvents },
      { data: paymentsData },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "creator"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "business"),
      supabase
        .from("creator_profiles")
        .select("*", { count: "exact", head: true })
        .in("verification_status", ["pending", "pending_review"]),
      supabase
        .from("creator_profiles")
        .select("*", { count: "exact", head: true })
        .in("verification_status", ["verified", "verified_manual", "verified_oauth"]),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("status", ["in_progress", "submitted", "escrow_funded"]),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_payment"),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase
        .from("disputes")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "under_review"]),
      supabase
        .from("payouts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("admin_actions")
        .select("*, admin:profiles!admin_id(display_name, email)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("order_events")
        .select("*, actor:profiles!actor_id(display_name, email)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("payments")
        .select("amount, status, currency")
        .eq("status", "captured"),
    ]);

    // Calculate gross volume from captured payments
    const grossVolume = (paymentsData || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        creatorCount: creatorCount || 0,
        businessCount: businessCount || 0,
        pendingVerifications: pendingVerifications || 0,
        verifiedCreators: verifiedCreators || 0,
        activeOrders: activeOrders || 0,
        pendingPaymentOrders: pendingPaymentOrders || 0,
        completedOrders: completedOrders || 0,
        disputedOrders: disputedOrders || 0,
        pendingPayouts: pendingPayouts || 0,
        grossVolume,
      },
      recentActivity: {
        adminActions: recentAdminActions || [],
        orderEvents: recentOrderEvents || [],
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch admin overview:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
