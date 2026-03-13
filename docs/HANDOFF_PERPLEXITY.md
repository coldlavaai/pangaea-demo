# Aztec BOS — Technical Handoff Document
**Date:** 2026-02-26
**Prepared by:** Cold Lava (Oliver Tatler) + Claude Code
**For:** Expert technical review / continuation

---

## 1. What Is This?

**Aztec BOS** (Business Operating System) is a custom-built, full-stack CRM for **Aztec Landscapes Limited** — a UK groundworks and landscaping contractor based in the North West of England.

It replaces a fragmented mix of spreadsheets and WhatsApp group messages. The system manages the full lifecycle of construction workers (called "operatives") — from initial registration via WhatsApp, through compliance checking, site allocation, shift recording, timesheets, and performance scoring.

**Client:** Aztec Landscapes (Martin = director, Liam = Labour Manager — primary day-to-day user)
**Built by:** Cold Lava (Oliver Tatler, AI automation consultancy)
**Status:** Active development — all core modules complete, WhatsApp intake flow in final testing

---

## 2. Access & Credentials

| Thing | Value |
|---|---|
| **Live URL** | https://aztec-landscapes-bos.vercel.app |
| **Login** | oliver@coldlava.ai / AztecTest2026! |
| **GitHub repo** | https://github.com/Aztec-Landscapes/aztec-bos |
| **Supabase project** | `ybfhkcvrzbgzrayjskfp` (Frankfurt region) |
| **Org ID** | `00000000-0000-0000-0000-000000000001` |
| **Twilio WhatsApp number** | `+447414157366` (Aztec Landscapes existing WA Business number) |
| **Vercel project** | `olivers-projects-a3cbd2e0/aztec-bos` |

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 15.5.12** (App Router) |
| Database | **Supabase** (PostgreSQL + Auth + Storage + Realtime) |
| Styling | **Tailwind CSS** + **shadcn/ui** components |
| Language | **TypeScript** (strict mode) |
| Hosting | **Vercel** (Pro plan) |
| WhatsApp | **Twilio** (WhatsApp Business API) |
| AI | **Anthropic Claude API** (claude-sonnet-4-6 — Sophie intake + Vision document verify) |
| Forms | **React Hook Form** + **Zod** validation |
| Toasts | **Sonner** |

**Critical version note:** Do NOT upgrade to Next.js 16. In v15, `params` and `searchParams` in page/route components are **Promises** and must be `await`-ed.

---

## 4. Repository Structure

