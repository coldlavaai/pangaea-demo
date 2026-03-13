# AZTEC BOS — Testing Session Notes
## ⚠️ This is AZTEC BOS (Aztec Landscapes client project) — NOT Solar BOS

## Session Status
**Latest commit:** `999f3a6` — settings page (S18-S20 complete this session)
**Deployed:** https://aztec-landscapes-bos.vercel.app
**Migration 00011 status:** ✅ APPLIED

---

## JJ Testing Access
- **Production:** https://aztec-landscapes-bos.vercel.app
- **Login:** oliver@coldlava.ai / AztecTest2026!
- **Supabase project:** ybfhkcvrzbgzrayjskfp (Frankfurt)
- **Test operative:** Oliver Tatler — ID: ad157ce8-1313-4a78-81c0-9344cd04c8b1 (AZT-0001)

---

## Migration 00011 — APPLY THIS IN SUPABASE SQL EDITOR

```sql
ALTER TABLE public.operatives
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS machine_operator BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_blue_sticker_issued BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_buddy_allocated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_two_week_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_induction_complete BOOLEAN DEFAULT FALSE;

ALTER TABLE public.operatives
  ADD CONSTRAINT operatives_gender_check CHECK (
    gender IS NULL OR gender IN ('male', 'female', 'prefer_not_to_say')
  );
```

---

## Sessions Completed This Session (S18–S20)

### S18 — Gender + Machine Operator + Onboarding Checklist
From Giant new starter form + New Starter Checklist (Rev 2) + Company Induction:
- **Gender field** — dropdown (Male/Female/Prefer not to say) on operative form (Identity section) + profile
- **Machine operator flag** — toggle on form (Work section) + profile ("Qualified for Digger/Telehandler/Dumper")
- **Onboarding checklist** — 4 toggleable checkboxes on operative profile (Overview tab):
  - Blue Sticker Issued (provisional ID — removed when CSCS card arrives)
  - Buddy Allocated
  - 2-Week Review Done
  - Induction Complete
- Saves to DB immediately on click, no page reload needed
- Migration 00011 (needs applying)

### S19 — Adverts Page (`/adverts`)
- `/adverts` — list with stats (active count, impressions, clicks, applications), template sidebar
- `/adverts/[id]` — detail with metrics, CTR %, conversion rate, status machine
- `/adverts/new` — create advert (link to open labour request) or template (mode=template param)
- AdvertActions: Go Live / Pause / Resume / End + edit URL/budget inline
- AdvertForm: platform select, link to labour request, optional template apply
- DB tables already existed from migration 00004

### S20 — Settings Page (`/settings`)
- 3 tabs: Organisation / Trade Categories / Users
- **Organisation tab:** org name, Liam's WhatsApp number, offer window (mins), broadcast count, reallocation radius — stored in `organizations.settings` JSON
- **Trade Categories tab:** full CRUD — add/edit/enable/disable/typical day rate + one-click "Seed Aztec Trades" button (15 standard trades)
- **Users tab:** list users, inline role change (director/labour_manager/admin), enable/disable

---

## Questions for Martin — Still Open

### Q2 — Elite as Agency ⚠️ PARTIALLY ANSWERED
- Elite IS an agency (confirmed). Rate model still TBC:
  - Do operatives via Elite get paid differently?
  - Or just Aztec's margin differs?

### Q3 — Bank Details Visibility
- Who can unmask sort code / account number / UTR?

### Q5 — Start Date Meaning
- First day ever worked for Aztec? Or date added to DB?

### Q7 — Trade Categories (NEW)
- Martin needs to provide the full list of Aztec trade categories
- Settings > Trade Categories > Seed Aztec Trades will pre-fill 15 standard ones
- He should review and edit/add as needed

---

## Full Session Plan vs. Reality

| Plan Session | Deliverable | Status |
|---|---|---|
| S1–S14 | Foundation through Timesheets | ✅ Built |
| S15 | NCRs | ✅ Built |
| S16 | RAP DB + API | ✅ Built |
| S17 | RAP web UI + cards + agency + CSV UTR | ✅ Built |
| S18 | Gender + machine op + onboarding checklist | ✅ Built (this session) |
| S19 | Adverts page | ✅ Built (this session) |
| S20 | Settings page | ✅ Built (this session) |
| S21 | WhatsApp webhook handler | ❌ Not built |
| S22 | Sophie intake (English) | ❌ Not built |
| S23 | Sophie multi-language | ❌ Not built |
| S24 | Site manager WhatsApp channel | ❌ Not built |
| S25 | Site manager RAP via WhatsApp | ❌ Not built |
| S26 | Compliance cron | ❌ Not built |
| S27 | Comms log (WhatsApp conversation view) | ❌ Not built |
| S28 | Timesheet PDF export | ❌ Not built |
| S29 | Public induction page + Whisper | ❌ Not built |
| S30 | QA pass | ❌ Not built |

