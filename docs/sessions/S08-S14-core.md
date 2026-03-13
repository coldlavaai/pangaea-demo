# Sessions S8–S14 — Core Modules

**Date:** February 2026 (pre-logging era)
**Commits:** `e17f25d` → `bfc4ae8`

---

## S8 — Document Upload + Management

**Why:** Operatives need documents (CSCS, RTW, Photo ID etc.) verified before work.

**Built:**
- Document upload modal — Supabase Storage (`operative-documents` bucket, private)
- `/operatives/[id]/documents/upload` — upload page with document type select, file picker
- `/operatives/[id]/documents/[docId]` — document detail with verify / reject / delete actions
- Documents tab on operative profile shows status badges (pending / verified / rejected)
- Document types: right_to_work, cscs_card, photo_id, address_proof, bank_statement, hmrc_starter, wtd_opt_out_form, medical_cert, training_cert, passport, driving_licence, other

**Key decisions:**
- Files stored in Supabase Storage with path: `{orgId}/{operativeId}/{docId}/{filename}`
- Supabase Storage bucket is **private** — files served via signed URLs
- Verify/reject requires a reason for rejection (stored in `rejection_reason` field)

**Commits:** `e17f25d`

---

## S9 — Compliance Dashboard

**Why:** Liam needs to see at a glance which operatives have documents expiring or expired.

**Built:**
- `/documents` — compliance overview (not the operative's Documents tab — a global view)
- Stats cards: Expired, Critical (≤7 days), Warning (≤30 days), Valid
- Filter pills — filter by urgency level
- Table shows: operative name, document type, expiry date, days remaining, urgency badge
- Clicking operative name → operative profile Documents tab
- Clicking document → document detail

**Key decisions:**
- RTW alert thresholds: 30, 14, 7, 0 days
- CSCS alert thresholds: 60, 30, 14, 0 days
- CPCS/NPORS: warns but does NOT block (different from CSCS which blocks)

**Commits:** `9951c05`

---

## S10 — Labour Requests

**Why:** The workflow starts with a site manager raising a labour request. Needed before allocations.

**Built:**
- `/requests` — list with status filters, headcount filled/required display
- `/requests/new` — create form (site, trade category, headcount, start/end date, day rate, notes)
- `/requests/[id]` — detail with status actions
- `/requests/[id]/edit` — edit form
- Status machine: `pending → searching → partial → fulfilled → cancelled`
- "Find Operatives" button on detail → navigates to labour pool search

**Key discovery:**
- `labour_requests` has NO `title` field — always display as `{site name} — {trade} (date, ×N headcount)`

**Commits:** `52b9148`

---

## S11 — Labour Pool Search + Allocate

**Why:** Once a request exists, Liam needs to find and allocate the right operatives.

**Built:**
- `/requests/[id]/search` — ranked candidate list
- Haversine distance calculation (operative lat/lng vs site lat/lng)
- Ranking algorithm: RAP score × availability × distance (Google Maps API = placeholder, shows "—")
- Filters: trade category, reemploy status
- "Allocate" button per candidate — creates allocation with status `pending`
- Already-allocated operatives shown greyed out
- Top 3 candidates highlighted with rank badge

**Key decisions:**
- Labour pool excludes: `status = blocked`, `reemploy_status = do_not_rehire`
- Distance shows "—" if site or operative has no coordinates (expected — Google Maps API not live)
- Allocation insert was direct Supabase call at this point (compliance gate added later in S21)

**Commits:** `2fc7685`

---

## S12 — Allocations List + Detail + Status Machine

**Why:** Once allocated, allocations need to be tracked through their full lifecycle.

**Built:**
- `/allocations` — list with status filters, site/operative names, dates
- `/allocations/[id]` — detail page with full status machine
- Status machine: `pending → confirmed → active → completed` / `terminated` / `no_show`
- Status actions: Confirm, Activate, Complete, Terminate, No Show
- Allocation detail shows: operative, site, dates, agreed day rate, status history

**Key discovery:**
- `allocation_status` enum: `pending | confirmed | active | completed | terminated | no_show`
- **`terminated` NOT `cancelled`** — this comes up constantly

**Commits:** `8e2522f`

---

## S13 — WhatsApp Offer Flow

**Why:** When an allocation is pending, Liam sends a WhatsApp offer to the operative for them to accept.

**Built:**
- `SendOfferButton` component — confirmation dialog, calls POST `/api/allocations/[id]/send-offer`
- `/api/allocations/[id]/send-offer` route — Twilio API call, sets `offer_sent_at` and `offer_expires_at`
- Offer window: from `organizations.settings.offer_window_minutes` (default 30 mins)
- On send: records outbound message in `message_threads` + `messages` tables
- Returns 503 if `TWILIO_ACCOUNT_SID = AC_PLACEHOLDER` (expected — real creds not yet configured)

**Key decisions:**
- Aztec's WhatsApp Business number: `+447414157366`
- `offer_expires_at` is set when offer is sent (not when allocation is created)
- The `messages` table uses `external_id` column (NOT `twilio_sid`) for Twilio's MessageSid
- Broadcast model: send to N operatives simultaneously, first YES wins (atomic PG function)

**Commits:** `231a925`

---

## S14 — Shifts + Timesheets

**Why:** Once allocations go active, shifts are tracked and timesheets raised for payment.

**Built:**
- `/shifts` — list of all shifts (created when allocation goes active)
- `/timesheets` — list of weekly timesheets per operative
- `/timesheets/[id]` — timesheet detail with entries (one row per day worked)
- Approval workflow: `draft → submitted → approved → rejected → locked`
- CSV export — includes UTR number for CIS (Construction Industry Scheme) subcontractor payroll

**Key decisions:**
- Shifts have `scheduled_start/end` (datetime) and `actual_start/end` (set when shift starts/ends)
- `break_minutes` and `actual_break_minutes` — tracked per shift for WTR enforcement
- WTD compliance flags on shifts: `wtd_overnight_flag`, `wtd_hours_flag`, `break_compliance_flag`
- Timesheets aggregate: `total_hours`, `total_days`, `gross_pay`, `overtime_hours`
- **CIS not PAYE** — operatives are self-employed subcontractors. UTR in CSV for CIS deductions.

**Commits:** `bfc4ae8`