```
aztec-bos/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── auth/callback/        # Supabase auth callback
│   │   │   └── login/                # Login page (dark theme, RHF+Zod)
│   │   ├── (dashboard)/              # All dashboard routes (auth-gated via layout)
│   │   │   ├── dashboard/
│   │   │   ├── operatives/
│   │   │   │   ├── page.tsx          # List: search, filters, pagination
│   │   │   │   ├── new/              # Create operative form
│   │   │   │   └── [id]/             # Profile (6 tabs) + edit + documents
│   │   │   ├── sites/
│   │   │   ├── requests/             # Labour requests + pool search
│   │   │   ├── allocations/          # Allocations + offer flow
│   │   │   ├── shifts/
│   │   │   ├── timesheets/
│   │   │   ├── documents/            # Compliance dashboard
│   │   │   ├── ncrs/                 # Non-conformance reports
│   │   │   ├── adverts/              # Job advertising
│   │   │   ├── settings/             # Org settings, trade categories, users
│   │   │   └── comms/                # WhatsApp conversation log
│   │   ├── apply/[token]/            # PUBLIC: operative document upload page
│   │   │   ├── page.tsx              # Server component: validates token, renders form
│   │   │   └── upload-form.tsx       # Client component: address + ID + CSCS upload
│   │   └── api/
│   │       ├── webhooks/twilio/      # Twilio WhatsApp webhook (inbound messages)
│   │       ├── allocations/[id]/
│   │       │   └── send-offer/       # POST: send WhatsApp offer to operative
│   │       ├── apply/[token]/
│   │       │   ├── upload/           # POST: ID document upload + Vision verify
│   │       │   └── upload-cscs/      # POST: CSCS card upload + Vision verify (separate)
│   │       ├── operatives/[id]/
│   │       └── cron/                 # Scheduled jobs (compliance + offer expiry)
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives
│   │   └── [feature]/                # Feature-specific components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts             # createServiceClient() + createClient()
│   │   │   └── client.ts             # Browser client
│   │   ├── whatsapp/
│   │   │   ├── handler.ts            # Inbound message router
│   │   │   ├── sophie-handler.ts     # Sophie AI intake state machine
│   │   │   ├── offer-handler.ts      # YES/NO offer reply handler
│   │   │   └── send.ts               # sendWhatsApp() REST helper
│   │   └── utils/
│   │       └── can-allocate.ts       # Compliance gate (RTW, CSCS expiry, 11h rest)
│   ├── hooks/
│   └── types/
│       └── database.ts               # Generated Supabase types (manually maintained)
├── supabase/
│   └── migrations/                   # SQL migration files (00001–00015, all applied)
├── docs/
│   ├── PROJECT_STATE.md              # Current build status (read this first)
│   ├── TODO.md                       # Prioritised task queue
│   ├── BUGS.md                       # Known issues + fix status
│   ├── CHANGELOG.md                  # Append-only change log
│   ├── DECISIONS.md                  # Locked architectural decisions
│   ├── SESSION_PLAN.md               # 29-session build plan (canonical)
│   ├── TESTING_SESSION_NOTES.md      # QA notes + module status
│   ├── sessions/                     # Per-session build notes (S1–S24)
│   │   ├── INDEX.md                  # Session index with standing decisions
│   │   ├── S01-S07-foundation.md
│   │   ├── S08-S14-core.md
│   │   ├── S15-S17-ncr-rap.md
│   │   ├── S18-S20-fields-adverts-settings.md
│   │   ├── S20b-enterprise-settings.md
│   │   ├── S21-compliance-comms.md
│   │   ├── S22-whatsapp-webhook.md
│   │   └── S23-sophie-intake.md
│   └── client/                       # Original client documents (do not modify)
│       ├── README.md                 # KEY: field requirements extracted from client docs
│       ├── RAP_Scoring_System.docx   # R/A/P scoring definitions
│       ├── New_Starter_Form_Giant.xlsx  # Giant agency payroll form fields
│       ├── New_Starter_Checklist.pdf   # Site manager onboarding checklist
│       └── Company_Induction_Form.pdf  # Full company induction (8 sections)
├── CLAUDE.md                         # AI assistant instructions for this project
├── vercel.json                       # Cron jobs + function maxDuration config
└── next.config.ts
```

---

## 5. Database Schema — Key Tables

All migrations live in `supabase/migrations/`. Applied via Supabase SQL editor (not CLI). All 15 migrations are applied.

### Core Tables

