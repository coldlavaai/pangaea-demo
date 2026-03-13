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
-- ============================================================
-- MIGRATION 00002: Conversation Sessions + RLS for core tables + Seed data
-- ============================================================

-- ============================================================
-- CONVERSATION SESSIONS (Sophie AI state)
-- ============================================================
CREATE TABLE conversation_sessions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  phone_number     TEXT NOT NULL,
  operative_id     UUID REFERENCES operatives(id),
  state            TEXT NOT NULL DEFAULT 'greeting',
  context          JSONB DEFAULT '{}',
  language         TEXT DEFAULT 'en',
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  -- NEW-GAP-I: Sessions expire after 48 hours of inactivity
  -- On webhook: if expires_at < NOW() and completed_at IS NULL → archive + restart
  expires_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  completed_at     TIMESTAMPTZ,
  outcome          conversation_outcome
);

CREATE UNIQUE INDEX idx_sessions_active_phone
  ON conversation_sessions(phone_number, organization_id)
  WHERE completed_at IS NULL;

CREATE INDEX idx_sessions_phone ON conversation_sessions(phone_number);
CREATE INDEX idx_sessions_state ON conversation_sessions(state) WHERE completed_at IS NULL;

-- ============================================================
-- ROW LEVEL SECURITY — all core tables
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE operatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformance_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Helper function to get org_id from auth session
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Standard org isolation policy (apply to every table)
CREATE POLICY "org_isolation" ON organizations
  FOR ALL USING (id = get_user_org_id());

CREATE POLICY "org_isolation" ON users
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON trade_categories
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON sites
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON site_managers
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON operatives
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON documents
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON labour_requests
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON allocations
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON shifts
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON timesheets
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON timesheet_entries
  FOR ALL USING (
    timesheet_id IN (
      SELECT id FROM timesheets WHERE organization_id = get_user_org_id()
    )
  );

CREATE POLICY "org_isolation" ON performance_reviews
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON non_conformance_incidents
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON message_threads
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON messages
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "org_isolation" ON conversation_sessions
  FOR ALL USING (organization_id = get_user_org_id());

-- ============================================================
-- SEED DATA
-- ============================================================

-- AZTEC Organization
INSERT INTO organizations (id, name, slug)
VALUES ('11111111-1111-1111-1111-111111111111', 'Titan Construction', 'titan-construction');

-- Blue collar trade categories
INSERT INTO trade_categories (organization_id, name, labour_type, typical_day_rate, required_certifications, sort_order)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Skilled Landscaper',     'blue_collar', 175.00, ARRAY['cscs_green'], 1),
  ('11111111-1111-1111-1111-111111111111', 'General Labourer',       'blue_collar', 145.00, ARRAY['cscs_green'], 2),
  ('11111111-1111-1111-1111-111111111111', 'Groundworker',           'blue_collar', 175.00, ARRAY['cscs_green'], 3),
  ('11111111-1111-1111-1111-111111111111', 'Paver / Kerb Layer',     'blue_collar', 180.00, ARRAY['cscs_green'], 4),
  ('11111111-1111-1111-1111-111111111111', 'Plant Operator',         'blue_collar', 200.00, ARRAY['cpcs'], 5),
  ('11111111-1111-1111-1111-111111111111', 'Drainage Operative',     'blue_collar', 175.00, ARRAY['cscs_green'], 6),
  ('11111111-1111-1111-1111-111111111111', 'Carpenter',              'blue_collar', 185.00, ARRAY['cscs_blue'], 7),
  ('11111111-1111-1111-1111-111111111111', 'Bricklayer',             'blue_collar', 185.00, ARRAY['cscs_blue'], 8),
  ('11111111-1111-1111-1111-111111111111', 'Stone Mason',            'blue_collar', 185.00, ARRAY['cscs_blue'], 9),
  ('11111111-1111-1111-1111-111111111111', 'Steel Fixer',            'blue_collar', 185.00, ARRAY['cscs_blue'], 10),
  -- GAP-006: 3 missing blue collar trades added
  ('11111111-1111-1111-1111-111111111111', 'Fencer',                 'blue_collar', 175.00, ARRAY['cscs_green'], 11),
  ('11111111-1111-1111-1111-111111111111', 'Turfing Operative',      'blue_collar', 160.00, ARRAY['cscs_green'], 12),
  ('11111111-1111-1111-1111-111111111111', 'Tree Surgeon / Arborist','blue_collar', 210.00, ARRAY['cscs_green','lantra'], 13);

-- White collar trade categories
INSERT INTO trade_categories (organization_id, name, labour_type, typical_day_rate, required_certifications, sort_order)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Site Manager',        'white_collar', 350.00, ARRAY['cv','quals'], 20),
  ('11111111-1111-1111-1111-111111111111', 'Project Manager',     'white_collar', 400.00, ARRAY['cv','quals'], 21),
  ('11111111-1111-1111-1111-111111111111', 'Engineer',            'white_collar', 375.00, ARRAY['cv','quals'], 22),
  ('11111111-1111-1111-1111-111111111111', 'Supervisor',          'white_collar', 275.00, ARRAY['cv','quals'], 23),
  ('11111111-1111-1111-1111-111111111111', 'Design Manager',      'white_collar', 425.00, ARRAY['cv','quals'], 24),
  ('11111111-1111-1111-1111-111111111111', 'Document Controller', 'white_collar', 250.00, ARRAY['cv'],         25),
  ('11111111-1111-1111-1111-111111111111', 'Quantity Surveyor',   'white_collar', 375.00, ARRAY['cv','quals'], 26),
  ('11111111-1111-1111-1111-111111111111', 'H&S Officer',         'white_collar', 325.00, ARRAY['cv','nebosh'],27);

-- Sample sites (GAP-007: 3 example sites for dev/testing)
INSERT INTO sites (organization_id, name, address, postcode, main_duties, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   'Riverside Park Development',
   '1 Riverside Way, Manchester', 'M1 7AE',
   'Landscaping and groundwork for new residential development. Includes turfing, paving, and boundary fencing.',
   TRUE),
  ('11111111-1111-1111-1111-111111111111',
   'Birmingham Business Quarter',
   '45 Corporation Street, Birmingham', 'B4 6QH',
   'Commercial landscaping maintenance. Weekly grass cutting, planting beds, and pathway maintenance.',
   TRUE),
  ('11111111-1111-1111-1111-111111111111',
   'Chelmsford Retail Park',
   'Unit 12 Meadows Way, Chelmsford', 'CM2 6XA',
   'New planting scheme and hard landscaping installation for retail park refurbishment.',
   TRUE);
