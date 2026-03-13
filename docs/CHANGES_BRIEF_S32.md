# Aztec BOS — Changes Brief S32
**Source:** Liam + Donna feedback session (2026-02-28)
**Full system state:** https://raw.githubusercontent.com/Aztec-Landscapes/aztec-bos/main/docs/SYSTEM_STATE_S32.md
**Repo:** Aztec-Landscapes/aztec-bos (Next.js 15.5.12 · Supabase · Vercel)

---

## How to Read This Brief

Each requested change is categorised:
- **NOW** — Straightforward, maps to existing patterns, can be built immediately
- **PLAN** — Needs DB migration + design decision before building
- **FUTURE** — Complex, explicitly parked, or depends on external systems

Against each item: what already exists, what's missing, what needs to be built.

---

## Change 1 — Operative Profile: Source, Engagement Method & 13-Week Rule

### What They Want
- Display at the top of every operative profile:
  - **Direct or agency** operative
  - **Which agency** (if applicable)
  - **Engagement method**: Self-employed / CIS sole trader / Limited company / Agency operative / Direct PAYE
  - **UTR number** and/or **trading name** (e.g. "JJ Groundworks")
- A calculated **"green light date"** — when the operative can be directly engaged without breaching agency T&Cs (13-week cooling-off period)
  - Calculated from the **last engagement end date**, not first arrival
  - Must reset if operative returns via the same agency after a gap

### What Already Exists
- `operatives` table has: `utr` (text), basic profile fields
- Operative profile page has a status strip at the top (status badge + CSCS + nationality)
- Allocations table has `start_date`, `end_date`, `operative_id`
- `operative_status` enum includes all needed statuses

### What's Missing — DB
- `engagement_method` column on `operatives` — enum: `self_employed | cis_sole_trader | limited_company | agency | direct_paye`
- `agency_name` column on `operatives` (text, nullable)
- `trading_name` column on `operatives` (text, nullable) — e.g. "JJ Groundworks"
- `agency_start_date` column on `operatives` (date, nullable) — when they first came via this agency
- The "green light date" is **calculated**, not stored: `last_agency_engagement_end_date + 91 days` (13 weeks). Query: latest `allocations.end_date` where source was agency.

### What's Missing — UI
- Engagement method, agency name, trading name fields on operative profile (view + edit)
- Green light date calculation displayed prominently on profile top strip
- Fields on the create/edit operative form

### Category: **PLAN**
Requires migration (new columns) + UI changes across profile, create form, and status strip.

---

## Change 2 — Pay, Bank Details & Engagement Section

### What They Want
- A clear, dedicated **Pay & Bank Details** section on the operative profile:
  - Bank details (already captured, needs clearer UI placement)
  - Engagement method (links to Change 1)
  - Current day/hourly rate
- Per-engagement **contract duration** stored alongside rate (e.g. "6 weeks", not just a rate)
- A **minimum acceptable rate** field per operative — so the system can filter out engagements below their floor

### What Already Exists
- `operative_pay_rates` table: `rate`, `rate_status`, `effective_from`, `operative_id`
- Pay rate confirm/adjust UI on operative profile (built S28)
- Bank details fields exist on `operatives` table
- Current rate tab on profile

### What's Missing — DB
- `contract_duration_weeks` column on `operative_pay_rates` (integer, nullable)
- `min_acceptable_rate` column on `operatives` (numeric, nullable)

### What's Missing — UI
- Bank details promoted to a visible, dedicated card on the profile overview tab (currently buried)
- `min_acceptable_rate` field on operative edit form
- `contract_duration_weeks` shown alongside rate in rate history table

### Category: **PLAN**
Small migration + UI reshuffle. Bank details already in DB, just needs better placement.

---

## Change 3 — Right-to-Work: GOV.UK Integration

### What They Want
- RTW status linked to **GOV.UK share code verification system** rather than relying solely on uploaded docs
- Donna wants this as a compliance requirement, not just a nice-to-have

### What Already Exists
- `rtw_share_code` stored on documents table
- RTW verification currently manual (staff review uploaded doc)
- `rtw_verified`, `rtw_type`, `rtw_expiry` fields on operatives

