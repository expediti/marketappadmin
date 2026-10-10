import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Checks whether Supabase database environment variables are configured
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      key &&
      url !== "https://your-project.supabase.co" &&
      key !== "your-anon-key" &&
      !url.includes("your-project")
  );
}

/**
 * Service Role / Database Client: Server-Side Only
 * Provides database access for admin dashboard queries and actions.
 */
export function getServiceRoleClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !serviceRoleKey || !isSupabaseConfigured()) {
    throw new Error(
      "Supabase database is not configured. Please set SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) and NEXT_PUBLIC_SUPABASE_URL in your deployment environment."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
