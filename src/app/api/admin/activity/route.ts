import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-auth";
import { getServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "40", 10)));

  try {
    const supabase = getServiceRoleClient();

    const [
      { data: adminActions, error: adminErr },
      { data: orderEvents, error: orderErr },
    ] = await Promise.all([
      supabase
        .from("admin_actions")
        .select("*, admin:profiles!admin_actions_admin_id_fkey(display_name, email, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("order_events")
        .select("*, actor:profiles!order_events_actor_id_fkey(display_name, email, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    if (adminErr) throw adminErr;
    if (orderErr) throw orderErr;

    return NextResponse.json({
      adminActions: adminActions || [],
      orderEvents: orderEvents || [],
    });
  } catch (error: any) {
    console.error("Fetch activity error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
