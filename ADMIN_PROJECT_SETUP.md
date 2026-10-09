# MarketMyIdea — Setup Guide for the New Admin Antigravity Project

> **Purpose:** Instructions for initializing the new, dedicated MarketMyIdea Admin Panel repository and Cloudflare Worker, connecting it safely to the existing Supabase project.

---

## Step 1: Files to Copy to the New Admin Project

When creating your new project folder (e.g., `marketmyidea-admin/`), copy the following handoff reference files from this repository:

1. `adminsql.sql` ➔ Put in `docs/adminsql.sql` or `reference/adminsql.sql`
2. `ADMIN_DATABASE_REFERENCE.md` ➔ Put in `docs/`
3. `ADMIN_CAPABILITIES.md` ➔ Put in `docs/`
4. `ADMIN_SECURITY_GUIDE.md` ➔ Put in `docs/`
5. `.env.example` ➔ Put in root `.env.example`
6. `ADMIN_PROJECT_SETUP.md` ➔ Put in `docs/`
7. `ADMIN_HANDOFF_README.md` ➔ Put in `docs/`

---

## Step 2: How the New Antigravity Session Should Use These References

When prompting the Antigravity agent in the new project:
- **Primary Instruction**:  
  > *"You are building the MarketMyIdea Admin Application. Read `docs/ADMIN_DATABASE_REFERENCE.md`, `docs/ADMIN_CAPABILITIES.md`, and `docs/ADMIN_SECURITY_GUIDE.md` first. Connect to the existing Supabase project using `@supabase/supabase-js`. Do NOT run database migrations or alter existing tables unless explicitly requested."*
- The agent will use `adminsql.sql` and `ADMIN_DATABASE_REFERENCE.md` to understand all existing 20 tables, primary/foreign keys, and RPC functions without having to guess the schema.

---

## Step 3: Initialize the New Project & Private GitHub Repository

```bash
# 1. Create and enter new directory
mkdir marketmyidea-admin
cd marketmyidea-admin

# 2. Initialize Next.js / OpenNext Cloudflare project
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 3. Initialize git repository
git init
git add .
git commit -m "Initial commit: MarketMyIdea Admin Panel scaffolding"

# 4. Create and push to private GitHub repository
git remote add origin git@github.com:your-org/marketmyidea-admin.git
git branch -M main
git push -u origin main
```

---

## Step 4: Configure Cloudflare Worker & OpenNext

1. Install Cloudflare & OpenNext packages:
   ```bash
   npm install --save-dev @opennextjs/cloudflare wrangler
   npm install @supabase/supabase-js lucide-react
   ```
2. Create `wrangler.jsonc`:
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
3. Set production server secrets:
   ```bash
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```

---

## Step 5: Configure Dedicated Hostname

In the Cloudflare Dashboard:
1. Go to **DNS** > **Records** for `marketmyidea.online`.
2. Add a CNAME record: `admin` ➔ `marketmyidea-admin.<your-account>.workers.dev` (Proxied).
3. In **Workers & Pages** > **marketmyidea-admin** > **Settings** > **Domains & Routes**, bind the Custom Domain: `admin.marketmyidea.online`.

---

## Step 6: Validate Access Control Before Exposing

Before public release, verify the following:
1. **Unauthenticated Access:** Navigating to `https://admin.marketmyidea.online/dashboard` automatically redirects to `/login`.
2. **Non-Admin User Login:** Logging in with a standard Creator or Business account receives a `403 Access Denied: Administrator profile required` screen.
3. **Admin User Login:** Only accounts where `public.profiles.role = 'admin'` can access admin routes and invoke admin API endpoints.
4. **Audit Trail Verification:** Inspect `public.admin_actions` to ensure actions taken in the admin panel are logged with the acting administrator's user ID and timestamp.

---

## Step 7: Safeguards Against Modifying the Main Production App

1. **Independent Repositories:** Keep `marketmyidea-admin` in its own git repository completely separate from `Marketurapp`.
2. **Independent Cloudflare Workers:** `marketmyidea-admin` and `marketapp` are distinct workers with their own deployment pipelines. Deploying the admin app will never overwrite the public website.
3. **No Destructive DB Migrations:** All tables in Supabase are shared. The admin app should read and update existing records according to the verified state machines without dropping or mutating existing schemas.
