import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env/server";

import type { Database } from "./types";

export function createAdminClient(): SupabaseClient<Database> {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = getServerEnv();

  return createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