-- ============================================================
-- MIGRATION 00003: Attendance, Alerts, Site Manager Sessions
-- ============================================================

-- ============================================================
-- ATTENDANCE (GAP-001, GAP-038)
-- Site manager confirms operative arrived; logged here
-- ============================================================
CREATE TYPE attendance_status AS ENUM ('arrived', 'no_show', 'late', 'left_early');

CREATE TABLE attendance (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  operative_id     UUID NOT NULL REFERENCES operatives(id),
  allocation_id    UUID REFERENCES allocations(id),
  shift_id         UUID REFERENCES shifts(id),
  site_id          UUID NOT NULL REFERENCES sites(id),
  attendance_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status           attendance_status NOT NULL,
  arrived_at       TIMESTAMPTZ,     -- Actual arrival time if known
  confirmed_by     TEXT,            -- Site manager name or 'system'
  confirmed_via    TEXT DEFAULT 'whatsapp' CHECK (confirmed_via IN ('whatsapp', 'web', 'system')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_org ON attendance(organization_id);
CREATE INDEX idx_attendance_operative ON attendance(operative_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date DESC);
CREATE INDEX idx_attendance_site ON attendance(site_id);

-- ============================================================
-- ALERTS / ACTIVITY LOG (GAP-004)
-- Compliance alerts, system events, operative notifications
-- ============================================================
CREATE TYPE alert_type AS ENUM (
  'document_expiring',
  'document_expired',
  'operative_blocked_auto',
  'offer_expired_no_response',
  'broadcast_exhausted',          -- All simultaneous offers expired, no acceptance — alert Liam
  'new_applicant',
  'no_show',
  'ncr_logged',
  'reallocation_needed',
  'wtd_warning',
  'compliance_block'
);

CREATE TABLE alerts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  alert_type       alert_type NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT,
  -- Links to relevant records
  operative_id       UUID REFERENCES operatives(id),
  site_id            UUID REFERENCES sites(id),
  allocation_id      UUID REFERENCES allocations(id),
  document_id        UUID REFERENCES documents(id),
  labour_request_id  UUID REFERENCES labour_requests(id),  -- M-09 FIX: for broadcast_exhausted alerts
  -- Status
  is_read          BOOLEAN DEFAULT FALSE,
  read_by          UUID REFERENCES users(id),
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_org ON alerts(organization_id);
CREATE INDEX idx_alerts_unread ON alerts(organization_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- ============================================================
-- SITE MANAGER SESSIONS (GAP-005, GAP-044)
-- State machine storage for site manager WhatsApp conversations
-- ============================================================
CREATE TYPE sm_session_state AS ENUM (
  'idle',
  'arrival_check_pending',    -- System sent "did X arrive?" — awaiting YES/NO
  'arrival_late_menu',        -- Manager said late — showing "check again / log late"
  'ncr_type_pending',         -- Logging NCR — awaiting incident type selection
  'ncr_severity_pending',     -- Got type — awaiting severity
  'ncr_critical_confirm',     -- Severity = critical — awaiting CONFIRM/CANCEL
  'ncr_description_pending',  -- Got type+severity — awaiting description text
  'rap_r_pending',            -- RAP flow — awaiting R score
  'rap_a_pending',            -- RAP flow — awaiting A score
  'rap_p_pending',            -- RAP flow — awaiting P score
  'rap_comment_pending',      -- Score ≤2 — awaiting comment
  'referral_broadcast_sent'   -- Sent referral ask — awaiting replies
);

CREATE TABLE site_manager_sessions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  phone_number     TEXT NOT NULL,
  site_id          UUID REFERENCES sites(id),
  state            sm_session_state NOT NULL DEFAULT 'idle',
  context          JSONB DEFAULT '{}',  -- Holds in-progress data (operative_id, ncr_type, rap_scores, etc.)
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '4 hours'),  -- Sessions expire if no response
  completed_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_sm_sessions_active_phone
  ON site_manager_sessions(phone_number, organization_id)
  WHERE completed_at IS NULL;

CREATE INDEX idx_sm_sessions_phone ON site_manager_sessions(phone_number);
CREATE INDEX idx_sm_sessions_state ON site_manager_sessions(state) WHERE completed_at IS NULL;
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
-- ============================================================
-- MIGRATION 00005: FK additions, triggers, and RLS for tables in 00003/00004
-- ============================================================

-- Add FK from operatives to documents for WTD opt-out (GAP-032)
-- (Added after documents table exists)
ALTER TABLE operatives
  ADD CONSTRAINT fk_operative_wtd_doc
  FOREIGN KEY (wtd_opt_out_document_id) REFERENCES documents(id);

-- Auto-increment total_jobs when allocation completes (GAP-033)
CREATE OR REPLACE FUNCTION increment_operative_total_jobs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE operatives
    SET total_jobs = total_jobs + 1
    WHERE id = NEW.operative_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_total_jobs
  AFTER UPDATE ON allocations
  FOR EACH ROW EXECUTE FUNCTION increment_operative_total_jobs();

-- Set operative status → available when allocation completes (GAP-048)
CREATE OR REPLACE FUNCTION handle_allocation_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Only set to available if currently 'working' (don't override manual status changes)
    UPDATE operatives
    SET status = 'available'
    WHERE id = NEW.operative_id
    AND status = 'working';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_allocation_complete
  AFTER UPDATE ON allocations
  FOR EACH ROW EXECUTE FUNCTION handle_allocation_completion();

-- Add RLS for new tables
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_manager_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advert_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE adverts ENABLE ROW LEVEL SECURITY;

-- Apply standard org isolation policy to all new tables
CREATE POLICY "org_isolation" ON attendance FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON alerts FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON site_manager_sessions FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON advert_templates FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON adverts FOR ALL USING (organization_id = get_user_org_id());
-- ============================================================
-- MIGRATION 00006: Audit Log, Cron Idempotency, Atomic Functions, Cascade Triggers
-- ============================================================

-- ============================================================
-- AUDIT LOG (NEW-GAP-A)
-- "Full audit trail. Every action logged (who did what, when)"
-- Populated by middleware on all API write endpoints (POST, PATCH, DELETE)
-- ============================================================
CREATE TABLE audit_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id         UUID REFERENCES users(id),
  action          TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  table_name      TEXT NOT NULL,
  record_id       UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_org ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_record ON audit_log(table_name, record_id);
-- Note: audit_log intentionally has NO RLS — only service role writes to it.
-- Web API middleware calls supabase.from('audit_log').insert() using service client.

-- ============================================================
-- CRON IDEMPOTENCY (NEW-GAP-P)
-- Prevents cron double-fire if Vercel retries within the same day
-- ============================================================
CREATE TABLE cron_runs (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type  TEXT NOT NULL,   -- 'compliance' | 'offer_expiry' | 'session_cleanup'
  run_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  ran_at    TIMESTAMPTZ DEFAULT NOW(),
  result    JSONB DEFAULT '{}',
  UNIQUE(job_type, run_date)
);
-- Cron handler: INSERT INTO cron_runs (job_type) VALUES ('compliance') ON CONFLICT DO NOTHING
-- If 0 rows inserted, skip processing (already ran today)

-- ============================================================
-- INBOUND DEDUP (B-01 FIX)
-- Lightweight idempotency table for Twilio webhook deduplication.
-- Stores MessageSid only — avoids the thread_id NOT NULL constraint
-- on the messages table. Full message saved per handler once thread known.
-- ============================================================
CREATE TABLE inbound_dedup (
  external_id     TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  received_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (external_id, organization_id)
);

-- ============================================================
-- ATOMIC OFFER ACCEPTANCE (BUG-01, BUG-13)
-- Prevents two operatives accepting same offer simultaneously
-- Also prevents headcount overfill on labour_requests
-- ============================================================
CREATE OR REPLACE FUNCTION accept_allocation_offer(
  p_allocation_id   UUID,
  p_operative_phone TEXT   -- B-03 NOTE: Used to verify the responder owns this allocation (security check)
) RETURNS JSONB AS $$
DECLARE
  v_allocation allocations%ROWTYPE;
  v_request    labour_requests%ROWTYPE;
  v_operative_phone TEXT;
BEGIN
  -- B-03 FIX: Verify that the phone number of the responder matches the operative on this allocation
  -- Prevents any operative accepting any allocation just by knowing the ID
  SELECT op.phone INTO v_operative_phone
  FROM allocations a
  JOIN operatives op ON op.id = a.operative_id
  WHERE a.id = p_allocation_id;

  IF v_operative_phone IS NULL OR v_operative_phone != p_operative_phone THEN
    RETURN jsonb_build_object('success', false, 'reason', 'operative_mismatch');
  END IF;

  -- Lock the allocation row exclusively
  SELECT * INTO v_allocation
  FROM allocations
  WHERE id = p_allocation_id
    AND status = 'pending'
  FOR UPDATE SKIP LOCKED;

  -- If no row returned, already accepted or doesn't exist
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'offer_already_taken');
  END IF;

  -- Check offer hasn't expired
  IF v_allocation.offer_expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'offer_expired');
  END IF;

  -- BUG-13: Atomically check + increment headcount on parent request
  IF v_allocation.labour_request_id IS NOT NULL THEN
    UPDATE labour_requests
    SET headcount_filled = headcount_filled + 1
    WHERE id = v_allocation.labour_request_id
      AND headcount_filled < headcount_required
    RETURNING * INTO v_request;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'reason', 'headcount_full');
    END IF;
  END IF;

  -- Mark allocation as confirmed
  UPDATE allocations
  SET status = 'confirmed',
      offer_responded_at = NOW(),
      updated_at = NOW()
  WHERE id = p_allocation_id;

  RETURN jsonb_build_object('success', true, 'allocation_id', p_allocation_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- WTD DB-LEVEL GUARD (BUG-02)
-- Prevents two simultaneous allocations bypassing the weekly hours check
-- Application-level check (canAllocate) catches most cases.
-- This DB trigger is the safety net for concurrent INSERTs.
-- Only fires for non-opt-out operatives.
-- ============================================================
CREATE OR REPLACE FUNCTION check_wtd_on_allocation()
RETURNS TRIGGER AS $$
DECLARE
  v_total_hours DECIMAL;
  v_shift_hours DECIMAL;
  v_opt_out     BOOLEAN;
BEGIN
  -- Skip if operative has WTD opt-out
  SELECT wtd_opt_out INTO v_opt_out FROM operatives WHERE id = NEW.operative_id;
  IF v_opt_out THEN RETURN NEW; END IF;

  -- Calculate approximate shift hours for the week
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (s.scheduled_end - s.scheduled_start)) / 3600
  ), 0) INTO v_total_hours
  FROM shifts s
  WHERE s.operative_id = NEW.operative_id
    -- L-08 KNOWN BUG: date_trunc('week', ...) uses UTC not Europe/London — week boundaries wrong in BST (Mar-Oct)
    -- TODO: Fix in S7 compliance session using AT TIME ZONE 'Europe/London' before date_trunc
    -- Low frequency issue: only affects allocations created at exactly UK midnight during BST
    AND s.scheduled_start >= date_trunc('week', NEW.start_date::TIMESTAMPTZ)
    AND s.scheduled_start < date_trunc('week', NEW.start_date::TIMESTAMPTZ) + INTERVAL '1 week'
    AND s.status NOT IN ('cancelled', 'no_show');

  -- Standard working day assumed 8hrs if no shift record yet (conservative)
  v_shift_hours := 8.0;

  IF (v_total_hours + v_shift_hours) > 48 THEN
    RAISE EXCEPTION 'WTD_HOURS_EXCEEDED: operative % would exceed 48hr weekly limit', NEW.operative_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wtd_check_on_allocation
  BEFORE INSERT ON allocations
  FOR EACH ROW EXECUTE FUNCTION check_wtd_on_allocation();

