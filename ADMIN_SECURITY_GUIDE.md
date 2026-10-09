# MarketMyIdea — Admin Security & Cloudflare Architecture Guide

> **Target Audience:** Security architects and developers building the separate Admin Panel application.  
> **Key Architecture Rule:** The Admin application runs on an independent Cloudflare Worker and separate hostname, connecting securely to the shared Supabase project.

---

## 1. Dual-Tier Authentication & Authorization Model

```
                    BROWSER / ADMIN CLIENT
                              │
                              │ 1. Admin logs in with Email/Password or Admin SSO
                              ▼
                   SUPABASE AUTH ENGINE
                              │ Returns JWT (Access Token)
                              ▼
            ADMIN APPLICATION (Cloudflare Worker Backend)
                              │
                              ├── 2. Verify JWT: supabase.auth.getUser(token)
                              │
                              ├── 3. Verify Role: Query public.profiles WHERE id = uid AND role = 'admin'
                              │      (or execute public.is_admin() RPC)
                              │
                              ├── 4. If Authorized: Execute admin action with Service Role Client
                              │
                              └── 5. Audit Logging: Insert record into public.admin_actions
```

### Critical Security Invariants
1. **Zero Client Trust:** Never trust any client-side claim (cookies, localStorage flags, hidden UI toggles) asserting `is_admin = true`.
2. **Server-Side Token Verification:** Every privileged admin route handler in the new application must validate the caller's JWT on the server using `supabase.auth.getUser(token)`.
3. **Double Verification:** After validating the JWT, verify that the corresponding record in `public.profiles` has `role = 'admin'`. Reject the request with `403 Forbidden` if the role is missing or mismatched.
4. **Mandatory Audit Logging:** Every state-altering administrative action (approvals, rejections, bans, refunds, notes) must write an immutable entry to `public.admin_actions`.

---

## 2. Key Management & Environment Configuration

| Key Name | Location | Accessibility | Purpose |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | Public | Base endpoint for the Supabase project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | Public (Restricted by RLS) | Used by client-side Supabase client for login and public queries. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Cloudflare Worker Secret ONLY** | **Strictly Server-Side** | Privileged key for admin-level operations, bypassing RLS where required. |
| `ADMIN_SESSION_SECRET` | **Cloudflare Worker Secret ONLY** | **Strictly Server-Side** | Optional JWT encryption secret for admin sessions. |

### ⚠️ Absolute Rules for `SUPABASE_SERVICE_ROLE_KEY`:
- **NEVER** prefix with `NEXT_PUBLIC_`.
- **NEVER** commit the service role key to git or include it in any `.env` file checked into source control.
- **NEVER** import or use the service role key in React components or client-rendered pages (`'use client'`).
- **ALWAYS** configure it using `wrangler secret put SUPABASE_SERVICE_ROLE_KEY` in the admin project.

---

## 3. RLS Preservation & Safe Data Access

- **Do NOT disable Row Level Security (RLS) on any table.**
- The existing database tables all have RLS enabled with policies granting access either to resource owners (`auth.uid() = user_id`) or platform administrators (`public.is_admin()`).
- The admin backend should use:
  1. **User Context Client** (using the admin's JWT) where RLS policies permit admin access via `public.is_admin()`.
  2. **Service Role Client** (scoped inside secure server-side API handlers) only for actions that require elevated cross-table orchestration or audit logging.

---

## 4. Cloudflare Worker Deployment & Dedicated Hostname

The separate admin application must be configured as its own independent Cloudflare Worker:

### A. Independent `wrangler.jsonc` (in Admin Repository)
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "marketmyidea-admin",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "vars": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
    "NEXT_PUBLIC_APP_NAME": "MarketMyIdea Admin Panel"
  }
}
```

### B. Configuring Dedicated Hostname
In Cloudflare Dashboard:
1. Navigate to **DNS** > **Records** for `marketmyidea.online`.
2. Add a CNAME or route pointing `admin.marketmyidea.online` to the `marketmyidea-admin` worker.
3. In `wrangler.jsonc` or Cloudflare Worker Triggers, assign the custom domain `admin.marketmyidea.online`.

### C. Setting Cloudflare Secrets Securely
Run the following from your local terminal in the new admin repository:
```bash
# Set Supabase Service Role Key securely in Cloudflare
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Set Razorpay Webhook Secret if admin processes refunds
npx wrangler secret put RAZORPAY_KEY_SECRET
```
