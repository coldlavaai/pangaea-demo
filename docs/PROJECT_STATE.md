# Project State — Aztec BOS
**Last updated:** 2026-03-05 (Session S49)

---

## What's Built & Working

| Module | Route / File | Status |
|---|---|---|
| Login | `/login` | ✅ |
| Dashboard | `/dashboard` | ✅ (basic stats) |
| Operatives list + profile (6 tabs) | `/operatives`, `/operatives/[id]` | ✅ |
| Create/Edit operative | `/operatives/new`, `/operatives/[id]/edit` | ✅ |
| Quick-assign + terminate allocation | Operative detail page | ✅ S45 |
| Sites | `/sites` | ✅ |
| Labour Requests (duration-based) | `/requests` | ✅ |
| Allocations + offer flow | `/allocations` | ✅ |
| Shifts + Timesheets + PDF export | `/shifts`, `/timesheets` | ✅ S45 |
| NCRs | `/ncrs` | ✅ |
| RAP scoring | Operative RAP tab | ✅ |
| Documents + verify/reject + Vision AI | `/documents` | ✅ |
| CV upload + Claude parsing + work history | Operative profile | ✅ S37 |
| Pool search + work history matching | `/requests/[id]/search` | ✅ S37 |
| Adverts + AI copy generation | `/adverts` | ✅ |
| Reports (5 sections + CSV export) | `/reports` | ✅ S39 |
| Comms log | `/comms`, `/comms/[id]` | ✅ |
| Activity feed (17 event types) | `/activity` | ✅ S48-49 |
| Notifications bell + realtime | Layout header | ✅ |
| Settings — Org, Trades, Users, Integrations, Email Templates | `/settings` | ✅ S49 |
| User edit drawer (name, phone, Telegram ID, delete) | Settings → Users | ✅ S48 |
| RBAC (admin/staff/site_manager/auditor) | Middleware + server actions | ✅ S42 |
| Audit log | `/api/audit` | ✅ S42 |
| WTD enforcement | Compliance cron | ✅ S42 |
| Compliance cron (block/warn/clear) | `/api/cron/compliance-check` | ✅ |
| Reminders cron (finish + timesheets) | `/api/v1/cron/reminders` | ✅ |
| Offer expiry cron | `/api/v1/cron/offer-expiry` | ✅ (no notification — gap) |
| Sophie WhatsApp intake (7-state) | Twilio webhook | ✅ |
| Document upload page | `/apply/[token]` | ✅ |
| WhatsApp alerts to operatives (doc expiring) | Compliance/reminders crons | ✅ S38 |
| WhatsApp alerts to Liam (staff_alert) | Compliance/reminders crons | ✅ S39 |
| @AztecSiteBot — arrive/NCR/RAP/request/finish | `src/lib/telegram/site-manager-handler.ts` | ✅ S45 |
| @AlfNotificationsBot — admin query bot | `src/app/api/webhooks/telegram-notify/route.ts` | ✅ S48-49 |
| Microsoft OAuth email (Outlook delegated) | Settings → Integrations | ✅ S49 |
| Invite email (WYSIWYG template, role-specific Telegram guide) | `src/lib/email/` | ✅ S49 |
| Email template editor (TipTap WYSIWYG + live preview) | Settings → Email Templates | ✅ S49 |
| Email log (all outgoing emails in Activity feed) | `email_log` table | ✅ S49 |

---

## DB Tables — Migrations Applied

All core tables present. Additional tables added S49:
- `email_integrations` — Outlook OAuth tokens per org ✅ (Oliver ran SQL)
- `email_log` — outgoing email audit trail ✅ (Oliver ran SQL)
- `email_templates` — custom subject/body per org ⚠️ **NOT YET RUN** — run this before testing template editor:

```sql
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  template_key text not null,
  subject text not null,
  body_html text not null,
  updated_at timestamptz not null default now(),
  constraint email_templates_org_key unique (organization_id, template_key)
);
alter table email_templates enable row level security;
create policy "service role all" on email_templates using (true) with check (true);
```

---

## Environment Variables (Vercel — Production)

