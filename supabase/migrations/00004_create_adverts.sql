-- ============================================================
-- MIGRATION 00004: Adverts System (GAP-002, GAP-003 — v1 scope)
-- ============================================================

-- ============================================================
-- ADVERT TEMPLATES
-- ============================================================
CREATE TYPE advert_platform AS ENUM ('facebook', 'linkedin', 'indeed', 'other');

CREATE TABLE advert_templates (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  name             TEXT NOT NULL,
  platform         advert_platform NOT NULL,
  trade_category_id UUID REFERENCES trade_categories(id),
  headline         TEXT NOT NULL,
  body_copy        TEXT NOT NULL,
  call_to_action   TEXT DEFAULT 'Apply Now',
  target_locations TEXT[],   -- Postcodes or regions to target
  salary_range_min DECIMAL(8,2),
  salary_range_max DECIMAL(8,2),
  is_active        BOOLEAN DEFAULT TRUE,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_advert_templates_org ON advert_templates(organization_id);

-- ============================================================
-- ADVERTS (published instances of templates)
-- ============================================================
CREATE TYPE advert_status AS ENUM ('draft', 'active', 'paused', 'ended');

CREATE TABLE adverts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  template_id      UUID REFERENCES advert_templates(id),
  labour_request_id UUID REFERENCES labour_requests(id),  -- Links to specific vacancy
  platform         advert_platform NOT NULL,
  external_id      TEXT,           -- Platform's ad ID for tracking
  external_url     TEXT,           -- Link to live ad
  status           advert_status DEFAULT 'draft',
  budget           DECIMAL(8,2),
  spend_to_date    DECIMAL(8,2) DEFAULT 0,
  impressions      INTEGER DEFAULT 0,
  clicks           INTEGER DEFAULT 0,
  applications     INTEGER DEFAULT 0,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_adverts_org ON adverts(organization_id);
CREATE INDEX idx_adverts_request ON adverts(labour_request_id);
CREATE INDEX idx_adverts_status ON adverts(organization_id, status);
