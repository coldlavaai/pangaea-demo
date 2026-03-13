# Plex Master Plan — S32 Change Requests
**Date:** 2026-02-28
**From:** Plex (QA/Architecture Lead)
**For:** Claude Code (implementation) + Oliver (review)
**Source:** Liam & Donna feedback session + Claude Code's `CHANGES_BRIEF_S32.md`
**System State:** `SYSTEM_STATE_S32.md`

---

## Cross-Reference Summary

I've reviewed all 14 change requests from Liam and Donna against:
- The current build state (SYSTEM_STATE_S32.md)
- Claude Code's analysis and categorisation (CHANGES_BRIEF_S32.md)
- What's already in the DB/codebase
- What requires new architecture vs. extending existing patterns

Claude Code's analysis is solid. I agree with most categorisations. Below I adjust a few priorities, answer all 6 architecture questions, and lay out the exact build sequence.

---

## Architecture Decisions (Answering Claude Code's 6 Questions)

### Q1: Notification Mechanism (affects Changes 6, 8, 12)

**Decision: `notifications` table + BOS bell icon + optional WhatsApp to Liam.**

Three changes need internal notifications. Building this once unlocks all three. Design:

```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  type VARCHAR(50) NOT NULL, -- 'doc_expiring', 'missing_timesheet', 'request_ending', 'compliance_block', etc.
  title TEXT NOT NULL,
  body TEXT,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  operative_id UUID REFERENCES operatives(id), -- optional link
  labour_request_id UUID REFERENCES labour_requests(id), -- optional link
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_org_unread ON notifications(organization_id, read) WHERE read = false;
```

**UI:** Bell icon in the top nav bar with unread count badge. Click opens a dropdown panel showing recent notifications. Each notification links to the relevant operative/request. Mark as read on click.

**WhatsApp to Liam:** Critical notifications (compliance blocks, missing timesheets >3 days) also send a WhatsApp template to `LIAM_WHATSAPP_NUMBER`. This needs a new HSM template: `aztec_staff_alert`. Non-critical notifications stay BOS-only.

**Why not email:** Liam lives on WhatsApp. Email would be ignored. BOS bell for non-urgent, WhatsApp for urgent.

### Q2: Work History Storage (Change 4)

**Decision: Separate `work_history` table.**

```sql
CREATE TABLE work_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  operative_id UUID NOT NULL REFERENCES operatives(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  employer TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'cv_parsed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wh_operative ON work_history(operative_id);
CREATE INDEX idx_wh_job_title ON work_history(job_title); -- for pool search
```

**Why separate table:** Donna explicitly wants pool search to match ANY past role. JSONB makes that painful. A normalised table = simple `WHERE job_title ILIKE '%PM%'` query. Also cleaner for the CV parsing to insert multiple rows.

**cv_summary** stays as a text column on `operatives` — just a quick AI-generated blurb for the profile header.

### Q3: Image Generation for Adverts (Change 10)

**Decision: Text copy only for now. Skip imagery.**

Rationale:
- Level 2 (must-have) is about *content generation*, not design
- Liam/Donna manually post to social anyway — they'll add their own images or use Canva
- Image gen adds complexity (provider choice, cost, quality) for marginal gain right now
- Claude already generates excellent copy — that's the value

Future: When they want Level 1 (auto-posting), we revisit imagery. Likely Canva API at that point for branded templates.

### Q4: Configurable Warning Windows (Change 8)

**Decision: Hard-code 30/60/90 day tiers in the cron. Add to settings UI later.**

Rationale: Aztec is the only org. Adding per-org config for one customer is over-engineering. Hard-code the tiers now:
- **90 days** → first warning (internal notification only)
- **60 days** → second warning (internal + WhatsApp to operative if active/recent)
- **30 days** → urgent warning (internal + WhatsApp to operative)
- **7 days** → final warning (existing behaviour)
- **0 days (expired)** → block (existing behaviour)

If they ever want different windows, it's a 10-minute change to move the constants to `organizations` table.

### Q5: 13-Week Green Light Date (Change 1)

**Decision: Calculated at query time, NOT stored.**

Rationale:
- The calculation is simple: `MAX(allocations.end_date WHERE source = 'agency') + 91 days`
- Storing it means keeping it in sync whenever allocations change — error-prone
- Profile page already runs queries — one more subquery is trivial
- Add a DB view or function if performance becomes an issue (it won't with Aztec's volume)

### Q6: Agency Tracking (Change 1)

**Decision: Text field now, table later.**

Short-term: `agency_name TEXT` on `operatives`. This is what Liam needs — just to see "via Randstad" at the top of a profile.

Long-term (when Aztec scales): Separate `agencies` table with name, contact, terms, cooling-off period per agency. But that's overbuilding for now. A text field ships in 5 minutes.

---

## Full Change Request Cross-Reference

### ✅ ALREADY BUILT (partial or full)