-- ============================================================
-- NO-SHOW CASCADE (BUG-11)
-- When attendance logged as no_show:
--   1. Set operative.status → 'available' (was 'working')
--   2. Set allocation.status → 'no_show'
--   3. NCR is created by the application layer (not trigger, needs more context)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_no_show_attendance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'no_show' THEN
    -- Free up the operative
    UPDATE operatives
    SET status = 'available'
    WHERE id = NEW.operative_id AND status = 'working';

    -- Mark the allocation
    IF NEW.allocation_id IS NOT NULL THEN
      UPDATE allocations
      SET status = 'no_show', updated_at = NOW()
      WHERE id = NEW.allocation_id AND status IN ('confirmed', 'active');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_show_attendance
  AFTER INSERT ON attendance
  FOR EACH ROW EXECUTE FUNCTION handle_no_show_attendance();

-- ============================================================
-- INDUCTION COMPLETION — Public API endpoint handles this:
-- POST /api/v1/allocations/[id]/induction-complete (no auth, validates by allocation UUID)
-- B-15 FIX: The allocation UUID IS the token. No separate induction_token column needed.
-- The URL /induction/[allocation_uuid] is unguessable (UUID v4) — sufficient security for induction form.
-- Handler: verify allocation exists + status is 'confirmed', then set induction_completed = true.
-- Sets: induction_completed = true, induction_completed_at = NOW()
-- Sends confirmation WhatsApp to operative
-- ============================================================

