# MarketMyIdea — Comprehensive Admin Database Architecture Reference

> **Target Audience:** Engineers and AI coding agents building the separate MarketMyIdea Admin Panel application.  
> **Source:** Reconstructed directly from Supabase migrations `001_extensions.sql` through `033_manual_instagram_verification.sql` and TypeScript database definitions (`src/types/database.ts`).

---

## 1. Core Identity & User Architecture

MarketMyIdea uses a centralized multi-role profile model rooted in Supabase's `auth.users`.

```
                    ┌────────────────────────┐
                    │      auth.users        │
                    │   (Supabase Auth)      │
                    └───────────┬────────────┘
                                │ 1:1 (id = id)
                                ▼
                    ┌────────────────────────┐
                    │    public.profiles     │
                    │  role: creator/business│
                    └──────┬──────────┬──────┘
             1:1 (user_id) │          │ 1:1 (user_id)
      ┌────────────────────┘          └────────────────────┐
      ▼                                                    ▼
┌────────────────────────┐                       ┌────────────────────────┐
│public.creator_profiles │                       │public.business_profiles│
│(Portfolio, Instagram,  │                       │(Company, App, Brand,   │
│ Verification, Packages)│                       │ Target Audience)       │
└────────────────────────┘                       └────────────────────────┘
```

### Table 1: `public.profiles`
- **Purpose**: Base identity profile for all authenticated accounts (Creators, Businesses, and Admins).
- **Migration**: [`002_profiles.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/002_profiles.sql), [`020_database_schema_repair.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/020_database_schema_repair.sql).
- **Primary Key**: `id UUID REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Key Columns**:
  - `role`: `'creator' | 'business' | 'admin' | null`. Defines the global platform role.
  - `display_name`: Full public name or handle.
  - `email`: User's primary email address.
  - `avatar_url`: User avatar image URL.
  - `city`: Operating city.
  - `created_at`, `updated_at`: UTC timestamps.

### Table 2: `public.creator_profiles`
- **Purpose**: Creator marketplace profile, media portfolio, audience metrics, and verification states.
- **Migration**: [`003_creator_profiles.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/003_creator_profiles.sql), [`020_database_schema_repair.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/020_database_schema_repair.sql), [`028_creator_payout_upi_id.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/028_creator_payout_upi_id.sql), [`029_instagram_creator_integration.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/029_instagram_creator_integration.sql), [`033_manual_instagram_verification.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/033_manual_instagram_verification.sql).
- **Primary Key**: `id UUID` (with unique constraint `user_id UUID REFERENCES public.profiles(id)`).
- **Key Verification & Review Columns**:
  - `verification_status`: `'unverified' | 'pending' | 'pending_review' | 'verified' | 'verified_manual' | 'verified_oauth' | 'rejected' | 'resubmission_required' | 'deleted'`.
  - `instagram_verified`: `BOOLEAN` (True only when approved by admin or verified via OAuth).
  - `instagram_profile_url`: Creator-submitted URL (`https://www.instagram.com/username/`).
  - `submitted_reels`: `JSONB` array of 1–3 submitted Reel URLs.
  - `primary_reel_url`: URL of the creator's designated primary featured Reel.
  - `claimed_followers`: Self-reported follower count pending review.
  - `claimed_engagement_rate`: Self-reported engagement rate.
  - `reviewed_follower_count`: Admin-verified follower count.
  - `reviewed_engagement_rate`: Admin-verified engagement rate (%).
  - `reviewed_avg_reel_views`: Admin-verified average Reel views.
  - `reviewed_at`: `TIMESTAMPTZ` of admin verification.
  - `reviewed_by`: `UUID REFERENCES public.profiles(id)` identifying the reviewer.
  - `review_notes`: Internal admin notes for approval/rejection.
  - `payout_upi_id`: Creator's UPI ID for direct payout settlements.
- **Preserved OAuth Columns** (Sensitive):
  - `instagram_access_token`, `instagram_user_id`, `instagram_profile_data`, `instagram_connected_at`, `instagram_last_synced_at`, `instagram_sync_status`.

