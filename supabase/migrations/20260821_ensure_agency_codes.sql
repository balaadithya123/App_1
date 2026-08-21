CREATE OR REPLACE FUNCTION public.generate_agency_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE candidate text;
BEGIN
  LOOP
    candidate := 'AGN-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.agencies WHERE agency_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- Backfill every existing agency whose code is missing or invalid.
UPDATE public.agencies
SET agency_code = public.generate_agency_code(), regenerated_at = COALESCE(regenerated_at, now()), updated_at = now()
WHERE agency_code IS NULL OR btrim(agency_code) = '' OR agency_code !~* '^AGN-[A-Z0-9]{4}$';

ALTER TABLE public.agencies ALTER COLUMN agency_code SET DEFAULT public.generate_agency_code();
CREATE UNIQUE INDEX IF NOT EXISTS agencies_agency_code_unique ON public.agencies (agency_code) WHERE agency_code IS NOT NULL;