-- RLS for new tables
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

-- audit_log: authenticated users in same org can read; only service role writes
CREATE POLICY "audit_read" ON audit_log
  FOR SELECT USING (organization_id = get_user_org_id());

-- cron_runs: internal only — no user-facing RLS needed (service role only)
CREATE POLICY "cron_internal" ON cron_runs
  FOR ALL USING (FALSE);  -- Blocks all authenticated user access; service role bypasses RLS
-- Migration 00007: Auto-create public.users record on auth signup
-- Ported from JJ's fix (jjs-aztec-bos migration 00007)
--
-- Without this, get_user_org_id() returns NULL for any authenticated user
-- who doesn't have a row in public.users, causing all RLS policies to fail.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, organization_id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    '11111111-1111-1111-1111-111111111111',
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Admin'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    NEW.email,
    'admin'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Backfill any existing auth users who lack a public.users record
INSERT INTO public.users (auth_user_id, organization_id, first_name, last_name, email, role)
SELECT
  id,
  '11111111-1111-1111-1111-111111111111',
  COALESCE(raw_user_meta_data->>'first_name', 'Admin'),
  COALESCE(raw_user_meta_data->>'last_name', 'User'),
  email,
  'admin'
FROM auth.users
ON CONFLICT (auth_user_id) DO NOTHING;
-- Migration 00008: Fix rtw_type CHECK constraint
-- The original constraint only allowed 4 values that did not match the application's RTW type list.
-- Also removes 'passport' (replaced by 'british_citizen'/'irish_citizen') and adds all current values.

ALTER TABLE public.operatives DROP CONSTRAINT IF EXISTS operatives_rtw_type_check;

ALTER TABLE public.operatives ADD CONSTRAINT operatives_rtw_type_check
  CHECK (rtw_type IN (
    'british_citizen',
    'irish_citizen',
    'eu_settled_status',
    'eu_pre_settled_status',
    'share_code',
    'biometric_residence_permit',
    'work_visa',
    'other'
  ));
-- Migration 00009 — Add missing operative fields from client spreadsheet cross-reference
-- Fields identified by comparing client Workers DB spreadsheet against existing schema
-- 2026-02-23