**`organizations`** — Single row for Aztec Landscapes
- `id` (UUID, fixed: `00000000-0000-0000-0000-000000000001`)
- `name`, `settings` (JSONB — stores Liam's WhatsApp number, offer window mins, broadcast count, reallocation radius)

**`operatives`** — The central entity
- `id`, `organization_id`, `reference` (auto-generated: AZT-0001)
- `first_name`, `last_name`, `phone`, `email`, `date_of_birth`
- `address_line1`, `address_line2`, `city`, `postcode`, `latitude`, `longitude`
- `status` (enum): `prospect | qualifying | pending_docs | verified | available | working | unavailable | blocked`
- `source`: `Direct | Giant | Hays | Reed | [other agency]`
- `trade_category_id` (FK → trade_categories)
- `cscs_card_type` (enum): `green | blue | gold | black | red | white | null`
- `cscs_card_number`, `cscs_expiry`, `cscs_card_title`
- `rtw_verified` (boolean, set manually by Liam)
- `avg_rap_score` (float, auto-updated via trigger)
- `ni_number`, `bank_sort_code`, `bank_account_number`, `utr_number` (sensitive, shown masked)
- `gender`: `male | female | prefer_not_to_say`
- `machine_operator` (boolean)
- `onboarding_blue_sticker_issued`, `onboarding_buddy_allocated`, `onboarding_two_week_review`, `onboarding_induction_complete` (booleans)
- `document_upload_token`, `document_upload_token_expires_at` — secure upload link (24hr expiry)
- `notes`, `reemploy_status`: `active | caution | do_not_rehire`

**`message_threads`** — One per phone number
- `phone_number`, `organization_id`
- `operative_id` (FK → operatives, null until linked)
- `intake_state` (TEXT) — Sophie conversation state
- `intake_data` (JSONB) — data collected during Sophie intake
- `last_message`, `last_message_at`, `unread_count`

**`messages`** — All WhatsApp messages
- `thread_id`, `operative_id`, `organization_id`
- `direction`: `inbound | outbound`
- `channel`: `whatsapp`
- `body`, `media_url`, `media_type`
- `external_id` (UNIQUE — Twilio MessageSid, prevents duplicate processing)
- `status`: `received | sent | delivered | failed`

**`sites`**
- `name`, `address`, `latitude`, `longitude`, `client_name`, `project_ref`
- `status`: `active | completed | on_hold`
- Site managers: linked via `site_managers` join table → `users`

**`labour_requests`**
- `site_id`, `trade_category_id`, `required_count`, `start_date`
- `status`: `pending | searching | partial | fulfilled | cancelled`
- No `title` field — displayed as `{site} — {trade} (date, ×N)`

**`allocations`**
- `labour_request_id`, `operative_id`, `site_id`, `organization_id`
- `status` (enum): `pending | confirmed | active | completed | terminated | no_show` — **NO 'cancelled'**
- `offer_sent_at`, `offer_expires_at`, `offer_responded_at`
- Created ONLY via `POST /api/allocations` (runs `canAllocate()` check — RTW, CSCS expiry, 11h rest gap)

**`documents`**
- `operative_id`, `document_type` (12 types: `right_to_work | cscs_card | photo_id | cpcs_ticket | ...`)
- `file_url` (Supabase Storage public URL), `file_name`
- `status`: `pending | verified | rejected | expired`
- `expiry_date`, `notes`, `verified_by`

**`non_conformance_incidents`** (NCRs)
- `operative_id`, `site_id`, `ncr_type`: `no_show | walk_off | late_arrival | quality_issue | safety_violation | misconduct | other`
- `severity`: `minor | moderate | severe | critical`
- `auto_blocked` — set true when 3+ NCRs trigger auto-block of operative

**`performance_reviews`** (RAP scoring)
- `operative_id`, `allocation_id`
- `reliability` (1–5), `attitude` (1–5), `performance` (1–5)
- `avg_rap_score` computed, triggers update on `operatives.avg_rap_score`
- Traffic lights: Green ≥ 4.0 | Amber 3.0–3.9 | Red < 3.0

**`trade_categories`**
- `organization_id`, `name`, `typical_day_rate`, `is_active`
- 15 standard trades pre-seeded via Settings page

**`shifts`** + **`timesheets`**
- Shifts created from confirmed allocations
- Timesheets aggregate shifts for a period, go through `draft → submitted → approved → rejected → locked`
- CSV export available

**`adverts`**
- Linked to `labour_requests`
- `platform`, `url`, `budget`, `status`: `draft | active | paused | ended`
- Impressions/clicks/applications metrics

**Storage bucket:** `operative-documents` (private) — `{org_id}/{operative_id}/{timestamp}-{label}.jpg`

---

## 6. The Sophie WhatsApp Intake Flow — CURRENT FOCUS

This is the most complex feature and was in active debugging as of 2026-02-26. The end-to-end test was nearly passing but the upload step had a 413 error (now fixed — see below).

### How It Works End-to-End

```
1. Unknown number sends any WhatsApp to +447414157366
2. Twilio POSTs to https://aztec-landscapes-bos.vercel.app/api/webhooks/twilio
3. handler.ts: upserts message_thread, stores inbound message, routes to Sophie
4. sophie-handler.ts: calls Claude API with state + history → returns JSON {reply, next_state, extracted}
5. State advances: start → awaiting_rtw → awaiting_age → awaiting_cscs → awaiting_trade → awaiting_name → docs_link_sent
6. On "awaiting_name": operative record created in DB (status: pending_docs)
7. Secure upload token generated: `${Date.now()}-${random8chars}`
8. URL shortener: is.gd API → https://is.gd/xxxxxx (~22 chars, fits on one WhatsApp line)
9. Operative gets WhatsApp: "Thanks [name]! Here's your document upload link: https://is.gd/xxxxxx"
10. Operative opens link → /apply/[token] page
11. Form: address (line1, city, postcode required) + ID photo + CSCS photo (if cscs_card_type set)
12. Client-side: images compressed to max 1600px JPEG before upload
13. POST /api/apply/[token]/upload: address + ID → Vision verify (Claude) → Supabase Storage → updates operative
14. POST /api/apply/[token]/upload-cscs: CSCS → Vision verify (Claude) → Storage → updates operative
15. Operative status → 'qualifying', token cleared
16. Confirmation WhatsApp to operative
17. Liam notified via WhatsApp with name, docs uploaded, any flags, link to BOS operative profile
```

### Sophie State Machine

| State | What Sophie Does |
|---|---|
| `start` | Greeting, asks if looking for work |
| `awaiting_rtw` | Asks about right to work in UK |
| `awaiting_age` | Asks if 18+ (SKIPS if age already stated in RTW answer) |
| `awaiting_cscs` | Asks about CSCS card + colour |
| `awaiting_trade` | Asks for trade/skill |
| `awaiting_name` | Asks for full name → triggers operative creation + link send |
| `docs_link_sent` | Terminal: just reminds them about the link |
| `qualified` | Terminal: "Liam will be in touch" |
| `rejected` | Terminal: failed RTW or age gate |

**Unknown/stale states auto-reset to `start`.**

### Key Files for Sophie

| File | Role |
|---|---|
| `src/lib/whatsapp/sophie-handler.ts` | Core logic: Claude API call, state transitions, operative creation, URL shortening |
| `src/lib/whatsapp/handler.ts` | Inbound router: determines which handler to call |
| `src/app/api/webhooks/twilio/route.ts` | Twilio webhook: sig validation (currently DISABLED for testing), TwiML response |
| `src/app/apply/[token]/page.tsx` | Server component: validates token, reads `operative.cscs_card_type` for conditional CSCS section |
| `src/app/apply/[token]/upload-form.tsx` | Client component: compression + sequential ID/CSCS upload |
| `src/app/api/apply/[token]/upload/route.ts` | ID doc: Vision verify + extract + Storage + update operative + send confirmations |
| `src/app/api/apply/[token]/upload-cscs/route.ts` | CSCS card: Vision verify + extract + Storage (separate request to avoid 413) |

### Claude API Integration Details

**Sophie conversation:**
```typescript
model: 'claude-sonnet-4-6'
max_tokens: 512
system: `${SOPHIE_SYSTEM_PROMPT}\n---\nCURRENT INTAKE STATE: ${state}\nDATA COLLECTED SO FAR: ${JSON.stringify(intakeData)}\n---\nYou MUST respond with raw JSON only.`
messages: last 9 messages from DB (alternating user/assistant, starting with user)
```

**Vision verify (ID document):**
```typescript
model: 'claude-sonnet-4-6'
max_tokens: 512
// Image base64 + text prompt → JSON: { valid, feedback, doc_type, first_name, last_name, date_of_birth, expiry_date, nationality, name_matches }
```

**Vision verify (CSCS card):**
```typescript
// → JSON: { valid, feedback, card_colour, card_number, expiry_date, card_type, colour_matches }
```

### Critical Architecture Notes for Sophie

1. **State context in system prompt, never as fake messages.** Early versions injected `[user: context, assistant: Understood]` pairs — this caused consecutive same-role violations when the history window happened to start on an assistant message.

2. **Dedup on history append.** Inbound message is saved to DB BEFORE Sophie is called. DB fetch of recent messages may already include it. Check: `if (lastMsg.role === 'user' && lastMsg.content === messageBody)` then don't append again.

3. **`intake_data` is on `message_threads`, NOT on `operatives`.** The operatives table has properly typed columns (`cscs_card_type`, `first_name`, etc.). Never read `operative.intake_data`.

4. **Upload split into 2 requests.** ID (3.4MB) + CSCS (2.2MB) = 5.6MB > Vercel's 4.5MB limit. ID with address goes to `/upload`, CSCS goes to `/upload-cscs` separately. Client-side compression (canvas → JPEG 85%, max 1600px) also applied.

5. **URL shortener:** is.gd API (`https://is.gd/create.php?format=simple&url=...`). TinyURL was tried first — unreachable from Vercel production. Falls back to full URL if is.gd fails.

6. **`hasCSCS` on upload page** reads `operative.cscs_card_type` (not null → show CSCS section). Set by Sophie during intake.

---

## 7. Key Architectural Decisions (Locked)

These were explicitly decided and should not be revisited without flagging to Oliver:

| Decision | Detail |
|---|---|
| **Offer model** | Simultaneous broadcast to top 3, 30-min window, first YES wins via `accept_allocation_offer()` atomic PG function. Sequential cascade was rejected. |
| **RAP: R/A/P** | R = Reliability, A = Attitude, P = Performance (NOT Attendance for A). Confirmed from client's RAP_Scoring_System.docx |
| **Allocation creation** | Only via `POST /api/allocations`. Runs `canAllocate()` compliance gate (RTW verified, CSCS not expired, 11h rest gap). Never direct Supabase insert. |
| **Site managers** | WhatsApp only in v1. No web login. |
| **Payroll** | Manual CSV export only. Xero = Phase 2. |
| **Supabase migrations** | SQL editor only. No `supabase db execute`. |
| **`allocation_status` enum** | `pending \| confirmed \| active \| completed \| terminated \| no_show`. NO 'cancelled'. NO 'expired'. |
| **`operative_status` enum** | `prospect \| qualifying \| pending_docs \| verified \| available \| working \| unavailable \| blocked` |
| **Service client** | `createServiceClient()` bypasses RLS. Always add `.eq('organization_id', orgId)` explicitly. |
| **FK join syntax** | Must use explicit FK name: `operatives!allocations_operative_id_fkey` |
| **Next.js 15** | `params` and `searchParams` are Promises — must `await` them in page components |
| **Twilio response** | Always return HTTP 200 to Twilio (even on errors) — non-200 triggers retry storm |
| **Git for Vercel deploy** | Commits must be from `otatler@gmail.com` — other authors don't trigger auto-deploy |

---

## 8. Environment Variables

All set in Vercel. Local dev uses `.env.local`.

| Variable | Value / Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ybfhkcvrzbgzrayjskfp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `NEXT_PUBLIC_ORG_ID` | `00000000-0000-0000-0000-000000000001` |
| `NEXT_PUBLIC_APP_URL` | `https://aztec-landscapes-bos.vercel.app` (trim() applied in code) |
| `ANTHROPIC_API_KEY` | Claude API key |
| `TWILIO_ACCOUNT_SID` | Aztec Twilio account |
| `TWILIO_AUTH_TOKEN` | `[REDACTED — see Vercel env vars]` |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+447414157366` |
| `TWILIO_WEBHOOK_URL` | `https://aztec-landscapes-bos.vercel.app/api/webhooks/twilio` |
| `LIAM_WHATSAPP_NUMBER` | `+447742201349` (Oliver's number — placeholder for Liam's real number) |
| `CRON_SECRET` | Used by Vercel cron jobs (`Authorization: Bearer ${CRON_SECRET}`) |
| `GOOGLE_MAPS_API_KEY` | For labour pool distance ranking (currently placeholder) |

---

## 9. Current Build Status

### All Completed Modules

| Module | Route | Notes |
|---|---|---|
| Login | `/login` | Supabase email auth, dark theme |
| Dashboard | `/dashboard` | Stats overview |
| Operatives list | `/operatives` | Search, filters, pagination, AZT-XXXX reference |
| Operative profile | `/operatives/[id]` | 6 tabs: Overview, Documents, Allocations, RAP, NCRs, Comms |
| Create/Edit operative | `/operatives/new` + `/edit` | 30 fields, postcode geocoding |
| Sites | `/sites` | List, create, detail, site managers |
| Document compliance | `/documents` | Expiry alerts by urgency (RTW/CSCS thresholds) |
| Labour requests | `/requests` | Create, list, detail, edit, status actions |
| Labour pool search | `/requests/[id]/search` | Haversine ranking (RAP × availability × distance) |
| Allocations | `/allocations` | List, detail, status machine, compliance gate |
| WhatsApp offer | Allocation detail | Send offer → operative accepts/declines via WhatsApp |
| Shifts | `/shifts` | Created from confirmed allocations |
| Timesheets | `/timesheets` | Approval workflow, CSV export |
| NCRs | `/ncrs` | List, create, auto-block at 3+ NCRs |
| RAP scoring | Operative RAP tab | R/A/P 1–5, linked to allocation |
| Adverts | `/adverts` | Template + live adverts, metrics |
| Settings | `/settings` | Org settings, trade categories (CRUD), users |
| Comms log | `/comms` + `/comms/[id]` | WhatsApp conversation view with intake state badge |
| Sophie intake | Twilio webhook | 7-step AI-guided registration flow |
| Document upload page | `/apply/[token]` | Public page: address + ID + CSCS |
| Vision verify | Upload API | Claude Vision verifies + extracts data from documents |

### What's NOT Built Yet

| Item | Priority |
|---|---|
| Sophie multi-language (Romanian, Polish, Bulgarian) | Medium |
| Site manager WhatsApp channel | Low |
| Compliance cron (auto-block on expired docs) | Low |
| Timesheet PDF export | Low |
| Public induction page + Whisper transcription | Low |
| Re-enable Twilio signature validation | Before go-live |
| QA pass | After above |

---

## 10. Active Issues & Recent Fixes

### Recent Fixes (Session S25, 2026-02-25/26)

1. **Sophie fallback message fixed** — `callClaude()` was injecting `[user:context, assistant:Understood]` priming messages. When 9-message history window started on an assistant message → two consecutive assistant messages → Claude returned non-JSON. Fixed: state context moved to system prompt. Leading assistant messages stripped from history array.

2. **Duplicate message in history fixed** — Inbound message saved to DB before Sophie called → DB fetch included it → appended again → two consecutive user messages. Fixed: dedup check before appending.

3. **CSCS upload slot fixed** — Upload page was reading `operative.intake_data.cscs_card` (doesn't exist on operatives table). Fixed: reads `operative.cscs_card_type`.

4. **Upload URL fixed** — `NEXT_PUBLIC_APP_URL` had trailing `\n` → URL split across two lines in WhatsApp. Fixed: `.trim()` + is.gd shortener.

5. **TypeScript build broken for 2+ hours** — `intake_state` added to DB via migration but never added to `src/types/database.ts`. Comms page queried `intake_state` → `SelectQueryError` type → all builds failed. Fixed: added `intake_state` + `intake_data` to `message_threads` Row/Insert/Update types.

6. **413 on upload** — ID (3.4MB) + CSCS (2.2MB) = 5.6MB > Vercel 4.5MB limit. Fixed: client-side canvas compression (max 1600px, JPEG 85%) + split into two sequential API requests.

### Still Needs Testing

- **Full E2E**: DB wipe → Sophie flow → is.gd link → upload form (3 sections) → submit ID + CSCS → verify operative in BOS with `qualifying` status + 2 documents attached + Liam notified
- **is.gd shortener**: Not yet confirmed working from Vercel production
- **Liam WhatsApp notification** after upload: `sendWhatsApp()` to `LIAM_WHATSAPP_NUMBER`

---

## 11. The `canAllocate()` Compliance Gate

`src/lib/utils/can-allocate.ts` — called before every allocation creation.

Checks:
1. `operative.rtw_verified === true`
2. No CSCS expiry in the past (if they have a card)
3. No allocation ending within 11 hours of the new one (assumes 07:00 start — allocations store dates not times)

Returns `{ allowed: boolean, reason?: string }`. If not allowed, `POST /api/allocations` returns 422 with the reason displayed to the user.

---

## 12. Supabase Client Patterns

```typescript
// Server components, Route Handlers, Server Actions:
import { createServiceClient } from '@/lib/supabase/server'
const supabase = createServiceClient() // bypasses RLS — always add .eq('organization_id', orgId)

// Client components:
import { createClient } from '@/lib/supabase/client'
const supabase = createClient() // uses anon key, respects RLS
```

**Critical:** Service client bypasses Row Level Security. Every query using it MUST include `.eq('organization_id', orgId)` to scope to Aztec's data.

---

## 13. Component Conventions

- `PageHeader` props: `title`, `description`, `action?: React.ReactNode` (no `children`, no `backHref`)
- `StatsCard` props: `title` (not `label`)
- `EmptyState` props: `action?: React.ReactNode` (pass JSX)
- FK joins: `operatives!allocations_operative_id_fkey` (explicit FK name required by Supabase)
- Zod: `z.enum([...] as const)` not `z.ZodType<EnumType>`. `z.boolean()` not `z.boolean().default()` with zodResolver.
- Numeric form fields: `z.string().optional()` + manual parse in submit handler

---

## 14. Vercel Cron Jobs

Configured in `vercel.json`:

| Path | Schedule | Purpose |
|---|---|---|
| `/api/v1/cron/compliance` | `0 8 * * *` (8am daily) | Auto-block operatives with expired docs |
| `/api/v1/cron/offer-expiry` | `0 * * * *` (hourly) | Mark expired offers as terminated |

Both validate `Authorization: Bearer ${CRON_SECRET}` header.

---

## 15. Client Context (What Aztec Actually Does)

Aztec Landscapes places construction workers ("operatives") on groundworks and landscaping sites across the North West. Key context for understanding the system:

- **Operatives** are self-employed or agency workers. They get WhatsApp offers for individual day/week allocations.
- **Sites** are construction sites with a named client (e.g. housebuilder).
- **Labour requests** are raised when a site needs X workers of a given trade from a given date.
- **The pool search** ranks available operatives by RAP score + proximity to site + availability.
- **Compliance** is critical: UK law requires right-to-work verification, CSCS cards for on-site work. Liam (Labour Manager) handles this manually currently.
- **RAP scoring**: Site managers rate operatives after each allocation. R = Reliability, A = Attitude, P = Performance. Low scorers don't get offered work.
- **Giant/Hays/Reed** are external agencies. Operatives sourced via agency have an agency source on their record.
- **"Liam"** = the Labour Manager. Primary day-to-day user. Gets WhatsApp notifications for: new operatives (from Sophie), offer acceptances/declines, document uploads requiring review.
- **"Martin"** = director. Several open questions about business rules still need his input (see `docs/sessions/INDEX.md` Open Questions section).

---

## 16. Where to Start Reading

For a quick orientation, read these in order:

1. `docs/PROJECT_STATE.md` — current status of everything
2. `docs/TODO.md` — what needs doing, in priority order
3. `docs/BUGS.md` — known issues
4. `docs/DECISIONS.md` — locked architectural decisions (critical before touching anything)
5. `docs/sessions/INDEX.md` — standing decisions + what's next
6. `docs/client/README.md` — client document analysis (what fields are required, what Sophie collects)
7. `src/lib/whatsapp/sophie-handler.ts` — the main AI integration
8. `src/app/api/apply/[token]/upload/route.ts` — the Vision verify API

---

## 17. DB Wipe SQL (For Testing Only)

Wipes all Sophie test data to start a clean intake test:

```sql
DELETE FROM messages;
DELETE FROM message_threads;
DELETE FROM documents;
DELETE FROM operatives WHERE source = 'Direct' AND notes ILIKE '%Sophie%';
```

**Do not run in production without confirming with Oliver.**

---

*Document generated 2026-02-26. For the most current state, always check `docs/PROJECT_STATE.md` and `docs/TODO.md` in the repo.*
