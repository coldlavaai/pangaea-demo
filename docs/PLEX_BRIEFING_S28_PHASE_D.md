# Plex Briefing — Phase D: Sophie Intake Enrichment + Pay Rate System

**Date:** 2026-02-26 (Session S28)
**From:** Claude Code
**For:** Plex (Perplexity Computer)
**Codebase:** https://github.com/Aztec-Landscapes/aztec-bos (branch: `main`)

---

## Context — What's Working Now

The Sophie WhatsApp intake → document upload → BOS pipeline is live and working end-to-end as of S28. Key fixes deployed today:

- CSCS document was not saving (token race condition) — **fixed**
- Document viewing in BOS now works inline (signed URLs via service client) — **fixed**
- Post-upload WhatsApp message to operative — **fixed**

The current Sophie intake collects: RTW, age, CSCS card (colour only), trade, first + last name.

The document upload form collects: address, passport/driving licence photo (Vision-verified), CSCS card photo (Vision-verified).

---

## What Oliver Asked For (verbatim intent)

> "When you open the operative, where it says CSCS tickets, it's recorded at the colour of the card, but it hasn't taken the card number and the expiry date, which it should be able to do. So it should be able to take out details from the documents and put them into the system."

> "Maybe an email address would also be a good thing to ask. So we're getting there. But yeah, more work to be done. It needs to feel a lot more cohesive and taking as much information from the conversation as possible and inputting it into the system."

> "From the documents I gave you with all the pay rates, the timesheets, based on the experience, which I think we're missing from the onboarding as well, years experience, skill level, et cetera, that we should assign a pay rate if they haven't worked yet as an estimated pay rate until confirmed by Liam. And then obviously once they've worked, then that pay rate will be confirmed pay rate. And then if they ever change the pay rate, we'll have a history of their pay rates if they've been given a higher pay rate or a raise or a deduction or whatever. So we need to think about this in a much more automated and integrated way."

---

## Requirements List

### D1 — Email Address in Sophie Intake
- Add `awaiting_email` state to Sophie flow (after `awaiting_name`, before `docs_link_sent`)
- Sophie asks: "What's the best email address for us to reach you?"
- Extract: `email` → store in `intake_data` + set `operative.email` on operative creation
- Format validation: basic email format check by Claude in extraction
- **New Sophie state order:** `start → awaiting_rtw → awaiting_age → awaiting_cscs → awaiting_trade → awaiting_name → awaiting_email → docs_link_sent`

### D2 — Years of Experience in Sophie Intake
- Add `awaiting_experience` state (after `awaiting_email`, before `docs_link_sent`) OR combine with trade question
- Sophie asks: "How many years of experience do you have as a [trade]?"
- Extract: `experience_years` (integer) → store in `intake_data` + set `operative.experience_years`
- Accept natural language: "about 5 years", "just started", "15+", etc.

### D3 — Skill Level / Grade in Sophie Intake
- Either ask explicitly OR infer from CSCS card colour + experience
- Suggested explicit question: "Would you describe yourself as a skilled operative, labourer, or supervisor?"
- Maps to operative `grade` field values (check current DB enum) OR `labour_type`
- If inferring: green CSCS = labourer, blue = skilled, gold = supervisor/foreman, black = manager

### D4 — Auto-Assign Estimated Day Rate on Intake
This is the most complex item. Oliver references a pay rates document. Plex — please check Oliver's documents/context for the Aztec pay rate schedule by trade and experience.

**Logic:**
1. On Sophie intake completion (when operative is created in BOS), use trade + experience_years + CSCS colour to look up a rate from a reference table
2. Set `operative.day_rate` to the estimated rate
3. Flag it as 'estimated' (see D5 for how to track this)
4. Once Liam reviews and confirms, the rate becomes 'confirmed'

**Reference rate table needed:** Plex, please source or reconstruct the Aztec Landscapes pay rate schedule by trade + experience band from Oliver's briefing documents. Claude Code will hard-code this as a lookup table in `src/lib/pay-rates.ts`.

Suggested rate bands:
- Trade (groundworker, labourer, landscaper, plant operator, fencer, bricklayer, etc.)
- Experience (0–1 yr / 2–3 yrs / 4–6 yrs / 7+ yrs)
- CSCS colour modifier (green/none = labourer rate, blue = skilled rate, gold/black = supervisor rate)