-- Grade enum — maps directly to client's Grades/Pay Rates sheet
DO $$ BEGIN
  CREATE TYPE operative_grade AS ENUM (
    'skilled',
    'highly_skilled',
    'exceptional_skill',
    'specialist_skill',
    'engineer',
    'manager',
    'senior_manager',
    'contracts_manager',
    'project_manager'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add all missing columns to operatives
ALTER TABLE operatives
  -- Pay/grade
  ADD COLUMN IF NOT EXISTS grade            operative_grade,
  ADD COLUMN IF NOT EXISTS hourly_rate      DECIMAL(8,2),

  -- Employment
  ADD COLUMN IF NOT EXISTS start_date       DATE,             -- Date started with Aztec
  ADD COLUMN IF NOT EXISTS notes            TEXT,             -- General notes (separate from medical_notes)

  -- Payroll (sensitive — masked in UI)
  ADD COLUMN IF NOT EXISTS bank_sort_code   TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS utr_number       TEXT,             -- Unique Taxpayer Reference (self-employed)

  -- CSCS detail
  ADD COLUMN IF NOT EXISTS cscs_card_title  TEXT,             -- Title printed on card (e.g. "Plant Operator")
  ADD COLUMN IF NOT EXISTS cscs_card_description TEXT;        -- Description on reverse of card
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
-- ============================================================
-- MIGRATION 00011: Gender, Machine Operator flag, Onboarding checklist
-- Source: Giant new starter form + New starter checklist (Rev 2) + Company induction
-- ============================================================

ALTER TABLE public.operatives
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS machine_operator BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_blue_sticker_issued BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_buddy_allocated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_two_week_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_induction_complete BOOLEAN DEFAULT FALSE;

ALTER TABLE public.operatives
  ADD CONSTRAINT operatives_gender_check CHECK (
    gender IS NULL OR gender IN ('male', 'female', 'prefer_not_to_say')
  );

COMMENT ON COLUMN public.operatives.gender IS 'From Giant new starter form and company induction form';
COMMENT ON COLUMN public.operatives.machine_operator IS 'Qualified to operate Digger / Telehandler / Dumper (from Giant new starter form)';
COMMENT ON COLUMN public.operatives.onboarding_blue_sticker_issued IS 'Provisional ID sticker issued — removed when permanent CSCS card arrives';
COMMENT ON COLUMN public.operatives.onboarding_buddy_allocated IS 'Buddy / mentor allocated on first day';
COMMENT ON COLUMN public.operatives.onboarding_two_week_review IS '2-week check-in review completed';
COMMENT ON COLUMN public.operatives.onboarding_induction_complete IS 'Company induction completed and signed';
-- S22: WhatsApp webhook helper functions

-- Atomic increment for thread unread count
-- Called from the webhook handler after storing each inbound message
CREATE OR REPLACE FUNCTION increment_thread_unread(thread_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE message_threads
  SET unread_count = unread_count + 1
  WHERE id = thread_id;
$$;
-- S23: Sophie AI intake state tracking on message_threads

ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS intake_state TEXT,
  ADD COLUMN IF NOT EXISTS intake_data  JSONB DEFAULT '{}';

-- Valid intake states:
-- NULL           = not in intake flow (existing operative or not started)
-- awaiting_rtw   = greeted, waiting for RTW confirmation
-- awaiting_age   = RTW confirmed, waiting for age 18+ confirmation
-- awaiting_cscs  = age confirmed, waiting for CSCS card info
-- awaiting_trade = CSCS done, waiting for trade/skill
-- awaiting_name  = trade collected, waiting for full name
-- docs_prompt    = name collected, sent docs instructions
-- qualified      = intake complete, operative record created
-- rejected       = failed a hard gate (RTW or age)
-- Create the operative-documents storage bucket (if not already created)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'operative-documents',
  'operative-documents',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow service role full access
CREATE POLICY IF NOT EXISTS "Service role full access to operative-documents"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'operative-documents')
  WITH CHECK (bucket_id = 'operative-documents');

-- Allow authenticated users in same org to view documents
CREATE POLICY IF NOT EXISTS "Authenticated users can view operative-documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'operative-documents');
-- Migration 00015: document upload token on operatives
-- Supports the secure link-based document upload flow (replacing WhatsApp photo collection)

ALTER TABLE public.operatives
  ADD COLUMN IF NOT EXISTS document_upload_token        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS document_upload_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS operatives_upload_token_idx
  ON public.operatives(document_upload_token)
  WHERE document_upload_token IS NOT NULL;
-- Migration 00016: Self-hosted URL shortener
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS short_links (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  code        VARCHAR(12) UNIQUE NOT NULL,
  target_url  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  clicks      INT         DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links (code);

-- No RLS needed — this table is only accessed via service role (server-side redirects)
-- Migration 00024 — RBAC Phase 1: schema, JWT hook, helper functions
-- Run via Supabase SQL editor
-- After running this migration:
--   1. Enable JWT hook in Supabase Dashboard → Authentication → Hooks → Custom Access Token → public.custom_access_token_hook
--   2. Update Oliver's user to admin: UPDATE public.users SET role = 'admin' WHERE email = 'oliver@coldlava.ai';
--   3. Deploy Phase 2 app code before enabling RLS on main tables (Phase 3)

-- ============================================================
-- 1. Add new values to the existing user_role enum
-- ============================================================
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'site_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'auditor';

-- ============================================================
-- 2. Remap legacy roles — director and labour_manager → staff
-- ============================================================
UPDATE public.users
SET role = 'staff'
WHERE role IN ('director', 'labour_manager');

-- ============================================================
-- 3. Create user_sites join table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_sites (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  site_id         UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sites_user_id ON public.user_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sites_site_id ON public.user_sites(site_id);

-- ============================================================
-- 4. Enable RLS on user_sites
-- ============================================================
ALTER TABLE public.user_sites ENABLE ROW LEVEL SECURITY;

-- Only admins can manage user_sites assignments
CREATE POLICY "admin_manage_user_sites"
ON public.user_sites
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'user_role') = 'admin'
)
WITH CHECK (
  (auth.jwt() ->> 'user_role') = 'admin'
);

-- Users can read their own site assignments (needed for get_my_site_ids() fallback)
CREATE POLICY "users_read_own_sites"
ON public.user_sites
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- 5. JWT hook helper functions
-- ============================================================

-- Grant supabase_auth_admin access to read users table (required for hook)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.users TO supabase_auth_admin;

-- Custom Access Token Hook — injects user_role into every JWT issued
-- Must be registered in Supabase Dashboard → Auth → Hooks after this runs
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims    JSONB;
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"staff"');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Restrict execution: only supabase_auth_admin can call this
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- ============================================================
-- 6. RLS helper: get_user_role()
-- ============================================================
-- SECURITY DEFINER so it bypasses users table RLS (avoids recursion)
-- Uses (SELECT ...) pattern in policies to evaluate once per query, not per row
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid()
$$;

-- ============================================================
-- 7. RLS helper: get_my_site_ids()
-- ============================================================
-- Returns site UUIDs assigned to the current user
-- SECURITY DEFINER bypasses user_sites RLS (avoids recursive policy evaluation)
CREATE OR REPLACE FUNCTION public.get_my_site_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT site_id FROM public.user_sites WHERE user_id = auth.uid()
$$;

-- ============================================================
-- 8. Performance indexes on allocations (for site_manager RLS — Phase 3)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_allocations_operative_site_status
  ON public.allocations(operative_id, site_id, status);

CREATE INDEX IF NOT EXISTS idx_allocations_site_id_status
  ON public.allocations(site_id, status);

-- ============================================================
-- AFTER RUNNING THIS MIGRATION:
-- 1. Enable JWT hook in Dashboard → Auth → Hooks → Custom Access Token → public.custom_access_token_hook
-- 2. Run: UPDATE public.users SET role = 'admin' WHERE email = 'oliver@coldlava.ai';
-- 3. Sign out and back in — verify user_role = 'admin' is in the JWT (use jwt.io to decode)
-- ============================================================
-- ============================================================
-- Migration 00025: RLS Phase 3 — operatives, allocations, timesheets
-- ============================================================
-- Verified applied: 2026-03-01
--
-- Role matrix:
--   admin / staff   → full access (SELECT + write) within their org
--   site_manager    → SELECT only, scoped to their assigned sites
--   auditor         → SELECT only, all rows within their org
--
-- NOTE: get_my_site_ids() was also fixed in this migration:
--   - Changed RETURNS SETOF uuid → RETURNS uuid[] (required for ANY() in policies)
--   - Fixed auth_user_id bug: now joins users ON u.id = us.user_id WHERE u.auth_user_id = auth.uid()
-- ============================================================


-- BLOCK 1: get_my_org_id() helper
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_org_id() TO authenticated;


-- BLOCK 1c: Fix get_my_site_ids() — return type + auth_user_id bug
DROP FUNCTION IF EXISTS public.get_my_site_ids();

CREATE FUNCTION public.get_my_site_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT us.site_id
    FROM public.user_sites us
    JOIN public.users u ON u.id = us.user_id
    WHERE u.auth_user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_my_site_ids() TO authenticated;


-- BLOCK 2: RLS on operatives
ALTER TABLE public.operatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operatives_admin_staff_all"
ON public.operatives
FOR ALL
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
)
WITH CHECK (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
);