---

## Sidebar Links — Status
| Route | Status |
|---|---|
| /dashboard | ✅ |
| /operatives | ✅ |
| /sites | ✅ |
| /requests | ✅ |
| /allocations | ✅ |
| /shifts | ✅ |
| /timesheets | ✅ |
| /documents | ✅ |
| /ncrs | ✅ |
| /comms | ❌ 404 (WhatsApp log — no page) |
| /adverts | ✅ Built this session |
| /settings | ✅ Built this session |

---

## What to Build Next

### Priority 1 — Client Document Alignment (DONE)
- ✅ Gender field
- ✅ Machine operator flag
- ✅ Onboarding checklist
- ✅ Additional card schemes (S17)
- ✅ Agency/Source select (S17)

### Priority 2 — Unblocked (build now)
1. **Settings enhancement** — Oliver requested "enterprise level" redesign with real-time updates. Currently uses router.refresh() — consider optimistic updates + Supabase Realtime. This needs a proper redesign pass.
2. **Trade categories seed** — needs Martin to confirm the actual Aztec trades (Settings > Trade Categories > Seed Aztec Trades has 15 pre-loaded options)
3. **Comms log** (`/comms`) — currently 404, WhatsApp conversation log from `messages` + `message_threads` tables
4. **Compliance dashboard extension** — extend to track `operative_cards` expiry dates (CPCS, PAL/IPAF etc.) alongside document expirations
5. **Timesheet list filter** — add filter by operative on `/timesheets`

### Priority 3 — Requires Twilio/AI + Client Input
6. **Sophie WhatsApp intake** (S22) — English intake flow for new operatives
7. **Site manager WhatsApp channel** (S24) — full state machine via WhatsApp
8. **Compliance cron** (S26) — auto-block on expired docs
9. **Timesheet PDF export** (S28)
10. **Public induction page** (S29) + Whisper voice transcription

### Pending Martin's Answers
- **Elite rate model** (Q2)
- **Bank details visibility** (Q3)
- **Trade category list** (Q7)

---

## Module Status — Complete List

| Module | Route | Status |
|---|---|---|
| Login | `/login` | ✅ |
| Dashboard | `/dashboard` | ✅ |
| Operatives list | `/operatives` | ✅ |
| Operative profile (6 tabs) | `/operatives/[id]` | ✅ |
| Create/Edit operative | `/operatives/new` + edit | ✅ |
| Sites | `/sites` | ✅ |
| Document upload + verify/reject | `/documents` | ✅ |
| Compliance dashboard | `/documents` | ✅ |
| Labour requests | `/requests` | ✅ |
| Labour pool search | `/requests/[id]/search` | ✅ |
| Allocations | `/allocations` | ✅ |
| WhatsApp offer | Allocation detail | ✅ (Twilio placeholder) |
| Shifts + Timesheets | `/shifts`, `/timesheets` | ✅ |
| NCRs | `/ncrs` | ✅ S15 |
| RAP scoring | Operative → RAP tab | ✅ S16/17 |
| Additional card schemes | Operative → Overview | ✅ S17 |
| Gender + machine op + onboarding | Operative form + profile | ✅ S18 |
| Adverts | `/adverts` | ✅ S19 |
| Settings | `/settings` | ✅ S20 |
| Comms log | `/comms` | ❌ 404 |

---

## Known Non-Issues (Expected)
- Twilio = AC_PLACEHOLDER → WhatsApp offer returns 503 (by design)
- Google Maps = PLACEHOLDER → labour pool shows "—" for distance
- NCR auto-block triggers at 3+ NCRs (by design)
- Shifts/Timesheets empty — only created when allocations go active

---

## Git Commits (This Session)
- `f1b95cc` — S18: gender, machine operator, onboarding checklist
- `85baaf6` — S19: adverts page
- `999f3a6` — S20: settings page

## Git Commits (Previous Sessions)
- `6309e12` — S17: cards, agency select, RAP fix, CSV payroll
- `0282ace` — JJ_HANDOFF.md rewrite
- `2a94975` — Migration 00009 + new operative fields
- `5f92dcb` — S16 RAP scoring
- `e43138e` — S15 NCRs
