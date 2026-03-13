# Session S21 — Compliance Gate, Crons, Comms Log

**Date:** 2026-02-24
**Commit:** `9bada07`

---

## Why

Presentation gap analysis revealed:
1. Allocation creation had **zero compliance checks** — direct Supabase insert, no RTW/CSCS/WTD validation
2. Cron routes were defined in `vercel.json` but the actual route handlers didn't exist
3. `/comms` returned 404 — tables existed but no UI

---

## canAllocate — Compliance Pre-Check

**File:** `src/lib/compliance/can-allocate.ts`

Runs before every allocation insert. Returns `{ canAllocate: boolean, blockers: string[], warnings: string[] }`.

**Checks (in order):**
1. Operative status not `blocked`
2. `rtw_verified === true` (manually set by Liam — **no Gov.uk API**)
3. RTW not expired — only checked if `rtw_expiry` is set (UK/Ireland passports may have no expiry)
4. CSCS not expired — only checked if `cscs_card_type` is not null
5. WTD: weekly hours in ISO week ≥ 44h → warning, ≥ 48h → blocker (skipped if `wtd_opt_out`)
6. WTD: 11h rest gap — assumes 07:00 shift start (allocations have DATE not TIME). <13h → warning, <11h → blocker
7. Required certs: `labour_request.required_certs[]` checked against valid `operative_cards`

**Critical decision — RTW share code:**
- Gov.uk share code verification API is **intentionally NOT implemented**
- UK/Ireland passport holders have permanent RTW, no share code needed
- Oliver confirmed: disabled because RTW handling is done manually by Liam
- `rtw_share_code` field is stored but never validated via external API

**Allocation API Route:** `src/app/api/allocations/route.ts`
- POST endpoint — auth check → `canAllocate()` → insert
- Returns 422 with `{ blockers[], warnings[] }` on compliance failure
- `labour-pool-results.tsx` updated to call this API instead of direct Supabase insert
- Blockers shown as list under each row; warnings shown as `toast.warning()`

**Type error hit:**
- `cscs_card_type` enum has NO 'none' value — values: `green | blue | gold | black | red | white | null`
- Fixed: used `.not('cscs_card_type', 'is', null)` not `.neq('cscs_card_type', 'none')`

**Enum discovery:**
- `allocation_status` has NO 'offered' or 'expired' status
- Full enum: `pending | confirmed | active | completed | terminated | no_show`
- Offer state tracked via `offer_expires_at` field on pending allocation

---

## Compliance Cron

**File:** `src/app/api/v1/cron/compliance/route.ts`
**Schedule:** Daily at 08:00 UTC (defined in `vercel.json`)

- Finds operatives with `rtw_expiry < NOW()` (and expiry is set) → sets `status = 'blocked'`
- Finds operatives with `cscs_expiry < NOW()` (and `cscs_card_type` is not null) → sets `status = 'blocked'`
- Both queries include explicit `.eq('organization_id', orgId)` — service client bypasses RLS
- Logs result to `cron_runs` table — UNIQUE constraint on `(job_type, run_date)` prevents double-fire
- Protected by `Authorization: Bearer ${CRON_SECRET}` header (Vercel sends this automatically)

---

## Offer Expiry Cron

**File:** `src/app/api/v1/cron/offer-expiry/route.ts`
**Schedule:** Hourly (defined in `vercel.json`)

- Finds `pending` allocations where `offer_expires_at < NOW()`
- Sets status to `terminated` — no cascade logic yet (full cascade deferred to S22 WhatsApp webhook)
- Logs to `cron_runs`

**Decision:** Status → `terminated` (not a custom 'expired' status — enum doesn't have it)

---

## Comms Log

**Files:**
- `src/app/(dashboard)/comms/page.tsx` — thread list
- `src/app/(dashboard)/comms/[id]/page.tsx` — conversation detail

**Thread list:**
- Sorted by `last_message_at` descending
- Shows operative name (or phone number if no operative linked)
- Last message preview, relative timestamp, unread badge count
- FK join: `operatives!message_threads_operative_id_fkey`
- Empty state explains messages appear once WhatsApp webhook is live

**Conversation view:**
- Inbound messages left (green `ArrowDownLeft` icon)
- Outbound messages right (grey `ArrowUpRight` icon)
- Media attachments as clickable links
- Error messages shown in red if delivery failed
- Marks thread as read (`unread_count = 0`) on view

**Sidebar link:** Already existed (`/comms` → WhatsApp) — was returning 404 before this session.