CREATE POLICY "operatives_site_manager_select"
ON public.operatives
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'site_manager'
  AND EXISTS (
    SELECT 1 FROM public.allocations a
    WHERE a.operative_id = operatives.id
    AND a.site_id = ANY(get_my_site_ids())
  )
);

CREATE POLICY "operatives_auditor_select"
ON public.operatives
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'auditor'
);


-- BLOCK 3: RLS on allocations
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allocations_admin_staff_all"
ON public.allocations
FOR ALL
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
)
WITH CHECK (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
);

CREATE POLICY "allocations_site_manager_select"
ON public.allocations
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'site_manager'
  AND site_id = ANY(get_my_site_ids())
);

CREATE POLICY "allocations_auditor_select"
ON public.allocations
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'auditor'
);


-- BLOCK 4: RLS on timesheets
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheets_admin_staff_all"
ON public.timesheets
FOR ALL
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
)
WITH CHECK (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
);

CREATE POLICY "timesheets_site_manager_select"
ON public.timesheets
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'site_manager'
  AND EXISTS (
    SELECT 1 FROM public.allocations a
    WHERE a.operative_id = timesheets.operative_id
    AND a.site_id = ANY(get_my_site_ids())
  )
);

CREATE POLICY "timesheets_auditor_select"
ON public.timesheets
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'auditor'
);
-- Migration 00026: Induction columns on allocations
-- Run in Supabase SQL editor

ALTER TABLE allocations
  ADD COLUMN IF NOT EXISTS induction_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS induction_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS induction_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS induction_data jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS allocations_induction_token_idx
  ON allocations(induction_token);
-- Migration 00027: Add phone_number to public.users
-- Run in Supabase SQL editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_number varchar(20);

CREATE INDEX IF NOT EXISTS users_phone_number_idx ON users(phone_number);
-- Migration 00028: Language detection for Sophie multi-language support
-- Run in Supabase SQL editor

ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS language varchar(5) DEFAULT 'en';
-- Migration 00029: Telegram bot support
-- Adds telegram_chat_id to users table for site manager bot identity linking
-- Updates CHECK constraints to allow 'telegram' as a channel value

-- 1. Add telegram_chat_id to users (links a BOS user to their Telegram account)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS telegram_chat_id bigint NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_chat_id_idx
  ON public.users (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- 2. Update performance_reviews.submitted_via CHECK to include 'telegram'
--    (current constraint only allows 'web' and 'whatsapp')
ALTER TABLE public.performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_submitted_via_check;

ALTER TABLE public.performance_reviews
  ADD CONSTRAINT performance_reviews_submitted_via_check
  CHECK (submitted_via IN ('web', 'whatsapp', 'telegram'));

-- 3. Update non_conformance_incidents.reported_via if a CHECK constraint exists
--    (drop and recreate to be safe — no-op if constraint didn't exist)
ALTER TABLE public.non_conformance_incidents
  DROP CONSTRAINT IF EXISTS non_conformance_incidents_reported_via_check;

ALTER TABLE public.non_conformance_incidents
  ADD CONSTRAINT non_conformance_incidents_reported_via_check
  CHECK (reported_via IN ('web', 'whatsapp', 'telegram'));
-- Migration 00030: NCR comments table + incident_time field
-- Run in Supabase SQL editor

-- 1. Add incident_time to NCRs (HH:MM text, nullable)
ALTER TABLE public.non_conformance_incidents
  ADD COLUMN IF NOT EXISTS incident_time text;

-- 2. Create NCR comments table
CREATE TABLE IF NOT EXISTS public.ncr_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  ncr_id uuid NOT NULL REFERENCES public.non_conformance_incidents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id),
  author_name text NOT NULL,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ncr_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ncr_comments_org_access" ON public.ncr_comments
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- Index for lookups
CREATE INDEX IF NOT EXISTS ncr_comments_ncr_id_idx ON public.ncr_comments(ncr_id);
-- Migration 00031: Add telegram to message_channel enum
-- IMPORTANT: ALTER TYPE ADD VALUE must be run in its own transaction in Supabase SQL editor
-- Run this statement alone (not with other SQL)

ALTER TYPE public.message_channel ADD VALUE IF NOT EXISTS 'telegram';
-- Migration 00032: Add staff_user_id to message_threads (for Telegram staff conversations)
ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS staff_user_id uuid REFERENCES public.users(id);

-- Index for lookups
CREATE INDEX IF NOT EXISTS message_threads_staff_user_id_idx ON public.message_threads(staff_user_id);
-- Migration 00033: Notification preferences + enhanced notifications
-- Run in Supabase SQL editor

-- Add link_url to notifications table for click-through navigation
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_url text;

-- Add ncr_id FK for NCR-specific notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS ncr_id uuid REFERENCES public.non_conformance_incidents(id) ON DELETE SET NULL;

-- Add receive_notifications to users — controls Telegram DM push (defaults true so existing users opt in)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS receive_notifications boolean NOT NULL DEFAULT true;

-- Enable Supabase Realtime on notifications so AlertsBell gets live badge updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- Migration 00040: Add last_worked_date to operatives
-- The spreadsheet has a "Last Worked" column (1,654 of 2,242 operatives have it).
-- The importer already maps this field but the column didn't exist in the DB.
-- This stores the date the operative last worked for Aztec (historical data from import).
-- Going forward this will be derived from allocations, but imported operatives need the historical value.

-- STATUS: Run successfully 2026-03-06
ALTER TABLE operatives
ADD COLUMN IF NOT EXISTS last_worked_date date;
-- Migration 00041: Add semi_skilled to operative_grade enum
-- 34 operatives in the import have "Semi-Skilled" as their grade.
-- Confirmed by Oliver (2026-03-06): semi_skilled is a distinct grade, not the same as skilled.
-- manager is already in the enum from original schema.

-- STATUS: Run successfully 2026-03-06
ALTER TYPE operative_grade ADD VALUE IF NOT EXISTS 'semi_skilled';
-- Migration 00042: Add charge_rate to operatives
-- Col 8 "Rate" in the workers spreadsheet is the hourly rate Aztec charges the site.
-- Col 27 "Hourly Rate" is the hourly rate paid to the operative.
-- Both are stored per operative as individual rates may vary from grade defaults.

-- STATUS: Run successfully 2026-03-06
ALTER TABLE operatives
ADD COLUMN IF NOT EXISTS charge_rate numeric(10,2);
-- Migration 00043: Trade category corrections from Liam's Q8 answers (2026-03-07)
--
-- 1. Merge 'Slinger' + 'Signaller' into one trade 'Slinger Signaller'
--    Liam confirmed: it's one trade, not two separate certifications.
-- 2. Rename 'Cladding' → 'Cladder'
--    Liam corrected the name.

-- STATUS: Run successfully 2026-03-07

-- Step 1: Rename 'Slinger' to 'Slinger Signaller'
UPDATE trade_categories
SET name = 'Slinger Signaller'
WHERE name = 'Slinger';

-- Step 2: Re-point any operative_trades linked to 'Signaller' → 'Slinger Signaller'
UPDATE operative_trades
SET trade_category_id = (
  SELECT id FROM trade_categories WHERE name = 'Slinger Signaller' LIMIT 1
)
WHERE trade_category_id = (
  SELECT id FROM trade_categories WHERE name = 'Signaller' LIMIT 1
);

-- Step 3: Delete the now-redundant 'Signaller' trade category
DELETE FROM trade_categories WHERE name = 'Signaller';

-- Step 4: Rename 'Cladding' to 'Cladder'
UPDATE trade_categories
SET name = 'Cladder'
WHERE name = 'Cladding';
-- ALF AI Assistant Tables
-- Run in Supabase SQL Editor

-- Conversations
CREATE TABLE IF NOT EXISTS public.assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asst_conv_user ON assistant_conversations(user_id, updated_at DESC);

-- Messages
CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB DEFAULT NULL,
  rich_data JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asst_msg_conv ON assistant_messages(conversation_id, created_at ASC);

-- Tasks
CREATE TABLE IF NOT EXISTS public.assistant_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_by UUID NOT NULL REFERENCES public.users(id),
  assigned_to UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  reminder_at TIMESTAMPTZ,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  conversation_id UUID REFERENCES public.assistant_conversations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asst_tasks_assigned ON assistant_tasks(assigned_to, status, due_date);
CREATE INDEX IF NOT EXISTS idx_asst_tasks_reminder ON assistant_tasks(reminder_at, reminder_sent) WHERE status = 'pending';

-- Settings / Feature Toggles
CREATE TABLE IF NOT EXISTS public.assistant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  UNIQUE (organization_id, feature_key)
);
CREATE INDEX IF NOT EXISTS idx_asst_settings_org ON assistant_settings(organization_id);

