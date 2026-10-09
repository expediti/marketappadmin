# MarketMyIdea — Admin Application Architecture & Database Handoff Manifest

> **Package Status:** Ready for import into the new Antigravity Admin project.  
> **Target Environment:** Separate GitHub repository & independent Cloudflare Worker connected to the existing Supabase project.

---

## 1. Generated Handoff Manifest

| File | Purpose |
| :--- | :--- |
| [`adminsql.sql`](file:///home/amitsharma/Marketurapp/adminsql.sql) | Complete schema-only SQL reference containing all 20 tables, enums, triggers, RLS policies, storage bucket configurations, and RPC stored procedures. |
| [`ADMIN_DATABASE_REFERENCE.md`](file:///home/amitsharma/Marketurapp/ADMIN_DATABASE_REFERENCE.md) | Comprehensive documentation of all database tables, columns, relations, sensitive fields, admin role definitions, and migration provenance (001–033). |
| [`ADMIN_CAPABILITIES.md`](file:///home/amitsharma/Marketurapp/ADMIN_CAPABILITIES.md) | Administrative capabilities matrix, support levels (Level 1–3), state transition lifecycles, and dangerous operations warnings. |
| [`ADMIN_SECURITY_GUIDE.md`](file:///home/amitsharma/Marketurapp/ADMIN_SECURITY_GUIDE.md) | Security implementation guide detailing server-side token verification, service-role key isolation in Cloudflare, RLS preservation, and audit logging. |
| [`.env.example`](file:///home/amitsharma/Marketurapp/.env.example) | Standardized environment variable template with public vs server-side secret boundaries. |
| [`ADMIN_PROJECT_SETUP.md`](file:///home/amitsharma/Marketurapp/ADMIN_PROJECT_SETUP.md) | Step-by-step setup guide for creating the new repository, Cloudflare Worker, custom domain (`admin.marketmyidea.online`), and Antigravity prompting. |
| [`ADMIN_HANDOFF_README.md`](file:///home/amitsharma/Marketurapp/ADMIN_HANDOFF_README.md) | This handoff manifest, verified facts, audit log, and manual prerequisite checklist. |

---

## 2. Verified Facts About Current Architecture

1. **Authentication & Roles:**
   - User identities reside in `auth.users` with a 1:1 linked profile in `public.profiles`.
   - Global roles are `'creator' | 'business' | 'admin'`.
   - Database role check is standardized via `public.is_admin()` (`SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'`).
2. **Creator Verification & Manual Submissions:**
   - Creator submissions are stored in `creator_profiles.instagram_profile_url`, `submitted_reels` (JSONB), `primary_reel_url`, and `claimed_followers`.
   - Admin-reviewed metrics are stored in `reviewed_follower_count`, `reviewed_engagement_rate`, `reviewed_avg_reel_views`, `reviewed_at`, `reviewed_by`, and `review_notes`.
   - Verification status is enforced via `public.admin_verify_creator` RPC and `/api/admin/creators/verify`.
3. **Instagram OAuth Preservation:**
   - All OAuth columns (`instagram_access_token`, `instagram_user_id`, `instagram_profile_data`, `instagram_sync_status`), callback routes, and webhook handlers remain intact in the codebase.
   - Public UI connects are gated by `INSTAGRAM_OAUTH_ENABLED = false` in `src/lib/config/features.ts`.
4. **Order & Escrow System:**
   - Orders are structured with an explicit 10% platform fee calculation (`platform_fee = amount * 0.10`) and 90% creator payout (`creator_payout_amount`).
   - Order statuses follow `'pending_payment' -> 'in_progress' -> 'submitted' -> 'completed'`.
   - Auto-approval runs via `process_auto_approvals()` RPC (auto-approving orders 48 hours after delivery submission).
5. **Audit Logging:**
   - All administrative actions are recorded in `public.admin_actions` (`admin_id`, `action`, `target_type`, `target_id`, `metadata`, `created_at`).
   - All order lifecycle events are recorded in `public.order_events`.

---

## 3. Unverified Items & Schema Nuances

- **Live Database Parity:** This schema export is repository-derived from migrations `001_extensions.sql` through `033_manual_instagram_verification.sql`. If tables or columns were added manually directly in the Supabase Dashboard without a migration file, they will not be captured here.
- **Direct Auth Deletion:** Direct deletion of `auth.users` cascades across all tables. The separate admin panel should disable/ban users rather than hard-deleting records to prevent foreign key cascading loss on financial history.

---

## 4. Commands Executed & Verification Log

```bash
# 1. Directory Inspection
list_dir supabase/migrations -> 34 migration files inspected

# 2. Schema Export Generation
write_to_file adminsql.sql -> Schema-only export compiled

# 3. Reference Documentation Generation
write_to_file ADMIN_DATABASE_REFERENCE.md
write_to_file ADMIN_CAPABILITIES.md
write_to_file ADMIN_SECURITY_GUIDE.md
write_to_file .env.example
write_to_file ADMIN_PROJECT_SETUP.md
write_to_file ADMIN_HANDOFF_README.md

# 4. App Build & Verification Test
npm run build -> OpenNext Cloudflare bundle compiled with 0 errors (Exit Code: 0)
```

---

## 5. Manual Next Steps Before Starting the Admin Project

1. **Verify Admin Role in Database:** Ensure your personal Supabase account has `role = 'admin'` in `public.profiles`:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
2. **Apply Migration 033 (if not yet run):**
   Ensure `033_manual_instagram_verification.sql` is executed in the Supabase SQL Editor.
3. **Copy Files to New Project:**
   Create your new admin project folder and copy the 7 handoff files listed above into it.