### Table 3: `public.business_profiles`
- **Purpose**: Business and brand advertiser accounts.
- **Migration**: [`004_business_profiles.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/004_business_profiles.sql), [`020_database_schema_repair.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/020_database_schema_repair.sql).
- **Primary Key**: `id UUID` (with unique `user_id UUID REFERENCES public.profiles(id)`).
- **Key Columns**:
  - `business_name`, `logo_path`, `website`, `app_url`, `description`.
  - `business_type`: `'App / SaaS' | 'E-Commerce / D2C' | 'Agency / Brand' | 'Local Business / Retail' | 'Other'`.
  - `industry`, `city`, `state`, `country`, `target_audience`.

---

## 2. Marketplace Packages, Reels & Campaigns

### Table 4: `public.creator_packages`
- **Purpose**: Fixed-price service packages offered by creators (e.g. 1 Instagram Reel + 1 Story).
- **Migration**: [`005_creator_packages.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/005_creator_packages.sql).
- **Key Columns**: `creator_id (FK)`, `name`, `platform`, `deliverables TEXT[]`, `turnaround_days`, `revisions_allowed`, `price`, `is_active`.

### Table 5: `public.creator_reels`
- **Purpose**: Portfolio video reels displayed on creator profiles.
- **Migration**: [`015_creator_reels.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/015_creator_reels.sql), [`032_instagram_reels_metrics_and_sync.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/032_instagram_reels_metrics_and_sync.sql).
- **Key Columns**: `creator_id (FK)`, `title`, `video_url`, `reel_url`, `thumbnail_url`, `view_count`, `like_count`, `comment_count`, `engagement_rate`, `is_featured`, `is_visible`, `instagram_media_id`, `metrics_source`.

### Table 6: `public.campaigns`
- **Purpose**: Public or private promotional briefs posted by businesses.
- **Migration**: [`019_campaigns.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/019_campaigns.sql), [`020_database_schema_repair.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/020_database_schema_repair.sql).
- **Key Columns**: `business_id (FK)`, `title`, `description`, `product_name`, `product_url`, `target_niche TEXT[]`, `target_locations TEXT[]`, `budget`, `deadline`, `status` (`'draft' | 'active' | 'in_progress' | 'completed' | 'cancelled'`).

---

## 3. Conversations, Messaging & Collaboration Requests

```
┌────────────────────────┐
│  public.conversations  │ (Unique creator_id + business_id)
└───────────┬────────────┘
            │ 1:N
            ▼
┌────────────────────────┐
│    public.messages     │ (Sender, Receiver, Content, Type: text/proposal/deal_confirmed)
└────────────────────────┘
```

### Table 7: `public.conversations`
- **Migration**: [`012_messages.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/012_messages.sql), [`021_collaboration_flow_and_messaging.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/021_collaboration_flow_and_messaging.sql).
- **Key Columns**: `id`, `creator_id (FK)`, `business_id (FK)`, `campaign_id (FK)`, `last_message_at`.
- **Constraint**: `UNIQUE(creator_id, business_id)`.

### Table 8: `public.messages`
- **Migration**: [`012_messages.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/012_messages.sql), [`022_messaging_audit_and_notification_system.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/022_messaging_audit_and_notification_system.sql).
- **Key Columns**: `conversation_id (FK)`, `sender_id (FK)`, `receiver_id (FK)`, `content`, `message_type` (`'text' | 'image' | 'video' | 'link' | 'proposal' | 'deal_confirmed' | 'status_update' | 'system'`), `metadata JSONB`, `is_read`, `read_at`.

### Table 9: `public.collaboration_requests`
- **Migration**: [`021_collaboration_flow_and_messaging.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/021_collaboration_flow_and_messaging.sql), [`025_fix_collaboration_requests_status_check.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/025_fix_collaboration_requests_status_check.sql).
- **Key Columns**: `business_user_id (FK)`, `creator_user_id (FK)`, `brand_name`, `offered_price`, `status` (`'pending' | 'accepted' | 'rejected' | 'negotiating' | 'cancelled' | 'order_created' | 'expired'`).

---

## 4. Deal Proposals, Orders, Escrow & Delivery Workflow

```
[Deal Proposal / Collab Request]
               │
               ▼ (accept_deal_proposal RPC)
     ┌───────────────────┐
     │   public.orders   │ ──► status: 'pending_payment'
     └─────────┬─────────┘
               │ (Razorpay Payment Capturing)
               ▼
     [status: 'in_progress', payment_status: 'held_in_escrow']
               │
               ▼ (submit_order_delivery RPC)
     ┌───────────────────┐
     │ public.deliveries │ ──► status: 'submitted' (auto_approve_at = now + 48h)
     └─────────┬─────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
[Business Accepts]  [Revision Requested]
      │                 │
      ▼                 ▼
[status: 'completed',  [status: 'revision_requested']
 payment: 'released',
 payout: 'pending']
```

### Table 10: `public.orders`
- **Purpose**: Core order entity managing contract amount, 10% platform fee, escrow funding, milestone timestamps, delivery deadlines, and payout states.
- **Migration**: [`006_orders.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/006_orders.sql), [`024_deal_proposals_and_workflow.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/024_deal_proposals_and_workflow.sql), [`027_production_workflow_schema_repair.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/027_production_workflow_schema_repair.sql).
- **Key Columns**:
  - `business_id (FK)`, `creator_id (FK)`, `proposal_id (FK)`, `package_id (FK)`.
  - `amount`, `total_amount`, `escrow_amount`, `platform_fee` (10%), `creator_payout_amount` (90%).
  - `status`: `'created' | 'pending' | 'pending_payment' | 'escrow_funded' | 'in_progress' | 'submitted' | 'revision_requested' | 'disputed' | 'completed' | 'cancelled' | 'refunded'`.
  - `payment_status`: `'unpaid' | 'pending' | 'held_in_escrow' | 'released' | 'refunded' | 'failed'`.
  - `payout_status`: `'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'`.
  - `turnaround_days`, `revisions_allowed`, `revisions_used`.
  - `deadline`, `work_started_at`, `submitted_at`, `completed_at`, `auto_approve_at`.
  - `payout_upi_id`, `payout_transfer_id`, `payout_completed_at`.

