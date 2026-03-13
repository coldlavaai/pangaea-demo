-- Migration 00010: operative_cards table for CPCS, PAL/IPAF, CISRS, NRSWA, other schemes
-- Keeps CSCS in the operatives table (already built); this table handles additional cards

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.operative_cards (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  operative_id    UUID         NOT NULL REFERENCES public.operatives(id) ON DELETE CASCADE,
  organization_id UUID         NOT NULL REFERENCES public.organizations(id),
  card_scheme     TEXT         NOT NULL,
  card_number     TEXT,
  card_type       TEXT,        -- e.g. 'red'/'blue' for CPCS; 'advanced' for CISRS
  categories      TEXT,        -- Main categories on card (free text from induction form)
  expiry_date     DATE,
  scheme_name     TEXT,        -- Only used when card_scheme = 'other'
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT operative_cards_scheme_check CHECK (
    card_scheme IN ('cpcs', 'pal_ipaf', 'cisrs', 'nrswa', 'other')
  ),
  -- One record per scheme per operative (upsert-friendly)
  CONSTRAINT operative_cards_unique_scheme UNIQUE (operative_id, card_scheme)
);

ALTER TABLE public.operative_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON public.operative_cards
  FOR ALL USING (organization_id = get_user_org_id());