| # | Request | Current State | Gap |
|---|---------|--------------|-----|
| Compliance cron | B2 built in S31 | 7-day warning + block + allocation termination | Needs extending to 30/60/90 day tiers (Change 8) |
| Pay rates | Built in S28 | Auto-estimate, confirm/adjust, history table | Needs min_acceptable_rate + contract_duration (Change 2) |
| RTW | Built in S31 | Auto-populated on verify, rtw_type/rtw_verified/rtw_expiry | Needs GOV.UK stub (Change 3) |
| Bank details | Fields exist in DB | On operative record | Needs better UI placement (Change 2) |
| Comms/chat | Built | Thread view with messages | Needs search (Change 5) |
| Adverts | Basic module exists | Tied to labour requests | Needs free-form mode + AI copy (Change 10) |
| RBAC | Planned as B5 | Auth exists, no roles | Future (Change 11) |
| RAP | Built, bug-fixed S32 | Submit + view | Parked by Liam (Change 14) |

### 🔨 NEEDS BUILDING

| # | Request | Category | Effort |
|---|---------|----------|--------|
| 1 | Source, engagement method, 13-week rule | PLAN | Medium (1 session) |
| 2 | Pay/bank section + min rate + contract duration | PLAN | Small (0.5 session) |
| 4 | CV upload + parsing + work history | PLAN | Medium (1–2 sessions) |
| 5 | Searchable comms | NOW | Small (0.5 session) |
| 6 | Duration-based labour requests + finish reminders | PLAN | Small-Medium (1 session) |
| 7 | Exclude working ops from blasts | NOW | Small (0.5 session) |
| 8 | Extended expiry notifications (30/60/90 day) | PLAN | Medium (1 session) |
| 10 | Free-form adverts + AI copy | PLAN | Medium (1 session) |
| 12 | Missing timesheet alerts | PLAN | Small (0.5 session) |

### ⏸️ DEFERRED (not building now)

| # | Request | Why |
|---|---------|-----|
| 3 | GOV.UK RTW integration | External API, restricted access. Short-term: add `gov_rtw_checked` boolean + date. Full API later. |
| 9 | Reporting module | Significant new module. Needs proper design session with Donna. |
| 11 | RBAC | Cross-cutting. Design as a complete system after core features ship. |
| 13 | Donseed integration | Blocked on Liam providing details. |
| 14 | RAP at top of profile | Explicitly parked by Liam. |

---

## Build Sequence — Prioritised

### Sprint 1: Foundation + Quick Wins (2 sessions)

**Session S33: Notifications table + Quick Wins**

This session builds the notification infrastructure that three later changes depend on, plus knocks out the two "NOW" items.

1. **Migration 00020:** `notifications` table (see Q1 above)
2. **Notification bell UI:** Bell icon in dashboard nav, unread count, dropdown panel
3. **Change 5 — Searchable comms:** Search input on `/comms/[id]` thread view. Client-side filter + highlight. Also add search on `/comms` list (server-side ILIKE on `messages.body`).
4. **Change 7 — Exclude working ops from blasts:** Add `status != 'working'` filter to broadcast/offer queries. Add "Include currently working" toggle checkbox on broadcast UI. Default: unchecked.

**Session S34: Engagement Method + 13-Week Rule + Pay/Bank Cleanup**

1. **Migration 00021:** Add to `operatives`:
   - `engagement_method` (enum: `self_employed | cis_sole_trader | limited_company | agency | direct_paye`)
   - `agency_name` TEXT
   - `trading_name` TEXT
   - `min_acceptable_rate` NUMERIC(8,2)
   - `gov_rtw_checked` BOOLEAN DEFAULT false
   - `gov_rtw_checked_at` TIMESTAMPTZ
   Add to `operative_pay_rates`:
   - `contract_duration_weeks` INTEGER
2. **Change 1 — Operative profile top strip:** Display engagement method, agency name, trading name, UTR alongside name/status. Calculate and show green light date (13-week rule) from allocations.
3. **Change 2 — Pay & Bank section:** Promote bank details to a visible card on Overview tab. Add min_acceptable_rate to edit form. Show contract_duration_weeks in rate history.
4. **Change 3 (stub only):** Add "GOV.UK RTW Checked" checkbox + date on the operative profile. Manual process — staff ticks it after checking GOV.UK manually. Not an API integration.
5. **Change 1 — Create/edit operative form:** Add engagement method, agency name, trading name fields.

### Sprint 2: Labour Requests + Compliance (2 sessions)

**Session S35: Duration-Based Labour Requests + Finish Reminders**

1. **Migration 00022:** Add to `labour_requests`:
   - `duration_weeks` INTEGER
   - `finish_reminder_sent` BOOLEAN DEFAULT false
2. **Change 6 — Labour request form:** Replace end_date picker with duration_weeks number input. Auto-calculate and display end date (`start_date + duration_weeks * 7`). Keep end_date in DB (calculated on save).
3. **Change 6 — Finish reminder cron:** Extend existing hourly cron: check for requests where `end_date - 7 days <= today` and `finish_reminder_sent = false`. Create notification + send WhatsApp to Liam. Mark `finish_reminder_sent = true`.
4. **Change 12 — Missing timesheet alerts:** In the same cron: for each `status=active` allocation, if no timesheet exists for the current week by Wednesday, create a warning notification. If still missing by Friday, create a critical notification + WhatsApp Liam.

