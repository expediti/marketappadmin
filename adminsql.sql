-- ============================================================================
-- MARKETMYIDEA — COMPLETE SCHEMA-ONLY SQL EXPORT (REFERENCE ARTIFACT)
-- Generated for: Separate Admin Application Handoff
-- Source: Supabase Migrations 001_extensions.sql through 033_manual_instagram_verification.sql
-- Note: This is a schema reference artifact for architectural understanding.
--       DO NOT apply directly to reset or recreate the live production database.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. CORE HELPER FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Admin authorization helper function used across RLS policies and RPCs
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. PROFILES TABLE (Linked to auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('creator', 'business', 'admin')),
    display_name TEXT NOT NULL DEFAULT 'User',
    email TEXT NOT NULL,
    avatar_url TEXT,
    city TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User auto-creation on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    raw_role TEXT;
    extracted_name TEXT;
    extracted_avatar TEXT;
BEGIN
    raw_role := LOWER(COALESCE(
        NEW.raw_user_meta_data->>'role',
        NEW.raw_app_meta_data->>'role',
        ''
    ));

    IF raw_role NOT IN ('creator', 'business', 'admin') THEN
        raw_role := NULL;
    END IF;

    extracted_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1),
        'User'
    );

    extracted_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NULL
    );

    INSERT INTO public.profiles (id, role, display_name, email, avatar_url)
    VALUES (NEW.id, raw_role, extracted_name, NEW.email, extracted_avatar)
    ON CONFLICT (id) DO UPDATE SET
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        display_name = CASE
            WHEN public.profiles.display_name = 'User' OR public.profiles.display_name = '' THEN EXCLUDED.display_name
            ELSE public.profiles.display_name
        END,
        email = EXCLUDED.email,
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 4. CREATOR PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT,
    profile_image_path TEXT,
    country TEXT DEFAULT 'India',
    state TEXT,
    city TEXT,
    languages TEXT[] DEFAULT ARRAY['Hindi', 'English']::TEXT[],
    categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    niche TEXT NOT NULL DEFAULT 'Technology',
    audience_age JSONB NOT NULL DEFAULT '{"18-24": 45, "25-34": 40, "35-44": 15}'::jsonb,
    audience_gender JSONB NOT NULL DEFAULT '{"male": 60, "female": 40}'::jsonb,
    audience_locations JSONB NOT NULL DEFAULT '["Delhi", "Mumbai", "Bangalore"]'::jsonb,
    follower_count INTEGER NOT NULL DEFAULT 0 CHECK (follower_count >= 0),
    average_reach INTEGER NOT NULL DEFAULT 0 CHECK (average_reach >= 0),
    engagement_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (engagement_rate >= 0),
    
    -- Instagram Connection & Verification fields
    instagram_connected BOOLEAN NOT NULL DEFAULT false,
    instagram_user_id TEXT,
    instagram_verified BOOLEAN NOT NULL DEFAULT false,
    metrics_source TEXT NOT NULL DEFAULT 'platform_manual' CHECK (metrics_source IN ('platform_manual', 'instagram_api', 'business_verified', 'creator_claimed')),
    metrics_verified_at TIMESTAMPTZ,
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN (
        'unverified', 'pending', 'pending_review', 'verified', 'verified_manual', 'verified_oauth', 'rejected', 'resubmission_required', 'deleted'
    )),
    payout_upi_id TEXT,
    
    -- Creator-Submitted Manual Verification URLs
    instagram_username TEXT,
    instagram_profile_url TEXT,
    submitted_reels JSONB DEFAULT '[]'::jsonb,
    primary_reel_url TEXT,
    claimed_followers INTEGER,
    claimed_engagement_rate NUMERIC(5, 2),
    
    -- Admin-Reviewed Metrics & Governance
    reviewed_follower_count INTEGER,
    reviewed_engagement_rate NUMERIC(5, 2),
    reviewed_avg_reel_views INTEGER,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    review_notes TEXT,
    
    -- Preserved Instagram OAuth & Sync fields
    instagram_profile_data JSONB DEFAULT '{}'::jsonb,
    instagram_connected_at TIMESTAMPTZ,
    instagram_access_token TEXT,
    instagram_last_synced_at TIMESTAMPTZ,
    instagram_sync_status TEXT DEFAULT 'idle' CHECK (instagram_sync_status IN ('idle', 'syncing', 'success', 'failed')),
    instagram_webhook_received_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON public.creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_niche ON public.creator_profiles(niche);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_city ON public.creator_profiles(city);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_verification_status ON public.creator_profiles(verification_status);

