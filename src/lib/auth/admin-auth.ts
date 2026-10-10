import { createServerSupabaseClient, getServiceRoleClient } from "@/lib/supabase/server";
import { Profile } from "@/types/database";

export interface AdminAuthResult {
  authorized: boolean;
  userId?: string;
  email?: string;
  profile?: Profile;
  error?: string;
  statusCode: number;
}

/**
 * Server-Side Admin Authorization Validator
 * Validates the user's session token and verifies that the user has the 'admin' role in public.profiles.
 */
export async function requireAdminSession(tokenOrReq?: Request | string): Promise<AdminAuthResult> {
  try {
    const supabase = await createServerSupabaseClient();
    let user = null;

    if (typeof tokenOrReq === "string") {
      // If a JWT token string was provided explicitly
      const { data: tokenUserData, error: tokenErr } = await supabase.auth.getUser(tokenOrReq);
      if (tokenErr || !tokenUserData?.user) {
        return {
          authorized: false,
          error: "Invalid or expired authorization token.",
          statusCode: 401,
        };
      }
      user = tokenUserData.user;
    } else {
      // Standard cookie-based session
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        return {
          authorized: false,
          error: "Authentication required. Please log in.",
          statusCode: 401,
        };
      }
      user = data.user;
    }

    // Double verification: Check public.profiles role
    const serviceClient = getServiceRoleClient();
    const { data: profile, error: profileErr } = await serviceClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return {
        authorized: false,
        error: "User profile not found.",
        statusCode: 403,
      };
    }

    if (profile.role !== "admin") {
      return {
        authorized: false,
        error: "Forbidden: Account does not have administrator privileges.",
        statusCode: 403,
      };
    }

    return {
      authorized: true,
      userId: user.id,
      email: user.email || profile.email,
      profile: profile as Profile,
      statusCode: 200,
    };
  } catch (err: any) {
    console.error("requireAdminSession error:", err);
    return {
      authorized: false,
      error: err?.message || "Authentication service is currently unavailable.",
      statusCode: 500,
    };
  }
}

/**
 * Record an immutable administrative action to public.admin_actions
 */
export async function logAdminAuditAction({
  adminId,
  action,
  targetType,
  targetId,
  metadata,
}: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
}) {
  try {
    const serviceClient = getServiceRoleClient();
    const { error } = await serviceClient.from("admin_actions").insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log admin action:", error);
    }
  } catch (err) {
    console.error("Error logging admin audit action:", err);
  }
}
