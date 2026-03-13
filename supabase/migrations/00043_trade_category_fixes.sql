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
-- (operative_trades may not exist in all deployments)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operative_trades') THEN
    UPDATE operative_trades
    SET trade_category_id = (
      SELECT id FROM trade_categories WHERE name = 'Slinger Signaller' LIMIT 1
    )
    WHERE trade_category_id = (
      SELECT id FROM trade_categories WHERE name = 'Signaller' LIMIT 1
    );
  END IF;
END $$;

-- Step 3: Delete the now-redundant 'Signaller' trade category
DELETE FROM trade_categories WHERE name = 'Signaller';

-- Step 4: Rename 'Cladding' to 'Cladder'
UPDATE trade_categories
SET name = 'Cladder'
WHERE name = 'Cladding';
