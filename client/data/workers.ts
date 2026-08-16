export type { Worker } from "@shared/workers";

// No seeded/dummy worker profiles. Real worker profiles come from Supabase.
export const workers: import("@shared/workers").Worker[] = [];
