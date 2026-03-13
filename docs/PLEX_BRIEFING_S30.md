# Plex Briefing — Session S30
**Date:** 2026-02-27
**Author:** Claude Code (S29 + S30)
**For:** Plex architectural review + next phase planning

---

## What's Been Built (S26–S30)

### Phase A — Critical Fixes ✅ Complete
All A1–A3 done (see PLEX_ACTIONS.md).

### WhatsApp Robustness ✅ Complete
All W1–W9 done (see PLEX_ACTIONS.md).

### Phase D — Sophie Intake Enrichment + Pay Rates ✅ Complete

#### D: Sophie now asks 7 questions
`start → awaiting_rtw → awaiting_age → awaiting_cscs → awaiting_trade → awaiting_experience → awaiting_name → awaiting_email → docs_link_sent`

Two new states added:
- **`awaiting_experience`** (after trade): "How many years of experience do you have as a [trade]?" — extracts integer from natural language
- **`awaiting_email`** (after name): "What's the best email address?" — validates @ and .
- Upload link now sent after email collected (not after name)
- `experience_years` and `email` saved to operative on creation

#### D: Pay rate auto-estimation on intake (`src/lib/pay-rates.ts`)
- CSCS colour → grade (green/red/none=skilled, blue=highly_skilled, gold=exceptional_skill, black=manager, white=engineer)
- Experience years → quartile (0–1=Q1, 2–3=Q2, 4–6=Q3, 7+=Q4)
- Day rate = midpoint of Aztec rate card quartile range × 8, rounded to nearest £2
- Rate saved to `operative.day_rate/hourly_rate/grade` + row inserted in `operative_pay_rates`
- `rate_status = 'estimated'`

#### D: BOS rate confirmation UI (`src/components/operatives/rate-actions.tsx`)
- Rate card on operative Overview: £X/day · £X.xx/hr · grade · quartile
- Amber "Estimated" badge / green "Confirmed" badge
- "Confirm Rate" dialog — Liam can adjust amount before confirming
- "Adjust Rate" modal — grade dropdown, quartile dropdown (auto-fills midpoint day rate), reason required
- Collapsible pay rate history table with type badges (estimated/confirmed/revised)
- API routes: `POST /api/operatives/[id]/confirm-rate` + `POST /api/operatives/[id]/revise-rate`
- `rate_status` progresses: `estimated → confirmed`

### Migrations Applied
- **00016**: `short_links` table
- **00017**: `operative_pay_rates` table + `rate_status` + `experience_years` on operatives
- **00018**: `id_document_number TEXT` + `id_expiry DATE` on operatives

---

## Document Upload Pipeline — Current State ✅ Fully Working

### Upload flow (client → server)
1. Form POSTs to `/api/apply/[token]/upload` with address + ID doc
2. AI vision extracts: **doc type, document number, first name, last name, DOB, expiry, nationality**
3. All extracted fields saved to operative: `id_document_number`, `id_expiry`, `date_of_birth`, `nationality`
4. Token cleared, `status = qualifying`, ID document inserted into `documents`
5. If no CSCS expected: WhatsApp summary sent to operative
6. Returns `{ success: true, operativeId }` for CSCS step
7. Form POSTs to `/api/apply/[token]/upload-cscs` with CSCS + `operative_id`
8. AI vision extracts: **card colour, card number, expiry, card type**
9. All extracted fields saved to operative: `cscs_card_number`, `cscs_expiry`, `cscs_card_type`, `cscs_card_title`
10. WhatsApp summary sent to operative (summarises both docs, invites questions, mentions Liam)

### Document detail page (`/operatives/[id]/documents/[docId]`)
- Shows "Extracted by AI" section for both doc types:
  - **Photo ID**: Document No. (mono), DOB, Nationality, ID Expiry
  - **CSCS Card**: Card Number (mono), Colour, Card Title, Expiry
- Verify & notify operative: updates status → `verified`, sends WhatsApp to operative ✅ Fixed FK join bug
- Reject: updates status → `rejected`, sends WhatsApp with reason ✅ Fixed FK join bug

### Operative Overview tab
- **Identity card**: DOB, Nationality, Document No., ID Expiry, NI Number
- **CSCS card**: Colour, Card Number, Expiry, Title
- **Rate card**: £X/day · grade · quartile · Estimated/Confirmed badge · history table

---

## S30 Additional — Realtime + Comms Fix (54fc38e)

### Real-time auto-refresh
- `src/components/realtime-refresh.tsx` — `'use client'` component mounted in dashboard layout
- Subscribes to `postgres_changes` on `operatives`, `documents`, `message_threads`, `messages` via Supabase Realtime WebSocket
- On any change: calls `router.refresh()` — Server Components re-fetch silently, no page reload
- Supabase publication configured ✅ — Oliver ran SQL 2026-02-27, confirmed success

### Comms page status badge fixed
- Was: hardcoded "Docs pending" based on stale `thread.intake_state`
- Now: reads `op.status` from live operative record → renders correct `StatusBadge` (Verified, Qualifying, etc.)

---

## Known Issues / Unresolved

| Issue | Severity | Notes |
|-------|----------|-------|
| WhatsApp on verify/reject — not confirmed received | Medium | Code fires, try/catch swallows errors silently. Plex to check Twilio logs for `verify`/`reject` sends. Could be Twilio template restriction on freeform messages |
| Supabase Realtime publication | ✅ Done | Oliver ran SQL 2026-02-27 — all 4 tables live |
| `PROJECT_STATE.md` outdated (S25) | Low | Stale — needs rewrite |
| Phase B, C items not started | — | See below |