### Table 11: `public.deal_proposals`
- **Migration**: [`024_deal_proposals_and_workflow.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/024_deal_proposals_and_workflow.sql).
- **Key Columns**: `conversation_id (FK)`, `business_id (FK)`, `creator_id (FK)`, `created_by (FK)`, `order_id (FK)`, `title`, `deliverables TEXT[]`, `price`, `turnaround_days`, `status` (`'pending' | 'accepted' | 'rejected' | 'expired' | 'superseded' | 'cancelled'`).

### Table 12: `public.order_briefs`
- **Migration**: [`024_deal_proposals_and_workflow.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/024_deal_proposals_and_workflow.sql).
- **Key Columns**: `order_id (FK unique)`, `product_name`, `product_url`, `app_download_link`, `brand_guidelines`, `key_talking_points`, `do_points`, `dont_points`, `reference_links TEXT[]`, `attachments JSONB`, `status`.

### Table 13: `public.deliveries`
- **Migration**: [`010_deliveries.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/010_deliveries.sql), [`024_deal_proposals_and_workflow.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/024_deal_proposals_and_workflow.sql).
- **Key Columns**: `order_id (FK)`, `creator_id (FK)`, `version`, `video_url`, `reel_url`, `caption`, `notes`, `attachments JSONB`, `status` (`'submitted' | 'approved' | 'revision_requested' | 'rejected'`), `feedback`, `revision_notes`.

---

## 5. Payments, Payouts, Disputes & Audit Governance

### Table 14: `public.payments`
- **Purpose**: Razorpay integration transactions, order escrow allocations, and verification signatures.
- **Migration**: [`008_payments.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/008_payments.sql), [`026_razorpay_payment_integration.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/026_razorpay_payment_integration.sql).
- **Key Columns**: `order_id (FK)`, `payer_id (FK)`, `amount`, `currency`, `provider` (`'razorpay' | 'cashfree' | 'stripe' | 'simulation' | 'upi_manual'`), `provider_order_id`, `provider_payment_id`, `provider_signature`, `status` (`'pending' | 'processing' | 'authorized' | 'captured' | 'held_in_escrow' | 'released_to_creator' | 'refunded' | 'failed' | 'cancelled'`), `idempotency_key`, `metadata JSONB`.

