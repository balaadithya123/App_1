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
  phone_verified?: boolean;
  photo_url?: string;
  created_at?: string;
  rating?: number;
  avg_rating?: number;
  reviews_count?: number;
  trust_flags?: string[];
  available_today?: boolean;
  away_from?: string | null;
  away_until?: string | null;
  urgent_today?: boolean;
  next_available_date?: string;
  agency_id?: string | null;
  // Monetization scaffold fields
  leadsReceived?: number;
  leadCredits?: number;
  isPromoted?: boolean;
};

// There are no seeded or dummy worker profiles. Worker listings come only from Supabase.
export const staticWorkers: Worker[] = [];
