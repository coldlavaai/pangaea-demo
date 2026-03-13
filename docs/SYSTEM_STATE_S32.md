# Aztec BOS — Full System State
**Generated:** 2026-02-28 (Session S32)
**Repo:** Aztec-Landscapes/aztec-bos
**Live:** https://aztec-landscapes-bos.vercel.app
**Stack:** Next.js 15.5.12 · Supabase (Frankfurt, `ybfhkcvrzbgzrayjskfp`) · Vercel · Twilio · Anthropic Claude · shadcn/ui · Tailwind

---

## What This System Is

Custom back-office system (BOS) for Aztec Landscapes, a UK groundworks/landscaping contractor. Manages the full operative lifecycle:

1. **WhatsApp intake** — Sophie AI (Claude-powered) collects operative info via WhatsApp
2. **Document upload** — Operative receives a unique link, uploads ID + CSCS card
3. **Claude Vision extraction** — Passport/licence and CSCS card data extracted automatically
4. **BOS review** — Staff verify docs, trigger WhatsApp notifications via Twilio HSM templates
5. **Compliance** — Daily cron auto-blocks operatives with expired documents
6. **Allocation** — Assign operatives to sites via labour requests + offer broadcast system
7. **Timesheets, NCRs, RAP** — Post-deployment workforce management

---

## Architecture — Locked Decisions

