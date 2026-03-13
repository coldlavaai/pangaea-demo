# Sessions S18–S20 — Operative Fields, Adverts, Settings

**Date:** 2026-02-24
**Commits:** `f1b95cc` (S18), `85baaf6` (S19), `999f3a6` (S20), `659b331` (notes), `fcb0cd3` (migration applied)

---

## S18 — Gender, Machine Operator, Onboarding Checklist

**Why:** Giant New Starter Form, New Starter Checklist Rev 2, and Company Induction (client documents) all contained fields not yet in the system. Client alignment pass.

**Built:**
- `gender` field on operatives — dropdown: male / female / prefer_not_to_say
  - Added to operative form (Identity section) + profile Overview tab
- `machine_operator` boolean flag — toggle on operative form (Work section) + profile
  - Label: "Qualified for Digger / Telehandler / Dumper"
- Onboarding checklist — 4 inline toggleable checkboxes on operative profile (Overview tab):
  1. Blue Sticker Issued (provisional ID — removed when CSCS card arrives)
  2. Buddy Allocated
  3. 2-Week Review Done
  4. Induction Complete
  - Saves to DB on each click (optimistic update pattern — no page reload)
  - Shows progress count (x/4 complete)

**Migration 00011** (applied manually via Supabase SQL editor):
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
**Status: ✅ APPLIED**

**Files changed:**
- `supabase/migrations/00011_add_gender_machine_operator_onboarding.sql` (NEW)
- `src/types/database.ts` — added 6 new fields
- `src/components/operatives/operative-form.tsx` — added gender select + machine_operator toggle
- `src/components/operatives/onboarding-checklist.tsx` (NEW)
- `src/app/(dashboard)/operatives/[id]/page.tsx` — added gender, machine_operator, onboarding checklist sections
- `src/app/(dashboard)/operatives/[id]/edit/page.tsx` — added to defaultValues

**Commits:** `f1b95cc`, `fcb0cd3`

---

## S19 — Adverts Page

**Why:** `/adverts` was a 404 stub. The DB schema already existed (migration 00004 had `adverts` and `advert_templates` tables). Presentation shows adverts as a module.

**Built:**
- `/adverts` — list with 4 stats cards (active count, impressions, clicks, applications) + template sidebar
- `/adverts/[id]` — detail with metrics (CTR%, conversion rate), status badge, `AdvertActions`
- `/adverts/new` — create form. `mode=template` URL param switches to template creation mode
- `AdvertActions` component — status machine: `draft → active (Go Live) → paused / ended`
  - Inline edit for external URL, platform ad ID, budget
  - Sets `started_at` on go-live, `ended_at` on end
- `AdvertForm` component — platform select, labour request link, optional template apply

**Key decision / error hit:**
- Initial query used `select('id, title, ...')` on `labour_requests` — Supabase returned `SelectQueryError`
- `labour_requests` has **NO `title` field** — fixed by joining site + trade + start_date:
  `select('id, start_date, headcount_required, site:sites!...fkey(name), trade_category:trade_categories!...fkey(name)')`
- Display format: `{site} — {trade} (date, ×N)`

**Files created:**
- `src/app/(dashboard)/adverts/page.tsx`
- `src/app/(dashboard)/adverts/[id]/page.tsx`
- `src/app/(dashboard)/adverts/new/page.tsx`
- `src/components/adverts/advert-actions.tsx`
- `src/components/adverts/advert-form.tsx`

**Commits:** `85baaf6`

---

## S20 — Settings Page

**Why:** `/settings` was a 404 stub. Needed for pre-go-live configuration (WhatsApp number, offer window, trade categories, user roles).

**Built:**
- `/settings` — 3 tabs: Organisation / Trade Categories / Users
- **Organisation tab:**
  - Org name (editable)
  - Labour Manager WhatsApp number (placeholder: Oliver's number, replace before go-live)
  - Offer window (mins) — default 30
  - Broadcast count — default 3 (how many operatives get the offer simultaneously)
  - Reallocation radius (miles) — default 25
  - All stored in `organizations.settings` JSON field
- **Trade Categories tab:**
  - Full CRUD: add, edit inline, enable/disable
  - Typical day rate per category
  - "Seed Aztec Trades" button — inserts 15 standard trades if not already present
- **Users tab:**
  - List all users in the org
  - Inline role change: director / labour_manager / admin
  - Enable / disable users

**Key error hit:**
- `organizations.settings` is `Json | null` — `Record<string, unknown>` not directly assignable
- Fix: `newSettings as unknown as import('@/types/database').Json`

**Files created:**
- `src/app/(dashboard)/settings/page.tsx`
- `src/components/settings/org-settings-form.tsx`
- `src/components/settings/trade-categories-panel.tsx`
- `src/components/settings/users-panel.tsx`

**Commits:** `999f3a6`