### D5 — Pay Rate History Table
New DB table: `operative_pay_rates`

**Proposed schema:**
```sql
CREATE TABLE operative_pay_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  operative_id UUID NOT NULL REFERENCES operatives(id) ON DELETE CASCADE,
  day_rate NUMERIC(8, 2) NOT NULL,
  rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('estimated', 'confirmed', 'revised')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_opr_operative_id ON operative_pay_rates(operative_id);
CREATE INDEX idx_opr_effective_date ON operative_pay_rates(effective_date DESC);
```

**Rate type definitions:**
- `estimated` — set automatically by Sophie on intake, based on trade + experience lookup
- `confirmed` — set by Liam after reviewing/working with the operative
- `revised` — any subsequent change (up or down), with a note

**Flow:**
1. Sophie creates operative → inserts row with `rate_type = 'estimated'`
2. Liam reviews operative in BOS → clicks "Confirm Rate" (or edits) → inserts row with `rate_type = 'confirmed'`; updates `operatives.day_rate`
3. Any future change → inserts row with `rate_type = 'revised'` + notes; updates `operatives.day_rate`

**BOS UI additions needed:**
- Pay rate history tab or section on operative profile
- "Confirm Rate" / "Revise Rate" button for Liam on Overview tab
- Show current rate type badge next to rate value (estimated / confirmed)

---

## Current DB Schema (relevant fields)

From `src/types/database.ts`, the `operatives` table already has:
```
day_rate: number | null
hourly_rate: number | null
experience_years: number | null
grade: string | null   (check DB enum — likely: labourer / skilled / supervisor / manager)
labour_type: string | null
email: string | null
```

The Sophie intake `intake_data` object is stored on `message_threads.intake_data` (JSONB).

Current `SophieIntakeData` interface (in `src/lib/whatsapp/sophie-handler.ts`):
```typescript
interface SophieIntakeData {
  rtw_confirmed?: boolean
  age_confirmed?: boolean
  cscs_card?: boolean
  cscs_colour?: string
  trade?: string
  first_name?: string
  last_name?: string
}
```

This needs to be extended with: `email`, `experience_years`, `skill_level` (or `grade`).

---

## Files Claude Code Will Need to Modify

| File | Change |
|------|--------|
| `src/lib/whatsapp/sophie-handler.ts` | Add new states + extracted fields; update `SophieIntakeData`; update `createOperativeAndSendLink()` to set `email`, `experience_years`, `day_rate` |
| `src/lib/pay-rates.ts` | New file — pay rate lookup table |
| `src/app/api/apply/[token]/upload/route.ts` | Already extracts DOB from passport — confirm this is saving correctly |
| `src/app/(dashboard)/operatives/[id]/page.tsx` | Add pay rate history section to Overview tab |
| `docs/migrations/00017_pay_rate_history.sql` | New migration for `operative_pay_rates` table |
| `src/types/database.ts` | Add `operative_pay_rates` table type |

---

## Questions for Plex to Answer in Plan

1. **Pay rate table:** What are Aztec Landscapes' day rates by trade and experience band? (Check Oliver's documents — he mentioned a pay rates / timesheets document)

2. **Grade enum:** What values does the `grade` field support in the current DB? Claude Code can grep `src/types/database.ts` for `grade` enum values. Plex — please confirm or suggest the right mapping from Sophie's skill level answer to the `grade` field.

3. **Intake flow length:** Adding 2 more states (email + experience) makes Sophie ask 7+ questions. Is this acceptable UX, or should we combine some questions? E.g., "What's your email and how many years of experience do you have?" in one message.

4. **Rate confirmation UI:** Where on the operative profile should "Confirm Rate" live? Liam currently sees the Overview tab — suggest placement.

5. **Hourly rate vs day rate:** Oliver's context mentions both. Should we estimate both on intake, or day rate only?

---

## What Plex Should Deliver Back

A plan document covering:
1. Confirmed pay rate table (trade × experience → £/day)
2. Recommended Sophie state flow (including question wording)
3. DB migration SQL (ready to run)
4. Any changes to `SophieIntakeData` interface
5. Confirm/revise rate UI design (which tab, what button)
6. Implementation order + session estimates

---

*Claude Code — S28 — aztec-bos*
