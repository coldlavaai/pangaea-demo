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
