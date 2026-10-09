import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAuditAction } from "@/lib/auth/admin-auth";
import { getServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
  }

  try {
    const body = await request.json();
    const {
      creatorId,
      status,
      reviewedFollowers,
      reviewedEngagement,
      reviewedViews,
      reviewNotes,
    } = body;

    if (!creatorId || !status) {
      return NextResponse.json(
        { error: "creatorId and status are required." },
        { status: 400 }
      );
    }

    const validStatuses = [
      "verified",
      "verified_manual",
      "verified_oauth",
      "rejected",
      "resubmission_required",
      "unverified",
      "pending_review",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const now = new Date().toISOString();

    // Check if creator profile exists
    const { data: creator, error: fetchErr } = await supabase
      .from("creator_profiles")
      .select("id, user_id, verification_status, instagram_profile_url")
      .eq("user_id", creatorId)
      .single();

    if (fetchErr || !creator) {
      return NextResponse.json(
        { error: "Creator profile not found." },
        { status: 404 }
      );
    }

    const isApproved = ["verified", "verified_manual", "verified_oauth"].includes(status);

    // Update creator_profiles
    const updatePayload: Record<string, any> = {
      verification_status: status,
      instagram_verified: isApproved,
      reviewed_follower_count: reviewedFollowers !== undefined && reviewedFollowers !== null ? Number(reviewedFollowers) : null,
      reviewed_engagement_rate: reviewedEngagement !== undefined && reviewedEngagement !== null ? Number(reviewedEngagement) : null,
      reviewed_avg_reel_views: reviewedViews !== undefined && reviewedViews !== null ? Number(reviewedViews) : null,
      review_notes: reviewNotes || null,
      reviewed_at: now,
      reviewed_by: auth.userId,
      updated_at: now,
    };

    if (reviewedFollowers && Number(reviewedFollowers) > 0) {
      updatePayload.follower_count = Number(reviewedFollowers);
    }
    if (reviewedEngagement && Number(reviewedEngagement) >= 0) {
      updatePayload.engagement_rate = Number(reviewedEngagement);
    }
    if (isApproved) {
      updatePayload.metrics_source = "platform_manual";
      updatePayload.metrics_verified_at = now;
    }

    const { error: updateErr } = await supabase
      .from("creator_profiles")
      .update(updatePayload)
      .eq("user_id", creatorId);

    if (updateErr) {
      console.error("Failed to update creator verification:", updateErr);
      return NextResponse.json(
        { error: updateErr.message || "Failed to update creator status." },
        { status: 500 }
      );
    }

    // Log admin audit action
    await logAdminAuditAction({
      adminId: auth.userId!,
      action: "VERIFY_CREATOR",
      targetType: "creator_profile",
      targetId: creatorId,
      metadata: {
        previous_status: creator.verification_status,
        new_status: status,
        reviewed_followers: reviewedFollowers,
        reviewed_engagement: reviewedEngagement,
        reviewed_views: reviewedViews,
        notes: reviewNotes,
      },
    });

    // Create user notification for creator
    await supabase.from("notifications").insert({
      user_id: creatorId,
      title: isApproved
        ? "Instagram Profile Verified!"
        : status === "resubmission_required"
        ? "Verification Update: Resubmission Requested"
        : "Verification Status Update",
      message: isApproved
        ? "Congratulations! Your Instagram profile and reels have been verified by the MarketMyIdea team."
        : status === "resubmission_required"
        ? `Review Notes: ${reviewNotes || "Please update your submitted Reels or Instagram profile link."}`
        : `Your verification submission status has been updated to: ${status}.`,
      type: "verification_update",
      link: "/dashboard",
      is_read: false,
      created_at: now,
    });

    return NextResponse.json({
      success: true,
      creatorId,
      status,
      reviewed_at: now,
    });
  } catch (error: any) {
    console.error("Verification endpoint error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