---

## What's Not Built (Phase B + C)

### Phase B — Presentation Alignment
| # | Task | Est. |
|---|------|------|
| B1 | Site Manager WhatsApp channel (arrival, NCR, RAP) | 2–3 sessions |
| B2 | Compliance cron — auto-block expired docs | 1 session |
| B3 | WTD enforcement in `canAllocate` | 1 session |
| B4 | Smart allocation ranking (RAP × distance × availability) | 1 session |
| B5 | Role-based access enforcement | 1 session |
| B6 | Audit trail (action logging table) | 1 session |

### Phase C — Completeness
| # | Task | Est. |
|-------|------|------|
| C1 | Timesheet PDF export | 1 session |
| C2 | Custom short domain for upload links | Easy — just DNS |
| C3 | Google Maps API key (real) | Config only |
| C4 | Public induction page `/induction/[id]` | 1–2 sessions |

### Possible Phase E — Post-verification Flow
Oliver identified a gap: once Liam verifies documents, there's no automatic next step sent to the operative. Questions for Plex:

1. **What should happen after both docs are verified?** e.g. "You're now verified — Liam will be in touch with your first job offer" WhatsApp?
2. **Operative status progression**: `qualifying → verified` — when? After both docs verified? Auto or manual?
3. **Induction**: should Sophie ask anything else before the upload link? (UTR number, bank details, NI number, right-to-work type?)
4. **Multi-language**: Sophie currently English only. Romanian, Polish, Bulgarian planned?
5. **Pay rate**: should Liam confirm rates before or after first shift? Any other approval workflow needed?

---

## Commits This Phase (most recent first)
```
59d35c4  feat: visual enrichment — CSCS colour dots, nationality badges, specific doc names
5b8654d  fix: write expiry_date to documents table on insert
0030570  fix: verify/reject "document not found" — explicit FK join; extracted details on doc page
3be578e  feat: extract + save full ID details, fix WhatsApp timing, add Sophie summary
d8455e5  fix: CSCS not saving — early return fired before formData parsed
c9f399b  feat(S28c): pay rate UI — rate card, confirm/adjust dialogs, history table
6e1b27f  feat(S28b): pay rate system — lookup module + DB types + auto-estimate
ed59ebc  feat(S28a): Sophie intake — add experience + email questions
```

## S30 Additional — Visual Enrichment (59d35c4)
- `src/lib/cscs-colours.ts` — shared CSCS colour → Tailwind class mapping (green/blue/gold/black/red/white)
- **Operative list**: coloured CSCS dot + nationality/language pills next to name
- **Operative profile status strip**: CSCS colour badge + nationality badge + language badge (live at a glance)
- **Operative Overview CSCS card**: coloured dot + "Blue Card — Skilled Worker" inline display
- **Documents dashboard**: CSCS colour dot per row; doc shows actual name ("Passport", "CSCS Card (blue)") instead of generic "Photo ID"; nationality badge under operative name
- **Document expiry**: now written to `documents.expiry_date` on upload — Expiry column in dashboard populates correctly

---

## Questions for Plex — Next Phase

### W10: WhatsApp 24-hour window (HIGH PRIORITY — blocks verify/reject notifications)

**Root cause confirmed:** Verify/reject WhatsApp notifications fail silently because the operative's last inbound message was >24 hours ago. WhatsApp Business API blocks all freeform outbound messages outside the 24-hour contact window. Only pre-approved HSM templates can be sent proactively.

**Templates needed (Plex to create + submit in Twilio Console → Content Template Builder):**

| Template | Variables | Use case |
|----------|-----------|----------|
| `aztec_doc_verified` | `{{1}}` = first name, `{{2}}` = doc type | Liam clicks "Verify" in BOS |
| `aztec_doc_rejected` | `{{1}}` = first name, `{{2}}` = doc type, `{{3}}` = reason | Liam clicks "Reject" |
| `aztec_welcome_verified` | `{{1}}` = first name | Operative fully verified, ready to work |
| `aztec_job_offer` | `{{1}}` = first name, `{{2}}` = site, `{{3}}` = date | Future: allocation offer |

**Once approved:** Return Content SIDs → Claude Code wires them into verify/reject routes (replacing current freeform `sendWhatsApp()` calls which work inside 24h but fail outside it).

**Note:** Sophie's intake conversation works fine within the 24h session window — templates only needed for proactive notifications triggered by Liam or the system.

### Post-verification flow
- Does `status` auto-advance `qualifying → verified` when both docs verified? Or Liam does it manually?
- Should system send operative a WhatsApp when fully verified? (Needs `aztec_welcome_verified` template)

### Phase B priority order
B1 Site Manager WhatsApp · B2 Compliance cron (auto-block expired docs) · B3 WTD enforcement in canAllocate · B4 Smart allocation ranking · B5 Role-based access · B6 Audit trail — which first?

### Additional Sophie intake fields
UTR number, NI number, bank details, emergency contact — intake or post-verification onboarding?

---

## Architecture Notes (for Plex)
- Next.js 15.5.12 App Router — `params`/`searchParams` must be `await`-ed
- **FK joins in Supabase must use explicit FK name** — `table!fk_name(cols)` — ambiguous joins cause silent 404s
- `createServiceClient()` bypasses RLS — always use for API routes
- `createClient()` respects RLS — used in Server Components / page fetches
- Sophie state machine: context in system prompt only — not injected as fake messages
- Operative `status` enum: `prospect | qualifying | pending_docs | verified | available | working | unavailable | blocked`
- `allocation_status` enum: no 'cancelled' or 'expired' — use `terminated`