DROP TRIGGER IF EXISTS set_creator_profiles_updated_at ON public.creator_profiles;
CREATE TRIGGER set_creator_profiles_updated_at
    BEFORE UPDATE ON public.creator_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. BUSINESS PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    logo_path TEXT,
    website TEXT,
    app_url TEXT,
    description TEXT,
    business_type TEXT NOT NULL DEFAULT 'App / SaaS' CHECK (business_type IN ('App / SaaS', 'E-Commerce / D2C', 'Agency / Brand', 'Local Business / Retail', 'Other')),
    category TEXT,
    industry TEXT NOT NULL DEFAULT 'Technology',
    city TEXT NOT NULL DEFAULT 'India',
    state TEXT,
    country TEXT DEFAULT 'India',
    target_audience TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON public.business_profiles(user_id);

DROP TRIGGER IF EXISTS set_business_profiles_updated_at ON public.business_profiles;
CREATE TRIGGER set_business_profiles_updated_at
    BEFORE UPDATE ON public.business_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. CAMPAIGNS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    product_name TEXT NOT NULL,
    product_url TEXT,
    target_niche TEXT[] DEFAULT ARRAY[]::TEXT[],
    target_locations TEXT[] DEFAULT ARRAY[]::TEXT[],
    budget NUMERIC(10, 2) NOT NULL CHECK (budget >= 0),
    deadline TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON public.campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- ----------------------------------------------------------------------------
