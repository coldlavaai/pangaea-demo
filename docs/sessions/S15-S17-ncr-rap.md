# Sessions S15–S17 — NCRs, RAP Scoring, Extra Fields

**Date:** February 2026
**Commits:** `e43138e`, `5f92dcb`, `2a94975`, `0282ace`, `6309e12`

---

## S15 — NCRs (Non-Conformance Reports)

**Why:** When an operative misbehaves on site, site managers need to log it formally. 3+ NCRs auto-block the operative.

**Built:**
- `/ncrs` — list with stats cards (Total, Open, Critical, Auto-blocked), filters by type/site/operative
- `/ncrs/new` — create form: type, severity, operative, site, allocation (optional), incident date, description
- `/ncrs/[id]` — detail with auto-block logic display, resolve button
- `NcrResolveButton` — inline resolve form, requires resolution notes
- Auto-block: DB trigger fires when operative reaches 3+ NCRs → sets `operatives.status = 'blocked'`

**NCR types:** `no_show | walk_off | late_arrival | quality_issue | safety_violation | misconduct | other`
**Severity:** `minor | moderate | severe | critical`

**Commits:** `e43138e`

---

## S16 — RAP Scoring (DB + API)

**Why:** Operatives are scored after each job. Scores drive the ranking algorithm in the labour pool search.

**Built:**
- Migration 00008 referenced but `performance_reviews` table already existed in migration 00001
- RAP = Reliability / Attitude / Punctuality (confirmed: A = Attitude)
- `POST /api/operatives/[id]/rap` — creates review, triggers DB function to update `avg_rap_score` and `rap_traffic_light`
- Review fields: attitude (1-5), punctuality (1-5), reliability (1-5), comment, allocation_id (optional)
- Traffic light: green (≥4.0), amber (≥2.5), red (<2.5)
- Comment REQUIRED if any score ≤ 2

**Key decisions:**
- RAP is A = Attitude (not "Reliability, Attitude, Punctuality" — just the name)
- Scores ≤2 require a comment — enforced at form level (not DB)
- `avg_rap_score` is denormalised onto `operatives` table for fast sorting

**Commits:** `5f92dcb`

---

## S17 — Additional Fields from Client Documents

**Why:** Client sent real documents: Giant New Starter Form, New Starter Checklist (Rev 2), Company Induction. Several fields on these forms were not yet in the system.

### Additional Card Schemes (CPCS, PAL/IPAF, CISRS, NRSWA, Other)

**Built:**
- `operative_cards` table — migration 00010 (applied manually via Supabase SQL editor)
- Table: `card_scheme (cpcs|pal_ipaf|cisrs|nrswa|other)`, `card_number`, `card_type`, `categories`, `expiry_date`, `scheme_name`
- UNIQUE constraint: one record per scheme per operative
- `OperativeCardsSection` component — shows all cards on Overview tab with expiry status
- Create/update card inline from Overview tab

### Agency / Source Refactor

**Built:**
- `source` field on operatives changed from free-text to structured select
- Options: `Giant | Elite | Direct | Referral | Job Board | Other`
- Giant = payroll via Flamingo (CIS subcontractors)
- Elite = confirmed agency (NOT just a contractor) — rate model still TBC

### RAP UI + Validation

**Built:**
- RAP tab on operative profile — full review history table
- `RapAddReview` component — inline form on RAP tab
- Comment REQUIRED enforcement when any score ≤ 2 (form-level validation)

### CSV Payroll Fields

**Built:**
- Timesheet CSV export updated to include UTR number (for CIS payroll processing)
- Bank sort code, account number also available in export (masked in UI, plain in CSV)

### Migration 00009

Applied via Supabase SQL editor (not CLI — CLI v2.67.1 has no `db execute`):
- `operative_grade` enum: `skilled | highly_skilled | exceptional_skill | specialist_skill | engineer | manager`
- New operative fields: `grade`, `hourly_rate`, `start_date`, `notes` (separate from `medical_notes`)
- New CSCS fields: `cscs_card_title`, `cscs_card_description`
- Payroll fields: `bank_sort_code`, `bank_account_number`, `utr_number` (all masked in UI)

**Migration 00010:** `operative_cards` table — applied manually.

**Key decisions:**
- All migrations applied via Supabase SQL editor (NOT CLI) — document this every time
- `supabase db execute` does NOT exist in CLI v2.67.1
- Elite confirmed as an agency — rate model TBC (Q2 still open)

**Commits:** `2a94975`, `0282ace`, `6309e12`, `725b7df`, `159d667`
