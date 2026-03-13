# Claude Code Briefing — Phase D Implementation

**Date:** 2026-02-26
**From:** Plex (QA/Architecture Lead)
**For:** Claude Code (Implementation)
**Full Plan:** `docs/PLEX_PHASE_D_PLAN.md` (just pushed — READ THIS FIRST)

---

## What You're Building

Phase D adds three things to the BOS:
1. **Sophie asks 2 more questions** — experience years + email
2. **Auto-estimated day rate** on operative creation — based on Aztec's actual grade/quartile rate card
3. **Rate confirmation UI** — so Liam can confirm or adjust the estimated rate

---

## Critical Context

### Aztec's rates are GRADE-BASED, not trade-based
The rate card lives in `docs/client/Aztec_Grade_Pay_Rates.csv`. Do NOT use market estimates or made-up rates. Every number in the system must trace back to that CSV.

### Grade comes from CSCS colour, NOT from asking the operative
Operatives don't think in terms of "skilled" / "highly_skilled". Sophie infers grade from the CSCS card colour they already provide:
- Green/Red/None → `skilled`
- Blue → `highly_skilled`  
- Gold → `exceptional_skill`
- Black → `manager`
- White → `engineer`

### Quartile comes from experience years
- 0–1 yrs → Q1 (Entry)
- 2–3 yrs → Q2 (Developing)
- 4–6 yrs → Q3 (Experienced)
- 7+ yrs → Q4 (Senior)

### Rate is the midpoint of the grade×quartile range
Example: Blue CSCS + 5 yrs → `highly_skilled` Q3 → £19.02–£20.00/hr → midpoint £19.51/hr → £156/day

---

## Implementation Order (3 sessions)

### Session S28a — Sophie Intake Changes

**Goal:** Sophie collects experience + email. Operative created with all data needed for rate estimation.

**Files to modify:**
- `src/lib/whatsapp/sophie-handler.ts`

**Steps:**
1. Update `SophieIntakeData` interface — add `experience_years: number` and `email: string`
2. Add state `awaiting_experience` (after `awaiting_trade`, before `awaiting_name`):
   - Sophie says: "Nice one! How many years of experience do you have as a [trade]?"
   - Extract integer from natural language ("about 5 years" → 5, "just started" → 0, "15+" → 15, "a couple" → 2)
   - Next state: `awaiting_name`
3. Add state `awaiting_email` (after `awaiting_name`, before `docs_link_sent`):
   - Sophie says: "Thanks [first_name]! What's the best email address for us to reach you?"
   - Basic validation (contains @ and .)
   - UPDATE `operative.email`
   - Next state: `docs_link_sent`
4. **Move upload link sending** from `awaiting_name` handler to `awaiting_email` handler
5. Update `createOperativeAndSendLink()` to also set `experience_years` and `email` on the operative
6. Update Sophie's system prompt to include the new states in the flow description

**New flow:**
```
start → awaiting_rtw → awaiting_age → awaiting_cscs → awaiting_trade → awaiting_experience → awaiting_name → awaiting_email → docs_link_sent → qualified
```

**Testing:** Run through a full Sophie conversation. Confirm:
- Experience question appears after trade
- Email question appears after name
- Upload link sent after email (not after name)
- Operative record has experience_years and email populated

---

### Session S28b — Pay Rate System

**Goal:** When an operative is created through Sophie, an estimated day rate is automatically calculated and stored.

**Files to create:**
- `src/lib/pay-rates.ts` — Copy the full module from `docs/PLEX_PHASE_D_PLAN.md` Section 3
- `supabase/migrations/00017_pay_rate_history.sql` — Copy from Section 4

**Files to modify:**
- `src/types/database.ts` — Add `operative_pay_rates` table types (Section 6) + add `rate_status` to operatives
- `src/lib/whatsapp/sophie-handler.ts` — Update `createOperativeAndSendLink()`

