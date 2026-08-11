export interface SupabaseServerConfig {
  url: string;
  anonKey: string;
}

const SUPABASE_URL_ENV = "SUPABASE_URL";
const SUPABASE_ANON_KEY_ENV = "SUPABASE_ANON_KEY";

export const getSupabaseServerConfig = (): SupabaseServerConfig | null => {
  const url = process.env[SUPABASE_URL_ENV]?.trim();
  const anonKey = process.env[SUPABASE_ANON_KEY_ENV]?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
};

export const isSupabaseConfigured = () => getSupabaseServerConfig() !== null;

export const expectedSupabaseEnvironmentVariables = [
  SUPABASE_URL_ENV,
  SUPABASE_ANON_KEY_ENV,
] as const;
