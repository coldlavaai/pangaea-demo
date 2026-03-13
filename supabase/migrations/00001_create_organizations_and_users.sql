-- ============================================================
-- MIGRATION 00001: Extensions, Enums, Core Tables
-- Organizations, Users, Trade Categories, Sites, Site Managers,
-- Operatives, Documents, Labour Requests, Allocations, Shifts,
-- Timesheets, Performance Reviews, NCRs, Messages
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'director',
  'labour_manager',
  'admin'
);

CREATE TYPE labour_type AS ENUM ('blue_collar', 'white_collar');

CREATE TYPE operative_status AS ENUM (
  'prospect',       -- New contact, not yet qualifying
  'qualifying',     -- Sophie intake in progress
  'pending_docs',   -- Qualified by Sophie, awaiting document upload
  'verified',       -- Fully verified, not yet on work list
  'available',      -- Verified + available for work
  'working',        -- Currently on an active allocation
  'unavailable',    -- Temporarily unavailable
  'blocked'         -- Blocked from all allocations
);

CREATE TYPE reemploy_status AS ENUM (
  'active',          -- Normal, can be employed
  'caution',         -- Has issues, requires approval
  'do_not_rehire'    -- Permanently blocked
);

CREATE TYPE document_type AS ENUM (
  'right_to_work',
  'photo_id',
  'cscs_card',
  'cpcs_ticket',
  'npors_ticket',
  'lantra_cert',
  'first_aid',
  'asbestos_awareness',
  'chainsaw_cs30',
  'chainsaw_cs31',
  'cv',            -- Q9: White collar CV upload (in-app, searchable)
  'other'
);

CREATE TYPE document_status AS ENUM (
  'pending',    -- Uploaded, not reviewed
  'verified',   -- Reviewed and approved
  'rejected',   -- Rejected (needs resubmit)
  'expired'     -- Past expiry date
);

CREATE TYPE cscs_card_type AS ENUM (
  'green',    -- Operative (Labourer)
  'blue',     -- Skilled Worker
  'gold',     -- Supervisory
  'black',    -- Management
  'red',      -- Trainee
  'white'     -- Professionally Qualified
);

CREATE TYPE request_status AS ENUM (
  'pending',     -- Just created
  'searching',   -- Actively searching pool
  'partial',     -- Some operatives found, not all
  'fulfilled',   -- All headcount filled
  'cancelled'
);

CREATE TYPE allocation_status AS ENUM (
  'pending',     -- Offer sent, awaiting response
  'confirmed',   -- Operative accepted
  'active',      -- On site, start date reached
  'completed',   -- Finished
  'no_show',     -- Didn't arrive
  'terminated'   -- Ended early
);

CREATE TYPE ncr_type AS ENUM (
  'no_show',
  'walk_off',
  'late_arrival',
  'safety_breach',
  'drugs_alcohol',
  'conduct_issue',
  'poor_attitude',
  'poor_workmanship',
  'other'
);

CREATE TYPE ncr_severity AS ENUM ('minor', 'major', 'critical');

CREATE TYPE message_channel AS ENUM ('whatsapp', 'sms', 'email');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');

CREATE TYPE traffic_light AS ENUM ('green', 'amber', 'red');

CREATE TYPE timesheet_status AS ENUM (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'locked'
);