-- 7. CREATOR PACKAGES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.creator_profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'Instagram' CHECK (platform IN ('Instagram', 'YouTube', 'TikTok', 'Twitter', 'Bundle')),
    deliverables TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    turnaround_days INTEGER NOT NULL DEFAULT 7 CHECK (turnaround_days > 0),
    revisions_allowed INTEGER NOT NULL DEFAULT 1 CHECK (revisions_allowed >= 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_creator_packages_creator_id ON public.creator_packages(creator_id);

-- ----------------------------------------------------------------------------
-- 8. CREATOR REELS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.creator_profiles(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    reel_url TEXT,
    thumbnail_url TEXT,
    view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
    like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
    comment_count INTEGER DEFAULT 0 CHECK (comment_count >= 0),
    engagement_rate NUMERIC(5, 2) DEFAULT 0.00 CHECK (engagement_rate >= 0),
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    instagram_media_id TEXT,
    permalink TEXT,
    media_type TEXT,
    metrics_source TEXT DEFAULT 'platform_manual' CHECK (metrics_source IN ('platform_manual', 'instagram_api')),
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_creator_reels_creator_id ON public.creator_reels(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_reels_featured ON public.creator_reels(is_featured);

-- ----------------------------------------------------------------------------
-- 9. CONVERSATIONS & MESSAGES TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(creator_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_creator_id ON public.conversations(creator_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON public.conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN (
        'text', 'image', 'video', 'link', 'proposal', 'deal_confirmed', 'status_update', 'system'
    )),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- ----------------------------------------------------------------------------
-- 10. COLLABORATION REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collaboration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.creator_packages(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    brand_name TEXT NOT NULL,
    app_link TEXT,
    campaign_goal TEXT,
    target_audience TEXT,
    requirements TEXT,
    preferred_timeline TEXT,
    offered_price NUMERIC(10, 2) NOT NULL CHECK (offered_price >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'rejected', 'negotiating', 'cancelled', 'order_created', 'expired'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_collab_req_business ON public.collaboration_requests(business_user_id);
CREATE INDEX IF NOT EXISTS idx_collab_req_creator ON public.collaboration_requests(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_collab_req_status ON public.collaboration_requests(status);

-- ----------------------------------------------------------------------------
-- 11. ORDERS TABLE (Unified Workflow Engine)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    package_id UUID REFERENCES public.creator_packages(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    request_id UUID REFERENCES public.collaboration_requests(id) ON DELETE SET NULL,
    proposal_id UUID,
    
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    total_amount NUMERIC(10, 2),
    escrow_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (escrow_amount >= 0),
    platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (platform_fee >= 0),
    creator_payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (creator_payout_amount >= 0),
    creator_earnings NUMERIC(10, 2),
    
    currency TEXT NOT NULL DEFAULT 'INR',
    turnaround_days INTEGER NOT NULL DEFAULT 7 CHECK (turnaround_days > 0),
    revisions_allowed INTEGER NOT NULL DEFAULT 1 CHECK (revisions_allowed >= 0),
    revisions_used INTEGER NOT NULL DEFAULT 0 CHECK (revisions_used >= 0),
    
    -- Comprehensive lifecycle states
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN (
        'created', 'pending', 'pending_payment', 'escrow_funded', 'in_progress',
        'submitted', 'revision_requested', 'disputed', 'completed', 'cancelled', 'refunded'
    )),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
        'unpaid', 'pending', 'held_in_escrow', 'released', 'refunded', 'failed'
    )),
    payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled'
    )),
    
    deadline TIMESTAMPTZ,
    work_started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    auto_approve_at TIMESTAMPTZ,
    
    payout_upi_id TEXT,
    payout_transfer_id TEXT,
    payout_completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_business_id ON public.orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_creator_id ON public.orders(creator_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_auto_approve_at ON public.orders(auto_approve_at);

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 12. DEAL PROPOSALS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    description TEXT,
    deliverables TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    turnaround_days INTEGER NOT NULL DEFAULT 7 CHECK (turnaround_days > 0),
    revisions_allowed INTEGER NOT NULL DEFAULT 1 CHECK (revisions_allowed >= 0),
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'rejected', 'expired', 'superseded', 'cancelled'
    )),
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_deal_proposals_conv ON public.deal_proposals(conversation_id);
CREATE INDEX IF NOT EXISTS idx_deal_proposals_status ON public.deal_proposals(status);

-- ----------------------------------------------------------------------------
-- 13. ORDER BRIEFS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_url TEXT,
    app_download_link TEXT,
    brand_guidelines TEXT,
    key_talking_points TEXT,
    do_points TEXT,
    dont_points TEXT,
    reference_links TEXT[] DEFAULT ARRAY[]::TEXT[],
    attachments JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed', 'revision_requested')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_briefs_order_id ON public.order_briefs(order_id);

-- ----------------------------------------------------------------------------
-- 14. DELIVERIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    video_url TEXT,
    reel_url TEXT,
    caption TEXT,
    notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'revision_requested', 'rejected')),
    feedback TEXT,
    revision_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_creator_id ON public.deliveries(creator_id);

-- ----------------------------------------------------------------------------
-- 15. PAYMENTS TABLE (Razorpay / Escrow Integration)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    provider TEXT NOT NULL DEFAULT 'razorpay' CHECK (provider IN ('razorpay', 'cashfree', 'stripe', 'simulation', 'upi_manual')),
    provider_order_id TEXT,
    provider_payment_id TEXT,
    provider_signature TEXT,
    provider_transfer_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'authorized', 'captured', 'held_in_escrow',
        'released_to_creator', 'refunded', 'failed', 'cancelled'
    )),
    idempotency_key TEXT UNIQUE,
    error_code TEXT,
    error_description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON public.payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- ----------------------------------------------------------------------------
-- 16. PAYOUTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.creator_profiles(user_id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    provider TEXT NOT NULL DEFAULT 'upi_bank_transfer',
    provider_transfer_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payouts_creator_id ON public.payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_payouts_order_id ON public.payouts(order_id);

-- ----------------------------------------------------------------------------
-- 17. DISPUTES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    raised_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_creator', 'resolved_business', 'closed')),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);

-- ----------------------------------------------------------------------------
-- 18. ORDER EVENTS AUDIT LOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON public.order_events(created_at);

-- ----------------------------------------------------------------------------
-- 19. NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);

