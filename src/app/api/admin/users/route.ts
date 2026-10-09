import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAuditAction } from "@/lib/auth/admin-auth";
import { getServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const role = searchParams.get("role") || "all";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  try {
    const supabase = getServiceRoleClient();

    let dbQuery = supabase
      .from("profiles")
      .select(
        `
        *,
        creator_profile:creator_profiles(*),
        business_profile:business_profiles(*)
      `,
        { count: "exact" }
      );

    if (role && role !== "all") {
      dbQuery = dbQuery.eq("role", role);
    }

    if (query) {
      dbQuery = dbQuery.or(
        `display_name.ilike.%${query}%,email.ilike.%${query}%,city.ilike.%${query}%`
      );
    }

    const { data: users, count, error } = await dbQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
  }

  try {
    const body = await request.json();
    const { userId, role, action, reason } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Verify target user exists
    const { data: targetUser, error: findErr } = await supabase
      .from("profiles")
      .select("id, role, email, display_name")
      .eq("id", userId)
      .single();

    if (findErr || !targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    if (action === "update_role") {
      if (!["creator", "business", "admin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
      }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (updateErr) throw updateErr;

      await logAdminAuditAction({
        adminId: auth.userId!,
        action: "UPDATE_USER_ROLE",
        targetType: "profile",
        targetId: userId,
        metadata: {
          previous_role: targetUser.role,
          new_role: role,
          reason,
        },
      });

      return NextResponse.json({ success: true, userId, newRole: role });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
