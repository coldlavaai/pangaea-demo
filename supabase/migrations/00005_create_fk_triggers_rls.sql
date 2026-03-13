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