- **Next.js 15.5.12 App Router** — `params`/`searchParams` must be `await`-ed (they're Promises)
- **Server Components by default** — `'use client'` only where needed
- **`createServiceClient()`** — bypasses Supabase RLS; always filter by `organization_id`
- **`createClient()`** — user auth client, respects RLS
- **`allocation_status` enum** — `pending | confirmed | active | completed | terminated | no_show` — NO 'cancelled'
- **`operative_status` enum** — `prospect | qualifying | pending_docs | verified | available | working | unavailable | blocked`
- **`cscs_card_type` enum** — `green | blue | gold | black | red | white | null`
- **`performance_reviews.submitted_via`** — CHECK constraint: `'web'` or `'whatsapp'` only
- **FK joins MUST use explicit FK name** — `table!fk_name(cols)` — ambiguous joins cause silent 404s
- **`intake_data`** lives on `message_threads`, NOT on `operatives`
- **`cscs_card_type`** on `operatives` is source of truth for CSCS colour
- **Sophie state context** in system prompt (NOT injected as fake messages)
- **RAP: A = Attitude** (not Attendance)
- **Allocations** — created via `POST /api/allocations` only (runs `canAllocate()` check first)
- **Migrations** — Supabase SQL editor only (no CLI migrations)
- **Git email for Vercel deploy** — must be `otatler@gmail.com`
- **`CRON_SECRET`** — must be set with `printf` NOT `echo` (trailing newline breaks header auth)

---

## Module Status — Full Build

| Module | Route(s) | Status | Session |
|---|---|---|---|
| Auth / Login | `/login` | ✅ Live | S1 |
| Dashboard (stats overview) | `/dashboard` | ✅ Live | S1 |
| Operatives list | `/operatives` | ✅ Live + compliance filter chip | S1/S31 |
| Operative profile (6 tabs) | `/operatives/[id]` | ✅ Live + compliance badges + RTW | S1/S31 |
| Create/Edit operative | `/operatives/new` | ✅ Live | S1 |
| Sites | `/sites` | ✅ Live | S1 |
| Documents / Compliance dashboard | `/documents` | ✅ Live | S1 |
| Document detail | `/operatives/[id]/documents/[docId]` | ✅ Live + extracted AI data | S30/S31 |
| Verify document | `/api/documents/[docId]/verify` | ✅ + HSM template + auto-verify + RTW | S31 |
| Reject document | `/api/documents/[docId]/reject` | ✅ + HSM template | S31 |
| Re-extract document data | `/api/documents/[docId]/re-extract` | ✅ Claude Vision re-run | S31 |
| Labour Requests + pool search | `/requests` | ✅ Live | S1 |
| Allocations + offer flow | `/allocations` | ✅ Live | S1 |
| Shifts | `/shifts` | ✅ Live | S1 |
| Timesheets | `/timesheets` | ✅ Live | S1 |
| NCRs | `/ncrs` | ✅ Live | S1 |
| RAP scoring | Operative profile → RAP tab | ✅ Live (submit bug fixed S32) | S1/S32 |
| Adverts | `/adverts` | ✅ Live | S1 |
| Settings | `/settings` | ✅ Live | S1 |
| Comms log | `/comms`, `/comms/[id]` | ✅ Live + live status badge | S25/S30 |
| Sophie WhatsApp intake (7 questions) | Twilio webhook → `sophie-handler.ts` | ✅ Live | S25/S28 |
| Document upload page | `/apply/[token]` | ✅ Live | S25 |
| Claude Vision — ID extraction | `/api/apply/[token]/upload` | ✅ Full field extraction | S30 |
| Claude Vision — CSCS extraction | `/api/apply/[token]/upload-cscs` | ✅ Full field extraction | S29/S30 |
| Pay rate system | `src/lib/pay-rates.ts` + operative profile | ✅ Auto-estimate + confirm/adjust | S28 |
| URL shortener | `/r/[code]` + `short_links` table | ✅ Self-hosted | S28 |
| CSCS colour dots + nationality badges | Operative list/profile/docs | ✅ Throughout | S30 |
| Real-time auto-refresh | `src/components/realtime-refresh.tsx` | ✅ Supabase Realtime | S30 |
| WhatsApp HSM templates | `src/lib/whatsapp/templates.ts` | ✅ Wired (Meta review pending) | S31 |
| Auto-verify (qualifying→verified) | On photo_id verify | ✅ When all required docs verified | S31 |
| RTW auto-population | On photo_id verify + upload | ✅ Sets rtw_type, rtw_verified, rtw_expiry | S31 |
| Compliance cron (B2) | `/api/cron/compliance-check` | ✅ Daily midnight UTC | S31 |
| Compliance badges + filter | Operatives UI | ✅ Amber/red alerts + filter chip | S31 |

---

## API Routes

```
POST /api/allocations                        — Create allocation (runs canAllocate)
POST /api/apply/[token]/upload               — Upload ID + Claude Vision extraction
POST /api/apply/[token]/upload-cscs          — Upload CSCS + Claude Vision extraction
GET  /api/cron/compliance-check              — Daily cron (midnight UTC)
GET  /api/v1/cron/offer-expiry               — Hourly cron
POST /api/documents/[docId]/verify           — Verify doc + WhatsApp notify + auto-verify operative
POST /api/documents/[docId]/reject           — Reject doc + WhatsApp notify
POST /api/documents/[docId]/re-extract       — Re-run Claude Vision on stored file
DELETE /api/operatives/[id]                  — Delete operative
POST /api/webhooks/twilio                    — Twilio inbound WhatsApp webhook (Sophie)
```

---

## Database — Migrations Applied

| Migration | Description | Status |
|---|---|---|
| 00001–00006 | Core tables: orgs, users, operatives, sites, allocations, shifts, timesheets, NCRs, performance_reviews, labour_requests, adverts; RLS; cron functions | ✅ |
| 00007 | Auto-create user on signup trigger | ✅ |
| 00008 | Fix rtw_type constraint | ✅ |
| 00009 | Add missing operative fields | ✅ |
| 00010 | Add `operative_cards` table | ✅ |
| 00011 | Add gender, machine_operator, onboarding fields | ✅ |
| 00012 | WhatsApp helpers | ✅ |
| 00013 | Sophie intake (message_threads, messages) | ✅ |
| 00014 | Documents storage bucket | ✅ |
| 00015 | `document_upload_token` on operatives | ✅ |
| 00016 | `short_links` table | ✅ |
| 00017 | `operative_pay_rates` table + `rate_status` + `experience_years` on operatives | ✅ |
| 00018 | `id_document_number TEXT` + `id_expiry DATE` on operatives | ✅ |
| 00019 | `compliance_alert` (enum: expiring_soon/expired_document/null), `blocked_reason TEXT`, `blocked_at TIMESTAMPTZ` on operatives | ✅ |

### Key Tables
```
organizations           — single org (Aztec)
users                   — BOS staff
operatives              — workers (the main entity)
operative_pay_rates     — rate history per operative
operative_cards         — CPCS/IPAF/etc. cards
message_threads         — WhatsApp conversations (holds intake_data JSONB)
messages                — individual WhatsApp messages
documents               — uploaded docs (ID, CSCS, etc.) with expiry + status
short_links             — URL shortener for upload links
sites                   — work sites
labour_requests         — staffing requests from sites
allocations             — operative assigned to site/request
shifts                  — individual shift records
timesheets              — weekly timesheet submissions
non_conformance_incidents (NCRs)
performance_reviews     — RAP scores (A/P/R)
adverts                 — job postings
```

---

## Sophie WhatsApp Flow

### 7 Questions (state machine in `src/lib/whatsapp/sophie-handler.ts`)
```
start → awaiting_rtw → awaiting_age → awaiting_cscs → awaiting_trade →
awaiting_experience → awaiting_name → awaiting_email → docs_link_sent
```

### Fields collected (`intake_data` on `message_threads`)
- `rtw_confirmed` — bool
- `age_confirmed` — bool
- `cscs_card` — bool
- `cscs_colour` — string (green/blue/gold/etc.)
- `trade` — string
- `experience_years` — number
- `first_name`, `last_name` — string
- `email` — string

### On completion
- Operative created with `status=qualifying`
- Pay rate auto-estimated from grade/trade/experience
- Unique upload token generated
- Short link created (`/r/[code]`)
- Link sent to operative via WhatsApp

---

## Document Upload Flow

1. Operative opens `/apply/[token]`
2. Fills in address fields (saved to operative)
3. Uploads photo ID (passport/driving licence) — Claude Vision extracts: document number, DOB, nationality, expiry, doc type → saved to operative + document record
4. If CSCS expected (`cscs_card_type !== null`): uploads CSCS card — Claude Vision extracts: card number, colour, type (occupation), expiry → saved to operative + document record
5. WhatsApp summary sent to operative

---

## Verify/Reject Flow (BOS Staff Action)

**Verify:**
- Sets `documents.status = 'verified'`
- Sends WhatsApp template `DOC_VERIFIED` to operative
- If photo_id: sets `rtw_verified=true`, derives `rtw_type` from nationality, sets `rtw_expiry` (non-UK/Irish)
- Auto-verification check: if all required docs now verified → advances operative to `status=verified` + sends `WELCOME_VERIFIED` template

**Reject:**
- Sets `documents.status = 'rejected'`
- Sends WhatsApp template `DOC_REJECTED` with rejection reason

---

## WhatsApp Templates (Twilio HSM)

Stored in `src/lib/whatsapp/templates.ts`. All under Meta review (still pending approval for business-initiated).

| Template | Content SID | Use |
|---|---|---|
| DOC_VERIFIED | `HX0e9a46d61bd40a6bdd786fbc58a551aa` | Document approved |
| DOC_REJECTED | `HX66ad4bb368782948155678c0861ae81c` | Document rejected with reason |
| WELCOME_VERIFIED | `HXf24bcc230eb986bafaad05d2abed1b05` | Operative fully verified |
| JOB_OFFER | `HX27452fce2af3b45f570f943b7a012495` | Job offer broadcast (future) |

---

## Compliance Cron (`/api/cron/compliance-check`)

- Runs daily at midnight UTC (Vercel cron)
- Checks all `verified/available/working` operatives and their verified documents
- **Expired doc** → `status=blocked`, `compliance_alert=expired_document`, `blocked_reason` set, future allocations terminated
- **Expiring within 7 days** → `compliance_alert=expiring_soon` (warning only)
- **All clear** → clears stale `compliance_alert`/`blocked_reason`/`blocked_at`
- Also checks operative-level `rtw_expiry` and `cscs_expiry` fields

---

## Allocation Flow

1. Labour request created (site, trade, date range, operative count)
2. Pool search — operatives filtered by trade, compliance, availability
3. Allocation created via `POST /api/allocations` → `canAllocate()` check (6 steps including document expiry check)
4. Offer broadcast to top 3 operatives (30-min window, first YES wins via PG function `accept_allocation_offer()`)
5. Allocation confirmed → `status=working`

---

## Key File Locations

| Purpose | Path |
|---|---|
| Sophie intake state machine | `src/lib/whatsapp/sophie-handler.ts` |
| WhatsApp router | `src/lib/whatsapp/handler.ts` |
| WhatsApp send util | `src/lib/whatsapp/send.ts` |
| WhatsApp HSM templates | `src/lib/whatsapp/templates.ts` |
| Twilio webhook | `src/app/api/webhooks/twilio/route.ts` |
| Upload page (operative-facing) | `src/app/apply/[token]/page.tsx` |
| Upload form (client component) | `src/app/apply/[token]/upload-form.tsx` |
| Upload API (ID) | `src/app/api/apply/[token]/upload/route.ts` |
| Upload API (CSCS) | `src/app/api/apply/[token]/upload-cscs/route.ts` |
| Verify API | `src/app/api/documents/[docId]/verify/route.ts` |
| Reject API | `src/app/api/documents/[docId]/reject/route.ts` |
| Re-extract API | `src/app/api/documents/[docId]/re-extract/route.ts` |
| Compliance cron | `src/app/api/cron/compliance-check/route.ts` |
| Compliance canAllocate | `src/lib/compliance/can-allocate.ts` |
| Pay rate lookup | `src/lib/pay-rates.ts` |
| CSCS colour mapping | `src/lib/cscs-colours.ts` |
| Real-time refresh | `src/components/realtime-refresh.tsx` |
| Supabase server client | `src/lib/supabase/server.ts` |
| Document actions (client) | `src/components/documents/document-actions.tsx` |
| RAP add review (client) | `src/components/operatives/rap-add-review.tsx` |

---

## Environment Variables (Vercel)

```
NEXT_PUBLIC_APP_URL        = https://aztec-landscapes-bos.vercel.app
NEXT_PUBLIC_ORG_ID         = 00000000-0000-0000-0000-000000000001
ANTHROPIC_API_KEY          ✅
TWILIO_ACCOUNT_SID         ✅
TWILIO_AUTH_TOKEN          ✅
TWILIO_WHATSAPP_NUMBER     = whatsapp:+447414157366
LIAM_WHATSAPP_NUMBER       = +447742201349 (placeholder — Oliver's number)
CRON_SECRET                ✅ (set with printf, not echo)
SUPABASE_URL               ✅
SUPABASE_ANON_KEY          ✅
SUPABASE_SERVICE_ROLE_KEY  ✅
```

---

## Recent Changes — Last 5 Sessions

### S32 (2026-02-28) — `7f0bc7f`
- **Fix:** RAP review `submitted_via` constraint — was sending `'bos'`, constraint only allows `'web'|'whatsapp'`

### S31 (2026-02-27/28) — `ac9f5c9`, `ea6232a`, `4b2af6e`, `8a9f92e`
- **Re-extract feature:** `POST /api/documents/[docId]/re-extract` — re-runs Claude Vision on stored file; "Re-extract data" button on doc detail page (photo_id + cscs_card only)
- **RTW auto-population:** Verify route sets `rtw_verified=true`, derives `rtw_type` from nationality, sets `rtw_expiry` for non-UK/Irish; upload route derives `rtw_type` at upload time; UK/Irish citizens shown "No expiry" in profile
- **Compliance cron (B2):** Daily midnight cron, migration 00019, 7-day warning + hard block + allocation termination, `canAllocate()` step 6 checks doc expiry, UI badges + filter chip
- **CRON_SECRET fix:** Was set with `echo` (trailing newline broke header auth); reset with `printf`

### S30 (2026-02-27) — `54fc38e`, `59d35c4`, `5b8654d`, `0030570`, `3be578e`
- Real-time auto-refresh via Supabase Realtime (4 tables)
- Visual enrichment: CSCS colour dots, nationality badges throughout BOS
- Extracted document data on doc detail page ("Extracted by AI" section)
- Write `expiry_date` to documents table on upload
- Fix verify/reject FK join (explicit FK name required)
- Full ID extraction: document number, DOB, nationality, ID expiry

### S29 — `d8455e5`
- Fix CSCS not saving — early return fired before formData was parsed

### S28 — `c9f399b`, `6e1b27f`, `ed59ebc`
- Pay rate system: auto-estimate on intake, confirm/adjust UI, history table
- Sophie intake enriched: experience years + email questions
- Self-hosted URL shortener

---

## Known Issues / Open Items

| Issue | Severity | Notes |
|---|---|---|
| WhatsApp HSM templates pending Meta approval | Medium | Templates exist in Twilio; try/catch handles gracefully; no action required |
| `LIAM_WHATSAPP_NUMBER` is placeholder (Oliver's number) | Medium | Needs replacing with Liam's actual number when known |
| PROJECT_STATE.md + TODO.md stale (S25) | Low | SYSTEM_STATE_S32.md (this file) is the current truth |
| Sophie multi-language (RO/PL/BG) | Not started | Same state machine, translated prompts |

---

## Not Yet Built — Phase B/C Backlog

| Item | Phase | Priority |
|---|---|---|
| WTD (Working Time Directive) enforcement | B3 | High |
| Operative ranking / smart pool ordering | B4 | Medium |
| RBAC / role-based access (admin vs. viewer) | B5 | Medium |
| Audit log (who did what, when) | B6 | Low |
| Custom domain | C1 | Medium |
| Google Maps key (site addresses) | C2 | Low |
| Public induction page (`/induction/[id]`) | C3 | Low |
| Timesheet PDF export | — | Low |
| Site manager WhatsApp channel | — | Low |
| QA pass (BST timezone, mobile polish, race conditions) | — | Before go-live |

---

## DB Wipe SQL (Testing Only)
```sql
DELETE FROM messages;
DELETE FROM message_threads;
DELETE FROM documents;
DELETE FROM short_links;
DELETE FROM operative_pay_rates;
DELETE FROM operatives;
```
