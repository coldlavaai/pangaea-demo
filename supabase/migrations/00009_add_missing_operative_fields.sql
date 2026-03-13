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