-- Seed default feature toggles for existing org
INSERT INTO public.assistant_settings (organization_id, feature_key, enabled, description, category)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'read_operative_search', true, 'Search and filter operatives', 'Read: Operatives'),
  ('11111111-1111-1111-1111-111111111111', 'read_operative_profiles', true, 'View operative profiles and details', 'Read: Operatives'),
  ('11111111-1111-1111-1111-111111111111', 'read_operative_stats', true, 'View workforce statistics', 'Read: Operatives'),
  ('11111111-1111-1111-1111-111111111111', 'read_operative_compliance', true, 'View compliance and document status', 'Read: Operatives'),
  ('11111111-1111-1111-1111-111111111111', 'read_operative_documents', true, 'View operative documents', 'Read: Operatives'),
  ('11111111-1111-1111-1111-111111111111', 'read_sites', true, 'View sites and headcount', 'Read: Operations'),
  ('11111111-1111-1111-1111-111111111111', 'read_allocations', true, 'View allocations and assignments', 'Read: Operations'),
  ('11111111-1111-1111-1111-111111111111', 'read_timesheets', true, 'View timesheets and pay data', 'Read: Operations'),
  ('11111111-1111-1111-1111-111111111111', 'read_requests', true, 'View labour requests', 'Read: Operations'),
  ('11111111-1111-1111-1111-111111111111', 'read_shifts', true, 'View shifts', 'Read: Operations'),
  ('11111111-1111-1111-1111-111111111111', 'read_adverts', true, 'View adverts and recruitment data', 'Read: Operations'),
  ('11111111-1111-1111-1111-111111111111', 'read_agencies', true, 'View agency data', 'Read: Operations'),
  ('11111111-1111-1111-1111-111111111111', 'read_ncrs', true, 'View NCRs and quality data', 'Read: Quality'),
  ('11111111-1111-1111-1111-111111111111', 'read_rap_scores', true, 'View RAP (Reliability/Attitude/Performance) scores', 'Read: Quality'),
  ('11111111-1111-1111-1111-111111111111', 'read_reports', true, 'View reports', 'Read: Quality'),
  ('11111111-1111-1111-1111-111111111111', 'read_whatsapp_history', true, 'View WhatsApp message history', 'Read: Communications'),
  ('11111111-1111-1111-1111-111111111111', 'read_activity_feed', true, 'View activity feed', 'Read: Communications'),
  ('11111111-1111-1111-1111-111111111111', 'write_operative_create', false, 'Create new operatives', 'Write: Operatives'),
  ('11111111-1111-1111-1111-111111111111', 'write_operative_update', false, 'Update operative details', 'Write: Operatives'),
  ('11111111-1111-1111-1111-111111111111', 'write_operative_delete', false, 'Delete operatives', 'Write: Operatives'),
  ('11111111-1111-1111-1111-111111111111', 'write_operative_status', false, 'Change operative status (block/unblock)', 'Write: Operatives'),
  ('11111111-1111-1111-1111-111111111111', 'write_operative_rates', false, 'Update pay rates', 'Write: Operatives'),
  ('11111111-1111-1111-1111-111111111111', 'write_allocations', false, 'Create and terminate allocations', 'Write: Operations'),
  ('11111111-1111-1111-1111-111111111111', 'write_requests', false, 'Create and update labour requests', 'Write: Operations'),
  ('11111111-1111-1111-1111-111111111111', 'write_timesheets', false, 'Approve and reject timesheets', 'Write: Operations'),
  ('11111111-1111-1111-1111-111111111111', 'write_documents', false, 'Verify and reject documents', 'Write: Operations'),
  ('11111111-1111-1111-1111-111111111111', 'write_ncrs', false, 'Create and update NCRs', 'Write: Quality'),
  ('11111111-1111-1111-1111-111111111111', 'write_rap_reviews', false, 'Add RAP reviews', 'Write: Quality'),
  ('11111111-1111-1111-1111-111111111111', 'messaging_whatsapp', false, 'Send WhatsApp messages', 'Messaging: WhatsApp'),
  ('11111111-1111-1111-1111-111111111111', 'messaging_email', false, 'Send emails', 'Messaging: Email'),
  ('11111111-1111-1111-1111-111111111111', 'messaging_telegram', false, 'Send Telegram messages', 'Messaging: Telegram'),
  ('11111111-1111-1111-1111-111111111111', 'admin_users', false, 'Manage users and roles', 'Admin: Users'),
  ('11111111-1111-1111-1111-111111111111', 'admin_settings', false, 'Manage system settings', 'Admin: Settings'),
  ('11111111-1111-1111-1111-111111111111', 'admin_advert_copy', true, 'Generate advert copy using AI', 'Admin: Settings'),
  ('11111111-1111-1111-1111-111111111111', 'tasks', true, 'Create and manage tasks/reminders', 'Tasks')
