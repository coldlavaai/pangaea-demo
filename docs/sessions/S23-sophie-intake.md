# Session S23 — Sophie AI Intake (English)

**Date:** 2026-02-24

---

## What Was Built

Sophie — Aztec's AI WhatsApp recruitment assistant. Guides new operatives through registration via a 7-step conversation flow powered by Claude claude-sonnet-4-6.

---

## Files

- `supabase/migrations/00013_sophie_intake.sql` — adds `intake_state` + `intake_data` to `message_threads`
- `src/lib/whatsapp/sophie-handler.ts` — Sophie intake logic + Claude integration
- `src/lib/whatsapp/handler.ts` — updated to route to Sophie for unknown senders + active intake sessions

---

## Intake Flow

```
Unknown number messages Aztec WhatsApp
  → handler.ts: no operative_id on thread → route to Sophie
  → Sophie state: null → "start"

start         → greets, asks if looking for work
awaiting_rtw  → asks about right to work in UK
awaiting_age  → asks if 18 or over
awaiting_cscs → asks about CSCS card + colour
awaiting_trade → asks for trade/skill
awaiting_name  → asks for full name
docs_prompt    → explains doc requirements, references Liam
qualified      → operative record created, Liam notified
rejected       → polite rejection (failed RTW or age gate)
```

---

## Claude Integration

- Model: `claude-sonnet-4-6`
- Package: `@anthropic-ai/sdk` (already installed)
- Each inbound message → Claude called with: system prompt (Sophie persona + all states) + last 9 DB messages + current message
- Claude returns raw JSON: `{ reply, next_state, extracted }`
- `extracted` data merged into `message_threads.intake_data` (JSONB)

---

## On Qualification

Creates an `operatives` row with:
- `status: 'qualifying'`
- `source: 'Direct'`
- `first_name`, `last_name`, `phone` from intake
- `trade_category_id` — fuzzy matched from `trade_categories` by name
- `cscs_card_type` — from intake_data
- `notes` — summary of intake data

Links `message_threads.operative_id` to new record.
Sends Liam a WhatsApp with name, phone, trade, CSCS, and a direct link to the operative profile.

---

## Routing Logic (handler.ts)

```
Inbound message received
  → existing operative + active offer? → offer-handler (YES/NO)
  → no operative_id on thread? → Sophie intake
  → operative in active intake session (intake_state not null/qualified/rejected)? → Sophie intake
  → existing operative, no offer, not in intake → default "we'll get back to you"
```

Media-only messages (photo, no text) during intake → prompt to send a text message too.

---

## Migration 00013 — Apply via Supabase SQL Editor

```sql
ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS intake_state TEXT,
  ADD COLUMN IF NOT EXISTS intake_data  JSONB DEFAULT '{}';
```

**Status: ⚠️ NOT YET APPLIED**

---

## What's Next

- S24: Sophie multi-language — Romanian, Polish, Bulgarian (same state machine, different system prompt language)
- S25: Site manager WhatsApp channel — arrival confirmations, NCR reporting, RAP scores via WhatsApp