### What's Missing
- Integration with GOV.UK Right to Work checking service (API or Employer Checking Service)
- Note: GOV.UK RTW API has restricted access — requires DBS/HMRC approval; this may need to remain a **manual check with a logged confirmation** rather than a true API integration in the short term

### Category: **FUTURE**
External API with restricted access. Short-term: add a "GOV.UK check confirmed" boolean + date field, manual staff process. Long-term: API integration if/when credentials obtained.

---

## Change 4 — CV Upload & Parsing for White-Collar Workers

### What They Want
- Ability to upload a **CV** document for white-collar operatives
- Claude Vision/AI to **parse and extract**:
  - Job titles / roles
  - Experience summary
  - Most recent role
  - References where available
- Extracted data auto-populates profile fields
- **Work history**: multiple roles with dates stored and searchable
- Search should match **any past role** (not just current trade)

### What Already Exists
- `documents` table supports `document_type = 'cv'` (already in the type list in code: `src/app/(dashboard)/operatives/[id]/documents/[docId]/page.tsx`)
- Claude Vision re-extraction infrastructure exists (`/api/documents/[docId]/re-extract`)
- Upload flow exists (operative-facing + BOS upload)

### What's Missing — DB
- `work_history` table (new): `id`, `operative_id`, `organization_id`, `job_title`, `employer`, `start_date`, `end_date`, `description`, `created_at`
- Or alternatively: JSONB `work_history` column on `operatives`
- `cv_summary` text column on `operatives` (AI-generated summary)

### What's Missing — Code
- CV parsing prompt in re-extract route (new `document_type === 'cv'` branch)
- Work history display on operative profile
- Pool search updated to match against `work_history.job_title` in addition to `trade`

### Category: **PLAN**
DB design decision needed (separate table vs JSONB). Vision extraction pattern already established.

---

## Change 5 — Searchable Comms / WhatsApp Chat Log

### What They Want
- A **search bar** on the comms page (both list view and individual thread view)
- Type a keyword (e.g. "bank details") → jump to the message where it appears
- Like WhatsApp's built-in search

### What Already Exists
- `/comms` list page — shows all threads
- `/comms/[id]` thread detail — shows all messages for an operative
- `messages` table has `body` (text) column

### What's Missing — UI only
- Search input on thread detail page (`/comms/[id]`) — client-side filter on loaded messages, highlight matching messages
- Optional: search input on `/comms` list — server-side search across `messages.body`

### Category: **NOW**
Pure UI addition. No DB changes needed. Client-side text filter on the message list.

---

## Change 6 — Labour Requests: Duration Input + Auto End Date + Finish Reminders

### What They Want
- Replace the **end date** input on labour requests with a **"duration in weeks"** field
- System auto-calculates the end date: `start_date + (duration_weeks × 7)`
- **Reminder notification** generated ~1 week before end date (notify Liam internally)

### What Already Exists
- `labour_requests` table has `start_date`, `end_date`, `status`
- Labour request create form at `/requests`
- Offer expiry cron already exists (`/api/v1/cron/offer-expiry`, hourly)

### What's Missing — DB
- `duration_weeks` column on `labour_requests` (integer, nullable) — store alongside calculated end_date
- `finish_reminder_sent` boolean on `labour_requests` — prevent duplicate notifications

### What's Missing — Code
- UI: replace `end_date` date picker with `duration_weeks` number input; auto-calculate and display end date
- Cron: add finish reminder check to existing hourly cron — when `end_date` is 7 days away and `finish_reminder_sent = false`, notify (WhatsApp to Liam, or internal BOS notification)

### Category: **PLAN**
Small migration + UI change + cron extension.

---

## Change 7 — Exclude Currently Working Operatives from Job Blasts

### What They Want
- When sending a job broadcast WhatsApp to potential operatives:
  - **Default: exclude** operatives currently in `status = 'working'`
  - **Override toggle**: "Include currently working" for global notices (toolbox talks, weather alerts, etc.)
- Logic should be automatic, not a manual filter every time

