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