-- ----------------------------------------------------------------------------
-- 20. ADMIN ACTIONS AUDIT LOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON public.admin_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at);

-- ----------------------------------------------------------------------------
-- 21. INSTAGRAM WEBHOOK EVENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instagram_user_id TEXT NOT NULL,
    creator_user_id UUID REFERENCES public.creator_profiles(user_id) ON DELETE SET NULL,
    field TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN NOT NULL DEFAULT false,
    error TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ig_webhooks_user_id ON public.instagram_webhook_events(instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_ig_webhooks_processed ON public.instagram_webhook_events(processed);

-- ----------------------------------------------------------------------------
-- 22. STORAGE BUCKETS & POLICIES
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('creator-reels', 'creator-reels', true, 19922944, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
    ('creator-profiles', 'creator-profiles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('business-logos', 'business-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
    ('order-deliveries', 'order-deliveries', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'application/zip', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 23. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_webhook_events ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Public can read profiles" ON public.profiles;
CREATE POLICY "Public can read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- Creator Profiles
DROP POLICY IF EXISTS "Public can read creator profiles" ON public.creator_profiles;
CREATE POLICY "Public can read creator profiles" ON public.creator_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can update own profile" ON public.creator_profiles;
CREATE POLICY "Creators can update own profile" ON public.creator_profiles FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Business Profiles
DROP POLICY IF EXISTS "Public can read business profiles" ON public.business_profiles;
CREATE POLICY "Public can read business profiles" ON public.business_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Businesses can update own profile" ON public.business_profiles;
CREATE POLICY "Businesses can update own profile" ON public.business_profiles FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Orders
DROP POLICY IF EXISTS "Users can view relevant orders" ON public.orders;
CREATE POLICY "Users can view relevant orders" ON public.orders FOR SELECT
    USING (auth.uid() = business_id OR auth.uid() = creator_id OR public.is_admin());

-- Admin Actions Audit Table
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_actions;
CREATE POLICY "Admins can view audit logs" ON public.admin_actions FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_actions;
CREATE POLICY "Admins can insert audit logs" ON public.admin_actions FOR INSERT
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 24. CORE BUSINESS STORED PROCEDURES & SECURE RPCS
-- ----------------------------------------------------------------------------

-- A. Manual Creator Verification Submission RPC
CREATE OR REPLACE FUNCTION public.submit_creator_manual_verification(
    p_user_id UUID,
    p_profile_url TEXT,
    p_reels JSONB,
    p_primary_reel_url TEXT DEFAULT NULL,
    p_claimed_followers INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_extracted_username TEXT;
BEGIN
    IF auth.uid() <> p_user_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: You can only submit verification for your own account';
    END IF;

    IF p_profile_url IS NOT NULL THEN
        v_extracted_username := substring(p_profile_url from 'instagram\.com/([a-zA-Z0-9._]+)');
    END IF;

    UPDATE public.creator_profiles
    SET
        instagram_profile_url = p_profile_url,
        instagram_username = COALESCE(v_extracted_username, instagram_username),
        submitted_reels = COALESCE(p_reels, '[]'::jsonb),
        primary_reel_url = p_primary_reel_url,
        claimed_followers = COALESCE(p_claimed_followers, claimed_followers),
        verification_status = 'pending_review',
        updated_at = v_now
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'verification_status', 'pending_review');
END;
$$;

-- B. Admin Creator Verification RPC
CREATE OR REPLACE FUNCTION public.admin_verify_creator(
    p_creator_id UUID,
    p_status TEXT,
    p_reviewed_followers INTEGER DEFAULT NULL,
    p_reviewed_engagement NUMERIC DEFAULT NULL,
    p_reviewed_views INTEGER DEFAULT NULL,
    p_review_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Only platform administrators can verify creators.';
    END IF;

    IF p_status NOT IN ('verified', 'verified_manual', 'rejected', 'resubmission_required', 'unverified', 'pending_review') THEN
        RAISE EXCEPTION 'Invalid verification status: %', p_status;
    END IF;

    UPDATE public.creator_profiles
    SET
        verification_status = p_status,
        instagram_verified = (p_status IN ('verified', 'verified_manual', 'verified_oauth')),
        reviewed_follower_count = p_reviewed_followers,
        reviewed_engagement_rate = p_reviewed_engagement,
        reviewed_avg_reel_views = p_reviewed_views,
        follower_count = CASE
            WHEN p_reviewed_followers IS NOT NULL AND p_reviewed_followers > 0 THEN p_reviewed_followers
            ELSE follower_count
        END,
        engagement_rate = CASE
            WHEN p_reviewed_engagement IS NOT NULL AND p_reviewed_engagement >= 0 THEN p_reviewed_engagement
            ELSE engagement_rate
        END,
        metrics_source = 'platform_manual',
        metrics_verified_at = v_now,
        reviewed_at = v_now,
        reviewed_by = v_admin_id,
        review_notes = p_review_notes,
        updated_at = v_now
    WHERE user_id = p_creator_id;

    INSERT INTO public.admin_actions (
        admin_id, action, target_type, target_id, metadata, created_at
    ) VALUES (
        v_admin_id, 'VERIFY_CREATOR', 'creator_profile', p_creator_id::text,
        jsonb_build_object(
            'new_status', p_status,
            'reviewed_followers', p_reviewed_followers,
            'reviewed_engagement', p_reviewed_engagement,
            'reviewed_views', p_reviewed_views,
            'notes', p_review_notes
        ),
        v_now
    );

    RETURN jsonb_build_object('success', true, 'creator_id', p_creator_id, 'verification_status', p_status, 'reviewed_at', v_now);
END;
$$;

-- C. Accept Deal Proposal RPC
CREATE OR REPLACE FUNCTION public.accept_deal_proposal(p_proposal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prop RECORD;
    v_order_id UUID;
    v_platform_fee NUMERIC(10, 2);
    v_creator_payout NUMERIC(10, 2);
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    SELECT * INTO v_prop FROM public.deal_proposals WHERE id = p_proposal_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proposal not found';
    END IF;

    IF auth.uid() <> v_prop.business_id AND auth.uid() <> v_prop.creator_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_prop.status <> 'pending' THEN
        RAISE EXCEPTION 'Proposal is not in pending state';
    END IF;

    v_platform_fee := ROUND(v_prop.price * 0.10, 2);
    v_creator_payout := v_prop.price - v_platform_fee;

    INSERT INTO public.orders (
        business_id, creator_id, proposal_id, campaign_id,
        amount, total_amount, escrow_amount, platform_fee, creator_payout_amount,
        turnaround_days, revisions_allowed, status, payment_status, payout_status,
        deadline, created_at, updated_at
    ) VALUES (
        v_prop.business_id, v_prop.creator_id, v_prop.id, v_prop.campaign_id,
        v_prop.price, v_prop.price, 0.00, v_platform_fee, v_creator_payout,
        v_prop.turnaround_days, v_prop.revisions_allowed, 'pending_payment', 'unpaid', 'pending',
        v_now + (v_prop.turnaround_days || ' days')::INTERVAL, v_now, v_now
    ) RETURNING id INTO v_order_id;

    UPDATE public.deal_proposals
    SET status = 'accepted', order_id = v_order_id, accepted_at = v_now, updated_at = v_now
    WHERE id = p_proposal_id;

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'proposal_id', p_proposal_id);
END;
$$;

-- D. Auto-Approval Cron Processor RPC
CREATE OR REPLACE FUNCTION public.process_auto_approvals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_count INTEGER := 0;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    FOR v_order IN
        SELECT * FROM public.orders
        WHERE status = 'submitted'
          AND auto_approve_at IS NOT NULL
          AND auto_approve_at <= v_now
    LOOP
        UPDATE public.orders
        SET status = 'completed', payment_status = 'released', payout_status = 'pending', completed_at = v_now, updated_at = v_now
        WHERE id = v_order.id;

        INSERT INTO public.order_events (order_id, actor_id, event_type, metadata, created_at)
        VALUES (v_order.id, NULL, 'ORDER_AUTO_APPROVED', jsonb_build_object('auto_approved_at', v_now), v_now);

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'processed_orders_count', v_count);
END;
$$;
