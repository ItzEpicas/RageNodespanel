import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseClientKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseClientKey) {
  console.warn("Supabase environment variables are missing");
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseClientKey);

export const SUPABASE_CONFIG_ERROR =
  "Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.";

export const supabase = createClient(
  supabaseUrl || "https://example.supabase.co",
  supabaseClientKey || "missing-publishable-key",
);
