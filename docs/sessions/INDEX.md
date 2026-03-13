# AZTEC BOS — Session Log Index

One entry per session group. Click through for full details: decisions made, errors hit, why things were built the way they were.

**Repo:** `Aztec-Landscapes/aztec-bos`
**Stack:** Next.js 15.5.12 · Supabase (Frankfurt) · Vercel · shadcn/ui · Tailwind

---

## Session Groups

| File | Sessions | Date | What |
|---|---|---|---|
| [S01-S07-foundation.md](./S01-S07-foundation.md) | S1–S7 | Feb 2026 | Repo, DB, auth, dashboard, operatives (list/profile/forms), sites |
| [S08-S14-core.md](./S08-S14-core.md) | S8–S14 | Feb 2026 | Documents, compliance dashboard, labour requests, pool search, allocations, WhatsApp offer, shifts, timesheets |
| [S15-S17-ncr-rap.md](./S15-S17-ncr-rap.md) | S15–S17 | Feb 2026 | NCRs, RAP scoring, additional card schemes (CPCS/PAL/CISRS/NRSWA), agency select, CSV payroll fields |
| [S18-S20-fields-adverts-settings.md](./S18-S20-fields-adverts-settings.md) | S18–S20 | 2026-02-24 | Gender + machine operator + onboarding checklist, adverts page, settings page |
| [S20b-enterprise-settings.md](./S20b-enterprise-settings.md) | S20b | 2026-02-24 | Settings enterprise upgrade — optimistic updates, Sonner toasts, client-side tabs |
| [S21-compliance-comms.md](./S21-compliance-comms.md) | S21 | 2026-02-24 | Compliance gate (canAllocate), cron handlers (compliance + offer expiry), comms log UI |
| [S22-whatsapp-webhook.md](./S22-whatsapp-webhook.md) | S22 | 2026-02-24 | Twilio webhook, Twilio sig validation (bypassed), offer YES/NO handler, Liam notifications |
| [S23-sophie-intake.md](./S23-sophie-intake.md) | S23 | 2026-02-24 | Sophie AI intake (Claude claude-sonnet-4-6), 7-step flow, operative auto-create on qualify |
| [S24-sophie-docs.md](./S24-sophie-docs.md) | S24 | 2026-02-25 | Sophie doc collection (vision verify + Supabase Storage), Liam review loop, doc verify/reject → WhatsApp |

---

## What's Next

| Priority | Session | What | Blocker |
|---|---|---|---|
| 1 | S25 | **Sophie doc upload link** — replace WhatsApp photo flow with secure generated link → `/apply/[token]` web form | None |
| 2 | — | **Re-enable Twilio signature validation** — uncomment in `route.ts` | After S25 |
| 3 | S26 | Sophie multi-language — Romanian, Polish, Bulgarian | S23 done |
| 4 | S27 | Cowork plugin layer — `/api/mcp`, Supabase views, plugin dir (skills + commands) | Spec: `/Users/oliver/Downloads/COWORK-PLUGIN-INTEGRATION.md` |
| 5 | S26 | Site manager WhatsApp channel — arrival, NCR, RAP, referrals | — |
| — | — | Set up `/docs` context management system (CLAUDE.md from Downloads) | None |
| — | — | Timesheet filter by operative on `/timesheets` | None |
| — | — | Compliance dashboard extension — operative_cards expiry | None |
| — | — | Timesheet PDF export | None |
| QA | S30 | Full QA pass — race conditions, BST timezone, mobile | All above |

---

## Standing Decisions (always check before building)

| Decision | Detail |
|---|---|
| RTW share code / Gov.uk API | **NOT implemented** — UK/Ireland passports have permanent RTW, no share code. `rtw_verified` set manually by Liam. |
| `allocation_status` enum | `pending \| confirmed \| active \| completed \| terminated \| no_show` — no 'offered', no 'expired', no 'cancelled' |
| `cscs_card_type` enum | `green \| blue \| gold \| black \| red \| white \| null` — no 'none' |
| `operative_status` enum | `prospect \| qualifying \| pending_docs \| verified \| available \| working \| unavailable \| blocked` |
| `labour_requests` has no `title` field | Display as `{site} — {trade} (date, ×N)` |
| Allocation creation | Via `POST /api/allocations` — NOT direct Supabase insert. Runs `canAllocate()` first. |
| `organizations.settings` JSON | Requires `as unknown as Json` type cast when saving |
| FK join syntax | `operatives!allocations_operative_id_fkey` (explicit FK name required) |
| Next.js 15 `params`/`searchParams` | Must be `await`-ed — they are Promises |
| Git email for Vercel deploy | Must be `otatler@gmail.com` — other emails don't trigger auto-deploy |
| Cron secret | `Authorization: Bearer ${CRON_SECRET}` — sent automatically by Vercel to cron routes |
| Service client | `createServiceClient()` bypasses RLS — always add explicit `.eq('organization_id', orgId)` |
| `can-allocate.ts` 11h rest gap | Assumes 07:00 shift start (allocations have DATE not TIME) |

---

## Open Questions for Martin

| Q | Topic | Detail |
|---|---|---|
| Q2 | Elite rates | Is Elite an agency? Do operatives on Elite sites get paid differently, or only Aztec's margin changes? |
| Q3 | Bank details visibility | Who can unmask sort code / account number / UTR? All admins, or directors only? |
| Q5 | Start date meaning | First day ever worked for Aztec, or date added to DB? |
| Q7 | Trade categories | Martin needs to confirm the actual Aztec trade list — 15 standard trades are pre-seeded in Settings |
