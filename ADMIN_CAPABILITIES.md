# MarketMyIdea — Admin Panel Capabilities & State Transition Matrix

> **Target Audience:** Engineers building the separate MarketMyIdea Admin Application.  
> **Source:** Synthesized from active database schemas, check constraints, RPC functions, and transaction flows.

---

## 1. Capabilities Classification Matrix

Each administrative capability is categorized into one of three support levels:
- **Level 1: Fully Supported** — Existing tables, columns, indexes, RLS policies, or RPCs exist and are verified.
- **Level 2: Requires Dedicated Admin API / Migration** — Database columns exist but require a dedicated server-side endpoint or helper RPC in the new admin backend.
- **Level 3: Requires Architectural Investigation / Extension** — Feature requires schema expansion or external API integration.

| Capability | Support Level | Implementation Notes & Tables Involved |
| :--- | :---: | :--- |
| **Search & Inspect Users** | **Level 1** | Supported via `public.profiles` query joined with `creator_profiles` and `business_profiles`. Search on `email`, `display_name`, `city`. |
| **View Creator & Business Profiles** | **Level 1** | Supported via `public.creator_profiles` and `public.business_profiles`. Full portfolio, niche, packages, and reels available. |
| **Review Submitted Instagram & Reel URLs** | **Level 1** | Supported via `creator_profiles.instagram_profile_url`, `submitted_reels` (JSONB array), and `primary_reel_url`. |
| **Approve / Reject / Revoke Creator Verification** | **Level 1** | Supported via `public.admin_verify_creator` RPC and `/api/admin/creators/verify`. Updates `verification_status` and logs to `admin_actions`. |
| **Update Manually Reviewed Metrics** | **Level 1** | Supported via `reviewed_follower_count`, `reviewed_engagement_rate`, `reviewed_avg_reel_views`, `reviewed_at`, `reviewed_by`. |
| **Inspect Conversations & Moderation Views** | **Level 1** | Supported via `public.conversations` and `public.messages`. Admin RLS policy allows admins to view all messages for moderation. |
| **Review Collaboration Requests & Deal Proposals**| **Level 1** | Supported via `public.collaboration_requests` and `public.deal_proposals`. |
| **Inspect Orders & Delivery Timelines** | **Level 1** | Supported via `public.orders`, `public.order_briefs`, `public.deliveries`, and `public.order_events`. |
| **Inspect Payment Records & Escrow Status** | **Level 1** | Supported via `public.payments` (Razorpay `provider_order_id`, `provider_payment_id`, `status`). |
| **Inspect Creator Payout Queues** | **Level 1** | Supported via `public.payouts` and `orders.payout_upi_id` / `orders.payout_status`. |
| **Review Audit Trails & Admin History** | **Level 1** | Supported via `public.admin_actions` and `public.order_events`. |
| **Manage Dispute Resolutions** | **Level 1** | Supported via `public.disputes`. Admins can transition disputes to `resolved_creator` or `resolved_business`. |
| **Disable or Ban User Accounts** | **Level 2** | `profiles.role` can be updated or a dedicated `is_banned` / `status` column can be checked in auth middleware. Direct `auth.users` ban requires Supabase Admin Auth API (`supabase.auth.admin.updateUserById(uid, { ban_duration: '...' })`). |
| **Dynamic Platform Settings & Feature Toggles** | **Level 2** | Feature flag `INSTAGRAM_OAUTH_ENABLED` is currently in code (`src/lib/config/features.ts`). A database table `public.platform_settings` is recommended if real-time dynamic admin toggling is required. |
| **Automated Bank Payout Execution** | **Level 3** | Currently payouts are tracked manually (`upi_bank_transfer` with `payout_upi_id`). Automated payouts require RazorpayX / Cashfree Payouts API integration. |

---

## 2. Valid Entity State Transitions

### A. Creator Verification Lifecycle

```
                 ┌───────────────┐
                 │  unverified   │
                 └───────┬───────┘
                         │ Creator submits Instagram profile & Reels
                         ▼
                 ┌───────────────┐
       ┌─────────┤pending_review ├─────────┐
       │         └───────┬───────┘         │
Admin  │                 │ Admin           │ Admin
Rejects│                 │ Approves        │ Requests Changes
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│   rejected   │  │   verified   │  │resubmission_required │
└──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘
       │                 │ Admin Revokes       │ Creator re-submits
       │                 ▼                     │
       └──────────►┌──────────────┐◄───────────┘
                   │  unverified  │
                   └──────────────┘
```

**Valid Transitions:**
1. `unverified` ➔ `pending_review` (Triggered by creator submission via `submit_creator_manual_verification`)
2. `pending_review` ➔ `verified` | `verified_manual` (Triggered by admin via `admin_verify_creator`)
3. `pending_review` ➔ `resubmission_required` (Admin requests updated URLs/proof)
4. `pending_review` ➔ `rejected` (Admin rejects non-eligible profiles)
5. `verified` ➔ `unverified` | `rejected` (Admin revokes verification if fraudulent)
6. `resubmission_required` ➔ `pending_review` (Creator updates URLs)

---

### B. Order & Escrow Lifecycle

```
[Proposal Accepted]
        │
        ▼
  pending_payment (payment_status: 'unpaid')
        │
        │ Razorpay capture / Escrow funded
        ▼
   in_progress (payment_status: 'held_in_escrow')
        │
        │ Creator uploads delivery
        ▼
    submitted (auto_approve_at: now() + 48 hours)
        │
   ┌────┴──────────────────────────────┐
   │ Business accepts / Auto-approves   │ Business requests revision
   ▼                                   ▼
completed                           revision_requested (revisions_used++)
(payment: 'released',                   │
 payout: 'pending')                     │ Creator re-delivers
   │                                    ▼
   │ Admin / System Payout Transfer  submitted
   ▼
(payout: 'completed')
```

**Dispute Branch:**
- From `in_progress`, `submitted`, or `revision_requested` ➔ `disputed` (via `public.disputes`).
- Admin Dispute Resolution:
  - `resolved_creator`: Order transitions to `completed`, payment released to creator.
  - `resolved_business`: Order transitions to `refunded`, payment refunded to business.

---

## 3. ⚠️ Dangerous Operations: Forbidden Direct Edits

The following operations **MUST NOT** be performed as arbitrary SQL table edits or unvalidated admin forms:

1. **Direct Modification of Escrow Amounts (`orders.escrow_amount`, `orders.amount`):**
   - Altering escrow amounts without corresponding Razorpay payment verification will desynchronize the platform financial ledger.
2. **Arbitrary Status Changes on Active Orders:**
   - Forcing an order directly from `in_progress` to `completed` without verifying delivery or triggering `order_events` will break notifications and payout calculations.
3. **Direct Database Deletion of Users (`auth.users` / `public.profiles`):**
   - Cascading foreign keys will delete orders, financial transactions, messages, and audit logs. Account deactivation should be handled via status flags or Supabase Admin Auth disablement.
4. **Direct Modification of Creator OAuth Tokens (`instagram_access_token`):**
   - Stored tokens are encrypted/managed by the OAuth exchange. Overwriting these strings will break API sync and webhook processing.
