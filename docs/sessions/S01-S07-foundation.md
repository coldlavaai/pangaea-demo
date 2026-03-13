# Sessions S1–S7 — Foundation

**Date:** February 2026 (exact dates not recorded — pre-logging era)
**Commits:** `f27d7c4` → `2c44c16`

---

## S1 — Repo Init + Database Migrations

**Why:** Starting from scratch — needed the full schema in Supabase before any UI work.

**Built:**
- Next.js 15.5.12 app created from `create-next-app`
- Supabase project linked: `ybfhkcvrzbgzrayjskfp` (Frankfurt)
- Org ID hardcoded: `00000000-0000-0000-0000-000000000001` (single-tenant, fixed)
- Migrations 00001–00006 applied:
  - `00001` — all core tables: organizations, users, operatives, sites, trade_categories, documents, allocations, labour_requests, shifts, timesheets, timesheet_entries, performance_reviews (RAP), non_conformance_incidents, message_threads, messages, advert_templates, adverts, audit_log, cron_runs, operative_cards
  - `00002`–`00005` — RLS policies per table
  - `00006` — audit log trigger, WTD check trigger on allocations INSERT, NCR auto-block trigger (3+ NCRs → operative.status = 'blocked'), cron_runs table
- `vercel.json` — cron config: compliance at `0 8 * * *`, offer-expiry at `0 * * * *`
- Supabase Storage bucket: `operative-documents` (private)
- `NEXT_PUBLIC_ORG_ID` env var set

**Commits:** `f27d7c4`, `9a8553c`

---

## S2 — Auth Infrastructure

**Why:** Every route needs protection. Supabase SSR auth with cookie-based sessions.

**Built:**
- `src/lib/supabase/server.ts` — `createClient()` (session-based) + `createServiceClient()` (service role, bypasses RLS — used for webhooks/crons)
- `src/lib/supabase/client.ts` — browser-side Supabase client
- `src/types/database.ts` — TypeScript types generated from Supabase schema
- `middleware.ts` — session refresh + route guard (redirects unauthenticated users to `/login`)
- `/auth/callback` route — handles Supabase auth code exchange
- `/login` page — dark theme, email + password, RHF + Zod validation

**Key decisions:**
- SSR auth via `@supabase/ssr` (not `@supabase/auth-helpers-nextjs`)
- `createServiceClient()` is synchronous (no `await cookies()`) — used where no user session is available

**Commits:** `bcd7748`

---

## S3 — Dashboard Shell + Shared Components

**Why:** Need the full UI chrome before building individual modules.

**Built:**
- `(dashboard)` route group layout — auth check, sidebar, top header bar, `AlertsBell`
- `Sidebar` component — all module links, Aztec branding, collapse support
- Dashboard page — stats cards (active ops, open requests, pending allocations, docs expiring), recent activity
- Shared components created:
  - `PageHeader` — props: `title`, `description`, `action?: React.ReactNode`
  - `StatsCard` — props: `title` (NOT `label`)
  - `StatusBadge` — coloured pill per status string
  - `EmptyState` — props: `action?: React.ReactNode` (JSX, NOT `{ label, href }` object)
  - `DataTable` — generic sortable table shell
  - `AlertsBell` — compliance alert count in header

**Commits:** `a28eeb0`

---

## S4 — Operatives List

**Why:** Core module — the operative database is the heart of the system.

**Built:**
- `/operatives` — searchable list with filters (status, trade category, labour type), pagination, URL state (search params)
- AZT-XXXX reference number displayed
- Status badges
- Link to operative profile

**Commits:** `e2db110`

---

## S5 — Operative Profile (6 Tabs)

**Why:** Full operative record with all their data in one place.

**Built:**
- `/operatives/[id]` — 6-tab profile:
  1. **Overview** — identity, address, work details, RTW, CSCS, next of kin, payroll (masked), notes
  2. **Documents** — list of uploaded documents with status + verify/reject actions
  3. **Allocations** — history of allocations for this operative
  4. **RAP** — performance review history (placeholder at this stage)
  5. **NCRs** — non-conformance report history
  6. **Comms** — message thread (placeholder at this stage)
- `MaskedField` component — bank/UTR fields with eye-toggle reveal

**Commits:** `7899902`

---

## S6 — Create + Edit Operative Forms

**Why:** Need to add and update operatives. Forms are the most complex part — 30+ fields.

**Built:**
- `/operatives/new` + `/operatives/[id]/edit` — same form component, different mode
- `operative-form.tsx` — RHF + Zod, full field set:
  - Basic: first/last name, phone, email, status, labour type
  - Identity: DOB, NI number, nationality, preferred language
  - Address: full address + postcode → geocoded via postcodes.io (lat/lng stored)
  - Work: trade category, day rate, experience years, source/agency
  - RTW: type (british_irish_passport / share_code / other), verified toggle, expiry, share code
  - CSCS: card type (colour), number, expiry, title, description
  - Next of kin: name, phone
  - Payroll: bank sort code, account number, UTR (masked in profile, plain in form — admins only)
  - Other: WTD opt-out, medical notes, notes

**Key errors hit:**
- `z.boolean().default()` causes type conflict with zodResolver — use `z.boolean()` then set default in `useForm`
- Numeric fields must be `z.string().optional()` with manual parse in submit handler
- `SelectItem` crashes if value is empty string — use `null` or a real placeholder value

**Commits:** `4d966ff`, `143a794`, `997e117`, `491f31f`, `65a2e49`, `7c4a550`

---

## S7 — Sites Module

**Why:** Labour requests are linked to sites. Sites need their own full module.

**Built:**
- `/sites` — list with search, site count
- `/sites/new` + `/sites/[id]/edit` — create/edit form (name, address, postcode → geocoded, project details)
- `/sites/[id]` — detail with 3 tabs: Overview, Managers, Allocations
- Site managers — assign/remove users as site managers per site
- Multiple site managers per site supported

**Commits:** `2c44c16`

---

## Pre-Testing Fixes (between S7 and S8)

A batch of UI fixes applied before JJ started testing:

- Compact UI pass — denser layout, more business-like
- Dashboard welcome personalisation (shows user's first name)
- RTW type constraint fix — `share_code` and `expiry` visibility toggle
- Date pickers on operative form
- Language dropdown expanded
- Geocode on blur fallback (also geocodes on submit if coordinates not yet set)

**Commits:** `8356fc9`, `5ff9146`, `df17906`, `143a794`, `997e117`, `491f31f`, `7d822f3`, `65a2e49`, `7c4a550`, `38df1a6`, `16caa19`