### Table 15: `public.payouts`
- **Purpose**: Creator bank / UPI transfers upon order completion.
- **Migration**: [`009_payouts.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/009_payouts.sql).
- **Key Columns**: `order_id (FK)`, `creator_id (FK)`, `amount`, `provider`, `provider_transfer_id`, `status` (`'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'`).

### Table 16: `public.disputes`
- **Purpose**: Formal dispute resolutions for disputed orders.
- **Migration**: [`011_disputes.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/011_disputes.sql).
- **Key Columns**: `order_id (FK)`, `raised_by (FK)`, `reason`, `status` (`'open' | 'under_review' | 'resolved_creator' | 'resolved_business' | 'closed'`), `resolution_notes`, `resolved_at`, `resolved_by (FK)`.

### Table 17: `public.order_events`
- **Purpose**: Immutable audit timeline of lifecycle events per order.
- **Migration**: [`007_order_events.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/007_order_events.sql), [`027_production_workflow_schema_repair.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/027_production_workflow_schema_repair.sql).
- **Key Columns**: `order_id (FK)`, `actor_id (FK)`, `event_type`, `metadata JSONB`, `created_at`.

### Table 18: `public.notifications`
- **Purpose**: Real-time user notification feed.
- **Migration**: [`022_messaging_audit_and_notification_system.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/022_messaging_audit_and_notification_system.sql).
- **Key Columns**: `user_id (FK)`, `title`, `message`, `type`, `link`, `is_read`, `read_at`, `metadata JSONB`.

### Table 19: `public.admin_actions`
- **Purpose**: Immutable administrative audit trail.
- **Migration**: [`013_admin_actions.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/013_admin_actions.sql), [`033_manual_instagram_verification.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/033_manual_instagram_verification.sql).
- **Key Columns**: `id`, `admin_id (FK)`, `action`, `target_type`, `target_id`, `metadata JSONB`, `created_at`.

### Table 20: `public.instagram_webhook_events`
- **Purpose**: Raw log of incoming Meta Instagram Graph API webhooks.
- **Migration**: [`030_instagram_webhooks.sql`](file:///home/amitsharma/Marketurapp/supabase/migrations/030_instagram_webhooks.sql).
- **Key Columns**: `instagram_user_id`, `creator_user_id (FK)`, `field`, `payload JSONB`, `processed`, `error`, `received_at`.

---

## 6. Admin Role & Authorization Mechanism

### How Admin Access is Determined
In the database, administrator authorization is evaluated through the `public.is_admin()` function:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Authorization Rules for the New Admin App
1. **Never trust client-side claims**: Do not trust browser cookies or frontend variables asserting `role === 'admin'`.
2. **Server-Side Validation**:
   - The Admin backend must call `supabase.auth.getUser(token)` on every request.
   - Query `public.profiles` with the verified `user.id` to ensure `role === 'admin'`.
3. **Audit Every Action**: Any administrative modification (verification, manual order resolution, refund, dispute settlement) must write an entry to `public.admin_actions`.

---

## 7. Field Modification Safety Matrix

| Table | Field | Safe for Direct Admin Edit? | Required Mechanism / Constraints |
| :--- | :--- | :---: | :--- |
| `creator_profiles` | `verification_status` | ⚠️ Via RPC/API only | Use `admin_verify_creator` RPC or `/api/admin/creators/verify` |
| `creator_profiles` | `reviewed_follower_count` | ⚠️ Via RPC/API only | Updates `follower_count` and sets `reviewed_at` |
| `creator_profiles` | `reviewed_engagement_rate` | ⚠️ Via RPC/API only | Sets `reviewed_at` and records to `admin_actions` |
| `creator_profiles` | `reviewed_avg_reel_views` | ⚠️ Via RPC/API only | Stored as admin observation |
| `creator_profiles` | `instagram_access_token` | ❌ NEVER | OAuth secret token, read-only / system managed |
| `orders` | `status` | ❌ NEVER directly | Must trigger order events, state validation, and escrow checks |
| `orders` | `payment_status` | ❌ NEVER directly | Must be driven by Razorpay webhooks or explicit admin dispute settlement |
| `orders` | `escrow_amount` | ❌ NEVER directly | Financial ledger field; direct edits cause financial discrepancy |
| `payments` | `provider_payment_id` | ❌ Read-only | Sourced from payment gateway |
| `disputes` | `status`, `resolution_notes`| ⚠️ Via API | Must record `resolved_by` and resolution event |
