-- Migration 00041: Add semi_skilled to operative_grade enum
-- 34 operatives in the import have "Semi-Skilled" as their grade.
-- Confirmed by Oliver (2026-03-06): semi_skilled is a distinct grade, not the same as skilled.
-- manager is already in the enum from original schema.

-- STATUS: Run successfully 2026-03-06
ALTER TYPE operative_grade ADD VALUE IF NOT EXISTS 'semi_skilled';
