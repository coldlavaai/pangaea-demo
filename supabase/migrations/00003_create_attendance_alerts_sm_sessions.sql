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
