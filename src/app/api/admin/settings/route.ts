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

    // Check database health and response time
    const startTime = Date.now();
    const { error: dbCheckErr } = await supabase.from("profiles").select("id").limit(1);
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      environment: {
        workerName: "marketmyidea-admin",
        customDomain: "admin.marketmyidea.online",
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "Configured",
        nodeEnv: process.env.NODE_ENV || "production",
      },
      features: {
        instagramOauthEnabled: false,
        instagramManualVerificationEnabled: true,
        platformFeePercent: 10,
        creatorPayoutPercent: 90,
        deliveryAutoApproveHours: 48,
        disputeResolutionEscrowControl: true,
      },
      databaseStatus: {
        connected: !dbCheckErr,
        latencyMs: dbLatencyMs,
        error: dbCheckErr ? dbCheckErr.message : null,
      },
    });
  } catch (error: any) {
    console.error("Fetch settings error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