### What Already Exists
- Allocation/offer broadcast system exists
- `operative_status` enum includes `working`
- Adverts module exists (`/adverts`)

### What's Missing — UI
- Toggle/checkbox on the broadcast/send flow: "Include operatives currently in work" (default: unchecked)
- Pool query in broadcast must filter `status != 'working'` by default

### What's Missing — Logic
- The exclusion needs to apply to: offer broadcasts from labour requests AND any WhatsApp mass-message functionality (adverts)

### Category: **NOW**
Logic change to existing broadcast query + UI toggle. No DB changes needed.

---

## Change 8 — Document Expiry Notifications (Extended)

### What They Want
- **Configurable warning windows** (e.g. 2–3 months ahead, not just 7 days)
- **Internal notifications** to BOS staff when docs are expiring
- **Operative-facing WhatsApp reminders** but only if:
  - Currently live on a job, OR
  - Worked with Aztec within the last 6 months
- **Goodwill reminders** via WhatsApp to operatives in the DB about upcoming expiries (cheap, good brand optics)

### What Already Exists
- Compliance cron (`/api/cron/compliance-check`) — currently: 7-day warning → `compliance_alert=expiring_soon`, expired → block
- `compliance_alert` field on `operatives`
- WhatsApp template infrastructure (`sendWhatsAppTemplate`)

### What's Missing — DB
- `compliance_warning_days` on `organizations` or as an env constant (configurable window — e.g. 60 days not just 7)
- Internal notification mechanism (could be a `notifications` table, or just a BOS inbox concept)

### What's Missing — Code
- Extend cron: add a 30-day and 60-day warning tier, not just 7 days
- Extend cron: send WhatsApp `DOC_EXPIRING` template to operative if `status IN ('working', 'available')` or last allocation end_date within 6 months
- Need a new HSM template: `DOC_EXPIRING` (to be created in Twilio)
- Internal notification: BOS dashboard alert or email to staff

### Category: **PLAN**
Extends existing cron. New Twilio template needed (Plex task). New warning tiers configurable.

---

## Change 9 — Reporting & Compliance Outputs

