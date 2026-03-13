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
VALUES ('00000000-0000-0000-0000-000000000001', 'AZTEC Landscapes', 'aztec');

-- Blue collar trade categories
INSERT INTO trade_categories (organization_id, name, labour_type, typical_day_rate, required_certifications, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Skilled Landscaper',     'blue_collar', 175.00, ARRAY['cscs_green'], 1),
  ('00000000-0000-0000-0000-000000000001', 'General Labourer',       'blue_collar', 145.00, ARRAY['cscs_green'], 2),
  ('00000000-0000-0000-0000-000000000001', 'Groundworker',           'blue_collar', 175.00, ARRAY['cscs_green'], 3),
  ('00000000-0000-0000-0000-000000000001', 'Paver / Kerb Layer',     'blue_collar', 180.00, ARRAY['cscs_green'], 4),
  ('00000000-0000-0000-0000-000000000001', 'Plant Operator',         'blue_collar', 200.00, ARRAY['cpcs'], 5),
  ('00000000-0000-0000-0000-000000000001', 'Drainage Operative',     'blue_collar', 175.00, ARRAY['cscs_green'], 6),
  ('00000000-0000-0000-0000-000000000001', 'Carpenter',              'blue_collar', 185.00, ARRAY['cscs_blue'], 7),
  ('00000000-0000-0000-0000-000000000001', 'Bricklayer',             'blue_collar', 185.00, ARRAY['cscs_blue'], 8),
  ('00000000-0000-0000-0000-000000000001', 'Stone Mason',            'blue_collar', 185.00, ARRAY['cscs_blue'], 9),
  ('00000000-0000-0000-0000-000000000001', 'Steel Fixer',            'blue_collar', 185.00, ARRAY['cscs_blue'], 10),
  -- GAP-006: 3 missing blue collar trades added
  ('00000000-0000-0000-0000-000000000001', 'Fencer',                 'blue_collar', 175.00, ARRAY['cscs_green'], 11),
  ('00000000-0000-0000-0000-000000000001', 'Turfing Operative',      'blue_collar', 160.00, ARRAY['cscs_green'], 12),
  ('00000000-0000-0000-0000-000000000001', 'Tree Surgeon / Arborist','blue_collar', 210.00, ARRAY['cscs_green','lantra'], 13);

-- White collar trade categories
INSERT INTO trade_categories (organization_id, name, labour_type, typical_day_rate, required_certifications, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Site Manager',        'white_collar', 350.00, ARRAY['cv','quals'], 20),
  ('00000000-0000-0000-0000-000000000001', 'Project Manager',     'white_collar', 400.00, ARRAY['cv','quals'], 21),
  ('00000000-0000-0000-0000-000000000001', 'Engineer',            'white_collar', 375.00, ARRAY['cv','quals'], 22),
  ('00000000-0000-0000-0000-000000000001', 'Supervisor',          'white_collar', 275.00, ARRAY['cv','quals'], 23),
  ('00000000-0000-0000-0000-000000000001', 'Design Manager',      'white_collar', 425.00, ARRAY['cv','quals'], 24),
  ('00000000-0000-0000-0000-000000000001', 'Document Controller', 'white_collar', 250.00, ARRAY['cv'],         25),
  ('00000000-0000-0000-0000-000000000001', 'Quantity Surveyor',   'white_collar', 375.00, ARRAY['cv','quals'], 26),
  ('00000000-0000-0000-0000-000000000001', 'H&S Officer',         'white_collar', 325.00, ARRAY['cv','nebosh'],27);

-- Sample sites (GAP-007: 3 example sites for dev/testing)
INSERT INTO sites (organization_id, name, address, postcode, main_duties, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Riverside Park Development',
   '1 Riverside Way, Manchester', 'M1 7AE',
   'Landscaping and groundwork for new residential development. Includes turfing, paving, and boundary fencing.',
   TRUE),
  ('00000000-0000-0000-0000-000000000001',
   'Birmingham Business Quarter',
   '45 Corporation Street, Birmingham', 'B4 6QH',
   'Commercial landscaping maintenance. Weekly grass cutting, planting beds, and pathway maintenance.',
   TRUE),
  ('00000000-0000-0000-0000-000000000001',
   'Chelmsford Retail Park',
   'Unit 12 Meadows Way, Chelmsford', 'CM2 6XA',
   'New planting scheme and hard landscaping installation for retail park refurbishment.',
   TRUE);
