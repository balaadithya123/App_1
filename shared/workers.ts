export type Worker = {
  id: string;
  name: string;
  category: string;
  locality: string;
  experience: string;
  initials: string;
  tone: string;
  about: string;
  services: string[];
  phone: string;
  photo_url?: string;
  available_today?: boolean;
  away_from?: string | null;
  away_until?: string | null;
  urgent_today?: boolean;
  next_available_date?: string;
};

// There are no seeded or dummy worker profiles. Worker listings come only from Supabase.
export const staticWorkers: Worker[] = [];