### What They Want
- A dedicated **reporting section** in BOS
- Reports that ISO auditors can view directly in the system
- Compliance-focused outputs (who has valid docs, who's expired, allocation history, etc.)

### What Already Exists
- All underlying data exists in Supabase
- No reporting UI currently

### What's Missing
- `/reports` dashboard route
- Pre-built report views: compliance summary, operative status, allocation history, expiring documents
- Export to PDF/CSV functionality
- Possible: read-only auditor access role (links to RBAC, Change 10)

### Category: **FUTURE**
Significant module. Design needed. Deferred to next planning session with Donna.

---

## Change 10 — Adverts: Free-form + AI Content Generation

### What They Want
**Level 2 (must have now):**
- System **generates advert content + imagery** from a labour request or from free-form input
- Liam/Donna manually post it to social platforms

**Level 1 (future target):**
- Auto-post to LinkedIn, Facebook, Instagram via API

**Free-form adverts (important):**
- Ability to create adverts **not linked to a labour request** — for database building, generic area campaigns (e.g. "Skilled Groundworkers needed in Manchester")

### What Already Exists
- `/adverts` module exists — currently tied to labour requests
- Anthropic API available

### What's Missing
- **Free-form advert mode**: create advert without linking to a labour request (optional link field, not required)
- **AI content generation**: Claude generates advert copy from trade/location/rate inputs
- **Image generation**: either DALL-E/Flux integration or a templated Canva-style output (TBD)
- Level 1 (auto-posting) deferred — needs social API credentials + OAuth

### Category: **PLAN**
Free-form mode is a straightforward change. AI copy generation uses existing Claude API. Image generation needs a separate decision (provider TBD).

---

## Change 11 — RBAC: Role-Based Access

### What They Want
- Site managers: limited visibility (their sites only, no financials)
- Office staff: full access
- Auditors: read-only compliance view
- Different roles, different screens

### What Already Exists
- Auth system exists (Supabase Auth)
- `users` table exists
- No role differentiation currently — all logged-in users see everything

### What's Missing
- `role` column on `users` — enum: `admin | staff | site_manager | auditor`
- Middleware/layout checks on role before rendering sensitive sections
- Site manager scoping: only see allocations/operatives linked to their sites

### Category: **FUTURE**
Cross-cutting concern — affects every page. Should be designed as a complete system, not added piecemeal.

---

## Change 12 — Missing Timesheet Alerts

### What They Want
- If an operative has no timesheet submitted for several days while supposedly on a job, flag it to Liam
- Prompt to confirm if they've left

### What Already Exists
- `timesheets` table with `operative_id`, `week_start`, `status`
- `allocations` table — knows who should be working and when
- Hourly cron exists

### What's Missing
- Cron check: for each `status=active` allocation, if no timesheet exists for the current week by day X → create internal alert/notification
- Notification mechanism (WhatsApp to Liam, or BOS notification bell)

### Category: **PLAN**
Small cron addition. Needs notification mechanism decision (same as Change 8).

---

## Change 13 — Donseed Integration Hook

### What They Want
- Liam will provide Donseed (fingerprint/time tracking) details
- System should be capable of eventual integration — not isolated

### What Already Exists
- Nothing yet. Donseed details not yet provided.

### Category: **FUTURE**
Blocked on Liam providing credentials/API details. Note for later.

---

## Change 14 — RAP Grade at Top of Profile (PARKED)

### What They Want
- Donna: show RAP grade (star/score) at top of profile at a glance
- **Liam explicitly parked this** — RAP system is a board-level topic and may change significantly

### Category: **DO NOT IMPLEMENT YET**
Noted. Revisit after board decision.

---

## Summary — Implementation Priority Order

### Immediate (NOW — no migration, low complexity)
| # | Change | Effort |
|---|---|---|
| 5 | Searchable comms/chat log | Small — client-side filter |
| 7 | Exclude working operatives from job blasts | Small — query filter + toggle |

### Next Sprint (PLAN — migration + design required, then build)
| # | Change | Effort |
|---|---|---|
| 1 | Operative source, engagement method, 13-week rule | Medium — migration + UI |
| 2 | Pay/bank section + min rate + contract duration | Small-medium — migration + UI reshuffle |
| 4 | CV upload + parsing + work history | Medium — migration + Vision prompt |
| 6 | Labour requests: duration input + finish reminders | Small-medium — migration + cron |
| 8 | Document expiry extended notifications | Medium — cron extension + new template |
| 10 | Adverts: free-form + AI copy generation | Medium — extend existing module |
| 12 | Missing timesheet alerts | Small — cron addition |

### Future (Complex or deferred)
| # | Change | Effort |
|---|---|---|
| 3 | GOV.UK RTW integration | Large — external API, restricted access |
| 9 | Reporting module | Large — new module, design needed |
| 11 | RBAC | Large — cross-cutting, every page |
| 13 | Donseed integration | Blocked — awaiting credentials |
| 14 | RAP at top of profile | Parked by Liam |

---

## Questions for Perplexity / Plex to Resolve Before Building

1. **Notification mechanism** (used by Changes 8, 12, 6): Should internal notifications be a `notifications` table + a bell icon in BOS, or WhatsApp to Liam's number, or email? This decision affects three changes simultaneously.

2. **Work history storage** (Change 4): Separate `work_history` table (normalised, searchable) vs. JSONB column on `operatives` (simpler, less queryable)? Recommendation: separate table for search capability.

3. **Image generation for adverts** (Change 10): DALL-E 3, Stability AI, or Canva API? Or skip imagery for now and just generate copy?

4. **Configurable warning windows** (Change 8): Hard-code 30/60/90 day tiers in the cron, or make them configurable per-org in the `organizations` table / settings UI?

5. **13-week green light calculation** (Change 1): Should this be a calculated field (derived at query time from `allocations`) or a stored/cached date? Calculated is cleaner but requires a subquery on every profile load.

6. **Agency tracking** (Change 1): Is "agency" an entity (a separate `agencies` table with name, contact, T&C details) or just a text field on the operative? Long-term, a table is better. Short-term, a text field is sufficient.