**Steps:**
1. Run migration 00017 in Supabase (creates `operative_pay_rates` table, adds `rate_status` + `experience_years` columns to `operatives`)
2. Create `src/lib/pay-rates.ts` — the full module is written in Section 3 of the plan. Copy it exactly. Every rate is from Aztec's rate card.
3. Update `src/types/database.ts` — add the types from Section 6
4. In `createOperativeAndSendLink()`:
   ```typescript
   import { estimateDayRate } from '@/lib/pay-rates'
   
   // After creating the operative, before sending the link:
   const estimated = estimateDayRate(intakeData.cscs_colour, intakeData.experience_years ?? 0)
   
   // Update the operative with rate data
   await supabase.from('operatives').update({
     day_rate: estimated.dayRate,
     hourly_rate: estimated.hourlyRate,
     grade: estimated.grade,
     rate_status: 'estimated',
     experience_years: intakeData.experience_years
   }).eq('id', operativeId)
   
   // Insert pay rate history row
   await supabase.from('operative_pay_rates').insert({
     organization_id: orgId,
     operative_id: operativeId,
     day_rate: estimated.dayRate,
     hourly_rate: estimated.hourlyRate,
     grade: estimated.grade,
     quartile: estimated.quartile,
     rate_type: 'estimated',
     rationale: estimated.rationale,
   })
   ```

**Testing:** Create an operative through Sophie. Confirm:
- `operatives.day_rate` is populated (not null)
- `operatives.rate_status` = 'estimated'
- `operative_pay_rates` has one row with `rate_type='estimated'`
- Rate matches the expected value for the CSCS colour + experience combo

---

### Session S28c — BOS UI (Rate Confirmation)

**Goal:** Liam can see the estimated rate on an operative's profile and confirm or adjust it.

**Files to create:**
- `src/components/operatives/rate-actions.tsx` — Confirm/Adjust buttons + modal
- `src/app/api/operatives/[id]/confirm-rate/route.ts`
- `src/app/api/operatives/[id]/revise-rate/route.ts`

**Files to modify:**
- `src/app/(dashboard)/operatives/[id]/page.tsx` — Add rate card section to Overview tab

**UI specs are in Section 5 of the plan.** Key points:
- Rate card appears near the top of the Overview tab, below name/status
- When `rate_status = 'estimated'`: show amber warning badge, "Confirm Rate" + "Adjust Rate" buttons
- When `rate_status = 'confirmed'`: show green badge, only "Adjust Rate" button
- "Adjust Rate" modal: grade dropdown, quartile dropdown, auto-calculated day rate (editable), reason field (required)
- Collapsible "Pay Rate History" section showing all `operative_pay_rates` rows

**API routes:**
- `POST /api/operatives/[id]/confirm-rate` — accepts optional `day_rate` override, inserts `rate_type='confirmed'` row, updates operative `rate_status='confirmed'`
- `POST /api/operatives/[id]/revise-rate` — accepts `grade`, `quartile`, `day_rate`, `reason`, inserts `rate_type='revised'` row, updates operative

---

## Warnings / Gotchas

1. **Do NOT add a "grade" question to Sophie's flow.** Grade is inferred from CSCS colour. Operatives don't know their Aztec grade.
2. **Do NOT combine questions.** One question per state = reliable Claude extraction. This is how the existing flow works and it's stable.
3. **senior_manager rates had #ERROR in the source spreadsheet.** The plan uses manager rates as a fallback. This is fine for now.
4. **The `experience_years` column might already exist** on operatives (it was in the original schema). The migration uses `IF NOT EXISTS` to be safe.
5. **Upload link timing changes** — currently sent in `awaiting_name` handler. Must move to `awaiting_email` handler. Don't forget this or the link goes out before email is collected.

---

## Quick Reference — The Full Rate Card

From `docs/client/Aztec_Grade_Pay_Rates.csv`:

| Grade | Q1 (0-1yr) | Q2 (2-3yr) | Q3 (4-6yr) | Q4 (7+yr) |
|-------|-----------|-----------|-----------|----------|
| Skilled | £14.00–£14.75 | £14.76–£15.50 | £15.51–£16.25 | £16.26–£17.00 |
| Highly Skilled | £17.01–£18.01 | £18.02–£19.01 | £19.02–£20.00 | £20.01–£21.00 |
| Exceptional Skill | £21.01–£22.01 | £22.02–£23.01 | £23.02–£24.00 | £24.01–£25.00 |
| Specialist Skill | £25.01–£26.01 | £26.02–£27.01 | £27.02–£28.00 | £28.01–£29.00 |
| Engineer | £25.00–£28.75 | £28.76–£32.50 | £32.51–£36.25 | £36.26–£40.00 |
| Manager | £25.00–£28.75 | £28.76–£32.50 | £32.51–£36.25 | £36.26–£40.00 |
| Contracts/Project Mgr | £27.78–£30.84 | £30.85–£33.89 | £33.90–£36.95 | £36.96–£40.00 |

All rates are £/hr. Day rate = hourly × 8.

---

*Plex — S28 — 2026-02-26*