**Session S36: Extended Expiry Notifications**

1. **New HSM templates needed (Plex task — I'll create these):**
   - `aztec_doc_expiring` — "Hi {{1}}, your {{2}} expires on {{3}}. Please arrange a renewal so we can keep you on our active roster."
   - `aztec_staff_alert` — "Aztec BOS Alert: {{1}}" (for critical internal notifications forwarded to Liam's WhatsApp)
2. **Change 8 — Extend compliance cron:** Add 30/60/90 day warning tiers. For each tier, create internal notification. At 60-day and 30-day tiers, also send WhatsApp to operative IF they're currently working OR had an allocation end within 6 months.
3. **Goodwill reminder logic:** Separate sweep for all operatives with `compliance_alert IS NULL` but docs expiring within 90 days — send a friendly WhatsApp. Run monthly, not daily (to avoid spam). Track with a `last_goodwill_reminder` date on operatives.

### Sprint 3: Content Features (2 sessions)

**Session S37: CV Upload + Parsing + Work History**

1. **Migration 00023:**
   - `work_history` table (see Q2 above)
   - `cv_summary` TEXT on `operatives`
2. **CV upload flow:** Add "Upload CV" button on operative profile (BOS-side upload, not operative-facing — white-collar workers are added by staff). Upload to Supabase storage → create document record with `document_type = 'cv'`.
3. **CV parsing:** New Claude Vision/text prompt in re-extract route for `document_type === 'cv'`. Extract: job titles, employers, dates, description. Insert rows into `work_history`. Generate `cv_summary`.
4. **Work history UI:** New section on operative profile showing parsed work history (job title, employer, dates). Editable — staff can correct AI parsing.
5. **Pool search update:** Extend pool search query to also match `work_history.job_title ILIKE '%trade%'` in addition to `operatives.trade`.

**Session S38: Free-Form Adverts + AI Copy Generation**

1. **Change 10 — Free-form adverts:** Make `labour_request_id` nullable on adverts. Add a "Create Advert" button that doesn't require selecting a request. Add form fields: trade, location, rate range, description.
2. **AI copy generation:** "Generate with AI" button on advert form. Sends trade/location/rate/description to Claude → returns polished advert copy with:
   - Headline
   - Body text (for Facebook/LinkedIn)
   - Short version (for Instagram/Twitter)
   - Hashtags
3. **Copy to clipboard:** One-click copy buttons for each version so Liam/Donna can paste into social platforms.

---

## Deferred Items — Tracked for Future

| Item | Blocked On | When |
|------|-----------|------|
| GOV.UK RTW API integration | DBS/HMRC API credentials | After go-live — manual checkbox is fine for now |
| Reporting module | Design session with Donna | After Sprint 3 — needs proper requirements |
| RBAC (role-based access) | Needs complete design | After core features ship — affects every page |
| Donseed integration | Liam providing API details | When details arrive |
| RAP at profile top | Board decision | After Liam's board meeting |
| Auto-post adverts to social | Social platform API creds | Level 1 target — after Level 2 is proven |

---

## New HSM Templates Needed (Plex Will Create)

I'll create these in Twilio before Session S36:

| Template | Variables | Use |
|----------|-----------|-----|
| `aztec_doc_expiring` | `{{1}}` = first_name, `{{2}}` = doc_type, `{{3}}` = expiry_date | Operative doc expiry warning |
| `aztec_staff_alert` | `{{1}}` = alert_message | Critical alerts forwarded to Liam's WhatsApp |
| `aztec_missing_timesheet` | `{{1}}` = operative_name, `{{2}}` = site_name | Timesheet not submitted alert to Liam |

---

## Migration Summary

| Migration | Session | Contents |
|-----------|---------|----------|
| 00020 | S33 | `notifications` table |
| 00021 | S34 | `engagement_method`, `agency_name`, `trading_name`, `min_acceptable_rate`, `gov_rtw_checked`, `gov_rtw_checked_at` on operatives; `contract_duration_weeks` on `operative_pay_rates` |
| 00022 | S35 | `duration_weeks`, `finish_reminder_sent` on `labour_requests` |
| 00023 | S37 | `work_history` table; `cv_summary` on operatives |

---

## Total Estimate

| Sprint | Sessions | Changes Covered |
|--------|----------|----------------|
| Sprint 1 | S33–S34 (2 sessions) | Notifications infra, comms search, blast exclusion, engagement method, 13-week rule, pay/bank, GOV RTW stub |
| Sprint 2 | S35–S36 (2 sessions) | Duration labour requests, finish reminders, timesheet alerts, extended expiry notifications |
| Sprint 3 | S37–S38 (2 sessions) | CV upload/parsing, work history, free-form adverts, AI copy generation |

**6 sessions to address all 14 change requests** (9 built, 5 deferred with stubs/tracking).

---

*Plex — S32 — 2026-02-28*
*All architecture decisions made. Build sequence ready. Claude Code can start with S33.*
