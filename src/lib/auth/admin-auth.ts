import { getServiceRoleClient } from "@/lib/supabase/server";
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
 * Direct open access mode for standalone admin panel.
 */
export async function requireAdminSession(
  _tokenOrReq?: Request | string
): Promise<AdminAuthResult> {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@marketmyidea.online";

  const profile: Profile = {
    id: "admin",
    email: adminEmail,
    role: "admin",
    display_name: "Administrator",
    avatar_url: null,
    city: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    authorized: true,
    userId: "admin",
    email: adminEmail,
    profile,
    statusCode: 200,
  };
}

/**
 * Record an administrative action to public.admin_actions (if DB is connected)
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
    if (!serviceClient) return;

    await serviceClient.from("admin_actions").insert({
      admin_id: adminId || "admin",
      action,
      target_type: targetType,
      target_id: targetId,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Database write skipped if database not configured
  }
}
