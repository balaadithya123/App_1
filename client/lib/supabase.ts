import { createClient } from "@supabase/supabase-js";

// App_1 production Supabase. Environment variables remain supported for local and
// other deployments, but the production fallback prevents Vercel from silently
// connecting to a different/empty Supabase project.
const APP1_SUPABASE_URL = "https://mjwuksdnbewdayhssacc.supabase.co";
const APP1_SUPABASE_PUBLISHABLE_KEY = "sb_publishable__ULoko5SRRH7WMIsO9ydkw_ZV18Nu3w";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || APP1_SUPABASE_URL;
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  APP1_SUPABASE_PUBLISHABLE_KEY
) as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
