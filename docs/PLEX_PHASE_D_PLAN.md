# Phase D Plan — Sophie Intake Enrichment + Pay Rate System

**Date:** 2026-02-26 (Session S28)
**From:** Plex (Perplexity Computer)
**For:** Claude Code (implementation) + Oliver (review)
**Repo:** `Aztec-Landscapes/aztec-bos` (branch: `main`)
**Responds to:** `docs/PLEX_BRIEFING_S28_PHASE_D.md`

---

## Summary

Phase D adds three capabilities:
1. **Sophie asks more questions** — email, experience years
2. **Auto-estimated day rate** — assigned on intake based on grade (derived from CSCS colour + experience), using Aztec's actual rate card
3. **Pay rate lifecycle** — estimated → confirmed → revised, with full history

---

## 1. Aztec Pay Rates — From the Source

**Source:** `docs/client/Aztec_Grade_Pay_Rates.csv` (extracted from `Aztec-worker-database-New.xlsm`)

Aztec's pay structure is **grade-based with 4 quartiles per grade**. Rates are hourly. The grade maps 1:1 to the existing `operative_grade` DB enum.

### Hourly Rates (£/hr) — Aztec's Actual Rate Card

| Grade (DB enum) | Q1 (Entry) | Q2 (Developing) | Q3 (Experienced) | Q4 (Senior) | Charge Rate |
|-----------------|-----------|-----------------|------------------|-------------|-------------|
| `skilled` | £14.00–£14.75 | £14.76–£15.50 | £15.51–£16.25 | £16.26–£17.00 | £21.00 |
| `highly_skilled` | £17.01–£18.01 | £18.02–£19.01 | £19.02–£20.00 | £20.01–£21.00 | £25.50 |
| `exceptional_skill` | £21.01–£22.01 | £22.02–£23.01 | £23.02–£24.00 | £24.01–£25.00 | £30.50 |
| `specialist_skill` | £25.01–£26.01 | £26.02–£27.01 | £27.02–£28.00 | £28.01–£29.00 | £36.00 |
| `engineer` | £25.00–£28.75 | £28.76–£32.50 | £32.51–£36.25 | £36.26–£40.00 | £40.00 |
| `manager` | £25.00–£28.75 | £28.76–£32.50 | £32.51–£36.25 | £36.26–£40.00 | £40.00 |
| `senior_manager` | — | — | — | — | — (source data has #ERROR) |
| `contracts_manager` | £27.78–£30.84 | £30.85–£33.89 | £33.90–£36.95 | £36.96–£40.00 | £40.00 |
| `project_manager` | £27.78–£30.84 | £30.85–£33.89 | £33.90–£36.95 | £36.96–£40.00 | £40.00 |

### Day Rates (×8 hrs) — What operatives see

| Grade | Q1 Day Rate | Q2 Day Rate | Q3 Day Rate | Q4 Day Rate |
|-------|------------|------------|------------|------------|
| **Skilled** | £112–£118 | £118–£124 | £124–£130 | £130–£136 |
| **Highly Skilled** | £136–£144 | £144–£152 | £152–£160 | £160–£168 |
| **Exceptional Skill** | £168–£176 | £176–£184 | £184–£192 | £192–£200 |
| **Specialist Skill** | £200–£208 | £208–£216 | £216–£224 | £224–£232 |
| **Engineer** | £200–£230 | £230–£260 | £260–£290 | £290–£320 |
| **Manager** | £200–£230 | £230–£260 | £260–£290 | £290–£320 |
| **Contracts Manager** | £222–£247 | £247–£271 | £271–£296 | £296–£320 |
| **Project Manager** | £222–£247 | £247–£271 | £271–£296 | £296–£320 |

### How Quartiles Map to Experience

| Quartile | Experience Proxy | Used When |
|----------|-----------------|-----------|
| Q1 (Entry) | 0–2 years | New to this grade level |
| Q2 (Developing) | 2–4 years | Competent, building experience |
| Q3 (Experienced) | 4–7 years | Reliable, consistent performer |
| Q4 (Senior) | 7+ years | Expert within grade, high RAP scores |

### How Grade is Determined from Sophie Intake

Sophie collects CSCS colour during intake. This is the primary indicator:

| CSCS Colour | Default Grade | Rationale |
|-------------|--------------|-----------|
| Green (Labourer) | `skilled` | Entry-level qualification |
| Red (Trainee/Experienced Worker) | `skilled` | Temporary or working towards NVQ |
| Blue (Skilled Worker) | `highly_skilled` | Holds NVQ Level 2 |
| Gold (Supervisor/Advanced) | `exceptional_skill` | Holds NVQ Level 3+, supervisory |
| Black (Manager) | `manager` | Management-level qualification |
| White (Professionally Qualified) | `engineer` | Professional/technical qualification |
| No CSCS | `skilled` | Default to lowest band |

**Important:** This is an initial estimate only. Liam confirms or adjusts the grade and rate after meeting the operative. The system must make it easy for Liam to change both grade and quartile.

---

## 2. Sophie State Flow (Updated)

### Current Flow (7 states)
```
start → awaiting_rtw → awaiting_age → awaiting_cscs → awaiting_trade → awaiting_name → docs_link_sent
```

### Proposed Flow (10 states)
```
start → awaiting_rtw → awaiting_age → awaiting_cscs → awaiting_trade → awaiting_experience → awaiting_name → awaiting_email → docs_link_sent → qualified
```

### Why this order
1. **Experience after trade** — Sophie says "How many years have you been doing [trade]?" — natural follow-up
2. **Name after experience** — all classification data collected before operative creation, so we can calculate the estimated rate at creation time
3. **Email after name** — "Thanks [name]! What's the best email to reach you?"
4. **Grade is NOT a separate question** — inferred from CSCS colour (see mapping above). Asking operatives "what grade are you?" doesn't work — they don't think in those terms.

### New State Definitions

**`awaiting_experience`** (NEW — after `awaiting_trade`)
```
Sophie: "Nice one! How many years of experience do you have as a [trade]?"
→ Extract: { experience_years: <integer> }
→ Accept natural language: "about 5 years" (→ 5), "just started" (→ 0), "15+" (→ 15), "a couple" (→ 2)
→ next_state: "awaiting_name"
```

**`awaiting_name`** (MODIFIED — creates operative with rate estimate)
```
Sophie: "Great — and what's your full name?"
→ Extract: { first_name: "...", last_name: "..." }
→ TRIGGER: createOperativeAndSendLink() now also:
   - Sets experience_years
   - Infers grade from CSCS colour (see table above)
   - Looks up Q1 midpoint day rate for that grade as estimated rate
   - Inserts row into operative_pay_rates with rate_type='estimated'
→ next_state: "awaiting_email"
```

**`awaiting_email`** (NEW — after `awaiting_name`, before `docs_link_sent`)
```
Sophie: "Thanks [first_name]! What's the best email address for us to reach you?"
→ Extract: { email: "..." }
→ Validate: basic email format check (contains @ and .)
→ UPDATE operative.email
→ Send document upload link
→ next_state: "docs_link_sent"
```

**Key change:** Upload link is now sent in the `awaiting_email` handler (after email collected), not in `awaiting_name`.

### Updated SophieIntakeData Interface
```typescript
export interface SophieIntakeData {
  rtw_confirmed?: boolean
  age_confirmed?: boolean
  cscs_card?: boolean
  cscs_colour?: string
  trade?: string
  experience_years?: number    // NEW
  first_name?: string
  last_name?: string
  email?: string               // NEW
}
```

### UX Note — Question Count
The new flow has **7 questions** (RTW, age, CSCS, trade, experience, name, email). This is fine because:
- RTW + age often combine (Sophie already skips age if mentioned in RTW answer)
- CSCS "no" path skips colour follow-up
- Experience and email are both single short answers
- Total realistic messages from the operative: **5–7**

Do NOT combine questions. One question per state = reliable Claude extraction.

---

## 3. Pay Rate Lookup Module — `src/lib/pay-rates.ts`

```typescript
/**
 * Aztec Landscapes — Pay Rate Lookup
 *
 * Uses Aztec's actual grade/quartile rate card from:
 * docs/client/Aztec_Grade_Pay_Rates.csv
 *
 * Rates are HOURLY. Day rate = hourly × 8.
 * Grade is inferred from CSCS colour on intake.
 * Quartile is inferred from experience years.
 * Liam confirms/adjusts after meeting the operative.
 */

// Aztec's hourly pay rates by grade and quartile
// Each quartile has [min, max] in £/hr
// Source: Aztec-worker-database-New.xlsm "Grades Margin By Quartile" sheet
const AZTEC_RATES: Record<string, { q1: [number, number]; q2: [number, number]; q3: [number, number]; q4: [number, number] }> = {
  skilled:             { q1: [14.00, 14.75], q2: [14.76, 15.50], q3: [15.51, 16.25], q4: [16.26, 17.00] },
  highly_skilled:      { q1: [17.01, 18.01], q2: [18.02, 19.01], q3: [19.02, 20.00], q4: [20.01, 21.00] },
  exceptional_skill:   { q1: [21.01, 22.01], q2: [22.02, 23.01], q3: [23.02, 24.00], q4: [24.01, 25.00] },
  specialist_skill:    { q1: [25.01, 26.01], q2: [26.02, 27.01], q3: [27.02, 28.00], q4: [28.01, 29.00] },
  engineer:            { q1: [25.00, 28.75], q2: [28.76, 32.50], q3: [32.51, 36.25], q4: [36.26, 40.00] },
  manager:             { q1: [25.00, 28.75], q2: [28.76, 32.50], q3: [32.51, 36.25], q4: [36.26, 40.00] },
  senior_manager:      { q1: [25.00, 28.75], q2: [28.76, 32.50], q3: [32.51, 36.25], q4: [36.26, 40.00] }, // Same as manager (source had #ERROR)
  contracts_manager:   { q1: [27.78, 30.84], q2: [30.85, 33.89], q3: [33.90, 36.95], q4: [36.96, 40.00] },
  project_manager:     { q1: [27.78, 30.84], q2: [30.85, 33.89], q3: [33.90, 36.95], q4: [36.96, 40.00] },
}

// CSCS colour → default grade mapping
const CSCS_TO_GRADE: Record<string, string> = {
  green:  'skilled',
  red:    'skilled',
  blue:   'highly_skilled',
  gold:   'exceptional_skill',
  black:  'manager',
  white:  'engineer',
}

// Experience years → quartile mapping
type Quartile = 'q1' | 'q2' | 'q3' | 'q4'

function experienceToQuartile(years: number): Quartile {
  if (years <= 1) return 'q1'
  if (years <= 3) return 'q2'
  if (years <= 6) return 'q3'
  return 'q4'
}

export interface EstimatedRate {
  hourlyRate: number    // £/hr — midpoint of quartile range
  dayRate: number       // hourlyRate × 8, rounded to nearest £2
  grade: string         // operative_grade enum value
  quartile: Quartile    // q1–q4
  rationale: string     // human-readable explanation for Liam
}

/**
 * Estimate an operative's day rate based on intake data.
 *
 * @param cscsColour - CSCS card colour from Sophie (null if no card)
 * @param experienceYears - Years of experience from Sophie
 * @returns EstimatedRate — rate, grade, quartile, and explanation
 */
export function estimateDayRate(
  cscsColour: string | null | undefined,
  experienceYears: number
): EstimatedRate {
  // 1. Determine grade from CSCS colour
  const colour = cscsColour?.toLowerCase().trim() || 'green'
  const grade = CSCS_TO_GRADE[colour] ?? 'skilled'

  // 2. Determine quartile from experience
  const quartile = experienceToQuartile(experienceYears)

  // 3. Look up rate
  const gradeRates = AZTEC_RATES[grade] ?? AZTEC_RATES.skilled
  const [min, max] = gradeRates[quartile]

  // Use midpoint of the quartile range
  const hourlyRate = Math.round(((min + max) / 2) * 100) / 100
  const rawDayRate = hourlyRate * 8
  const dayRate = Math.round(rawDayRate / 2) * 2 // Round to nearest £2

  const quartileLabel = { q1: 'Q1 (Entry)', q2: 'Q2 (Developing)', q3: 'Q3 (Experienced)', q4: 'Q4 (Senior)' }[quartile]

  const rationale = [
    `Grade: ${grade} (from ${colour} CSCS)`,
    `Quartile: ${quartileLabel} (${experienceYears} yrs experience)`,
    `Hourly: £${hourlyRate.toFixed(2)}/hr (midpoint of £${min.toFixed(2)}–£${max.toFixed(2)})`,
    `Day rate: £${dayRate}/day (×8 hrs)`,
    `⚠️ Estimated — confirm with Liam`,
  ].join(' · ')

  return { hourlyRate, dayRate, grade, quartile, rationale }
}

/**
 * Get the full rate range for a grade (for display in the UI).
 */
export function getGradeRateRange(grade: string): { minHourly: number; maxHourly: number; minDay: number; maxDay: number } | null {
  const rates = AZTEC_RATES[grade]
  if (!rates) return null
  return {
    minHourly: rates.q1[0],
    maxHourly: rates.q4[1],
    minDay: Math.round(rates.q1[0] * 8),
    maxDay: Math.round(rates.q4[1] * 8),
  }
}
```

### Example outputs

| Operative | CSCS | Experience | Grade | Quartile | Hourly | Day Rate |
|-----------|------|-----------|-------|----------|--------|----------|
| New labourer, green card | Green | 1 yr | `skilled` | Q1 | £14.38/hr | £114/day |
| Experienced groundworker, blue card | Blue | 5 yrs | `highly_skilled` | Q3 | £19.51/hr | £156/day |
| Senior landscaper, gold card | Gold | 10 yrs | `exceptional_skill` | Q4 | £24.51/hr | £196/day |
| Foreman, black card | Black | 8 yrs | `manager` | Q4 | £38.13/hr | £306/day |
| No CSCS, just started | None | 0 yrs | `skilled` | Q1 | £14.38/hr | £114/day |

These align with the N8N workflow's £170–£200 range for experienced hard landscapers (highly_skilled Q3–Q4 = £152–£168, exceptional_skill Q1–Q2 = £168–£184).

---

## 4. DB Migration SQL

### Migration 00017: Pay Rate History + Schema Updates

```sql
-- Migration: 00017_pay_rate_history.sql
-- Phase D: Pay rate lifecycle tracking

-- ============================================
-- 1. New table: operative_pay_rates
-- ============================================
CREATE TABLE operative_pay_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  operative_id UUID NOT NULL REFERENCES operatives(id) ON DELETE CASCADE,
  day_rate NUMERIC(8, 2) NOT NULL,
  hourly_rate NUMERIC(8, 2),
  grade TEXT,                   -- operative_grade value at time of rate setting
  quartile TEXT CHECK (quartile IN ('q1', 'q2', 'q3', 'q4')),
  rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('estimated', 'confirmed', 'revised')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rationale TEXT,               -- human-readable explanation of how rate was determined
  notes TEXT,                   -- optional free-text notes from Liam
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_opr_operative_id ON operative_pay_rates(operative_id);
CREATE INDEX idx_opr_org_id ON operative_pay_rates(organization_id);
CREATE INDEX idx_opr_effective_date ON operative_pay_rates(operative_id, effective_date DESC);

ALTER TABLE operative_pay_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on pay rates"
  ON operative_pay_rates FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. Add rate_status to operatives table
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operatives' AND column_name = 'rate_status'
  ) THEN
    ALTER TABLE operatives ADD COLUMN rate_status VARCHAR(20) DEFAULT 'estimated'
      CHECK (rate_status IN ('estimated', 'confirmed'));
  END IF;
END $$;

-- ============================================
-- 3. Ensure experience_years exists on operatives
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operatives' AND column_name = 'experience_years'
  ) THEN
    ALTER TABLE operatives ADD COLUMN experience_years INTEGER;
  END IF;
END $$;
```

---

## 5. Rate Confirmation UI Design

### Operative Profile → Overview tab

**Rate card (near top of Overview, below name/status header):**

When `rate_status = 'estimated'`:
```
┌─────────────────────────────────────────────────────────┐
│  Day Rate: £156/day  (£19.51/hr)                        │
│  Grade: Highly Skilled · Q3 (Experienced)               │
│  ⚠️ ESTIMATED — based on blue CSCS + 5 yrs experience   │
│                                                          │
│  [✓ Confirm Rate]  [✏️ Adjust Rate]                      │
└─────────────────────────────────────────────────────────┘
```

When `rate_status = 'confirmed'`:
```
┌─────────────────────────────────────────────────────────┐
│  Day Rate: £160/day  (£20.00/hr)                        │
│  Grade: Highly Skilled · Q3 (Experienced)               │
│  ✅ Confirmed by Liam — 26 Feb 2026                      │
│                                                          │
│  [✏️ Adjust Rate]                                        │
└─────────────────────────────────────────────────────────┘
```

### "Confirm Rate" action
- Click → dialog: "Confirm £156/day as the agreed rate for [Name]?"
- Optional: Liam can adjust the amount before confirming
- On confirm: inserts `operative_pay_rates` row (`rate_type='confirmed'`), updates `operatives.day_rate` + `operatives.rate_status='confirmed'`

### "Adjust Rate" action
- Click → modal with:
  - Grade dropdown (pre-selected with current grade)
  - Quartile dropdown (Q1–Q4, pre-selected)
  - Day rate (auto-fills from grade×quartile selection, but manually editable)
  - Hourly rate (auto-calculates from day rate ÷ 8)
  - Reason (text, required) — e.g. "Promoted to supervisor", "Agreed lower rate"
- On submit: inserts `operative_pay_rates` row (`rate_type='revised'`), updates `operatives.day_rate` + `operatives.grade`

### Pay Rate History (collapsible section below rate card)
```
▼ Pay Rate History
┌──────────┬──────────┬─────────────────┬───────────┬──────────────────────────────┬──────────┐
│ Date     │ Rate     │ Grade           │ Type      │ Notes                        │ By       │
├──────────┼──────────┼─────────────────┼───────────┼──────────────────────────────┼──────────┤
│ 26 Feb   │ £156/day │ Highly Skilled  │ Estimated │ Blue CSCS, 5yrs, Q3 midpoint │ Sophie   │
│ 27 Feb   │ £160/day │ Highly Skilled  │ Confirmed │ —                            │ Liam     │
│ 15 Mar   │ £200/day │ Except. Skill   │ Revised   │ Promoted to foreman role     │ Liam     │
└──────────┴──────────┴─────────────────┴───────────┴──────────────────────────────┴──────────┘
```

---

## 6. Updated `database.ts` Types

```typescript
// Add to Tables:
operative_pay_rates: {
  Row: {
    id: string
    organization_id: string
    operative_id: string
    day_rate: number
    hourly_rate: number | null
    grade: string | null
    quartile: string | null
    rate_type: 'estimated' | 'confirmed' | 'revised'
    effective_date: string
    rationale: string | null
    notes: string | null
    changed_by: string | null
    created_at: string | null
  }
  Insert: {
    id?: string
    organization_id: string
    operative_id: string
    day_rate: number
    hourly_rate?: number | null
    grade?: string | null
    quartile?: string | null
    rate_type: 'estimated' | 'confirmed' | 'revised'
    effective_date?: string
    rationale?: string | null
    notes?: string | null
    changed_by?: string | null
  }
  Update: {
    day_rate?: number
    hourly_rate?: number | null
    grade?: string | null
    quartile?: string | null
    rate_type?: 'estimated' | 'confirmed' | 'revised'
    effective_date?: string
    rationale?: string | null
    notes?: string | null
    changed_by?: string | null
  }
  Relationships: [
    { foreignKeyName: "operative_pay_rates_operative_id_fkey", columns: ["operative_id"], isOneToOne: false, referencedRelation: "operatives", referencedColumns: ["id"] },
    { foreignKeyName: "operative_pay_rates_organization_id_fkey", columns: ["organization_id"], isOneToOne: false, referencedRelation: "organizations", referencedColumns: ["id"] },
    { foreignKeyName: "operative_pay_rates_changed_by_fkey", columns: ["changed_by"], isOneToOne: false, referencedRelation: "users", referencedColumns: ["id"] }
  ]
}

// Add to operatives Row/Insert/Update:
rate_status: 'estimated' | 'confirmed' | null
```

---

## 7. Answers to Claude Code's Briefing Questions

### Q1 — Pay rate table
**Answered.** See Section 1. Aztec uses a grade-based system with 4 quartiles, NOT a trade-based system. Source: `docs/client/Aztec_Grade_Pay_Rates.csv`. The `estimateDayRate()` function in Section 3 is ready to implement.

### Q2 — Grade enum values
Current enum: `skilled | highly_skilled | exceptional_skill | specialist_skill | engineer | manager | senior_manager | contracts_manager | project_manager`

Maps directly to rate card rows. Sophie infers grade from CSCS colour:
- Green/Red/None → `skilled`
- Blue → `highly_skilled`
- Gold → `exceptional_skill`
- Black → `manager`
- White → `engineer`

### Q3 — Intake flow length
7 questions is fine. See Section 2 rationale. Don't combine questions.

### Q4 — Rate confirmation UI
Overview tab on operative profile. See Section 5. Two buttons: "Confirm Rate" + "Adjust Rate". Collapsible pay rate history.

### Q5 — Hourly rate vs day rate
**Both.** Aztec's rate card is hourly-based, but operatives think in day rates. Store both. Day rate is primary display; hourly shown secondary. `hourly_rate = day_rate / 8`.

---

## 8. Implementation Order

### Session S28a — Sophie Intake Changes
**~1 session**

1. Update `SophieIntakeData` interface (add `experience_years`, `email`)
2. Add `awaiting_experience` state to system prompt + handler
3. Add `awaiting_email` state to system prompt + handler
4. Move upload link sending from `awaiting_name` handler to `awaiting_email` handler
5. Update `createOperativeAndSendLink()` to set `experience_years`, `grade` (inferred from CSCS), `email`
6. Test full Sophie flow with new states

### Session S28b — Pay Rate System
**~1 session**

1. Run migration 00017 (operative_pay_rates table + rate_status column)
2. Create `src/lib/pay-rates.ts` (copy from Section 3 — uses Aztec's actual rates)
3. Update `createOperativeAndSendLink()` to call `estimateDayRate()`:
   - Set `operatives.day_rate`, `operatives.hourly_rate`, `operatives.rate_status = 'estimated'`, `operatives.grade`
   - Insert row into `operative_pay_rates` with `rate_type='estimated'` + rationale
4. Update `src/types/database.ts`

### Session S28c — BOS UI
**~1 session**

1. Operative Overview: rate status badge + grade/quartile display
2. "Confirm Rate" button + dialog
3. "Adjust Rate" button + modal (grade dropdown, quartile dropdown, rate input, reason)
4. Pay rate history section (collapsible table)
5. API routes: `POST /api/operatives/[id]/confirm-rate`, `POST /api/operatives/[id]/revise-rate`

### Total: 3 focused sessions

---

## 9. Files to Create / Modify

| File | Action | Session |
|------|--------|---------|
| `src/lib/whatsapp/sophie-handler.ts` | Modify — 2 new states, updated interface, updated createOperativeAndSendLink | S28a |
| `src/lib/pay-rates.ts` | **Create** — Aztec rate lookup (from rate card) | S28b |
| `supabase/migrations/00017_pay_rate_history.sql` | **Create** — new table + columns | S28b |
| `src/types/database.ts` | Modify — add operative_pay_rates, add rate_status to operatives | S28b |
| `src/app/(dashboard)/operatives/[id]/page.tsx` | Modify — rate card + history on Overview | S28c |
| `src/components/operatives/rate-actions.tsx` | **Create** — Confirm/Adjust buttons + modal | S28c |
| `src/app/api/operatives/[id]/confirm-rate/route.ts` | **Create** | S28c |
| `src/app/api/operatives/[id]/revise-rate/route.ts` | **Create** | S28c |

---

## 10. Open Items (Not Blocking Phase D)

| Item | Status | Notes |
|------|--------|-------|
| D4: Confirm Aztec trade list with Martin | Blocked on client | Current 15 trades in Settings are fine for now |
| Senior Manager rates | Source data has #ERROR | Using Manager rates as fallback — ask Martin |
| Emergency contact fields | Missing from operatives table | Identified in Full Workers List. Separate task. |
| Start date field | Missing from operatives table | Q5 from JJ_HANDOFF. Separate task. |
| Elite site rates | Blocked on client (Q2) | May need site-level rate override later |

---

## 11. Cross-Reference: Client Documents → BOS Fields

Full mapping in `docs/client/README.md` (updated this session). Key gaps identified:
- Emergency contact (name + phone) — not in operatives table
- Start date — not tracked
- Borough/locality — not a separate field
- "Last Worked" — derivable from allocations but not stored

These are NOT Phase D scope. Logged for future sessions.

---

*Plex — S28 — 2026-02-26*
*Pay rates sourced from Aztec's actual rate card (Aztec_Grade_Pay_Rates.csv), NOT market estimates.*
*All client documents now in `docs/client/` with comprehensive README.*
