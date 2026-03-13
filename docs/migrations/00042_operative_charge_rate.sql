-- Migration 00042: Add charge_rate to operatives
-- Col 8 "Rate" in the workers spreadsheet is the hourly rate Aztec charges the site.
-- Col 27 "Hourly Rate" is the hourly rate paid to the operative.
-- Both are stored per operative as individual rates may vary from grade defaults.

-- STATUS: Run successfully 2026-03-06
ALTER TABLE operatives
ADD COLUMN IF NOT EXISTS charge_rate numeric(10,2);