| Variable | Value / Status |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://aztec-landscapes-bos.vercel.app` |
| `NEXT_PUBLIC_ORG_ID` | `00000000-0000-0000-0000-000000000001` |
| `ANTHROPIC_API_KEY` | ✅ |
| `TWILIO_ACCOUNT_SID` | ✅ |
| `TWILIO_AUTH_TOKEN` | ✅ |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+447414157366` |
| `LIAM_WHATSAPP_NUMBER` | `+447742201349` (⚠️ may need updating to real number) |
| `AZTEC_DOC_EXPIRING_SID` | ✅ |
| `AZTEC_STAFF_ALERT_SID` | ✅ |
| `AZTEC_USER_INVITE_SID` | ✅ (WhatsApp invite template) |
| `CRON_SECRET` | ✅ |
| `TELEGRAM_BOT_TOKEN` | ✅ (@AztecSiteBot) |
| `TELEGRAM_NOTIFY_TOKEN` | ✅ (@AlfNotificationsBot) |
| `MICROSOFT_CLIENT_ID` | ✅ |
| `MICROSOFT_CLIENT_SECRET` | ✅ |
| `MICROSOFT_TENANT_ID` | ✅ |

---

## Key Architecture Decisions (locked)

- **Next.js 15.5.12** — `params`/`searchParams` must be `await`-ed
- **Server Components by default** — `'use client'` only where needed
- **`createServiceClient()`** — bypasses RLS, always add `.eq('organization_id', orgId)`
- **`allocation_status` enum** — `pending|confirmed|active|completed|terminated|no_show`
- **`operative_status` enum** — `prospect|qualifying|pending_docs|verified|available|working|unavailable|blocked`
- **`ncr_severity` enum** — `minor|major|critical`
- **Offer model** — simultaneous broadcast (top 3, 30-min), first YES wins via `accept_allocation_offer()` PG function
- **Allocation creation** — via `POST /api/allocations` only (runs `canAllocate()` check)
- **FK join syntax** — `operatives!allocations_operative_id_fkey` (explicit FK name required)
- **Supabase migrations** — via SQL editor only
- **Sophie intake** — state context in system prompt, NOT injected as fake messages
- **Email template body_html** — stores TipTap content only (NOT full email HTML). Shell built by `buildInviteShell()` in `src/lib/email/template-defs.ts`
- **Telegram sessions** — `phone_number = 'tg:{chatId}'` in `message_threads`

---

## Key Files Reference

| Purpose | Path |
|---|---|
| Sophie intake state machine | `src/lib/whatsapp/sophie-handler.ts` |
| WhatsApp router | `src/lib/whatsapp/handler.ts` |
| Offer handler | `src/lib/whatsapp/offer-handler.ts` |
| Twilio webhook | `src/app/api/webhooks/twilio/route.ts` |
| Document upload page | `src/app/apply/[token]/page.tsx` |
| Upload API (ID doc) | `src/app/api/apply/[token]/upload/route.ts` |
| Upload API (CSCS) | `src/app/api/apply/[token]/upload-cscs/route.ts` |
| @AztecSiteBot handler | `src/lib/telegram/site-manager-handler.ts` |
| @AztecSiteBot send utils | `src/lib/telegram/send.ts` |
| @AztecSiteBot webhook | `src/app/api/webhooks/telegram/route.ts` |
| @AlfNotificationsBot handler | `src/app/api/webhooks/telegram-notify/route.ts` |
| @AlfNotificationsBot send | `src/lib/telegram/send-notify.ts` |
| Notification create helper | `src/lib/notifications/create.ts` |
| Email send (Graph API) | `src/lib/email/send.ts` |
| Email template definitions | `src/lib/email/template-defs.ts` |
| Email template DB lookup | `src/lib/email/templates.ts` |
| Outlook OAuth helpers | `src/lib/email/outlook-auth.ts` |
| Settings server actions | `src/app/(dashboard)/settings/actions.ts` |
| Settings page (server) | `src/app/(dashboard)/settings/page.tsx` |
| Email template panel (UI) | `src/components/settings/email-templates-panel.tsx` |
| Compliance cron | `src/app/api/cron/compliance-check/route.ts` |
| Reminders cron | `src/app/api/v1/cron/reminders/route.ts` |
| Offer expiry cron | `src/app/api/v1/cron/offer-expiry/route.ts` |
| Allocations API | `src/app/api/allocations/route.ts` |
| Supabase server client | `src/lib/supabase/server.ts` |
| Short links table | `short_links` table (TinyURL currently used — see TODO) |

---

## Users (Current DB State — S48)

| Email | Name | Role | Telegram | Notifications |
|---|---|---|---|---|
| liam.butt@aztec-landscapes.co.uk | ⚠️ needs fixing | admin | null | false |
| donna@thefoundersfriend.co.uk | ⚠️ needs fixing | admin | null | false |
| jacob@coldlava.ai | ⚠️ needs fixing | admin | null | false |
| oliver@coldlava.ai | Oliver Tatler | admin | 1640953016 | true |

JJ (site manager) — needs re-inviting via Settings → Users → Invite User

---

## Sophie Flow (current)

States: `start → awaiting_rtw → awaiting_age → awaiting_cscs → awaiting_trade → awaiting_experience → awaiting_name → awaiting_email → docs_link_sent`

Upload link sent via TinyURL (⚠️ — replace with `/r/[code]` short domain, see TODO)

---

## @AztecSiteBot

- Token in env: `TELEGRAM_BOT_TOKEN`
- SEARCH_THRESHOLD = 6 (buttons if ≤6 ops, search mode if >6)
- Callback prefixes: `arrive_sel`, `arrive_now`, `arrive_date`, `ncr_type:TYPE`, `ncr_sev:SEV`, `ncr_op:OP_ID`, `rap_sel`, `rap_a/r/p:N`
- Jacob Stray: verified ✅ | JJ: needs re-inviting

---

## @AlfNotificationsBot

- Token in env: `TELEGRAM_NOTIFY_TOKEN`
- Persistent reply keyboard (docked at bottom of chat)
- Commands: unread, recent, ncrs, requests, status, markread
- NCR output includes: operative name, incident type, severity, site, description excerpt, age, URL button
- Users need `telegram_chat_id` + `receive_notifications = true` to receive push DMs
