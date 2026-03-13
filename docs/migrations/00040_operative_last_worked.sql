-- Migration 00040: Add last_worked_date to operatives
-- The spreadsheet has a "Last Worked" column (1,654 of 2,242 operatives have it).
-- The importer already maps this field but the column didn't exist in the DB.
-- This stores the date the operative last worked for Aztec (historical data from import).
-- Going forward this will be derived from allocations, but imported operatives need the historical value.

-- STATUS: Run successfully 2026-03-06
ALTER TABLE operatives
ADD COLUMN IF NOT EXISTS last_worked_date date;