ON CONFLICT (organization_id, feature_key) DO NOTHING;
-- ============================================================
-- MIGRATION: RAP Expansion — Safety Score + Charge Rate
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- DATE: 2026-03-11
-- WHY: Expand RAP from 3 scores (R/A/P) to 4 (R/A/P/S)
--      Add charge_rate for profitability tracking
-- ============================================================

-- 1. Add safety_score to performance_reviews (nullable for backward-compat)
ALTER TABLE performance_reviews
  ADD COLUMN IF NOT EXISTS safety_score INTEGER CHECK (safety_score BETWEEN 1 AND 5);

-- 2. Add charge_rate to operatives (default rate) and allocations (per-job override)
ALTER TABLE operatives
  ADD COLUMN IF NOT EXISTS charge_rate DECIMAL(8,2);

ALTER TABLE allocations
  ADD COLUMN IF NOT EXISTS charge_rate DECIMAL(8,2);

-- 3. Update submitted_via CHECK to include 'telegram'
ALTER TABLE performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_submitted_via_check;
ALTER TABLE performance_reviews
  ADD CONSTRAINT performance_reviews_submitted_via_check
  CHECK (submitted_via IN ('web', 'whatsapp', 'telegram'));

-- 4. Update calculate_rap() trigger — backward-compatible
--    If safety_score is NULL (old reviews), calculate on 3 scores
--    If safety_score is present, calculate on 4 scores
CREATE OR REPLACE FUNCTION calculate_rap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.safety_score IS NOT NULL THEN
    NEW.rap_average := ROUND(
      (NEW.reliability_score + NEW.attitude_score + NEW.performance_score + NEW.safety_score)::DECIMAL / 4,
      1
    );
  ELSE
    NEW.rap_average := ROUND(
      (NEW.reliability_score + NEW.attitude_score + NEW.performance_score)::DECIMAL / 3,
      1
    );
  END IF;

  NEW.traffic_light := CASE
    WHEN NEW.rap_average >= 4.0 THEN 'green'::traffic_light
    WHEN NEW.rap_average >= 3.0 THEN 'amber'::traffic_light
    ELSE 'red'::traffic_light
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Update operative RAP aggregate trigger (thresholds: 4.0=green, 3.0=amber)
--    This ensures the SAME thresholds are used everywhere (fixes mismatch bug)
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

-- 6. RPC for atomic increment (fixes race condition on targets_completed)
CREATE OR REPLACE FUNCTION increment_targets_completed(run_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE workflow_runs
  SET targets_completed = targets_completed + 1,
      updated_at = NOW()
  WHERE id = run_id;
END;
$$ LANGUAGE plpgsql;
-- ============================================================
-- MIGRATION: Make operative-documents bucket PRIVATE
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- DATE: 2026-03-11
-- WHY: Bucket was public — anyone could guess file URLs and
--      download passport photos, ID documents, CSCS cards
-- ============================================================

-- 1. Set bucket to private (prevents direct URL access)
UPDATE storage.buckets
SET public = false
WHERE id = 'operative-documents';

-- 2. Keep the existing RLS policies but verify they exist
-- Authenticated users can upload (INSERT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated uploads to operative-documents'
  ) THEN
    CREATE POLICY "Allow authenticated uploads to operative-documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'operative-documents');
  END IF;
END $$;

-- Authenticated users can view (SELECT) — needed for signed URL generation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated reads from operative-documents'
  ) THEN
    CREATE POLICY "Allow authenticated reads from operative-documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'operative-documents');
  END IF;
END $$;

-- Service role (used by webhooks/cron) can do everything — no policy needed,
-- service role bypasses RLS automatically.

-- ============================================================
-- IMPORTANT: After running this, document images in the BOS
-- will need signed URLs to display. The code changes for this
-- are in the next commit.
-- ============================================================
-- Update trade categories for construction focus

-- Replace landscaping-specific trades with general construction trades
UPDATE trade_categories SET name = 'Groundworker' WHERE name = 'Skilled Landscaper' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE trade_categories SET name = 'Scaffolder', typical_day_rate = 195.00 WHERE name = 'Paver / Kerb Layer' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE trade_categories SET name = 'Plumber', typical_day_rate = 200.00 WHERE name = 'Drainage Operative' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE trade_categories SET name = 'Electrician', typical_day_rate = 210.00 WHERE name = 'Stone Mason' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE trade_categories SET name = 'Plasterer', typical_day_rate = 175.00 WHERE name = 'Fencer' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE trade_categories SET name = 'Roofer', typical_day_rate = 190.00 WHERE name = 'Turfing Operative' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE trade_categories SET name = 'Demolition Operative', typical_day_rate = 185.00 WHERE name = 'Tree Surgeon / Arborist' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- Update sample sites to construction projects
UPDATE sites SET name = 'Meridian Tower - Phase 2', address = '45 Victoria Street, Manchester', postcode = 'M3 3HP', main_duties = 'Mixed-use commercial and residential development. 14-storey tower with underground parking. Groundworks, concrete frame, and envelope works.' WHERE name = 'Riverside Park Development' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- Update org settings with Pangaea defaults
UPDATE organizations SET settings = jsonb_build_object(
  'reference_prefix', 'TIT',
  'assistant_name', 'Rex',
  'intake_bot_name', 'Amber',
  'company_name', 'Titan Construction'
) WHERE id = '11111111-1111-1111-1111-111111111111';