CREATE TYPE shift_status AS ENUM (
  'scheduled',
  'published',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE conversation_outcome AS ENUM (
  'qualified',
  'rejected_no_rtw',
  'rejected_under_18',
  'rejected_no_cscs',
  'abandoned',
  'duplicate'
);

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Organizations (AZTEC is the tenant)
CREATE TABLE organizations (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  settings     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Liam, directors, future site managers)
CREATE TABLE users (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'labour_manager',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_auth ON users(auth_user_id);

-- Trade Categories (seeded)
CREATE TABLE trade_categories (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id       UUID NOT NULL REFERENCES organizations(id),
  name                  TEXT NOT NULL,
  labour_type           labour_type NOT NULL,
  typical_day_rate      DECIMAL(8,2),
  required_certifications TEXT[],
  -- Q9: Job description pulled into offer for white collar roles
  job_description       TEXT,
  sort_order            INTEGER DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_trade_categories_org ON trade_categories(organization_id);

-- Sites (work locations)
CREATE TABLE sites (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  name                TEXT NOT NULL,
  address             TEXT NOT NULL,
  postcode            TEXT NOT NULL,
  lat                 DECIMAL(10,7),
  lng                 DECIMAL(10,7),
  -- Primary site manager (quick reference — full list in site_managers table, GAP-014)
  site_manager_name   TEXT,
  site_manager_phone  TEXT,
  site_manager_email  TEXT,
  contact_phone       TEXT,
  -- Project details (GAP-056)
  key_contacts        JSONB DEFAULT '[]',   -- [{ name, role, phone, email }]
  main_duties         TEXT,                 -- Description of main duties at this site
  project_value       DECIMAL(12,2),        -- Contract/project value in GBP
  project_start_date  DATE,
  project_end_date    DATE,
  is_active           BOOLEAN DEFAULT TRUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sites_org ON sites(organization_id);
CREATE INDEX idx_sites_postcode ON sites(postcode);

-- Site managers (multiple per site — GAP-014)
-- Primary manager is mirrored to sites.site_manager_* for quick access
CREATE TABLE site_managers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,  -- Used for WhatsApp routing
  email           TEXT,
  is_primary      BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_site_managers_site ON site_managers(site_id);
CREATE UNIQUE INDEX idx_site_managers_phone_org ON site_managers(phone, organization_id);

-- ============================================================
-- OPERATIVES
-- ============================================================
DROP SEQUENCE IF EXISTS operative_ref_seq;
CREATE SEQUENCE operative_ref_seq START 1;

CREATE TABLE operatives (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id       UUID NOT NULL REFERENCES organizations(id),
  -- Reference number (AZT-XXXX — auto-generated)
  reference_number      TEXT UNIQUE,
  -- Personal
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  email                 TEXT,
  date_of_birth         DATE,
  -- Full address (GAP-012)
  address_line1         TEXT,
  address_line2         TEXT,
  city                  TEXT,
  county                TEXT,
  postcode              TEXT,
  -- Geographic coordinates for distance calculation (GAP-046)
  lat                   DECIMAL(10,7),
  lng                   DECIMAL(10,7),
  nationality           TEXT,
  -- National Insurance number (GAP-011)
  ni_number             TEXT,
  languages             TEXT[] DEFAULT ARRAY['en'],
  preferred_language    TEXT DEFAULT 'en',
  next_of_kin_name      TEXT,
  next_of_kin_phone     TEXT,
  medical_notes         TEXT,
  -- Work
  trade_category_id     UUID REFERENCES trade_categories(id),
  labour_type           labour_type,
  day_rate              DECIMAL(8,2),
  experience_years      INTEGER,
  -- Compliance — RTW (GAP-013: rtw_type added)
  rtw_verified          BOOLEAN DEFAULT FALSE,
  rtw_type              TEXT CHECK (rtw_type IN ('passport', 'biometric_residence_permit', 'share_code', 'eu_settled_status')),
  rtw_expiry            DATE,
  rtw_share_code        TEXT,
  -- Compliance — CSCS
  cscs_card_number      TEXT,
  cscs_expiry           DATE,
  cscs_card_type        cscs_card_type,
  -- WTD (GAP-032: wtd_opt_out_document_id added)
  wtd_opt_out           BOOLEAN DEFAULT FALSE,
  wtd_opt_out_signed_at TIMESTAMPTZ,
  wtd_opt_out_document_id UUID,  -- FK set after documents table created (see migration 00005)
  -- Status & performance
  status                operative_status DEFAULT 'prospect',
  reemploy_status       reemploy_status DEFAULT 'active',
  caution_reason        TEXT,  -- Required if reemploy_status = 'caution'
  avg_rap_score         DECIMAL(3,1),  -- Auto-updated by trigger
  rap_traffic_light     traffic_light, -- Auto-updated by trigger
  total_jobs            INTEGER DEFAULT 0,  -- Auto-updated by trigger (GAP-033)
  total_reviews         INTEGER DEFAULT 0,
  -- Source tracking
  source                TEXT DEFAULT 'web_manual',
  -- Full-text search
  search_vector         TSVECTOR,
  -- Metadata
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate reference number AZT-XXXX (GAP-010, GAP-023)
CREATE OR REPLACE FUNCTION generate_operative_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'AZT-' || LPAD(nextval('operative_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_operative_reference
  BEFORE INSERT ON operatives
  FOR EACH ROW EXECUTE FUNCTION generate_operative_reference();

CREATE UNIQUE INDEX idx_operatives_phone_org ON operatives(phone, organization_id);
CREATE INDEX idx_operatives_org ON operatives(organization_id);
CREATE INDEX idx_operatives_status ON operatives(organization_id, status);
CREATE INDEX idx_operatives_trade ON operatives(trade_category_id);
CREATE INDEX idx_operatives_search ON operatives USING GIN(search_vector);
CREATE INDEX idx_operatives_rap ON operatives(organization_id, avg_rap_score DESC NULLS LAST);
CREATE INDEX idx_operatives_cscs_expiry ON operatives(cscs_expiry) WHERE cscs_expiry IS NOT NULL;
CREATE INDEX idx_operatives_rtw_expiry ON operatives(rtw_expiry) WHERE rtw_expiry IS NOT NULL;

-- Search vector trigger
CREATE OR REPLACE FUNCTION update_operative_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', unaccent(COALESCE(NEW.first_name, ''))) ||
    to_tsvector('english', unaccent(COALESCE(NEW.last_name, ''))) ||
    to_tsvector('simple', COALESCE(NEW.phone, '')) ||
    to_tsvector('simple', COALESCE(NEW.email, '')) ||
    to_tsvector('simple', COALESCE(NEW.postcode, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_operative_search_vector
  BEFORE INSERT OR UPDATE ON operatives
  FOR EACH ROW EXECUTE FUNCTION update_operative_search_vector();

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE documents (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  operative_id    UUID NOT NULL REFERENCES operatives(id) ON DELETE CASCADE,
  document_type   document_type NOT NULL,
  status          document_status DEFAULT 'pending',
  file_url        TEXT,          -- Supabase Storage URL
  file_key        TEXT,          -- Storage path for deletion
  file_name       TEXT,
  expiry_date     DATE,
  notes           TEXT,
  -- RTW specific
  rtw_share_code  TEXT,
  -- Verification
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_operative ON documents(operative_id);
CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_expiry ON documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_documents_type_status ON documents(document_type, status);

-- ============================================================
-- LABOUR REQUESTS
-- ============================================================
CREATE TABLE labour_requests (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id      UUID NOT NULL REFERENCES organizations(id),
  site_id              UUID NOT NULL REFERENCES sites(id),
  requested_by         UUID REFERENCES users(id),
  trade_category_id    UUID REFERENCES trade_categories(id),
  headcount_required   INTEGER NOT NULL DEFAULT 1,
  headcount_filled     INTEGER NOT NULL DEFAULT 0,
  start_date           DATE NOT NULL,
  end_date             DATE,
  day_rate             DECIMAL(8,2),
  required_skills      TEXT[],
  required_certs       TEXT[],
  notes                TEXT,
  status               request_status DEFAULT 'pending',
  -- BUG-04: Prevents cascade + manual send collision (cron sets TRUE while cascading)
  cascade_lock         BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_requests_org ON labour_requests(organization_id);
CREATE INDEX idx_requests_site ON labour_requests(site_id);
CREATE INDEX idx_requests_status ON labour_requests(organization_id, status);
CREATE INDEX idx_requests_start_date ON labour_requests(start_date);

-- ============================================================
-- ALLOCATIONS
-- ============================================================
CREATE TABLE allocations (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id      UUID NOT NULL REFERENCES organizations(id),
  operative_id         UUID NOT NULL REFERENCES operatives(id),
  labour_request_id    UUID REFERENCES labour_requests(id),
  site_id              UUID NOT NULL REFERENCES sites(id),
  -- Dates
  start_date           DATE NOT NULL,
  end_date             DATE,
  actual_start_date    DATE,
  actual_end_date      DATE,
  -- Rate
  agreed_day_rate      DECIMAL(8,2),
  -- Offer tracking (GAP-015: offer_expires_at added)
  offer_sent_at        TIMESTAMPTZ,
  offer_expires_at     TIMESTAMPTZ,  -- System cancels + cascades to next candidate when reached
  offer_responded_at   TIMESTAMPTZ,
  broadcast_rank       INTEGER DEFAULT 1,  -- Position in simultaneous broadcast (1=top candidate)
  -- Induction (GAP-047/059: confirmed digital induction step)
  induction_url        TEXT,              -- Link sent to operative post-confirmation
  induction_sent_at    TIMESTAMPTZ,
  induction_completed  BOOLEAN DEFAULT FALSE,
  induction_completed_at TIMESTAMPTZ,
  induction_data       JSONB DEFAULT '{}',
  -- Status
  status               allocation_status DEFAULT 'pending',
  -- Metadata
  allocated_by         UUID REFERENCES users(id),
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_allocations_org ON allocations(organization_id);
CREATE INDEX idx_allocations_operative ON allocations(operative_id);
CREATE INDEX idx_allocations_request ON allocations(labour_request_id);
CREATE INDEX idx_allocations_site ON allocations(site_id);
CREATE INDEX idx_allocations_status ON allocations(organization_id, status);
CREATE INDEX idx_allocations_dates ON allocations(start_date, end_date);
-- BUG-14: Partial index for cron offer-expiry query — only pending offers
CREATE INDEX idx_allocations_offer_expires ON allocations(offer_expires_at)
  WHERE status = 'pending' AND offer_expires_at IS NOT NULL;

-- ============================================================
-- SHIFTS
-- ============================================================
CREATE TABLE shifts (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id      UUID NOT NULL REFERENCES organizations(id),
  operative_id         UUID NOT NULL REFERENCES operatives(id),
  allocation_id        UUID REFERENCES allocations(id),
  site_id              UUID REFERENCES sites(id),
  -- Scheduled times
  scheduled_start      TIMESTAMPTZ NOT NULL,
  scheduled_end        TIMESTAMPTZ NOT NULL,
  break_minutes        INTEGER DEFAULT 0,
  -- Actual times (clock in/out)
  actual_start         TIMESTAMPTZ,
  actual_end           TIMESTAMPTZ,
  actual_break_minutes INTEGER,
  -- Location verification
  clock_in_lat         DECIMAL(10,7),
  clock_in_lng         DECIMAL(10,7),
  clock_out_lat        DECIMAL(10,7),
  clock_out_lng        DECIMAL(10,7),
  -- Compliance flags
  wtd_overnight_flag   BOOLEAN DEFAULT FALSE,
  wtd_hours_flag       BOOLEAN DEFAULT FALSE,
  -- NEW-GAP-L: Break compliance — set by compliance checker if ≥6hr shift and break_minutes < 20
  break_compliance_flag BOOLEAN DEFAULT FALSE,
  -- Status
  status               shift_status DEFAULT 'scheduled',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shifts_org ON shifts(organization_id);
CREATE INDEX idx_shifts_operative ON shifts(operative_id);
CREATE INDEX idx_shifts_allocation ON shifts(allocation_id);
CREATE INDEX idx_shifts_site ON shifts(site_id);
CREATE INDEX idx_shifts_date ON shifts(scheduled_start);

-- ============================================================
-- TIMESHEETS
-- ============================================================
CREATE TABLE timesheets (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id),
  operative_id      UUID NOT NULL REFERENCES operatives(id),
  week_start        DATE NOT NULL,  -- Always Monday
  -- Calculated totals (updated by trigger or on approval)
  total_hours       DECIMAL(5,2) DEFAULT 0,
  overtime_hours    DECIMAL(5,2) DEFAULT 0,
  total_days        INTEGER DEFAULT 0,
  gross_pay         DECIMAL(10,2) DEFAULT 0,
  day_rate_used     DECIMAL(8,2),
  -- Status workflow
  status            timesheet_status DEFAULT 'draft',
  submitted_by      UUID REFERENCES users(id),
  submitted_at      TIMESTAMPTZ,
  approved_by       UUID REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  rejected_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  locked_by         UUID REFERENCES users(id),
  locked_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(operative_id, week_start)
);

CREATE INDEX idx_timesheets_org ON timesheets(organization_id);
CREATE INDEX idx_timesheets_operative ON timesheets(operative_id);
CREATE INDEX idx_timesheets_week ON timesheets(week_start);
CREATE INDEX idx_timesheets_status ON timesheets(organization_id, status);

CREATE TABLE timesheet_entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timesheet_id    UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  shift_id        UUID REFERENCES shifts(id),
  entry_date      DATE NOT NULL,
  hours_worked    DECIMAL(5,2) NOT NULL,
  overtime_hours  DECIMAL(5,2) DEFAULT 0,
  day_rate        DECIMAL(8,2),
  notes           TEXT,
  is_manual       BOOLEAN DEFAULT FALSE,
  adjustment_reason TEXT
);

CREATE INDEX idx_timesheet_entries_timesheet ON timesheet_entries(timesheet_id);

-- ============================================================
-- PERFORMANCE REVIEWS (RAP Scoring)
-- ============================================================
CREATE TABLE performance_reviews (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id      UUID NOT NULL REFERENCES organizations(id),
  operative_id         UUID NOT NULL REFERENCES operatives(id),
  allocation_id        UUID REFERENCES allocations(id),
  -- Reviewer (nullable if submitted via WhatsApp by non-user)
  reviewer_id          UUID REFERENCES users(id),
  site_manager_name    TEXT,
  site_manager_phone   TEXT,
  -- RAP Scores (ALL required)
  reliability_score    INTEGER NOT NULL CHECK (reliability_score BETWEEN 1 AND 5),
  attitude_score       INTEGER NOT NULL CHECK (attitude_score BETWEEN 1 AND 5),
  performance_score    INTEGER NOT NULL CHECK (performance_score BETWEEN 1 AND 5),
  -- Calculated (by trigger)
  rap_average          DECIMAL(3,1),
  traffic_light        traffic_light,
  -- Comment (required if any score ≤ 2)
  comment              TEXT,
  -- Submission metadata
  submitted_via        TEXT DEFAULT 'web' CHECK (submitted_via IN ('web', 'whatsapp')),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_operative ON performance_reviews(operative_id);
CREATE INDEX idx_reviews_allocation ON performance_reviews(allocation_id);
CREATE INDEX idx_reviews_org ON performance_reviews(organization_id);
-- BUG-12: Prevent duplicate RAP review for same allocation (Twilio resend guard)
CREATE UNIQUE INDEX idx_reviews_unique_allocation
  ON performance_reviews(operative_id, allocation_id)
  WHERE allocation_id IS NOT NULL;

-- Auto-calculate RAP average + traffic light
CREATE OR REPLACE FUNCTION calculate_rap()
RETURNS TRIGGER AS $$
BEGIN
  NEW.rap_average := ROUND(
    (NEW.reliability_score + NEW.attitude_score + NEW.performance_score)::DECIMAL / 3,
    1
  );
  NEW.traffic_light := CASE
    WHEN NEW.rap_average >= 4.0 THEN 'green'::traffic_light
    WHEN NEW.rap_average >= 3.0 THEN 'amber'::traffic_light
    ELSE 'red'::traffic_light
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_rap
  BEFORE INSERT OR UPDATE ON performance_reviews
  FOR EACH ROW EXECUTE FUNCTION calculate_rap();

-- Update operative avg_rap_score when review inserted/updated
CREATE OR REPLACE FUNCTION update_operative_rap()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE operatives
  SET
    avg_rap_score = (
      SELECT ROUND(AVG(rap_average)::DECIMAL, 1)
      FROM performance_reviews
      WHERE operative_id = NEW.operative_id
    ),
    rap_traffic_light = CASE
      WHEN (SELECT AVG(rap_average) FROM performance_reviews WHERE operative_id = NEW.operative_id) >= 4.0
        THEN 'green'::traffic_light
      WHEN (SELECT AVG(rap_average) FROM performance_reviews WHERE operative_id = NEW.operative_id) >= 3.0
        THEN 'amber'::traffic_light
      ELSE 'red'::traffic_light
    END,
    total_reviews = (
      SELECT COUNT(*) FROM performance_reviews WHERE operative_id = NEW.operative_id
    )
  WHERE id = NEW.operative_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_operative_rap
  AFTER INSERT OR UPDATE ON performance_reviews
  FOR EACH ROW EXECUTE FUNCTION update_operative_rap();

-- ============================================================
-- NCRs
-- ============================================================
-- NEW-GAP-C: NCR sequential human-readable reference numbers (NCR-0247 style)
DROP SEQUENCE IF EXISTS ncr_ref_seq;
CREATE SEQUENCE ncr_ref_seq START 1;

CREATE TABLE non_conformance_incidents (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  -- NEW-GAP-C: NCR-XXXX auto-generated on insert (same pattern as AZT-XXXX)
  reference_number TEXT UNIQUE,
  operative_id     UUID NOT NULL REFERENCES operatives(id),
  allocation_id    UUID REFERENCES allocations(id),
  site_id          UUID REFERENCES sites(id),
  incident_type    ncr_type NOT NULL,
  severity         ncr_severity NOT NULL,
  incident_date    DATE NOT NULL,
  description      TEXT NOT NULL,
  witness_name     TEXT,
  reported_by      UUID REFERENCES users(id),
  reported_via     TEXT DEFAULT 'web' CHECK (reported_via IN ('web', 'whatsapp')),
  reporter_name    TEXT,  -- For WhatsApp reporters
  -- Auto-block tracking
  auto_blocked     BOOLEAN DEFAULT FALSE,
  -- Resolution (GAP-016)
  resolved         BOOLEAN DEFAULT FALSE,
  resolved_by      UUID REFERENCES users(id),
  resolved_at      TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ncrs_operative ON non_conformance_incidents(operative_id);
CREATE INDEX idx_ncrs_org ON non_conformance_incidents(organization_id);
CREATE INDEX idx_ncrs_severity ON non_conformance_incidents(severity);
CREATE INDEX idx_ncrs_date ON non_conformance_incidents(incident_date DESC);

-- Auto-generate NCR-XXXX reference (same trigger pattern as operative reference)
CREATE OR REPLACE FUNCTION generate_ncr_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'NCR-' || LPAD(nextval('ncr_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ncr_reference
  BEFORE INSERT ON non_conformance_incidents
  FOR EACH ROW EXECUTE FUNCTION generate_ncr_reference();

-- Auto-block for critical NCRs
CREATE OR REPLACE FUNCTION handle_critical_ncr()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'critical' THEN
    UPDATE operatives
    SET
      status = 'blocked',
      reemploy_status = 'do_not_rehire'
    WHERE id = NEW.operative_id;
    NEW.auto_blocked := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_critical_ncr
  BEFORE INSERT ON non_conformance_incidents
  FOR EACH ROW EXECUTE FUNCTION handle_critical_ncr();

-- ============================================================
-- MESSAGES & COMMUNICATIONS
-- ============================================================
CREATE TABLE message_threads (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  operative_id     UUID REFERENCES operatives(id),
  phone_number     TEXT NOT NULL,
  last_message     TEXT,
  last_message_at  TIMESTAMPTZ,
  unread_count     INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_threads_phone_org ON message_threads(phone_number, organization_id);
CREATE INDEX idx_threads_operative ON message_threads(operative_id);

CREATE TABLE messages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  thread_id        UUID NOT NULL REFERENCES message_threads(id),
  operative_id     UUID REFERENCES operatives(id),
  channel          message_channel DEFAULT 'whatsapp',
  direction        message_direction NOT NULL,
  body             TEXT,
  media_url        TEXT,   -- For image/document/voice messages
  media_type       TEXT,   -- MIME type
  external_id      TEXT,   -- Twilio SID
  status           TEXT DEFAULT 'sent',
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_operative ON messages(operative_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
-- NEW-GAP-E: Twilio MessageSid idempotency — deduplicate webhook replays
CREATE UNIQUE INDEX idx_messages_external_id ON messages(external_id)
  WHERE external_id IS NOT NULL;
